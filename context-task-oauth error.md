Task 26 — Google OAuth Popup UX and Session Transfer

Context
- Repo: PileBintang (Electron + React). Router uses `MemoryRouter`.
- Supabase: `https://cikhrockryhbgeefhhec.supabase.co` (supabase-js client in `src/renderer/lib/supabase.js`).
- Goal: Close OAuth popup reliably and set session in main window.

Observed Symptoms
- Initial: After Google login, the popup navigates to the app home and stays open; main window remains unauthenticated.
- Popup console (when app loaded in popup):
  - 400/406/401/500 errors on Supabase endpoints.
  - RLS errors and missing columns (side-effect of loading the app unauthenticated inside the popup).
- With deep link redirect (`pilebintang://auth-callback`): popup closed but renderer saw `OAuth failed to load: ERR_CONNECTION_REFUSED`.
- With in-app HTTP callback (`http(s)://…/auth/callback`): popup loaded the app and did not close.

Changes Implemented
1) Main process: `src/main/main.ts`
   - Added robust callback detection and closing:
     - `will-navigate`, `will-redirect`, `did-redirect-navigation` → detect `/auth/callback`, custom scheme, `access_token`, or `code`; close popup and resolve with URL.
     - `did-navigate` fallback: if popup navigates to app origin (`file:`, `local:`, `localhost`, `127.0.0.1`) → close and resolve last auth URL.
   - Custom scheme handling:
     - `app.on('open-url')` (macOS) to capture `pilebintang://auth-callback` and resolve.
     - `setWindowOpenHandler` in popup: intercept `pilebintang://` and resolve (deny new window).
     - `did-fail-load` and `did-fail-provisional-load`: if `validatedURL` starts with `pilebintang://`, treat as success instead of error; otherwise log and ignore (no reject).
   - Safety timeout (2 minutes) to avoid hanging.

2) Renderer: `src/renderer/context/AuthContext.js`
   - `signInWithGoogle()` now chooses redirect target by environment:
     - Dev (http/https origin): `window.location.origin + '/auth/callback'` (in-app callback).
     - Prod (file protocol): `pilebintang://auth-callback` (custom deep link).
   - Uses PKCE (`flowType: 'pkce'`).
   - After popup resolves, parses callback URL:
     - If tokens present → `supabase.auth.setSession({ access_token, refresh_token })`.
     - If only `code` present → `supabase.auth.exchangeCodeForSession(authCode)`.

Current Status
- With deep link in dev: popup closes; renderer still reports `{ success: false, error: 'OAuth failed to load: ERR_CONNECTION_REFUSED' }` (Chromium result when navigating to a custom scheme that the OS doesn’t handle in dev). Main now ignores benign load failures and should resolve on `pilebintang://`; still seeing `success: false` in renderer.
- With in-app HTTP callback in dev: popup navigates to app and triggers Supabase fetches in the popup; closing did not consistently trigger (still seeing app load inside popup with 400/406/401/500 errors).

Working Hypotheses
- Custom scheme not registered system-wide in dev, so Chromium emits `ERR_CONNECTION_REFUSED` before `open-url` runs. We added multiple fallbacks, but we may need OS-specific handling for Windows/Linux (argv via `second-instance`) and to verify macOS registration works for the dev run.
- For in-app HTTP callback, the origin detection may miss certain dev host/port combinations; need to ensure hostname/port checks cover actual value (e.g., `localhost:1212`).
- Supabase dashboard must include both redirect URIs in “Allowed Redirect URLs”:
  - `pilebintang://auth-callback`
  - `http://localhost:1212/auth/callback` (and/OR the actual dev URL)
- Confirm supabase-js version supports `auth.exchangeCodeForSession(authCode)` in our setup.

Actionable TODOs
1) Deep link reliability
   - macOS: Verify `app.setAsDefaultProtocolClient('pilebintang')` succeeds at runtime; log result and any errors.
   - Windows/Linux: Add deep-link handling via `app.requestSingleInstanceLock()` and `second-instance` event (parse argv for `pilebintang://…`), then route to the same resolver path and close popup.
   - Add explicit logs for every popup event handler (will/did-redirect, did-fail-load/provisional, setWindowOpenHandler, open-url) including the URL and whether we resolved/closed.

2) Dev HTTP callback close behavior
   - Expand app-origin detection to handle `http(s)` with port and path; currently checks `hostname === 'localhost' || '127.0.0.1'`. Add explicit detection for `parsedUrl.origin === window.location.origin` style logic if possible.
   - Add a quick one-time JS injection on load to postMessage back, or intercept navigation to our `/auth/callback` path and close immediately (we already check path; ensure it matches the exact dev path).

3) Supabase configuration
   - Ensure Supabase project “Allowed Redirect URLs” includes:
     - `pilebintang://auth-callback`
     - Dev callback URL actually used by the app (e.g., `http://localhost:1212/auth/callback`).
   - Confirm PKCE flow is enabled/supported and `exchangeCodeForSession` matches our supabase-js version.

4) Renderer improvements
   - Log the `callbackUrl` returned to the renderer (mask sensitive values) to confirm which path resolved.
   - If `success === false`, display the raw `error` and advise retry or switching redirect mode.
   - Provide a manual “Paste callback URL” debug input to complete session exchange if a user gets the URL from external logs (optional).

5) Packaging note
   - For production, deep link is the recommended path; it keeps the web app from loading in the popup and is most reliable when the scheme is registered by the OS installer.

Open Questions
- Which OS are we targeting right now (macOS vs Windows/Linux)? Deep link handling differs.
- Which dev URL/port is actually used for `/auth/callback`? Ensure origin/path match our close conditions.
- supabase-js version (to confirm `exchangeCodeForSession` signature).

How to Resume
- Re-run Google sign-in and capture logs:
  - Main process: which event handler fired last and which URL it saw.
  - Renderer: `OAuth result` object (whether `callbackUrl` is present), and any errors from `exchangeCodeForSession`.
- If on Windows/Linux, I will add argv deep link handling next.

References (Key Files)
- `src/main/main.ts` — Popup + deep link handling (event hooks, close/resolve logic).
- `src/renderer/context/AuthContext.js` — OAuth start, redirect target selection (dev vs prod), session exchange.
- `src/renderer/pages/Auth/OAuthCallback.jsx` — Visual callback route (used for HTTP dev flow).

