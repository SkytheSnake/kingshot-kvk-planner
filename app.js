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

function dayFinalised(day=currentDay){
  return !!daySettings.find(x=>x.event_day===day)?.is_finalised;
}

function tabDateFor(day){
  const offsets={monday:0,tuesday:1,thursday:3};
  const d=new Date(plannerCycleStart()+offsets[day]*86400000);
  return {
    dow:new Intl.DateTimeFormat("en-GB",{weekday:"short",timeZone:"UTC"}).format(d).toUpperCase(),
    date:new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",timeZone:"UTC"}).format(d).toUpperCase()
  };
}

function renderDayDates(){
  ["monday","tuesday","thursday"].forEach(day=>{
    const el=$(`${day}Date`);
    if(!el)return;
    const x=tabDateFor(day);
    el.innerHTML=`<strong>${x.dow}</strong>${x.date}`;
  });
}

function currentConfirmedAppointment(){
  if(!profile) return null;
  const ownConfirmed=myRequests.find(r=>r.event_day===currentDay && r.status==="confirmed");
  if(!ownConfirmed) return null;
  return appointmentFor(ownConfirmed.slot_key);
}

function formatCountdown(ms){
  if(ms<=0) return "0m";
  const totalMinutes=Math.floor(ms/60000);
  const days=Math.floor(totalMinutes/1440);
  const hours=Math.floor((totalMinutes%1440)/60);
  const mins=totalMinutes%60;
  return [days?`${days}d`:null,hours?`${hours}h`:null,`${mins}m`].filter(Boolean).join(" ");
}

function renderConfirmedBanner(){
  const banner=$("confirmedAppointmentBanner");
  if(!banner) return;
  const own=myRequests.find(r=>r.event_day===currentDay && r.status==="confirmed");
  if(!own){ banner.hidden=true; return; }

  let slotLabel=own.slot_key;
  for(let i=0;i<DAYS[currentDay].slotCount;i++){
    const s=getSlot(currentDay,i);
    if(s.key===own.slot_key){ slotLabel=s.full; break; }
  }

  banner.textContent=t("confirmed_banner",{role:roleText(currentDay),time:slotLabel});
  banner.hidden=false;
}

function renderReplaceWarning(){
  const el=$("replaceWarning");
  if(!el) return;
  const hasExisting=myRequests.some(r=>r.event_day===currentDay && r.status==="pending");
  el.hidden=!hasExisting;
  if(hasExisting) el.textContent=t("replace_warning");
}

function renderDeadline(){
  const deadline=applicationDeadline(currentDay);
  const finalised=dayFinalised(currentDay);
  const open=requestsOpen(currentDay) && !finalised;
  const info=document.querySelector(".info-bar");

  if(info){
    info.classList.toggle("deadline-open",open);
    info.classList.toggle("deadline-closed",!open);
  }

  if($("deadlineText")){
    $("deadlineText").textContent=finalised
      ? t("day_finalised")
      : t(open?"applications_close":"applications_closed",{date:formatDeadlineDate(deadline)});
  }

  if($("deadlineState")){
    $("deadlineState").textContent=finalised?t("read_only"):t(open?"open_for_requests":"closed_for_requests");
  }

  if($("deadlineCountdown")){
    $("deadlineCountdown").textContent=open?t("countdown",{time:formatCountdown(deadline.getTime()-Date.now())}):"";
  }
}

let currentDay = "monday";
let selected = new Set();
let user = null;
let profile = null;
let appointments = [];
let myRequests = [];
let publicActivity = [];
let daySettings = [];
let countdownTimer = null;
let profilePopupTimer = null;
let profileAutoPromptScheduled = false;
let profileAutoPromptShown = false;
const PROFILE_POPUP_DELAY_MS = 2000;

const esc = value => String(value ?? "")
  .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");

function initTheme(){
  const saved = localStorage.getItem("kvkTheme") || "pink";
  applyTheme(saved);

  const selector = $("themeSelect");
  if(selector){
    selector.value = saved;
    selector.addEventListener("change", () => applyTheme(selector.value));
  }

  document.querySelectorAll("[data-theme-choice]").forEach(btn=>{
    btn.addEventListener("click",()=>applyTheme(btn.dataset.themeChoice));
  });
}

function applyTheme(theme){
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("kvkTheme", theme);

  const selector = $("themeSelect");
  if(selector) selector.value = theme;

  const names={pink:"Retro Pink",purple:"Electric Purple",teal:"Neon Teal",green:"Matrix Green",blue:"Electric Blue"};
  document.querySelectorAll("[data-theme-choice]").forEach(btn=>{
    btn.classList.toggle("active",btn.dataset.themeChoice===theme);
  });
  if($("themeName")) $("themeName").textContent=names[theme]||theme;
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
    .order("updated_at", { ascending:false })
    .limit(1);

  if(error) throw error;
  profile = data?.[0] || null;
}

async function loadSharedData(){
  const [appointmentsResult, activityResult, daySettingsResult] = await Promise.all([
    sb.from("appointments").select("slot_key,event_day,minister_role,player_name,alliance"),
    sb.rpc("get_public_slot_activity"),
    sb.from("day_settings").select("event_day,is_finalised")
  ]);

  if(appointmentsResult.error) throw appointmentsResult.error;
  if(activityResult.error) throw activityResult.error;
  if(daySettingsResult.error) throw daySettingsResult.error;

  appointments = appointmentsResult.data || [];
  publicActivity = activityResult.data || [];
  daySettings = daySettingsResult.data || [];

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

function formatResourceValue(value, suffix=""){
  const n = Number(value) || 0;
  const formatted = Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/,"");
  return `${formatted}${suffix}`;
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

  if($("profilePlayerId")) $("profilePlayerId").textContent = loggedIn ? profile.player_id : "—";
  if($("profilePlayerName")) $("profilePlayerName").textContent = loggedIn ? profile.player_name : "—";
  if($("profileAlliance")) $("profileAlliance").textContent = loggedIn ? profile.alliance : "—";
  if($("profileRailStatus")) $("profileRailStatus").textContent = !loggedIn
    ? t("profile_required")
    : (needsResources ? "Update resources" : "Complete");

  const resources = $("profileResources");
  if(resources){
    resources.hidden = !loggedIn;
    if(loggedIn){
      $("profileTruegold").textContent = formatResourceValue(profile.truegold);
      $("profileGeneral").textContent = formatResourceValue(profile.general_speedups, "h");
      $("profileResearch").textContent = formatResourceValue(profile.research_speedups, "h");
      $("profileTraining").textContent = formatResourceValue(profile.training_speedups, "h");
      $("profileConstruction").textContent = formatResourceValue(profile.construction_speedups, "h");
    }
  }

  if($("lockedPanel")) $("lockedPanel").hidden = loggedIn && !needsResources;
  if($("selectionPanel")) $("selectionPanel").hidden = !loggedIn || needsResources;

  const dialog = $("profileDialog");
  const shouldAutoPrompt = !loggedIn || needsResources;

  // Only auto-open once per page load. Closing it will not cause it to
  // repeatedly reopen during schedule renders or deadline refreshes.
  if(
    shouldAutoPrompt &&
    !profileAutoPromptShown &&
    !profileAutoPromptScheduled &&
    dialog &&
    !dialog.open
  ){
    profileAutoPromptScheduled = true;
    profilePopupTimer = setTimeout(() => {
      profileAutoPromptScheduled = false;
      profilePopupTimer = null;

      const stillNeedsPrompt = !profile || !!profile.resource_snapshot_required;
      if(!stillNeedsPrompt || dialog.open || profileAutoPromptShown) return;

      profileAutoPromptShown = true;
      openProfile(!!profile, !!profile?.resource_snapshot_required);
    }, PROFILE_POPUP_DELAY_MS);
  }
}

function renderSchedule(){
  applyTranslations();
  renderTips();
  renderDayDates();
  renderDeadline();
  renderConfirmedBanner();
  renderReplaceWarning();

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
    checkbox.disabled = !profile || !!appointment || !requestsOpen(currentDay) || dayFinalised(currentDay);
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
      if(profile && !appointment && requestsOpen(currentDay) && !dayFinalised(currentDay)) toggleSlot(slot.key);
    });

    list.appendChild(row);
  }

  $("scheduleSummary").textContent = t("confirmed_count", {n: confirmedCount});
  $("confirmedBadge").textContent = t("confirmed_count", {n: confirmedCount});

  $("selectionCount").textContent = t("selected", {n: selected.size});
  $("selectionCount").classList.toggle("valid", selected.size >= 3 && selected.size <= 5);
  $("submitBtn").disabled = !profile || !requestsOpen(currentDay) || dayFinalised(currentDay) || selected.size < 3 || selected.size > 5;

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

      if(profile?.resource_snapshot_required){
        // The user has already found their profile, so keep the same dialog
        // open and move directly to the resource refresh form.
        profileAutoPromptShown = true;
        $("profileDialogTitle").textContent = "Update your KvK resources";
        $("profileIntro").textContent = "Please enter your current resource totals before requesting appointments.";
        $("playerId").value = profile.player_id;
        $("playerId").disabled = true;
        $("findProfileBtn").hidden = true;
        $("profileDetails").hidden = false;
        $("saveProfileBtn").hidden = false;
        fillProfileFields(profile);
        renderSchedule();
        return;
      }

      profileAutoPromptShown = true;
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

  const playerName = $("playerName").value.trim();
  const alliance = $("alliance").value;
  const truegold = Number($("truegold").value) || 0;
  const general = Number($("general").value) || 0;
  const research = Number($("research").value) || 0;
  const training = Number($("training").value) || 0;
  const construction = Number($("construction").value) || 0;

  if(!playerName){
    errorBox.textContent = t("enter_name");
    errorBox.hidden = false;
    return;
  }

  $("saveProfileBtn").disabled = true;

  try{
    let data;
    let error;

    if(profile){
      // SECURITY DEFINER RPC avoids an RLS/session edge case that could leave
      // resource_snapshot_required stuck on true after saving.
      const result = await sb.rpc("save_player_profile", {
        p_profile_id: profile.id,
        p_player_name: playerName,
        p_alliance: alliance,
        p_truegold: truegold,
        p_general_speedups: general,
        p_research_speedups: research,
        p_training_speedups: training,
        p_construction_speedups: construction
      });
      data = result.data;
      error = result.error;
    }else{
      const payload = {
        user_id: user.id,
        player_id: $("playerId").value.trim(),
        player_name: playerName,
        alliance,
        truegold,
        general_speedups: general,
        research_speedups: research,
        training_speedups: training,
        construction_speedups: construction,
        resource_snapshot_required: false,
        resource_updated_at: new Date().toISOString()
      };
      const result = await sb.from("player_profiles").insert(payload).select().single();
      data = result.data;
      error = result.error;
    }

    if(error) throw error;

    profile = Array.isArray(data) ? data[0] : data;

    // Re-read from the database so the UI only considers the save complete
    // once the persisted row confirms the snapshot flag was cleared.
    await loadProfile();

    if(!profile){
      throw new Error("Your profile could not be reloaded after saving.");
    }
    if(profile.resource_snapshot_required){
      throw new Error("Your resources were saved, but the KvK resource refresh was not marked complete. Please try again.");
    }

    profileAutoPromptShown = true;
    if(profilePopupTimer){
      clearTimeout(profilePopupTimer);
      profilePopupTimer = null;
    }
    profileAutoPromptScheduled = false;

    $("profileDialog").close();
    await loadSharedData();
    renderSchedule();
    setBanner("✓ Profile and resources saved", "ok");
  }catch(error){
    console.error(error);
    errorBox.textContent = error.message || "Unable to save your profile.";
    errorBox.hidden = false;
  }finally{
    $("saveProfileBtn").disabled = false;
  }
}

async function submitRequests(){
  if(dayFinalised(currentDay)){
    alert(t("day_finalised"));
    return;
  }
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
    if(countdownTimer) clearInterval(countdownTimer);
    countdownTimer=setInterval(()=>renderDeadline(),30000);
    setBanner(`✓ ${t("connected")}`, "ok");
  }catch(error){
    console.error(error);
    setBanner(error.message, "error");
  }
}

start();
})();