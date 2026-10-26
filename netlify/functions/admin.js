
import admin from "firebase-admin";

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

function reply(statusCode, data) {
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
  if (event.httpMethod !== "POST") {
    return reply(405, { error: "POST required." });
  }

  try {
    const authHeader = event.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";

    if (!token) return reply(401, { error: "Sign in first." });

    const decoded = await admin.auth().verifyIdToken(token, true);

    const allowedEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map(email => email.trim().toLowerCase())
      .filter(Boolean);

    if (
      !decoded.email ||
      !decoded.email_verified ||
      !allowedEmails.includes(decoded.email.toLowerCase())
    ) {
      return reply(403, { error: "Administrator access denied." });
    }

    const db = getDb();
    const input = JSON.parse(event.body || "{}");
    const action = input.action;

    if (action === "list") {
      const snapshot = await db.collection("participants")
        .orderBy("createdAt", "desc")
        .get();

      return reply(200, {
        participants: snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.().toISOString() || null
        }))
      });
    }

    if (action === "saveParticipant") {
      const id = String(input.id || "");
      const name = String(input.name || "").trim();
      const status = String(input.status || "");
      const destination = String(input.destination || "").trim();
      const clicks = Number(input.clicks);

      if (!id || name.length < 2 || name.length > 80) {
        return reply(400, { error: "Invalid participant details." });
      }

      if (!["pending", "approved", "rejected"].includes(status)) {
        return reply(400, { error: "Invalid participant status." });
      }

      if (!Number.isSafeInteger(clicks) || clicks < 0 || clicks > 1000000000) {
        return reply(400, { error: "Click count must be a non-negative whole number." });
      }

      let target;
      try {
        target = new URL(destination);
      } catch {
        return reply(400, { error: "Invalid destination URL." });
      }

      if (
        target.protocol !== "https:" ||
        !["rhockstarconnect.com", "www.rhockstarconnect.com"].includes(
          target.hostname
        )
      ) {
        return reply(400, { error: "Destination must use the official website." });
      }

      const ref = db.collection("participants").doc(id);

      await db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new Error("Participant not found.");

        const existing = snap.data();

        tx.update(ref, {
          name,
          status,
          destination: target.toString(),
          clicks,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const leaderboardRef = db.collection("leaderboard").doc(id);

        if (status === "approved") {
          tx.set(leaderboardRef, {
            name,
            clicks,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          tx.delete(leaderboardRef);
        }
      });

      return reply(200, { message: "Participant updated." });
    }

    if (action === "deleteParticipant") {
      const id = String(input.id || "");
      if (!id) return reply(400, { error: "Missing participant ID." });

      const ref = db.collection("participants").doc(id);
      const snap = await ref.get();

      if (!snap.exists) return reply(404, { error: "Participant not found." });

      const data = snap.data();

      await db.collection("leaderboard").doc(id).delete();
      await ref.delete();

      if (data.email) {
        const crypto = await import("node:crypto");
        const hash = crypto.createHash("sha256")
          .update(data.email.toLowerCase())
          .digest("hex");

        await db.collection("private").doc("email_" + hash).delete();
      }

      return reply(200, { message: "Participant deleted." });
    }

    if (action === "getPrizes") {
      const snap = await db.collection("settings").doc("prizes").get();
      return reply(200, { prizes: snap.exists ? snap.data().items || [] : [] });
    }

    if (action === "savePrizes") {
      if (!Array.isArray(input.prizes) || input.prizes.length > 30) {
        return reply(400, { error: "Provide a valid prize list." });
      }

      const prizes = input.prizes.map(item => ({
        title: String(item.title || "").trim().slice(0, 120),
        description: String(item.description || "").trim().slice(0, 300)
      }));

      if (prizes.some(prize => !prize.title)) {
        return reply(400, { error: "Every prize needs a title." });
      }

      await db.collection("settings").doc("prizes").set({
        items: prizes,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return reply(200, { message: "Prizes saved." });
    }

    return reply(400, { error: "Unknown admin action." });
  } catch (error) {
    console.error("Admin function error:", error.message);
    return reply(500, { error: "The request could not be completed." });
  }
}
