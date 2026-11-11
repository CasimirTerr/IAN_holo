# IAN

A personal AI that runs at the edge. Site, installable chat app and Cloudflare Worker brain for
**$IAN** on Solana. Follow along at [@IAN_holo](https://x.com/IAN_holo).

**Live:** https://casimirterr.github.io/IAN_holo/ · **App:** https://casimirterr.github.io/IAN_holo/app/

## What's here

| Path | What it is |
| --- | --- |
| `index.html` | The site. IAN assembles from ~16k WebGL particles on load, tracks the pointer, and shows live vitals (frame time, edge latency, pulse). Scrolling turns him into an edge-network globe, then a glass window grows to full screen and traces one message through the system |
| `app/` | The chat app. Streaming replies, private mode, on-device memory, voice, installable on iPhone |
| `worker/` | Cloudflare Worker that rate limits, checks the passcode and streams from Workers AI or Gemini (free), or Claude or ChatGPT (paid) |
| `chat.js` | Chat engine: SSE streaming, local fallback, memory, safe rendering |
| `brain.js` | Local core: intent matching that answers with no network |
| `fx.js` / `bg.js` | Particle stage and the water shader (raw WebGL, no libraries) |
| `sw.js` | Service worker: the app opens offline |
| `ios-app/` | Capacitor wrapper and TestFlight steps |
| `classic.html` | Labs: terminal commands, decrypt puzzle, pass maker |
| `config.js` | The one file you edit: token, links, worker URL |

## How a message travels

```
device ──POST──▶ edge worker ──▶ model
   ▲                │  origin allowlist, rate limit, passcode, API key
   └──── SSE ───────┘  tokens stream back as they are generated
   └─ worker unreachable? the local core answers, 0 requests
```

## Security model

| Threat | Control |
| --- | --- |
| API key theft | Key is a Worker secret, never shipped to the client |
| Cost abuse | Per-IP rate limit, origin allowlist, caps on turns, characters and output tokens |
| Script injection through a reply | Output rendered as text nodes only, no `innerHTML` in the chat path |
| Passcode guessing | Lockout after five tries, SHA-256 digest comparison |
| Memory exposure | Notes stay in `localStorage`, sent only in private mode, deletable in Settings |
| Wallet-drainer impersonation | Prompt forbids asking for seed phrases, keys or wallet connections |

## Run it

No build step. Serve the folder:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Set it up

1. **Brain:** follow [`worker/README.md`](worker/README.md) (free, no API key), then set `brain` in `config.js`. Until then IAN answers from his offline core.
2. **Token:** set `contract`, `buy` and `chart` in `config.js`. The live price panel turns on.
3. **iPhone:** follow [`ios-app/README.md`](ios-app/README.md).

Built with plain HTML, CSS and JavaScript. Fonts (Archivo, JetBrains Mono) are self-hosted.
