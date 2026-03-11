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
