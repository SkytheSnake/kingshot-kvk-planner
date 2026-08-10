# Kingshot KvK Planner — Complete Consolidated Bundle

This is the clean rebuilt version containing all current changes in one bundle.

## Included features

- Dark retro visual design with pink/purple/cyan accents
- No cartoons or decorative character graphics
- Existing planner layout preserved
- Monday — City Construction — Chief Minister
- Tuesday — Basic Skills — Chief Minister
- Thursday — Hero Development — Noble Advisor
- 30-minute slots
- Monday starts Sunday at 23:45 UTC
- Monday 23:45 → Tuesday 00:15 is one shared Chief Minister crossover slot
- Player profile gate before booking
- Player ID return/profile recovery
- Saved resource profile
- Alliances: PAR, VIK, KCB, FOR
- Players select 3–5 acceptable slots
- Confirmed slots are disabled
- Supabase shared database
- Separate protected admin page
- Owner / King / Minister admin roles
- Admin can compare resources, award slots, and reject requests
- Username-style King/Minister login supported by mapping `king` → `king@kvk-planner.local` etc. once those Supabase users exist
- Language selector on player and admin pages
- Languages:
  - English
  - Traditional Chinese
  - French
  - German
  - Spanish
  - Turkish
  - Dutch
  - Italian
  - Korean
  - Japanese
  - Filipino

## GitHub files

Upload all of these to the root of your repository:

- `index.html`
- `admin.html`
- `style.css`
- `config.js`
- `translations.js`
- `app.js`
- `admin.js`
- `README.md`

You do not need an old `script.js`.

## Supabase

Your existing Supabase project should already contain the database/functions we built during setup.

`supabase_setup_fresh.sql` is included only as a clean reference for rebuilding a brand-new Supabase project in future. Do **not** run it over your current working database unless you intentionally want to rebuild from scratch.

Anonymous Sign-Ins must remain enabled for normal players.

## Admin usernames

The admin page accepts either an email address or a username.

For example, typing:

`king`

is sent to Supabase as:

`king@kvk-planner.local`

So once you create that Supabase user and add its UID to `admin_users` with role `king`, the King can simply use the username `king` plus their password.

The same applies to `minister`.

Your existing owner account can continue using your real email address.

## Still future work

- Kingshot API / automatic player-name refresh
- Admin controls for resource-lock/sign-up deadlines
- Any additional KvK event days you later decide to add
