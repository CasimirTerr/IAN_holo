# IAN's brain (Cloudflare Worker)

Without this, IAN only has his offline core: a few dozen scripted replies. Deploy the Worker to
put a real language model behind him. The free setup below needs no API key.

Any key you add stays inside Cloudflare as a secret. It is never in the repo, the page or the app.

## Free setup (about 5 minutes, no API key, no card)

This uses Cloudflare Workers AI, which runs an open model inside Cloudflare with a free daily
allowance (10,000 "neurons" a day, roughly 100 to 200 replies).

1. Make a free account at [dash.cloudflare.com](https://dash.cloudflare.com).
2. **Workers & Pages → Create → Create Worker**. Name it `ian-brain`, click **Deploy**.
3. Click **Edit code**, delete what's there, paste everything from `worker.js`, click **Deploy**.
4. Open the worker's **Settings → Bindings → Add → Workers AI**. Set the variable name to `AI`
   (capital letters) and save.
5. Still in Settings, under **Variables and Secrets**, add:

   | Name | Type | Value |
   | --- | --- | --- |
   | `ALLOWED_ORIGIN` | Text | `https://casimirterr.github.io,capacitor://localhost` |
   | `OWNER_PASSCODE` | Secret | a long passcode only you know. Unlocks private mode |

6. Copy the worker's URL (it looks like `https://ian-brain.<you>.workers.dev`). Opening it in a
   browser should show `{"ok":true,"provider":"workers-ai",...}`.
7. Put it in `config.js`:
   ```js
   brain: "https://ian-brain.<you>.workers.dev",
   ```
8. Commit and push. The status under IAN's name switches from **Local core** to **Edge brain · live**.

To test before pushing, open the app, tap the menu, and paste the URL under **Brain**.

## Other brains

The worker uses the first one it finds, in this order. Add the key as a **Secret**.

| Secret | Brain | Cost |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Claude | paid, pay per use. No standing free API tier |
| `OPENAI_API_KEY` | ChatGPT | paid, pay per use. No free API tier for text |
| `GEMINI_API_KEY` | Google Gemini | free tier with a key from [aistudio.google.com](https://aistudio.google.com). On the free tier Google may use what you send to improve its products |
| `AI` binding | Cloudflare Workers AI | free daily allowance, no key |

The free apps (claude.ai, chatgpt.com, gemini.google.com) can't be plugged into a website. Only the
developer APIs can, and of those only Gemini and Workers AI have a standing free tier.

If you use a paid key, set a monthly spend limit in that provider's console.

## Private mode

Open the app → menu → **Private mode** → enter your `OWNER_PASSCODE`.

| | Public | Private |
| --- | --- | --- |
| Persona | IAN the project character | your personal assistant |
| Model (Claude) | `claude-haiku-5-5` | `claude-sonnet-5-5` |
| Output cap | 350 tokens | 1500 tokens |
| History sent | last 12 turns, 800 chars each | last 30 turns, 6000 chars each |
| Memory notes | not sent | sent, and IAN can add new ones |
| Rate limit | 20 / 10 min / IP | 150 / 10 min / IP |

Override models with the `MODEL`, `OWNER_MODEL`, `OPENAI_MODEL`, `GEMINI_MODEL` or `CF_MODEL`
variables. Model names change: if a brain returns errors, set the variable to a model that provider
currently lists. On the free brains both modes use the same model; private mode still gets the
longer answers, more history and memory.

## API

- `GET /` health check: `{ ok, provider, privateMode, unlocked }`. Send
  `Authorization: Bearer <passcode>` to check a passcode.
- `POST /` with `{ messages, memory, stream }`.
  - `stream: true` returns server-sent events: `data: {"mode":"public"}`, then
    `data: {"t":"text"}` per chunk, then `data: [DONE]`.
  - otherwise returns `{ reply, mode }`.

## Safety and cost

- Turn, character and token caps on every request.
- Five wrong passcodes lock that IP out for ten minutes. Passcodes are compared as SHA-256 digests.
- Rate limits live in worker memory, so they are a first line of defence. The spend limit on your
  API key is the hard stop.
- The prompt forbids price predictions and financial advice, never asks for seed phrases, and
  warns about scams, in both modes.
- If the worker errors or runs out of credit, the app falls back to the local core.
