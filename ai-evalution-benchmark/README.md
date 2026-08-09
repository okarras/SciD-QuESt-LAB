# AI Evaluation Benchmark

A template-driven benchmark system for evaluating AI questionnaire assistants against academic papers. Supports any questionnaire template — just provide the config files.

## Project Structure

```
ai-evalution-benchmark/
├── config.yaml                 # General config (PDF download, logging, etc.)
├── requirements.txt            # Python dependencies
├── scripts/                    # Dataset generation (Python)
│   ├── generate_dataset.py     # Main entry point
│   ├── sparql_fetcher.py       # Generic SPARQL engine (config-driven)
│   ├── pdf_downloader.py       # PDF download via Unpaywall/DOI
│   ├── dataset_organizer.py    # Organize papers into dataset/
│   ├── data_validator.py       # Validate downloaded data
│   └── ...                     # Utilities and helpers
├── backend/                    # AI backend service (Express + TypeScript)
│   └── src/
│       ├── server.ts           # Express server
│       ├── aiService.ts        # AI provider abstraction (OpenRouter)
│       └── semanticChunker.ts  # Semantic chunking (MiniLM)
├── evaluation/                 # Evaluation runner (TypeScript)
│   ├── src/
│   │   ├── index.ts            # CLI entry point
│   │   ├── eval-config-loader.ts   # Loads .eval.json config
│   │   ├── evaluation-runner.ts    # Orchestrates the pipeline
│   │   ├── template-loader.ts     # Loads questionnaire template
│   │   ├── ground-truth-mapper.ts # Generic mapping engine
│   │   ├── sibling-context-provider.ts
│   │   ├── simple-metrics-calculator.ts
│   │   ├── prompt-assembler.ts
│   │   └── ...
│   └── templates/              # Template + companion config files
│       ├── empirical_research_questionaire.json          # Template
│       ├── empirical_research_questionaire.eval.json     # Evaluation config
│       └── empirical_research_questionaire.dataset.json  # Dataset generation config
├── dataset/                    # Generated dataset (gitignored)
├── logs/                       # Logs (gitignored)
└── results/                    # Evaluation results (gitignored)
```

## Template System

Each questionnaire template has up to three companion files:

| File | Purpose |
|------|---------|
| `<name>.json` | Questionnaire structure (sections, questions, options) |
| `<name>.eval.json` | Evaluation config (ground truth mappings, metrics, sibling deps, system prompt) |
| `<name>.dataset.json` | Dataset generation config (SPARQL query + result mapping) |

To support a new template, create these files — no code changes needed.

### What's in `.eval.json`

- **Ground truth mappings** — how to extract answers from dataset metadata (uses named transforms)
- **Metrics** — what counts as "correct" per question type (thresholds for BERTScore, F1, exact match)
- **Sibling dependencies** — which questions provide context for other questions
- **System prompt** — the AI instruction sent with each question
- **Skip lists** — questions/types to exclude from evaluation

### What's in `.dataset.json`

- **SPARQL query** — the query to fetch papers and their metadata from the knowledge graph
- **Result mapping** — how to transform raw SPARQL rows into the `questionnaire_data` structure

## Quick Start

### 1. Generate Dataset

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Set your UNPAYWALL_EMAIL

python scripts/generate_dataset.py \
  --template evaluation/templates/empirical_research_questionaire.json \
  --limit 10
```

#### Resuming a Failed Run

If dataset generation fails midway (network issues, rate limits, etc.):

```bash
# Resume — skips papers already downloaded, continues from where it left off
python scripts/generate_dataset.py \
  --template evaluation/templates/empirical_research_questionaire.json \
  --resume

# Only retry papers that have metadata but failed PDF download
python scripts/generate_dataset.py \
  --template evaluation/templates/empirical_research_questionaire.json \
  --retry-failed

# Skip PDF downloads entirely (metadata only)
python scripts/generate_dataset.py \
  --template evaluation/templates/empirical_research_questionaire.json \
  --no-pdf
```

#### Rebuilding the Dataset Index

If you manually add/remove paper directories or need to refresh the index:

```bash
python scripts/rebuild_index.py --dataset dataset
```

This scans existing paper directories and regenerates `dataset_index.json` without fetching anything from ORKG.

#### Dataset Generation Options

```
--template PATH     Path to template JSON (required, must have companion .dataset.json)
--limit N           Only fetch N papers
--output PATH       Output directory (default: dataset/)
--resume            Skip already-downloaded papers
--retry-failed      Only retry papers missing PDFs
--no-pdf            Skip PDF downloads, fetch metadata only
--config PATH       Path to config.yaml (default: config.yaml)
```

### 2. Start Backend

```bash
cd backend
npm install
cp .env.example .env  # Set your OPENROUTER_API_KEY
npm run dev
```

Verify: `curl http://localhost:5001/api/health`

### 3. Run Evaluation

```bash
cd evaluation
npm install
npm run build

node dist/index.js \
  --template ./templates/empirical_research_questionaire.json \
  --dataset ../dataset \
  --limit 10 \
  --model openai/gpt-4o-mini
```

### CLI Options

```
--template PATH     Path to questionnaire template JSON (required companion .eval.json)
--dataset PATH      Path to dataset directory (default: ../dataset)
--limit N           Evaluate only N papers
--offset N          Skip first N papers
--model NAME        Model in vendor/model format (e.g. openai/gpt-4o-mini)
--model-tag TAG     Tag for output file naming
--with-context      Include sibling ground truth as context
--skip-existing     Only evaluate questions not already in output file
--only-questions    Comma-separated question IDs to evaluate
--backend URL       Backend URL (default: http://localhost:5001)
--test              Test backend connectivity only
--help              Show help
```

### 4. Post-Processing

#### Resuming a Failed Evaluation

If the evaluation crashes or you interrupt it:

```bash
# Re-run with --skip-existing to only evaluate questions not already in the output file
node dist/index.js \
  --template ./templates/empirical_research_questionaire.json \
  --dataset ../dataset \
  --model openai/gpt-4o-mini \
  --output results-gpt4omini-0-all.json \
  --skip-existing
```

This reads the existing output file, skips questions already evaluated successfully, and merges new results in.

### 5. Post-Processing

```bash
cd evaluation

# Recompute metrics
python3 rescore-all.py results-*.json

# Fair matching for repeat-text questions
python3 standalone-fair-rescore.py

# Compare models
python3 compare.py

# Export to Excel
python3 export-excel.py
```

## Adding a New Template

1. **Create the template** — `templates/my_template.json` with sections and questions
2. **Create the eval config** — `templates/my_template.eval.json`:
   - Define ground truth mappings using named transforms (`direct`, `flags_to_list`, `first_item_field`, `array_non_empty_boolean`, etc.)
   - Set metric thresholds per question type
   - Define sibling dependencies (optional)
   - Set the system prompt and AI parameters
3. **Create the dataset config** — `templates/my_template.dataset.json`:
   - Write the SPARQL query for your knowledge graph
   - Define the result mapping (how rows become `questionnaire_data`)
4. **Generate dataset**: `python scripts/generate_dataset.py --template evaluation/templates/my_template.json`
5. **Run evaluation**: `node dist/index.js --template ./templates/my_template.json --dataset ../dataset`

### Available Transforms (for `.eval.json`)

| Transform | Description |
|-----------|-------------|
| `direct` | Return value as-is |
| `ensure_array` | Wrap scalar in array |
| `filter_array` | Remove nulls and sentinel values |
| `array_field` | Extract a field from each array item |
| `array_non_empty_boolean` | "yes" if array non-empty, "no" otherwise |
| `flags_to_list` | Map object keys (where value is "1") to display names |
| `truthy_to_yes_no` | Convert truthy/falsy to "yes"/"no" |
| `first_item_field` | First array item's named field |
| `first_item_boolean_field` | First array item's boolean field as "yes"/"no" |
| `nested_first_item_field` | First item → nested array → first nested item's field |
| `join_array_field` | Join a field from all items with separator |
| `analysis_methods_aggregate` | Aggregate analysis method categories |
| `custom` | Custom logic identified by `custom_id` |

## Requirements

- Python 3.9+
- Node.js 18+
- OpenRouter API key ([openrouter.ai/keys](https://openrouter.ai/keys))

## Cost Estimates

| Model | 1 paper | 10 papers | 50 papers | 200 papers |
|-------|---------|-----------|-----------|------------|
| GPT-3.5-turbo | ~$0.01 | ~$0.10 | ~$0.50 | ~$2.00 |
| GPT-4o-mini | ~$0.02 | ~$0.20 | ~$1.00 | ~$4.00 |
