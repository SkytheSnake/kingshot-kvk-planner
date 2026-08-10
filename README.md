# Kingshot KvK Planner — Hotfix 20260810-1236

This fixes the issue where the app showed:

`Cannot set properties of null (setting 'textContent')`

and stopped before rendering any slots.

It also fixes the profile-gate sections appearing at the same time. CSS now forces `[hidden]` sections to stay hidden.

## What should now happen

Before a profile is loaded:
- Profile status says Profile Required.
- The Complete Profile gate is visible.
- The slot selection controls are hidden.
- The schedule slots themselves are still visible.

After an existing Player ID is entered or a new profile is saved:
- Profile status changes to alliance · player name · Player ID.
- The Complete Profile gate disappears.
- The 3–5 selection controls appear.
- Existing profile/resources are loaded.
- All 49 slots render normally.

## Upload

Replace ALL current site files with these versions:
- index.html
- admin.html
- style.css
- config.js
- translations.js
- app.js
- admin.js
- README.md

The HTML uses cache-busting query strings so GitHub Pages should not mix old JavaScript with new HTML.

No Supabase changes are needed.
