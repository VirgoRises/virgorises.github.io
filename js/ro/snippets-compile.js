// /js/ro/snippets-compile.js
// Minimal Markdown + HTML + MathJax passthrough compiler, now with:
// - horizontal rules: --- *** ___
// - GFM-like pipe tables with alignment
// - robust code fences (``` lang) that never get typeset by MathJax

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

// Marks blocks to be ignored by MathJax v3; we also escape content.
function fencedBlock(html, lang) {
  const cls = lang ? ` class="language-${escapeHtml(lang)} tex2jax_ignore"` : ' class="tex2jax_ignore"';
  return `<pre${cls} data-mathjax="ignore"><code${lang ? ` class="language-${escapeHtml(lang)}"` : ''}>${html}</code></pre>`;
}

// Simple inline markdown (em/strong/code) *without* touching LaTeX or HTML.
function inlineMd(s) {
  // protect code spans first
  const codeSpans = [];
  s = s.replace(/`([^`]+)`/g, (_, m) => {
    const i = codeSpans.length;
    codeSpans.push(m);
    return `\uE000CODE${i}\uE001`;
  });

  // strong, em
  s = s.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+?)\*/g, '<em>$1</em>');

  // restore code spans (escaped)
  s = s.replace(/\uE000CODE(\d+)\uE001/g, (_, i) => `<code>${escapeHtml(codeSpans[+i])}</code>`);

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
  let inFence = false;
  let fenceLang = '';
  let fenceDelim = '```';

  const flushPara = () => {
    if (!para.length) return;
    const text = para.join(' ').trim();
    if (!text) { para = []; return; }
    if (/^\s*<\/?(div|p|table|thead|tbody|tr|td|th|ul|ol|li|h[1-6]|figure|img|blockquote|pre|code|section|article)\b/i.test(text)) {
      out.push(text);
    } else {
      out.push(`<p>${text}</p>`);
    }
    para = [];
  };

  // List support (basic, same as before)
  let listMode = null, listBuf = [];
  const flushList = () => {
    if (!listMode || !listBuf.length) return;
    out.push(`<${listMode}>${listBuf.join('')}</${listMode}>`);
    listMode = null; listBuf = [];
  };
  const startList = (mode) => { if (listMode && listMode !== mode) flushList(); if (!listMode) listMode = mode; };

  while (i < lines.length) {
    let line = lines[i];

    // CODE FENCE start: allow leading spaces and ``` or ~~~
    let m = line.match(/^\s*(```|~~~)\s*([A-Za-z0-9_-]+)?\s*$/);
    if (m) {
      flushPara(); flushList();
      inFence = true;
      fenceDelim = m[1];
      fenceLang = m[2] || '';
      out.push(`<pre class="tex2jax_ignore" data-mathjax="ignore"><code${fenceLang ? ` class="language-${escapeHtml(fenceLang)}"` : ''}>`);
      i++;
      while (i < lines.length && !new RegExp(`^\\s*${fenceDelim}\\s*$`).test(lines[i])) {
        // Escape *everything* so MathJax cannot see $ or \(
        out.push(lines[i].replace(/&/g,'&amp;').replace(/</g,'&lt;'));
        i++;
      }
      if (i < lines.length) out.push('</code></pre>'); // closing fence consumed below
      inFence = false; fenceLang = '';
      i++; // skip closing fence line
      continue;
    }

    // If we were in a fence (shouldn’t happen due to loop above), just advance
    if (inFence) { i++; continue; }

    // Horizontal rule: --- *** ___ (3+), allow up to 3 leading spaces
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
    let h = line.match(/^\s*(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara(); flushList();
      const lvl = h[1].length;
      out.push(`<h${lvl}>${inlineMd(h[2])}</h${lvl}>`); i++; continue;
    }

    // TABLE: detect header + separator then collect rows
    // Header line must contain pipes with at least two columns
    const looksLikeHeader = /^\s*\|?(.+?\|.+?)\|?\s*$;
    const looksLikeSep = /^\s*\|?\s*[:\-]+(\s*\|\s*[:\-]+)+\s*\|?\s*$/;

    if (looksLikeHeader.test(line) && (i + 1) < lines.length && looksLikeSep.test(lines[i + 1])) {
      flushPara(); flushList();

      // parse header
      const headerCells = splitPipes(RegExp.$1).map(s => s.trim());
      const sepLine = lines[i + 1].trim();
      const aligns = splitPipes(sepLine.replace(/^\|?|\|?$/g,''))
        .map(seg => {
          const a = seg.trim();
          return (a.startsWith(':') && a.endsWith(':')) ? 'center'
               : (a.endsWith(':')) ? 'right'
               : 'left';
        });

      const rows = [];
      i += 2; // move past header+sep
      while (i < lines.length && /^\s*\|?.*\|?\s*$/.test(lines[i]) && lines[i].includes('|')) {
        const row = splitPipes(lines[i].replace(/^\|?|\|?$/g,'')).map(s => s.trim());
        rows.push(row);
        i++;
      }

      // build table html
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

// Split a pipe row, honoring escaped pipes \| inside code spans/backticks
function splitPipes(row) {
  // Very small splitter: ignore pipes inside backticks
  const parts = [];
  let buf = '', inCode = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i], nxt = row[i + 1];
    if (ch === '`') { inCode = !inCode; buf += ch; continue; }
    if (!inCode && ch === '|' ) { parts.push(buf); buf = ''; continue; }
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
