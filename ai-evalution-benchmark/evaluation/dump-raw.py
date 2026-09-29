#!/usr/bin/env python3
"""
dump-raw.py — write the VERBATIM system prompt, user prompt, and raw LLM
response for one paper to a text file, so you can read exactly what was sent
and what came back.

Usage:
  python3 dump-raw.py --file results-astra-evtest-rescored.json --paper R1374618 \
      --output raw-prompt-response.txt
  # no --paper => uses the first paper in the file
"""
import argparse
import json


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--file', required=True)
    ap.add_argument('--paper', default=None, help='paperId (default: first paper)')
    ap.add_argument('--output', default='raw-prompt-response.txt')
    args = ap.parse_args()

    data = json.load(open(args.file))
    papers = data['results']
    paper = None
    if args.paper:
        paper = next((p for p in papers if p.get('paperId') == args.paper), None)
        if paper is None:
            print(f'Paper {args.paper} not found. Available: '
                  + ', '.join(p.get("paperId", "?") for p in papers[:10]))
            return
    else:
        paper = papers[0]

    qs = paper.get('questions', [])
    q0 = next((q for q in qs if q.get('success')), qs[0] if qs else None)
    if q0 is None:
        print('No questions in paper.')
        return

    li = q0.get('llmInteraction', {}) or {}
    sys_prompt = li.get('systemPrompt', '') or ''
    user_prompt = li.get('userPrompt', '') or ''
    raw_response = li.get('rawResponse', '') or ''

    sep = '=' * 90
    out = []
    out.append(sep)
    out.append(f'RAW PROMPT + RESPONSE')
    out.append(f'file   : {args.file}')
    out.append(f'paper  : {paper.get("paperId")}  —  {paper.get("title", "")}')
    out.append(f'model tag (from config): {data.get("configuration", {}).get("modelTag")}')
    out.append(f'questions in this call : {len(qs)}')
    out.append(f'system prompt length   : {len(sys_prompt):,} chars')
    out.append(f'user prompt length     : {len(user_prompt):,} chars')
    out.append(f'prompt tokens          : {li.get("promptTokens")}')
    out.append(f'response tokens        : {li.get("responseTokens")}')
    out.append(sep)
    out.append('')
    out.append('################## SYSTEM PROMPT ##################')
    out.append('')
    out.append(sys_prompt)
    out.append('')
    out.append('################## USER PROMPT (verbatim, full) ##################')
    out.append('')
    out.append(user_prompt)
    out.append('')
    out.append('################## RAW LLM RESPONSE (verbatim, full) ##################')
    out.append('')
    out.append(raw_response)
    out.append('')

    with open(args.output, 'w') as f:
        f.write('\n'.join(out))
    print(f'Wrote {args.output} '
          f'(system {len(sys_prompt):,} + user {len(user_prompt):,} + '
          f'response {len(raw_response):,} chars)')


if __name__ == '__main__':
    main()
