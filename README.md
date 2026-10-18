# IAN

Website for **IAN**, the AI guardian who builds beside you. Follow along at [@IAN_holo](https://x.com/IAN_holo).


## Built with

- Plain HTML, CSS and JavaScript, no build step
- [Three.js](https://threejs.org/) for the 3D scene, with a custom fresnel shader for the hologram glow and scan lines
- Canvas 2D for the neon skyline in the background
- CSS 3D transforms for the holographic tilt card

## Run it

Just open `index.html` in a browser. Or serve the folder:

```bash
python -m http.server 8000
```

## Edit the token info

Everything you'd change lives in one block at the top of the script in `index.html`:

```js
const IAN = {
  ticker:   "$IAN",
  chain:    "",          // e.g. "Solana"
  contract: "",          // token contract address
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
- The 3D scene only renders while it's on screen, to save battery
- If WebGL isn't available the page still works, just without the 3D

Site by [@cashhhlii](https://x.com/cashhhlii).
