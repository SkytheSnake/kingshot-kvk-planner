# Kingshot KvK Planner — Admin & 4-week cycle upgrade

This bundle adds the new admin and deadline features to the clean rebuild.

## New features

### Manual admin bookings
On the admin page, click any slot and choose **Add player manually**.

You can enter:
- Player ID
- Player name
- Alliance

The player does not need to log into the planner. The admin booking is immediately confirmed.

### Rejection log
Rejecting an application now goes through a database function that automatically adds it to the admin **Rejection Log**.

The log stores:
- Player ID
- Player name
- Alliance
- Day / slot
- Rejection time
- Optional reason
- Whether someone has contacted them

Admins can click **Mark contacted**.

### Owner-only reset
Only an `owner` admin sees the **Reset KvK** button.

It requires typing `RESET`.

The reset:
- deletes appointments
- deletes slot requests
- clears rejection history
- keeps player profiles/Player IDs
- resets saved resource totals to zero so players provide a fresh snapshot for the next KvK

### 4-week deadline cycle
The cycle is anchored to this KvK beginning Monday 10 August 2026 and repeats every 28 days.

Player application deadlines are always:
- Monday appointments → Sunday 20:00 UTC
- Tuesday appointments → Monday 20:00 UTC
- Thursday appointments → Wednesday 20:00 UTC

The UI disables requests after the deadline, and Supabase enforces the same deadline server-side.

Admins can still manually assign players after a player deadline has closed.

## Required Supabase step

Run:

`supabase_admin_cycle_upgrade.sql`

once in Supabase SQL Editor.

It is a migration for the existing project; it does not delete your current data when installed.

## GitHub

Replace:
- index.html
- admin.html
- style.css
- translations.js
- app.js
- admin.js
- README.md

Keep your current `config.js` if you prefer; the included one points to the same project.

Cache version: `20260810-1405-admincycle`
