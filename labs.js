/* ============================================================================
   IAN labs: the nerd layer.
   Visual modes (CRT, matrix, glitch, wireframe, HUD, overdrive), the Konami
   code, and the terminal's unix-ish commands.
   ========================================================================== */
(function (global) {
  "use strict";
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem("ian:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("ian:" + k, JSON.stringify(v)); } catch (e) {} }
  };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const bootTime = Date.now();

  // ------------------------------------------------------------ toasts
  function toast(msg) {
    const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add("go"), 2200); setTimeout(() => t.remove(), 2800);
  }

  // ------------------------------------------------------------- modes
  const modes = { crt: false, matrix: false, glitch: false, wire: false, hud: false, overdrive: false };

  function setMode(name, on) {
    if (on === undefined) on = !modes[name];
    modes[name] = on;
    document.documentElement.classList.toggle("mode-" + name, on);
    if (name === "matrix") on ? matrix.start() : matrix.stop();
    if (name === "glitch" && global.IANStage) global.IANStage.glitch(on ? 1 : 0);
    if (name === "wire" && global.IANStage) global.IANStage.wire(on);
    if (name === "hud") on ? hud.start() : hud.stop();
    if (name === "overdrive") {
      ["matrix", "glitch", "crt"].forEach(m => setMode(m, on));
      if (global.IANStage) global.IANStage.overdrive(on);
    }
    return on;
  }

  // ------------------------------------------------------------ matrix
  const matrix = (() => {
    let cv, g, cols, drops, raf, last = 0;
    const glyphs = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF$IAN".split("");
    function size() { cv.width = innerWidth; cv.height = innerHeight; cols = Math.ceil(innerWidth / 16); drops = Array.from({ length: cols }, () => Math.random() * -50); }
    function tick(t) {
      raf = requestAnimationFrame(tick);
      if (t - last < 50) return; last = t;
      g.fillStyle = "rgba(3,9,22,.18)"; g.fillRect(0, 0, cv.width, cv.height);
      g.font = "15px 'JetBrains Mono', monospace";
      for (let i = 0; i < cols; i++) {
        const ch = glyphs[(Math.random() * glyphs.length) | 0], y = drops[i] * 16;
        g.fillStyle = Math.random() < .04 ? "#eaf5ff" : "#5fb4ff";
        g.fillText(ch, i * 16, y);
        if (y > cv.height && Math.random() > .975) drops[i] = 0; else drops[i]++;
      }
    }
    return {
      start() { cv = $("#matrix"); g = cv.getContext("2d"); size(); addEventListener("resize", size); cv.hidden = false; if (!reduce) raf = requestAnimationFrame(tick); },
      stop() { if (!cv) return; cancelAnimationFrame(raf); cv.hidden = true; removeEventListener("resize", size); }
    };
  })();

  // --------------------------------------------------------------- hud
  const hud = (() => {
    let timer, frames = 0, t0 = performance.now(), fps = 0, rafId;
    const count = () => { frames++; rafId = requestAnimationFrame(count); };
    function render() {
      const now = performance.now(); fps = Math.round(frames * 1000 / (now - t0)); frames = 0; t0 = now;
      const s = global.IANStage ? global.IANStage.info() : {};
      const depth = Math.round(scrollY / 8);
      $("#hud").textContent =
        `IAN//HUD  v2.1\n` +
        `fps ........ ${String(fps).padStart(3)}\n` +
        `res ........ ${s.pr ? s.pr.toFixed(2) + "x" : "n/a"}\n` +
        `gpu ........ ${(s.gpu || "unknown").slice(0, 26)}\n` +
        `ian.pos .... ${s.pos || "-"}\n` +
        `ian.scale .. ${s.scale || "-"}\n` +
        `talk ....... ${s.talk || "0.00"}\n` +
        `depth ...... ${String(depth).padStart(4, "0")} m\n` +
        `uptime ..... ${Math.round((Date.now() - bootTime) / 1000)}s\n` +
        `memory ..... ${global.IANBrain && global.IANBrain.mem.name ? global.IANBrain.mem.name : "anon"}\n` +
        `modes ...... ${Object.keys(modes).filter(k => modes[k] && k !== "hud").join(" ") || "none"}`;
    }
    return {
      start() { $("#hud").hidden = false; count(); render(); timer = setInterval(render, 500); },
      stop() { $("#hud").hidden = true; clearInterval(timer); cancelAnimationFrame(rafId); }
    };
  })();

  // ------------------------------------------------------------ konami
  (function konami() {
    const seq = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let i = 0;
    addEventListener("keydown", e => {
      i = (e.key === seq[i] || e.key.toLowerCase() === seq[i]) ? i + 1 : (e.key === seq[0] ? 1 : 0);
      if (i === seq.length) { i = 0; const on = setMode("overdrive"); toast(on ? "OVERDRIVE ENGAGED // ↑↑↓↓←→←→BA" : "overdrive off"); }
    });
  })();

  // ------------------------------------------------------ the puzzle
  const PUZZLE = [
    { prompt: "stage 1/3 · intercepted packet (hex):\n63 75 62 65",
      hint: "two hex digits per letter. try a hex-to-ascii table.", answer: "cube" },
    { prompt: "stage 2/3 · intercepted packet (base64):\nZGVlcA==",
      hint: "base64. this terminal has a command for that: unb64 <text>", answer: "deep" },
    { prompt: "stage 3/3 · intercepted packet (caesar, shift unknown):\nvljqdo",
      hint: "every letter moved the same distance. the answer is the thing IAN is.", answer: "signal" }
  ];
  const puzzle = {
    get stage() { return store.get("puzzle", 0); },
    set stage(v) { store.set("puzzle", v); },
    solved() { return this.stage >= PUZZLE.length; }
  };

  // --------------------------------------------------------------- fs
  const FS = {
    "README.md": "IAN // signal from the future\nan AI that woke up in the static.\nrun `help` to see what works here.",
    "lore/01-signal.txt": "he stood over a city that never sleeps, blade glowing red, waiting.\nnobody knows who for.",
    "lore/02-archive.txt": "a corrupted file deep in the chain. grainy, half-lost, still there.\nscreens die. the chain remembers.",
    "lore/03-deep.txt": "under every network there's a current.\nIAN lives there between transmissions, listening.",
    "lore/04-ice.txt": "even signals need silence.\nsomewhere cold and still, with friends who don't ask questions.",
    "lore/05-ascent.txt": "a staircase made of light. every builder adds a step.\nchapter 06 starts at the top.",
    "abilities.txt": "dream_drift  code_sight  the_cube  guardian_mode  echo  signal",
    "guardian.txt": "we never DM first.\nno one needs your seed phrase.\nthere is no surprise airdrop.\ncheck the contract twice.\ncheck the exact handle: @IAN_holo",
    ".secret": "three packets were intercepted on the way up from the deep.\nrun `decrypt` to start. solve all three for something the pass doesn't show anyone else."
  };

  const ASCII = [
    "      .-''''-.     ",
    "     /  .--.  \\    ",
    "    |  ( -- ) |    ",
    "     \\  '--'  /    ",
    "      '-.__.-'     ",
    "      /|    |\\     ",
    "     / |    | \\    ",
    "       |    |      ",
    "       / /\\ \\      ",
    "     ~~~~~~~~~~    "
  ];

  async function sha256(text) {
    if (!global.crypto || !crypto.subtle) return null;
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }
  const b64 = t => { try { return btoa(unescape(encodeURIComponent(t))); } catch (e) { return null; } };
  const unb64 = t => { try { return decodeURIComponent(escape(atob(t.trim()))); } catch (e) { return null; } };

  const history = [];

  // returns true if the command was handled here (the brain never sees it)
  async function run(raw, print) {
    const parts = raw.trim().split(/\s+/), cmd = parts[0].toLowerCase().replace(/^\//, ""), arg = raw.trim().slice(parts[0].length).trim();
    history.push(raw.trim());
    const p = (t, c) => print(t, c || "sys");
    const toggle = name => { const on = setMode(name); p(`${name}: ${on ? "on" : "off"}`); return true; };

    switch (cmd) {
      case "help": case "man":
        p("talk to IAN normally, or run a command:\n" +
          "  ls [-a]          list files        cat <file>     read a file\n" +
          "  neofetch         system info       history        your commands\n" +
          "  hash <text>      sha-256           b64 / unb64    base64\n" +
          "  decrypt          start the puzzle  answer <word>  submit\n" +
          "  crt · matrix · glitch · wire · hud · overdrive   toggle modes\n" +
          "  date · uptime · ping · whoami · clear · forget\n" +
          "tip: press ` (backtick) anywhere for the debug HUD.");
        return true;
      case "ls": {
        const all = parts[1] === "-a" || parts[1] === "-la";
        p(Object.keys(FS).filter(f => all || !f.startsWith(".")).join("\n")); return true;
      }
      case "cat": {
        if (!arg) { p("usage: cat <file>  (try: ls)"); return true; }
        const f = FS[arg] || FS[arg.replace(/^\.?\//, "")];
        p(f || `cat: ${arg}: no such file`); return true;
      }
      case "neofetch": {
        const s = global.IANStage ? global.IANStage.info() : {};
        const info = [
          "ian@deep", "--------",
          "OS: IAN v2.1 (Solana)",
          "Host: the deep current",
          "Kernel: dream-drift 0.6.06",
          "Uptime: " + Math.round((Date.now() - bootTime) / 1000) + "s",
          "Shell: ian-sh",
          "GPU: " + (s.gpu || "unknown").slice(0, 28),
          "Memory: " + (global.IANBrain && global.IANBrain.mem.name ? global.IANBrain.mem.name : "anon") + " · visit #" + (global.IANBrain ? global.IANBrain.mem.visits : 1),
          "Puzzle: " + Math.min(puzzle.stage, 3) + "/3",
          "Mood: calm"
        ];
        p(ASCII.map((l, i) => l + "  " + (info[i] || "")).join("\n"), "ascii"); return true;
      }
      case "history": p(history.slice(-15).map((h, i) => String(i + 1).padStart(3) + "  " + h).join("\n")); return true;
      case "hash": {
        if (!arg) { p("usage: hash <text>"); return true; }
        const h = await sha256(arg); p(h ? "sha256: " + h : "hashing isn't available in this browser."); return true;
      }
      case "b64": p(arg ? (b64(arg) || "couldn't encode that.") : "usage: b64 <text>"); return true;
      case "unb64": p(arg ? (unb64(arg) ?? "that isn't valid base64.") : "usage: unb64 <text>"); return true;
      case "decrypt": {
        if (puzzle.solved()) { p("all packets decrypted. the decoder skin is unlocked on your pass."); return true; }
        const st = PUZZLE[puzzle.stage]; p(st.prompt + "\nsubmit with: answer <word> · stuck? run: hint"); return true;
      }
      case "hint": { if (puzzle.solved()) { p("nothing left to decrypt."); return true; } p("hint: " + PUZZLE[puzzle.stage].hint); return true; }
      case "answer": {
        if (puzzle.solved()) { p("already solved. respect."); return true; }
        const st = PUZZLE[puzzle.stage];
        if (arg.toLowerCase() === st.answer) {
          puzzle.stage = puzzle.stage + 1;
          if (global.ianTalk) global.ianTalk(1);
          if (puzzle.solved()) {
            p("packet 3/3 decrypted.\n> CUBE · DEEP · SIGNAL\nthe decoder skin is now unlocked on your pass. not everyone gets this one.", "win");
            document.dispatchEvent(new CustomEvent("ian:unlock", { detail: "decoder" }));
            toast("DECODER SKIN UNLOCKED");
          } else { p(`correct. packet ${puzzle.stage}/3 decrypted.\n\n` + PUZZLE[puzzle.stage].prompt, "win"); }
        } else p("wrong key. the packet stays locked. (run: hint)");
        return true;
      }
      case "crt": case "matrix": case "glitch": case "wire": case "hud": case "overdrive": return toggle(cmd);
      case "date": p(new Date().toString()); return true;
      case "uptime": p("up " + Math.round((Date.now() - bootTime) / 1000) + "s · 1 user · load average: 0.06, 0.06, 0.06"); return true;
      case "ping": {
        const t = performance.now(); await new Promise(r => setTimeout(r, 20 + Math.random() * 40));
        p(`PING deep.ian (10.0.6.6): 56 bytes\n64 bytes from deep.ian: icmp_seq=0 ttl=64 time=${(performance.now() - t).toFixed(1)} ms\nthe current answered.`); return true;
      }
      case "sudo": p("[sudo] password for guest: \nnice try. guardian mode says no. this incident will be reported to the penguins."); return true;
      case "rm": p("rm: refusing to delete the archive. the chain remembers."); return true;
      case "exit": case "logout": p("there is no exit. only the current."); return true;
      case "vim": case "nano": case "emacs": p("you've been in there before. some never came back. try `cat`."); return true;
    }
    return false;
  }

  // ` toggles the debug HUD
  addEventListener("keydown", e => {
    const typing = /input|textarea|select/i.test((document.activeElement || {}).tagName || "");
    if (e.key === "`" && !typing) { e.preventDefault(); toast("hud " + (setMode("hud") ? "on" : "off")); }
  });

  global.IANLabs = { run, setMode, modes, toast, puzzle };
})(window);
