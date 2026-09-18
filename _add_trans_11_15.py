"""给 lesson6-pages/public 中 11-15 课全部 16 个课文/语法页注入「中译日」练习模式。
与 _add_trans_l10c2.py 同一套引擎模板（const exercises={...} 字面量 + JSON 引号 indexes + repeat(3)）。
差异自适应：quizType 标签(理解辨析/语感辨析)、mode-tabs 的 grid gap、grammarItems 数组名。
翻译题数据自动从页面内 paragraphs/passages/lines/grammars/grammarItems 抽取（jp/y/cn 字段归一）。
"""
import json, re, os, shutil

PUB = "public"
BAK = "public_html.bak"
os.makedirs(BAK, exist_ok=True)

PAGES = [
 "lesson11-manga-anime-text.html","lesson11-consciousness-grammar.html","lesson11-consciousness-grammar2.html","lesson11-expression-notes.html",
 "lesson12-dialect-text.html","lesson12-saigo-dialogue.html","lesson12-saigo-grammar.html",
 "lesson13-request-dialogue.html","lesson13-request-grammar.html","lesson13-shoshika-text.html",
 "lesson14-onshi-dialogue.html","lesson14-onshi-grammar.html","lesson14-onshi-text.html",
 "lesson15-classmates-dialogue.html","lesson15-classmates-grammar.html","lesson15-restaurant-text.html",
]

# ---------- 抽取页面内数组 ----------
def extract_array(s, name):
    m = re.search(r'const '+name+r'=\[', s)
    if not m: return None
    i = m.end()-1
    depth=0; instr=False; esc=False
    for k in range(i, len(s)):
        ch=s[k]
        if esc: esc=False; continue
        if ch=='\\': esc=True; continue
        if ch=='"': instr=not instr; continue
        if instr: continue
        if ch=='[': depth+=1
        elif ch==']':
            depth-=1
            if depth==0: return s[m.start():k+1]
    return None

def to_obj_array(js):
    body=js[js.index('['):]
    body=re.sub(r'([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)', lambda mm: mm.group(1)+'"'+mm.group(2)+'":', body)
    return json.loads(body)

def jp_of(x): return x.get('jp') or x.get('j') or ''
def y_of(x):  return x.get('y') or x.get('r') or ''
def cn_of(x): return x.get('cn') or x.get('c') or ''

def build_trans(s):
    """返回一个 list[{q,a,r,h,why}]，最多 10 条。"""
    items=[]
    for src in ["paragraphs","passages","lines"]:
        a=extract_array(s, src)
        if a:
            arr=to_obj_array(a)
            for x in arr:
                jp=jp_of(x); cn=cn_of(x)
                if jp.strip() and cn.strip():
                    items.append({"q":cn,"a":jp,"r":y_of(x),"h":x.get('structure',''),"why":x.get('structure','')})
            break
    if not items:
        for src in ["grammars","grammarItems"]:
            a=extract_array(s, src)
            if a:
                arr=to_obj_array(a)
                for g in arr:
                    jp=g.get('jp'); cn=g.get('cn')
                    if jp and cn:
                        items.append({"q":cn,"a":jp,"r":"","h":g.get('p',''),"why":g.get('core') or g.get('use') or g.get('p','')})
                    for ex in (g.get('examples') or []):
                        if isinstance(ex, list) and len(ex)>=2 and ex[0] and ex[1]:
                            items.append({"q":ex[1],"a":ex[0],"r":"","h":g.get('p',''),"why":g.get('core') or g.get('p','')})
                break
    # 去重 + 过滤过短；按日语句长升序取前 10（优先较短、更适合作翻译练习）
    seen=set(); out=[]
    for it in items:
        key=it['a']
        if key in seen: continue
        seen.add(key)
        if len(it['a'])<4 or len(it['a'])>200: continue
        if len(it['q'])<3: continue
        out.append(it)
    out.sort(key=lambda x: len(x['a']))
    return out[:10]

def sanitize(t):
    if not isinstance(t,str): return t
    return t.replace("</","<\\/")

# ---------- 注入用的 JS/CSS 片段（与参考实现一致）----------
trans_render = r'''if(state.mode==="trans"){$("exerciseArea").innerHTML='<p class="trans-tip">把下面的中文翻译成日语，写到框里；点「检查答案」看是否匹配，或点「显示参考译文」对照。</p><textarea id="transInput" class="answer-input trans-area" autocomplete="off" placeholder="把上面的中文翻译成日语，写在这里…"></textarea><div class="trans-actions"><button type="button" class="btn" id="transRevealBtn">显示参考译文</button></div><div class="trans-reveal" id="transReveal" hidden><div class="trans-jp">'+item.a+speakButton(item.a,"播放参考译文")+'</div><div class="trans-r">'+item.r+'</div><div class="trans-note"><b>要点：</b>'+item.why+'</div></div>';$("transRevealBtn").addEventListener("click",()=>{$("transReveal").hidden=false})};'''

trans_grade = r'''if(state.mode==="trans"){const ta=$("transInput");if(!ta||!ta.value.trim())return feedback(false,"请先写出你的日语翻译。",true);const acc=[item.a,...(item.alts||[])].map(normalize);const ok=acc.includes(normalize(ta.value));const rev=$("transReveal");if(rev)rev.hidden=false;state.answered++;if(ok)state.correct++;save();updateStats();feedback(ok,ok?"正确，和参考译文一致。<br>"+item.why:"参考答案：<br>"+item.a+"<br>"+item.r+"<br>"+item.why);return}'''

tr_css = r'''.trans-tip{color:var(--muted);font-size:12px;margin:0 0 8px}
.trans-area{width:100%;min-height:130px;resize:vertical;padding:10px;border:1px solid #aaa;font-size:15px;line-height:1.8;font-family:inherit}
.trans-actions{margin-top:10px}
.trans-reveal{margin-top:12px;padding:14px;border:1px solid var(--line);background:#fbf7ef}
.trans-jp{font-size:19px;font-family:"Yu Mincho","MS Mincho",serif;line-height:1.7}
.trans-r{margin-top:4px;color:var(--muted);font-size:13px}
.trans-note{margin-top:8px;font-size:13px;line-height:1.6}'''

def inject(path):
    s=open(path,encoding='utf-8').read()
    if 'data-mode="trans"' in s:
        print(f"  SKIP (already has trans): {os.path.basename(path)}"); return "skip"
    trans=build_trans(s)
    if not trans:
        raise SystemExit(f"NO trans sentences extracted for {os.path.basename(path)}")
    for it in trans:
        it['q']=sanitize(it['q']); it['a']=sanitize(it['a']); it['r']=sanitize(it['r'])
        it['h']=sanitize(it['h']); it['why']=sanitize(it['why'])
    tj=json.dumps(trans, ensure_ascii=False)

    repls=[]
    # 1) mode-tab
    repls.append(('<button class="mode-tab" data-mode="fill">表达填空</button>',
                  '<button class="mode-tab" data-mode="fill">表达填空</button><button class="mode-tab" data-mode="trans">中译日</button>'))
    # 3) CSS .btn.primary 后追加 trans 样式
    repls.append(('.btn.primary{color:#fff;border-color:var(--ink);background:var(--ink)}',
                  '.btn.primary{color:#fff;border-color:var(--ink);background:var(--ink)}'+tr_css))
    # 5) renderQuiz list ||0
    repls.append(('const list=exercises[state.mode],i=state.indexes[state.mode]%list.length,item=list[i];',
                  'const list=exercises[state.mode],i=(state.indexes[state.mode]||0)%list.length,item=list[i];'))
    # 6) renderQuiz fill 分支后加 trans 分支
    repls.append(('if(state.mode==="fill")$("exerciseArea").innerHTML=\'<input class="answer-input" id="answerInput" autocomplete="off" placeholder="输入括号内缺少的日语">\';',
                  'if(state.mode==="fill")$("exerciseArea").innerHTML=\'<input class="answer-input" id="answerInput" autocomplete="off" placeholder="输入括号内缺少的日语">\';'+trans_render))
    # 7) grade 末尾 state.answered++; 前注入 trans 判分分支（兼容 answer= 变体/任意 grade 结构）
    repls.append(('state.answered++;',
                  trans_grade+'state.answered++;'))
    # 8) exercises 字面量插入 trans
    repls.append(('const exercises={', 'const exercises={"trans":'+tj+','))
    # 9) state indexes 引号版加 trans:0
    repls.append(('"indexes":{"choice":0,"order":0,"fill":0}}', '"indexes":{"choice":0,"order":0,"fill":0,"trans":0}}'))
    # 10) resetBtn indexes 加 trans:0
    repls.append(('state.indexes={choice:0,order:0,fill:0};', 'state.indexes={choice:0,order:0,fill:0,trans:0};'))
    # 11) nextBtn ||0
    repls.append(('state.indexes[state.mode]=(state.indexes[state.mode]+1)%exercises[state.mode].length',
                  'state.indexes[state.mode]=((state.indexes[state.mode]||0)+1)%exercises[state.mode].length'))

    for idx,(old,new) in enumerate(repls,1):
        c=s.count(old)
        if c!=1:
            raise SystemExit(f"[{os.path.basename(path)}] repl#{idx} matched {c} (expect 1): {old[:50]!r}")
        s=s.replace(old,new)

    # 2) grid: mode-tabs repeat(3)->repeat(4)（前缀正则，避开 overview-grid）
    s,gn=re.subn(r'mode-tabs\{display:grid;grid-template-columns:repeat\(3,',
                'mode-tabs{display:grid;grid-template-columns:repeat(4,', s)
    if gn!=1:
        raise SystemExit(f"[{os.path.basename(path)}] grid replace matched {gn} (expect 1)")

    # 4) quizType 字典加 trans（标签自适应，必须放进花括号内）
    s,dn=re.subn(r'(\{choice:"[^"]*",order:"[^"]*",fill:"[^"]*")(\})',
                 r'\1,trans:"中译日"\2', s)
    if dn!=1:
        raise SystemExit(f"[{os.path.basename(path)}] quizType dict matched {dn} (expect 1)")

    open(path,'w',encoding='utf-8').write(s)
    return len(trans)

# ---------- 执行 ----------
results=[]
for f in PAGES:
    p=os.path.join(PUB,f)
    bak=os.path.join(BAK,f)
    if not os.path.exists(bak):
        shutil.copyfile(p,bak)
    try:
        n=inject(p)
        results.append((f,n,"ok"))
        print(f"OK  {f}: trans items={n}")
    except SystemExit as e:
        results.append((f,0,str(e)))
        print("FAIL",e)

print("\n=== SUMMARY ===")
for f,n,st in results:
    print(f"{st:>4}  {f}  items={n}")
