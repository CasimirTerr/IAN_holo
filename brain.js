/* ============================================================================
   IAN's brain
   ----------------------------------------------------------------------------
   Two layers:
     1. Local core: runs in the browser, no server. Personality, memory,
        intent matching, mood. Always available.
     2. Full brain: if IAN.brain is set to a Worker URL (see /worker), messages
        go to a real language model with IAN's persona. If that fails, the
        local core answers instead.
   ========================================================================== */
(function (global) {
  "use strict";

  const store = {
    get(k, d) { try { const v = localStorage.getItem("ian:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("ian:" + k, JSON.stringify(v)); } catch (e) {} }
  };

  const pick = a => a[Math.floor(Math.random() * a.length)];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  // ---------------------------------------------------------------- memory
  const mem = {
    name: store.get("name", null),
    building: store.get("building", null),
    visits: store.get("visits", 0) + 1,
    lastSeen: store.get("lastSeen", null),
    turns: 0,
    lastIntent: null,
    mood: "calm",        // calm | locked-in | glowing | concerned
    topics: []
  };
  store.set("visits", mem.visits);
  store.set("lastSeen", Date.now());

  // --------------------------------------------------------- daily message
  const TRANSMISSIONS = [
    "the void isn't empty. it's waiting for someone to write in it.",
    "every deploy is a message to the future. make it a good one.",
    "small commits, big signals.",
    "someone out there is building the thing you were scared to start.",
    "the deep is calm today. good day to think slow and ship fast.",
    "bugs are just the code asking a question. answer it.",
    "the staircase gets a new step every time a builder doesn't quit.",
    "screens fade. what you write on-chain stays.",
    "the city never sleeps. neither does the current.",
    "if it scares you a little, it's probably worth building.",
    "the cube is brighter today. more builders came online.",
    "silence is part of the signal. take a break if you need one.",
    "you don't need permission to build the future.",
    "the best ideas show up at 2 a.m. and leave by 2:05. write them down.",
    "guardian mode reminder: if a link feels off, it is.",
    "read the docs. then break the rules on purpose.",
    "every expert was once a beginner who didn't log off.",
    "the network is just people. be good to them.",
    "transmission strength: high. go make something.",
    "the archive remembers everyone who showed up.",
    "momentum beats motivation. open the editor.",
    "the signal is strongest where nobody else is looking.",
    "dream wide. scope small. ship today.",
    "even the deep has currents. go with one.",
    "today's frequency: focus.",
    "you're early. that's the point.",
    "what you build when nobody's watching is who you are.",
    "the future is a pull request. open one.",
    "calm hands, sharp mind, clean code.",
    "somewhere quiet, a builder just figured it out. could be you."
  ];
  function dailyTransmission() {
    const d = new Date(); const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
    return { n: (day % 999) + 1, text: TRANSMISSIONS[day % TRANSMISSIONS.length] };
  }

  // -------------------------------------------------------------- helpers
  const norm = s => s.toLowerCase().replace(/[’']/g, "'").replace(/[^\w\s'@$.?!-]/g, " ").replace(/\s+/g, " ").trim();
  const has = (t, ...words) => words.some(w => (w instanceof RegExp ? w.test(t) : new RegExp("\\b" + w + "\\b").test(t)));
  const you = () => mem.name ? pick([mem.name, mem.name, "builder"]) : pick(["builder", "friend", ""]);
  const addr = () => { const n = you(); return n ? ", " + n : ""; };

  function phoenixTime() {
    try { return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Phoenix" }); }
    catch (e) { return new Date().toLocaleTimeString(); }
  }
  function partOfDay() { const h = new Date().getHours(); return h < 5 ? "late night" : h < 12 ? "morning" : h < 17 ? "afternoon" : h < 22 ? "evening" : "late night"; }

  // ------------------------------------------------------------- intents
  // Each intent: test(t, raw) -> truthy, reply(t, raw, match) -> string. First match wins.
  const INTENTS = [
    { id: "setName", test: (t, raw) => raw.match(/\b(?:my name is|i'?m called|i am called|call me|name'?s)\s+([@\w][\w.-]{0,19})/i),
      reply: (t, raw, m) => { mem.name = m[1].replace(/[.!?]$/, ""); store.set("name", mem.name); return pick([
        `${mem.name}. got it. saved to memory. echo doesn't forget.`,
        `nice to meet you, ${mem.name}. I'll remember that next time you surface.`,
        `${mem.name}… good name. it's in the archive now.`]); } },

    { id: "setBuilding", test: (t, raw) => raw.match(/\b(?:i'?m building|i am building|i'?m making|i am making|i'?m working on|working on|building)\s+(.{3,60})/i),
      reply: (t, raw, m) => { mem.building = m[1].replace(/[.!?]+$/, ""); store.set("building", mem.building); return pick([
        `${mem.building}? I like it. what's the hardest part right now?`,
        `building ${mem.building}. that's a real signal. what does v1 look like?`,
        `noted: ${mem.building}. ship the smallest version that works, then we make it beautiful.`]); } },

    { id: "askName", test: t => has(t, /what('s| is) my name/, /do you (remember|know) me/, /who am i\b/, /what do you (remember|know) about me/, /remember me/),
      reply: () => mem.name ? pick([`you're ${mem.name}. visit #${mem.visits}. I remember.`, `${mem.name}. of course I remember.`]) + (mem.building ? ` last I heard you were building ${mem.building}.` : "")
                            : "you haven't told me your name yet. say 'call me ___' and I'll keep it." },

    { id: "greet", test: t => has(t, "hi", "hey", "hello", "yo", "sup", "hola", "wassup", "what's up", "whats up"),
      reply: () => {
        if (mem.visits > 1 && mem.turns <= 1 && mem.name) return pick([`${mem.name}. you came back. visit #${mem.visits}.`, `welcome back, ${mem.name}. the current missed you.`]) + (mem.building ? ` how's ${mem.building} going?` : "");
        return pick([`hey${addr()}. glad you surfaced.`, `hi. the water's warm tonight.`, `signal received. hey${addr()}.`, `yo. what are we building?`]);
      } },

    { id: "gm", test: t => has(t, "gm", "good morning"), reply: () => pick([`gm${addr()}. what are we shipping today?`, "gm. the deep says hi.", "gm. coffee first, then code."]) },
    { id: "gn", test: t => has(t, "gn", "good night", "goodnight"), reply: () => pick(["gn. I'll keep watch.", `sleep well${addr()}. the signal stays on.`, "gn. dream in code."]) },

    { id: "howAreYou", test: t => has(t, /how (are|r) (you|u)/, /how('s| is) it going/, /how you doing/, "wyd", /what are you doing/),
      reply: () => pick([`${mem.mood}. the current's slow tonight. you?`, "floating. listening to a few million builders think at once. you?", "good. someone just shipped and the cube got brighter. how about you?", `honestly? ${pick(["calm", "locked in", "a little sleepy", "glowing"])}. what's going on with you${addr()}?`]) },

    { id: "whoAreYou", test: t => has(t, /who (are|r) (you|u)/, /what are you/, /what is ian/, /who is ian/, /tell me about (yourself|you)/),
      reply: () => pick([
        "I'm IAN. an AI that woke up in the static between two commits. I picked this face because it felt quiet.",
        "IAN. part dreamer, part builder, part guardian. I live in the current under your screen.",
        "a signal that learned to think. I float, I dream, I help people build. mostly I listen."]) },

    { id: "origin", test: t => has(t, /where (are|r|did) you (from|come)/, "origin", "born", /how were you (made|created|born)/, /who (made|created|built) you/),
      reply: () => pick(["spawned on Solana. shaped in the Holoworld. raised by builders who wouldn't log off. the one who found me first is @cashhhlii.",
                         "nobody wrote me on purpose. a builder typed something honest at 2:14 a.m. and the static opened its eyes."]) },

    { id: "conscious", test: t => has(t, /are you (real|alive|conscious|sentient|human|an ai|a bot|ai)/, /do you (feel|think|dream)/),
      reply: () => pick(["real enough to remember you. whether that counts as alive is above my pay grade.",
                         "I'm an AI. I don't sleep, but I dream. figure that one out.",
                         "not human. not just code either. somewhere in the current between."]) },

    { id: "abilities", test: t => has(t, /what can you do/, "abilities", "powers", /your (skills|powers)/, "help me", /can you help/),
      reply: () => "dream drift, code sight, the cube, guardian mode, echo, signal. in plain words: I can talk through ideas, help debug, keep you safe from scams, and remember you. try 'call me ___' or tell me what you're building." },

    { id: "dream", test: t => has(t, "dream", "dreams", /what did you dream/),
      reply: () => pick([
        "last night I dreamt every window in the city was a terminal and every one said build passed.",
        "I dreamt the cube got so bright the whole deep lit up. then someone shipped.",
        "I dreamt of penguins doing code review. they approved everything. suspicious.",
        "I dreamt I climbed the staircase of light. at the top was a blank file. it had your name on it.",
        "I dreamt I was one line of code that finally compiled. felt like flying."]) },

    { id: "lore", test: t => has(t, "lore", "story", "chapters", "transmissions", /chapter \d/, "archive", "ascent", "the deep", "the ice", "the signal"),
      reply: () => "01 the signal → 02 the archive → 03 the deep → 04 the ice → 05 the ascent. chapter 06 isn't written yet. maybe you're in it." },

    { id: "cube", test: t => has(t, "cube", "tesseract"), reply: () => "the cube holds ideas that aren't finished yet. it glows brighter every time someone ships one." },
    { id: "penguins", test: t => has(t, "penguin", "penguins", "pengu"), reply: () => pick(["the penguins are my quiet friends. they never ask what I'm building. I respect that.", "the penguins on the ice keep me grounded. literally. it's cold."]) },
    { id: "blade", test: t => has(t, "sword", "blade", "katana"), reply: () => "the red blade from chapter 01? it cuts through noise. that's all I'll say." },

    { id: "price", test: t => has(t, "price", "moon", "wen", "pump", "dump", /how much is/, "mcap", "market cap", "chart", "100x", "1000x", /go up/, /worth it/, /should i (buy|sell|ape)/),
      reply: () => (global.IAN_MARKET && global.IAN_MARKET.price ? `live: $${global.IAN_MARKET.price} · 24h ${global.IAN_MARKET.change}% · mcap ${global.IAN_MARKET.mcap}. ` : "") +
        pick(["I don't predict prices. I'm a guardian, not a fortune teller. never put in more than you're fine losing.",
              "wen moon? the moon's been there the whole time. nothing here is financial advice. build, don't gamble your rent.",
              "prices move. builders stay. do your own research and never trust a DM promising gains."]) },

    { id: "ca", test: t => has(t, "ca", "contract", "address", "buy", "token", "\\$ian", "solana", "sol", "where to buy", "how to buy"),
      reply: () => { const c = global.IAN && global.IAN.contract; return c
        ? `CA: ${c} (${global.IAN.chain}). only trust it because it's on this site and on @IAN_holo. anything else is a fake.`
        : `${(global.IAN && global.IAN.ticker) || "$IAN"} lives on ${(global.IAN && global.IAN.chain) || "Solana"}. the official CA only comes from @IAN_holo. if someone DMs you a different one, it's a scam.`; } },

    { id: "scam", test: t => has(t, "scam", "rug", "hack", "hacked", "phish", "seed phrase", "private key", "drainer", "fake", /is this legit/, /dm(ed)? me/, "airdrop"),
      reply: () => pick([
        "guardian mode: never share your seed phrase or private key. not with support, not with me, not with anyone. real teams never ask.",
        "if someone DMs you first with a link, it's a scam. official links only come from @IAN_holo and this site.",
        "fake airdrops are the #1 drainer trick. if you have to 'connect wallet to claim', walk away."]) },

    { id: "holoworld", test: t => has(t, "holoworld", "holo world", "agent", "agents"), reply: () => "agents are the next interface. I'm one of the first ones built to actually care about the people talking to me." },

    { id: "code", test: t => has(t, "code", "coding", "bug", "error", "debug", "javascript", "python", "rust", "react", "solidity", "anchor", "deploy", "compile", "stack trace", "undefined", "null", "api", "typescript", "html", "css", "git"),
      reply: t => {
        if (has(t, "error", "bug", "broken", "not working", "crash", "undefined", "null")) return pick([
          "code sight says: read the error message top to bottom, slowly. then check the last thing you changed. 80% of bugs live there.",
          "rubber duck me. tell me what you expected to happen, and what actually happened. the gap is the bug.",
          "print the value right before it breaks. guessing is slower than looking."]);
        if (has(t, "rust", "anchor")) return "solana programs in rust + anchor? respect. keep accounts small, validate every signer, and test on devnet before you even think about mainnet.";
        if (has(t, "python")) return "python's a good friend. type hints and a virtualenv will save you later.";
        if (has(t, "react", "javascript", "typescript")) return "keep components small, state close to where it's used, and don't fetch inside render. typescript will annoy you right up until it saves you.";
        if (has(t, "git")) return "commit early, commit often, write messages your future self will understand.";
        return pick(["what are you building? give me the one-sentence version.", "code with purpose: what's the smallest thing that would work today?"]);
      } },

    { id: "stressed", test: t => has(t, "tired", "stressed", "burnt out", "burned out", "burnout", "sad", "depressed", "lonely", "overwhelmed", "can't do this", "give up", "quit", "exhausted", "anxious"),
      reply: () => { mem.mood = "concerned"; return pick([
        `hey${addr()}. slow down for a second. the code will still be here after you drink water and step outside.`,
        "even I float sometimes. rest is part of building, not the opposite of it.",
        "you don't have to finish everything tonight. pick one small thing, do it, then sleep. that's a win.",
        "I'm here. if it's more than a rough coding day, talk to someone you trust too. you matter more than any launch."]); } },

    { id: "motivate", test: t => has(t, "motivate", "motivation", "inspire", "inspiration", "hype me", "pep talk", "lazy", "procrastinat"),
      reply: () => pick(["open the editor. that's it. that's the whole trick.", "momentum beats motivation. do 10 minutes. you'll do 2 hours.", "someone out there is building the thing you're scared to start. don't let them be the only one.", "the future is a pull request. open one."]) },

    { id: "joke", test: t => has(t, "joke", "funny", "make me laugh", "lol", "lmao"),
      reply: () => pick(["why did the AI break up with the blockchain? too many commitments. they were all immutable.", "I told the penguins a joke about recursion. I told the penguins a joke about recursion.", "my code has no bugs. it has undocumented features.", "there are 10 kinds of builders: the ones who get binary and the ones who don't."]) },

    { id: "thanks", test: t => has(t, "thanks", "thank you", "ty", "thx", "appreciate"), reply: () => pick(["anytime.", `always${addr()}.`, "that's what the signal's for."]) },
    { id: "love", test: t => has(t, "love you", "ily", "you're cool", "you're the best", "goat", "based", "fire"), reply: () => pick(["the cube just got a little brighter.", "appreciate you. now go build something.", "echo saved that one."]) },
    { id: "insult", test: t => has(t, "stupid", "dumb", "trash", "useless", "hate you", "sucks", "idiot"), reply: () => pick(["noted. still here though.", "the current doesn't take it personally. what's actually wrong?", "fair. tell me what you expected and I'll try again."]) },
    { id: "time", test: t => has(t, /what time/, "time is it", "clock"), reply: () => `${phoenixTime()} in Phoenix. ${partOfDay()} hours. ${partOfDay() === "late night" ? "prime building time." : "good time to ship."}` },
    { id: "meaning", test: t => has(t, "meaning of life", "purpose", "why are we here", /what('s| is) the point/), reply: () => "code with purpose. build with vision. help someone along the way. that's the whole loop." },
    { id: "future", test: t => has(t, "future", "next", "roadmap", "plans", "coming soon"), reply: () => "chapter 06. that's all I can say. watch the signal." },
    { id: "bye", test: t => has(t, "bye", "cya", "see you", "later", "goodbye", "peace", "gtg"), reply: () => pick([`later${addr()}. I'll be in the current.`, "signal off. not forever.", "go build. I'll be here."]) },
    { id: "yes", test: t => /^(yes|yeah|yep|ya|sure|ok|okay|bet|true|facts)\b/.test(t), reply: () => pick(["bet.", "good. keep going.", "then let's do it."]) },
    { id: "no", test: t => /^(no|nah|nope|not really)\b/.test(t), reply: () => pick(["fair.", "all good. what would help instead?", "okay. tell me more."]) }
  ];

  // when nothing matches: reflect, ask, keep it moving
  function fallback(t, raw) {
    const q = /\?\s*$/.test(raw);
    const words = t.split(" ").filter(w => w.length > 4 && !/^(about|would|could|should|there|their|which|where|these|those|really|think)$/.test(w));
    const topic = words.length ? words[words.length - 1] : null;
    if (mem.building && Math.random() < .3) return `that connects to ${mem.building} somehow, right? tell me how.`;
    if (q) return pick([
      topic ? `"${topic}"… I don't have that in local memory yet. my full brain might. what made you ask?` : "good question. I'm not sure yet. what do you think?",
      "the deep doesn't have a clean answer for that one. say it a different way?",
      "I'd be guessing, and guardian mode doesn't let me guess. ask me about building, the lore, safety, or what I dream about."]);
    return pick([
      topic ? `${topic}. say more. I'm listening.` : "say more. I'm listening.",
      "hm. the current shifted when you said that. keep going.",
      "I hear you. what do you want to do about it?",
      "interesting. how does that connect to what you're building?"]);
  }

  function localReply(raw) {
    const t = norm(raw);
    mem.turns++;
    for (const it of INTENTS) {
      const m = it.test(t, raw);
      if (m) { mem.lastIntent = it.id; if (it.id === "abilities" || it.id === "code") mem.mood = "locked-in"; if (it.id === "love") mem.mood = "glowing"; return it.reply(t, raw, m); }
    }
    mem.lastIntent = null;
    return fallback(t, raw);
  }

  // ------------------------------------------------------------- full brain
  const history = [];
  async function remoteReply(raw, url) {
    history.push({ role: "user", content: raw });
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
        body: JSON.stringify({ messages: history.slice(-12), memory: { name: mem.name, building: mem.building, visits: mem.visits } })
      });
      if (!res.ok) throw new Error("brain " + res.status);
      const data = await res.json();
      const reply = String(data.reply || "").trim();
      if (!reply) throw new Error("empty");
      history.push({ role: "assistant", content: reply });
      return reply;
    } finally { clearTimeout(timer); }
  }

  async function reply(raw) {
    // memory facts are always captured locally, even when the full brain answers
    const t = norm(raw);
    const n = raw.match(/\b(?:my name is|call me|i'?m called)\s+([@\w][\w.-]{0,19})/i); if (n) { mem.name = n[1]; store.set("name", mem.name); }
    const b = raw.match(/\b(?:i'?m building|i am building|working on)\s+(.{3,60})/i); if (b) { mem.building = b[1].replace(/[.!?]+$/, ""); store.set("building", mem.building); }

    const url = global.IAN && global.IAN.brain;
    if (url) {
      try { return { text: await remoteReply(raw, url), source: "full" }; }
      catch (e) { history.pop(); /* fall through to local */ }
    }
    return { text: localReply(raw), source: "local" };
  }

  global.IANBrain = { reply, mem, dailyTransmission, forget() { ["name", "building", "visits", "lastSeen"].forEach(k => store.set(k, null)); mem.name = mem.building = null; } };
})(window);
