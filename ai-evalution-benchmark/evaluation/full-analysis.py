#!/usr/bin/env python3
"""
Full strict-setting analysis across all rescored results.

Strict: BERTScore>=0.7, multi_select F1>=0.75; boolean/select/url = exact-or-partial.
Reads *-rescored.json files. Sentinel + EXCLUDED_QUESTIONS filtered (same as Excel).
"""
import json, os

BERT_T, F1_T = 0.7, 0.75
SENTINEL = {'no question','no questions','no type','no types','no method',
            'no methods','no collection','no analysis'}
EXCLUDED = {'data_urls','answer_highlighted','descriptive_stats_used',
            'inferential_stats_used','ml_used'}

def is_sentinel(v):
    if v is None: return False
    if isinstance(v,list):
        return len([x for x in v if str(x).lower().strip() not in SENTINEL and str(x).strip()])==0
    return str(v).lower().strip() in SENTINEL

def sug_correct(s, qt):
    qt=qt.lower()
    if qt in ('boolean','select','single_select','text_object','url'):
        return bool(s.get('isCorrect'))
    if qt=='text':
        bs=s.get('bertScore'); return bs is not None and bs>=BERT_T
    if qt=='multi_select':
        f=s.get('f1Score'); return f is not None and f>=F1_T
    return False

def load(tag, runtag):
    f=f"results-{tag}-{runtag}-rescored.json"
    if not os.path.exists(f): return None
    d=json.load(open(f))
    out={}
    for paper in d['results']:
        pid=paper.get('paperId','')
        for q in paper['questions']:
            if not q.get('success'): continue
            if is_sentinel(q.get('groundTruth')): continue
            if q.get('questionId') in EXCLUDED: continue
            m=q.get('metrics',{})
            if not m or not m.get('suggestions'): continue
            sugs=m['suggestions']
            s1=next((s for s in sugs if s.get('position')==1),None)
            if not s1: continue
            qt=q.get('questionType','')
            if qt=='repeat_text': qt='text'
            out[(pid,q['questionId'])]={
                'qt':qt,
                's1':sug_correct(s1,qt),
                'any':any(sug_correct(s,qt) for s in sugs),
                'qid':q['questionId'],
            }
    return out

DISPLAY={'gemini31pro':'Gemini-3.1-Pro','gpt56luna':'GPT-5.6-Luna','sonnet5':'Claude-Sonnet-5',
         'gemini38flash':'Gemini-3.8-Flash','opus5':'Claude-Opus-5','glm52':'GLM-5.2',
         'fable51':'Claude-Fable-5.1','kimik3':'Kimi-K3','astra':'GPT-6-Astra','deepseekv4pro':'DeepSeek-V4-Pro'}

BATCH_TAGS=['gemini31pro','gpt56luna','sonnet5','gemini38flash','opus5','glm52','fable51','kimik3','astra','deepseekv4pro']
PERQ_TAGS=['gpt56luna','gemini38flash','glm52']

def common_of(data):
    c=None
    for d in data.values():
        ks=set(d.keys()); c=ks if c is None else (c&ks)
    return sorted(c)

def sep(t): print("\n"+"="*66+"\n"+t+"\n"+"="*66)

# ---------- 1. BATCH: 10-model ranking ----------
sep("1. BATCH (run2) — 10 models, STRICT")
bd={t:load(t,'run2') for t in BATCH_TAGS}
bd={t:d for t,d in bd.items() if d}
bcommon=common_of(bd)
print(f"Common question set N = {len(bcommon)}\n")
print(f"{'Rank':<5}{'Model':<20}{'S1%':>8}{'Any%':>8}{'Gap':>7}")
brows=[]
for t,d in bd.items():
    s1=sum(1 for k in bcommon if d[k]['s1'])/len(bcommon)*100
    an=sum(1 for k in bcommon if d[k]['any'])/len(bcommon)*100
    brows.append((DISPLAY[t],s1,an))
for i,(n,s,a) in enumerate(sorted(brows,key=lambda x:-x[1]),1):
    print(f"{i:<5}{n:<20}{s:>7.1f}{a:>8.1f}{a-s:>7.1f}")

# ---------- 2. BATCH per-type (avg across models) ----------
sep("2. BATCH per-question-type — S1% (each model), STRICT")
qtypes=sorted({bd[BATCH_TAGS[0]][k]['qt'] for k in bcommon})
# count N per type
tn={qt:sum(1 for k in bcommon if bd[BATCH_TAGS[0]][k]['qt']==qt) for qt in qtypes}
print("Type            N   " + "".join(f"{DISPLAY[t].split('-')[0][:6]:>8}" for t in bd))
for qt in qtypes:
    keys=[k for k in bcommon if bd[BATCH_TAGS[0]][k]['qt']==qt]
    row=f"{qt:<15}{len(keys):>3}  "
    for t,d in bd.items():
        c=sum(1 for k in keys if d[k]['s1'])
        row+=f"{c/len(keys)*100:>7.0f}%"
    print(row)

# ---------- 3. Ranking bottleneck (S1 vs Any gap) ----------
sep("3. RANKING BOTTLENECK — S1 vs Any-of-3 gap (batch, avg over 10 models)")
avg_s1=sum(s for _,s,_ in brows)/len(brows)
avg_any=sum(a for _,_,a in brows)/len(brows)
print(f"Avg S1     : {avg_s1:.1f}%")
print(f"Avg Any-3  : {avg_any:.1f}%")
print(f"Avg gap    : {avg_any-avg_s1:.1f} points  <-- answers present but not ranked #1")

# per-type gap
print("\nGap by type (avg over models):")
for qt in qtypes:
    keys=[k for k in bcommon if bd[BATCH_TAGS[0]][k]['qt']==qt]
    s1s=[]; ans=[]
    for t,d in bd.items():
        s1s.append(sum(1 for k in keys if d[k]['s1'])/len(keys)*100)
        ans.append(sum(1 for k in keys if d[k]['any'])/len(keys)*100)
    a1=sum(s1s)/len(s1s); a2=sum(ans)/len(ans)
    print(f"  {qt:<15} S1={a1:>5.1f}%  Any={a2:>5.1f}%  gap={a2-a1:>5.1f}")

# ---------- 4. Hardest / easiest questions (batch) ----------
sep("4. HARDEST vs EASIEST question IDs (batch S1, avg over 10 models)")
qids=sorted({bd[BATCH_TAGS[0]][k]['qid'] for k in bcommon})
qid_acc=[]
for qid in qids:
    keys=[k for k in bcommon if bd[BATCH_TAGS[0]][k]['qid']==qid]
    if not keys: continue
    accs=[sum(1 for k in keys if d[k]['s1'])/len(keys)*100 for d in bd.values()]
    qid_acc.append((qid, sum(accs)/len(accs), len(keys), bd[BATCH_TAGS[0]][keys[0]]['qt']))
qid_acc.sort(key=lambda x:x[1])
print("Hardest 8:")
for qid,acc,n,qt in qid_acc[:8]:
    print(f"  {qid:<32}{qt:<14}S1={acc:>5.1f}% (n={n})")
print("Easiest 8:")
for qid,acc,n,qt in qid_acc[-8:]:
    print(f"  {qid:<32}{qt:<14}S1={acc:>5.1f}% (n={n})")

# ---------- 5. Context-mode comparison (3 shared models) ----------
sep("5. CONTEXT MODE — batch vs perq vs perqfull, STRICT (3 models)")
for t in PERQ_TAGS:
    modes={'batch':load(t,'run2'),'perq':load(t,'perq'),'perqfull':load(t,'perqfull')}
    modes={m:d for m,d in modes.items() if d}
    c=common_of(modes)
    print(f"\n{DISPLAY[t]}  (common N={len(c)})")
    print(f"  {'mode':<10}{'S1%':>8}{'Any%':>8}")
    for m,d in modes.items():
        s1=sum(1 for k in c if d[k]['s1'])/len(c)*100
        an=sum(1 for k in c if d[k]['any'])/len(c)*100
        print(f"  {m:<10}{s1:>7.1f}{an:>8.1f}")
