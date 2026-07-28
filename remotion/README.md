# KaneAI landing background

The animated background loop behind the landing hero (`../public/kane-bg.mp4`)
is built programmatically with [Remotion](https://remotion.dev) — no stock
footage. The composition (`src/Composition.tsx`) is a dark, Celo-gold field
that echoes the four-blade KaneAI mark; every motion is periodic over the
composition length so the exported MP4 loops seamlessly.

## Regenerate the video

> Use **npm**, not bun — Remotion's renderer resolves a transitive `ws`
> dependency through Node's CJS loader, which bun's node_modules layout breaks.

```bash
cd remotion
npm install
npm run render      # writes ../public/kane-bg.mp4
# preview a still:  npx remotion still src/index.ts KaneBackground out/frame.png --frame=75
# live studio:      npm run dev
```

Composition: `KaneBackground` — 1920×1080, 30fps, 300 frames (10s).

Tweak the look in `src/Composition.tsx`: `GOLD` (accent), `PARTICLES` (density),
the two `Blades` opacities (mark strength), and the vignette.
