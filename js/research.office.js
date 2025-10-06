/* Research Office — robust preview with figures */
(function () {
  "use strict";

  // -------- helpers
  const $ = sel => document.querySelector(sel);

  function cafeSlugFromPath() {
    const p = location.pathname.split("/").filter(Boolean);
    const i = p.indexOf("cafes");
    return (i >= 0 && p[i + 1]) ? p[i + 1] : "cafe";
  }

  function dirOf(url) {
    // return the directory portion of a URL (ending with /)
    try {
      const u = new URL(url, location.href);
      u.pathname = u.pathname.replace(/[^/]+$/, ""); // drop filename
      u.hash = ""; u.search = "";
      return u.href;
    } catch { return url; }
  }

  function decodeChapterTitle(chapterParam) {
    const dec = decodeURIComponent(chapterParam || "");
    const file = dec.split("/").pop() || dec;
    return file.replace(/\.html?$/i, "");
  }

  function rebaseUrls(container, baseDirHref) {
    // src/href → absolute
    container.querySelectorAll("[src],[href]").forEach(el => {
      for (const attr of ["src", "href"]) {
        const v = el.getAttribute(attr);
        if (!v) continue;
        if (/^[a-z]+:/i.test(v) || v.startsWith("//")) continue;   // already absolute
        try { el.setAttribute(attr, new URL(v, baseDirHref).href); } catch {}
      }
    });

    // srcset → absolute
    container.querySelectorAll("img[srcset], source[srcset]").forEach(el => {
      const srcset = el.getAttribute("srcset");
      if (!srcset) return;
      const parts = srcset.split(",").map(s => s.trim()).filter(Boolean).map(entry => {
        const [u, desc] = entry.split(/\s+/, 2);
        if (/^[a-z]+:/i.test(u) || u.startsWith("//")) return entry;
        let abs = u;
        try { abs = new URL(u, baseDirHref).href; } catch {}
        return desc ? `${abs} ${desc}` : abs;
      });
      el.setAttribute("srcset", parts.join(", "));
    });

    // native lazy-loading can fail inside overflow containers → force eager
    container.querySelectorAll("img").forEach(img => {
      img.setAttribute("loading", "eager");
      // handle <img data-src="..."> patterns just in case
      if (!img.getAttribute("src") && img.dataset && img.dataset.src) {
        try { img.setAttribute("src", new URL(img.dataset.src, baseDirHref).href); } catch {}
      }
    });
  }

  function textOf(el) { return (el?.textContent || "").replace(/\s+/g, " ").trim(); }
  function pillNumberFrom(id) { const m = /osf-(\d+)/.exec(id || ""); return m ? +m[1] : NaN; }

  // -------- config + params
  const CFG = Object.assign({
    snippetTemplate: (url, n) => `§${n} — ${url}`,
    squareUrl: "",
    discordChannelUrl: "",
    discordAppUrl: ""
  }, window.OSF_CONFIG || {});

  const qs       = new URLSearchParams(location.search);
  const paraId   = qs.get("para")     || "osf-1";
  // const chapterQ = qs.get("chapter")  || "";
  const chapterQ = decodeURIComponent(new URLSearchParams(location.search).get("chapter") || "");

  const backUrl  = qs.get("return")   || "index.html";

  const cafe = cafeSlugFromPath();
  $("#cafeTag").textContent = `[${cafe}]`;
  $("#chapterTitle").textContent = decodeChapterTitle(chapterQ);
  $("#backLink").href = backUrl;

  const chapterAbs = new URL(chapterQ, location.href).href;
  const chapterDir = dirOf(chapterAbs);

  // -------- load & render
  async function loadChapterDoc() {
    const html = await fetch(chapterAbs).then(r => {
      if (!r.ok) throw new Error(`Fetch ${r.status}`);
      return r.text();
    });
    return new DOMParser().parseFromString(html, "text/html");
  }

  function makeListItem({ id, title, openHref }) {
    const wrap = document.createElement("div");
    wrap.className = "item";
    const cb = document.createElement("input");
    cb.type = "checkbox"; cb.dataset.id = id;
    const label = document.createElement("span"); label.textContent = title || id;
    const open = document.createElement("a");
    open.href = openHref; open.target = "_blank"; open.rel = "noopener";
    open.className = "open"; open.textContent = "open";
    wrap.append(cb, label, document.createTextNode(" "), open);
    return wrap;
  }

  function typeset(node) {
    if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise([node]).catch(()=>{});
  }

  async function init() {
    try {
      const doc = await loadChapterDoc();

      // locate paragraph
      let pre = doc.getElementById(paraId);
      if (!pre) {
        const idx = pillNumberFrom(paraId) - 1;
        const all = Array.from(doc.querySelectorAll("pre.osf"));
        pre = all[idx] || all[0] || null;
      }
      if (!pre) throw new Error("Paragraph not found");

      // §n pill
      const n = pillNumberFrom(pre.id);
      if (!Number.isNaN(n)) $("#paraNum").textContent = `#${n}`;

      // preview
      const preview = $("#paraPreview");
      preview.innerHTML = pre.innerHTML;
      rebaseUrls(preview, chapterDir);
      typeset(preview);

      // lists
      const figList = $("#figList"); figList.innerHTML = "";
      Array.from(doc.querySelectorAll("figure[id^='fig-'], figure[id]:has(img), figure[id]:has(svg)"))
        .forEach(f => figList.appendChild(
          makeListItem({
            id: f.id,
            title: textOf(f.querySelector("figcaption")) || f.id.replace(/^fig[-_]?/i, "Figure "),
            openHref: chapterAbs + "#" + f.id
          })
        ));

      const tblList = $("#tblList"); tblList.innerHTML = "";
      [...doc.querySelectorAll("figure[id^='tbl-'], table[id^='tbl-']")].forEach(t =>
        tblList.appendChild(
          makeListItem({
            id: t.id,
            title: textOf(t.querySelector("figcaption")) || ("Table " + t.id.replace(/^tbl[-_]?/i, "")),
            openHref: chapterAbs + "#" + t.id
          })
        )
      );

      // copy paragraph snippet
      $("#copyLinkBtn").addEventListener("click", async () => {
        const url = chapterAbs + "#" + (pre.id || paraId);
        const snip = CFG.snippetTemplate(url, n);
        try { await navigator.clipboard.writeText(snip); toast("Copied link"); }
        catch { prompt("Copy paragraph link:", snip); }
      });

      // restore/save/export/submit memo
      restoreDraft();

      $("#saveDraftBtn").addEventListener("click", () => {
        localStorage.setItem(draftKey(), JSON.stringify(currentMemo()));
        toast("Draft saved");
      });

      $("#exportBtn").addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(currentMemo(), null, 2)], {type:"application/json"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${cafe}-memo-${pre.id || "osf"}.json`;
        a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 300);
      });

      $("#submitBtn").addEventListener("click", async () => {
        const url = chapterAbs + "#" + (pre.id || paraId);
        const snip = CFG.snippetTemplate(url, n);
        try { await navigator.clipboard.writeText(snip); } catch {}
        const openUrl = CFG.discordAppUrl || CFG.discordChannelUrl || CFG.squareUrl || "#";
        if (openUrl && openUrl !== "#") window.open(openUrl, "_blank", "noopener");
      });

    } catch (e) {
      console.error(e);
      $("#paraPreview").textContent = "Failed to load paragraph preview.";
    }
  }

  // -------- memo draft helpers
  function draftKey() {
    return `rfc.memo|${cafeSlugFromPath()}|${new URL(chapterAbs).pathname}|${paraId}`;
  }
  function currentMemo() {
    return {
      cafe: cafeSlugFromPath(),
      chapter: chapterAbs,
      paraId,
      figures: Array.from(document.querySelectorAll("#figList input[type=checkbox]:checked")).map(cb => cb.dataset.id),
      tables:  Array.from(document.querySelectorAll("#tblList input[type=checkbox]:checked")).map(cb => cb.dataset.id),
      bodyMd: $("#memoBody").value || ""
    };
  }
  function restoreDraft() {
    try {
      const raw = localStorage.getItem(draftKey());
      if (!raw) return;
      const m = JSON.parse(raw);
      $("#memoBody").value = m.bodyMd || "";
      document.querySelectorAll("#figList input[type=checkbox]").forEach(cb => cb.checked = (m.figures||[]).includes(cb.dataset.id));
      document.querySelectorAll("#tblList input[type=checkbox]").forEach(cb => cb.checked = (m.tables||[]).includes(cb.dataset.id));
    } catch {}
  }

  // tiny toast
  function toast(msg) {
    const d = Object.assign(document.createElement("div"), {textContent: msg});
    Object.assign(d.style, {
      position:"fixed", right:"16px", bottom:"16px", padding:"8px 12px",
      background:"rgba(0,0,0,.72)", border:"1px solid rgba(255,255,255,.25)",
      borderRadius:"8px", zIndex:9999
    });
    document.body.appendChild(d); setTimeout(()=>d.remove(), 1200);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
