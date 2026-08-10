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

const STORE = "kingshot-kvk-planner-v2";
const ALLIANCES = ["PAR", "VIK", "KCB", "FOR"];
let currentDay = "monday";
let selectedSlotKey = null;
let selectedSlotInfo = null;
let adminMode = false;

const $ = id => document.getElementById(id);
const slotsEl = $("slots");
const slotSummary = $("slotSummary");
const confirmedCount = $("confirmedCount");
const requestCount = $("requestCount");
const carryoverNote = $("carryoverNote");
const roleLabel = $("roleLabel");
const ministerTitle = $("ministerTitle");
const pointsContent = $("pointsContent");
const adminBanner = $("adminBanner");
const myRequests = $("myRequests");

function blankState() {
  return { requests: [], confirmed: {} };
}
function getState() {
  try {
    return { ...blankState(), ...(JSON.parse(localStorage.getItem(STORE) || "{}")) };
  } catch { return blankState(); }
}
function saveState(state) {
  localStorage.setItem(STORE, JSON.stringify(state));
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

function renderTips() {
  const tips = DAY_CONFIG[currentDay].tips;
  const group = (title, items, cls="") => `
    <div class="tip-group ${cls}">
      <h4>${title}</h4>
      <div class="chips">${items.map(x => `<span>${x}</span>`).join("")}</div>
    </div>`;
  pointsContent.innerHTML =
    group("✅ GREAT FOR POINTS", tips.great) +
    group("🟧 OK FOR POINTS", tips.ok, "ok") +
    group("⛔ SKIP TODAY", tips.skip, "skip");
}

function requestsForSlot(state, key) {
  return state.requests.filter(r => r.slotKey === key && r.status !== "withdrawn");
}

function render() {
  const cfg = DAY_CONFIG[currentDay];
  const state = getState();
  slotsEl.innerHTML = "";
  roleLabel.textContent = cfg.role;
  ministerTitle.textContent = `${cfg.icon} ${cfg.role}`;
  carryoverNote.hidden = currentDay !== "tuesday";
  adminBanner.hidden = !adminMode;
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
      empty.textContent = adminMode ? "No requests" : "Available — click to request";
      person.append(empty);
    }

    const status = document.createElement("div");
    status.className = "status " + (confirmedRequest ? "confirmed" : requests.length ? "pending" : "");
    status.textContent = confirmedRequest ? "✓ Confirmed" : requests.length ? `${requests.length} pending` : "+";

    row.append(time, person, status);
    row.addEventListener("click", () => {
      if (adminMode) openAdmin(info);
      else openRequest(info);
    });
    slotsEl.appendChild(row);
  }

  slotSummary.textContent = `${visibleConfirmed}/${cfg.slots} confirmed`;
  confirmedCount.textContent = `${visibleConfirmed} confirmed`;
  requestCount.textContent = `${visibleRequests} request${visibleRequests === 1 ? "" : "s"}`;
  renderMyRequests();
}

function openRequest(info) {
  selectedSlotKey = info.key;
  selectedSlotInfo = info;
  $("dialogSlot").textContent = `${DAY_CONFIG[currentDay].role} · ${info.fullDisplay}`;

  const remembered = JSON.parse(localStorage.getItem("kingshot-player-profile") || "{}");
  $("playerId").value = remembered.playerId || "";
  $("playerName").value = remembered.playerName || "";
  $("allianceName").value = ALLIANCES.includes(remembered.alliance) ? remembered.alliance : "KCB";
  $("priority").value = "1";
  ["truegold","generalSpeed","researchSpeed","trainingSpeed","constructionSpeed"].forEach(id => $(id).value = 0);

  $("requestDialog").showModal();
  setTimeout(() => $("playerId").focus(), 20);
}

$("requestForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const playerId = $("playerId").value.trim();
  const playerName = $("playerName").value.trim();
  const alliance = $("allianceName").value;
  if (!playerId || !playerName) return;

  const profile = { playerId, playerName, alliance };
  localStorage.setItem("kingshot-player-profile", JSON.stringify(profile));

  const state = getState();
  const existing = state.requests.find(r =>
    r.slotKey === selectedSlotKey &&
    r.playerId === playerId &&
    r.status !== "withdrawn"
  );
  if (existing) {
    alert("You have already requested this slot.");
    return;
  }

  const req = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    slotKey: selectedSlotKey,
    day: currentDay,
    role: DAY_CONFIG[currentDay].role,
    playerId,
    playerName,
    alliance,
    priority: Number($("priority").value),
    resources: {
      truegold: Number($("truegold").value || 0),
      general: Number($("generalSpeed").value || 0),
      research: Number($("researchSpeed").value || 0),
      training: Number($("trainingSpeed").value || 0),
      construction: Number($("constructionSpeed").value || 0)
    },
    status: "pending",
    createdAt: Date.now()
  };

  state.requests.push(req);
  saveState(state);
  $("requestDialog").close();
  render();
});

$("cancelRequest").addEventListener("click", () => $("requestDialog").close());

function openAdmin(info) {
  selectedSlotKey = info.key;
  selectedSlotInfo = info;
  $("adminSlotLabel").textContent = `${DAY_CONFIG[currentDay].role} · ${info.fullDisplay}`;
  renderAdminApplicants();
  $("adminDialog").showModal();
}

function scoreForDay(req) {
  const r = req.resources;
  if (currentDay === "monday") {
    return r.truegold * 10 + r.general + r.construction + r.research * 0.25;
  }
  if (currentDay === "tuesday") {
    return r.truegold * 8 + r.general + r.research + r.construction * 0.5;
  }
  return r.general + r.training + r.truegold * 2;
}

function renderAdminApplicants() {
  const state = getState();
  const requests = requestsForSlot(state, selectedSlotKey)
    .slice()
    .sort((a,b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return scoreForDay(b) - scoreForDay(a);
    });

  const wrap = $("adminApplicants");
  wrap.innerHTML = "";

  if (!requests.length) {
    wrap.innerHTML = `<div class="empty-admin">Nobody has requested this slot yet.</div>`;
    return;
  }

  requests.forEach(req => {
    const isConfirmed = state.confirmed[selectedSlotKey] === req.id;
    const el = document.createElement("div");
    el.className = "applicant" + (isConfirmed ? " confirmed-applicant" : "");

    const total = req.resources.general + req.resources.research + req.resources.training + req.resources.construction;

    el.innerHTML = `
      <div class="applicant-top">
        <div>
          <span class="alliance">${req.alliance}</span>
          <strong>${req.playerName}</strong>
          <span class="meta">ID ${req.playerId}</span>
        </div>
        <span class="choice">${ordinal(req.priority)} choice</span>
      </div>
      <div class="summary">
        🏆 ${req.resources.truegold} TG ·
        💨 ${req.resources.general}h general ·
        📘 ${req.resources.research}h research ·
        ⚔️ ${req.resources.training}h training ·
        🏗️ ${req.resources.construction}h construction<br>
        Total speed-ups entered: ${total}h
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

function awardRequest(requestId) {
  const state = getState();
  const req = state.requests.find(r => r.id === requestId);
  if (!req) return;

  state.confirmed[selectedSlotKey] = requestId;
  req.status = "confirmed";

  // Withdraw other requests by the same player for the same KvK day/role.
  // The Monday→Tuesday crossover remains one shared booking.
  state.requests.forEach(r => {
    if (r.id !== requestId &&
        r.playerId === req.playerId &&
        r.role === req.role &&
        r.day === req.day &&
        r.status === "pending") {
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
  if (state.confirmed[selectedSlotKey] === requestId) delete state.confirmed[selectedSlotKey];
  saveState(state);
  renderAdminApplicants();
  render();
}

function ordinal(n) {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
}

function renderMyRequests() {
  const state = getState();
  const profile = JSON.parse(localStorage.getItem("kingshot-player-profile") || "{}");
  myRequests.innerHTML = "";

  if (!profile.playerId) {
    myRequests.innerHTML = `<div class="empty-admin">Your requests will appear here after you submit your first one.</div>`;
    return;
  }

  const mine = state.requests
    .filter(r => r.playerId === profile.playerId && r.status !== "withdrawn")
    .sort((a,b) => a.day.localeCompare(b.day) || a.priority - b.priority);

  if (!mine.length) {
    myRequests.innerHTML = `<div class="empty-admin">No active requests.</div>`;
    return;
  }

  mine.forEach(req => {
    let info = null;
    for (const day of Object.keys(DAY_CONFIG)) {
      for (let i = 0; i < DAY_CONFIG[day].slots; i++) {
        const candidate = slotInfo(day, i);
        if (candidate.key === req.slotKey && day === req.day) { info = candidate; break; }
      }
      if (info) break;
    }

    const item = document.createElement("div");
    item.className = "mine-item";
    item.innerHTML = `
      <span class="choice">${ordinal(req.priority)}</span>
      <div>
        <strong>${DAY_CONFIG[req.day].label}</strong>
        <div class="meta">${info ? info.fullDisplay : req.slotKey} · ${req.role}</div>
      </div>
      <span class="${req.status === "confirmed" ? "status confirmed" : "status pending"}">
        ${req.status === "confirmed" ? "✓ Confirmed" : "Pending"}
      </span>`;
    myRequests.appendChild(item);
  });
}

$("adminToggle").addEventListener("click", () => {
  adminMode = !adminMode;
  $("adminToggle").textContent = adminMode ? "Exit admin view" : "Admin view";
  render();
});
$("adminClose").addEventListener("click", () => $("adminDialog").close());

document.querySelectorAll(".day-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".day-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentDay = btn.dataset.day;
    render();
  });
});

$("pointsToggle").addEventListener("click", () => {
  const pc = $("pointsContent");
  pc.hidden = !pc.hidden;
  $("pointsArrow").textContent = pc.hidden ? "›" : "⌄";
});

$("clearMine").addEventListener("click", () => {
  if (!confirm("Clear your locally saved test profile and all locally stored planner data?")) return;
  localStorage.removeItem("kingshot-player-profile");
  localStorage.removeItem(STORE);
  render();
});

render();
