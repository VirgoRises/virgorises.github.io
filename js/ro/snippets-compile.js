// /js/ro/snippets-compile.js

// --- very small Markdown -> HTML (headings, bold/italic, code, lists, paragraphs) ---
// NOTE: This is deliberately compact for the sandbox. For production, consider a
// battle-tested parser like marked/markdown-it (or the one you already use elsewhere).
// --- tiny Markdown -> HTML with raw-HTML passthrough (no global escaping) ---
function mdToHtml(src='') {
  let s = String(src || '');

  // Preserve fenced code blocks (do not touch their contents)
  s = s.replace(/```([\s\S]*?)```/g, (_,code)=>`<pre><code>${code}</code></pre>`);

  // Inline code
  s = s.replace(/`([^`]+)`/g, (_,code)=>`<code>${code}</code>`);

  // Headings
  s = s.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
       .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
       .replace(/^####\s+(.+)$/gm,  '<h4>$1</h4>')
       .replace(/^###\s+(.+)$/gm,   '<h3>$1</h3>')
       .replace(/^##\s+(.+)$/gm,    '<h2>$1</h2>')
       .replace(/^#\s+(.+)$/gm,     '<h1>$1</h1>');

  // Bold / italic (simple)
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g,     '<em>$1</em>');

  // Unordered lists (loose)
  s = s.replace(/(^|\n)(?:\s*[-*]\s.+\n)+/g, block=>{
    const items = block.trim().split('\n')
      .map(l=>l.replace(/^\s*[-*]\s/,''))
      .map(t=>`<li>${t}</li>`).join('');
    return `\n<ul>${items}</ul>\n`;
  });

  // Paragraphs: only wrap chunks that are NOT starting with block tags
  s = s.split(/\n{2,}/).map(chunk=>{
    if (/^\s*<(h\d|ul|ol|pre|table|blockquote|img|figure)/i.test(chunk)) return chunk;
    return `<p>${chunk.replace(/\n/g,'<br/>')}</p>`;
  }).join('\n');

  return s;
}

function escapeHtml(s){ return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function computeMembership(snips){
  let currentDock=null;
  return snips.map(s=>{
    if (s.type==='Dock'){ currentDock=s.id; return {dockId:null}; }
    return {dockId:currentDock};
  });
}

export function compileSnippets(snips, groups, activeId){
  const mem = computeMembership(snips);
  const html = snips.map((sn, i)=>{
    const isDock = sn.type==='Dock';
    const active = sn.id===activeId ? ' active' : '';

    if (isDock){
      const collapsed = groups[sn.id]?.collapsed;
      return `
        <div class="pv-card dock${active}">
          <div class="head"><span class="badge">${sn.type}</span><span class="title">${escapeHtml(sn.title||'')}</span></div>
          <div class="pv-body">${collapsed?'<em>(collapsed)</em>':''}</div>
        </div>`;
    }

    const grp = mem[i].dockId;
    if (grp && groups[grp]?.collapsed) return '';

    const bodyHtml = mdToHtml(sn.body||''); // ← render Markdown here
    return `
      <div class="pv-card${active}">
        <div class="head"><span class="badge">${sn.type}</span><span class="title">${escapeHtml(sn.title||'')}</span></div>
        <div class="pv-body">${bodyHtml}</div>
      </div>`;
  }).join('\n');

  return html;
}

// Keep this at module scope
let __mjRetryTimer = null;
let __mjPendingRoots = new Set();

export function queueTypeset(root){
  if (!root) return;
  __mjPendingRoots.add(root);

  const flush = () => {
    const mj = window.MathJax;
    if (!mj || !mj.typesetPromise) return retry(); // still not ready

    const batch = Array.from(__mjPendingRoots);
    __mjPendingRoots.clear();
    // Let layout settle
    setTimeout(() => mj.typesetPromise(batch).catch(()=>{}), 0);
  };

  const retry = () => {
    if (__mjRetryTimer) return;
    __mjRetryTimer = setTimeout(() => {
      __mjRetryTimer = null;
      queueTypeset(); // attempt again (will call flush or set timer again)
    }, 100);
  };

  // If MathJax exposes a startup promise, hook it once and flush when ready
  const mj = window.MathJax;
  if (mj?.startup?.promise && !mj.__ro_snippets_readyHooked) {
    mj.__ro_snippets_readyHooked = true;
    mj.startup.promise.then(flush).catch(flush);
  }

  // Try immediate flush (works when MJ already loaded), else retry
  flush();
}


export { mdToHtml }; // export for list rendering
