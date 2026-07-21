# 🀄 Kin — Member Shuffler

A small, phone-first web app that shuffles a group of players into secret roles
for a hidden-role game. Built for the **Warring States (Chine antique)** game:
one neutral Emperor, three rival kingdoms with secret chiefs, and the invading
Qin empire — each player learns only what *they* are allowed to know.

There is **no backend and no database**. The player list and the current
distribution are stored entirely in **cookies** on the device.

---

## The game — Royaumes combattants

- **👑 L'Empereur (Le Ciel)** — one neutral player, above the kingdoms, knows no one.
- **Royaumes (🔴 Chu · 🟡 Han · 🔵 Zhao …)** — each kingdom has:
  - a random **chief** who knows the Emperor and no one else in the team;
  - other members, who each secretly know **one** teammate (never the chief).
- **⚔️ Empire Qin** — the invaders; every member knows all the others.

All knowledge is one-directional. The reference logic is a bash script; this app
generalises it to any number of players (the kingdoms stay balanced and the Qin
empire absorbs the remainder — e.g. 18 players → 1 / 4-4-4 / 5, like the script).

---

## Features

- **Add players** one by one, or **paste a list** — bullets (`• - 1.`), phone
  numbers and stray whitespace are cleaned up automatically (built for pasting a
  phone contact list).
- **Persistent** — players and the current distribution stay in cookies until you
  explicitly delete them or hit *Régénérer*.
- **Remove** one player, several at once (multi-select), or all.
- **Pass-the-phone reveal** — each player taps their name to see their role
  privately, with a hand-off screen so nobody sees the previous card.
- **Leader view** — the full breakdown, with a one-tap **copy to clipboard**.
- **Mobile-first PWA** — installable, works offline, dark/light mode, safe-area
  aware.

---

## Development

```bash
npm install
npm run dev      # Vite dev server on http://localhost:5173
```

That's it — there's no API or proxy to run in development.

## Production build

```bash
npm run build    # tsc -p tsconfig.server.json && vite build  → dist-server/ + dist/
npm start        # node dist-server/server.js  (serves the SPA on PORT, default 3000)
```

## Deployment

Tag a release and let CI build the tarball, then run the install script on the
appliance. See [docs/deployment.md](docs/deployment.md).

```bash
curl -fsSL https://raw.githubusercontent.com/nebuloss/kin-app/main/install.sh | sh
```

---

## Project structure

```
kin-app/
├── server.ts              # Express static server (serves dist/, SPA fallback)
├── install.sh             # Self-contained deploy script (Alpine + Debian)
├── src/
│   ├── core/game.ts       # Role-distribution engine (generate + resolve + text export)
│   ├── lib/
│   │   ├── cookies.ts     # Cookie-backed persistence helpers
│   │   ├── parseNames.ts  # Pasted-list → clean names
│   │   ├── colors.ts      # Per-team Tailwind class bundles
│   │   └── utils.ts       # cn(), shuffled(), copyText()
│   ├── store/config.tsx   # Members + theme + game state (React Context, cookie-persisted)
│   ├── components/        # Layout, RevealOverlay, ConfirmModal, ErrorBoundary
│   └── pages/            # PlayersPage, GamePage
└── .github/workflows/release.yml
```

## Notes on storage

Cookies are capped at ~4 KB each. A player list of a few dozen names and one
distribution fit comfortably. If a value ever exceeds the limit it simply isn't
persisted (it stays in memory for the session) rather than throwing.
