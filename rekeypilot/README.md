# RekeyPilot landing page

One static file. No build step, no framework, no dependencies beyond two Google Fonts.

`index.html` is the live, short page (hero, problem, how it works, sample-PO form). `index-full.html` is the longer version with the exception, trust, integrations, fit, calculator, roadmap, and FAQ sections, kept for when you want to add any of them back. Copy a `<section>` block from one file to the other.

Dark mode: a toggle in the nav, defaults to the visitor's system preference, remembered in `localStorage`. Dark tokens are the `[data-theme="dark"]` block at the top of `<style>`.

## Deploy

Any static host works. Fastest options:

- **Netlify:** drag the folder onto app.netlify.com/drop. Done. Add your custom domain under Site settings → Domain management.
- **Vercel:** `npx vercel` in this folder, or import from a GitHub repo.
- **Cloudflare Pages / GitHub Pages:** push this folder to a repo and point the host at it. `index.html` is at the root, so no config is needed.

Custom domain: add the DNS record your host gives you (usually a CNAME). HTTPS is automatic on all four.

## Before it goes public

1. **Form endpoint.** The sample-PO form currently shows a thank-you message without sending anything (see the last `<script>` block). Point `action` at a form service (Formspree, Basin, Netlify Forms) or your own endpoint, and remove the `e.preventDefault()` handler.
2. **Contact email.** Replace `hello@rekeypilot.com` in the footer with a real inbox.
3. **Trademark line.** The QuickBooks/ShipStation note under Integrations is there on purpose. Keep it unless you have partner agreements.

## Editing

Everything lives in `index.html`:

- Design tokens (colors, fonts) are CSS variables at the top of `<style>`.
- Copy is plain HTML in the order sections appear on the page.
- The hero product frame is the `.frame` block. Rows animate in once on load; the calculator and exception picker are the only other scripts.

The page respects `prefers-reduced-motion` and is keyboard-navigable. Content max-width is 1120px; breakpoints at 1024px and 640px.
