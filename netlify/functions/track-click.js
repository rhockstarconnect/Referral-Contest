
import admin from "firebase-admin";
import crypto from "node:crypto";

function getDb() {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  return admin.firestore();
}

function redirect(statusCode, location) {
  return {
    statusCode,
    headers: {
      Location: location,
      "Cache-Control": "no-store"
    },
    body: ""
  };
}

export async function handler(event) {
  try {
    const db = getDb();
    const code = String(event.queryStringParameters?.code || "")
      .trim()
      .toUpperCase();

    if (!/^[A-F0-9]{12}$/.test(code)) {
      return redirect(302, "https://rhockstarconnect.com/");
    }

    const found = await db.collection("participants")
      .where("referralCode", "==", code)
      .limit(1)
      .get();

    if (found.empty) {
      return redirect(302, "https://rhockstarconnect.com/");
    }

    const participantDoc = found.docs[0];
    const participant = participantDoc.data();

    if (participant.status !== "approved") {
      return redirect(302, "https://rhockstarconnect.com/");
    }

    const ip =
      event.headers["x-nf-client-connection-ip"] ||
      event.headers["client-ip"] ||
      "unknown";

    const userAgent = event.headers["user-agent"] || "unknown";
    const secret = process.env.CLICK_HASH_SECRET;

    if (!secret || secret.length < 32) {
      throw new Error("CLICK_HASH_SECRET must be at least 32 characters.");
    }

    const visitorId = crypto
      .createHmac("sha256", secret)
      .update(ip + "|" + userAgent)
      .digest("hex");

    const visitorRef = participantDoc.ref
      .collection("visitors")
      .doc(visitorId);

    const leaderboardRef = db.collection("leaderboard").doc(participantDoc.id);

    await db.runTransaction(async tx => {
      const visitor = await tx.get(visitorRef);
      const current = await tx.get(participantDoc.ref);

      if (!current.exists || current.data().status !== "approved") return;

      if (visitor.exists) {
        const lastSeen = visitor.data().lastSeenAt?.toMillis?.() || 0;
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;

        if (Date.now() - lastSeen < thirtyDays) return;
      }

      tx.set(visitorRef, {
        lastSeenAt: admin.firestore.FieldValue.serverTimestamp()
      });

      tx.update(participantDoc.ref, {
        clicks: admin.firestore.FieldValue.increment(1)
      });

      const updatedClicks = (current.data().clicks || 0) + 1;

      tx.set(leaderboardRef, {
        name: current.data().name,
        clicks: updatedClicks,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return redirect(302, participant.destination);
  } catch (error) {
    console.error("Tracking error:", error.message);
    return redirect(302, "https://rhockstarconnect.com/");
  }
}
