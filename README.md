# 240 Milk Questions — Scripture Trivia

A React-based scripture study app with 240 questions, full KJV Apocrypha verse text, and multiple game modes.

## Features

- **Select All That Apply** — Each scripture is its own selectable box
- **Type It** — Type scripture references from memory
- **Flashcards** — Study mode at your own pace
- **Timed Quiz** — 15-second timer per question
- Full KJV Apocrypha verse text after each answer
- End test anytime and see results
- Downloadable PDF of all 240 questions

## Setup

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

1. Push to `main` branch
2. Go to repo Settings → Pages → Source → GitHub Actions
3. Auto-deploys on push

Update `base` in `vite.config.js` to match your repo name:
```js
base: '/your-repo-name/',
```

## Rules tests

Firestore security rules are covered by an emulator-driven test suite.

Run the suite with:

```bash
npm run test:rules
```

Requirements and notes:

- **Node ≥ 20.** `firebase-tools` 13+ requires Node 20 or newer.
- **No real Firebase credentials needed.** The suite uses the local Firestore emulator with the project ID `demo-milk-trivia`, which the emulator recognizes as a fake/demo project.
- **Local emulator port: 8765.** This repo runs the Firestore emulator on `127.0.0.1:8765` rather than the default `8080` due to a port conflict on the dev machine. The port is configured in [`firebase.json`](./firebase.json) and consumed by the test helper in [`tests/rules/helpers.js`](./tests/rules/helpers.js). The design document specifies `8080`; this is a documented local deviation.

References:

- Test suite: [`tests/rules/firestore.rules.test.js`](./tests/rules/firestore.rules.test.js)
- Design doc: [`.kiro/specs/firestore-rules-hardening/design.md`](./.kiro/specs/firestore-rules-hardening/design.md)
