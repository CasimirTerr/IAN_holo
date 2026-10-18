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
- **IAN Pass** (`pass.js`): 9 skins (IAN's art + generated Matrix/Grid + a secret Decoder skin), rarity tiers (Common → Mythic) and stats rolled from your name, foil on rare cards, save as PNG
- **Nerd layer** (`labs.js`):
  - Terminal commands: `help`, `ls -a`, `cat`, `neofetch`, `history`, `hash` (real SHA-256), `b64`/`unb64`, `ping`, `uptime`, `sudo`…
  - `decrypt`: a 3-stage hex → base64 → caesar puzzle that unlocks the Decoder pass skin
  - Modes: CRT monitor, Matrix rain, glitch IAN (shader slice + RGB split), wireframe IAN, live debug HUD (`` ` `` key: fps, GPU, IAN position)
  - Konami code (↑↑↓↓←→←→BA) → overdrive
  - Boot sequence on load
- **Token**: ticker, chain, contract address with copy button, and live price / market cap / liquidity / volume from DexScreener once the contract is set
- **Official links + Guardian checklist**: the only real links, and five rules that stop people getting drained
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

- Share cards: `assets/og.jpg` (1200×630) is set as the preview image for X, Discord and iMessage
- 3D quality adapts to the device: phones and low-core machines get fewer particles and lighter shaders, and a frame-rate watchdog lowers resolution if it ever stutters

- Respects `prefers-reduced-motion` (slows the scene way down, turns off the other animations)
- Pauses rendering when the tab is hidden
- If WebGL isn't available it falls back to a still image of IAN

Site by [@cashhhlii](https://x.com/cashhhlii).
