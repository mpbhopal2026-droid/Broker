# Branding — Global Forex

## Using your real logo file

The SVGs in `apps/client/public/icons/` are a **drawn approximation** of your
logo (globe, GF monogram, rising arrow, candlesticks, navy `#1e5aa8` and green
`#2f8f3c`). To use the actual artwork, drop your file in and point the app at it.

**1. Save the files**

```
apps/client/public/icons/logo.png     your full logo  (512×512 or larger, transparent)
apps/client/public/icons/mark.png     square crop of just the globe+GF, no wordmark
apps/admin/public/icons/              copy the same two files here
```

The full logo includes the "GLOBAL FOREX" wordmark, which is unreadable below
about 100px. Anywhere small — the favicon, the sidebar, the app icon — needs the
**square mark without text**. That is why there are two files.

**2. Point the UI at them**

Replace `/icons/favicon.svg` with `/icons/mark.png` in:

- `apps/client/src/components/layout/AppSidebar.tsx`
- `apps/admin/src/components/layout/AppSidebar.tsx`
- `apps/admin/src/components/layout/AdminSidebar.tsx`
- `apps/client/src/app/layout.tsx` (the `icons` metadata block)

**3. Or set it from the admin panel**

`app_settings.logo_url` and `favicon_url` are already editable in admin settings.
Upload to the `public-assets` bucket and paste the URL — no redeploy needed.

Keep an SVG favicon if you can. PNG favicons look soft on high-DPI screens, and
SVG scales to every size from one file.

## Colours

Taken from your logo:

| Token | Value | Use |
|---|---|---|
| Navy | `#1e5aa8` → `#123f7d` | Globe, wordmark, primary |
| Green | `#3faa4a` → `#2f8f3c` | Arrow, candlesticks, accent, "Forex" |
| Dark | `#0b1220` | Favicon tile background |

These are set as the defaults in `app_settings` (`primary_color`,
`accent_color`) and can be changed from the admin panel without a deploy.

## Where the name comes from

Nothing is hardcoded any more. `app_settings` drives the app name, short name,
tagline, logo, colours, contact details and email sender name. The strings in
the code are only fallbacks for when the database has not answered yet.

To rename the whole platform: admin settings → change `app_name`. Done.

## Theme

The design ships **white by default**, with dark available. Users switch it from
the header; the choice is saved per browser.

`globals.css` defines both palettes as CSS variables (`:root, .light` and
`.dark`). Do not put `bg-` or `text-` Tailwind utilities on `<body>` — a utility
(specificity 0,1,0) outranks the bare `body` rule (0,0,1) that reads those
variables, which silently pins the app to one theme and makes the toggle appear
broken. That bug has been fixed twice already.
