/* Deploy from your Firebase project's functions directory.
 * npm install firebase-admin firebase-functions
 * firebase deploy --only functions:listAuthUsers
 * Only the exact verified administrator email below is allowed.
 * Never place Admin SDK credentials or service-account keys in browser code.
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
initializeApp();
const ADMIN_EMAIL = "gerardogala1959@gmail.com";
exports.listAuthUsers = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in is required.");
  const email = (request.auth.token.email || "").toLowerCase();
  const emailVerified = request.auth.token.email_verified === true;
  if (email !== ADMIN_EMAIL.toLowerCase() || !emailVerified) throw new HttpsError("permission-denied", "Only the authorized, verified administrator account may list users.");
  const allUsers = []; let pageToken;
  do { const page = await getAuth().listUsers(1000, pageToken); allUsers.push(...page.users); pageToken = page.pageToken; } while (pageToken);
  return { users: allUsers.map(user => ({ uid:user.uid, email:user.email||"", emailVerified:user.emailVerified, createdAt:user.metadata.creationTime||null, lastSignInAt:user.metadata.lastSignInTime||null, disabled:user.disabled })) };
});
