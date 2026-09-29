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


def prompt_info_block(paper):
    """Summarise the prompt sent for this paper: length, tokens, and whether the
    FULL paper (all pages) was provided vs a chunk. Also shows a short excerpt."""
    import re
    qs = [q for q in paper.get('questions', []) if q.get('success')]
    if not qs:
        return '> _(no successful questions — no prompt captured)_'

    # In batch mode every question shares one prompt; in per-question mode each
    # question has its own. Use the first successful question as representative,
    # but report the range of content lengths so chunking is visible.
    total_pages = (paper.get('pdfMetadata') or {}).get('totalPages')
    lines = ['**Prompt / context sent:**', '']

    li0 = qs[0].get('llmInteraction', {}) or {}
    user_prompt = li0.get('userPrompt', '') or li0.get('fullPrompt', '') or ''

    # content lengths across questions (differ if chunked)
    clens = [ (q.get('metadata') or {}).get('pdfContentLength', 0) for q in qs ]
    clens = [c for c in clens if c]
    ptoks = [ (q.get('llmInteraction') or {}).get('promptTokens', 0) for q in qs ]
    ptoks = [t for t in ptoks if t]

    # how many distinct page markers appear in the representative prompt.
    # Batch prompts use "[PAGE N]"; per-question prompts use "[Page N]".
    pages_in_prompt = sorted(set(
        int(m) for m in re.findall(r'\[page (\d+)\]', user_prompt, re.IGNORECASE)))
    n_pages_prompt = len(pages_in_prompt)

    # Signal 1: fraction of the paper's pages present in the prompt.
    # Signal 2: whether content length varies across questions (chunking) vs is
    #           constant (whole paper reused). Signal 2 is decisive.
    content_varies = len(clens) > 1 and (max(clens) - min(clens) > 200)

    if content_varies:
        full = False  # per-question chunks: different slice each question
    elif total_pages and n_pages_prompt:
        full = (n_pages_prompt / total_pages) >= 0.9
    elif '<paper' in user_prompt:
        full = True
    else:
        full = None  # unknown

    verdict = ('FULL PAPER' if full else 'CHUNK (partial)') if full is not None else 'UNKNOWN'
    lines.append(f'- context type: **{verdict}**'
                 + (f'  — {n_pages_prompt}/{total_pages} pages present in prompt'
                    if (total_pages and n_pages_prompt) else ''))
    if clens:
        if min(clens) == max(clens):
            lines.append(f'- PDF content sent: {clens[0]:,} chars (same for all questions)')
        else:
            lines.append(f'- PDF content sent: {min(clens):,}–{max(clens):,} chars '
                         f'(varies per question → chunked)')
    if ptoks:
        if min(ptoks) == max(ptoks):
            lines.append(f'- prompt tokens: ~{ptoks[0]:,}')
        else:
            lines.append(f'- prompt tokens: ~{min(ptoks):,}–{max(ptoks):,}')
    lines.append(f'- prompt length: {len(user_prompt):,} chars'
                 + ('  (shared batch prompt)' if len(clens) and min(clens) == max(clens) and len(qs) > 1 else ''))

    # short excerpt of the prompt so you can eyeball what was sent
    excerpt = user_prompt[:500].replace('\n', ' ')
    lines.append('')
    lines.append('<details><summary>prompt excerpt (first 500 chars)</summary>')
    lines.append('')
    lines.append('```')
    lines.append(excerpt)
    lines.append('```')
    lines.append('</details>')
    return '\n'.join(lines)


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
            lines.append(prompt_info_block(paper))
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
