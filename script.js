const DAY_CONFIG = {
  monday: {
    label: "Monday — City Construction",
    role: "Chief Minister",
    icon: "🏛️",
    startDay: "Sunday",
    startMinutes: 23 * 60 + 45,
    slots: 49,
    tips: {
      great: ["Truegold", "Construction speed up", "Intel missions", "Master skills"],
      ok: ["Charms", "Research speed up"],
      skip: ["Troop speed up", "Roulette", "Shards", "Gather rss", "Level up pets", "Refinement pets", "Forgehammer", "Widgets", "Mithril", "Gov. gear", "Master emblem", "Manuscript"]
    }
  },
  tuesday: {
    label: "Tuesday — Basic Skills",
    role: "Chief Minister",
    icon: "🏛️",
    startDay: "Monday",
    startMinutes: 23 * 60 + 45,
    slots: 49,
    tips: {
      great: ["Roulette", "Shards", "Gather rss", "Master skills", "Master emblem", "Manuscript"],
      ok: ["Truegold", "Construction speed up", "Research speed up"],
      skip: ["Charms", "Troop speed up", "Intel missions", "Level up pets", "Refinement pets", "Forgehammer", "Widgets", "Mithril", "Gov. gear"]
    }
  },
  thursday: {
    label: "Thursday — Hero Development",
    role: "Noble Advisor",
    icon: "👑",
    startDay: "Wednesday",
    startMinutes: 23 * 60 + 45,
    slots: 49,
    tips: {
      great: ["Charms", "Troop speed up", "Gather rss"],
      ok: ["Forgehammer", "Widgets", "Mithril"],
      skip: ["Truegold", "Construction speed up", "Research speed up", "Intel missions", "Roulette", "Shards", "Level up pets", "Refinement pets", "Gov. gear", "Master skills", "Master emblem", "Manuscript"]
    }
  }
};

const STORE = "kingshot-kvk-planner-v3";
const PROFILE_STORE = "kingshot-player-profile-v3";
const ALLIANCES = ["PAR", "VIK", "KCB", "FOR"];

let currentDay = "monday";
let adminMode = false;
let selectedKeys = new Set();
let selectedAdminSlotKey = null;
let selectedAdminSlotInfo = null;

const $ = id => document.getElementById(id);

function blankState() {
  return { requests: [], confirmed: {} };
}
function getState() {
  try {
    return { ...blankState(), ...(JSON.parse(localStorage.getItem(STORE) || "{}")) };
  } catch {
    return blankState();
  }
}
function saveState(state) {
  localStorage.setItem(STORE, JSON.stringify(state));
}
function getProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_STORE) || "{}");
  } catch {
    return {};
  }
}
function saveProfile(profile) {
  localStorage.setItem(PROFILE_STORE, JSON.stringify(profile));
}
function pad(n) { return String(n).padStart(2, "0"); }

function addMinutes(dayName, minutes, add) {
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  let dayIndex = days.indexOf(dayName);
  let total = minutes + add;
  while (total >= 1440) { total -= 1440; dayIndex = (dayIndex + 1) % 7; }
  while (total < 0) { total += 1440; dayIndex = (dayIndex + 6) % 7; }
  return {
    day: days[dayIndex],
    minutes: total,
    time: `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
  };
}

function slotInfo(day, index) {
  const cfg = DAY_CONFIG[day];
  const start = addMinutes(cfg.startDay, cfg.startMinutes, index * 30);
  const end = addMinutes(cfg.startDay, cfg.startMinutes, index * 30 + 30);
  let key = `${day}-${index}`;

  if ((day === "monday" && index === 48) || (day === "tuesday" && index === 0)) {
    key = "monday-tuesday-crossover";
  }

  return {
    key, day, index, start, end,
    crossesDay: start.day !== end.day,
    display: `${start.time}–${end.time}`,
    fullDisplay: start.day === end.day
      ? `${start.day} ${start.time}–${end.time}`
      : `${start.day} ${start.time} → ${end.day} ${end.time}`
  };
}

function requestsForSlot(state, key) {
  return state.requests.filter(r => r.slotKey === key && r.status !== "withdrawn");
}

function renderTips() {
  const tips = DAY_CONFIG[currentDay].tips;
  const group = (title, items, cls="") => `
    <div class="tip-group ${cls}">
      <h4>${title}</h4>
      <div class="chips">${items.map(x => `<span>${x}</span>`).join("")}</div>
    </div>`;
  $("pointsContent").innerHTML =
    group("✅ GREAT FOR POINTS", tips.great) +
    group("🟧 OK FOR POINTS", tips.ok, "ok") +
    group("⛔ SKIP TODAY", tips.skip, "skip");
}

function updateSelectionUI() {
  const count = selectedKeys.size;
  $("selectionCount").textContent = `${count} of 5 selected`;
  $("selectionCount").classList.toggle("valid", count >= 3 && count <= 5);
  $("submitSelections").disabled = !(count >= 3 && count <= 5) || adminMode;

  document.querySelectorAll(".slot-checkbox").forEach(box => {
    if (!box.checked && count >= 5) box.disabled = true;
  });
}

function render() {
  const cfg = DAY_CONFIG[currentDay];
  const state = getState();
  const slotsEl = $("slots");
  slotsEl.innerHTML = "";

  $("roleLabel").textContent = cfg.role;
  $("ministerTitle").textContent = `${cfg.icon} ${cfg.role}`;
  $("carryoverNote").hidden = currentDay !== "tuesday";
  $("adminBanner").hidden = !adminMode;
  $("selectionCard").hidden = adminMode;
  renderTips();

  let visibleConfirmed = 0;
  let visibleRequests = 0;

  for (let i = 0; i < cfg.slots; i++) {
    const info = slotInfo(currentDay, i);
    const requests = requestsForSlot(state, info.key);
    const confirmedId = state.confirmed[info.key];
    const confirmedRequest = state.requests.find(r => r.id === confirmedId);

    if (confirmedRequest) visibleConfirmed++;
    visibleRequests += requests.length;

    const row = document.createElement("div");
    row.className = "slot";
    if (info.crossesDay) row.classList.add("cross-day");
    if (confirmedRequest) row.classList.add("confirmed");
    else if (requests.length) row.classList.add("pending");
    else row.classList.add("empty");
    if (selectedKeys.has(info.key)) row.classList.add("selected");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "slot-checkbox";
    checkbox.checked = selectedKeys.has(info.key);
    checkbox.disabled = adminMode || !!confirmedRequest;
    checkbox.setAttribute("aria-label", `Select ${info.fullDisplay}`);

    checkbox.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleSelection(info.key, checkbox.checked);
    });

    const time = document.createElement("div");
    time.className = "slot-time";
    time.textContent = info.display;

    const person = document.createElement("div");
    person.className = "player";

    if (confirmedRequest) {
      const alliance = document.createElement("span");
      alliance.className = "alliance";
      alliance.textContent = confirmedRequest.alliance;

      const name = document.createElement("span");
      name.className = "player-name";
      name.textContent = confirmedRequest.playerName;

      person.append(alliance, name);
    } else if (requests.length) {
      const pending = document.createElement("span");
      pending.className = "pending-text";
      pending.textContent = `${requests.length} request${requests.length === 1 ? "" : "s"} pending`;
      person.append(pending);
    } else {
      const empty = document.createElement("span");
      empty.className = "empty-text";
      empty.textContent = adminMode ? "No requests" : "Available";
      person.append(empty);
    }

    const status = document.createElement("div");
    status.className = "status " + (confirmedRequest ? "confirmed" : requests.length ? "pending" : "");
    status.textContent = confirmedRequest ? "✓ Confirmed" : requests.length ? `${requests.length} pending` : "";

    row.append(checkbox, time, person, status);

    row.addEventListener("click", () => {
      if (adminMode) {
        openAdmin(info);
        return;
      }
      if (confirmedRequest) return;
      toggleSelection(info.key, !selectedKeys.has(info.key));
    });

    slotsEl.appendChild(row);
  }

  $("slotSummary").textContent = `${visibleConfirmed}/${cfg.slots} confirmed`;
  $("confirmedCount").textContent = `${visibleConfirmed} confirmed`;
  $("requestCount").textContent = `${visibleRequests} request${visibleRequests === 1 ? "" : "s"}`;
  renderMyRequests();
  updateSelectionUI();
}

function toggleSelection(key, shouldSelect) {
  if (shouldSelect) {
    if (selectedKeys.size >= 5 && !selectedKeys.has(key)) {
      alert("You can select a maximum of 5 slots.");
      render();
      return;
    }
    selectedKeys.add(key);
  } else {
    selectedKeys.delete(key);
  }
  render();
}

function openProfileDialog() {
  const profile = getProfile();
  $("profilePlayerId").value = profile.playerId || "";
  $("profilePlayerName").value = profile.playerName || "";
  $("profileAlliance").value = ALLIANCES.includes(profile.alliance) ? profile.alliance : "KCB";
  $("profileTruegold").value = profile.resources?.truegold ?? 0;
  $("profileGeneral").value = profile.resources?.general ?? 0;
  $("profileResearch").value = profile.resources?.research ?? 0;
  $("profileTraining").value = profile.resources?.training ?? 0;
  $("profileConstruction").value = profile.resources?.construction ?? 0;
  $("profileDialog").showModal();
}

$("profileButton").addEventListener("click", openProfileDialog);
$("cancelProfile").addEventListener("click", () => $("profileDialog").close());

$("profileForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const profile = {
    playerId: $("profilePlayerId").value.trim(),
    playerName: $("profilePlayerName").value.trim(),
    alliance: $("profileAlliance").value,
    resources: {
      truegold: Number($("profileTruegold").value || 0),
      general: Number($("profileGeneral").value || 0),
      research: Number($("profileResearch").value || 0),
      training: Number($("profileTraining").value || 0),
      construction: Number($("profileConstruction").value || 0)
    },
    updatedAt: Date.now()
  };
  saveProfile(profile);
  $("profileDialog").close();
});

$("submitSelections").addEventListener("click", () => {
  if (selectedKeys.size < 3 || selectedKeys.size > 5) {
    alert("Please select between 3 and 5 slots.");
    return;
  }

  const profile = getProfile();
  if (!profile.playerId || !profile.playerName || !profile.alliance) {
    alert("Please save your KvK profile first.");
    openProfileDialog();
    return;
  }

  const state = getState();

  // Prevent duplicate active requests for the same player/day/slot.
  const existingActive = new Set(
    state.requests
      .filter(r => r.playerId === profile.playerId && r.day === currentDay && r.status !== "withdrawn")
      .map(r => r.slotKey)
  );

  selectedKeys.forEach(slotKey => {
    if (existingActive.has(slotKey)) return;

    state.requests.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      slotKey,
      day: currentDay,
      role: DAY_CONFIG[currentDay].role,
      playerId: profile.playerId,
      playerName: profile.playerName,
      alliance: profile.alliance,
      resources: { ...profile.resources },
      status: "pending",
      createdAt: Date.now()
    });
  });

  saveState(state);
  selectedKeys.clear();
  render();
  alert("Your slot requests have been submitted.");
});

function openAdmin(info) {
  selectedAdminSlotKey = info.key;
  selectedAdminSlotInfo = info;
  $("adminSlotLabel").textContent = `${DAY_CONFIG[currentDay].role} · ${info.fullDisplay}`;
  renderAdminApplicants();
  $("adminDialog").showModal();
}

function renderAdminApplicants() {
  const state = getState();
  const requests = requestsForSlot(state, selectedAdminSlotKey)
    .slice()
    .sort((a, b) => relevantScore(b) - relevantScore(a));

  const wrap = $("adminApplicants");
  wrap.innerHTML = "";

  if (!requests.length) {
    wrap.innerHTML = `<div class="empty-admin">Nobody has requested this slot yet.</div>`;
    return;
  }

  requests.forEach(req => {
    const isConfirmed = state.confirmed[selectedAdminSlotKey] === req.id;
    const r = req.resources;

    const el = document.createElement("div");
    el.className = "applicant" + (isConfirmed ? " confirmed-applicant" : "");

    el.innerHTML = `
      <div class="applicant-top">
        <div>
          <span class="alliance">${req.alliance}</span>
          <strong>${req.playerName}</strong>
          <span class="meta">ID ${req.playerId}</span>
        </div>
      </div>
      <div class="summary">
        🏆 ${r.truegold} TG ·
        💨 ${r.general}h general ·
        📘 ${r.research}h research ·
        ⚔️ ${r.training}h training ·
        🏗️ ${r.construction}h construction
      </div>
      <div class="applicant-actions">
        <button class="primary-btn award-btn">${isConfirmed ? "Confirmed" : "Award slot"}</button>
        <button class="danger-btn reject-btn">Reject request</button>
      </div>`;

    el.querySelector(".award-btn").addEventListener("click", () => awardRequest(req.id));
    el.querySelector(".reject-btn").addEventListener("click", () => rejectRequest(req.id));
    wrap.appendChild(el);
  });
}

function relevantScore(req) {
  const r = req.resources;
  if (currentDay === "monday") return r.truegold * 10 + r.general + r.construction;
  if (currentDay === "tuesday") return r.truegold * 8 + r.general + r.research + (r.construction * 0.5);
  return r.general + r.training + (r.truegold * 2);
}

function awardRequest(requestId) {
  const state = getState();
  const req = state.requests.find(r => r.id === requestId);
  if (!req) return;

  state.confirmed[selectedAdminSlotKey] = requestId;
  req.status = "confirmed";

  // Once a player receives one appointment for this day, all their other
  // pending requests for that same day are automatically withdrawn.
  state.requests.forEach(r => {
    if (
      r.id !== requestId &&
      r.playerId === req.playerId &&
      r.day === req.day &&
      r.status === "pending"
    ) {
      r.status = "withdrawn";
    }
  });

  saveState(state);
  renderAdminApplicants();
  render();
}

function rejectRequest(requestId) {
  const state = getState();
  const req = state.requests.find(r => r.id === requestId);
  if (!req) return;

  req.status = "withdrawn";
  if (state.confirmed[selectedAdminSlotKey] === requestId) {
    delete state.confirmed[selectedAdminSlotKey];
  }

  saveState(state);
  renderAdminApplicants();
  render();
}

function findDisplayForRequest(req) {
  for (let i = 0; i < DAY_CONFIG[req.day].slots; i++) {
    const info = slotInfo(req.day, i);
    if (info.key === req.slotKey) return info.fullDisplay;
  }
  return req.slotKey;
}

function renderMyRequests() {
  const state = getState();
  const profile = getProfile();
  const wrap = $("myRequests");
  wrap.innerHTML = "";

  if (!profile.playerId) {
    wrap.innerHTML = `<div class="empty-admin">Save your KvK profile, then your requests will appear here.</div>`;
    return;
  }

  const mine = state.requests
    .filter(r => r.playerId === profile.playerId && r.status !== "withdrawn")
    .sort((a, b) => a.createdAt - b.createdAt);

  if (!mine.length) {
    wrap.innerHTML = `<div class="empty-admin">No active requests yet.</div>`;
    return;
  }

  mine.forEach(req => {
    const item = document.createElement("div");
    item.className = "mine-item";
    item.innerHTML = `
      <span class="alliance">${req.alliance}</span>
      <div>
        <strong>${DAY_CONFIG[req.day].label}</strong>
        <div class="meta">${findDisplayForRequest(req)} · ${req.role}</div>
      </div>
      <span class="${req.status === "confirmed" ? "status confirmed" : "status pending"}">
        ${req.status === "confirmed" ? "✓ Confirmed" : "Pending"}
      </span>`;
    wrap.appendChild(item);
  });
}

$("adminToggle").addEventListener("click", () => {
  adminMode = !adminMode;
  selectedKeys.clear();
  $("adminToggle").textContent = adminMode ? "Exit admin view" : "Admin view";
  render();
});

$("adminClose").addEventListener("click", () => $("adminDialog").close());

document.querySelectorAll(".day-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".day-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentDay = btn.dataset.day;
    selectedKeys.clear();
    render();
  });
});

$("pointsToggle").addEventListener("click", () => {
  const content = $("pointsContent");
  content.hidden = !content.hidden;
  $("pointsArrow").textContent = content.hidden ? "›" : "⌄";
});

$("clearMine").addEventListener("click", () => {
  if (!confirm("Clear your locally saved test profile and all locally stored planner data?")) return;
  localStorage.removeItem(PROFILE_STORE);
  localStorage.removeItem(STORE);
  selectedKeys.clear();
  render();
});

render();
