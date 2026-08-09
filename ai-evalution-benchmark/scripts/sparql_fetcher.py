"""
SPARQL Fetcher - Generic query engine driven by dataset config

Instead of hardcoding a SPARQL query and result aggregation logic,
this module reads the query from a .dataset.json companion file
and aggregates results using the result_mapping config.
"""
from typing import Dict, List, Optional, Any, Set
from collections import defaultdict
import json
from pathlib import Path

try:
    from SPARQLWrapper import SPARQLWrapper, JSON
except ImportError:
    raise ImportError("SPARQLWrapper required: pip install SPARQLWrapper==2.0.0")


class SPARQLFetcher:
    def __init__(self, endpoint_url: str, timeout: int = 30, dataset_config: Optional[Dict] = None):
        self.sparql = SPARQLWrapper(endpoint_url)
        self.sparql.setReturnFormat(JSON)
        self.sparql.setTimeout(timeout)
        self.sparql.setMethod('POST')
        self.dataset_config = dataset_config

    def execute_query(self, query: str) -> List[Dict[str, Any]]:
        self.sparql.setQuery(query)
        results = self.sparql.query().convert()
        bindings = results.get("results", {}).get("bindings", [])
        return [{k: v.get("value") for k, v in b.items()} for b in bindings]

    def fetch_all_papers_with_metadata(self, limit: Optional[int] = None) -> Dict[str, Dict[str, Any]]:
        if self.dataset_config:
            return self._fetch_with_config(limit)
        else:
            raise ValueError(
                "No dataset config provided. Pass a .dataset.json config to the constructor."
            )

    def _fetch_with_config(self, limit: Optional[int] = None) -> Dict[str, Dict[str, Any]]:
        """Fetch papers using the SPARQL query from dataset config."""
        sparql_config = self.dataset_config["sparql"]
        prefixes = sparql_config.get("prefixes", "")
        query_body = sparql_config["query"]
        paper_id_field = sparql_config.get("paper_id_field", "paper")

        # Build full query
        query = f"{prefixes}\n\n{query_body}"
        if limit:
            query += f"\nLIMIT {limit}"

        print(f"Executing SPARQL query against endpoint...")
        results = self.execute_query(query)
        print(f"Got {len(results)} raw result rows")

        # Group by paper
        papers_data: Dict[str, List[Dict]] = defaultdict(list)
        for row in results:
            if paper_id := row.get(paper_id_field):
                papers_data[paper_id].append(row)

        # Aggregate using result mapping
        result_mapping = self.dataset_config.get("result_mapping", {})
        aggregated = {}
        for paper_id, rows in papers_data.items():
            aggregated[paper_id] = self._aggregate_paper_with_mapping(rows, result_mapping)

        return aggregated

    def _aggregate_paper_with_mapping(
        self, rows: List[Dict[str, Any]], mapping: Dict
    ) -> Dict[str, Any]:
        """Aggregate multiple SPARQL result rows into a single paper record using the mapping config."""
        if not rows:
            return {}

        first = rows[0]
        paper_fields_config = mapping.get("paper_fields", {})
        questionnaire_config = mapping.get("questionnaire_data", {})

        # Extract paper-level fields from first row
        paper = {}
        for output_key, source_field in paper_fields_config.items():
            paper[output_key] = first.get(source_field)

        # Build questionnaire_data
        questionnaire_data = {}

        # Simple fields (taken from first row)
        simple_fields = questionnaire_config.get("simple_fields", {})
        for output_key, field_config in simple_fields.items():
            if isinstance(field_config, str):
                questionnaire_data[output_key] = first.get(field_config)
            elif isinstance(field_config, dict):
                source = field_config.get("source_field")
                transform = field_config.get("transform")
                default = field_config.get("default")
                value = first.get(source)
                if transform == "equals_1_to_bool":
                    value = value == "1" if value is not None else False
                elif value is None and default is not None:
                    value = default
                questionnaire_data[output_key] = value

        # Aggregate fields (collected across all rows)
        aggregate_fields = questionnaire_config.get("aggregate_fields", {})
        for output_key, agg_config in aggregate_fields.items():
            questionnaire_data[output_key] = self._aggregate_field(rows, first, agg_config)

        paper["questionnaire_data"] = questionnaire_data
        return paper

    def _aggregate_field(self, rows: List[Dict], first: Dict, config: Dict) -> Any:
        """Aggregate a single field according to its config type."""
        field_type = config.get("type", "object")

        if field_type == "nested_group":
            return self._aggregate_nested_group(rows, config)
        elif field_type == "object":
            return self._aggregate_object(rows, first, config)
        elif field_type == "first_row_object":
            return self._aggregate_first_row_object(first, config)
        elif field_type == "collect_unique_values":
            return self._collect_unique_values(rows, config.get("source_field", ""))
        elif field_type == "collect_unique":
            return self._collect_unique_objects(rows, config)
        elif field_type == "flags_to_list":
            return self._flags_to_list(first, config.get("flags", {}))
        elif field_type == "boolean_flags_flat":
            return self._boolean_flags_flat(rows, config.get("flags", {}))
        elif field_type == "boolean_flags_object":
            return self._boolean_flags_object(rows, config.get("groups", {}))
        else:
            return None

    def _aggregate_nested_group(self, rows: List[Dict], config: Dict) -> List[Dict]:
        """Group rows by a key field and collect nested sub-groups."""
        group_key = config.get("group_key", "")
        fields_config = config.get("fields", {})
        nested_config = config.get("nested", {})

        groups: Dict[str, Dict] = {}

        for row in rows:
            key_value = row.get(group_key)
            if not key_value:
                continue

            if key_value not in groups:
                entry = {}
                for output_key, field_def in fields_config.items():
                    if isinstance(field_def, str):
                        entry[output_key] = row.get(field_def)
                    elif isinstance(field_def, dict):
                        source = field_def.get("source_field")
                        transform = field_def.get("transform")
                        default = field_def.get("default")
                        value = row.get(source)
                        if transform == "equals_1_to_bool":
                            value = value == "1" if value is not None else False
                        elif value is None and default is not None:
                            value = default
                        entry[output_key] = value
                # Initialize nested collections
                for nested_key in nested_config:
                    entry[nested_key] = []
                groups[key_value] = entry

            # Collect nested items
            for nested_key, nested_def in nested_config.items():
                nested_group_key = nested_def.get("group_key", "")
                nested_value = row.get(nested_group_key)
                if not nested_value:
                    continue

                nested_fields = nested_def.get("fields", {})
                nested_item = {}
                for out_key, field_def in nested_fields.items():
                    if isinstance(field_def, str):
                        nested_item[out_key] = row.get(field_def)
                    elif isinstance(field_def, dict):
                        source = field_def.get("source_field")
                        default = field_def.get("default")
                        value = row.get(source)
                        nested_item[out_key] = value if value is not None else default

                # Avoid duplicates
                existing = groups[key_value][nested_key]
                if nested_item not in existing:
                    existing.append(nested_item)

        return list(groups.values())

    def _aggregate_object(self, rows: List[Dict], first: Dict, config: Dict) -> Dict:
        """Build an object by processing each field according to its sub-type."""
        fields_config = config.get("fields", {})
        result = {}

        for output_key, field_def in fields_config.items():
            if isinstance(field_def, dict):
                sub_type = field_def.get("type")
                if sub_type == "collect_unique_values":
                    result[output_key] = self._collect_unique_values(
                        rows, field_def.get("source_field", "")
                    )
                elif sub_type == "collect_unique":
                    result[output_key] = self._collect_unique_objects(rows, field_def)
                elif sub_type == "flags_to_list":
                    result[output_key] = self._flags_to_list(first, field_def.get("flags", {}))
                elif sub_type == "boolean_flags_flat":
                    result[output_key] = self._boolean_flags_flat(rows, field_def.get("flags", {}))
                elif sub_type == "boolean_flags_object":
                    result[output_key] = self._boolean_flags_object(rows, field_def.get("groups", {}))
                elif "source_field" in field_def:
                    result[output_key] = first.get(field_def["source_field"])
                else:
                    result[output_key] = None
            elif isinstance(field_def, str):
                result[output_key] = first.get(field_def)

        return result

    def _aggregate_first_row_object(self, first: Dict, config: Dict) -> Dict:
        """Build an object using only values from the first row."""
        fields_config = config.get("fields", {})
        result = {}
        for output_key, source_field in fields_config.items():
            if isinstance(source_field, str):
                result[output_key] = first.get(source_field)
            elif isinstance(source_field, dict):
                result[output_key] = first.get(source_field.get("source_field", ""))
        return result

    def _collect_unique_values(self, rows: List[Dict], source_field: str) -> List[str]:
        """Collect unique non-null values from a field across all rows."""
        values: Set[str] = set()
        for row in rows:
            val = row.get(source_field)
            if val:
                values.add(val)
        return list(values)

    def _collect_unique_objects(self, rows: List[Dict], config: Dict) -> List[Dict]:
        """Collect unique objects from rows based on field definitions."""
        fields_config = config.get("fields", {})
        seen: Set[str] = set()
        results: List[Dict] = []

        for row in rows:
            obj = {}
            has_value = False

            for output_key, field_def in fields_config.items():
                if isinstance(field_def, str):
                    value = row.get(field_def)
                    obj[output_key] = value
                    if value:
                        has_value = True
                elif isinstance(field_def, dict):
                    sub_type = field_def.get("type")
                    if sub_type == "conditional":
                        obj[output_key] = self._resolve_conditional(row, field_def)
                        has_value = True
                    else:
                        source = field_def.get("source_field", "")
                        value = row.get(source)
                        obj[output_key] = value
                        if value:
                            has_value = True

            if has_value:
                key = json.dumps(obj, sort_keys=True)
                if key not in seen:
                    seen.add(key)
                    results.append(obj)

        return results

    def _flags_to_list(self, row: Dict, flags: Dict[str, str]) -> List[str]:
        """Convert flag fields (value == '1') to a list of display names."""
        result = []
        for source_field, display_name in flags.items():
            if row.get(source_field) == "1":
                result.append(display_name)
        return result

    def _boolean_flags_flat(self, rows: List[Dict], flags: Dict[str, str]) -> List[str]:
        """Collect flag values across all rows into a flat list."""
        values: Set[str] = set()
        for row in rows:
            for source_field, display_name in flags.items():
                if row.get(source_field) == "1":
                    values.add(display_name)
        return list(values)

    def _boolean_flags_object(self, rows: List[Dict], groups: Dict[str, Dict[str, str]]) -> Dict[str, List[str]]:
        """Collect boolean flags into grouped lists."""
        result: Dict[str, Set[str]] = {group_name: set() for group_name in groups}
        for row in rows:
            for group_name, flags in groups.items():
                for source_field, display_name in flags.items():
                    if row.get(source_field) == "1":
                        result[group_name].add(display_name)
        return {k: list(v) for k, v in result.items()}

    def _resolve_conditional(self, row: Dict, config: Dict) -> str:
        """Resolve a conditional field value based on conditions."""
        conditions = config.get("conditions", [])
        default = config.get("default", "")

        for condition in conditions:
            field = condition.get("field", "")
            equals = condition.get("equals")
            value = condition.get("value", "")
            if row.get(field) == equals:
                return value

        return default


def load_dataset_config(template_path: str) -> Dict:
    """Load the .dataset.json companion file for a template."""
    template_path = Path(template_path)
    dataset_config_path = template_path.parent / f"{template_path.stem}.dataset.json"

    if not dataset_config_path.exists():
        raise FileNotFoundError(
            f"Dataset config not found: {dataset_config_path}\n"
            f"Each template requires a companion .dataset.json file for dataset generation."
        )

    return json.loads(dataset_config_path.read_text())
