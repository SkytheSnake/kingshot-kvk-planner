# Kingshot KvK Planner — Theme Selector Update

Adds a colour-theme dropdown beside the language selector on both the player planner and admin page.

Themes:
- Pink
- Purple
- Teal
- Green

The selected theme is saved in the browser and stays selected on future visits.

This update keeps all existing functionality:
- profile gate
- Player ID recovery
- shared Supabase bookings
- 3–5 slot requests
- translations
- admin dashboard
- retro dark styling

## Upload to GitHub

Replace:
- index.html
- admin.html
- style.css
- app.js
- admin.js
- README.md

You can keep your current:
- config.js
- translations.js

The HTML has cache-busting version `20260810-1247-theme` to avoid GitHub Pages serving mixed old/new files.

No Supabase changes are needed.
