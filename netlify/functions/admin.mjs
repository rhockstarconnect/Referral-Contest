
import admin from "firebase-admin";

const ADMIN_EMAIL = "akusu2841@gmail.com";

function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const serviceAccountJSON =
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!serviceAccountJSON) {
      throw new Error(
        "Missing FIREBASE_SERVICE_ACCOUNT_JSON environment variable."
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(serviceAccountJSON)
      )
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

export default async function handler(req) {
  try {
    const firebase = getFirebaseAdmin();

    // Verify the administrator's Firebase login token.
    const authorization =
      req.headers.get("authorization") || "";

    if (!authorization.startsWith("Bearer ")) {
      return response(401, {
        error: "Please log in as administrator."
      });
    }

    const token = authorization.slice(7);

    const decoded = await firebase
      .auth()
      .verifyIdToken(token);

    if (
      (decoded.email || "").toLowerCase() !==
      ADMIN_EMAIL.toLowerCase()
    ) {
      return response(403, {
        error: "You are not authorized to manage this contest."
      });
    }

    const db = firebase.firestore();

    // LOAD SETTINGS AND PARTICIPANTS
    if (req.method === "GET") {
      const [participantSnapshot, settingsSnapshot] =
        await Promise.all([
          db.collection("participants").get(),
          db.collection("settings").doc("contest").get()
        ]);

      const participants = participantSnapshot.docs.map(
        document => ({
          id: document.id,
          ...document.data(),
          submittedAt:
            document.data().submittedAt?.toDate?.()
              ?.toISOString() || null
        })
      );

      return response(200, {
        success: true,
        participants,
        settings: settingsSnapshot.exists
          ? settingsSnapshot.data()
          : {}
      });
    }

    if (req.method !== "POST") {
      return response(405, {
        error: "Method not allowed."
      });
    }

    const body = await req.json();
    const action = body.action;

    // SAVE PRIZES AND CONTEST SETTINGS
    if (action === "saveSettings") {
      const s = body.settings || {};

      const prize1 = Number(s.prize1);
      const prize2 = Number(s.prize2);
      const prize3 = Number(s.prize3);

      if (
        ![prize1, prize2, prize3].every(
          n => Number.isSafeInteger(n) && n >= 0
        )
      ) {
        return response(400, {
          error: "Prize amounts must be valid whole numbers."
        });
      }

      const settings = {
        title: String(
          s.title || "Rhockstar Connect Referral Contest"
        ).trim().slice(0, 120),

        prize1,
        prize2,
        prize3,

        announcement: String(
          s.announcement || ""
        ).slice(0, 3000),

        contestOpen: s.contestOpen === true,

        leaderboardEnabled:
          s.leaderboardEnabled === true,

        updatedAt:
          admin.firestore.FieldValue.serverTimestamp(),

        updatedBy: decoded.email
      };

      await db
        .collection("settings")
        .doc("contest")
        .set(settings, { merge: true });

      return response(200, {
        success: true,
        message: "Settings and prizes saved successfully."
      });
    }

    // UPDATE A PARTICIPANT
    if (action === "updateParticipant") {
      const id = String(body.id || "");
      const updates = body.updates || {};

      if (!/^[A-Za-z0-9_-]{1,150}$/.test(id)) {
        return response(400, {
          error: "Invalid participant ID."
        });
      }

      const name = String(updates.name || "").trim();
      const originalLink = String(
        updates.originalLink || ""
      ).trim();

      if (name.length < 2 || name.length > 100) {
        return response(400, {
          error: "Name must contain 2 to 100 characters."
        });
      }

      let referralURL;

      try {
        referralURL = new URL(originalLink);
      } catch {
        return response(400, {
          error: "Enter a valid original referral link."
        });
      }

      if (
        referralURL.protocol !== "https:" ||
        !(
          referralURL.hostname === "rhockstarconnect.com" ||
          referralURL.hostname.endsWith(
            ".rhockstarconnect.com"
          )
        )
      ) {
        return response(400, {
          error:
            "The original link must use rhockstarconnect.com."
        });
      }

      const clicks = Number(updates.clicks);
      const registrations = Number(updates.registrations);

      if (
        !Number.isSafeInteger(clicks) ||
        clicks < 0 ||
        !Number.isSafeInteger(registrations) ||
        registrations < 0
      ) {
        return response(400, {
          error: "Counts must be whole numbers of zero or more."
        });
      }

      const allowedStatuses = [
        "pending",
        "approved",
        "rejected"
      ];

      if (!allowedStatuses.includes(updates.status)) {
        return response(400, {
          error: "Invalid participant status."
        });
      }

      const participantRef = db
        .collection("participants")
        .doc(id);

      const participantSnapshot = await participantRef.get();

      if (!participantSnapshot.exists) {
        return response(404, {
          error: "Participant not found."
        });
      }

      await participantRef.update({
        name,
        originalLink: referralURL.toString(),
        clicks,
        registrations,
        status: updates.status,
        updatedAt:
          admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: decoded.email
      });

      return response(200, {
        success: true,
        message: "Participant updated successfully."
      });
    }

    // DELETE A PARTICIPANT
    if (action === "deleteParticipant") {
      const id = String(body.id || "");

      if (!/^[A-Za-z0-9_-]{1,150}$/.test(id)) {
        return response(400, {
          error: "Invalid participant ID."
        });
      }

      const participantRef = db
        .collection("participants")
        .doc(id);

      const participantSnapshot = await participantRef.get();

      if (!participantSnapshot.exists) {
        return response(404, {
          error: "Participant not found."
        });
      }

      await participantRef.delete();

      return response(200, {
        success: true,
        message: "Participant deleted successfully."
      });
    }

    return response(400, {
      error: "Unknown admin action: " + String(action)
    });

  } catch (error) {
    console.error("Admin function error:", error);

    return response(500, {
      error:
        "The admin request failed. Check your Netlify function logs and Firebase configuration."
    });
  }
}
