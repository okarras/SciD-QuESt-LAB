#!/usr/bin/env python3
"""
make-report.py — human-readable inspection report.

For each (model, paper, question) it prints:
  - paper id + question text + type
  - ground truth
  - each of the 3 ranked suggestions with evidence (page + excerpt)
  - PASS/FAIL per suggestion and the overall S1 / Any-of-3 verdict

Uses the shared strict scoring from eval_common.py so PASS/FAIL matches the
official numbers.

Usage:
  python3 make-report.py                       # defaults: astra,gemini38flash,glm52 x 5 papers
  python3 make-report.py --models astra:GPT-6-Astra gemini38flash:Gemini-3.8-Flash \
      --runtag run2 --papers 5 --output inspection-report.md
"""
import argparse
import json
import os
import eval_common as EC


def fmt_gt(gt):
    if isinstance(gt, list):
        return ', '.join(str(x) for x in gt)
    return str(gt)


def fmt_evidence(ev):
    if not ev:
        return '      (no evidence provided)'
    lines = []
    for e in ev:
        page = e.get('pageNumber', e.get('page', '?'))
        exc = str(e.get('excerpt', e.get('text', ''))).strip().replace('\n', ' ')
        if len(exc) > 300:
            exc = exc[:300] + '…'
        lines.append(f'      - p.{page}: "{exc}"')
    return '\n'.join(lines)


def metric_for(metrics_sugs, position):
    """The metrics entry (has isCorrect/bertScore/f1Score) for a given position."""
    return next((m for m in metrics_sugs if m.get('position') == position), {})


def build(models, runtag, n_papers, out_path):
    lines = []
    lines.append('# Evaluation Inspection Report')
    lines.append('')
    lines.append(EC.CONFIG_BANNER)
    lines.append('')
    lines.append(f'Models: {", ".join(name for _, name in models)}  |  '
                 f'First {n_papers} papers  |  run tag: `{runtag}`')
    lines.append('')
    lines.append('PASS/FAIL uses strict scoring. **S1** = rank-1 suggestion; '
                 '**Any-of-3** = any of the 3 suggestions is correct.')
    lines.append('')

    for tag, name in models:
        path = f'results-{tag}-{runtag}-rescored.json'
        if not os.path.exists(path):
            lines.append(f'\n## {name}\n\n_(file {path} not found)_\n')
            continue
        data = json.load(open(path))
        lines.append('\n' + '=' * 70)
        lines.append(f'# MODEL: {name}')
        lines.append('=' * 70)

        for paper in data['results'][:n_papers]:
            pid = paper.get('paperId', '')
            title = paper.get('title', '')
            lines.append(f'\n\n## Paper `{pid}`')
            if title:
                lines.append(f'*{title}*')
            lines.append('')

            for q in paper['questions']:
                qid = q.get('questionId', '')
                qtext = q.get('questionText', '')
                qtype = EC.normalize_qtype(q.get('questionType', ''))
                gt = q.get('groundTruth')

                lines.append(f'### {qid}  _({qtype})_')
                lines.append(f'**Question:** {qtext}')
                lines.append('')

                if not q.get('success'):
                    lines.append(f'> **STATUS: FAILED** — {q.get("error", "no answer produced")}')
                    lines.append('')
                    continue

                if EC.is_sentinel(gt):
                    lines.append(f'> _(skipped: sentinel/placeholder ground truth "{fmt_gt(gt)}")_')
                    lines.append('')
                    continue

                excluded = qid in EC.EXCLUDED_QUESTIONS
                lines.append(f'**Ground truth:** `{fmt_gt(gt)}`'
                             + ('  _(excluded from scoring)_' if excluded else ''))
                lines.append('')

                # text + evidence come from top-level suggestions;
                # correctness + scores come from metrics.suggestions (by position).
                sugs = q.get('suggestions', [])
                metrics_sugs = (q.get('metrics') or {}).get('suggestions', [])
                s1_pass = False
                any_pass = False
                for i, s in enumerate(sugs[:3], 1):
                    text = str(s.get('text', '')).strip()
                    m = metric_for(metrics_sugs, i)
                    # STRICT pass/fail — matches compare.py / eval_common:
                    #  - text/repeat_text: bertScore >= STRICT_BERT
                    #  - multi_select: f1Score >= STRICT_F1
                    #  - boolean/select/url: exact-or-partial (stored isCorrect)
                    if qtype == 'text':
                        bs = m.get('bertScore')
                        ok = bs is not None and bs >= EC.STRICT_BERT
                    elif qtype == 'multi_select':
                        f1 = m.get('f1Score')
                        ok = f1 is not None and f1 >= EC.STRICT_F1
                    else:
                        ok = bool(m.get('isCorrect'))
                    if i == 1:
                        s1_pass = ok
                    any_pass = any_pass or ok
                    mark = '✅ PASS' if ok else '❌ FAIL'
                    conf = s.get('confidence', '')
                    lines.append(f'- **Suggestion {i}** [{mark}]  (confidence {conf})')
                    lines.append(f'    - answer: `{text}`')
                    # show score detail for text/multi_select
                    if qtype == 'text':
                        bs = m.get('bertScore')
                        if bs is not None:
                            lines.append(f'    - similarity score: {bs:.3f} '
                                         f'(threshold {EC.STRICT_BERT})')
                    elif qtype == 'multi_select':
                        f1 = m.get('f1Score')
                        if f1 is not None:
                            lines.append(f'    - F1 score: {f1:.3f} '
                                         f'(threshold {EC.STRICT_F1})')
                    lines.append('    - evidence:')
                    lines.append(fmt_evidence(s.get('evidence', [])))

                verdict_s1 = '✅ PASS' if s1_pass else '❌ FAIL'
                verdict_any = '✅ PASS' if any_pass else '❌ FAIL'
                lines.append('')
                lines.append(f'**Verdict:** S1 = {verdict_s1}   |   Any-of-3 = {verdict_any}')
                lines.append('')

    with open(out_path, 'w') as f:
        f.write('\n'.join(lines))
    print(f'Wrote {out_path}')


def parse_pairs(items):
    out = []
    for it in items:
        tag, _, label = it.partition(':')
        out.append((tag, label or tag))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--models', nargs='+',
                    default=['astra:GPT-6-Astra',
                             'gemini38flash:Gemini-3.8-Flash',
                             'glm52:GLM-5.2'])
    ap.add_argument('--runtag', default='run2')
    ap.add_argument('--papers', type=int, default=5)
    ap.add_argument('--output', default='inspection-report.md')
    args = ap.parse_args()
    build(parse_pairs(args.models), args.runtag, args.papers, args.output)


if __name__ == '__main__':
    main()
