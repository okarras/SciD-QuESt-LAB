#!/usr/bin/env python3
"""
Rebuild dataset_index.json from existing paper directories.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from dataset_organizer import DatasetOrganizer


def rebuild_index(dataset_path: str = 'dataset'):
    dataset_dir = Path(dataset_path)
    if not dataset_dir.exists():
        print(f"Dataset directory not found: {dataset_path}")
        return False

    organizer = DatasetOrganizer(base_path=dataset_path, skip_existing=False)

    paper_dirs = [d for d in dataset_dir.iterdir()
                  if d.is_dir() and not d.name.startswith('.')]

    print(f"Found {len(paper_dirs)} paper directories")

    import json
    for paper_dir in paper_dirs:
        metadata_file = paper_dir / 'metadata.json'
        if not metadata_file.exists():
            continue

        try:
            metadata = json.loads(metadata_file.read_text())
            paper_id = metadata.get('paper_id', paper_dir.name)
            organizer._track_paper(paper_id, metadata)

            if (paper_dir / 'paper.pdf').exists():
                organizer.stats['papers_with_pdf'] += 1
        except Exception as e:
            print(f"  Error reading {paper_dir.name}: {e}")
            organizer.stats['errors'] += 1

    organizer.generate_index()
    stats = organizer.get_statistics()

    print(f"\nIndex rebuilt: {dataset_path}/dataset_index.json")
    print(f"  Papers: {len(organizer.papers)}")
    print(f"  With PDF: {stats['papers_with_pdf']}")
    print(f"  Errors: {stats['errors']}")
    return True


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Rebuild dataset index from existing files')
    parser.add_argument('--dataset', type=str, default='dataset', help='Path to dataset directory')
    args = parser.parse_args()

    success = rebuild_index(args.dataset)
    sys.exit(0 if success else 1)
