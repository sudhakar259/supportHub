---
name: Solar Navy Enterprise
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#5a4138'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#8e7166'
  outline-variant: '#e2bfb2'
  surface-tint: '#a73a00'
  primary: '#a33900'
  on-primary: '#ffffff'
  primary-container: '#cc4900'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb599'
  secondary: '#565d79'
  on-secondary: '#ffffff'
  secondary-container: '#d8deff'
  on-secondary-container: '#5a627e'
  tertiary: '#00685f'
  on-tertiary: '#ffffff'
  tertiary-container: '#008378'
  on-tertiary-container: '#f4fffc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbce'
  primary-fixed-dim: '#ffb599'
  on-primary-fixed: '#370e00'
  on-primary-fixed-variant: '#7f2b00'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#bec5e5'
  on-secondary-fixed: '#131a33'
  on-secondary-fixed-variant: '#3e4660'
  tertiary-fixed: '#89f5e7'
  tertiary-fixed-dim: '#6bd8cb'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  # Product additions: semantic states and a few inverse roles the components rely on.
  inverse-on-surface-variant: '#cbd5e1'
  inverse-outline: '#475569'
  brand-accent: '#a33900'
  on-brand-accent: '#ffffff'
  brand-accent-hover: '#7f2b00'
  brand-accent-container: '#fff1e8'
  on-brand-accent-container: '#7f2b00'
  inverse-brand-accent: '#ffb599'
  success: '#15803d'
  on-success: '#ffffff'
  inverse-success: '#4ade80'
  success-container: '#dcfce7'
  on-success-container: '#14532d'
  warning: '#92400e'
  on-warning: '#ffffff'
  warning-container: '#fffbeb'
  on-warning-container: '#78350f'
  info: '#1d4ed8'
  on-info: '#ffffff'
  info-container: '#eff6ff'
  on-info-container: '#1e40af'
typography:
  display-lg:
    fontFamily: DM Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: DM Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: DM Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: DM Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: -0.01em
  title-md:
    fontFamily: DM Sans
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: DM Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: DM Sans
    fontSize: 17px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 26px
  body-sm:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 22px
  label-md:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: DM Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.025em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

DeskZeal uses a warm, orange-led interface on cool blue-tinted surfaces, with a navy
shell for dark areas and teal reserved for positive states. The public website,
registration screens, workspace and platform console share the same color roles.
DM Sans and the existing layouts are retained.

## Colors

The YAML roles above and `web/src/index.css` define the application palette.
See [the palette guide](../../docs/color-palette.md) for usage and contrast pairs.

- **Primary orange `#A33900`**: primary actions, links, active controls and the D mark.
- **Hover orange `#CC4900`** (`primary-container`): hover and pressed states; the light tint is `#FFDBCE` (`primary-fixed`).
- **Navy `#213145`** (`inverse-surface`): the sidebar, footer and other dark areas, with `#EAF1FF` text.
- **Blue-tinted surfaces**: `#F8F9FF` canvas, `#FFFFFF` cards, `#EFF4FF` inset areas, `#E5EEFF` dividers.
- **Text**: `#0B1C30` primary and `#5A4138` secondary; `#8E7166` for muted text and input borders.
- **Secondary slate-violet `#565D79`**: quiet controls and neutral chips.
- **Tertiary teal `#00685F`**: positive and "enabled" accents.
- **Error `#BA1A1A`**: validation errors, failures, breaches and destructive actions.
- **Success `#15803D`, Warning `#92400E`, Info `#1D4ED8`**: semantic states, each with a light container.

Pair each semantic foreground with its named light container. Status labels and
icons accompany color. Tenant-configured ticket status and priority colors remain
data-driven; their labels use readable dark text.

## Typography

**DM Sans** unifies the public website and workspace with open, readable letterforms. Body text uses medium weight (`500`), labels and controls use semibold (`600`), and headings use bold (`700`). Locally hosted variable WOFF2 subsets keep the interface font available without a third-party font service.

Body text is `16px` with a `26px` line height; dense table text is `14px` with a `22px` line height. Labels use `13px`–`14px` sizes with modest tracking (`0.02em`–`0.025em`). Public descriptions use `16px`–`18px` sizes and darker secondary text. Nothing in the interface is set below `13px`, so the workspace reads as comfortably as the public website. **JetBrains Mono** remains the font for SLA countdowns, ticket hashes (`#TICK-8902`), API error traces, and regex search fields.

## Layout & Spacing

This design system employs a three-pane fluid workbench framework engineered for data-dense desktop environments, collapsing progressively across smaller viewports:

- **Desktop Workbench (1440px+)**:
  - Global Command Rail: Fixed 64px icon-only or 240px persistent Midnight Navy sidebar.
  - Triage/Queue Panel: 360px–420px fluid width for high-volume inbox browsing.
  - Ticket Detail Workspace: Fluid 12-column grid container filling remaining viewport, featuring 16px (`gutter`) inter-column channels and 24px (`margin`) boundary insets.
  - Contextual Inspector: 320px collapsible right panel dedicated to customer telemetry, audit logs, and SLA monitors.
- **Tablet & Compact (768px - 1023px)**:
  - Collapses into a dual-column format: Queue list off-canvas drawer; main stage occupied by ticket resolution conversation.
- **Mobile (< 768px)**:
  - Single-column view with top app bar switching between Queue, Conversation, and Customer Details using segmented controls.

Spacing adheres strictly to a 4px/8px micro-grid. In-component paddings enforce high-density layouts (`space-xs` = 4px, `space-sm` = 8px, `space-md` = 12px) to maximize on-screen ticket volume without clipping information.

## Elevation & Depth

Visual hierarchy uses **tonal layer stacking** combined with **subtle low-contrast borders** rather than heavy drop shadows, maintaining crisp enterprise performance:

- **Base Layer (Canvas)**: Background surface sits at `#F8FAFC`.
- **Level 1 (Cards, Data Tables, Ticket Rows)**: Sits flat at `#FFFFFF` framed by a 1px solid border of `#E2E8F0`. Hovering over interactive rows lifts the surface using a zero-spread border tint `#CBD5E1` and a soft ambient shadow: `0 1px 3px 0 rgba(11, 19, 43, 0.05)`.
- **Level 2 (Flyout Menus, Filter Dropdowns, In-line Toolbars)**: Background `#FFFFFF` with border `#CBD5E1` and depth cast: `0 4px 12px -2px rgba(11, 19, 43, 0.08), 0 2px 4px -2px rgba(11, 19, 43, 0.04)`.
- **Level 3 (Slide-over Drawers, Ticket Split Panes)**: Border-left 1px solid `#CBD5E1`, backdrop overlay `rgba(11, 19, 43, 0.45)`, depth cast: `-8px 0 24px -4px rgba(11, 19, 43, 0.12)`.
- **Level 4 (Escalation Alerts, Critical Modals)**: Pure white `#FFFFFF` surface with an assertive top accent bar in `#EA580C` or `#EF4444`, supported by `0 20px 25px -5px rgba(11, 19, 43, 0.18)`.

## Shapes

To project precision, high utility, and modern engineering authority, this design system uses soft micro-radii:

- **Base Elements (Buttons, Inputs, Table Cells, Checkboxes)**: 4px (`0.25rem`). This prevents wasted layout space in dense tables and tight command bars.
- **Containers & Surfaces (Cards, Modals, Feed Boxes)**: 8px (`0.5rem`, `rounded-lg`). Provides soft framing while remaining distinctly geometric.
- **Pill Exceptions (Status Badges, SLA Timers, Agent Avatars)**: Fully rounded (`9999px`) to create an immediate visual distinction between actionable structural containers and non-interactive status chips.

## Components

### Buttons
- **Primary**: Background `#EA580C`, text `#FFFFFF`, border none, border-radius 4px, font weight 600. Hover: `#C2410C`. Active: `#9A3412`. Focus visible: 2px offset with 2px ring in `#EA580C`.
- **Secondary (Navy Structural)**: Background `#0B132B`, text `#FFFFFF`. Hover: `#1C2541`. Ideal for global actions like "Assign to Tier 3" or "Export Audit Log".
- **Tertiary / Ghost**: Transparent background, text `#334155`, border 1px solid `#E2E8F0`. Hover: `#F1F5F9`, text `#0F172A`.

### Status Badges & SLA Chips
- Always pill-shaped with `label-sm` uppercase tracking.
- **SLA In Danger**: `#FEF2F2` background, `#DC2626` text, 1px solid `#FCA5A5`, featuring an active pulsing dot indicator.
- **SLA Healthy**: `#ECFDF5` background, `#059669` text, 1px solid `#A7F3D0`.
- **Open / In Queue**: `#F0FDFA` background, `#0D9488` text, 1px solid `#99F6E4`.

### Input Fields & Search Bars
- Background `#FFFFFF`, 1px solid `#CBD5E1`, height 36px for dense forms. Padding `0.5rem 0.75rem`. Text `body-md` in `#0F172A`.
- Active focus: Border `#EA580C` with box-shadow `0 0 0 3px rgba(234, 88, 12, 0.15)`.
- Global Navigation Search (Midnight Shell): Inset background `#1C2541`, placeholder `#94A3B8`, border 1px solid `#3A506B`, text `#FFFFFF`.

### Checkboxes & Radio Controls
- Base: 16px x 16px square (checkbox) or circle (radio), 1px solid `#CBD5E1`, background `#FFFFFF`.
- Checked: Background `#EA580C`, border `#EA580C`, white glyph checkmark.

### Cards & Data Tables
- Table header: `#F8FAFC`, text uppercase `label-sm` in `#64748B`, height 36px, border-bottom 1px solid `#E2E8F0`.
- Table row: `#FFFFFF`, hover `#F8FAFC`, height 48px (dense) or 56px (standard), bottom border 1px solid `#F1F5F9`. Selected row: `#FFF7ED` (5% tint of Solar Orange) with a 2px vertical indicator in `#EA580C` along the left edge.

### Customer Triage Drawers & Conversation Threads
- **Public Customer Message**: Card container with white background and `#E2E8F0` border.
- **Internal Private Note**: Card container with `#FFFBEB` background, border 1px solid `#92400E`, header containing a lock icon and "Internal Note — Hidden from Requester" banner in `#78350F`.