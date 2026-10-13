/*
 * Firebase Cloud Functions backend for provisioning.html.
 *
 * Install/deploy from your Firebase project's functions directory:
 *   npm install firebase-admin firebase-functions
 *   firebase deploy --only functions:listAuthUsers
 *
 * Before using the page, assign the custom claim { admin: true } to the
 * intended administrator account from a trusted environment. Do NOT put
 * service-account credentials or Admin SDK code in browser JavaScript.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

initializeApp();

exports.listAuthUsers = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Sign in is required.");
    }

    if (request.auth.token.admin !== true) {
        throw new HttpsError("permission-denied", "Administrator access is required.");
    }

    // Firebase Admin SDK returns at most 1000 users per page.
    // Iterate through every page so the page lists the complete user directory.
    const allUsers = [];
    let pageToken;

    do {
        const page = await getAuth().listUsers(1000, pageToken);
        allUsers.push(...page.users);
        pageToken = page.pageToken;
    } while (pageToken);

    return {
        users: allUsers.map((user) => ({
            uid: user.uid,
            email: user.email || "",
            emailVerified: user.emailVerified,
            createdAt: user.metadata.creationTime || null,
            lastSignInAt: user.metadata.lastSignInTime || null,
            disabled: user.disabled
        }))
    };
});
