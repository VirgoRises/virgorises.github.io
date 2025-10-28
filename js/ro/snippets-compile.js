// /js/ro/snippets-compile.js
// Minimal Markdown + HTML + MathJax passthrough compiler, now with:
// - horizontal rules: --- *** ___
// - GFM-like pipe tables with alignment
// - robust code fences (``` or ~~~) that never get typeset by MathJax

/* =========================
   Utils
   ========================= */

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => (
    c === '&' ? '&amp;' :
    c === '<' ? '&lt;' :
    c === '>' ? '&gt;' :
    c === '"' ? '&quot;' : '&#39;'
  ));
}

// escape a string so it can be used literally inside a RegExp
function escapeForRegExp(s) {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

/* =========================
   Inline Markdown (light)
   ========================= */

function inlineMd(s) {
  // protect code spans first
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, m) => {
    const i = codes.length;
    codes.push(m);
    return `\uE000CODE${i}\uE001`;
  });

  // strong, em (very small subset)
  s = s.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+?)\*/g, '<em>$1</em>');

  // restore codes (escaped)
  s = s.replace(/\uE000CODE(\d+)\uE001/g, (_, i) => `<code>${escapeHtml(codes[+i])}</code>`);

  return s;
}

/* =========================
   Block parsing
   ========================= */

function parseBlocks(src) {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;

  let para = [];
  let listMode = null, listBuf = [];

  const flushPara = () => {
    if (!para.length) return;
    const text = para.join(' ').trim();
    if (!text) { para = []; return; }
    // If it already looks like a block HTML tag, passthrough
    if (/^\s*<\/?(div|p|table|thead|tbody|tr|td|th|ul|ol|li|h[1-6]|figure|img|blockquote|pre|code|section|article)\b/i.test(text)) {
      out.push(text);
    } else {
      out.push(`<p>${text}</p>`);
    }
    para = [];
  };

  const flushList = () => {
    if (!listMode || !listBuf.length) return;
    out.push(`<${listMode}>${listBuf.join('')}</${listMode}>`);
    listMode = null; listBuf = [];
  };

  const startList = (mode) => {
    if (listMode && listMode !== mode) flushList();
    if (!listMode) listMode = mode;
  };

  while (i < lines.length) {
    let line = lines[i];

    // CODE FENCE start: allow leading spaces and ``` or ~~~
    const fenceStart = line.match(/^\s*(```|~~~)\s*([A-Za-z0-9_-]+)?\s*$/);
    if (fenceStart) {
      flushPara(); flushList();

      const fenceDelim = fenceStart[1];           // "```" or "~~~"
      const fenceLang  = fenceStart[2] || '';
      const closeRe    = new RegExp('^\\s*' + escapeForRegExp(fenceDelim) + '\\s*$');

      out.push(`<pre class="tex2jax_ignore" data-mathjax="ignore"><code${fenceLang ? ` class="language-${escapeHtml(fenceLang)}"` : ''}>`);
      i++;
      while (i < lines.length && !closeRe.test(lines[i])) {
        // Escape everything so MathJax never sees $, \(...\), etc.
        out.push(lines[i].replace(/&/g,'&amp;').replace(/</g,'&lt;'));
        i++;
      }
      if (i < lines.length) {
        // consume closing fence line
        out.push('</code></pre>');
        i++;
      }
      continue;
    }

    // Horizontal rule: --- *** ___ (3+), up to 3 leading spaces
    if (/^\s{0,3}((-\s*){3,}|(\*\s*){3,}|(_\s*){3,})$/.test(line)) {
      flushPara(); flushList();
      out.push('<hr/>'); i++; continue;
    }

    // Blank line = paragraph/list separator
    if (/^\s*$/.test(line)) {
      flushPara(); flushList();
      i++; continue;
    }

    // Raw HTML block line
    if (/^\s*<[^>]+>/.test(line)) {
      flushPara(); flushList();
      out.push(line); i++; continue;
    }

    // Headings: #..######
    const h = line.match(/^\s*(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara(); flushList();
      const lvl = h[1].length;
      out.push(`<h${lvl}>${inlineMd(h[2])}</h${lvl}>`); i++; continue;
    }

    // TABLE: detect header + separator then collect rows
    const hdrMatch = line.match(/^\s*\|?(.+?\|.+?)\|?\s*$/);
    const sepLine  = lines[i + 1] || '';
    const sepOk    = /^\s*\|?\s*[:\-]+(\s*\|\s*[:\-]+)+\s*\|?\s*$/.test(sepLine);

    if (hdrMatch && sepOk) {
      flushPara(); flushList();

      // header cells
      const headerCells = splitPipes(hdrMatch[1]).map(s => s.trim());
      // alignment cells (strip outer pipes first)
      const aligns = splitPipes(sepLine.replace(/^\s*\|?|\|?\s*$/g, ''))
        .map(seg => {
          const a = seg.trim();
          return (a.startsWith(':') && a.endsWith(':')) ? 'center'
               : (a.endsWith(':')) ? 'right'
               : 'left';
        });

      // collect body rows
      const rows = [];
      i += 2; // move past header + separator
      while (i < lines.length && /^\s*\|?.*\|?\s*$/.test(lines[i]) && lines[i].includes('|')) {
        const row = splitPipes(lines[i].replace(/^\s*\|?|\|?\s*$/g, '')).map(s => s.trim());
        rows.push(row);
        i++;
      }

      const ths = headerCells.map((h, idx) =>
        `<th style="text-align:${aligns[idx] || 'left'}">${inlineMd(h)}</th>`).join('');
      const tbody = rows.map(r => {
        return '<tr>' + r.map((cell, idx) =>
          `<td style="text-align:${aligns[idx] || 'left'}">${inlineMd(cell)}</td>`).join('') + '</tr>';
      }).join('');

      out.push(
        '<table>',
        `<thead><tr>${ths}</tr></thead>`,
        `<tbody>${tbody}</tbody>`,
        '</table>'
      );
      continue;
    }

    // Ordered list
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) { flushPara(); startList('ol'); listBuf.push(`<li>${inlineMd(ol[1])}</li>`); i++; continue; }

    // Unordered list
    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ul) { flushPara(); startList('ul'); listBuf.push(`<li>${inlineMd(ul[1])}</li>`); i++; continue; }

    // Paragraph continuation
    para.push(inlineMd(line));
    i++;
  }

  // final flush
  if (para.length) flushPara();
  if (listMode) flushList();

  return out.join('\n');
}

// Split a pipe row, honoring escaped pipes \| and backtick code spans
function splitPipes(row) {
  const parts = [];
  let buf = '', inCode = false, esc = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];

    if (ch === '`') { inCode = !inCode; buf += ch; esc = false; continue; }

    if (!inCode && ch === '|' && !esc) { parts.push(buf); buf = ''; esc = false; continue; }

    if (ch === '\\' && !esc) { esc = true; buf += ch; continue; }

    esc = false;
    buf += ch;
  }
  parts.push(buf);
  return parts;
}

/* =========================
   Public API
   ========================= */

function mdToHtml(src = '') {
  if (!src) return '';
  return parseBlocks(src);
}
function compileToHTML(src = '') { return mdToHtml(src); }

async function typesetInto(container) {
  if (!container) return;
  // MathJax v3: typesetPromise ignores nodes marked tex2jax_ignore
  if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
    try { await window.MathJax.typesetPromise([container]); }
    catch (e) { console.warn('MathJax typeset error:', e); }
    return;
  }
  // Retry once if MJ isn’t ready yet
  await new Promise(r => setTimeout(r, 60));
  if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
    try { await window.MathJax.typesetPromise([container]); } catch {}
  }
}

/* =========================
   Exports (ESM + window)
   ========================= */

export { mdToHtml, compileToHTML, typesetInto };
window.mdToHtml = mdToHtml;
window.compileToHTML = compileToHTML;
window.typesetInto = typesetInto;
