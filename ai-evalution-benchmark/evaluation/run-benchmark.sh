#!/usr/bin/env bash
#
# run-benchmark.sh — one-shot evaluation runner
#
# Edit the CONFIG block below, then run:  ./run-benchmark.sh
# It builds the project, checks the backend, runs every model, and
# (optionally) exports an Excel comparison.
#
set -u  # error on undefined vars (but keep going on model failures)

# ============================ CONFIG ============================
# Models to evaluate — "openrouter_model_id|short_tag"
# The short_tag is used in output filenames: results-<tag>.json
MODELS=(
  "openai/gpt-5.6-luna|gpt56luna"
  "google/gemini-3.8-flash|gemini38flash"
  "z-ai/glm-5.2|glm52"
)

# A suffix appended to every output file (keeps runs from overwriting each
# other). Example: RUN_TAG="perq" → results-gpt56luna-perq.json
RUN_TAG="perqfull"

MODE="per-question"     # "batch" or "per-question"
WITH_CONTEXT=true       # true = inject sibling ground-truth context (per-question only)
FULL_CONTENT=true       # true = send whole paper instead of semantic chunks (per-question only)
DATASET="../dataset"    # path to dataset dir
TEMPLATE="./templates/empirical_research_questionaire.json"
LIMIT=25                # number of papers
OFFSET=10               # skip first N papers (0 = start from beginning)
BACKEND="http://localhost:5001"

EXPORT_EXCEL=true       # true = generate Excel after all runs
EXCEL_OUTPUT="evaluation-results-${RUN_TAG}.xlsx"
# ================================================================

cd "$(dirname "$0")"

echo "======================================================================"
echo " AI Evaluation Benchmark Runner"
echo "======================================================================"
echo " Mode:      $MODE"
echo " Dataset:   $DATASET"
echo " Papers:    offset=$OFFSET limit=$LIMIT"
echo " Run tag:   $RUN_TAG"
echo " Models:    ${#MODELS[@]}"
echo "======================================================================"

# --- 1. Build -----------------------------------------------------------
echo ""
echo ">> Building TypeScript..."
if ! npm run build >/tmp/benchmark-build.log 2>&1; then
  echo "   BUILD FAILED. See /tmp/benchmark-build.log"
  exit 1
fi
echo "   Build OK"

# --- 2. Backend health check -------------------------------------------
echo ""
echo ">> Checking backend at $BACKEND ..."
if ! curl -s --max-time 5 "$BACKEND/api/health" >/dev/null 2>&1; then
  echo "   BACKEND NOT REACHABLE."
  echo "   Start it first:  (cd ../backend && npx tsx src/server.ts)"
  exit 1
fi
echo "   Backend OK"

# --- 3. Run each model --------------------------------------------------
declare -a OUTPUTS=()
FAILED=()

for entry in "${MODELS[@]}"; do
  model="${entry%%|*}"
  tag="${entry##*|}"
  output="results-${tag}-${RUN_TAG}.json"
  OUTPUTS+=("$output")

  echo ""
  echo "----------------------------------------------------------------------"
  echo " Model: $model  →  $output"
  echo "----------------------------------------------------------------------"

  # --skip-existing lets a re-run resume: already-answered questions are kept,
  # only missing ones are re-evaluated. Progress lines print live (grep --line-buffered).
  CONTEXT_FLAG=""
  if [ "$MODE" = "per-question" ] && [ "$WITH_CONTEXT" = true ]; then
    CONTEXT_FLAG="--with-context"
  fi
  FULLCONTENT_FLAG=""
  if [ "$MODE" = "per-question" ] && [ "${FULL_CONTENT:-false}" = true ]; then
    FULLCONTENT_FLAG="--full-content"
  fi

  node dist/index.js \
    --mode "$MODE" \
    --template "$TEMPLATE" \
    --dataset "$DATASET" \
    --limit "$LIMIT" \
    --offset "$OFFSET" \
    --model "$model" \
    --model-tag "$tag" \
    --backend "$BACKEND" \
    --skip-existing \
    $CONTEXT_FLAG \
    $FULLCONTENT_FLAG \
    --output "$output" 2>&1 \
    | grep --line-buffered -E "Processing R|Paper completed|Completed in|EVALUATION COMPLETE|Questions: [0-9]+/"

  if [ ! -f "$output" ]; then
    echo "   !! No output produced for $model"
    FAILED+=("$model")
  fi
done

# --- 4. Summary ---------------------------------------------------------
echo ""
echo "======================================================================"
echo " RUN COMPLETE"
echo "======================================================================"
for out in "${OUTPUTS[@]}"; do
  if [ -f "$out" ]; then
    python3 -c "import json; d=json.load(open('$out')); s=d['summary']; print(f'  $out: {s[\"successfulQuestions\"]}/{s[\"totalQuestions\"]} questions')" 2>/dev/null \
      || echo "  $out: (could not read summary)"
  fi
done
if [ ${#FAILED[@]} -gt 0 ]; then
  echo ""
  echo " FAILED MODELS: ${FAILED[*]}"
fi

# --- 5. Export Excel (optional) ----------------------------------------
if [ "$EXPORT_EXCEL" = true ]; then
  echo ""
  echo ">> Exporting Excel ($EXCEL_OUTPUT)..."
  python3 export-excel.py --run-tag "$RUN_TAG" --output "$EXCEL_OUTPUT" 2>&1 | tail -8
fi

echo ""
echo "Done."
