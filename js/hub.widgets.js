// js/hub.widgets.js
(function(){
  const $ = (s, r=document) => r.querySelector(s);

  async function getJSON(url){
    try { const r = await fetch(url, { cache: "no-store" }); if(!r.ok) throw 0; return await r.json(); }
    catch { return null; }
  }

  function card(html){
    const a = document.createElement('article');
    a.className = 'card';
    a.innerHTML = html;
    return a;
  }

  function fmt(n){ return n?.toLocaleString?.() ?? String(n ?? 0); }
  function escapeHTML(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // 🔥 badge links to the café's hot feed page
  function hotBadge(rank, slug){
    const label = ["#1", "#2", "#3"][rank] || "";
    const href = `/cafes/${slug}/hot.html`;
    return `<a class="badge-hot" href="${href}" title="Fastest mover">${label} 🔥</a>`;
  }

  async function renderStats(){
    const data = await getJSON('/out/hub_stats.json');
    const host = $('#hub-stats');
    if (!host || !data) return;

    host.innerHTML = '';

    // compute top-3 by momentum_24h
    const sorted = [...data.cafes].sort((a,b)=> (b.momentum_24h||0) - (a.momentum_24h||0));
    const top3 = new Map(sorted.slice(0,3).map((c, i) => [c.slug, i])); // slug -> rank

    const grid = document.createElement('div');
    grid.className = 'grid-hub';

    data.cafes.forEach(c => {
      const base = c.basePath || `/cafes/${c.slug}`;
      const notebookURL = `${base}/notebook/`;
      const isTop = top3.has(c.slug);
      const badge = isTop ? hotBadge(top3.get(c.slug), c.slug) : '';

      // If café is top-3 and we know its hottest RFC, deep-link to it
      let hottestLine = '';
      if (isTop) {
        if (c.hottest) {
          const deep = c.hottest.paragraph_uuid ? `${notebookURL}#${c.hottest.paragraph_uuid}` : notebookURL;
          hottestLine = `
            <p class="meta">
              ${badge} Hottest now:
              <a href="${deep}">${escapeHTML(c.hottest.prfc_id)} — ${escapeHTML(c.hottest.title)}</a>
              · <a href="/cafes/${c.slug}/hot.html">hot feed →</a>
            </p>`;
        } else {
          hottestLine = `<p class="meta">${badge} Hottest now: <a href="/cafes/${c.slug}/hot.html">open hot feed →</a></p>`;
        }
      }

      grid.appendChild(card(`
        <div class="kicker">${escapeHTML(c.title)}</div>
        <h3><a href="${notebookURL}">${escapeHTML(c.title)}</a></h3>
        <p class="meta">${escapeHTML(c.description || '')}</p>

        ${hottestLine}

        <p>
          <span class="pill">Active: <b>${fmt(c.totals.active)}</b></span>
          <span class="pill">Ready: <b>${fmt(c.totals.ready)}</b></span>
          <span class="pill">Closed: <b>${fmt(c.totals.closed)}</b></span>
        </p>
        <p>
          <span class="pill">Underwrites: <b>${fmt(c.totals.underwrites)}</b></span>
          <span class="pill">Dissents: <b>${fmt(c.totals.dissents)}</b></span>
          <span class="pill">🔥 24h: <b>${fmt(c.momentum_24h)}</b></span>
        </p>
        <p class="meta">Last activity: ${c.last_activity ? new Date(c.last_activity).toLocaleString() : '—'}</p>
      `));
    });

    host.appendChild(grid);
  }

  async function renderLatest(){
    const data = await getJSON('/out/latest_rfcs.json');
    const host = $('#latest-rfcs');
    if (!host || !data) return;

    host.innerHTML = '';

    const list = document.createElement('div');
    list.className = 'grid-hub';

    data.items.forEach(it => {
      const base = `/cafes/${it.slug}/notebook/`;
      const deep = it.paragraph_uuid ? `${base}#${it.paragraph_uuid}` : base;

      list.appendChild(card(`
        <div class="kicker">${escapeHTML(it.cafe_title)}</div>
        <h3>${escapeHTML(it.prfc_id)} — ${escapeHTML(it.title)}</h3>
        <p>Status: <b>${escapeHTML(it.status)}</b></p>
        <p>Votes: ✅ ${fmt(it.tallies.underwrite)} · ❌ ${fmt(it.tallies.dissent)}</p>
        <p class="meta">Updated: ${it.updated_at ? new Date(it.updated_at).toLocaleString() : '—'}</p>
        <p><a href="${deep}">Open →</a></p>
      `));
    });

    host.appendChild(list);
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderStats();
    renderLatest();
  });
})();
