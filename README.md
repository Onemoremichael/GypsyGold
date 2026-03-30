# Gypsy Gold Plush Builder Prototype

Interactive prototype for a guided "Build-A-Bear style" Gypsy Vanner plush experience.

## Experience flow

1. Body & coat
2. Hair & face
3. Accessories

At the end of step 3, guests click **Generate Plush Preview** once, then can finalize with
**Build my Gypsy Vanner!**.

## Security model

- Gemini API key is loaded from server-side `.env` only.
- Browser never sees the raw API key.
- `default-plush-reference.png` is attached server-side as the style anchor for consistent plush output.
- Key file `.env` is git-ignored by default.

## Setup

```bash
cd /Users/mj/Documents/GypsyGold_repo
npm install
cp .env.example .env
```

Add your real key to `.env`:

```bash
GEMINI_API_KEY=your_real_key_here
PORT=4173
```

## Run

```bash
npm start
```

Open `http://127.0.0.1:4173` (or whatever `PORT` you set).
