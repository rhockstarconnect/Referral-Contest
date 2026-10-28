RHockstar Connect Referral Contest — starter

IMPORTANT
- This starter uses a NEW Firestore collection named contestUsers.
- It does not change the existing participants, leaderboard, or settings collections.
- Referral clicks and successful registrations are not yet counted by a trusted backend.
- Do not deploy firestore.rules to your existing project without reviewing current rules; rules are database-wide and could affect existing app functionality.
- Do not put Firebase Admin credentials or service account JSON in app.js.

STEP 1 — Firebase web app configuration
The configuration you supplied for rcreferral-contest has already been inserted into app.js.

STEP 2 — Enable Authentication
1. Firebase Console > Build > Authentication > Get started.
2. Open Sign-in method.
3. Enable Email/Password and save.

STEP 3 — Firestore
The app uses Firestore collection contestUsers. Do not delete existing collections.
Before deploying any rules, export/record your current rules and have your CTO review them. The rules file here is a starting example, not a safe drop-in replacement for existing production rules.

STEP 4 — Run locally
Use a local development server (for example VS Code Live Server). Do not open index.html directly as a file:// URL, because browser module imports may fail.
You can also deploy to a test site on Netlify after adding the config.

CURRENTLY IMPLEMENTED
- Email/password account creation and login
- Participant profile stored in contestUsers
- Unique-looking referral code and shareable URL
- Participant dashboard shell and copy-link button
- Reads profile values from Firestore on login

NOT IMPLEMENTED YET
- Actual click event tracking
- Verified registration callbacks from Rhockstar Connect
- Live Firestore listeners for counters
- Admin authentication/roles and count-adjustment interface
- Leaderboard ranking
These require trusted backend functions and carefully configured security rules. The browser must never be allowed to set its own clicks, registrations, or admin role.
