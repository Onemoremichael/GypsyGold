# Gypsy Gold Plush Builder

Interactive prototype for a guided Build-A-Bear-style Gypsy Vanner plush customization flow.

## What this does

- Walks guests through a 3-step customization flow:
  - Body and coat
  - Hair and face
  - Accessories
- Generates a plush preview image only after all traits are selected.
- Uses a reference plush image to keep output consistent and recognizable.
- Ends with a completion screen: **Build my Gypsy Vanner!**

## Tech stack

- Static frontend: `index.html`, `app.js`, `styles.css`
- Local API server: `server.js` (Express)
- Netlify production API: `netlify/functions/generate-image.cjs`
- Image model API: Google Gemini via server-side key

## Security model

- API key is server-side only (`GEMINI_API_KEY`).
- Frontend never receives raw key material.
- `.env` is git-ignored.
- Netlify uses environment variables for secrets.

## Prerequisites

- Node.js 18+
- npm
- Gemini API key

## Quick start (local Express)

```bash
cd /Users/mj/Documents/GypsyGold_repo
npm install
cp .env.example .env
```

Set `.env`:

```bash
GEMINI_API_KEY=your_real_key_here
PORT=4311
```

Run:

```bash
npm start
```

Open:

`http://127.0.0.1:4311`

## Run with Netlify Functions locally

Use this when you want to mirror production routing/function behavior:

```bash
npm run netlify:dev
```

Default URL shown by Netlify CLI, typically:

`http://localhost:8888` or the explicit port you pass.

## Deploy to Netlify

1. Import this repo into Netlify.
2. Build settings:
   - Build command: leave blank
   - Publish directory: `.`
3. Add environment variable in Netlify:
   - `GEMINI_API_KEY=your_real_key_here`
4. Deploy.

The redirect in `netlify.toml` maps:

`/api/generate-image` -> `/.netlify/functions/generate-image`

so the frontend API path does not need to change.

## Available scripts

- `npm start` runs local Express server (`server.js`)
- `npm run dev` runs Express with file watch
- `npm run netlify:dev` runs Netlify local dev server with functions
- `npm run netlify:deploy` deploys to Netlify production via CLI

## Project files

- `index.html` main UI
- `app.js` guided flow + prompt construction + API calls
- `styles.css` UI styling
- `default-plush-reference.png` reference identity image
- `server.js` local backend API
- `netlify/functions/generate-image.cjs` production serverless API
- `netlify.toml` Netlify build/functions/redirect config

## Troubleshooting

- `Unexpected token '<'` in API response:
  - You are likely serving static files only.
  - Run `npm start` or `npm run netlify:dev` so `/api/generate-image` exists.
- `Your API key was reported as leaked` or `API key expired`:
  - Rotate key in Google AI Studio.
  - Update `.env` locally and Netlify env var in production.
  - Restart server or redeploy.
- `Server is missing GEMINI_API_KEY`:
  - Confirm `.env` exists locally.
  - Confirm Netlify environment variable is set for deployed site.
