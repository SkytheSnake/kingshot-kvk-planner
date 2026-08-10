# Kingshot KvK Planner — v2

This version adds the request/allocation workflow.

## Days and positions

### Monday — City Construction
- Position: Chief Minister
- Starts Sunday 23:45 UTC
- 30-minute slots
- Final Monday slot is Monday 23:45 → Tuesday 00:15

### Tuesday — Basic Skills
- Position: Chief Minister
- First slot is the same linked Monday 23:45 → Tuesday 00:15 booking
- 30-minute slots thereafter

### Thursday — Hero Development
- Position: Noble Advisor
- Starts Wednesday 23:45 UTC
- 30-minute slots

## Alliances
- PAR
- VIK
- KCB
- FOR

## New booking flow
Players submit a **request**, not an automatic booking.

A request stores:
- Player ID
- Player name
- Alliance
- Backup priority
- Truegold
- General speed-ups
- Research speed-ups
- Training speed-ups
- Construction speed-ups

Players can request multiple slots and rank them as 1st/2nd/3rd choice.

Admin view lets the King/Minister of Justice:
- open a slot
- compare applicants and resources
- award the slot
- reject a request

When a slot is awarded, the winning player's other pending requests for that same day/position are withdrawn automatically.

## Important: this is still a local prototype
This version still uses `localStorage`, so data is only saved in the browser being used.

The next stage is to connect the planner to Supabase (shared database) and then connect Player ID lookups to a Kingshot player API if a reliable endpoint is available.

## Replace your existing GitHub files
Upload these files over the top of the current versions:
- `index.html`
- `style.css`
- `script.js`
- `README.md`

GitHub Pages will redeploy automatically after you commit the changes.
