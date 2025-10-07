css/
  00-vars.css              ← colors, spacing, radii, shadows (CSS variables)
  01-reset.css             ← modern normalize (tiny)
  02-base.css              ← typography, links, page wrap, .card
  10-components/
    osf.css                ← anchors, § labels, popover, toast
    memo.css               ← memo compose modal/page
    research-office.css    ← layout of the research_office page
  98-utilities.css         ← .visually-hidden, .u-flex, .u-gap, .u-mono …
  bundle.css               ← built (generated)

# Prefix discipline
Everything the site injects uses osf-, memo uses memo-, Research Office uses ro-.
That alone kills 90% of leakage and most !important usage.
One bundle on every page

# Where to park what (quick map)
- Anything injected by osf.bundle.js → osf.css
- § labels, copy icon, discussion popover, toast, active highlight.
- The Research Office page layout → research-office.css.
- The memo compose UI (modal or page) → memo.css.
- Site-wide typography, cards, wrap → 02-base.css.
- Shared variables → 00-vars.css.

# When you move a rule, 
rename classes as needed to keep prefixes:
- .toast → .osf-toast
- .popover → .osf-pop
- etc.

# Consolidated css file
run: node tools/build-css.mjs
Consolidates css into : css/bundle.css

# Include css
<link rel="stylesheet" href="/css/bundle.css?v=2025-10-04">

# How to migrate without breaking pages

1. Add the new bundle link alongside the old CSS. Verify nothing explodes.
2. Move small chunks from legacy files into the right new files; reload, compare.
3. Once a page looks right, remove its old CSS link.
4. Repeat per page. Slow and steady.

# Quick “where is X defined?” tricks

## Find all component rules:
grep -Rni --include='*.css' 'osf-' css/ cafes
grep -Rni --include='*.html' '<style' cafes


## Hunt !important to retire them:
grep -Rni --include='*.css' '!important' css/ cafes
