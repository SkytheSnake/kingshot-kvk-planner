# Kingshot KvK Planner — COMPLETE GitHub Package

This is the consolidated release package. It replaces the previous piecemeal update ZIPs.

## Upload to GitHub

Upload **all files in this folder to the root of your GitHub Pages repository**.

Your repo should contain:

- `index.html`
- `admin.html`
- `style.css`
- `app.js`
- `admin.js`
- `config.js`
- `translations.js`
- `manifest.webmanifest`
- `service-worker.js`
- `pwa-init.js`
- `favicon.ico`
- `favicon-32.png`
- `apple-touch-icon.png`
- `icon-192.png`
- `icon-512.png`
- `icon-maskable-512.png`
- `.nojekyll`
- `kingshot-kvk-planner-supabase-master.sql` (reference/master database setup)

## Player features

- Kingshot Player ID login/recovery.
- Saved player name and alliance between KvKs.
- Fresh resource snapshot required after each owner reset.
- Tracks Truegold and General / Research / Training / Construction speed ups.
- Players choose 3–5 equally acceptable slots.
- Resubmitting replaces that day's previous pending choices.
- Public slot activity shows player name + alliance, not private resource totals.
- Confirmed appointment banner.
- Monday: City Construction / Chief Minister.
- Tuesday: Basic Skills / Chief Minister.
- Thursday: Hero Development / Noble Advisor.
- Monday/Tuesday Chief Minister crossover handled as one appointment.
- Points tips by KvK day.
- Live deadline countdown.
- Deadlines:
  - Monday appointments → Sunday 20:00 UTC
  - Tuesday appointments → Monday 20:00 UTC
  - Thursday appointments → Wednesday 20:00 UTC
- 28-day KvK cycle anchored to Monday 10 August 2026.
- Finalised days become read-only.
- Mobile-friendly layout with profile/My Requests in the left rail on larger screens.
- Day tabs show weekday + actual KvK date.

## Admin features

- Owner / King / Minister admin roles.
- Search by player name or Player ID.
- Alliance filter.
- Applicant sorting by best fit, name, alliance and individual resources.
- Private resource totals.
- Resource freshness timestamps.
- Private admin notes.
- Award slots.
- Reject requests with optional reason.
- Rejection log.
- Needs Attention list for rejected players not marked contacted.
- Mark rejected players as contacted.
- Manual player booking without the player logging in.
- Duplicate/conflict protection.
- Admin activity log.
- Undo last reversible admin action.
- Finalise a day.
- Owner-only reopen day.
- Owner-only KvK archive/history.
- Owner-only full KvK reset.

## Themes

- Pink
- Purple
- Teal
- Green
- Blue

The player page also has coloured circular theme selectors.

## Languages

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

## PWA / app features

- Website favicon.
- iPhone Home Screen icon.
- Android/Desktop PWA icons.
- PWA manifest.
- Service worker.
- Install App button where supported.
- Add to Home Screen guidance on iPhone/iPad.
- Custom launch/splash experience.
- Standalone app display when installed.

## Supabase

The included `kingshot-kvk-planner-supabase-master.sql` is your single master SQL reference going forward.

If your current database is already working, **do not repeatedly run migrations from old ZIPs**. Keep the master file as the canonical reference.

## Current release cache version

`20260810-complete-release`


## v2 presentation tweak

- Profile/resource popup is delayed by 1.8 seconds so the splash screen can be seen first.
- Install App / Add to Home Screen button has been moved from the top header to a dedicated footer section at the bottom of the website.

Cache version: `20260810-complete-v2`


## v3 splash/profile timing update

- Profile/resource popup now waits **3 seconds** before opening.
- Splash branding simplified to **1423 KvK Planner**.
- Removed the splash tagline.

Cache version: `20260810-complete-v3`
