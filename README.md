# Kingshot KvK Planner — clean rebuild

This is the consolidated version rebuilt from scratch after the earlier hotfixes.

## Current behaviour

- Server 1423 shown in the header.
- Alliances: PAR, VIK, KCB, FOR.
- Profile status is centred and prominent.
- Language, theme, My KvK Profile and Admin Login stay compact on one row on desktop.
- Dark retro themes: Pink, Purple, Teal, Green.
- Language support: English, Traditional Chinese, French, German, Spanish, Turkish, Dutch, Italian, Korean, Japanese, Filipino.
- Player ID recovery/claiming.
- Saved profile/resources across KvK days.
- Monday: City Construction / Chief Minister.
- Tuesday: Basic Skills / Chief Minister.
- Thursday: Hero Development / Noble Advisor.
- 30-minute slots starting at 23:45.
- Monday 23:45 → Tuesday 00:15 and Tuesday's first slot are the same Chief Minister appointment.
- Players must choose 3–5 acceptable slots.
- Everyone can see pending player names/alliance on slots.
- Only admin users can see resource totals.
- Separate admin page with owner / King / Minister roles.
- Admins can review applicants, award slots and reject requests.
- Theme and language choices are remembered in the browser.

## GitHub

Replace your site with these files:
- index.html
- admin.html
- style.css
- config.js
- translations.js
- app.js
- admin.js
- README.md

Do not keep an old `script.js`.

## Supabase

Your existing project should already contain the main tables/functions.

The included `supabase_public_activity.sql` is safe to run again if needed. It creates/replaces the public pending-request function and reloads the PostgREST schema cache.

## Admin usernames

The admin page accepts either a real email address or a simple username.

For example:
`king`

is internally converted to:
`king@kvk-planner.local`

So that Supabase Auth user must exist, and its UID must also be present in `public.admin_users` with role `king`.

## Not included yet

- Kingshot API / automatic name refresh from Player ID.
- Signup deadline/resource-lock controls.

Cache version: `20260810-1344-clean`
