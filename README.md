# Kingshot KvK Planner

A simple GitHub Pages planner for Kingshot KvK Chief Minister bookings.

## Current schedule logic

- Monday — City Construction
  - starts Sunday at 23:45 UTC
  - 30-minute slots
  - final Monday slot is Monday 23:45 → Tuesday 00:15

- Tuesday — Basic Skills
  - first slot is the **same linked booking** as Monday 23:45 → Tuesday 00:15
  - then continues in 30-minute slots

- Thursday — Hero Development
  - starts Wednesday at 23:45 UTC
  - 30-minute slots

## Important

This starter version saves bookings in the user's browser using `localStorage`.

That means it is ideal for testing the layout and schedule, but bookings are **not yet shared between different players/devices**.

For a live kingdom-wide booking system, connect it to a shared database such as Supabase or Firebase.

## Publish on GitHub Pages

1. Upload `index.html`, `style.css`, and `script.js` to the repository.
2. Commit the files.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select `main` and `/ (root)`.
6. Save.

The site will then be available from your GitHub Pages address.
