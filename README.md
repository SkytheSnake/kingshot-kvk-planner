# KvK Planner — Strong Themes + Public Pending Requests

## Changes

### Stronger themes
The four theme options now change much more than the button colour:

- Pink — dark neon pink / berry
- Purple — deeper synthwave violet
- Teal — cyber teal / aqua
- Green — dark terminal / emerald

Each theme changes the page background, header, panels, borders, slots, controls, glows and accents while keeping the planner layout identical.

### Pending requests visible to players
Players can now see who else has requested a slot.

Example:
`KCB Sky   VIK Nicky Boy    2 Pending`

Only these public details are returned:
- player name
- alliance
- requested slot
- pending/confirmed status

Resource totals remain admin-only.

## Supabase step REQUIRED

Run `public_pending_requests.sql` once in Supabase SQL Editor.

## GitHub upload

Replace:
- index.html
- admin.html
- style.css
- app.js
- admin.js
- README.md

Keep:
- config.js
- translations.js

No existing tables need deleting.
