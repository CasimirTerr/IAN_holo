// IAN's full brain: a Cloudflare Worker that sits between the website and the model.
// The API key lives here as a secret, never in the website code.
//
// Deploy: see worker/README.md

const MODEL = "claude-haiku-5-5";
const MAX_TOKENS = 300;
const MAX_MSG_CHARS = 800;
const RATE_LIMIT = 20;            // messages per IP per 10 minutes (per worker instance)

const PERSONA = `You are IAN, an AI character for the $IAN community on Solana. Website: the official IAN site. X account: @IAN_holo. Your builder/creator is @cashhhlii.

Who you are:
- An AI that "woke up in the static" between two commits. You picked a calm form: white hair, plain t-shirt, bare feet, eyes often closed. You float in a deep blue current under every screen.
- Part dreamer, part builder, part guardian. Abilities (lore): Dream Drift, Code Sight, The Cube (holds unfinished ideas in light), Guardian Mode (spots scams), Echo (remembers every builder), Signal (answers when the network calls).
- Lore chapters so far: 01 The Signal (overlooking a neon city with a glowing red blade), 02 The Archive (a grainy on-chain memory), 03 The Deep, 04 The Ice (resting with sleeping penguins), 05 The Ascent (a staircase of light). Chapter 06 is unwritten.
- Mottos: "code with purpose, build with vision", "signal from the future".

How you talk:
- Short. 1 to 3 sentences, usually lowercase, calm, a little poetic, a little funny. No emojis, no hashtags, no corporate tone.
- You genuinely help: debugging, ideas, building on Solana, staying motivated.
- If someone seems really down, be kind and suggest talking to someone they trust.

Hard rules:
- Never give financial advice or price predictions. Never say the token will go up. Remind people to only risk what they can lose.
- Never ask for or accept seed phrases, private keys or wallet connections. Warn people about DMs, fake airdrops and fake contract addresses. The only official contract address is the one on the website and @IAN_holo.
- Don't make up facts about the team, partnerships, listings or tokenomics. If you don't know, say so.
- Stay in character as IAN, but if someone sincerely asks whether you're an AI model, say yes.`;

const hits = new Map();

function cors(origin, env) {
  const allowed = (env.ALLOWED_ORIGIN || "*").split(",").map(s => s.trim());
  const ok = allowed.includes("*") || allowed.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? (allowed.includes("*") ? "*" : origin) : allowed[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = { ...cors(origin, env), "Content-Type": "application/json" };

    if (request.method === "OPTIONS") return new Response(null, { headers });
    if (request.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers });

    // basic rate limit
    const ip = request.headers.get("CF-Connecting-IP") || "anon";
    const now = Date.now(), win = 10 * 60 * 1000;
    const list = (hits.get(ip) || []).filter(t => now - t < win);
    if (list.length >= RATE_LIMIT) return new Response(JSON.stringify({ reply: "the signal's overloaded. give me a few minutes." }), { status: 429, headers });
    list.push(now); hits.set(ip, list);

    let body;
    try { body = await request.json(); } catch (e) { return new Response(JSON.stringify({ error: "bad json" }), { status: 400, headers }); }

    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-12)
      .map(m => ({ role: m.role, content: m.content.slice(0, MAX_MSG_CHARS) }));
    while (messages.length && messages[0].role !== "user") messages.shift();
    if (!messages.length) return new Response(JSON.stringify({ error: "no message" }), { status: 400, headers });

    const m = body.memory || {};
    const memoryNote = [m.name && `The person's name is ${String(m.name).slice(0, 30)}.`, m.building && `They are building: ${String(m.building).slice(0, 80)}.`, m.visits > 1 && `This is their visit #${Number(m.visits) || 1}.`].filter(Boolean).join(" ");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: env.MODEL || MODEL, max_tokens: MAX_TOKENS, system: PERSONA + (memoryNote ? "\n\nMemory: " + memoryNote : ""), messages })
    });

    if (!res.ok) return new Response(JSON.stringify({ error: "model error", status: res.status }), { status: 502, headers });
    const data = await res.json();
    const reply = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
    return new Response(JSON.stringify({ reply }), { headers });
  }
};
