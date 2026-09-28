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

## No screenshots

The page ships no product screenshots. The product section is a **working
console** (`sections/LiveConsole.tsx`): the search filters, the leave
approvals commit and show the resulting balance, the payroll run resolves
net pay, and the analytics view draws from the same records. It is a real
React component, so it demonstrates the product instead of picturing it.

`public/infopace-logo.webp` is the only image on the page.

## Design system

"Executive Precision", built on colours sampled from the Infopace logo:

| Token | Value | Sampled from |
|---|---|---|
| `--cyan` | `#00AFF0` | logo wordmark (84% of the mark) |
| `--indigo` | `#3E4095` | logo underbar; also the dark zone surface |
| `--accent` | `#EB3237` | logo square; critical states only |
| `--blue-400` | `#3D7CF6` | product UI primary; fills and charts |
| `--blue-500` | `#3770DD` | 4.6:1, white text sits on this |
| `--blue-700` | `#3061C0` | 5.8:1, links and chart series |

Cyan is 2.5:1 on white and the royal blue is 3.9:1, so neither carries
text. Both are fills; the darker steps carry buttons and links. Geometry
follows the product UI: 8px data rows, 12px cards, 16px panels, pill chips,
with soft blue-tinted shadows.

The logo blue is only 2.5:1 on white, which is why text and controls use the
darker step rather than the sampled value. Radii follow "soft precision":
4px data rows, 8px cards, 12px panels, pills for chips.

Chart palettes are validated, not eyeballed. Light: `#3061C0, #0D9488,
#8B5CF6, #B45309`. Dark zone (on `#141642`): `#4477D6, #12A594, #8265E0,
#C2831A`. Blue and violet are deliberately never adjacent in the order,
which is the pair that failed the colour-vision separation check.

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
