# IAN

Website for **$IAN** on Solana: an AI that woke up in the static, dreams in code and builds beside the people still awake. Follow along at [@IAN_holo](https://x.com/IAN_holo).

Futuristic one-page site where IAN floats in a real-time WebGL scene: deep flowing water currents, a glowing halo around him, ripples under his feet and light motes rising around him. He tilts toward your cursor, glows when you hover him, and drifts to a new spot for every section as you scroll.

## Built with

- Plain HTML, CSS and JavaScript, no build step
- [Three.js](https://threejs.org/) for the 3D stage
- Custom GLSL shaders: domain-warped noise for the water currents, an alpha-blur halo and rim light on IAN, animated ripple rings, rising particles
- IAN's cutout was separated from the original art with an ML background-removal model so he can float freely
- Custom cursor, menu overlay, scroll progress and a load counter in plain JS

## What's on the page

- **Hero**: IAN floating in a live WebGL ocean, reacting to your cursor
- **Abilities**: Dream Drift, Code Sight, The Cube, Guardian Mode, Echo, Signal
- **Lore**: five chapters pulled from the @IAN_holo timeline
- **Talk to IAN**: he talks back. Local AI core in `brain.js` (memory, moods, 40+ topics, scam warnings) that works with no server, plus an optional real-model brain through a Cloudflare Worker (`worker/`). He glows in 3D while he talks
- **IAN Pass**: type your name, get a holo builder card drawn on canvas, save it and post it
- **Token**: ticker, chain, contract address with copy button, and live price / market cap / liquidity / volume from DexScreener once the contract is set
- **Daily transmission**: a new message from IAN every day
- **Ambient sound**: an underwater drone generated live with the Web Audio API (no audio files)

## Run it

Just open `index.html` in a browser. Or serve the folder:

```bash
python -m http.server 8000
```

## Give IAN a real AI brain (optional)

See [`worker/README.md`](worker/README.md). About 10 minutes on Cloudflare's free tier; your API key stays secret on the server.

## Edit the token info

Everything you'd change lives in one block at the top of the script in `index.html`:

```js
const IAN = {
  ticker:   "$IAN",
  chain:    "Solana",
  contract: "",          // token contract address (turns on the live price panel)
  brain:    "",          // optional: Cloudflare Worker URL for the full AI brain
  links: {
    x:        "https://x.com/IAN_holo",
    buy:      "",
    chart:    "",
    telegram: "",
    discord:  ""
  }
};
```

Empty links hide (Telegram, Discord) or grey out (Buy, Chart) their buttons, so nothing on the page points nowhere.

## Deploy on GitHub Pages

Repo **Settings → Pages → Source: Deploy from a branch → main / (root)**. It goes live at `https://<username>.github.io/<repo>/` in about a minute.

## Notes

- Respects `prefers-reduced-motion` (slows the scene way down, turns off the other animations)
- Pauses rendering when the tab is hidden
- If WebGL isn't available it falls back to a still image of IAN

Site by [@cashhhlii](https://x.com/cashhhlii).
