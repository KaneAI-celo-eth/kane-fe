# VortxLab Creations

A full-screen immersive landing page for a fictional creative-tech studio.
Looping background video behind a rounded "liquid glass" container, octagonal
clip-path buttons, and staggered fade-up entrance animations on every element.

## Stack

React 19 · Vite · TypeScript · Tailwind CSS 3 · lucide-react · Inter (Google Fonts).

## Structure

| Path | Role |
| --- | --- |
| `index.html` | Title + Inter 300–900 via Google Fonts (with preconnect). |
| `src/index.css` | Tailwind layers, `.btn-cut` / `.btn-cut-border` / `.btn-cut-sm` clip-paths, `fadeUp` / `fadeIn` keyframes. |
| `src/App.tsx` | The whole page — video, nav, heading, bottom row, inline `VortxMark` logo + brand SVGs. |
| `tailwind.config.js` | `fontFamily.inter`. |

## Design notes

- **Cut buttons.** `.btn-cut` is a 12px octagon; `.btn-cut-sm` an 8px one. The outline
  variant `.btn-cut-border` is a white octagon with a black `::before` inset by 1px and
  clipped at 11px — the 1px difference *is* the border. Direct children are lifted to
  `z-index: 1` so text sits above the black fill.
- **Logo.** Four quarter-circle blades (`M128 128 L128 0 A128 128 0 0 0 256 128 Z`)
  rotated 0/90/180/270 around the center. The arc is concave, so the four blades
  together form a four-point star — a vortex / plus mark.
- **Stagger.** Every block carries `.anim-stagger` with an inline `animationDelay`,
  cascading 0.1s → 1s: logo, nav, left rail, heading, then the three bottom columns.

## Run

```bash
bun install
bun run dev      # http://localhost:5173
bun run build    # tsc --noEmit && vite build
```
