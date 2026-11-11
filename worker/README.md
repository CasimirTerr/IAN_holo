# IAN's brain (Cloudflare Worker)

The site and app work without this: the local core answers in the browser. Deploy the Worker to
put a real language model behind IAN.

The API key stays inside Cloudflare as a secret. It is never in the repo, the page or the app.

## Deploy (about 10 minutes, free tier)

1. Make a free account at [dash.cloudflare.com](https://dash.cloudflare.com).
2. Get an API key and add a few dollars of credit. **Set a monthly spend limit while you're there.**
   - Claude: [console.anthropic.com](https://console.anthropic.com)
   - or ChatGPT: [platform.openai.com](https://platform.openai.com)
3. In Cloudflare: **Workers & Pages → Create → Create Worker**. Name it `ian-brain`, click **Deploy**.
4. Click **Edit code**, delete what's there, paste everything from `worker.js`, click **Deploy**.
5. Open the worker's **Settings → Variables and Secrets** and add:

   | Name | Type | Value |
   | --- | --- | --- |
   | `ANTHROPIC_API_KEY` | Secret | your Claude key (or use `OPENAI_API_KEY` instead) |
   | `OWNER_PASSCODE` | Secret | a long passcode only you know. Unlocks private mode |
   | `ALLOWED_ORIGIN` | Text | `https://casimirterr.github.io,capacitor://localhost` |

6. Copy the worker's URL (it looks like `https://ian-brain.<you>.workers.dev`).
7. Put it in `config.js`:
   ```js
   brain: "https://ian-brain.<you>.workers.dev",
   ```
8. Commit and push. The status under IAN's name switches from **Local core** to **Edge brain · live**.

To test before pushing, open the app, tap the menu, and paste the URL under **Brain**.

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

Override models with the `MODEL`, `OWNER_MODEL` or `OPENAI_MODEL` variables. If you use an OpenAI
key, set `OPENAI_MODEL` to a model your account has access to.

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
