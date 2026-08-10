# Kingshot KvK Planner — Player ID return-login update

This version fixes the issue where a returning player saw “Player ID already registered” after losing their anonymous browser session.

## Required Supabase change

Before uploading these files, run the `claim_player_profile` SQL function in Supabase SQL Editor.

The player flow is now:

1. Enter Player ID.
2. Existing Player ID → profile is claimed by the current browser session and loaded automatically.
3. New Player ID → the full profile/resource form appears.
4. The player can then request 3–5 slots as normal.

There is no player password/PIN because this planner treats Player IDs and resource information as non-private for this use case.

## GitHub files to replace

Upload these files over the current versions:

- `index.html`
- `style.css`
- `app.js`
- `README.md`

You do NOT need to replace:
- `admin.html`
- `admin.js`
- `config.js`

Those are unchanged.

## Admin security

The admin area remains protected by Supabase Auth and the `admin_users` table.
