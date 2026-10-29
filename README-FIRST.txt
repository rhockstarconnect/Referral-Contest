RHockstar Connect Referral Contest — corrected participant flow

WHAT THIS VERSION DOES
- No participant email/password/account.
- Participant enters name and original Rhockstar Connect referral link.
- Backend creates a unique code and saves the entry in Firestore collection participants.
- /r/CODE increments clicks on the server and redirects to the original referral link.

SETUP
1. Back up the current GitHub files first. This package does not delete Firestore data.
2. Copy these files into the root of the existing GitHub repository, preserving the netlify/functions folder.
3. In Firebase Console, open project rcreferral-contest > Project settings > Service accounts. Obtain a service account JSON securely. Never commit it to GitHub or put it in app.js.
4. In Netlify > Project configuration > Environment variables, add FIREBASE_SERVICE_ACCOUNT_JSON with the full JSON contents as its value.
5. Ensure that service account can access Firestore.
6. Deploy. Your currently reported Netlify credit pause must be resolved before a new production deployment can publish.
7. Test using a real HTTPS referral link from rhockstarconnect.com. Submit the form, open the generated link, confirm redirect, then check participants/{code} in Firestore for an increased clicks value.

DATA
This writes new documents to participants/{trackingCode} with name, originalLink, referralCode, clicks, registrations, status, submittedAt. It does not delete participants, leaderboard, settings, or contestUsers collections.

LIMITS
- Click tracking is implemented in the server function.
- Verified registrations are NOT implemented. To count actual Rhockstar Connect registrations, the Rhockstar Connect backend must securely notify this contest backend.
- This package does not yet include a protected admin dashboard or public leaderboard.
- The validation assumes official referral links use rhockstarconnect.com or its subdomains. Change validation in app.js and both function files if the official link domain differs.
