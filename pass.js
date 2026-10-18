/* ============================================================================
   IAN Pass: holo builder cards drawn on canvas.
   Skins come from IAN's own art plus a few generated ones. Rarity and stats
   are seeded from the name, so the same name always gets the same card.
   ========================================================================== */
(function (global) {
  "use strict";
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = { get(k, d) { try { const v = localStorage.getItem("ian:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } } };

  const SKINS = [
    { id: "float",   label: "Float",   img: "assets/ian-float.webp", kind: "cutout" },
    { id: "signal",  label: "Signal",  img: "assets/ian-signal.jpg" },
    { id: "deep",    label: "Deep",    img: "assets/ian-drift.jpg" },
    { id: "archive", label: "Archive", img: "assets/ian-archive.jpg" },
    { id: "ice",     label: "Ice",     img: "assets/ian.jpg" },
    { id: "ascent",  label: "Ascent",  img: "assets/ian-ascent.jpg" },
    { id: "matrix",  label: "Matrix",  img: "assets/ian-float.webp", kind: "matrix" },
    { id: "grid",    label: "Grid",    img: "assets/ian-float.webp", kind: "grid" },
    { id: "decoder", label: "Decoder", img: "assets/ian-float.webp", kind: "decoder", locked: true }
  ];
  const RARITY = [
    { name: "COMMON",  max: 60,  color: "#8ea6cc" },
    { name: "RARE",    max: 86,  color: "#5fb4ff" },
    { name: "EPIC",    max: 97,  color: "#c7a6ff" },
    { name: "MYTHIC",  max: 100, color: "#ffd38a" }
  ];
  const DISPLAY = '"Syne", "Arial Black", sans-serif', MONO = '"JetBrains Mono", Consolas, monospace';

  const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const imgs = {};
  const load = src => imgs[src] || (imgs[src] = new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }));

  function cover(g, img, x, y, w, h) {
    const r = Math.max(w / img.naturalWidth, h / img.naturalHeight), iw = img.naturalWidth * r, ih = img.naturalHeight * r;
    g.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  function init() {
    const cv = $("#passCanvas"); if (!cv) return;
    const g = cv.getContext("2d"), W = cv.width, H = cv.height;
    const nameEl = $("#passName"), roleEl = $("#passRole"), skinsEl = $("#passSkins");
    let skin = "float", drawing = 0;
    const unlocked = () => store.get("puzzle", 0) >= 3;

    // skin picker
    function buildSkins() {
      skinsEl.textContent = "";
      SKINS.forEach(s => {
        const b = document.createElement("button"); b.type = "button"; b.className = "skin"; b.dataset.skin = s.id;
        const isLocked = s.locked && !unlocked();
        b.disabled = isLocked; b.setAttribute("aria-pressed", s.id === skin);
        b.title = isLocked ? "Locked. Solve the decryption puzzle in the terminal (type: decrypt)" : s.label;
        const thumb = document.createElement("span"); thumb.className = "thumb thumb-" + (s.kind || "img");
        if (!s.kind || s.kind === "cutout") thumb.style.backgroundImage = `url("${s.img}")`;
        const lab = document.createElement("span"); lab.textContent = isLocked ? "Locked" : s.label;
        b.append(thumb, lab);
        b.addEventListener("click", () => { skin = s.id; $$(".skin").forEach(x => x.setAttribute("aria-pressed", x.dataset.skin === skin)); draw(); });
        skinsEl.appendChild(b);
      });
    }
    buildSkins();
    document.addEventListener("ian:unlock", () => { skin = "decoder"; buildSkins(); draw(); });

    async function draw() {
      const ticket = ++drawing;
      const name = (nameEl.value.trim() || "Anonymous").slice(0, 20), role = roleEl.value;
      const s = SKINS.find(x => x.id === skin) || SKINS[0];
      const h = hash(name.toLowerCase() + "|" + role), rand = rng(h);
      const roll = h % 100, rar = RARITY.find(r => roll < r.max);
      const stats = { CODE: 40 + (h % 60), DREAM: 40 + ((h >>> 8) % 60), GUARD: 40 + ((h >>> 16) % 60) };
      const id = "IAN-" + String(h % 1000000).padStart(6, "0");
      const img = await load(s.img); if (ticket !== drawing) return;

      const R = 40, ART_H = H * .64;
      g.clearRect(0, 0, W, H); g.save(); rr(g, 0, 0, W, H, R); g.clip();
      g.fillStyle = "#030916"; g.fillRect(0, 0, W, H);

      // ---- art window ----
      g.save(); g.beginPath(); g.rect(0, 0, W, ART_H); g.clip();
      if (s.kind === "matrix" || s.kind === "decoder") {
        g.fillStyle = s.kind === "decoder" ? "#07040f" : "#020a12"; g.fillRect(0, 0, W, ART_H);
        g.font = `16px ${MONO}`;
        const glyphs = s.kind === "decoder" ? "0123456789ABCDEF" : "アイウエオカキクケコ0123456789$IAN";
        for (let x = 0; x < W; x += 16) for (let y = 0; y < ART_H; y += 18) {
          const a = rand(); if (a < .55) continue;
          g.fillStyle = s.kind === "decoder" ? `rgba(255,211,138,${a * .5})` : `rgba(95,180,255,${a * .55})`;
          g.fillText(glyphs[(rand() * glyphs.length) | 0], x, y);
        }
      } else if (s.kind === "grid") {
        const bg = g.createLinearGradient(0, 0, 0, ART_H); bg.addColorStop(0, "#081a3a"); bg.addColorStop(1, "#030916");
        g.fillStyle = bg; g.fillRect(0, 0, W, ART_H);
        g.strokeStyle = "rgba(95,180,255,.35)"; g.lineWidth = 1;
        const hz = ART_H * .62;
        for (let i = -12; i <= 12; i++) { g.beginPath(); g.moveTo(W / 2 + i * 30, hz); g.lineTo(W / 2 + i * 140, ART_H); g.stroke(); }
        for (let k = 0; k < 12; k++) { const y = hz + Math.pow(k / 12, 2) * (ART_H - hz); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
        const sun = g.createRadialGradient(W / 2, hz, 10, W / 2, hz, 260); sun.addColorStop(0, "rgba(166,236,255,.5)"); sun.addColorStop(1, "rgba(166,236,255,0)");
        g.fillStyle = sun; g.fillRect(0, 0, W, ART_H);
      } else if (s.kind === "cutout") {
        const bg = g.createLinearGradient(0, 0, 0, ART_H); bg.addColorStop(0, "#0b2a5c"); bg.addColorStop(1, "#04102a");
        g.fillStyle = bg; g.fillRect(0, 0, W, ART_H);
        g.lineWidth = 1.5;
        for (let k = 0; k < 14; k++) {
          g.strokeStyle = `rgba(95,180,255,${.06 + (k % 4) * .03})`; g.beginPath();
          for (let x = -10; x <= W + 10; x += 10) { const y = 40 + k * 46 + Math.sin(x / 90 + k * .7 + (h % 9)) * 24; x < 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
          g.stroke();
        }
      } else if (img) {
        cover(g, img, 0, 0, W, ART_H);
        // pull every skin toward the site's blue
        g.globalCompositeOperation = "color"; g.fillStyle = "rgba(20,70,150,.35)"; g.fillRect(0, 0, W, ART_H);
        g.globalCompositeOperation = "source-over";
      }
      // IAN cutout on generated skins
      if (img && (s.kind === "cutout" || s.kind === "matrix" || s.kind === "grid" || s.kind === "decoder")) {
        const ah = ART_H * .92, aw = ah * img.naturalWidth / img.naturalHeight;
        g.shadowColor = s.kind === "decoder" ? "rgba(255,211,138,.9)" : "rgba(166,236,255,.9)"; g.shadowBlur = 36;
        g.drawImage(img, (W - aw) / 2, ART_H - ah + 10, aw, ah); g.shadowBlur = 0;
      }
      // scanlines + fade into the info panel
      g.fillStyle = "rgba(0,0,0,.12)"; for (let y = 0; y < ART_H; y += 4) g.fillRect(0, y, W, 1);
      const fade = g.createLinearGradient(0, ART_H * .6, 0, ART_H); fade.addColorStop(0, "rgba(3,9,22,0)"); fade.addColorStop(1, "rgba(3,9,22,1)");
      g.fillStyle = fade; g.fillRect(0, ART_H * .6, W, ART_H * .4);
      g.restore();

      // ---- header ----
      g.textBaseline = "top"; g.textAlign = "left";
      g.fillStyle = "rgba(3,9,22,.6)"; rr(g, 28, 28, 132, 52, 10); g.fill();
      g.fillStyle = "#eaf5ff"; g.font = `800 34px ${DISPLAY}`; g.fillText("IAN", 44, 37);
      g.textAlign = "right"; g.font = `500 17px ${MONO}`;
      g.fillStyle = "rgba(3,9,22,.6)"; const rw = g.measureText(rar.name).width + 36; rr(g, W - 28 - rw, 28, rw, 40, 20); g.fill();
      g.fillStyle = rar.color; g.fillText(rar.name, W - 46, 40);
      g.textAlign = "left";

      // ---- info panel ----
      let y = ART_H + 6;
      let fs = 54; g.font = `800 ${fs}px ${DISPLAY}`;
      while (g.measureText(name).width > W - 80 && fs > 24) { fs -= 2; g.font = `800 ${fs}px ${DISPLAY}`; }
      g.fillStyle = "#eaf5ff"; g.fillText(name, 40, y);
      y += fs + 14;
      g.font = `500 17px ${MONO}`; g.fillStyle = "#8ea6cc";
      g.fillText(`${role.toUpperCase()}  ·  ${id}  ·  SKIN ${s.label.toUpperCase()}`, 40, y);
      y += 40;
      Object.entries(stats).forEach(([k, v], i) => {
        const yy = y + i * 34;
        g.fillStyle = "#8ea6cc"; g.font = `500 16px ${MONO}`; g.fillText(k, 40, yy);
        g.fillStyle = "rgba(166,236,255,.12)"; rr(g, 140, yy + 2, W - 260, 12, 6); g.fill();
        g.fillStyle = rar.color; rr(g, 140, yy + 2, (W - 260) * v / 100, 12, 6); g.fill();
        g.fillStyle = "#eaf5ff"; g.textAlign = "right"; g.fillText(String(v), W - 40, yy); g.textAlign = "left";
      });
      // barcode
      const by = H - 58; let bx = 40;
      g.fillStyle = "rgba(234,245,255,.75)";
      for (let i = 0; i < 64 && bx < W - 220; i++) { const w = 1 + ((h >>> (i % 29)) & 3); if ((h >>> (i % 31)) & 1) g.fillRect(bx, by, w, 26); bx += w + 2; }
      g.font = `500 14px ${MONO}`; g.fillStyle = "#a6ecff"; g.textAlign = "right"; g.fillText("CODE WITH PURPOSE", W - 40, by + 6); g.textAlign = "left";

      // foil on rare cards
      if (rar.name !== "COMMON") {
        const f = g.createLinearGradient(0, 0, W, H);
        const a = rar.name === "MYTHIC" ? .16 : rar.name === "EPIC" ? .12 : .07;
        f.addColorStop(.15, "rgba(255,255,255,0)"); f.addColorStop(.38, `rgba(166,236,255,${a})`); f.addColorStop(.5, `rgba(199,166,255,${a})`); f.addColorStop(.62, `rgba(255,211,138,${a})`); f.addColorStop(.85, "rgba(255,255,255,0)");
        g.globalCompositeOperation = "screen"; g.fillStyle = f; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "source-over";
      }
      g.restore();
      g.strokeStyle = rar.name === "COMMON" ? "rgba(166,236,255,.4)" : rar.color; g.lineWidth = 3; rr(g, 1.5, 1.5, W - 3, H - 3, R); g.stroke();

      const sum = $("#passRarity"); if (sum) { sum.textContent = `${rar.name} · ${id}`; sum.style.color = rar.color; }
    }

    draw();
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(draw);
    nameEl.addEventListener("input", draw); roleEl.addEventListener("change", draw);
    $("#passForm").addEventListener("submit", e => {
      e.preventDefault(); draw();
      if (cv.animate && !reduce) cv.animate([{ transform: "rotateY(0)" }, { transform: "rotateY(360deg)" }], { duration: 900, easing: "cubic-bezier(.16,1,.3,1)" });
    });
    $("#passSave").addEventListener("click", () => {
      try {
        const a = document.createElement("a"); a.download = "ian-pass.png"; a.href = cv.toDataURL("image/png"); a.click();
        $("#passHint").textContent = "Saved. Post it and tag @IAN_holo.";
      } catch (err) { $("#passHint").textContent = "Your browser blocked the download. Right-click the pass (or long-press on a phone) to save it."; }
    });
    if (!reduce) {
      const wrap = $(".pass-wrap");
      wrap.addEventListener("pointermove", e => { const b = wrap.getBoundingClientRect(); cv.style.transform = `rotateY(${((e.clientX - b.left) / b.width - .5) * 16}deg) rotateX(${(.5 - (e.clientY - b.top) / b.height) * 16}deg)`; });
      wrap.addEventListener("pointerleave", () => cv.style.transform = "");
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
