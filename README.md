# Kingshot KvK Planner — UX & Admin upgrade

Adds the requested quality-of-life features, excluding:
- CSV/export
- copy-to-clipboard schedule
- Discord/contact field
- fairness indicator

## Player additions
- Prominent confirmed-appointment banner.
- Live countdown to the application deadline.
- Clear warning when resubmitting will replace current pending choices.
- Resource freshness timestamp.
- Finalised days become read-only.
- Mobile sticky booking panel / larger submit target.

## Admin additions
- Search by player name or Player ID.
- Alliance filter.
- Applicant sorting by best fit, name, alliance or individual resource type.
- Admin note on each player.
- Resource freshness shown beside applicant resources.
- Conflict protection for duplicate confirmed appointments.
- Admin activity log.
- Undo last reversible admin action.
- Needs Attention section for rejected applicants not yet contacted.
- Finalise day button.
- Owner-only Reopen day button.
- Owner-only KvK archive/history.
- Owner-only reset still works and reopens all days for the next cycle.

## Supabase
Run `supabase_ux_admin_upgrade.sql` once.

After it succeeds, replace your saved master query with the included updated
`kingshot-kvk-planner-supabase-master.sql`.

## GitHub
Replace:
- index.html
- admin.html
- style.css
- translations.js
- app.js
- admin.js

Cache version: 20260810-1500-uxadmin
