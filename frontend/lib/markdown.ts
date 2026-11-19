// Markdown / plain-text detector and HTML cleaners (shared by the editor).
export const esc=(s:string)=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'} as any)[c]);
export const slugify=(s:string)=>s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g,'').trim().replace(/[\s_]+/g,'-').replace(/-+/g,'-');
export function inl(s){const k=[];s=s.replace(/`([^`]+)`/g,(_,c)=>{k.push('<code>'+esc(c)+'</code>');return '\u0000'+(k.length-1)+'\u0000'});
s=esc(s).replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^)]*&quot;)?\)/g,'<img src="$2" alt="$1">')
.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,'<a href="$2">$1</a>')
.replace(/\*\*(.+?)\*\*|__(.+?)__/g,(_,a,b)=>'<strong>'+(a||b)+'</strong>')
.replace(/(^|[^*])\*([^*\s][^*]*)\*/g,'$1<em>$2</em>').replace(/~~(.+?)~~/g,'<s>$1</s>');
return s.replace(/\u0000(\d+)\u0000/g,(_,i)=>k[i])}
export const LI=/^\s*([-*+]|\d+[.)])\s+/;
export const imgLine=l=>{const t=l.trim();let m=t.match(/^!\[([^\]]*)\]\(([^)\s]+)[^)]*\)$/);if(m)return[m[1],m[2]];m=t.match(/^https?:\/\/\S+\.(?:png|jpe?g|gif|webp|svg|avif)(?:\?\S*)?$/i);return m?['',t]:null};
export const isBlock=l=>/^(#{1,6}\s|```|>|\|)/.test(l)||LI.test(l)||/^\s*([-*_]\s*){3,}$/.test(l)||imgLine(l);
export function md(t){t=t.replace(/\r/g,'').trim();const L=t.split('\n'),o=[],hasH=/^#{1,6}\s/m.test(t);let i=0,first=true;
while(i<L.length){const l=L[i];if(!l.trim()){i++;continue}
if(/^```/.test(l)){const c=[];i++;while(i<L.length&&!/^```/.test(L[i]))c.push(L[i++]);i++;o.push('<pre><code>'+esc(c.join('\n'))+'</code></pre>');continue}
let m=l.match(/^(#{1,6})\s+(.*)/);if(m){o.push('<h'+m[1].length+'>'+inl(m[2].replace(/\s*#+\s*$/,''))+'</h'+m[1].length+'>');i++;first=false;continue}
if(/^\s*([-*_]\s*){3,}$/.test(l)){o.push('<hr>');i++;continue}
if(/^>/.test(l)){const c=[];while(i<L.length&&/^>/.test(L[i]))c.push(L[i++].replace(/^>\s?/,''));o.push('<blockquote>'+inl(c.join(' '))+'</blockquote>');continue}
if(LI.test(l)){const ord=/^\s*\d/.test(l),c=[];while(i<L.length&&LI.test(L[i]))c.push('<li>'+inl(L[i++].replace(LI,''))+'</li>');const tg=ord?'ol':'ul';o.push('<'+tg+'>'+c.join('')+'</'+tg+'>');continue}
if(/^\s*\|.*\|\s*$/.test(l)&&/^\s*\|?\s*:?-{2,}/.test(L[i+1]||'')){const cells=r=>r.trim().replace(/^\||\|$/g,'').split('|').map(c=>inl(c.trim()));const h=cells(l);i+=2;const b=[];while(i<L.length&&L[i].trim()&&/\|/.test(L[i]))b.push(cells(L[i++]));
o.push('<table><thead><tr>'+h.map(c=>'<th>'+c+'</th>').join('')+'</tr></thead><tbody>'+b.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table>');continue}
const im=imgLine(l);if(im){o.push('<p><img src="'+esc(im[1]?im[1]:'')+'" alt="">'.replace('src="'+esc('')+'"','src="'+esc(im[1])+'"'));o.pop();o.push('<p><img src="'+esc(im[1])+'" alt="'+esc(im[0])+'"></p>');i++;continue}
const prevBlank=i==0||!L[i-1].trim(),nextOk=L[i+1]&&L[i+1].trim();
if(!hasH&&prevBlank&&nextOk&&l.trim().length<80&&!/[.!?,;:]$/.test(l.trim())){o.push(first?'<h1>'+inl(l.trim())+'</h1>':'<h2>'+inl(l.trim())+'</h2>');i++;first=false;continue}
if(/^\*\*[^*]+\*\*:?$/.test(l.trim())&&prevBlank){o.push('<h3>'+inl(l.trim().replace(/\*\*/g,'').replace(/:$/,''))+'</h3>');i++;first=false;continue}
const c=[l.trim()];i++;while(i<L.length&&L[i].trim()&&!isBlock(L[i]))c.push(L[i++].trim());o.push('<p>'+inl(c.join(' '))+'</p>');first=false}
return o.join('\n')}
export const looksMd=t=>/^#{1,6}\s|\*\*.+\*\*|^```|!\[.*\]\(|^\s*[-*]\s+\S|^\|.*\|/m.test(t);
export function clean(h){const d=new DOMParser().parseFromString(h,'text/html');d.querySelectorAll('script,style,meta,link,iframe,object,svg,button').forEach(n=>n.remove());
d.body.querySelectorAll('*').forEach(n=>[...n.attributes].forEach(a=>{if(!['href','src','alt','colspan','rowspan'].includes(a.name))n.removeAttribute(a.name)}));return d.body.innerHTML}
export function safe(h){const d=document.createElement('div');d.innerHTML=h;d.querySelectorAll('script,iframe,object,embed').forEach(n=>n.remove());d.querySelectorAll('*').forEach(n=>[...n.attributes].forEach(a=>{if(/^on/i.test(a.name)||/^\s*javascript:/i.test(a.value))n.removeAttribute(a.name)}));return d.innerHTML}

