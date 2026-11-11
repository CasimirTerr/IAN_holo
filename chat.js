/* ============================================================================
   IAN chat engine
   ----------------------------------------------------------------------------
   - Streams replies from the edge worker (server-sent events), token by token
   - Falls back to the local core in brain.js when the worker is missing or down
   - Private mode: a passcode unlocks the personal-assistant brain on the worker
   - Memory: notes live in localStorage on this device; you can read and delete them
   - Model output is rendered with DOM text nodes only (no innerHTML)
   ========================================================================== */
(function (g) {
  "use strict";

  const LS = {
    get(k, d) { try { const v = localStorage.getItem("ian2:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("ian2:" + k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem("ian2:" + k); } catch (e) {} }
  };
  const cfg = g.IAN || {};
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ------------------------------------------------------------ settings
  const settings = {
    get brain() { return String(LS.get("brain", "") || cfg.brain || "").trim().replace(/\/+$/, ""); },
    set brain(v) { LS.set("brain", String(v || "").trim()); },
    get passcode() { return LS.get("pass", ""); },
    set passcode(v) { v ? LS.set("pass", String(v)) : LS.del("pass"); },
    get name() { return LS.get("name", ""); },
    set name(v) { LS.set("name", String(v || "").trim().slice(0, 40)); },
    get voice() { return !!LS.get("voice", false); },
    set voice(v) { LS.set("voice", !!v); },
    get notes() { return LS.get("notes", []); },
    set notes(v) { LS.set("notes", v.slice(-40)); }
  };

  // ------------------------------------------------------------ chats
  const chats = {
    all() { return LS.get("chats", []); },
    save(list) { LS.set("chats", list.slice(0, 30)); },
    get(id) { return this.all().find(c => c.id === id); },
    upsert(chat) { const list = this.all().filter(c => c.id !== chat.id); list.unshift(chat); this.save(list); },
    remove(id) { this.save(this.all().filter(c => c.id !== id)); },
    clear() { LS.del("chats"); LS.del("current"); }
  };

  // ------------------------------------------------------------ safe markdown-lite
  function inline(parent, text) {
    const re = /(\*\*[^*\n]+\*\*|`[^`\n]+`|https?:\/\/[^\s<>()]+[^\s<>().,!?;:'"])/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      const tok = m[0];
      if (tok.startsWith("**")) parent.appendChild(el("strong", null, tok.slice(2, -2)));
      else if (tok.startsWith("`")) parent.appendChild(el("code", null, tok.slice(1, -1)));
      else { const a = el("a", null, tok); a.href = tok; a.target = "_blank"; a.rel = "noopener noreferrer nofollow"; parent.appendChild(a); }
      last = m.index + tok.length;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }
  function render(target, text) {
    target.textContent = "";
    const parts = text.split(/```/);
    parts.forEach((part, i) => {
      if (i % 2) {                                   // code fence
        const code = part.replace(/^[a-zA-Z0-9+#-]*\n/, "");
        const pre = el("pre"); pre.appendChild(el("code", null, code.replace(/\n$/, ""))); target.appendChild(pre);
        return;
      }
      let list = null, para = null;
      part.split("\n").forEach(line => {
        const li = line.match(/^\s*(?:[-*•]|(\d+)[.)])\s+(.*)$/);
        const hd = line.match(/^#{1,4}\s+(.*)$/);
        if (li) {
          const tag = li[1] ? "ol" : "ul";
          if (!list || list.tagName.toLowerCase() !== tag) { list = el(tag); target.appendChild(list); }
          const item = el("li"); inline(item, li[2]); list.appendChild(item); para = null;
        } else if (hd) { const h = el("p", "ic-h"); inline(h, hd[1]); target.appendChild(h); list = para = null; }
        else if (!line.trim()) { list = para = null; }
        else {
          if (!para) { para = el("p"); target.appendChild(para); list = null; } else para.appendChild(el("br"));
          inline(para, line);
        }
      });
    });
  }

  // pull [[remember: ...]] lines out of a reply (and hide a half-streamed tag)
  function splitMemory(text) {
    const facts = [];
    let out = text.replace(/\[\[\s*remember\s*:\s*([^\]\n]{2,200})\]\]/gi, (_, f) => { facts.push(f.trim()); return ""; });
    out = out.replace(/\[\[?[^\]]*$/, "").replace(/\n{3,}/g, "\n\n").trim();
    return { text: out, facts };
  }

  // ------------------------------------------------------------ voice
  const voice = {
    canSpeak: "speechSynthesis" in g,
    canListen: !!(g.SpeechRecognition || g.webkitSpeechRecognition),
    speak(text) {
      if (!this.canSpeak) return;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text.replace(/```[\s\S]*?```/g, " code block. ").replace(/[*`#]/g, "").slice(0, 900));
        const vs = speechSynthesis.getVoices();
        u.voice = vs.find(v => /Daniel|Samantha|Google UK English Male|Alex/.test(v.name)) || vs.find(v => /^en/i.test(v.lang)) || null;
        u.rate = 1.02; u.pitch = 0.95;
        speechSynthesis.speak(u);
      } catch (e) {}
    },
    stop() { try { speechSynthesis.cancel(); } catch (e) {} },
    listen(onText, onState) {
      const R = g.SpeechRecognition || g.webkitSpeechRecognition;
      if (!R) return null;
      const r = new R();
      r.lang = navigator.language || "en-US"; r.interimResults = true; r.continuous = false;
      r.onresult = e => { let s = ""; for (const res of e.results) s += res[0].transcript; onText(s, e.results[e.results.length - 1].isFinal); };
      r.onend = () => onState(false); r.onerror = () => onState(false);
      try { r.start(); onState(true); } catch (e) { onState(false); }
      return r;
    }
  };

  // ------------------------------------------------------------ network
  async function streamFromWorker(url, payload, passcode, onDelta, signal) {
    const headers = { "Content-Type": "application/json" };
    if (passcode) headers.Authorization = "Bearer " + passcode;
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload), signal });
    if (res.status === 401) { const e = new Error("passcode"); e.code = "passcode"; throw e; }
    if (res.status === 429) { const j = await res.json().catch(() => ({})); const e = new Error("rate"); e.code = "rate"; e.reply = j.reply; throw e; }
    if (!res.ok || !res.body) throw new Error("worker " + res.status);
    const reader = res.body.getReader(), dec = new TextDecoder();
    let buf = "", mode = "public", full = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const d = line.slice(5).trim();
        if (d === "[DONE]") continue;
        try { const j = JSON.parse(d); if (j.mode) mode = j.mode; if (j.t) { full += j.t; onDelta(full); } } catch (e) {}
      }
    }
    if (!full.trim()) throw new Error("empty");
    return { text: full, mode };
  }

  // ------------------------------------------------------------ controller
  function create(opts) {
    const root = opts.root;
    const log = el("div", "ic-log"); log.setAttribute("role", "log"); log.setAttribute("aria-live", "polite");
    root.appendChild(log);

    let chat = chats.get(LS.get("current", "")) || { id: uid(), title: "", t: Date.now(), msgs: [] };
    let busy = false, status = "local", abort = null;
    const listeners = { status: [], talk: [], change: [] };
    const emit = (k, v) => listeners[k].forEach(f => { try { f(v); } catch (e) {} });

    function setStatus(s) { if (s !== status) { status = s; emit("status", s); } }
    function initialStatus() { setStatus(settings.brain ? (settings.passcode ? "private" : "edge") : "local"); }

    function bubble(role, text) {
      const row = el("div", "ic-msg ic-" + role);
      const b = el("div", "ic-bubble");
      if (role === "user") b.textContent = text; else render(b, text);
      row.appendChild(b); log.appendChild(row);
      return b;
    }
    function note(text) { const n = el("div", "ic-note", text); log.appendChild(n); scroll(); }
    function scroll() { log.scrollTop = log.scrollHeight; }
    function paint() {
      log.textContent = "";
      chat.msgs.forEach(m => bubble(m.role === "user" ? "user" : "ian", m.content));
      root.classList.toggle("ic-empty", chat.msgs.length === 0);
      scroll(); emit("change", chat);
    }
    function persist() {
      if (!chat.msgs.length) return;
      if (!chat.title) chat.title = chat.msgs[0].content.slice(0, 48);
      chat.t = Date.now(); chats.upsert(chat); LS.set("current", chat.id);
    }

    function captureLocalFacts(raw) {
      const n = raw.match(/\b(?:my name is|call me|i'?m called)\s+([@\w][\w.-]{0,19})/i);
      if (n) settings.name = n[1];
    }

    async function typeOut(b, text) {            // local replies: reveal like a stream
      const words = text.split(/(\s+)/); let shown = "";
      for (const w of words) { shown += w; render(b, shown); scroll(); emit("talk", .5); await new Promise(r => setTimeout(r, 18 + Math.random() * 26)); }
    }

    async function send(raw) {
      const text = String(raw || "").trim();
      if (!text || busy) return;
      busy = true; root.classList.add("ic-busy"); root.classList.remove("ic-empty");
      voice.stop();
      chat.msgs.push({ role: "user", content: text });
      bubble("user", text); captureLocalFacts(text);
      const b = bubble("ian", ""); b.classList.add("ic-thinking");
      b.append(el("i"), el("i"), el("i")); scroll(); emit("change", chat);

      let answer = "", facts = [];
      const url = settings.brain;
      const attempt = async passcode => {
        abort = new AbortController();
        const timer = setTimeout(() => abort.abort(), 45000);
        let first = true;
        try {
          const owner = !!passcode;
          const out = await streamFromWorker(url, {
            stream: true,
            messages: chat.msgs.slice(owner ? -30 : -12),
            memory: { name: settings.name, notes: owner ? settings.notes : [] },
            now: owner ? new Date().toString().slice(0, 33) : undefined
          }, passcode, full => {
            if (first) { b.classList.remove("ic-thinking"); first = false; }
            render(b, splitMemory(full).text); scroll(); emit("talk", .8);
          }, abort.signal);
          setStatus(out.mode === "owner" ? "private" : "edge");
          return out.text;
        } finally { clearTimeout(timer); }
      };

      try {
        if (!url) throw new Error("no worker");
        let full;
        try { full = await attempt(settings.passcode); }
        catch (e) {
          if (e.code !== "passcode") throw e;
          settings.passcode = ""; note("That passcode didn't match, so private mode is off. Re-enter it in Settings.");
          full = await attempt("");
        }
        const sp = splitMemory(full); answer = sp.text; facts = sp.facts;
      } catch (e) {
        b.classList.remove("ic-thinking"); b.textContent = "";
        if (e.code === "rate") answer = e.reply || "rate limit hit. give it a few minutes.";
        else {
          answer = g.IANBrain ? g.IANBrain.local(text) : "i can't reach my brain right now. check the connection and try again.";
          if (url) note("Edge brain unreachable. Answered by the local core.");
          setStatus("local");
        }
        await typeOut(b, answer);
      }

      b.classList.remove("ic-thinking"); render(b, answer || "…");
      if (facts.length && settings.passcode) {
        const have = settings.notes, lower = have.map(x => x.toLowerCase());
        const fresh = facts.filter(f => !lower.includes(f.toLowerCase()));
        if (fresh.length) { settings.notes = have.concat(fresh); note("Saved to memory: " + fresh.join(" · ")); }
      }
      chat.msgs.push({ role: "assistant", content: answer });
      persist(); scroll();
      if (settings.voice) voice.speak(answer);
      busy = false; root.classList.remove("ic-busy"); emit("change", chat);
    }

    const api = {
      send,
      stop() { if (abort) abort.abort(); voice.stop(); },
      newChat() { api.stop(); chat = { id: uid(), title: "", t: Date.now(), msgs: [] }; LS.del("current"); paint(); },
      open(id) { const c = chats.get(id); if (c) { api.stop(); chat = c; LS.set("current", id); paint(); } },
      on(k, f) { listeners[k].push(f); if (k === "status") f(status); return api; },
      refresh: initialStatus,
      get busy() { return busy; },
      get chat() { return chat; }
    };
    initialStatus(); paint();
    return api;
  }

  g.IANChat = { create, settings, chats, voice, render };
})(window);
