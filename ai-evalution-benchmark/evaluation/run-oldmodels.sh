#!/usr/bin/env bash
#
# run-oldmodels.sh — small-context experiment
#
# Tests whether OLD / modest-context models show the batch-vs-per-question
# gap that modern long-context models hide. For each model we run BOTH
# batch mode and per-question (chunks) mode on the same 25 papers, then
# rescore + export.
#
set -u

# Model list: "openrouter_id|tag|display"
# All chosen models have >= 32K context so the whole-paper batch prompt
# (max ~22K tokens for our papers) ALWAYS fits — batch never fails on a
# context-window error, so batch-vs-per-question reflects model QUALITY only.
MODELS=(
  "openai/gpt-4o-mini|gpt4omini"
  "qwen/qwen-2.5-7b-instruct|qwen257b"
  "mistralai/mistral-small-24b-instruct-2501|mistralsmall24b"
)

DATASET="../dataset"
TEMPLATE="./templates/empirical_research_questionaire.json"
LIMIT=25
OFFSET=10
BACKEND="http://localhost:5001"

cd "$(dirname "$0")"

echo "======================================================================"
echo " SMALL-CONTEXT EXPERIMENT  (batch vs per-question on old models)"
echo " Papers: offset=$OFFSET limit=$LIMIT   Models: ${#MODELS[@]}"
echo "======================================================================"

echo ""
echo ">> Building TypeScript..."
if ! npm run build >/tmp/oldmodels-build.log 2>&1; then
  echo "   BUILD FAILED. See /tmp/oldmodels-build.log"; exit 1
fi
echo "   Build OK"

echo ""
echo ">> Backend health..."
if ! curl -s --max-time 5 "$BACKEND/api/health" >/dev/null 2>&1; then
  echo "   BACKEND NOT REACHABLE. Start it: (cd ../backend && npx tsx src/server.ts)"; exit 1
fi
echo "   Backend OK"

OUTS=()
for entry in "${MODELS[@]}"; do
  model="${entry%%|*}"
  tag="${entry##*|}"

  # --- BATCH ---
  out_batch="results-${tag}-oldbatch.json"
  OUTS+=("$out_batch")
  echo ""
  echo "----- $model  [BATCH]  -> $out_batch -----"
  node dist/index.js \
    --mode batch \
    --template "$TEMPLATE" --dataset "$DATASET" \
    --limit "$LIMIT" --offset "$OFFSET" \
    --model "$model" --model-tag "$tag" \
    --backend "$BACKEND" --skip-existing \
    --output "$out_batch" 2>&1 \
    | grep --line-buffered -E "Processing R|Paper completed|EVALUATION COMPLETE|Questions: [0-9]+/|Failed|error"

  # --- PER-QUESTION (chunks) ---
  out_perq="results-${tag}-oldperq.json"
  OUTS+=("$out_perq")
  echo ""
  echo "----- $model  [PER-QUESTION chunks]  -> $out_perq -----"
  node dist/index.js \
    --mode per-question \
    --template "$TEMPLATE" --dataset "$DATASET" \
    --limit "$LIMIT" --offset "$OFFSET" \
    --model "$model" --model-tag "$tag" \
    --backend "$BACKEND" --skip-existing --with-context \
    --output "$out_perq" 2>&1 \
    | grep --line-buffered -E "Processing R|Paper completed|EVALUATION COMPLETE|Questions: [0-9]+/|Failed|error"

  # --- PER-QUESTION (full paper) ---
  out_perqfull="results-${tag}-oldperqfull.json"
  OUTS+=("$out_perqfull")
  echo ""
  echo "----- $model  [PER-QUESTION full paper]  -> $out_perqfull -----"
  node dist/index.js \
    --mode per-question \
    --template "$TEMPLATE" --dataset "$DATASET" \
    --limit "$LIMIT" --offset "$OFFSET" \
    --model "$model" --model-tag "$tag" \
    --backend "$BACKEND" --skip-existing --with-context --full-content \
    --output "$out_perqfull" 2>&1 \
    | grep --line-buffered -E "Processing R|Paper completed|EVALUATION COMPLETE|Questions: [0-9]+/|Failed|error"
done

echo ""
echo "======================================================================"
echo " RUN COMPLETE — files:"
for o in "${OUTS[@]}"; do [ -f "$o" ] && echo "   $o"; done
echo "======================================================================"
echo "Next: rescore with  HF_HUB_OFFLINE=1 python3 rescore-all.py results-*-old*.json"
