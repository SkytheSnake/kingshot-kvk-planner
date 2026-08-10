(() => {
  "use strict";

  const DAYS = {
    monday: {
      title: "Monday — City Construction",
      role: "Chief Minister",
      icon: "🏛️",
      startDay: "Sunday",
      startMinute: 23 * 60 + 45,
      slotCount: 49,
      tips: {
        good: ["Truegold", "Construction speed up", "Intel missions", "Master skills"],
        ok: ["Charms", "Research speed up"],
        skip: ["Troop speed up", "Roulette", "Shards", "Gather rss", "Level up pets", "Refinement pets", "Forgehammer", "Widgets", "Mithril", "Gov. gear", "Master emblem", "Manuscript"]
      }
    },
    tuesday: {
      title: "Tuesday — Basic Skills",
      role: "Chief Minister",
      icon: "🏛️",
      startDay: "Monday",
      startMinute: 23 * 60 + 45,
      slotCount: 49,
      tips: {
        good: ["Roulette", "Shards", "Gather rss", "Master skills", "Master emblem", "Manuscript"],
        ok: ["Truegold", "Construction speed up", "Research speed up"],
        skip: ["Charms", "Troop speed up", "Intel missions", "Level up pets", "Refinement pets", "Forgehammer", "Widgets", "Mithril", "Gov. gear"]
      }
    },
    thursday: {
      title: "Thursday — Hero Development",
      role: "Noble Advisor",
      icon: "👑",
      startDay: "Wednesday",
      startMinute: 23 * 60 + 45,
      slotCount: 49,
      tips: {
        good: ["Charms", "Troop speed up", "Gather rss"],
        ok: ["Forgehammer", "Widgets", "Mithril"],
        skip: ["Truegold", "Construction speed up", "Research speed up", "Intel missions", "Roulette", "Shards", "Level up pets", "Refinement pets", "Gov. gear", "Master skills", "Master emblem", "Manuscript"]
      }
    }
  };

  const STATE_KEY = "kvkPlannerRebuiltState";
  const PROFILE_KEY = "kvkPlannerRebuiltProfile";
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  let currentDay = "monday";
  let adminMode = false;
  let selected = new Set();
  let activeAdminSlot = null;

  const $ = (id) => document.getElementById(id);

  function defaultState() {
    return { requests: [], confirmed: {} };
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STATE_KEY));
      if (!parsed || !Array.isArray(parsed.requests) || typeof parsed.confirmed !== "object") {
        return defaultState();
      }
      return parsed;
    } catch {
      return defaultState();
    }
  }

  function saveState(state) {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  function loadProfile() {
    try {
      return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  function timePoint(startDay, startMinute, offset) {
    let dayIndex = dayNames.indexOf(startDay);
    let minute = startMinute + offset;
    while (minute >= 1440) {
      minute -= 1440;
      dayIndex = (dayIndex + 1) % 7;
    }
    return {
      day: dayNames[dayIndex],
      time: `${String(Math.floor(minute / 60)).padStart(2,"0")}:${String(minute % 60).padStart(2,"0")}`
    };
  }

  function getSlot(day, index) {
    const cfg = DAYS[day];
    const start = timePoint(cfg.startDay, cfg.startMinute, index * 30);
    const end = timePoint(cfg.startDay, cfg.startMinute, (index + 1) * 30);

    let key = `${day}-${index}`;
    if ((day === "monday" && index === 48) || (day === "tuesday" && index === 0)) {
      key = "chief-crossover";
    }

    return {
      key,
      day,
      index,
      start,
      end,
      display: `${start.time}–${end.time}`,
      full: start.day === end.day
        ? `${start.day} ${start.time}–${end.time}`
        : `${start.day} ${start.time} → ${end.day} ${end.time}`,
      crosses: start.day !== end.day
    };
  }

  function activeRequestsForSlot(state, key) {
    return state.requests.filter(r => r.slotKey === key && r.status !== "withdrawn");
  }

  function getConfirmedRequest(state, key) {
    const requestId = state.confirmed[key];
    return state.requests.find(r => r.id === requestId) || null;
  }

  function renderTips() {
    const tips = DAYS[currentDay].tips;
    $("tipsPanel").innerHTML = [
      ["good","✅ GREAT FOR POINTS",tips.good],
      ["ok","🟧 OK FOR POINTS",tips.ok],
      ["skip","⛔ SKIP TODAY",tips.skip]
    ].map(([cls,title,items]) => `
      <div class="tip ${cls}">
        <h4>${title}</h4>
        <div class="chips">${items.map(i => `<span>${i}</span>`).join("")}</div>
      </div>
    `).join("");
  }

  function toggleSlot(key) {
    if (selected.has(key)) {
      selected.delete(key);
    } else {
      if (selected.size >= 5) {
        alert("You can select a maximum of 5 slots.");
        return;
      }
      selected.add(key);
    }
    render();
  }

  function render() {
    const cfg = DAYS[currentDay];
    const state = loadState();
    const list = $("slotList");

    $("roleSmall").textContent = cfg.role;
    $("roleTitle").textContent = `${cfg.icon} ${cfg.role}`;
    $("crossoverNote").hidden = currentDay !== "tuesday";
    $("adminNote").hidden = !adminMode;
    $("selectionPanel").hidden = adminMode;
    renderTips();

    let confirmedTotal = 0;
    let requestTotal = 0;
    list.innerHTML = "";

    for (let i = 0; i < cfg.slotCount; i++) {
      const slot = getSlot(currentDay, i);
      const requests = activeRequestsForSlot(state, slot.key);
      const confirmed = getConfirmedRequest(state, slot.key);

      if (confirmed) confirmedTotal++;
      requestTotal += requests.length;

      const row = document.createElement("div");
      row.className = "slot";
      if (slot.crosses) row.classList.add("cross");
      if (confirmed) row.classList.add("confirmed");
      else if (requests.length) row.classList.add("pending");
      if (selected.has(slot.key)) row.classList.add("selected");

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = selected.has(slot.key);
      cb.disabled = adminMode || Boolean(confirmed);
      cb.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleSlot(slot.key);
      });

      const time = document.createElement("div");
      time.className = "slot-time";
      time.textContent = slot.display;

      const main = document.createElement("div");
      main.className = "slot-main";

      if (confirmed) {
        main.innerHTML = `<span class="alliance">${confirmed.alliance}</span><strong>${escapeHtml(confirmed.playerName)}</strong>`;
      } else if (requests.length) {
        main.innerHTML = `<span>${requests.length} request${requests.length === 1 ? "" : "s"} pending</span>`;
      } else {
        main.innerHTML = `<span class="muted">${adminMode ? "No requests" : "Available"}</span>`;
      }

      const status = document.createElement("div");
      status.className = "slot-status";
      status.textContent = confirmed ? "✓ Confirmed" : (requests.length ? `${requests.length} pending` : "");

      row.append(cb, time, main, status);

      row.addEventListener("click", () => {
        if (adminMode) {
          openAdmin(slot);
        } else if (!confirmed) {
          toggleSlot(slot.key);
        }
      });

      list.appendChild(row);
    }

    $("scheduleSummary").textContent = `${confirmedTotal}/${cfg.slotCount} confirmed`;
    $("confirmedBadge").textContent = `${confirmedTotal} confirmed`;
    $("pendingBadge").textContent = `${requestTotal} request${requestTotal === 1 ? "" : "s"}`;

    const count = selected.size;
    $("selectionCount").textContent = `${count} of 5 selected`;
    $("selectionCount").classList.toggle("valid", count >= 3 && count <= 5);
    $("submitBtn").disabled = adminMode || count < 3 || count > 5;

    renderMyRequests();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function openProfile() {
    const p = loadProfile();
    $("playerId").value = p.playerId || "";
    $("playerName").value = p.playerName || "";
    $("alliance").value = ["PAR","VIK","KCB","FOR"].includes(p.alliance) ? p.alliance : "KCB";
    $("truegold").value = p.resources?.truegold ?? 0;
    $("general").value = p.resources?.general ?? 0;
    $("research").value = p.resources?.research ?? 0;
    $("training").value = p.resources?.training ?? 0;
    $("construction").value = p.resources?.construction ?? 0;
    $("profileDialog").showModal();
  }

  function saveProfileFromForm(event) {
    event.preventDefault();
    const profile = {
      playerId: $("playerId").value.trim(),
      playerName: $("playerName").value.trim(),
      alliance: $("alliance").value,
      resources: {
        truegold: Number($("truegold").value || 0),
        general: Number($("general").value || 0),
        research: Number($("research").value || 0),
        training: Number($("training").value || 0),
        construction: Number($("construction").value || 0)
      }
    };
    saveProfile(profile);
    $("profileDialog").close();
    render();
  }

  function submitRequests() {
    if (selected.size < 3 || selected.size > 5) return;

    const profile = loadProfile();
    if (!profile.playerId || !profile.playerName || !profile.alliance) {
      alert("Please save your KvK profile first.");
      openProfile();
      return;
    }

    const state = loadState();
    const existing = new Set(
      state.requests
        .filter(r => r.playerId === profile.playerId && r.day === currentDay && r.status !== "withdrawn")
        .map(r => r.slotKey)
    );

    for (const key of selected) {
      if (existing.has(key) || state.confirmed[key]) continue;

      state.requests.push({
        id: (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
        slotKey: key,
        day: currentDay,
        role: DAYS[currentDay].role,
        playerId: profile.playerId,
        playerName: profile.playerName,
        alliance: profile.alliance,
        resources: { ...profile.resources },
        status: "pending",
        createdAt: Date.now()
      });
    }

    saveState(state);
    selected.clear();
    render();
    alert("Your slot requests have been submitted.");
  }

  function renderMyRequests() {
    const state = loadState();
    const profile = loadProfile();
    const box = $("myRequests");

    if (!profile.playerId) {
      box.innerHTML = `<p class="muted" style="padding:10px 14px">Save your KvK profile first.</p>`;
      return;
    }

    const mine = state.requests.filter(r => r.playerId === profile.playerId && r.status !== "withdrawn");
    if (!mine.length) {
      box.innerHTML = `<p class="muted" style="padding:10px 14px">No active requests yet.</p>`;
      return;
    }

    box.innerHTML = mine.map(r => {
      let label = r.slotKey;
      const cfg = DAYS[r.day];
      for (let i=0; i<cfg.slotCount; i++) {
        const slot = getSlot(r.day, i);
        if (slot.key === r.slotKey) {
          label = slot.full;
          break;
        }
      }
      return `
        <div class="request-row">
          <span class="alliance">${r.alliance}</span>
          <div><strong>${DAYS[r.day].title}</strong><div class="muted">${label} · ${r.role}</div></div>
          <span class="${r.status === "confirmed" ? "status-confirmed" : "status-pending"}">${r.status === "confirmed" ? "✓ Confirmed" : "Pending"}</span>
        </div>
      `;
    }).join("");
  }

  function openAdmin(slot) {
    activeAdminSlot = slot;
    $("adminSlotLabel").textContent = `${DAYS[currentDay].role} · ${slot.full}`;
    renderApplicants();
    $("adminDialog").showModal();
  }

  function relevantScore(req) {
    const r = req.resources || {};
    if (currentDay === "monday") return (r.truegold||0)*10 + (r.general||0) + (r.construction||0);
    if (currentDay === "tuesday") return (r.truegold||0)*8 + (r.general||0) + (r.research||0) + (r.construction||0)*0.5;
    return (r.general||0) + (r.training||0) + (r.truegold||0)*2;
  }

  function renderApplicants() {
    const state = loadState();
    const applicants = activeRequestsForSlot(state, activeAdminSlot.key)
      .slice()
      .sort((a,b) => relevantScore(b) - relevantScore(a));

    if (!applicants.length) {
      $("adminApplicants").innerHTML = `<p class="muted">Nobody has requested this slot.</p>`;
      return;
    }

    $("adminApplicants").innerHTML = "";
    for (const req of applicants) {
      const confirmed = state.confirmed[activeAdminSlot.key] === req.id;
      const r = req.resources || {};
      const div = document.createElement("div");
      div.className = "applicant" + (confirmed ? " confirmed" : "");
      div.innerHTML = `
        <div class="applicant-head">
          <div><span class="alliance">${req.alliance}</span> <strong>${escapeHtml(req.playerName)}</strong></div>
          <small class="muted">ID ${escapeHtml(req.playerId)}</small>
        </div>
        <div class="resource-summary">
          🏆 ${r.truegold||0} TG · 💨 ${r.general||0}h general · 📘 ${r.research||0}h research ·
          ⚔️ ${r.training||0}h training · 🏗️ ${r.construction||0}h construction
        </div>
        <div class="applicant-actions">
          <button class="primary award">${confirmed ? "Confirmed" : "Award Slot"}</button>
          <button class="danger reject">Reject</button>
        </div>
      `;
      div.querySelector(".award").addEventListener("click", () => award(req.id));
      div.querySelector(".reject").addEventListener("click", () => reject(req.id));
      $("adminApplicants").appendChild(div);
    }
  }

  function award(requestId) {
    const state = loadState();
    const req = state.requests.find(r => r.id === requestId);
    if (!req) return;

    const previousId = state.confirmed[activeAdminSlot.key];
    if (previousId && previousId !== requestId) {
      const previous = state.requests.find(r => r.id === previousId);
      if (previous) previous.status = "pending";
    }

    state.confirmed[activeAdminSlot.key] = requestId;
    req.status = "confirmed";

    for (const other of state.requests) {
      if (other.id !== req.id && other.playerId === req.playerId && other.day === req.day && other.status === "pending") {
        other.status = "withdrawn";
      }
    }

    saveState(state);
    renderApplicants();
    render();
  }

  function reject(requestId) {
    const state = loadState();
    const req = state.requests.find(r => r.id === requestId);
    if (!req) return;

    req.status = "withdrawn";
    if (state.confirmed[activeAdminSlot.key] === requestId) {
      delete state.confirmed[activeAdminSlot.key];
    }

    saveState(state);
    renderApplicants();
    render();
  }

  document.querySelectorAll(".day-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".day-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentDay = btn.dataset.day;
      selected.clear();
      render();
    });
  });

  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => $(btn.dataset.close).close());
  });

  $("profileBtn").addEventListener("click", openProfile);
  $("profileForm").addEventListener("submit", saveProfileFromForm);
  $("submitBtn").addEventListener("click", submitRequests);

  $("adminBtn").addEventListener("click", () => {
    adminMode = !adminMode;
    selected.clear();
    $("adminBtn").textContent = adminMode ? "Exit Admin View" : "Admin View";
    render();
  });

  $("tipsToggle").addEventListener("click", () => {
    $("tipsPanel").hidden = !$("tipsPanel").hidden;
    $("tipsArrow").textContent = $("tipsPanel").hidden ? "›" : "⌄";
  });

  render();
})();
