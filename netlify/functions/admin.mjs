
import admin from "firebase-admin";

const ADMIN_EMAIL = "akusu2841@gmail.com";

function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!raw) {
      throw new Error("Missing Firebase service account configuration.");
    }

    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(raw))
    });
  }

  return admin;
}

function response(statusCode, data) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(data)
  };
}

export async function handler(event) {
  try {
    const firebase = getFirebaseAdmin();
    const authorization = event.headers?.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      return response(401, { error: "Please log in again." });
    }

    const decoded = await firebase.auth().verifyIdToken(
      authorization.slice(7)
    );

    if (
      (decoded.email || "").toLowerCase() !==
      ADMIN_EMAIL.toLowerCase()
    ) {
      return response(403, { error: "Administrator access denied." });
    }

    const db = firebase.firestore();

    // Load participants and settings.
    if (event.httpMethod === "GET") {
      const [participantSnapshot, settingsSnapshot] = await Promise.all([
        db.collection("participants").get(),
        db.collection("settings").doc("contest").get()
      ]);

      const participants = participantSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate?.()?.toISOString() || null
      }));

      return response(200, {
        success: true,
        participants,
        settings: settingsSnapshot.exists ? settingsSnapshot.data() : {}
      });
    }

    if (event.httpMethod !== "POST") {
      return response(405, { error: "Method not allowed." });
    }

    const body = JSON.parse(event.body || "{}");
    const dbSettings = body.settings || {};

    if (body.action === "saveSettings") {
      const prize1 = Number(dbSettings.prize1);
      const prize2 = Number(dbSettings.prize2);
      const prize3 = Number(dbSettings.prize3);

      if (![prize1, prize2, prize3].every(
        n => Number.isSafeInteger(n) && n >= 0
      )) {
        return response(400, {
          error: "Prize amounts must be valid whole numbers."
        });
      }

      await db.collection("settings").doc("contest").set({
        title: String(
          dbSettings.title || "Rhockstar Connect Referral Contest"
        ).trim().slice(0, 120),
        prize1,
        prize2,
        prize3,
        announcement: String(dbSettings.announcement || "").slice(0, 3000),
        contestOpen: dbSettings.contestOpen === true,
        leaderboardEnabled: dbSettings.leaderboardEnabled === true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: decoded.email
      }, { merge: true });

      return response(200, {
        success: true,
        message: "Settings and prizes saved successfully."
      });
    }

    if (body.action === "updateParticipant") {
      const id = String(body.id || "");
      const u = body.updates || {};

      if (!/^[A-Za-z0-9_-]{1,150}$/.test(id)) {
        return response(400, { error: "Invalid participant ID." });
      }

      const name = String(u.name || "").trim();
      const originalLink = String(u.originalLink || "").trim();

      if (name.length < 2 || name.length > 100) {
        return response(400, { error: "Name must be 2–100 characters." });
      }

      let link;
      try {
        link = new URL(originalLink);
      } catch {
        return response(400, { error: "Enter a valid original referral link." });
      }

      if (
        link.protocol !== "https:" ||
        !(
          link.hostname === "rhockstarconnect.com" ||
          link.hostname.endsWith(".rhockstarconnect.com")
        )
      ) {
        return response(400, {
          error: "The link must use rhockstarconnect.com."
        });
      }

      const clicks = Number(u.clicks);
      const registrations = Number(u.registrations);

      if (![clicks, registrations].every(
        n => Number.isSafeInteger(n) && n >= 0
      )) {
        return response(400, { error: "Counts must be whole numbers of zero or more." });
      }

      if (!["pending", "approved", "rejected"].includes(u.status)) {
        return response(400, { error: "Invalid participant status." });
      }

      const ref = db.collection("participants").doc(id);
      if (!(await ref.get()).exists) {
        return response(404, { error: "Participant not found." });
      }

      await ref.update({
        name,
        originalLink: link.toString(),
        clicks,
        registrations,
        status: u.status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: decoded.email
      });

      return response(200, { success: true, message: "Participant updated." });
    }

    if (body.action === "deleteParticipant") {
      const id = String(body.id || "");

      if (!/^[A-Za-z0-9_-]{1,150}$/.test(id)) {
        return response(400, { error: "Invalid participant ID." });
      }

      const ref = db.collection("participants").doc(id);
      if (!(await ref.get()).exists) {
        return response(404, { error: "Participant not found." });
      }

      await ref.delete();
      return response(200, { success: true, message: "Participant deleted." });
    }

    return response(400, { error: "Unknown admin action." });
  } catch (error) {
    console.error("Admin function error:", error);

    return response(500, {
      error: error.message || "The admin request failed."
    });
  }
}
