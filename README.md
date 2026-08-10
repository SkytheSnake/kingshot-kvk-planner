# apFor hotfix

This fixes the JavaScript error:

`apFor is not defined`

The public pending-request code had lost the helper that looks up confirmed appointments.

## GitHub

Replace only:
- `app.js`
- `index.html`

No Supabase changes are needed for this hotfix.

Cache-bust version: `20260810-1332-apfor`
