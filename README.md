# Resource refresh fix

This fixes the behaviour after **Reset KvK**.

## New behaviour

After the owner resets KvK:

1. Appointments, requests and rejection history are cleared.
2. Saved resource totals are reset to zero.
3. Player IDs / names / alliances remain saved.
4. Every saved player profile is marked as needing a fresh resource snapshot.
5. When that player next enters their Player ID, the planner immediately opens their profile and asks them to update their resources.
6. They cannot request appointment slots until the refreshed resource snapshot is saved.
7. Saving the profile clears the refresh flag and unlocks slot requests.

## Required Supabase step

Run:

`supabase_resource_refresh_fix.sql`

once.

Because the reset has already been tested, that migration deliberately marks all currently saved profiles as needing a new resource snapshot.

## GitHub

Replace:
- index.html
- app.js
- README.md

No changes are needed to admin.html/admin.js/style.css for this fix.

A refreshed canonical master SQL file is also included for future reference.

Cache version: 20260810-1428-resource-refresh
