# Gypsy Gold Plush Builder Prototype

This version uses a **guided 3-step plush builder** and generates the preview image directly with AI.

## Experience flow

1. Body & coat
2. Face & mane
3. Style & scene

After selections, users generate:

- Plush preview image
- Final keepsake image

## Notes

- No SVG horse renderer is used.
- The opening preview uses a static AI-generated PNG: `default-plush-reference.png`.
- API/model controls are tucked into **Advanced Settings**.
- Prompts are constrained to produce a **stuffed plush toy look**, not realistic horse photography.
- Includes Gypsy Gold logo from `GG-2021-Logo-transparent.png`.

## Run locally

```bash
cd /Users/mj/Documents/GypsyGold
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173`.
