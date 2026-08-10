(() => {
"use strict";

const sb = window.supabase.createClient(window.KVK_CONFIG.supabaseUrl, window.KVK_CONFIG.supabaseKey);
const I = window.KVK_I18N;
const t = (key, vars) => I.t(key, vars);
const $ = id => document.getElementById(id);

const DAYS = {
  monday: {
    roleKey: "chief", roleDb: "Chief Minister", icon: "🏛️",
    startDay: "Sunday", startMinute: 23 * 60 + 45, slotCount: 49,
    tips: {
      good: ["Truegold", "Construction speed up", "Intel missions", "Master skills"],
      ok: ["Charms", "Research speed up"],
      skip: ["Troop speed up", "Roulette", "Shards", "Gather rss", "Level up pets", "Refinement pets", "Forgehammer", "Widgets", "Mithril", "Gov. gear", "Master emblem", "Manuscript"]
    }
  },
  tuesday: {
    roleKey: "chief", roleDb: "Chief Minister", icon: "🏛️",
    startDay: "Monday", startMinute: 23 * 60 + 45, slotCount: 49,
    tips: {
      good: ["Roulette", "Shards", "Gather rss", "Master skills", "Master emblem", "Manuscript"],
      ok: ["Truegold", "Construction speed up", "Research speed up"],
      skip: ["Charms", "Troop speed up", "Intel missions", "Level up pets", "Refinement pets", "Forgehammer", "Widgets", "Mithril", "Gov. gear"]
    }
  },
  thursday: {
    roleKey: "noble", roleDb: "Noble Advisor", icon: "👑",
    startDay: "Wednesday", startMinute: 23 * 60 + 45, slotCount: 49,
    tips: {
      good: ["Charms", "Troop speed up", "Gather rss"],
      ok: ["Forgehammer", "Widgets", "Mithril"],
      skip: ["Truegold", "Construction speed up", "Research speed up", "Intel missions", "Roulette", "Shards", "Level up pets", "Refinement pets", "Gov. gear", "Master skills", "Master emblem", "Manuscript"]
    }
  }
};

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const KVK_ANCHOR_UTC = Date.UTC(2026, 7, 10, 0, 0, 0); // Monday 10 Aug 2026
const KVK_CYCLE_MS = 28 * 24 * 60 * 60 * 1000;
const DAY_OFFSETS = { monday:0, tuesday:1, thursday:3 };

function plannerCycleStart(nowMs=Date.now()){
  let n = Math.floor((nowMs - KVK_ANCHOR_UTC) / KVK_CYCLE_MS);
  if(n < 0) n = 0;
  let start = KVK_ANCHOR_UTC + n * KVK_CYCLE_MS;
  const thursdayEnd = start + (4 * 24 * 60 * 60 * 1000);
  if(nowMs > thursdayEnd) start += KVK_CYCLE_MS;
  return start;
}

function applicationDeadline(day, nowMs=Date.now()){
  const cycleStart = plannerCycleStart(nowMs);
  const eventOffsetDays = DAY_OFFSETS[day];
  return new Date(cycleStart + (eventOffsetDays - 1) * 24 * 60 * 60 * 1000 + 20 * 60 * 60 * 1000);
}

function formatDeadlineDate(date){
  const localeMap={en:"en-GB",zh_tw:"zh-TW",fr:"fr-FR",de:"de-DE",es:"es-ES",tr:"tr-TR",nl:"nl-NL",it:"it-IT",ko:"ko-KR",ja:"ja-JP",fil:"en-PH"};
  return new Intl.DateTimeFormat(localeMap[I.current]||"en-GB",{weekday:"short",day:"numeric",month:"short",timeZone:"UTC"}).format(date);
}

function requestsOpen(day=currentDay){
  return Date.now() < applicationDeadline(day).getTime();
}

function renderDeadline(){
  const deadline=applicationDeadline(currentDay);
  const open=requestsOpen(currentDay);
  const info=document.querySelector(".info-bar");
  if(info){
    info.classList.toggle("deadline-open",open);
    info.classList.toggle("deadline-closed",!open);
  }
  if($("deadlineText")) $("deadlineText").textContent=t(open?"applications_close":"applications_closed",{date:formatDeadlineDate(deadline)});
  if($("deadlineState")) $("deadlineState").textContent=t(open?"open_for_requests":"closed_for_requests");
}

let currentDay = "monday";
let selected = new Set();
let user = null;
let profile = null;
let appointments = [];
let myRequests = [];
let publicActivity = [];

const esc = value => String(value ?? "")
  .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");

function initTheme(){
  const saved = localStorage.getItem("kvkTheme") || "pink";
  document.documentElement.dataset.theme = saved;
  const selector = $("themeSelect");
  if(selector){
    selector.value = saved;
    selector.addEventListener("change", () => {
      document.documentElement.dataset.theme = selector.value;
      localStorage.setItem("kvkTheme", selector.value);
    });
  }
}

function initLanguage(){
  const selector = $("languageSelect");
  if(selector){
    selector.value = I.current;
    selector.addEventListener("change", () => I.set(selector.value));
  }
}

function timePoint(startDay, startMinute, offsetMinutes){
  let dayIndex = DAY_NAMES.indexOf(startDay);
  let minute = startMinute + offsetMinutes;
  while(minute >= 1440){ minute -= 1440; dayIndex = (dayIndex + 1) % 7; }
  return {
    day: DAY_NAMES[dayIndex],
    time: `${String(Math.floor(minute/60)).padStart(2,"0")}:${String(minute%60).padStart(2,"0")}`
  };
}

function getSlot(day, index){
  const cfg = DAYS[day];
  const start = timePoint(cfg.startDay, cfg.startMinute, index * 30);
  const end = timePoint(cfg.startDay, cfg.startMinute, (index + 1) * 30);
  let key = `${day}-${index}`;

  // Monday 23:45→Tuesday 00:15 and Tuesday's first slot are the same minister appointment.
  if((day === "monday" && index === 48) || (day === "tuesday" && index === 0)){
    key = "chief-crossover";
  }

  return {
    key,
    display: `${start.time}–${end.time}`,
    full: start.day === end.day ? `${start.day} ${start.time}–${end.time}` : `${start.day} ${start.time} → ${end.day} ${end.time}`,
    cross: start.day !== end.day
  };
}

function roleText(day=currentDay){ return t(DAYS[day].roleKey); }
function titleText(day){ return t(`${day}_title`); }
function dayText(day){ return t(day); }

function setText(selector, value){
  const el = document.querySelector(selector);
  if(el) el.textContent = value;
}

function applyTranslations(){
  document.title = t("planner");

  const brand = document.querySelector(".brand-block h1");
  if(brand) brand.innerHTML = `<span class="server-number">1423</span> ⚔️ ${t("planner")}`;

  setText('a[href="admin.html"]', t("admin_login"));
  if($("profileBtn")) $("profileBtn").textContent = t("my_profile");
  if($("roleSmall")) $("roleSmall").textContent = roleText();
  setText(".info-bar strong", t("select_slots"));
  setText("#tipsToggle strong", t("points_tips"));
  setText("#lockedPanel > span", "🔒 " + t("profile_gate"));
  if($("lockedProfileBtn")) $("lockedProfileBtn").textContent = t("complete_profile");
  setText("#selectionPanel strong", t("choose_times"));
  setText("#selectionPanel p", t("choose_help"));
  if($("submitBtn")) $("submitBtn").textContent = t("submit");
  setText(".my-requests .schedule-header strong", t("my_requests"));
  setText(".my-requests .schedule-header small", t("my_requests_help"));
  if($("crossoverNote")) $("crossoverNote").textContent = "🔁 " + t("crossover");

  document.querySelectorAll(".day-tab").forEach(btn => {
    const day = btn.dataset.day;
    const span = btn.querySelector("span");
    if(!span) return;
    const textNode = [...span.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
    if(textNode) textNode.textContent = titleText(day);
    const small = span.querySelector("small");
    if(small) small.textContent = dayText(day);
  });

  document.querySelectorAll("[data-i18n]").forEach(el => el.textContent = t(el.dataset.i18n));
  setText(".resource-box h3", t("resources"));
  document.querySelectorAll('[data-close="profileDialog"]').forEach(btn => {
    if(btn.textContent.trim() !== "×") btn.textContent = t("cancel");
  });
}

function setBanner(message, kind=""){
  const el = $("connectionBanner");
  if(!el) return;
  el.textContent = message;
  el.className = `connection-banner ${kind}`.trim();
}

async function ensureAnonymousAuth(){
  const { data: { session } } = await sb.auth.getSession();
  if(session){ user = session.user; return; }

  const { data, error } = await sb.auth.signInAnonymously();
  if(error) throw new Error("Anonymous sign-in is not enabled in Supabase.");
  user = data.user;
}

async function loadProfile(){
  const { data, error } = await sb
    .from("player_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if(error) throw error;
  profile = data;
}

async function loadSharedData(){
  const [appointmentsResult, activityResult] = await Promise.all([
    sb.from("appointments").select("slot_key,event_day,minister_role,player_name,alliance"),
    sb.rpc("get_public_slot_activity")
  ]);

  if(appointmentsResult.error) throw appointmentsResult.error;
  if(activityResult.error) throw activityResult.error;

  appointments = appointmentsResult.data || [];
  publicActivity = activityResult.data || [];

  if(profile){
    const { data, error } = await sb
      .from("slot_requests")
      .select("id,slot_key,event_day,minister_role,status")
      .eq("profile_id", profile.id);

    if(error) throw error;
    myRequests = data || [];
  }else{
    myRequests = [];
  }
}

function appointmentFor(slotKey){
  return appointments.find(a => a.slot_key === slotKey) || null;
}

function ownRequestFor(slotKey){
  return myRequests.find(r => r.slot_key === slotKey && ["pending","confirmed"].includes(r.status)) || null;
}

function pendingFor(slotKey){
  return publicActivity.filter(r => r.slot_key === slotKey && r.status === "pending");
}

function pendingPlayersHtml(slotKey){
  return pendingFor(slotKey)
    .map(r => `<span class="pending-player"><span class="alliance">${esc(r.alliance)}</span><strong>${esc(r.player_name)}</strong></span>`)
    .join("");
}

function renderTips(){
  const tips = DAYS[currentDay].tips;
  const groups = [
    ["good", "✅ " + t("great"), tips.good],
    ["ok", "🟧 " + t("ok"), tips.ok],
    ["skip", "⛔ " + t("skip"), tips.skip]
  ];

  $("tipsPanel").innerHTML = groups.map(([cls, heading, items]) =>
    `<div class="tip ${cls}"><h4>${heading}</h4><div class="chips">${items.map(i => `<span>${i}</span>`).join("")}</div></div>`
  ).join("");
}

function updateProfileGate(){
  const loggedIn = !!profile;
  const needsResources = !!profile?.resource_snapshot_required;
  const status = $("profileStatus");

  if(status){
    if(!loggedIn){
      status.textContent = t("profile_required");
      status.className = "profile-status incomplete";
    }else if(needsResources){
      status.textContent = `⚠ ${profile.alliance} · ${profile.player_name} · UPDATE RESOURCES`;
      status.className = "profile-status incomplete";
    }else{
      status.textContent = `✓ ${profile.alliance} · ${profile.player_name} · ID ${profile.player_id}`;
      status.className = "profile-status complete";
    }
  }

  if($("lockedPanel")) $("lockedPanel").hidden = loggedIn && !needsResources;
  if($("selectionPanel")) $("selectionPanel").hidden = !loggedIn || needsResources;

  const dialog = $("profileDialog");

  if(!loggedIn){
    if(dialog && !dialog.open) openProfile(false);
    return;
  }

  if(needsResources && dialog && !dialog.open){
    openProfile(true, true);
  }
}

function renderSchedule(){
  applyTranslations();
  renderTips();
  renderDeadline();

  $("roleTitle").textContent = `${DAYS[currentDay].icon} ${roleText()}`;
  $("crossoverNote").hidden = currentDay !== "tuesday";

  const list = $("slotList");
  list.innerHTML = "";

  let confirmedCount = 0;

  for(let i=0; i<DAYS[currentDay].slotCount; i++){
    const slot = getSlot(currentDay, i);
    const appointment = appointmentFor(slot.key);
    const own = ownRequestFor(slot.key);
    const pending = pendingFor(slot.key);

    if(appointment) confirmedCount++;

    const row = document.createElement("div");
    row.className = [
      "slot",
      slot.cross ? "cross" : "",
      appointment ? "confirmed" : (pending.length ? "pending" : ""),
      selected.has(slot.key) ? "selected" : ""
    ].filter(Boolean).join(" ");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selected.has(slot.key);
    checkbox.disabled = !profile || !!appointment || !requestsOpen(currentDay);
    checkbox.addEventListener("click", e => {
      e.stopPropagation();
      toggleSlot(slot.key);
    });

    const time = document.createElement("div");
    time.className = "slot-time";
    time.textContent = slot.display;

    const main = document.createElement("div");
    main.className = "slot-main";

    if(appointment){
      main.innerHTML = `<span class="alliance">${esc(appointment.alliance)}</span><strong>${esc(appointment.player_name)}</strong>`;
    }else if(pending.length){
      main.innerHTML = `<div class="pending-stack">${pendingPlayersHtml(slot.key)}</div>`;
    }else{
      main.innerHTML = `<span class="muted">${t("available")}</span>`;
    }

    const status = document.createElement("div");
    status.className = "slot-status";
    status.textContent = appointment
      ? `✓ ${t("confirmed")}`
      : (pending.length ? t("pending_count", {n: pending.length}) : "");

    row.append(checkbox, time, main, status);
    row.addEventListener("click", () => {
      if(profile && !appointment && requestsOpen(currentDay)) toggleSlot(slot.key);
    });

    list.appendChild(row);
  }

  $("scheduleSummary").textContent = t("confirmed_count", {n: confirmedCount});
  $("confirmedBadge").textContent = t("confirmed_count", {n: confirmedCount});

  $("selectionCount").textContent = t("selected", {n: selected.size});
  $("selectionCount").classList.toggle("valid", selected.size >= 3 && selected.size <= 5);
  $("submitBtn").disabled = !profile || !requestsOpen(currentDay) || selected.size < 3 || selected.size > 5;

  renderMyRequests();
  updateProfileGate();
}

function toggleSlot(slotKey){
  if(selected.has(slotKey)){
    selected.delete(slotKey);
  }else{
    if(selected.size >= 5){
      alert(t("max_five"));
      return;
    }
    selected.add(slotKey);
  }
  renderSchedule();
}

function renderMyRequests(){
  const box = $("myRequests");

  if(!profile){
    box.innerHTML = `<p class="muted" style="padding:10px 14px">${t("complete_first")}</p>`;
    return;
  }

  const active = myRequests.filter(r => ["pending","confirmed"].includes(r.status));
  if(!active.length){
    box.innerHTML = `<p class="muted" style="padding:10px 14px">${t("no_active")}</p>`;
    return;
  }

  box.innerHTML = active.map(r => {
    let display = r.slot_key;
    for(let i=0; i<DAYS[r.event_day].slotCount; i++){
      const s = getSlot(r.event_day, i);
      if(s.key === r.slot_key){ display = s.full; break; }
    }

    return `<div class="request-row">
      <span class="alliance">${esc(profile.alliance)}</span>
      <div><strong>${titleText(r.event_day)}</strong><div class="muted">${display} · ${roleText(r.event_day)}</div></div>
      <span class="${r.status === "confirmed" ? "status-confirmed" : "status-pending"}">${r.status === "confirmed" ? `✓ ${t("confirmed")}` : t("pending")}</span>
    </div>`;
  }).join("");
}

function resetProfileDialog(){
  $("profileError").hidden = true;
  $("profileLookupStatus").hidden = true;
  $("profileDetails").hidden = true;
  $("saveProfileBtn").hidden = true;
  $("findProfileBtn").hidden = false;
  $("playerId").disabled = false;
  $("profileDialogTitle").textContent = t("find_profile");
  $("profileIntro").textContent = t("find_intro");
  $("findProfileBtn").textContent = t("continue");
  $("saveProfileBtn").textContent = t("save");
}

function fillProfileFields(data){
  $("playerName").value = data?.player_name || "";
  $("alliance").value = data?.alliance || "KCB";
  $("truegold").value = data?.truegold ?? 0;
  $("general").value = data?.general_speedups ?? 0;
  $("research").value = data?.research_speedups ?? 0;
  $("training").value = data?.training_speedups ?? 0;
  $("construction").value = data?.construction_speedups ?? 0;
}

function openProfile(editExisting=true, forceResourceRefresh=false){
  resetProfileDialog();

  if(profile && editExisting){
    $("profileDialogTitle").textContent = forceResourceRefresh ? "Update your KvK resources" : t("my_profile");
    $("profileIntro").textContent = forceResourceRefresh
      ? "A new KvK cycle has started. Please enter your current resource totals before requesting appointments."
      : t("edit_intro");
    $("playerId").value = profile.player_id;
    $("playerId").disabled = true;
    $("findProfileBtn").hidden = true;
    $("profileDetails").hidden = false;
    $("saveProfileBtn").hidden = false;
    fillProfileFields(profile);
  }else{
    $("playerId").value = "";
    fillProfileFields(null);
  }

  $("profileDialog").showModal();
}

async function findOrClaimProfile(){
  const playerId = $("playerId").value.trim();
  const errorBox = $("profileError");
  const statusBox = $("profileLookupStatus");

  errorBox.hidden = true;
  statusBox.hidden = true;

  if(!playerId){
    errorBox.textContent = t("enter_id");
    errorBox.hidden = false;
    return;
  }

  $("findProfileBtn").disabled = true;
  $("findProfileBtn").textContent = t("checking");

  try{
    const { data: profileId, error } = await sb.rpc("claim_player_profile", { p_player_id: playerId });
    if(error) throw error;

    if(profileId){
      await loadProfile();

      // Fallback if PostgREST/session state is one tick behind.
      if(!profile){
        const direct = await sb.from("player_profiles").select("*").eq("id", profileId).maybeSingle();
        if(direct.error) throw direct.error;
        profile = direct.data;
      }

      await loadSharedData();
      $("profileDialog").close();
      renderSchedule();
      setBanner(`✓ ${t("welcome",{name:profile.player_name})}`, "ok");
      return;
    }

    $("profileDialogTitle").textContent = t("create_profile");
    $("profileIntro").textContent = t("create_intro");
    $("profileDetails").hidden = false;
    $("saveProfileBtn").hidden = false;
    $("findProfileBtn").hidden = true;
    $("playerId").disabled = true;
    statusBox.textContent = t("new_id");
    statusBox.className = "lookup-status new";
    statusBox.hidden = false;

  }catch(error){
    errorBox.textContent = error.message;
    errorBox.hidden = false;
  }finally{
    $("findProfileBtn").disabled = false;
    $("findProfileBtn").textContent = t("continue");
  }
}

async function saveProfile(event){
  event.preventDefault();
  const errorBox = $("profileError");
  errorBox.hidden = true;

  if($("profileDetails").hidden) return;

  const payload = {
    user_id: user.id,
    player_id: profile?.player_id || $("playerId").value.trim(),
    player_name: $("playerName").value.trim(),
    alliance: $("alliance").value,
    truegold: Number($("truegold").value) || 0,
    general_speedups: Number($("general").value) || 0,
    research_speedups: Number($("research").value) || 0,
    training_speedups: Number($("training").value) || 0,
    construction_speedups: Number($("construction").value) || 0,
    resource_snapshot_required: false
  };

  if(!payload.player_name){
    errorBox.textContent = t("enter_name");
    errorBox.hidden = false;
    return;
  }

  const query = profile
    ? sb.from("player_profiles").update(payload).eq("id", profile.id).select().single()
    : sb.from("player_profiles").insert(payload).select().single();

  const { data, error } = await query;

  if(error){
    errorBox.textContent = error.message;
    errorBox.hidden = false;
    return;
  }

  profile = data;
  $("profileDialog").close();
  await refresh();
}

async function submitRequests(){
  if(!requestsOpen(currentDay)){
    alert(t("deadline_passed"));
    return;
  }
  const { error } = await sb.rpc("submit_slot_requests", {
    p_event_day: currentDay,
    p_slot_keys: [...selected]
  });

  if(error){
    alert(error.message);
    return;
  }

  selected.clear();
  await refresh();
  alert(t("requests_saved"));
}

async function refresh(){
  await loadProfile();
  await loadSharedData();
  renderSchedule();
}

function bindEvents(){
  document.querySelectorAll(".day-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".day-tab").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      currentDay = btn.dataset.day;
      selected.clear();
      renderSchedule();
    });
  });

  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => $(btn.dataset.close).close());
  });

  $("profileBtn").addEventListener("click", () => openProfile(true));
  $("lockedProfileBtn").addEventListener("click", () => openProfile(false));
  $("findProfileBtn").addEventListener("click", findOrClaimProfile);
  $("profileForm").addEventListener("submit", saveProfile);
  $("submitBtn").addEventListener("click", submitRequests);
  $("tipsToggle").addEventListener("click", () => {
    $("tipsPanel").hidden = !$("tipsPanel").hidden;
    $("tipsArrow").textContent = $("tipsPanel").hidden ? "›" : "⌄";
  });

  window.addEventListener("kvk-language-changed", renderSchedule);
}

async function start(){
  initTheme();
  initLanguage();
  bindEvents();

  try{
    setBanner(t("connecting"));
    await ensureAnonymousAuth();
    await refresh();
    setBanner(`✓ ${t("connected")}`, "ok");
  }catch(error){
    console.error(error);
    setBanner(error.message, "error");
  }
}

start();
})();