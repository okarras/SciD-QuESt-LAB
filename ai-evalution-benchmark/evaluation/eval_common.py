#!/usr/bin/env python3
"""
eval_common.py — the SINGLE canonical scoring configuration.

Every comparison/analysis script must import from here so that all reported
numbers use the exact same definitions. If a number ever differs between two
places, it is a bug — not a convention difference.

Canonical decisions (locked):
  * THRESHOLD: strict only. BERTScore >= 0.7, multi_select F1 >= 0.75.
    boolean / single_select / select / url / text_object = exact-or-partial match.
  * SENTINEL ground truths are excluded (placeholder "no question" etc.).
  * EXCLUDED_QUESTIONS are excluded everywhere (5 low-signal questions).
  * FAILURE POLICY: configurable per call, but the DEFAULT is
    'success_only' (failed/unanswered questions are dropped, not scored wrong).
    Use failure_policy='wrong' only when you explicitly want to penalise a mode
    for failing to answer.
  * repeat_text is treated as 'text'.

Read files are the *-rescored.json outputs (real BERTScore/SBERT metrics).
"""
import json
import hashlib

# ---- Locked strict thresholds (the only thresholds in the project) ----
STRICT_BERT = 0.7
STRICT_F1 = 0.75

# ---- Sentinel ground-truth placeholders --------------------------------
SENTINEL_VALUES = {
    'no question', 'no questions', 'no type', 'no types',
    'no method', 'no methods', 'no collection', 'no analysis',
}

# ---- Questions excluded from every report ------------------------------
EXCLUDED_QUESTIONS = {
    'data_urls',
    'answer_highlighted',
    'descriptive_stats_used',
    'inferential_stats_used',
    'ml_used',
}


def is_sentinel(value):
    if value is None:
        return False
    if isinstance(value, list):
        real = [v for v in value
                if str(v).lower().strip() not in SENTINEL_VALUES and str(v).strip()]
        return len(real) == 0
    return str(value).lower().strip() in SENTINEL_VALUES


def normalize_qtype(qt):
    qt = (qt or '').lower()
    return 'text' if qt == 'repeat_text' else qt


def suggestion_correct(sug, qtype):
    """Strict correctness for a single suggestion object."""
    qt = normalize_qtype(qtype)
    if qt in ('boolean', 'select', 'single_select', 'text_object', 'url'):
        return bool(sug.get('isCorrect'))
    if qt == 'text':
        bs = sug.get('bertScore')
        return bs is not None and bs >= STRICT_BERT
    if qt == 'multi_select':
        f1 = sug.get('f1Score')
        return f1 is not None and f1 >= STRICT_F1
    return False


def load_results(filepath, failure_policy='success_only'):
    """
    Load a *-rescored.json file into {(paperId, questionId): {...}}.

    failure_policy:
      'success_only' (default) — skip failed/metric-less questions entirely.
      'wrong'                  — include them with s1=any=False.

    Returned value per key: {'qtype', 's1', 'any', 'failed'}.
    """
    if failure_policy not in ('success_only', 'wrong'):
        raise ValueError(f"bad failure_policy: {failure_policy}")

    with open(filepath) as f:
        data = json.load(f)

    out = {}
    for paper in data.get('results', []):
        pid = paper.get('paperId', '')
        for q in paper.get('questions', []):
            gt = q.get('groundTruth')
            if is_sentinel(gt):
                continue
            qid = q.get('questionId', '')
            if qid in EXCLUDED_QUESTIONS:
                continue
            key = (pid, qid)
            qt = normalize_qtype(q.get('questionType', ''))

            ok = q.get('success')
            m = q.get('metrics') or {}
            sugs = m.get('suggestions') or []
            failed = (not ok) or (not sugs)

            if failed:
                if failure_policy == 'wrong':
                    out[key] = {'qtype': qt, 's1': False, 'any': False, 'failed': True}
                # success_only: skip
                continue

            s1 = next((s for s in sugs if s.get('position') == 1), None)
            out[key] = {
                'qtype': qt,
                's1': suggestion_correct(s1, qt) if s1 else False,
                'any': any(suggestion_correct(s, qt) for s in sugs),
                'failed': False,
            }
    return out


def common_keys(*maps):
    """Intersection of keys across all provided maps."""
    sets = [set(m.keys()) for m in maps if m is not None]
    if not sets:
        return []
    return sorted(set.intersection(*sets))


def fingerprint(keys):
    """Stable short hash of a question set, so any table can be verified."""
    joined = '|'.join(f'{p}::{q}' for p, q in sorted(keys))
    return hashlib.sha1(joined.encode()).hexdigest()[:10]


def s1_pct(m, keys):
    keys = list(keys)
    return sum(1 for k in keys if m[k]['s1']) / len(keys) * 100 if keys else 0.0


def any_pct(m, keys):
    keys = list(keys)
    return sum(1 for k in keys if m[k]['any']) / len(keys) * 100 if keys else 0.0


# Human-readable label of the locked config, for printing in every report.
CONFIG_BANNER = (
    f"STRICT scoring (BERTScore>={STRICT_BERT}, multi_select F1>={STRICT_F1}; "
    f"boolean/select/url=exact-or-partial). "
    f"Sentinels + {len(EXCLUDED_QUESTIONS)} excluded questions removed."
)
