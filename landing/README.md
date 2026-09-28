# Infopace HR, landing page

A standalone marketing page for the HR platform in this repository. It is a
separate app from `frontend/` (the product itself) and shares nothing with it
at runtime.

## Stack

Vite + React 18 + TypeScript, Tailwind v4, Motion for scroll-linked effects,
Phosphor (Light) icons, Geist self-hosted from the `geist` package.

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

## Conventions worth keeping

- Colour, type, radius and the two bezel treatments are tokens in
  `src/index.css`. Nothing outside that file introduces a colour or radius.
- The accent is used for actions only, never as decoration.
- Hero max-widths are in `em`, not `ch`: `ch` depends on the loaded font, so it
  re-wraps when Geist swaps in and costs layout shift.
- The hero entrance is CSS, not JS. A JS-held `opacity: 0` would ship in the
  prerendered HTML and delay the largest paint.
- Z-indexes live in `src/lib/layers.ts`.
