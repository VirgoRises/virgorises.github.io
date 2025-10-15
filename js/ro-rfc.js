// /js/ro-rfc.js
(function () {

  function parseMmTokens(md) {
    // [mm|p75=47.0,55.8]    point
    // [mm|p75=47.0,55.8:128.2,179.1]  box
    const re = /\[mm\|p(\d+)\s*=\s*([-\d.]+)\s*,\s*([-\d.]+)(?::([-\d.]+)\s*,\s*([-\d.]+))?\]/g;
    const anchors = [];
    let m;
    while ((m = re.exec(md))) {
      const page = Number(m[1]);
      const x1 = Number(m[2]), y1 = Number(m[3]);
      const x2 = m[4] ? Number(m[4]) : null;
      const y2 = m[5] ? Number(m[5]) : null;
      const a = { page, points_mm: [], boxes_mm: [] };
      if (x2 != null && y2 != null) a.boxes_mm.push({ x1, y1, x2, y2 }); else a.points_mm.push({ x: x1, y: y1 });
      anchors.push(a);
    }
    return anchors;
  }

  async function sha1(text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-1", enc);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function buildRFC({ slug, chapter, para, memoMd }) {
    const created = new Date().toISOString();
    const memoHash = await sha1(memoMd);
    const short = memoHash.slice(0, 6);
    const id = `rfc:${slug}:${created.replace(/[:.]/g, "-")}:${short}`;

    const returnUrl = (() => {
      try {
        const base = new URL(location.origin + `/cafes/${slug}/${chapter}`);
        base.hash = `#${para}`;
        return base.toString();
      } catch { return ""; }
    })();

    const anchors = parseMmTokens(memoMd).map(a => ({
      chapter, // keep chapter context for cross-page refs later if needed
      para,    // starting para context
      ...a
    }));

    return {
      id, slug, created,
      author: null, // fill if you identify Discord user client-side
      chapter, para,
      memo_md: memoMd,
      memo_tex_hash: memoHash,
      anchors,
      links: { return: returnUrl },
      tags: [],
      version_of: null
    };
  }

  function downloadJsonlLine(obj, filename) {
    const blob = new Blob([JSON.stringify(obj) + "\n"], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename || `${obj.id}.jsonl`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  }

  async function wireRfcButtons({ slug, chapter, para, textarea, btnSaveVersion, btnExportAll }) {
    if (!textarea) return;

    // Save version → build RFC object + download a jsonl line (commit or post in your flow)
    btnSaveVersion?.addEventListener("click", async () => {
      const memoMd = textarea.value || "";
      const rfc = await buildRFC({ slug, chapter, para, memoMd });
      downloadJsonlLine(rfc, `${rfc.id}.jsonl`);
    });

    // Export ALL drafts → same as above, but with a generic name you can append into graph.jsonl
    btnExportAll?.addEventListener("click", async () => {
      const memoMd = textarea.value || "";
      const rfc = await buildRFC({ slug, chapter, para, memoMd });
      downloadJsonlLine(rfc, `graph.jsonl`);
    });

    // You can also expose buildRFC for Discord payload assembly:
    window.RO_RFC = { buildRFC };
  }

  window.RO_RFC_WIRE = { wireRfcButtons };
})();
