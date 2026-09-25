#!/usr/bin/env python3
"""
Check whether BATCH-mode LLM responses provide evidence (page + excerpt).
Inspects the S1 suggestion's evidence array in each batch (run2) result file.
Uses the RAW batch files (not rescored) since rescore may rebuild suggestions.
"""
import json, os

SENTINEL={'no question','no questions','no type','no types','no method',
          'no methods','no collection','no analysis'}
def is_sentinel(v):
    if v is None: return False
    if isinstance(v,list):
        return len([x for x in v if str(x).lower().strip() not in SENTINEL and str(x).strip()])==0
    return str(v).lower().strip() in SENTINEL

TAGS=['gemini31pro','gpt56luna','sonnet5','gemini38flash','opus5',
      'glm52','fable51','kimik3','astra','deepseekv4pro']
DISPLAY={'gemini31pro':'Gemini-3.1-Pro','gpt56luna':'GPT-5.6-Luna','sonnet5':'Claude-Sonnet-5',
         'gemini38flash':'Gemini-3.8-Flash','opus5':'Claude-Opus-5','glm52':'GLM-5.2',
         'fable51':'Claude-Fable-5.1','kimik3':'Kimi-K3','astra':'GPT-6-Astra','deepseekv4pro':'DeepSeek-V4-Pro'}

def analyze(tag, fname):
    d=json.load(open(fname))
    total=0            # successful, non-sentinel questions
    with_ev=0          # S1 has >=1 evidence item
    with_page=0        # S1 evidence has a real page number (>0)
    with_excerpt=0     # S1 evidence has a non-empty excerpt
    ev_items=0
    for paper in d['results']:
        for q in paper['questions']:
            if not q.get('success'): continue
            if is_sentinel(q.get('groundTruth')): continue
            sugs=q.get('suggestions') or []
            s1=next((s for s in sugs if s.get('position')==1), sugs[0] if sugs else None)
            if not s1: continue
            total+=1
            ev=s1.get('evidence') or []
            if ev:
                with_ev+=1
                ev_items+=len(ev)
                if any((e.get('pageNumber') or e.get('page') or 0) not in (0,None,'') for e in ev):
                    with_page+=1
                if any(str(e.get('excerpt') or e.get('text') or '').strip() for e in ev):
                    with_excerpt+=1
    return total, with_ev, with_page, with_excerpt, ev_items

print("BATCH (run2) — evidence coverage in S1 suggestions\n")
print(f"{'Model':<20}{'N':>5}{'hasEvid':>9}{'%':>7}{'w/page':>8}{'w/excerpt':>11}{'avgItems':>9}")
agg=[0,0,0,0,0]
for tag in TAGS:
    f=f"results-{tag}-run2.json"
    if not os.path.exists(f):
        print(f"{DISPLAY.get(tag,tag):<20}  (missing {f})"); continue
    total,we,wp,wx,items=analyze(tag,f)
    for i,v in enumerate([total,we,wp,wx,items]): agg[i]+=v
    pct=we/total*100 if total else 0
    avg=items/we if we else 0
    print(f"{DISPLAY.get(tag,tag):<20}{total:>5}{we:>9}{pct:>6.1f}%{wp:>8}{wx:>11}{avg:>9.2f}")

t,we,wp,wx,items=agg
print("-"*69)
print(f"{'TOTAL':<20}{t:>5}{we:>9}{we/t*100:>6.1f}%{wp:>8}{wx:>11}{items/we if we else 0:>9.2f}")
