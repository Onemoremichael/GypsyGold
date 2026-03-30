# Gypsy Gold Plush Builder Prototype

Interactive prototype for a guided "Build-A-Bear style" Gypsy Vanner plush experience.

## Experience flow

1. Body & coat
2. Hair & face
3. Accessories

At the end of step 3, guests click **Generate Plush Preview** once, then can finalize with
**Build my Gypsy Vanner!**.

## Security model

- Gemini API key stays server-side only.
- Browser never sees the raw API key.
- `default-plush-reference.png` is attached server-side as the identity/style anchor.
- `.env` is git-ignored.

## Local setup

```bash
cd /Users/mj/Documents/GypsyGold_repo
npm install
cp .env.example .env
```

Edit `.env`:

```bash
GEMINI_API_KEY=your_real_key_here
PORT=4311
```

Run local Express server:

```bash
npm start
```

Open `http://127.0.0.1:4311`.

## Netlify-ready architecture

- Static site is published from repo root (`.`).
- Image generation runs in Netlify Function:
  - `netlify/functions/generate-image.cjs`
- Redirect keeps frontend API unchanged:
  - `/api/generate-image` -> `/.netlify/functions/generate-image`
- Netlify config file:
  - `netlify.toml`

## Netlify deploy steps

1. Push this repo to GitHub (already wired).
2. In Netlify, create/import site from this repo.
3. Build settings:
   - Build command: *(leave empty)*
   - Publish directory: `.`
4. In Netlify Site Settings -> Environment Variables, set:
   - `GEMINI_API_KEY=your_real_key_here`
5. Deploy.

## Optional CLI deploy

```bash
npx netlify status
npx netlify login
npx netlify deploy --prod
```

For local Netlify emulation with Functions:

```bash
npm run netlify:dev
```
