
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBl4ZL9EMReQYWu2Z7HuZFb770AZGeVXew",
  authDomain: "rcreferral-contest.firebaseapp.com",
  projectId: "rcreferral-contest",
  appId: "1:137378826916:web:45b695d41fbd3eb940f431"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const $ = id => document.getElementById(id);

let participants = [];

// Display messages
function message(text, type = "") {
  const element = $("message");

  if (!element) {
    console.error(text);
    return;
  }

  element.textContent = text;
  element.className = "message " + type;
}

// Communicate with the Netlify admin function
async function api(action, body = null) {
  if (!auth.currentUser) {
    throw new Error("Please log in again.");
  }

  const token = await auth.currentUser.getIdToken(true);

  const response = await fetch("/api/admin", {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: body
      ? JSON.stringify({ action, ...body })
      : undefined
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = {
      error: text || "The server returned an invalid response."
    };
  }

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}: ${data.error || "Request failed"}`
    );
  }

  return data;
}

// Escape text before displaying participant information in HTML
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

// LOGIN
$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();

  const loginButton = $("loginBtn");
  loginButton.disabled = true;
  $("loginMessage").textContent = "Logging in…";

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      $("email").value.trim(),
      $("password").value
    );

    if (
      credential.user.email?.toLowerCase() !==
      "akusu2841@gmail.com"
    ) {
      await signOut(auth);

      throw new Error(
        "This email is not authorized as the contest administrator."
      );
    }

    $("loginPanel").classList.add("hidden");
    $("dashboard").classList.remove("hidden");

    await load();
  } catch (error) {
    $("loginMessage").textContent =
      error.message || "Login failed.";
  } finally {
    loginButton.disabled = false;
  }
});

// LOGOUT
$("logoutBtn").addEventListener("click", async () => {
  try {
    await signOut(auth);
    location.reload();
  } catch (error) {
    message(error.message, "error");
  }
});

// REFRESH DASHBOARD
$("refreshBtn").addEventListener("click", load);

// LOAD SETTINGS AND PARTICIPANTS
async function load() {
  try {
    message("Loading contest data…");

    const data = await api("list");

    participants = data.participants || [];

    const settings = data.settings || {};

    $("title").value =
      settings.title || "Rhockstar Connect Referral Contest";

    $("prize1").value = settings.prize1 ?? 100000;
    $("prize2").value = settings.prize2 ?? 50000;
    $("prize3").value = settings.prize3 ?? 20000;

    $("announcement").value =
      settings.announcement || "";

    $("contestOpen").checked =
      settings.contestOpen !== false;

    $("leaderboardEnabled").checked =
      settings.leaderboardEnabled !== false;

    $("totalParticipants").textContent =
      participants.length;

    $("totalClicks").textContent =
      participants.reduce(
        (total, participant) =>
          total + (Number(participant.clicks) || 0),
        0
      );

    $("totalRegistrations").textContent =
      participants.reduce(
        (total, participant) =>
          total + (Number(participant.registrations) || 0),
        0
      );

    render();

    message("Contest data loaded successfully.", "success");
  } catch (error) {
    message(error.message, "error");
  }
}

// SAVE CONTEST SETTINGS AND PRIZES
$("settingsForm").addEventListener("submit", async event => {
  event.preventDefault();

  const saveButton = $("settingsForm").querySelector(
    'button[type="submit"], button:not([type])'
  );

  if (saveButton) {
    saveButton.disabled = true;
  }

  try {
    message("Saving settings…");

    const settings = {
      title: $("title").value.trim(),
      prize1: Number($("prize1").value),
      prize2: Number($("prize2").value),
      prize3: Number($("prize3").value),
      announcement: $("announcement").value,
      contestOpen: $("contestOpen").checked,
      leaderboardEnabled: $("leaderboardEnabled").checked
    };

    if (
      !settings.title ||
      ![settings.prize1, settings.prize2, settings.prize3].every(
        amount => Number.isSafeInteger(amount) && amount >= 0
      )
    ) {
      throw new Error(
        "Enter a contest title and valid whole-number prize amounts."
      );
    }

    const result = await api("saveSettings", { settings });

    message(
      result.message || "Settings saved successfully.",
      "success"
    );
  } catch (error) {
    message(error.message, "error");
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
    }
  }
});

// DISPLAY PARTICIPANTS
function render() {
  const searchTerm = $("search").value
    .toLowerCase()
    .trim();

  const filtered = participants.filter(participant =>
    (participant.name || "").toLowerCase().includes(searchTerm) ||
    (participant.id || "").toLowerCase().includes(searchTerm) ||
    (participant.referralCode || "")
      .toLowerCase()
      .includes(searchTerm)
  );

  if (!filtered.length) {
    $("participants").innerHTML =
      "<p class='muted'>No participants found.</p>";
    return;
  }

  $("participants").innerHTML = filtered.map(participant => `
    <article class="card" data-id="${esc(participant.id)}">
      <h3>${esc(participant.name || "Unnamed participant")}</h3>

      <p class="muted">
        Code: ${esc(participant.referralCode || participant.id)}
        · Status: ${esc(participant.status || "pending")}
      </p>

      <div class="fields">
        <div>
          <label>Name</label>
          <input data-f="name" value="${esc(participant.name)}">
        </div>

        <div>
          <label>Clicks</label>
          <input data-f="clicks" type="number" min="0"
            step="1" value="${Number(participant.clicks) || 0}">
        </div>

        <div>
          <label>Verified registrations</label>
          <input data-f="registrations" type="number" min="0"
            step="1" value="${Number(participant.registrations) || 0}">
        </div>

        <div>
          <label>Status</label>
          <select data-f="status">
            <option value="pending"
              ${participant.status === "pending" ? "selected" : ""}>
              pending
            </option>

            <option value="approved"
              ${participant.status === "approved" ? "selected" : ""}>
              approved
            </option>

            <option value="rejected"
              ${participant.status === "rejected" ? "selected" : ""}>
              rejected
            </option>
          </select>
        </div>

        <div class="wide">
          <label>Original referral link</label>
          <input data-f="originalLink"
            value="${esc(participant.originalLink || participant.referral || "")}">
        </div>
      </div>

      <div class="actions">
        <button class="button button-primary" data-action="save">
          Save participant
        </button>

        <button class="button danger" data-action="delete">
          Delete participant
        </button>
      </div>
    </article>
  `).join("");
}

$("search").addEventListener("input", render);

// SAVE OR DELETE A PARTICIPANT
$("participants").addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const card = button.closest("[data-id]");
  if (!card) return;

  const id = card.dataset.id;
  const action = button.dataset.action;

  if (
    action === "delete" &&
    !confirm("Permanently delete this participant?")
  ) {
    return;
  }

  button.disabled = true;

  try {
    if (action === "delete") {
      await api("deleteParticipant", { id });
      message("Participant deleted.", "success");
    } else {
      const value = field =>
        card.querySelector(`[data-f="${field}"]`).value;

      const clicks = Number(value("clicks"));
      const registrations = Number(value("registrations"));

      if (
        !Number.isSafeInteger(clicks) ||
        clicks < 0 ||
        !Number.isSafeInteger(registrations) ||
        registrations < 0
      ) {
        throw new Error(
          "Clicks and registrations must be whole numbers of zero or more."
        );
      }

      await api("updateParticipant", {
        id,
        updates: {
          name: value("name"),
          clicks,
          registrations,
          status: value("status"),
          originalLink: value("originalLink")
        }
      });

      message("Participant updated successfully.", "success");
    }

    await load();
  } catch (error) {
    message(error.message, "error");
  } finally {
    button.disabled = false;
  }
});

// EXPORT PARTICIPANTS TO CSV
$("exportBtn").addEventListener("click", () => {
  const columns = [
    "name",
    "referralCode",
    "originalLink",
    "clicks",
    "registrations",
    "status"
  ];

  const csv = [
    columns.join(","),
    ...participants.map(participant =>
      columns.map(column =>
        '"' + String(participant[column] ?? "")
          .replace(/"/g, '""') + '"'
      ).join(",")
    )
  ].join("\r\n");

  const blob = new Blob(
    [csv],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "rhockstar-contest.csv";
  link.click();

  URL.revokeObjectURL(url);
});
