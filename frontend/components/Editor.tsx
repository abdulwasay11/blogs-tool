'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, uploadImage } from '@/lib/api';
import { clean, esc, looksMd, md, safe, slugify } from '@/lib/markdown';

/* ---------- toolbar definition (rendered once as static HTML) ---------- */
const FONTS = ['Newsreader', 'Instrument Sans', 'Georgia', 'Arial', 'Courier New', 'Verdana'];
const SIZES = [14, 16, 18, 20, 24, 28, 32, 40];
const ic = (n: string) => {
  const w = n === 'c' ? [14, 8, 14, 8] : n === 'j' ? [14, 14, 14, 14] : [14, 9, 14, 9];
  return '<svg width="16" height="14" viewBox="0 0 16 14" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
    w.map((x, i) => { const a = n === 'c' ? (16 - x) / 2 : n === 'r' ? 15 - x : 1; return `<line x1="${a}" x2="${a + x}" y1="${2 + i * 3.3}" y2="${2 + i * 3.3}"/>`; }).join('') + '</svg>';
};
const T: any[] = [
  ['undo', '↶', 'Undo'], ['redo', '↷', 'Redo'], '|', 'font', 'size', 'block', '|',
  ['bold', '<b>B</b>', 'Bold'], ['italic', '<i>I</i>', 'Italic'], ['underline', '<u>U</u>', 'Underline'], ['strikeThrough', '<s>S</s>', 'Strikethrough'],
  ['subscript', 'x₂', 'Subscript'], ['superscript', 'x²', 'Superscript'], ['icode', '‹/›', 'Inline code'], '|', 'color', 'hl', '|',
  ['justifyLeft', ic('l'), 'Align left'], ['justifyCenter', ic('c'), 'Align center'], ['justifyRight', ic('r'), 'Align right'], ['justifyFull', ic('j'), 'Justify'], '|',
  ['insertUnorderedList', '• List', 'Bulleted list'], ['insertOrderedList', '1. List', 'Numbered list'], ['outdent', '⇤', 'Outdent'], ['indent', '⇥', 'Indent'], '|',
  ['link', 'Link', 'Insert link'], ['unlink', 'Unlink', 'Remove link'], ['image', 'Image', 'Insert image'], ['table', 'Table', 'Insert table'], ['hr', '―', 'Horizontal line'], ['clear', 'Clear', 'Clear formatting'],
];
const sel1 = (s: string, l: string, o: string) => `<select data-s="${s}" aria-label="${l}"><option value="">${l}</option>${o}</select>`;
const TB = T.map((t: any) => {
  if (t === '|') return '<span class="sep"></span>';
  if (t === 'font') return sel1('font', 'Font', FONTS.map((f) => `<option>${f}</option>`).join(''));
  if (t === 'size') return sel1('size', 'Size', SIZES.map((f) => `<option value="${f}">${f}px</option>`).join(''));
  if (t === 'block') return sel1('block', 'Format', '<option value="p">Paragraph</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="h4">Heading 4</option><option value="blockquote">Quote</option><option value="pre">Code block</option>');
  if (t === 'color') return '<input type="color" data-s="fore" value="#2f5bff" title="Text color" aria-label="Text color">';
  if (t === 'hl') return '<input type="color" data-s="back" value="#ffe14d" title="Highlight" aria-label="Highlight">';
  return `<button type="button" data-c="${t[0]}" title="${t[2]}" aria-label="${t[2]}">${t[1]}</button>`;
}).join('');
const TBL = '<table><thead><tr><th>Heading</th><th>Heading</th><th>Heading</th></tr></thead><tbody><tr><td>Cell</td><td>Cell</td><td>Cell</td></tr><tr><td>Cell</td><td>Cell</td><td>Cell</td></tr></tbody></table><p></p>';
const pretty = (h: string) => h.replace(/(<\/(?:p|h[1-6]|li|ul|ol|blockquote|pre|table|thead|tbody|tr|figure)>|<hr>|<br>)/g, '$1\n').replace(/\n+/g, '\n').trim();

export default function Editor({ id: initial }: { id: string | null }) {
  const router = useRouter();
  const ed = useRef<HTMLDivElement>(null);
  const askIn = useRef<HTMLInputElement>(null);
  const gut = useRef<HTMLPreElement>(null);
  const sel = useRef<Range | null>(null);
  const idRef = useRef<string | null>(initial);
  const touched = useRef(false);
  const timer = useRef<any>(null);
  const toastT = useRef<any>(null);
  const chain = useRef<Promise<any>>(Promise.resolve());
  const okFn = useRef<((v: string) => void) | null>(null);
  const latest = useRef<any>({});

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState('draft');
  const [vis, setVis] = useState('public');
  const [cats, setCats] = useState<string[]>([]);
  const [feat, setFeat] = useState('');
  const [mode, setMode] = useState<'visual' | 'code'>('visual');
  const [codeText, setCodeText] = useState('');
  const [raw, setRaw] = useState('');
  const [impOpen, setImpOpen] = useState(!initial);
  const [outline, setOutline] = useState<{ t: string; l: number }[]>([]);
  const [count, setCount] = useState('0 words');
  const [saved, setSaved] = useState('Not saved yet');
  const [askS, setAskS] = useState<{ label: string; up: boolean } | null>(null);
  const [askV, setAskV] = useState('');
  const [ov, setOv] = useState<null | 'preview' | 'export'>(null);
  const [ovData, setOvData] = useState({ body: '', full: '' });
  const [exFull, setExFull] = useState(false);
  const [msg, setMsg] = useState('');
  const [catIn, setCatIn] = useState('');
  const [furl, setFurl] = useState('');
  const [delArm, setDelArm] = useState(false);

  latest.current = { title, slug, status, vis, cats, feat, mode, codeText };
  const toast = (m: string) => { setMsg(m); clearTimeout(toastT.current); toastT.current = setTimeout(() => setMsg(''), 3200); };

  /* ---------- outline, counts, autosave ---------- */
  function sync() {
    const e = ed.current; if (!e) return;
    e.querySelectorAll('h1,h2,h3,h4').forEach((h) => { (h as HTMLElement).id = slugify(h.textContent || ''); });
    const hs = Array.from(e.querySelectorAll('h1,h2,h3,h4')).filter((h) => (h.textContent || '').trim());
    setOutline(hs.map((h) => ({ t: h.textContent!.trim(), l: +h.tagName[1] })));
    const w = e.innerText.trim().split(/\s+/).filter(Boolean).length;
    setCount(`${w} words · ${Math.max(1, Math.round(w / 220))} min read`);
  }
  async function doSave(over: any) {
    const s = { ...latest.current, ...over };
    const html = s.mode === 'code' ? safe(s.codeText) : ed.current!.innerHTML;
    if (!idRef.current && !s.title.trim() && !ed.current!.innerText.trim() && !s.feat) return;
    const body = JSON.stringify({ title: s.title, slug: s.slug, html, categories: s.cats, featuredImage: s.feat, status: s.status, visibility: s.vis });
    try {
      const p = idRef.current
        ? await api(`/posts/${idRef.current}`, { method: 'PATCH', body })
        : await api('/posts', { method: 'POST', body });
      if (!idRef.current) { idRef.current = p._id; window.history.replaceState(null, '', `/admin/${p._id}`); }
      if (p.slug !== s.slug) setSlug(p.slug);
      setSaved('Saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      return p;
    } catch (e: any) { setSaved('Not saved'); toast(e.message); }
  }
  const save = (over: any = {}) => (chain.current = chain.current.then(() => doSave(over)));
  const queue = () => { clearTimeout(timer.current); timer.current = setTimeout(() => save(), 900); };

  /* ---------- load an existing post ---------- */
  useEffect(() => {
    if (!initial) return;
    api(`/posts/${initial}`).then((p) => {
      setTitle(p.title); setSlug(p.slug); setStatus(p.status); setVis(p.visibility);
      setCats(p.categories || []); setFeat(p.featuredImage || ''); setImpOpen(!p.html);
      touched.current = !!p.slug && p.slug !== slugify(p.title);
      ed.current!.innerHTML = p.html || ''; sync(); setSaved('Loaded');
    }).catch((e) => toast(e.message));
    return () => clearTimeout(timer.current);
  }, []);
  useEffect(() => {
    const h = () => { const s = getSelection(); if (s && s.rangeCount && ed.current?.contains(s.anchorNode)) sel.current = s.getRangeAt(0).cloneRange(); };
    document.addEventListener('selectionchange', h);
    return () => document.removeEventListener('selectionchange', h);
  }, []);

  /* ---------- editing commands ---------- */
  function ex(c: string, v?: string) {
    ed.current!.focus();
    if (sel.current) { const s = getSelection()!; s.removeAllRanges(); s.addRange(sel.current); }
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(c, false, v == null ? null : v);
    sync(); queue();
  }
  const putImg = async (f: File, cb: (u: string) => void) => { try { cb(await uploadImage(f)); } catch (e: any) { toast(e.message); } };
  function ask(label: string, up: boolean, fn: (v: string) => void) {
    setAskS({ label, up }); setAskV(''); okFn.current = fn; setTimeout(() => askIn.current?.focus(), 0);
  }
  const okAsk = () => { const v = askV.trim(), fn = okFn.current; setAskS(null); if (v && fn) fn(v); };

  function onToolbarClick(e: React.MouseEvent) {
    const b = (e.target as HTMLElement).closest('button'); if (!b) return;
    const c = b.dataset.c!;
    if (c === 'link') ask('Link address', false, (v) => ex('createLink', /^[a-z]+:/i.test(v) ? v : 'https://' + v));
    else if (c === 'image') ask('Image address or upload', true, (v) => ex('insertImage', v));
    else if (c === 'table') ex('insertHTML', TBL);
    else if (c === 'hr') ex('insertHorizontalRule');
    else if (c === 'clear') { ex('removeFormat'); ex('formatBlock', '<p>'); }
    else if (c === 'icode') { const s = String(getSelection()); if (s) ex('insertHTML', '<code>' + esc(s) + '</code>'); }
    else ex(c);
  }
  function onToolbarChange(e: React.FormEvent) {
    const t = e.target as HTMLSelectElement, s = t.dataset.s, v = t.value; if (!s || !v) return;
    if (s === 'font') ex('fontName', v);
    else if (s === 'size') {
      ex('fontSize', '7');
      ed.current!.querySelectorAll<HTMLElement>('font[size="7"],[style*="xxx-large"]').forEach((n) => { n.removeAttribute('size'); n.style.fontSize = v + 'px'; });
    } else if (s === 'block') ex('formatBlock', '<' + v + '>');
    else if (s === 'fore') ex('foreColor', v);
    else if (s === 'back') ex('hiliteColor', v);
    if (t.tagName === 'SELECT') t.value = '';
  }
  function onPaste(e: React.ClipboardEvent) {
    const cd = e.clipboardData, t = cd.getData('text/plain'), h = cd.getData('text/html');
    const f = Array.from(cd.files).find((x) => /^image\//.test(x.type));
    if (f) { e.preventDefault(); putImg(f, (u) => ex('insertImage', u)); return; }
    if (h && /<(h[1-6]|p|li|table|img|blockquote)[\s>]/i.test(h) && !looksMd(t)) { e.preventDefault(); ex('insertHTML', clean(h)); return; }
    if (t && (t.includes('\n') || looksMd(t))) { e.preventDefault(); ex('insertHTML', md(t)); }
  }

  /* ---------- visual / code ---------- */
  const toVisual = () => { if (mode === 'code') { ed.current!.innerHTML = safe(codeText); setMode('visual'); sync(); } };
  const toCode = () => { if (mode === 'visual') { setCodeText(pretty(ed.current!.innerHTML)); setMode('code'); } };
  const body = () => (mode === 'code' ? safe(codeText) : ed.current!.innerHTML);

  /* ---------- paste-from-Claude import ---------- */
  function importMd(t: string, app: boolean) {
    if (!t.trim()) { toast('Paste your blog text first.'); return; }
    toVisual();
    const b = document.createElement('div'); b.innerHTML = md(t);
    const h1 = b.querySelector('h1');
    if (h1 && (!app || !title.trim())) {
      const tt = h1.textContent!.trim(); setTitle(tt);
      if (!touched.current || !slug) setSlug(slugify(tt));
      h1.remove();
    }
    if (app) ed.current!.insertAdjacentHTML('beforeend', b.innerHTML); else ed.current!.innerHTML = b.innerHTML;
    const n = (s: string) => b.querySelectorAll(s).length;
    sync(); queue(); setRaw('');
    if (!app) setImpOpen(false);
    toast(`Detected ${h1 ? 'a title' : 'no title'}, ${n('h2,h3,h4')} headings, ${n('p')} paragraphs, ${n('img')} images.`);
  }

  /* ---------- preview / export ---------- */
  const full = () => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{font:18px/1.7 Georgia,serif;max-width:720px;margin:40px auto;padding:0 20px;color:#111}img{max-width:100%;height:auto}pre{background:#0f1b33;color:#dfe8ff;padding:14px;overflow:auto;border-radius:8px}blockquote{border-left:3px solid #2f5bff;margin:1em 0;padding-left:16px;color:#444}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px}</style></head><body><article><h1>${esc(title)}</h1>${feat ? `<img src="${esc(feat)}" alt="">` : ''}${body()}</article></body></html>`;
  const openOv = (k: 'preview' | 'export') => { sync(); setOvData({ body: body(), full: full() }); setExFull(false); setOv(k); };
  async function copyOut() {
    const text = exFull ? ovData.full : ovData.body;
    try { await navigator.clipboard.writeText(text); toast('Copied to clipboard.'); } catch { toast('Copy failed. Select the text and press Ctrl+C.'); }
  }

  /* ---------- sidebar actions ---------- */
  const addCat = () => { const v = catIn.trim().replace(/,$/, ''); if (v && !cats.includes(v)) { setCats([...cats, v]); queue(); } setCatIn(''); };
  async function remove() {
    if (!delArm) { setDelArm(true); setTimeout(() => setDelArm(false), 3000); return; }
    if (idRef.current) { try { await api(`/posts/${idRef.current}`, { method: 'DELETE' }); } catch (e: any) { toast(e.message); return; } }
    router.push('/admin');
  }

  return (
    <main className="wrap">
      <div className="grid">
        <div>
          <label className="l" htmlFor="title">Post title</label>
          <input id="title" value={title} placeholder="Give your post a title" autoComplete="off"
            onChange={(e) => { setTitle(e.target.value); if (!touched.current) setSlug(slugify(e.target.value)); queue(); }} />
          <div className="perma">yoursite.com/blog/
            <input id="slug" value={slug} aria-label="Permalink" autoComplete="off"
              onChange={(e) => { touched.current = true; setSlug(e.target.value.toLowerCase().replace(/[^\w-]+/g, '-')); queue(); }} />
          </div>

          <details className="card imp" id="imp" open={impOpen} onToggle={(e) => setImpOpen((e.currentTarget as HTMLDetailsElement).open)}>
            <summary>Paste a blog from Claude</summary>
            <div className="bd">
              <textarea id="raw" value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Paste your full blog here: markdown, plain text or copied chat text. Titles, headings, paragraphs, lists, tables, code and images are detected for you." />
              <p className="hint">Detects # titles and headings, short title-like lines, paragraphs, lists, quotes, tables, code blocks, ![images](url) and bare image links.</p>
              <div className="row"><button className="btn pri" onClick={() => importMd(raw, false)}>Replace post</button><button className="btn" onClick={() => importMd(raw, true)}>Add to end</button></div>
            </div>
          </details>

          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="seg">
              <button aria-pressed={mode === 'visual'} onClick={toVisual}>Visual</button>
              <button aria-pressed={mode === 'code'} onClick={toCode}>Code</button>
            </div>
            <button className="btn" onClick={() => { toVisual(); ask('Image address or upload', true, (v) => ex('insertImage', v)); }}>Add image</button>
          </div>

          <div className="card" id="edcard">
            <div id="vis" hidden={mode === 'code'}>
              <div className="tb" id="tb" role="toolbar" aria-label="Formatting" dangerouslySetInnerHTML={{ __html: TB }}
                onMouseDown={(e) => { if ((e.target as HTMLElement).closest('button')) e.preventDefault(); }}
                onClick={onToolbarClick} onChange={onToolbarChange} />
              {askS && (
                <div id="ask">
                  <span id="asklab">{askS.label}</span>
                  <input id="askin" ref={askIn} value={askV} aria-label="Value" onChange={(e) => setAskV(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); okAsk(); } if (e.key === 'Escape') setAskS(null); }} />
                  {askS.up && <label className="btn">Upload<input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) putImg(f, (u) => { ex('insertImage', u); setAskS(null); }); e.target.value = ''; }} /></label>}
                  <button className="btn pri" onClick={okAsk}>Insert</button>
                  <button className="btn" onClick={() => setAskS(null)}>Cancel</button>
                </div>
              )}
              <div className="doc" id="ed" ref={ed} contentEditable suppressContentEditableWarning spellCheck onInput={() => { sync(); queue(); }} onPaste={onPaste} />
            </div>
            <div id="cview" hidden={mode !== 'code'}>
              <div className="win">
                <div className="bar"><span>post.html</span><b>● Ready</b></div>
                <div className="cw">
                  <pre id="gut" ref={gut}>{Array.from({ length: codeText.split('\n').length }, (_, i) => i + 1).join('\n')}</pre>
                  <textarea id="code" value={codeText} spellCheck={false} aria-label="HTML source" onChange={(e) => { setCodeText(e.target.value); queue(); }} onScroll={(e) => { if (gut.current) gut.current.scrollTop = e.currentTarget.scrollTop; }} />
                </div>
              </div>
            </div>
            <div className="foot"><span>{count}</span><span>{saved}</span></div>
          </div>
        </div>

        <aside className="side">
          <div className="card pad"><h3>Publish</h3>
            <div className="publish-actions">
              <button className="btn" onClick={() => { setStatus('draft'); save({ status: 'draft' }).then(() => toast('Draft saved.')); }}>Save draft</button>
              <button className="btn" onClick={() => openOv('preview')}>Preview</button>
              <button
                type="button"
                className={'delete-icon' + (delArm ? ' armed' : '')}
                onClick={remove}
                aria-label={delArm ? 'Confirm delete post' : 'Delete post'}
                title={delArm ? 'Click again to delete' : 'Delete post'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 10v7M14 10v7" />
                </svg>
              </button>
            </div>
            <label className="l" htmlFor="st">Status</label>
            <select id="st" className="fld" value={status} onChange={(e) => { setStatus(e.target.value); save({ status: e.target.value }); }}><option value="draft">Draft</option><option value="published">Published</option></select>
            <label className="l" htmlFor="vs">Visibility</label>
            <select id="vs" className="fld" value={vis} onChange={(e) => { setVis(e.target.value); save({ vis: e.target.value }); }}><option value="public">Public</option><option value="private">Private</option></select>
            <div className="publish-submit">
              <button className="btn pri" onClick={() => { if (!title.trim()) { toast('Add a post title before publishing.'); return; } setStatus('published'); save({ status: 'published' }).then(() => toast('Published. It is live on your blog.')); }}>{status === 'published' ? 'Update' : 'Publish'}</button>
              <button className="btn" onClick={() => openOv('export')}>Export HTML</button>
            </div>
            {status === 'published' && vis === 'public' && <a className="btn" style={{ width: '100%', textAlign: 'center', marginBottom: 8 }} href={`/blog/${slug}`} target="_blank">View live post</a>}
          </div>
          <div className="card pad"><h3>Categories</h3>
            <div className="chips">{cats.map((c, i) => <span className="chip" key={c}>{c}<button aria-label={`Remove ${c}`} onClick={() => { setCats(cats.filter((_, j) => j !== i)); queue(); }}>×</button></span>)}</div>
            <input className="fld" value={catIn} placeholder="Add category, press Enter" style={{ margin: 0 }} onChange={(e) => setCatIn(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addCat(); } }} />
          </div>
          <div className="card pad feat"><h3>Featured image</h3>
            {feat && <><img src={feat} alt="Featured" /><button className="danger" onClick={() => { setFeat(''); queue(); }}>Remove image</button></>}
            <input className="fld" value={furl} placeholder="Image address" onChange={(e) => setFurl(e.target.value)} />
            <div className="row">
              <button className="btn" onClick={() => { if (furl.trim()) { setFeat(furl.trim()); setFurl(''); queue(); } }}>Use address</button>
              <label className="btn">Upload<input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) putImg(f, (u) => { setFeat(u); queue(); }); e.target.value = ''; }} /></label>
            </div>
          </div>
          <div className="card pad"><h3>Page outline</h3>
            <div className="ol">
              {outline.length ? outline.map((o, i) => <button key={i} style={{ paddingLeft: 10 + (o.l - 1) * 12 }} onClick={() => Array.from(ed.current!.querySelectorAll('h1,h2,h3,h4')).filter((h) => (h.textContent || '').trim())[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>{o.t}</button>) : <span className="none">Headings you add will appear here.</span>}
            </div>
          </div>
        </aside>
      </div>

      {ov && (
        <div id="ov" className="on" onClick={(e) => { if (e.target === e.currentTarget) setOv(null); }}>
          <div id="ovc">
            <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 10 }}><button className="btn" onClick={() => setOv(null)}>Close</button></div>
            {ov === 'preview' ? (
              <article className="doc" style={{ minHeight: 0 }}>
                <h1 style={{ marginTop: 0 }}>{title || 'Untitled'}</h1>
                {feat && <img src={feat} alt="" />}
                <div dangerouslySetInnerHTML={{ __html: ovData.body }} />
              </article>
            ) : (
              <>
                <h3 style={{ margin: '0 0 10px' }}>Export HTML</h3>
                <div className="row" style={{ marginBottom: 10 }}>
                  <div className="seg"><button aria-pressed={!exFull} onClick={() => setExFull(false)}>Article only</button><button aria-pressed={exFull} onClick={() => setExFull(true)}>Full page</button></div>
                  <button className="btn pri" onClick={copyOut}>Copy</button>
                </div>
                <textarea readOnly value={exFull ? ovData.full : ovData.body} />
              </>
            )}
          </div>
        </div>
      )}
      {msg && <div id="toast" role="status" style={{ display: 'block' }}>{msg}</div>}
    </main>
  );
}
