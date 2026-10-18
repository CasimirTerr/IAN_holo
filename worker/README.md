# IAN's full brain (optional)

The site works without this. IAN's local core answers in the browser. Deploy this Worker if you want IAN to answer with a real language model.

The API key stays inside Cloudflare as a secret. It never touches the website code, so nobody can steal it from your GitHub repo.

## Deploy (about 10 minutes, free tier)

1. Make a free account at [dash.cloudflare.com](https://dash.cloudflare.com).
2. Get an API key at [console.anthropic.com](https://console.anthropic.com) and add a few dollars of credit. Set a monthly spend limit there too.
3. In Cloudflare: **Workers & Pages → Create → Create Worker**. Name it `ian-brain` and click **Deploy**.
4. Click **Edit code**, delete what's there, paste everything from `worker.js`, and click **Deploy**.
5. Go to the worker's **Settings → Variables and Secrets** and add:
   - `ANTHROPIC_API_KEY` (type **Secret**): your API key
   - `ALLOWED_ORIGIN` (type Text): `https://casimirterr.github.io`
6. Copy the worker's URL (looks like `https://ian-brain.<you>.workers.dev`).
7. In `index.html`, put it in the config block:
   ```js
   brain: "https://ian-brain.<you>.workers.dev",
   ```
8. Commit and push. The status light in the terminal switches from **local core** to **full brain**.

## Cost and safety

- Each reply is capped at 300 tokens and the last 12 messages, so a conversation costs fractions of a cent.
- There's a simple rate limit (20 messages per person per 10 minutes).
- The persona forbids price predictions and financial advice, never asks for seed phrases, and warns about scams.
- If the worker errors or runs out of credit, the site quietly falls back to the local core.
