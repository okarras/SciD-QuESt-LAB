# AI Evaluation Benchmark

A standalone benchmark system for evaluating AI questionnaire assistants against academic papers from ORKG. Fully self-contained — no external project dependencies.

## Project Structure

```
ai-evalution-benchmark/
├── config.yaml                 # Configuration for dataset generation
├── requirements.txt            # Python dependencies (dataset generation)
├── scripts/                    # Dataset generation scripts (Python)
│   ├── generate_dataset.py     # Main entry: download papers from ORKG
│   ├── sparql_fetcher.py       # SPARQL queries against ORKG
│   ├── pdf_downloader.py       # Download PDFs via Unpaywall/DOI
│   ├── dataset_organizer.py    # Organize papers into dataset/
│   ├── data_validator.py       # Validate downloaded data
│   ├── analyze_dataset.py      # Analyze dataset statistics
│   ├── rebuild_index.py        # Rebuild dataset_index.json
│   ├── regenerate_metadata.py  # Regenerate metadata files
│   ├── retry_failed_pdfs.py    # Retry failed PDF downloads
│   └── utils.py                # Shared utilities
├── backend/                    # Standalone AI backend (Express)
│   ├── src/
│   │   ├── server.ts           # Express server (health + AI + semantic chunks)
│   │   ├── aiService.ts        # AI provider abstraction (OpenAI/Groq/Mistral)
│   │   └── semanticChunker.ts  # Semantic similarity chunking (MiniLM)
│   ├── package.json
│   └── tsconfig.json
├── evaluation/                 # Evaluation runner (TypeScript)
│   ├── src/                    # TypeScript source files
│   ├── templates/              # Questionnaire template
│   ├── package.json
│   ├── tsconfig.json
│   ├── rescore-all.py          # Post-processing: recompute metrics
│   ├── standalone-fair-rescore.py
│   ├── compare.py              # Compare model results
│   └── export-excel.py         # Export results to Excel
├── dataset/                    # Generated dataset (gitignored)
├── logs/                       # Logs (gitignored)
└── results/                    # Evaluation results (gitignored)
```

## Quick Start

### 1. Download Dataset

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Unpaywall email
python scripts/generate_dataset.py --limit 10
```

Retry failed PDFs:

```bash
python scripts/retry_failed_pdfs.py
```

### 2. Start Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — add your OPENROUTER_API_KEY (get one at https://openrouter.ai/keys)
npm run dev
```

Verify: `curl http://localhost:5001/api/health`

The backend provides:
- `POST /api/ai/generate` — AI text generation via OpenRouter (any model)
- `POST /api/ai/semantic-chunks` — Semantic similarity-based PDF chunking
- `GET /api/health` — Health check

### 3. Run Evaluation

```bash
cd evaluation
npm install
npm run build
node dist/index.js --limit 10 --model openai/gpt-4o-mini --dataset ../dataset
```

Options:

```
--dataset PATH      Path to dataset directory
--limit N           Evaluate only N papers
--offset N          Skip first N papers
--model NAME        Model in vendor/model format (e.g. openai/gpt-4o-mini, anthropic/claude-sonnet-4)
--model-tag TAG     Tag for output file naming
--with-context      Include sibling ground truth as context
--backend URL       Backend URL (default: http://localhost:5001)
--test              Test backend connectivity only
```

### 4. Post-Processing Pipeline

```bash
cd evaluation

# Step 1: Recompute all metrics (BERTScore + SBERT + boolean normalization)
python3 rescore-all.py results-*.json

# Step 2: Fair matching for repeat-text questions
python3 standalone-fair-rescore.py

# Step 3: Compare models
python3 compare.py

# Step 4: Export to Excel
python3 export-excel.py
```

### 5. View Results

```bash
cat evaluation/results-*-final.json | jq '.summary'
```

## Cost Estimates

| Model         | 1 paper | 10 papers | 50 papers | 200 papers |
| ------------- | ------- | --------- | --------- | ---------- |
| GPT-3.5-turbo | ~$0.01  | ~$0.10    | ~$0.50    | ~$2.00     |
| GPT-4o-mini   | ~$0.02  | ~$0.20    | ~$1.00    | ~$4.00     |

## Requirements

- Python 3.9+ (dataset generation)
- Node.js 18+ (backend and evaluation runner)
- An OpenRouter API key (https://openrouter.ai/keys)
