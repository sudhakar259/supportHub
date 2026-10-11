{{--
    Product palette for the generated API reference
    (design/solar_navy_enterprise/DESIGN.md, docs/color-palette.md).
    Scribe's default "slate" theme uses plain grays and the CSS names red/green/blue/black for
    its badges; this recolors it to the product's roles without touching Scribe's own files,
    so a regenerated page (and a Scribe upgrade) keeps the palette.
--}}
<style>
    :root {
        --primary: #a33900;
        --primary-hover: #cc4900;
        --inverse-surface: #213145;
        --on-surface: #0b1c30;
        --on-surface-variant: #5a4138;
        --surface: #f8f9ff;
        --surface-container-low: #eff4ff;
        --surface-container: #e5eeff;
        --outline: #8e7166;
        --success: #15803d;
        --warning: #92400e;
        --info: #1d4ed8;
        --error: #ba1a1a;
    }

    /* Page, text and links */
    body, .page-wrapper { background-color: var(--surface); }
    body, .content, .content p, .content li, .content td { color: var(--on-surface); font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .content h1, .content h2, .content h3, .content h4, .content h5, .content h6 { color: var(--on-surface); }
    .content h1 { border-bottom-color: var(--surface-container); }
    .content a, .content a:visited { color: var(--primary); text-decoration: underline; }
    .content a:hover, .content a:focus { color: var(--primary-hover); }
    .content hr { border-top-color: var(--primary); border-bottom-color: var(--surface-container); }
    .content table th { color: var(--on-surface-variant); }
    .content table tr:nth-child(odd) > td { background-color: var(--surface-container-low); }
    .content table tr:nth-child(even) > td { background-color: var(--surface); }
    .content code { color: var(--on-surface); }

    /* Sidebar */
    .tocify-wrapper { background-color: var(--inverse-surface); }
    .tocify-wrapper > .logo { display: block; width: 174px; height: 48px; margin: 12px auto; padding: 0 !important; }
    .tocify-wrapper > .search input { background: var(--on-surface); border-color: var(--outline); color: #eaf1ff; }
    .tocify-wrapper .tocify-subheader { background-color: var(--on-surface); }
    .tocify-wrapper .tocify-focus { background-color: var(--on-surface); box-shadow: inset 3px 0 0 var(--primary-hover); color: #fff; }

    /* Right-hand example panel and code */
    .page-wrapper .dark-box { background-color: var(--inverse-surface); }
    .content pre, .content blockquote, .content .annotation, .highlight, .highlight .w { background-color: var(--on-surface); }
    .page-wrapper .lang-selector { border-bottom-color: var(--inverse-surface); }
    .lang-selector button.active { background-color: var(--inverse-surface); }

    /* Notices: the semantic containers, each with its own readable text color */
    .content aside, .content aside.notice { background: var(--on-surface); }
    .content aside.info { background: #eff6ff; color: #1e40af; text-shadow: none; }
    .content aside.warning { background-color: #fffbeb; color: #78350f; text-shadow: none; }
    .content aside.success { background-color: #dcfce7; color: #14532d; text-shadow: none; }

    /* HTTP method and requirement badges (Scribe: GET=green, POST=black, PUT=darkblue, PATCH=purple, DELETE=red) */
    .badge.badge-green { background-color: var(--success); }
    .badge.badge-black { background-color: var(--inverse-surface); }
    .badge.badge-darkblue { background-color: var(--info); }
    .badge.badge-purple { background-color: var(--warning); }
    .badge.badge-red { background-color: var(--error); }
    .badge.badge-darkred { background-color: var(--primary); }
    .badge.badge-blue { background-color: var(--info); }
    .badge.badge-darkgreen { background-color: var(--success); }
    .badge.badge-darkgoldenrod { background-color: var(--warning); }
    .badge.badge-grey { background-color: var(--outline); }
</style>
