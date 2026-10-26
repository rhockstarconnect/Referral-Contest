
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

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return response(405, { error: "POST required." });
  }

  try {
    const db = getDb();
    const input = JSON.parse(event.body || "{}");

    const name = String(input.name || "").trim();
    const email = String(input.email || "").trim().toLowerCase();
    const destination = String(input.destination || "").trim();

    if (name.length < 2 || name.length > 80) {
      return response(400, { error: "Enter a valid name." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return response(400, { error: "Enter a valid email." });
    }

    let target;
    try {
      target = new URL(destination);
    } catch {
      return response(400, { error: "Enter a valid Rhockstar Connect URL." });
    }

    if (
      target.protocol !== "https:" ||
      !["rhockstarconnect.com", "www.rhockstarconnect.com"].includes(
        target.hostname
      )
    ) {
      return response(400, {
        error: "Your destination must use the official Rhockstar Connect website."
      });
    }

    const emailHash = crypto
      .createHash("sha256")
      .update(email)
      .digest("hex");

    const emailRef = db.collection("private").doc("email_" + emailHash);

    const result = await db.runTransaction(async tx => {
      const existing = await tx.get(emailRef);

      if (existing.exists) {
        return { duplicate: true };
      }

      const participantRef = db.collection("participants").doc();
      const referralCode = crypto.randomBytes(6).toString("hex").toUpperCase();

      tx.create(participantRef, {
        name,
        email,
        destination: target.toString(),
        referralCode,
        clicks: 0,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      tx.create(emailRef, {
        participantId: participantRef.id
      });

      return {
        id: participantRef.id,
        referralCode
      };
    });

    if (result.duplicate) {
      return response(409, {
        error: "This email has already been registered."
      });
    }

    return response(201, {
      message: "Registration received. Your entry is awaiting approval.",
      referralCode: result.referralCode
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    return response(500, { error: "Registration failed. Please try again." });
  }
}
