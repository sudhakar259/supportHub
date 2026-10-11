# Color palette

The single source of truth for color is the YAML block in
[`design/solar_navy_enterprise/DESIGN.md`](../design/solar_navy_enterprise/DESIGN.md). It is
implemented as theme tokens in [`web/src/index.css`](../web/src/index.css); everything else in the product
(emails, API reference, payment window, browser theme, interface icons) takes its colors from the same values.
The supplied logo artwork retains its original brand colors.

> **Rule for contributors:** never write a hex color in a component. Use a token class
> (`bg-primary`, `text-on-surface-variant`, `border-outline-variant`…). The only colors that are not tokens are
> supplied logo artwork colors and the ones a workspace administrator chooses for ticket statuses and priorities
> (see [Tenant colors](#tenant-colors)).

## The idea

A warm orange leads on cool, blue-tinted surfaces. Navy is the shell for dark areas (sidebar, footer, tooltips).
Teal marks positive accents. Semantic colors (success, warning, error, info) always travel with a label or icon,
never alone.

## Roles

### Brand and structure

| Token | Value | Use |
|---|---|---|
| `primary` | `#a33900` orange | Primary buttons, links, active controls, the logo tile |
| `primary-container` | `#cc4900` | Hover/pressed state of primary; accent fills |
| `on-primary` / `on-primary-container` | `#ffffff` / `#fffbff` | Text and icons on orange |
| `primary-fixed` | `#ffdbce` | Soft orange tint: selected rows, light chips. Text on it: `on-primary-fixed` `#370e00`, or `on-primary-fixed-variant` `#7f2b00` |
| `primary-fixed-dim`, `inverse-primary` | `#ffb599` | Orange on dark backgrounds |
| `surface-tint` | `#a73a00` | Elevation tint |
| `secondary` | `#565d79` | Quiet controls, neutral chips |
| `secondary-container` | `#d8deff` | Quiet fills; text on it is `on-secondary-container` `#5a627e` |
| `secondary-fixed` / `-dim` | `#dbe1ff` / `#bec5e5` | Light neutral fills; text `on-secondary-fixed` `#131a33`, `on-secondary-fixed-variant` `#3e4660` |
| `tertiary` | `#00685f` teal | Positive and "enabled" accents |
| `tertiary-container` | `#008378` | Teal fills; text `on-tertiary-container` `#f4fffc` |
| `tertiary-fixed` / `-dim` | `#89f5e7` / `#6bd8cb` | Light teal fills; text `on-tertiary-fixed` `#00201d`, `on-tertiary-fixed-variant` `#005049` |

### Surfaces and text

| Token | Value | Use |
|---|---|---|
| `surface`, `background`, `surface-bright` | `#f8f9ff` | Page canvas |
| `surface-container-lowest` | `#ffffff` | Cards, tables, inputs |
| `surface-container-low` | `#eff4ff` | Inset areas, table headers, hovered rows |
| `surface-container` | `#e5eeff` | Dividers, chips |
| `surface-container-high` / `-highest` | `#dce9ff` / `#d3e4fe` | Pressed states, stronger separators (`surface-variant` is `#d3e4fe`) |
| `surface-dim` | `#cbdbf5` | Dimmed areas |
| `on-surface`, `on-background` | `#0b1c30` | Primary text and headings |
| `on-surface-variant` | `#5a4138` | Secondary text, descriptions |
| `outline` | `#8e7166` | Input borders, muted icons (see the note on muted text below) |
| `outline-variant` | `#e2bfb2` | Subtle decorative borders |
| `inverse-surface` | `#213145` navy | Dark areas: sidebar, footer, tooltips, the selection bar; text on it is `inverse-on-surface` `#eaf1ff` |

### Semantic

Each has a strong color (text, icons, solid buttons) and a light container (backgrounds). Always pair a strong color
with its own container text color.

| Meaning | Strong | Container | Text on container | Use |
|---|---|---|---|---|
| Success | `success` `#15803d` | `success-container` `#dcfce7` | `on-success-container` `#14532d` | Resolved, healthy, enabled |
| Warning | `warning` `#92400e` | `warning-container` `#fffbeb` | `on-warning-container` `#78350f` | Pending, approaching an SLA deadline, internal notes |
| Error | `error` `#ba1a1a` | `error-container` `#ffdad6` | `on-error-container` `#93000a` | Validation errors, failures, SLA breaches, destructive actions |
| Info | `info` `#1d4ed8` | `info-container` `#eff6ff` | `on-info-container` `#1e40af` | Informational messages |

`inverse-success` (`#4ade80`) is the success green for dark backgrounds, used for the pulsing "live" dot in the footer (7.6:1 on `inverse-surface`; the regular `success` is only 2.6:1 there).

`brand-accent*` (`#a33900` and friends) is the same orange as `primary`, kept so earlier components keep working; prefer `primary`.
`success`, `warning`, `info` and the `brand-accent*`, `inverse-outline` and `inverse-on-surface-variant` roles are product additions that
complete the set; they sit in the design file after the base roles.

## Contrast (measured)

Computed from the values above with the WCAG 2.x formula (4.5:1 is the minimum for body text, 7:1 is AAA, 3:1 is the
minimum for large text and for UI component borders).

| Pair | Ratio | Level |
|---|---|---|
| `on-surface` on `surface` / on white | 16.3 / 17.2 | AAA |
| `on-surface-variant` on `surface` / white / `surface-container-low` / `surface-container` | 8.9 / 9.3 / 8.5 / 8.0 | AAA |
| white on `primary` | 6.7 | AA |
| `fffbff` on `primary-container` (hover) | 4.5 | AA (just) |
| `primary` as a link on `surface` / on white | 6.4 / 6.7 | AA |
| `on-primary-fixed` / `on-primary-fixed-variant` on `primary-fixed` | 13.3 / 7.2 | AAA |
| `primary` on `primary-fixed` | 5.2 | AA |
| `inverse-on-surface` on `inverse-surface` | 11.7 | AAA |
| `inverse-primary` on `inverse-surface` | 7.8 | AAA |
| white on `secondary` | 6.5 | AA |
| `on-secondary-container` on `secondary-container` | 4.5 | AA (just) |
| white on `tertiary`; `tertiary` as text on white | 6.7 | AA |
| `on-tertiary-container` on `tertiary-container` | 4.6 | AA (just) |
| `on-tertiary-fixed` on `tertiary-fixed` | 13.3 | AAA |
| white on `error`; `error` as text on white | 6.5 | AA |
| `on-error-container` on `error-container` | 7.2 | AAA |
| white on `success` / `warning` / `info` | 5.0 / 7.1 / 6.7 | AA / AAA / AA |
| **`outline` as text on white / on `surface`** | **4.5 / 4.3** | **Just under AA for small text** |
| `outline-variant` against white | 1.7 | Decorative only |

**Two things to know.**
- **Muted text.** `outline` (`#8e7166`) is 4.46:1 on white and 4.25:1 on the page background, which is just under the 4.5:1 minimum for
  small text. It is fine for icons and for input borders (which only need 3:1), but do not use it for text that carries information.
  Use `on-surface-variant` instead. `CustomerProfilePanel` uses `outline` for three decorative icons, not their text labels.
- **Borders.** `outline-variant` (`#e2bfb2`) is deliberately faint (1.7:1). Use it for decoration only; a border that identifies a control,
  such as an input, should use `outline`.

Color is never the only signal: status labels and icons accompany it.

## Tenant colors

A workspace administrator picks the color of each ticket **status** and **priority** (Statuses & Priorities page). These are
data, not part of the product palette, and are the one place administrator-selected colors appear. They are rendered as a small dot plus a
14% tint behind a label in `on-surface` text, so any chosen color stays readable (`StatusBadge`). The defaults offered
in the form are slate gray `#6B7280` and blue `#3B82F6`.

## Where the palette is applied

| Surface | Where | Notes |
|---|---|---|
| Web app, public site, sign-in | `web/src/index.css` (`@theme`) | All components use the token classes |
| Public icons, tiles and diagrams | `web/src/features/landing/palette.ts`, `web/src/features/landing/marketing.css` | Stable topic colors connect menu icons, feature tiles, guides, solutions, security controls and pricing. Primary orange leads, with coordinated tertiary teal, info blue, secondary violet and structural navy on soft backgrounds. Buttons, links and active navigation stay primary; status colors keep their semantic meaning. |
| Browser tab color | `web/index.html` `theme-color` | `#a33900` |
| Logo, favicon, share image | `web/public/branding`, `web/public/*.svg`, `*.png` | Supplied `design/logo` artwork; transparent orange mark and light/dark wordmarks. The dark wordmark's `Nu` uses the reference artwork's `#ea580c` as a brand-only accent. Interface color roles stay unchanged. |
| Payment window (Razorpay) | `web/src/features/billing/lib/razorpayCheckout.ts` | Reads `--color-primary`, falls back to `#a33900` |
| Notification emails | `api/resources/views/vendor/mail/html/themes/supporthub.css`, selected in `api/config/mail.php` | Buttons and links orange; headings `on-surface`; body and footer `on-surface-variant`; success and error buttons use the semantic colors |
| Private developer documentation (`/integrations/developer-docs`) | `web/src/features/integrations/pages/developer-docs.css` | Uses application palette tokens for the guide, code panels and semantic HTTP method badges. The private generated reference uses `api/resources/views/vendor/scribe/themes/default/palette.blade.php`; regenerate with `php artisan scribe:generate`. |

## Changing the palette

1. Edit the YAML in `DESIGN.md` (the source) and the matching `--color-*` lines in `web/src/index.css`.
2. Update the places that restate a value instead of reading the token: the email theme, the API-reference partial,
   `web/index.html`'s `theme-color` and the Razorpay fallback. Supplied logo artwork is independent of interface colors;
   use `npm run brand:sync` after changing the files in `design/logo`, then refresh PNG exports.
3. Re-run the contrast table above (any text pairing under 4.5:1 is a bug) and `php artisan scribe:generate`.
4. `api/tests/Feature/PaletteConsistencyTest.php` and `MailThemeTest.php` fail if the web stylesheet, the email theme or the API
   reference drift from the design file. They need the whole repository checkout, so run them from the repository root
   (for example `docker run --rm -v "$PWD":/work -w /work/api … php artisan test --filter=PaletteConsistency`); inside a container that
   mounts only `api/` they are skipped.
