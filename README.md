# Kingshot KvK Planner — v3

This version changes slot requesting to a checkbox/multi-select flow and saves player resources once in a reusable KvK profile.

## Main changes

### 1. Select 3–5 slots
Players no longer rank 1st/2nd/3rd choices.

For each day they:
- tick at least **3**
- tick no more than **5**
- submit all selected times together

All selected times are treated equally as acceptable backup options.

Confirmed/full slots are disabled.

### 2. Saved KvK profile
Players enter this once:
- Player ID
- Player name
- Alliance
- Truegold
- General speed-ups
- Research speed-ups
- Training speed-ups
- Construction speed-ups

That resource snapshot is reused when requesting Monday, Tuesday and Thursday slots.

### 3. Admin allocation
Admin view still lets the King/Minister of Justice:
- open a slot
- compare applicants
- see resource totals
- award one player
- reject requests

When someone is awarded a slot for a day, their other pending requests for that same day are automatically withdrawn.

## Alliances
- PAR
- VIK
- KCB
- FOR

## Days
- Monday — City Construction — Chief Minister
- Tuesday — Basic Skills — Chief Minister
- Thursday — Hero Development — Noble Advisor

Monday and Tuesday still share the Monday 23:45 → Tuesday 00:15 Chief Minister crossover slot.

## Important
This is still a browser-only prototype using localStorage.

The next stage is:
1. Supabase shared database
2. proper admin authentication/permissions
3. player profile storage
4. Kingshot Player ID lookup if a reliable endpoint is available
5. sign-up deadline/resource locking
