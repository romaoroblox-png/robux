/* ===================== CONFIG — edit these ===================== */
// URL of your deployed Cloudflare Worker (see worker.js)
const WORKER_URL = "https://robux-group-api.romaozinho1607.workers.dev";
// Roblox group the button opens in a new tab
const GROUP_URL = "https://www.roblox.com/communities/138423710779";
// Footer text shown on the page
const DISCLAIMER = "Not affiliated with Roblox Corporation. Joining the group is voluntary; " +
                   "rewards are decided by the group owner and are not guaranteed by this site.";
/* =============================================================== */

const $ = (id) => document.getElementById(id);
const states = ["state-form", "state-loading", "state-profile"];
let currentUser = null;

function show(name) {
  states.forEach((s) => ($(s).hidden = s !== name));
  const profile = name === "state-profile";
  $("title").textContent = profile ? "You're almost there" : "Join our Roblox group";
  $("subtitle").hidden = name !== "state-form";
}

function showError(msg) {
  $("error").textContent = msg;
  $("error").hidden = !msg;
}

/* Fetch with timeout; throws "network" on failure */
async function api(path, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(WORKER_URL + path, { ...options, signal: ctrl.signal });
    return res;
  } catch (err) {
    console.error("Request to Worker failed (CORS, wrong URL or offline):", WORKER_URL + path, err);
    throw new Error("network");
  } finally {
    clearTimeout(timer);
  }
}

/* Step 1: username -> user id (users.roblox.com via Worker) */
async function lookupUser(username) {
  const res = await api("/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    console.error("Lookup failed:", res.status, await res.text());
    throw new Error("network");
  }
  const data = await res.json();
  return data.data && data.data[0] ? data.data[0] : null; // {id, name, displayName}
}

/* Step 2: user id -> headshot url (thumbnails.roblox.com via Worker) */
async function getAvatar(userId) {
  const res = await api("/avatar?userId=" + encodeURIComponent(userId));
  if (!res.ok) return "";
  const data = await res.json();
  const item = data.data && data.data[0];
  return item && item.state === "Completed" ? item.imageUrl : "";
}

$("lookup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = $("username").value.trim();
  showError("");

  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    return showError("Enter a valid Roblox username (3–20 letters, numbers or underscores).");
  }

  show("state-loading");
  try {
    const user = await lookupUser(username);
    if (!user) {
      show("state-form");
      return showError("Username not found. Check the spelling and try again.");
    }
    const avatarUrl = await getAvatar(user.id);
    currentUser = user;

    $("avatar").src = avatarUrl;
    $("profile-name").textContent = user.name;
    $("profile-id").textContent = "User ID: " + user.id;
    $("consent").checked = false;
    $("register-btn").disabled = true;
    $("register-btn").hidden = false;
    $("register-msg").hidden = true;
    show("state-profile");
  } catch (err) {
    console.error("Verify error:", err);
    show("state-form");
    showError("Connection problem. Check your internet and try again.");
  }
});

/* Consent gate for saving the registration */
$("consent").addEventListener("change", (e) => {
  $("register-btn").disabled = !e.target.checked;
});

$("register-btn").addEventListener("click", async () => {
  if (!$("consent").checked || !currentUser) return;
  const msg = $("register-msg");
  $("register-btn").disabled = true;
  msg.className = "note";
  msg.hidden = false;
  msg.textContent = "Saving…";
  try {
    const res = await api("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Only the username is sent; the Worker re-checks it with Roblox and saves the row
      body: JSON.stringify({ username: currentUser.name }),
    });
    if (!res.ok) throw new Error("fail");
    msg.textContent = "✔ Registered. Your username was saved.";
    $("register-btn").hidden = true;
  } catch {
    msg.className = "note bad";
    msg.textContent = "Could not save the registration. Try again.";
    $("register-btn").disabled = false;
  }
});

/* Group button: opens the group in a new tab, asks for nothing else */
$("join-btn").addEventListener("click", () => {
  window.open(GROUP_URL, "_blank", "noopener,noreferrer");
});

$("back-btn").addEventListener("click", () => {
  currentUser = null;
  $("username").value = "";
  show("state-form");
  $("username").focus();
});

$("disclaimer").textContent = DISCLAIMER;
