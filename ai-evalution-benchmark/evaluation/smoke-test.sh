#!/usr/bin/env bash
# smoke-test.sh — run all 10 models on 1 paper to confirm they respond correctly
set -u
cd "$(dirname "$0")"

MODELS=(
  "google/gemini-3.8-flash|gemini38flash"
  "deepseek/deepseek-v4-pro-0813|deepseekv4pro"
  "openai/gpt-5.6-luna|gpt56luna"
  "z-ai/glm-5.2|glm52"
  "openai/gpt-6-astra|astra"
  "google/gemini-3.1-pro-preview|gemini31pro"
  "moonshotai/kimi-k3|kimik3"
  "anthropic/claude-opus-5|opus5"
  "anthropic/claude-sonnet-5|sonnet5"
  "anthropic/claude-fable-5.1|fable51"
)

TEMPLATE="./templates/empirical_research_questionaire.json"
DATASET="../dataset"
BACKEND="http://localhost:5001"

echo ">> Building..."
npm run build >/tmp/smoke-build.log 2>&1 || { echo "BUILD FAILED"; exit 1; }

echo ">> Backend check..."
curl -s --max-time 5 "$BACKEND/api/health" >/dev/null || { echo "BACKEND DOWN"; exit 1; }

echo ""
echo "Smoke test: 1 paper per model"
echo "======================================================================"
for entry in "${MODELS[@]}"; do
  model="${entry%%|*}"; tag="${entry##*|}"
  out="smoke-${tag}.json"
  node dist/index.js --mode batch --template "$TEMPLATE" --dataset "$DATASET" \
    --limit 1 --model "$model" --model-tag "$tag" --backend "$BACKEND" \
    --output "$out" >/dev/null 2>&1
  if [ -f "$out" ]; then
    result=$(python3 -c "import json; d=json.load(open('$out')); s=d['summary']; print(f'{s[\"successfulQuestions\"]}/{s[\"totalQuestions\"]}')" 2>/dev/null)
    printf "  %-22s %s\n" "$tag" "$result"
  else
    printf "  %-22s NO OUTPUT (failed)\n" "$tag"
  fi
done

echo "======================================================================"
echo "Cleaning up smoke files..."
rm -f smoke-*.json
echo "Done. If all show X/X with no failures, launch the full run."
