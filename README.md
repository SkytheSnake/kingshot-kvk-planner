# Kingshot KvK Planner — Supabase shared version

1. Run `supabase_patch.sql` in Supabase SQL Editor.
2. Enable Anonymous Sign-Ins in Supabase: Authentication → Sign In / Providers → Anonymous.
3. Upload `index.html`, `admin.html`, `style.css`, `config.js`, `app.js`, and `admin.js` to GitHub.
4. The old `script.js` is no longer used and can be deleted.

The publishable key in `config.js` is browser-safe with RLS enabled. Never add a Secret key or service_role key to GitHub.

Players use anonymous Supabase sessions so they do not need email accounts. Admins use the protected `admin.html` login.
