// =====================================================================
//  EDIT THIS: one place for the token, the links and IAN's brain.
//  Empty strings hide or grey out the matching buttons.
// =====================================================================
window.IAN_CONFIG = {
  ticker:   "$IAN",
  chain:    "Solana",
  contract: "",          // token contract address (turns on the live price panel)
  brain:    "",          // your Cloudflare Worker URL, e.g. https://ian-brain.yourname.workers.dev (see /worker)
  site:     "https://casimirterr.github.io/IAN_holo/",
  links: {
    x:        "https://x.com/IAN_holo",
    github:   "https://github.com/CasimirTerr/IAN_holo",
    buy:      "",
    chart:    "",
    telegram: "",
    discord:  ""
  }
};
window.IAN = window.IAN_CONFIG;
