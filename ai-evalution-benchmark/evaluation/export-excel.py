#!/usr/bin/env python3
"""
Export evaluation results to Excel

Usage:
  python3 export-excel.py                 # uses the RESULT_FILES config below
  python3 export-excel.py --run-tag run2  # auto-discovers results-<model>-run2.json
"""
import json
import re
import sys
import argparse
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Shared canonical scoring config — keep the Excel identical to compare.py
import eval_common as EC

# Strip illegal XML characters that openpyxl rejects
_ILLEGAL_XML_RE = re.compile(
    r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]'
)

def sanitize(value):
    """Remove characters that are illegal in Excel/XML cells."""
    if isinstance(value, str):
        return _ILLEGAL_XML_RE.sub('', value)
    return value


# Model registry: display name -> (short label, filename tag).
# Must match the tags used in run-benchmark.sh.
MODEL_REGISTRY = {
    'Gemini-3.8-Flash': ('Gem-3.8F', 'gemini38flash'),
    'DeepSeek-V4-Pro': ('DeepSeek', 'deepseekv4pro'),
    'GPT-5.6-Luna': ('GPT-Luna', 'gpt56luna'),
    'GLM-5.2': ('GLM', 'glm52'),
    'GPT-6-Astra': ('Astra', 'astra'),
    'Gemini-3.1-Pro': ('Gem-3.1P', 'gemini31pro'),
    'Kimi-K3': ('Kimi', 'kimik3'),
    'Claude-Opus-5': ('Opus5', 'opus5'),
    'Claude-Sonnet-5': ('Sonnet5', 'sonnet5'),
    'Claude-Fable-5.1': ('Fable', 'fable51'),
    # Older / smaller models (small-context experiment; all >=32K so batch fits)
    'GPT-4o-mini': ('GPT4o-mini', 'gpt4omini'),
    'Qwen-2.5-7B': ('Qwen25-7B', 'qwen257b'),
    'Mistral-Small-24B': ('Mistral24B', 'mistralsmall24b'),
}

# Default config (used when --run-tag is not passed)
RESULT_FILES = {
    'Gemini-3.8-Flash': ['results-gemini38flash-v3.json'],
    'DeepSeek-V4-Pro': ['results-deepseekv4pro-v3.json'],
    'GPT-5.6-Luna': ['results-gpt56luna-v3.json'],
    'GLM-5.2': ['results-glm52-v3.json'],
}
SHORT = {name: short for name, (short, _tag) in MODEL_REGISTRY.items()}

# Single scoring standard — imported from eval_common so the Excel and the
# comparison tool can never diverge. Strict thresholds only.
STRICT_BERT = EC.STRICT_BERT
STRICT_F1 = EC.STRICT_F1
THRESHOLDS = [
    {'name': f'Strict (BERT>={STRICT_BERT}, F1>={STRICT_F1})', 'bert': STRICT_BERT, 'f1': STRICT_F1},
]

SENTINEL_VALUES = EC.SENTINEL_VALUES
EXCLUDED_QUESTIONS = EC.EXCLUDED_QUESTIONS

NO_SIBLING_QUESTIONS = {
    'answer_highlighted', 'data_type', 'descriptive_stats_used',
    'inferential_stats_used', 'method_type', 'ml_used',
    'other_analysis_used', 'rq_text', 'threats_reported',
    'answer_hidden', 
}

# Manual validation overrides (none for this run)
FORCE_CORRECT = {}
EXCLUDE_PAIRS = set()

OUTPUT_FILE = 'evaluation-results.xlsx'

HEADER_FONT = Font(bold=True, color='FFFFFF', size=11)
HEADER_FILL = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
CORRECT_FILL = PatternFill(start_color='C6EFCE', end_color='C6EFCE', fill_type='solid')
INCORRECT_FILL = PatternFill(start_color='FFC7CE', end_color='FFC7CE', fill_type='solid')
SUBHEADER_FILL = PatternFill(start_color='D9E2F3', end_color='D9E2F3', fill_type='solid')
THIN_BORDER = Border(
    left=Side(style='thin'), right=Side(style='thin'),
    top=Side(style='thin'), bottom=Side(style='thin')
)


# Delegate to the shared canonical implementation.
is_sentinel = EC.is_sentinel


def format_evidence(evidence_list):
    """Format evidence as 'Page X: excerpt' joined by newlines."""
    if not evidence_list:
        return ''
    parts = []
    for ev in evidence_list:
        page = ev.get('pageNumber', '?')
        excerpt = ev.get('excerpt', '')
        parts.append(f"Page {page}: {excerpt}")
    return '\n'.join(parts)


def load_full_questions(paths):
    qs = {}
    for path in paths:
        with open(path) as f:
            data = json.load(f)
        for paper in data['results']:
            pid = paper.get('paperId', '')
            for q in paper['questions']:
                if not q.get('success'):
                    continue
                if is_sentinel(q.get('groundTruth')):
                    continue
                if q.get('questionId') in EXCLUDED_QUESTIONS:
                    continue
                m = q.get('metrics', {})
                if not m or not m.get('suggestions'):
                    continue
                s1 = next((s for s in m['suggestions'] if s.get('position') == 1), None)
                if not s1:
                    continue
                key = (pid, q['questionId'])
                qt = q.get('questionType', '')
                if qt == 'repeat_text':
                    qt = 'text'

                # Extract evidence from top-level suggestions (not metrics)
                evidence = ''
                top_suggestions = q.get('suggestions', [])
                if top_suggestions:
                    top_s1 = next((s for s in top_suggestions if s.get('position') == 1), top_suggestions[0])
                    evidence = format_evidence(top_s1.get('evidence', []))

                # Strict any-of-3: is any of the (up to 3) suggestions correct
                # under the strict thresholds?
                any_correct = False
                for sug in m['suggestions']:
                    sqt = qt
                    if sqt in ('boolean', 'select', 'single_select', 'text_object', 'url'):
                        if sug.get('isCorrect'):
                            any_correct = True
                    elif sqt == 'text':
                        bs = sug.get('bertScore')
                        if bs is not None and bs >= STRICT_BERT:
                            any_correct = True
                    elif sqt == 'multi_select':
                        f1v = sug.get('f1Score')
                        if f1v is not None and f1v >= STRICT_F1:
                            any_correct = True
                    if any_correct:
                        break

                qs[key] = {
                    'paperId': pid,
                    'questionId': q['questionId'],
                    'questionType': qt,
                    'groundTruth': q.get('groundTruth'),
                    'prediction': s1.get('text', ''),
                    'bertScore': s1.get('bertScore'),
                    'f1Score': s1.get('f1Score'),
                    'accuracy': s1.get('accuracy'),
                    'isCorrect': s1.get('isCorrect', False),
                    'anyCorrect': any_correct,
                    'evidence': evidence,
                }
    return qs


def is_correct_at(q, bert_thresh, f1_thresh):
    qt = q['questionType'].lower()
    if qt in ('boolean', 'select', 'single_select', 'text_object', 'url'):
        return q['isCorrect']
    elif qt == 'text':
        bs = q.get('bertScore')
        return bs is not None and bs >= bert_thresh
    elif qt == 'multi_select':
        f1 = q.get('f1Score')
        return f1 is not None and f1 >= f1_thresh
    return False


def score_value(q):
    qt = q['questionType'].lower()
    if qt in ('boolean', 'select', 'single_select', 'text_object', 'url'):
        return 1.0 if q.get('accuracy') else 0.0
    elif qt == 'text':
        return q.get('bertScore')
    elif qt == 'multi_select':
        return q.get('f1Score')
    return None


def style_header_row(ws, row, max_col):
    for col in range(1, max_col + 1):
        cell = ws.cell(row=row, column=col)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(horizontal='center', wrap_text=True)
        cell.border = THIN_BORDER


def auto_width(ws, min_width=10, max_width=50):
    for col_cells in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col_cells[0].column)
        for cell in col_cells:
            if cell.value:
                max_len = max(max_len, len(str(cell.value)))
        ws.column_dimensions[col_letter].width = min(max(max_len + 2, min_width), max_width)


def write_summary_sheet(wb, labels, all_data, common):
    ws = wb.active
    ws.title = 'Summary'

    row = 1
    ws.cell(row=row, column=1, value='Evaluation Summary')
    ws.cell(row=row, column=1).font = Font(bold=True, size=14)
    row += 1
    ws.cell(row=row, column=1, value=f'Common questions: {len(common)}')
    row += 2

    for thresh in THRESHOLDS:
        ws.cell(row=row, column=1, value=thresh['name'])
        ws.cell(row=row, column=1).font = Font(bold=True, size=12)
        row += 1

        headers = ['Metric'] + [SHORT[l] for l in labels]
        for c, h in enumerate(headers, 1):
            ws.cell(row=row, column=c, value=h)
        style_header_row(ws, row, len(headers))
        row += 1

        # S1 accuracy
        ws.cell(row=row, column=1, value='S1 Accuracy')
        for ci, label in enumerate(labels, 2):
            correct = sum(1 for k in common if is_correct_at(all_data[label][k], thresh['bert'], thresh['f1']))
            pct = correct / len(common) * 100
            ws.cell(row=row, column=ci, value=f'{pct:.1f}%')
            ws.cell(row=row, column=ci).alignment = Alignment(horizontal='center')
        row += 1

        # Any correct (S1 OR S2 OR S3)
        ws.cell(row=row, column=1, value='Any Correct (S1∨S2∨S3)')
        for ci, label in enumerate(labels, 2):
            correct = 0
            for k in common:
                q = all_data[label][k]
                # any-of-3: q stores only S1 in this loader, so fall back to
                # metrics anyCorrect if present, else S1 correctness.
                any_ok = q.get('anyCorrect')
                if any_ok is None:
                    any_ok = is_correct_at(q, thresh['bert'], thresh['f1'])
                if any_ok:
                    correct += 1
            pct = correct / len(common) * 100
            ws.cell(row=row, column=ci, value=f'{pct:.1f}%')
            ws.cell(row=row, column=ci).alignment = Alignment(horizontal='center')
        row += 2

    auto_width(ws)


def write_by_type_sheet(wb, labels, all_data, common):
    ws = wb.create_sheet('By Question Type')

    row = 1
    for thresh in THRESHOLDS:
        ws.cell(row=row, column=1, value=thresh['name'])
        ws.cell(row=row, column=1).font = Font(bold=True, size=12)
        row += 1

        headers = ['Type', 'N'] + [f'{SHORT[l]} Correct' for l in labels] + [f'{SHORT[l]} %' for l in labels]
        for c, h in enumerate(headers, 1):
            ws.cell(row=row, column=c, value=h)
        style_header_row(ws, row, len(headers))
        row += 1

        by_type = {}
        for k in common:
            qt = all_data[labels[0]][k]['questionType']
            by_type.setdefault(qt, []).append(k)

        for qt in sorted(by_type.keys()):
            keys = by_type[qt]
            n = len(keys)
            ws.cell(row=row, column=1, value=qt)
            ws.cell(row=row, column=2, value=n)
            for ci, label in enumerate(labels):
                correct = sum(1 for k in keys if is_correct_at(all_data[label][k], thresh['bert'], thresh['f1']))
                pct = correct / n * 100 if n else 0
                ws.cell(row=row, column=3 + ci, value=correct)
                ws.cell(row=row, column=3 + len(labels) + ci, value=f'{pct:.1f}%')
                ws.cell(row=row, column=3 + len(labels) + ci).alignment = Alignment(horizontal='center')
            row += 1

        # Total
        total = len(common)
        ws.cell(row=row, column=1, value='TOTAL')
        ws.cell(row=row, column=1).font = Font(bold=True)
        ws.cell(row=row, column=2, value=total)
        for ci, label in enumerate(labels):
            correct = sum(1 for k in common if is_correct_at(all_data[label][k], thresh['bert'], thresh['f1']))
            pct = correct / total * 100
            ws.cell(row=row, column=3 + ci, value=correct)
            ws.cell(row=row, column=3 + len(labels) + ci, value=f'{pct:.1f}%')
        row += 2

    auto_width(ws)


def write_by_qid_sheet(wb, labels, all_data, common):
    ws = wb.create_sheet('By Question ID')

    row = 1
    for thresh in THRESHOLDS:
        ws.cell(row=row, column=1, value=thresh['name'])
        ws.cell(row=row, column=1).font = Font(bold=True, size=12)
        row += 1

        headers = ['Question ID', 'Type', 'N'] + [f'{SHORT[l]} Correct' for l in labels] + [f'{SHORT[l]} %' for l in labels]
        for c, h in enumerate(headers, 1):
            ws.cell(row=row, column=c, value=h)
        style_header_row(ws, row, len(headers))
        row += 1

        by_qid = {}
        for k in common:
            qid = all_data[labels[0]][k]['questionId']
            by_qid.setdefault(qid, []).append(k)

        for qid in sorted(by_qid.keys()):
            keys = by_qid[qid]
            n = len(keys)
            qt = all_data[labels[0]][keys[0]]['questionType']
            ws.cell(row=row, column=1, value=qid)
            ws.cell(row=row, column=2, value=qt)
            ws.cell(row=row, column=3, value=n)
            for ci, label in enumerate(labels):
                correct = sum(1 for k in keys if is_correct_at(all_data[label][k], thresh['bert'], thresh['f1']))
                pct = correct / n * 100 if n else 0
                ws.cell(row=row, column=4 + ci, value=correct)
                ws.cell(row=row, column=4 + len(labels) + ci, value=f'{pct:.1f}%')
                ws.cell(row=row, column=4 + len(labels) + ci).alignment = Alignment(horizontal='center')
            row += 1

        # Total
        total = len(common)
        ws.cell(row=row, column=1, value='TOTAL')
        ws.cell(row=row, column=1).font = Font(bold=True)
        ws.cell(row=row, column=3, value=total)
        for ci, label in enumerate(labels):
            correct = sum(1 for k in common if is_correct_at(all_data[label][k], thresh['bert'], thresh['f1']))
            pct = correct / total * 100
            ws.cell(row=row, column=4 + ci, value=correct)
            ws.cell(row=row, column=4 + len(labels) + ci, value=f'{pct:.1f}%')
        row += 2

    auto_width(ws)


def write_all_predictions_sheet(wb, labels, all_data, common):
    ws = wb.create_sheet('All Predictions')

    headers = ['Paper ID', 'Question ID', 'Type', 'Ground Truth']
    for label in labels:
        s = SHORT[label]
        headers += [f'{s} Prediction', f'{s} Evidence', f'{s} Score', f'{s} Correct']
    for c, h in enumerate(headers, 1):
        ws.cell(row=1, column=c, value=h)
    style_header_row(ws, 1, len(headers))

    row = 2
    for k in sorted(common):
        pid, qid = k
        ref = all_data[labels[0]][k]
        gt = ref['groundTruth']
        gt_str = ', '.join(str(x) for x in gt) if isinstance(gt, list) else str(gt)

        ws.cell(row=row, column=1, value=pid)
        ws.cell(row=row, column=2, value=qid)
        ws.cell(row=row, column=3, value=ref['questionType'])
        ws.cell(row=row, column=4, value=gt_str)

        col = 5
        for label in labels:
            q = all_data[label][k]
            pred = str(q['prediction'])[:500]
            evidence = q.get('evidence', '')
            sc = score_value(q)
            correct = is_correct_at(q, STRICT_BERT, STRICT_F1)

            ws.cell(row=row, column=col, value=sanitize(pred))
            ev_cell = ws.cell(row=row, column=col + 1, value=sanitize(evidence[:1000]) if evidence else '')
            ev_cell.alignment = Alignment(wrap_text=True, vertical='top')
            ws.cell(row=row, column=col + 2, value=round(sc, 4) if sc is not None else '')
            ws.cell(row=row, column=col + 2).alignment = Alignment(horizontal='center')

            correct_cell = ws.cell(row=row, column=col + 3, value='✓' if correct else '✗')
            correct_cell.fill = CORRECT_FILL if correct else INCORRECT_FILL
            correct_cell.alignment = Alignment(horizontal='center')

            col += 4

        row += 1

    auto_width(ws, max_width=60)
    for label_idx in range(len(labels)):
        pred_col = 5 + label_idx * 4
        ev_col = 6 + label_idx * 4
        ws.column_dimensions[get_column_letter(pred_col)].width = 60
        ws.column_dimensions[get_column_letter(ev_col)].width = 50


def write_deep_analysis_sheet(wb, labels, all_data, common):
    ws = wb.create_sheet('Deep Analysis')

    headers = ['Question ID', 'Type', 'N', 'Sample Type', 'Paper ID', 'Ground Truth']
    for label in labels:
        s = SHORT[label]
        headers += [f'{s} Prediction', f'{s} Score', f'{s} Correct']
    for c, h in enumerate(headers, 1):
        ws.cell(row=1, column=c, value=h)
    style_header_row(ws, 1, len(headers))

    by_qid = {}
    for k in common:
        qid = all_data[labels[0]][k]['questionId']
        by_qid.setdefault(qid, []).append(k)

    row = 2
    for qid in sorted(by_qid.keys()):
        keys = by_qid[qid]
        qt = all_data[labels[0]][keys[0]]['questionType']
        n = len(keys)

        ref_label = labels[0]
        correct_keys = [k for k in keys if is_correct_at(all_data[ref_label][k], 0.7, 0.75)]
        incorrect_keys = [k for k in keys if not is_correct_at(all_data[ref_label][k], 0.7, 0.75)]

        ws.cell(row=row, column=1, value=qid)
        ws.cell(row=row, column=1).font = Font(bold=True)
        ws.cell(row=row, column=2, value=qt)
        ws.cell(row=row, column=3, value=n)
        for c in range(1, len(headers) + 1):
            ws.cell(row=row, column=c).fill = SUBHEADER_FILL
        accs = []
        for label in labels:
            c = sum(1 for k in keys if is_correct_at(all_data[label][k], 0.7, 0.75))
            accs.append(f'{SHORT[label]}: {c}/{n} ({c/n*100:.1f}%)')
        ws.cell(row=row, column=4, value='  |  '.join(accs))
        row += 1

        for sample_keys, sample_type in [(correct_keys[:3], '✓ Correct'), (incorrect_keys[:3], '✗ Incorrect')]:
            for k in sample_keys:
                pid = k[0]
                gt = all_data[labels[0]][k]['groundTruth']
                gt_str = ', '.join(str(x) for x in gt) if isinstance(gt, list) else str(gt)

                ws.cell(row=row, column=4, value=sample_type)
                ws.cell(row=row, column=5, value=pid)
                ws.cell(row=row, column=6, value=gt_str[:200])

                col = 7
                for label in labels:
                    q = all_data[label][k]
                    pred = str(q['prediction'])[:200]
                    sc = score_value(q)
                    strict = is_correct_at(q, 0.7, 0.75)

                    ws.cell(row=row, column=col, value=pred)
                    ws.cell(row=row, column=col + 1, value=round(sc, 4) if sc is not None else '')
                    c_cell = ws.cell(row=row, column=col + 2, value='✓' if strict else '✗')
                    c_cell.fill = CORRECT_FILL if strict else INCORRECT_FILL
                    c_cell.alignment = Alignment(horizontal='center')
                    col += 3

                row += 1

        row += 1 

    auto_width(ws, max_width=60)


def main():
    global RESULT_FILES, OUTPUT_FILE

    parser = argparse.ArgumentParser(description='Export evaluation results to Excel')
    parser.add_argument('--run-tag', type=str,
                        help='Build RESULT_FILES from results-<tag>-<run-tag>.json for all registered models')
    parser.add_argument('--output', type=str, help='Output xlsx path')
    args = parser.parse_args()

    if args.run_tag:
        import os
        RESULT_FILES = {}
        for name, (_short, tag) in MODEL_REGISTRY.items():
            # Prefer the rescored file (real BERTScore/SBERT metrics) over the
            # raw file (live eval has BERTScore off by design).
            rescored = f'results-{tag}-{args.run_tag}-rescored.json'
            raw = f'results-{tag}-{args.run_tag}.json'
            if os.path.exists(rescored):
                RESULT_FILES[name] = [rescored]
            elif os.path.exists(raw):
                print(f'  (WARNING {name}: using RAW {raw} — no rescored file found; run rescore-all.py first)')
                RESULT_FILES[name] = [raw]
            else:
                print(f'  (skip {name}: {rescored} / {raw} not found)')
        if not RESULT_FILES:
            print(f'No result files found for run-tag "{args.run_tag}"')
            sys.exit(1)
        OUTPUT_FILE = args.output or f'evaluation-results-{args.run_tag}.xlsx'
    elif args.output:
        OUTPUT_FILE = args.output

    labels = list(RESULT_FILES.keys())
    all_data = {}
    for label, paths in RESULT_FILES.items():
        all_data[label] = load_full_questions(paths)
        print(f"{label}: {len(all_data[label])} questions")

    common = set(all_data[labels[0]].keys())
    for label in labels[1:]:
        common &= set(all_data[label].keys())

    for pair in EXCLUDE_PAIRS:
        common.discard(pair)

    for (pid, qid), model_set in FORCE_CORRECT.items():
        key = (pid, qid)
        for label in model_set:
            if label in all_data and key in all_data[label]:
                q = all_data[label][key]
                q['isCorrect'] = True
                q['bertScore'] = 1.0

    print(f"Common: {len(common)}")

    if len(common) == 0:
        print("\nERROR: No questions are common across ALL models.")
        print("This usually means one or more models had many failed questions.")
        print("Per-model successful counts:")
        for label in labels:
            print(f"  {label}: {len(all_data[label])}")
        print("\nFix the failing model(s) with a --skip-existing re-run, then retry.")
        sys.exit(1)

    wb = Workbook()

    print("Writing Summary sheet...")
    write_summary_sheet(wb, labels, all_data, common)

    print("Writing By Question Type sheet...")
    write_by_type_sheet(wb, labels, all_data, common)

    print("Writing By Question ID sheet...")
    write_by_qid_sheet(wb, labels, all_data, common)

    print("Writing All Predictions sheet...")
    write_all_predictions_sheet(wb, labels, all_data, common)

    print("Writing Deep Analysis sheet...")
    write_deep_analysis_sheet(wb, labels, all_data, common)

    wb.save(OUTPUT_FILE)
    print(f"\nSaved to: {OUTPUT_FILE}")


if __name__ == '__main__':
    main()
