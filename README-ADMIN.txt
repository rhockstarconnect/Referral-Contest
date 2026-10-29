ADMIN SIDE SETUP
1. Copy admin.html and admin.js into the root of the same website repository.
2. Copy netlify/functions/admin.mjs into the existing netlify/functions folder.
3. Add the /api/admin redirect from netlify.toml to your EXISTING netlify.toml. Do not overwrite your current file because it also needs the register-referral and /r/* redirects.
4. In admin.js, replace PASTE_YOUR_FIREBASE_WEB_API_KEY with the Firebase Web API key from Firebase Console > Project settings > General > your web app.
5. Ensure Firebase Authentication Email/Password is enabled and the admin user akusu2841@gmail.com exists. The server checks that exact email.
6. In Netlify environment variables, set FIREBASE_SERVICE_ACCOUNT_JSON to the full private service-account JSON for project rcreferral-contest. Never commit that secret to GitHub or put it in admin.js.
7. Deploy when Netlify allows production deployments. Your team previously showed a credit limit pause.

CONTROLS: prizes, contest title, announcement/rules, open-entry setting, leaderboard setting, search participants, edit name/link/clicks/registrations/status, delete entries, CSV export.
DATA: reads/writes existing participants collection; settings stored at settings/contest. Does not delete collections. Clicks/registrations changed manually are editable. Registration verification and public leaderboard rendering still need separate integration.
