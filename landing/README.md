# Infopace HR, landing page

A standalone marketing page for the HR platform in this repository. It is a
separate app from `frontend/` (the product itself) and shares nothing with it
at runtime.

## Stack

Vite + React 18 + TypeScript, Tailwind v4, Motion (Framer Motion) for
scroll-linked effects, Phosphor icons, Manrope self-hosted from
`@fontsource/manrope`.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck, bundle, then prerender to static HTML
npm run preview
```

`npm run build` runs a second SSR pass and writes the rendered markup into
`dist/index.html` (see `prerender.mjs`). That is what keeps first paint off the
JS bundle. The output in `dist/` is plain static files.

## Imagery

Every product screenshot is a real capture of the app in this repository,
taken at 2x against a locally seeded demo tenant, then exported to AVIF with a
WebP fallback at 800/1600/2400w. The sidebar, tables, figures and rupee amounts
are what the app actually renders. The tenant shown ("Meridian Textiles") and
its staff records are seeded sample data, not a real customer.

The photograph in the "Rollout" band is generated, not a stock photo or a real
Infopace site.

`public/infopace-logo.webp` is the real company logo, copied from
`frontend/public/`.

## Design system

"Executive Precision", built on colours sampled from the Infopace logo:

| Token | Value | Note |
|---|---|---|
| `--brand` | `#00B0EF` | sampled from the logo mark; fills and graphics only |
| `--brand-700` | `#00729B` | derived; 5.4:1 on white, so buttons and links use this |
| `--accent` | `#E8333A` | sampled from the logo accent; critical states only |
| `--accent-700` | `#C52B31` | derived; 5.6:1 on white, for accent text |
| `--ink` | `#111827` | 17.7:1 on white |

The logo blue is only 2.5:1 on white, which is why text and controls use the
darker step rather than the sampled value. Radii follow "soft precision":
4px data rows, 8px cards, 12px panels, pills for chips.

Chart palettes are validated, not eyeballed. Light: `#00729B, #6D28D9,
#0D9488, #B45309`. Dark section: `#1B93C4, #7C5CE0, #0FA091, #C27C0D`. Both
pass lightness-band, chroma, CVD-separation and contrast checks.

## One layout family per section

Each section introduces a pattern no other section repeats: split hero with a
live console, a stepped diagonal ladder, an asymmetric bento, a vertical
spine, a tab console, a dark analytics zone, alternating storytelling blocks,
a horizontal timeline, an auto-scrolling carousel, and a full-bleed close.

## Conventions worth keeping

- Colour, type, radius and the two bezel treatments are tokens in
  `src/index.css`. Nothing outside that file introduces a colour or radius.
- The accent is used for actions only, never as decoration.
- Hero max-widths are in `em`, not `ch`: `ch` depends on the loaded font, so it
  re-wraps when Geist swaps in and costs layout shift.
- The hero entrance is CSS, not JS. A JS-held `opacity: 0` would ship in the
  prerendered HTML and delay the largest paint.
- Z-indexes live in `src/lib/layers.ts`.
