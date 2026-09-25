#!/usr/bin/env python3
"""
compare.py — the ONE canonical comparison tool.

Uses eval_common.py so every table shares identical scoring. Always prints the
config banner, the common-set size N, and a question-set fingerprint so any two
runs can be verified as identical.

Usage:
  # Flagship 3-way (batch vs per-question chunks vs full)
  python3 compare.py --preset flagship

  # Small/old-model 3-way
  python3 compare.py --preset small

  # Count failures as wrong instead of dropping them
  python3 compare.py --preset small --failures wrong

  # Custom
  python3 compare.py --models gpt56luna:GPT-Luna gemini38flash:Gemini \
      --modes run2:Batch perq:Chunks perqfull:Full
"""
import argparse
import sys
import eval_common as EC

PRESETS = {
    'flagship': {
        'models': [('gpt56luna', 'GPT-5.6-Luna'),
                   ('gemini38flash', 'Gemini-3.8-Flash'),
                   ('glm52', 'GLM-5.2')],
        'modes': [('run2', 'Batch'),
                  ('perq', 'Per-Q chunks'),
                  ('perqfull', 'Per-Q full')],
    },
    'small': {
        'models': [('gpt4omini', 'GPT-4o-mini'),
                   ('qwen257b', 'Qwen-2.5-7B'),
                   ('mistralsmall24b', 'Mistral-Small-24B')],
        'modes': [('oldbatch', 'Batch'),
                  ('oldperq', 'Per-Q chunks'),
                  ('oldperqfull', 'Per-Q full')],
    },
    'small2': {  # GPT-4o-mini + Qwen only (known small sizes)
        'models': [('gpt4omini', 'GPT-4o-mini'),
                   ('qwen257b', 'Qwen-2.5-7B')],
        'modes': [('oldbatch', 'Batch'),
                  ('oldperq', 'Per-Q chunks'),
                  ('oldperqfull', 'Per-Q full')],
    },
}


def parse_pairs(items):
    out = []
    for it in items:
        tag, _, label = it.partition(':')
        out.append((tag, label or tag))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--preset', choices=PRESETS.keys())
    ap.add_argument('--models', nargs='+', help='tag:Label ...')
    ap.add_argument('--modes', nargs='+', help='runtag:Label ...')
    ap.add_argument('--failures', choices=['success_only', 'wrong'],
                    default='success_only',
                    help="how to treat failed/unanswered questions (default: drop them)")
    args = ap.parse_args()

    if args.preset:
        models = PRESETS[args.preset]['models']
        modes = PRESETS[args.preset]['modes']
    elif args.models and args.modes:
        models = parse_pairs(args.models)
        modes = parse_pairs(args.modes)
    else:
        ap.error('provide --preset OR (--models and --modes)')

    # Load everything
    data = {}
    maps_for_common = []
    missing = []
    for tag, _ in models:
        for rt, _ in modes:
            path = f'results-{tag}-{rt}-rescored.json'
            try:
                m = EC.load_results(path, failure_policy=args.failures)
            except FileNotFoundError:
                missing.append(path)
                m = None
            data[(tag, rt)] = m
            if m is not None:
                maps_for_common.append(m)

    if missing:
        print('MISSING files (excluded):')
        for p in missing:
            print(f'   {p}')
        print()

    common = EC.common_keys(*maps_for_common)
    N = len(common)
    if N == 0:
        print('ERROR: no common questions across the requested files.')
        sys.exit(1)

    print(EC.CONFIG_BANNER)
    print(f'Failure policy : {args.failures}')
    print(f'Common set N   : {N}')
    print(f'Set fingerprint: {EC.fingerprint(common)}   '
          f'(identical fingerprint => identical question set)')
    print()

    def cell(tag, rt, fn):
        m = data.get((tag, rt))
        return '   n/a' if m is None else f'{fn(m, common):6.1f}'

    mode_labels = [lbl for _, lbl in modes]
    header = f'{"Model":<20}' + ''.join(f'{lbl:>16}' for lbl in mode_labels)

    def block(title, fn):
        print(title)
        print(header)
        for tag, name in models:
            row = f'{name:<20}'
            for rt, _ in modes:
                row += f'{cell(tag, rt, fn):>16}'
            print(row)
        # average across available models
        row = f'{"AVERAGE":<20}'
        for rt, _ in modes:
            vals = [fn(data[(tag, rt)], common)
                    for tag, _ in models if data.get((tag, rt)) is not None]
            row += f'{(sum(vals)/len(vals) if vals else 0):>16.1f}'
        print(row)
        print()

    block('S1 accuracy (rank-1 correct)  [%]', EC.s1_pct)
    block('Any-of-3 accuracy  [%]', EC.any_pct)


if __name__ == '__main__':
    main()
