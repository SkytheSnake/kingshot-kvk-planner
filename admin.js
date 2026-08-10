(() => {
"use strict";

const sb = window.supabase.createClient(window.KVK_CONFIG.supabaseUrl, window.KVK_CONFIG.supabaseKey);
const I = window.KVK_I18N;
const t = (key, vars) => I.t(key, vars);
const $ = id => document.getElementById(id);

const DAYS = {
  monday: { roleKey:"chief", icon:"🏛️", startDay:"Sunday", startMinute:23*60+45, slotCount:49 },
  tuesday: { roleKey:"chief", icon:"🏛️", startDay:"Monday", startMinute:23*60+45, slotCount:49 },
  thursday: { roleKey:"noble", icon:"👑", startDay:"Wednesday", startMinute:23*60+45, slotCount:49 }
};
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

let currentDay = "monday";
let admin = null;
let requests = [];
let appointments = [];
let activeSlot = null;
let rejectionLog = [];
let activityLog=[];
let daySettings=[];
let history=[];

const esc = value => String(value ?? "")
  .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");

function initTheme(){
  const saved = localStorage.getItem("kvkTheme") || "pink";
  document.documentElement.dataset.theme = saved;
  const selector = $("themeSelect");
  selector.value = saved;
  selector.addEventListener("change", () => {
    document.documentElement.dataset.theme = selector.value;
    localStorage.setItem("kvkTheme", selector.value);
  });
}

function initLanguage(){
  const selector = $("languageSelect");
  selector.value = I.current;
  selector.addEventListener("change", () => I.set(selector.value));
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
  const start = timePoint(cfg.startDay, cfg.startMinute, index*30);
  const end = timePoint(cfg.startDay, cfg.startMinute, (index+1)*30);
  let key = `${day}-${index}`;
  if((day==="monday" && index===48) || (day==="tuesday" && index===0)) key = "chief-crossover";
  return {
    key,
    display:`${start.time}–${end.time}`,
    full:start.day===end.day?`${start.day} ${start.time}–${end.time}`:`${start.day} ${start.time} → ${end.day} ${end.time}`,
    cross:start.day!==end.day
  };
}

function roleText(day=currentDay){ return t(DAYS[day].roleKey); }
function titleText(day){ return t(`${day}_title`); }
function dayText(day){ return t(day); }

function setText(selector,value){
  const el=document.querySelector(selector);
  if(el) el.textContent=value;
}

function applyTranslations(){
  document.title=t("admin_title");
  const brand=document.querySelector(".brand-block h1");
  if(brand) brand.innerHTML=`<span class="server-number">1423</span> 👑 ${t("admin_title")}`;
  setText(".brand-block p",t("private_dashboard"));
  setText('a[href="index.html"]',"← "+t("player_planner"));
  if($("logoutBtn")) $("logoutBtn").textContent=t("logout");
  setText("#adminLoginCard h2",t("admin_login_title"));
  setText("#adminLoginCard p",t("admin_help"));
  if($("loginIdentityLabel")) $("loginIdentityLabel").textContent=t("username_email");
  if($("loginPasswordLabel")) $("loginPasswordLabel").textContent=t("password");
  setText("#loginForm .login-submit",t("login"));
  setText(".admin-welcome > span",t("private_data"));
  if($("reviewHelp")) $("reviewHelp").textContent=t("review");
  setText("#applicantDialog h2",t("slot_requests"));
  if($("manualAddBtn")) $("manualAddBtn").textContent=t("manual_add");
  if($("manualBookingTitle")) $("manualBookingTitle").textContent=t("manual_booking");
  if($("manualBookingHelp")) $("manualBookingHelp").textContent=t("manual_add_help");
  if($("manualPlayerIdLabel")) $("manualPlayerIdLabel").textContent=t("manual_player_id");
  if($("manualPlayerNameLabel")) $("manualPlayerNameLabel").textContent=t("manual_player_name");
  if($("manualAllianceLabel")) $("manualAllianceLabel").textContent=t("manual_alliance");
  if($("manualBookingConfirm")) $("manualBookingConfirm").textContent=t("manual_confirm");
  if($("rejectionLogTitle")) $("rejectionLogTitle").textContent=t("rejection_log");
  if($("rejectionLogHelp")) $("rejectionLogHelp").textContent=t("rejection_help");
  if($("resetKvkBtn")) $("resetKvkBtn").textContent=t("reset_kvk");
  if($("adminCrossoverNote")) $("adminCrossoverNote").textContent="🔁 "+t("crossover");

  document.querySelectorAll(".day-tab").forEach(btn=>{
    const day=btn.dataset.day,span=btn.querySelector("span");
    if(!span)return;
    const textNode=[...span.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
    if(textNode) textNode.textContent=titleText(day);
    const small=span.querySelector("small");
    if(small) small.textContent=dayText(day);
  });
}

async function checkAdmin(){
  const { data:{session} } = await sb.auth.getSession();
  if(!session || session.user.is_anonymous) return false;

  const { data, error } = await sb
    .from("admin_users")
    .select("admin_role,display_name")
    .eq("id",session.user.id)
    .maybeSingle();

  if(error || !data) return false;
  admin=data;
  return true;
}

function showAdminApp(show){
  $("adminLoginCard").hidden=show;
  $("adminApp").hidden=!show;
  $("logoutBtn").hidden=!show;

  if(show){
    $("adminName").textContent=admin.display_name||"Admin";
    $("adminRole").textContent=admin.admin_role.toUpperCase();
    if($("resetKvkBtn")) $("resetKvkBtn").hidden=admin.admin_role!=="owner";
    if($("archiveCycleBtn")) $("archiveCycleBtn").hidden=admin.admin_role!=="owner";
  }else if($("resetKvkBtn")){
    $("resetKvkBtn").hidden=true;
  }
}

async function loadAdminData(){
  const [requestResult,appointmentResult,rejectionResult,activityResult,settingsResult,historyResult]=await Promise.all([
    sb.from("slot_requests")
      .select("id,slot_key,event_day,minister_role,status,profile_id,player_profiles(player_id,player_name,alliance,truegold,general_speedups,research_speedups,training_speedups,construction_speedups,resource_updated_at,admin_note)")
      .eq("event_day",currentDay)
      .in("status",["pending","confirmed"]),
    sb.from("appointments").select("*").eq("event_day",currentDay),
    sb.from("rejection_log").select("*").order("rejected_at",{ascending:false}).limit(200),
    sb.from("admin_activity_log").select("*").order("created_at",{ascending:false}).limit(100),
    sb.from("day_settings").select("*"),
    sb.from("kvk_archive_cycles").select("id,cycle_start,archived_at,archived_by,kvk_archive_appointments(id,event_day,slot_key,minister_role,player_name,alliance)").order("archived_at",{ascending:false}).limit(20)
  ]);

  if(requestResult.error) throw requestResult.error;
  if(appointmentResult.error) throw appointmentResult.error;
  if(rejectionResult.error) throw rejectionResult.error;
  if(activityResult.error) throw activityResult.error;
  if(settingsResult.error) throw settingsResult.error;
  if(historyResult.error) throw historyResult.error;

  requests=requestResult.data||[];
  appointments=appointmentResult.data||[];
  rejectionLog=rejectionResult.data||[];
  activityLog=activityResult.data||[];
  daySettings=settingsResult.data||[];
  history=historyResult.data||[];
  renderAdmin();
  renderRejectionLog();
  renderNeedsAttention();
  renderActivityLog();
  renderHistory();
}

function appointmentFor(slotKey){ return appointments.find(a=>a.slot_key===slotKey)||null; }
function pendingFor(slotKey){ return filteredRequests().filter(r=>r.slot_key===slotKey && r.status==="pending"); }


function dayFinalised(day=currentDay){
  return !!daySettings.find(x=>x.event_day===day)?.is_finalised;
}

function filteredRequests(){
  const search=($("adminSearch")?.value||"").trim().toLowerCase();
  const alliance=$("allianceFilter")?.value||"";
  return requests.filter(r=>{
    const p=r.player_profiles||{};
    const matchesSearch=!search || String(p.player_name||"").toLowerCase().includes(search) || String(p.player_id||"").toLowerCase().includes(search);
    const matchesAlliance=!alliance || p.alliance===alliance;
    return matchesSearch && matchesAlliance;
  });
}

function renderAdmin(){
  applyTranslations();
  const finalised=dayFinalised(currentDay);
  if($("dayLockState")){
    $("dayLockState").textContent=finalised?t("read_only"):t("open");
    $("dayLockState").className="badge "+(finalised?"amber":"green");
  }
  if($("finaliseDayBtn")) $("finaliseDayBtn").hidden=finalised;
  if($("reopenDayBtn")) $("reopenDayBtn").hidden=!finalised || admin?.admin_role!=="owner";
  $("adminRoleTitle").textContent=`${DAYS[currentDay].icon} ${roleText()}`;
  $("adminCrossoverNote").hidden=currentDay!=="tuesday";

  const list=$("adminSlotList");
  list.innerHTML="";

  let pendingCount=0;
  let confirmedCount=0;

  for(let i=0;i<DAYS[currentDay].slotCount;i++){
    const slot=getSlot(currentDay,i);
    const pending=pendingFor(slot.key);
    const appointment=appointmentFor(slot.key);

    pendingCount+=pending.length;
    if(appointment) confirmedCount++;

    const row=document.createElement("div");
    row.className=[
      "slot","admin-slot",
      slot.cross?"cross":"",
      dayFinalised(currentDay)?"readonly-slot":"",
      appointment?"confirmed":(pending.length?"pending":"")
    ].filter(Boolean).join(" ");

    row.innerHTML=`
      <div class="slot-time">${slot.display}</div>
      <div class="slot-main">
        ${appointment
          ? `<span class="alliance">${esc(appointment.alliance)}</span><strong>${esc(appointment.player_name)}</strong>`
          : pending.length
            ? `<strong>${pending.length} ${t(pending.length===1?"applicant":"applicants")}</strong>`
            : `<span class="muted">${t("no_requests")}</span>`}
      </div>
      <div class="slot-status">${appointment?`✓ ${t("confirmed")}`:(pending.length?t("pending_count",{n:pending.length}):"")}</div>`;

    row.addEventListener("click",()=>openApplicants(slot));
    list.appendChild(row);
  }

  $("adminPendingBadge").textContent=t("pending_count",{n:pendingCount});
  $("adminConfirmedBadge").textContent=t("confirmed_count",{n:confirmedCount});
}

function score(request){
  const p=request.player_profiles||{};
  if(currentDay==="monday"){
    return (+p.truegold||0)*10+(+p.general_speedups||0)+(+p.construction_speedups||0);
  }
  if(currentDay==="tuesday"){
    return (+p.truegold||0)*8+(+p.general_speedups||0)+(+p.research_speedups||0)+(+p.construction_speedups||0)*0.5;
  }
  return (+p.general_speedups||0)+(+p.training_speedups||0)+(+p.truegold||0)*2;
}

function openApplicants(slot){
  activeSlot=slot;
  $("applicantSlotLabel").textContent=`${roleText()} · ${slot.full}`;
  renderApplicants();
  $("applicantDialog").showModal();
}

function renderApplicants(){
  const box=$("applicantList");
  const active=requests
    .filter(r=>r.slot_key===activeSlot.key && ["pending","confirmed"].includes(r.status));

  const sortMode=$("sortApplicants")?.value||"best";
  active.sort((a,b)=>{
    const pa=a.player_profiles||{},pb=b.player_profiles||{};
    if(sortMode==="name") return String(pa.player_name||"").localeCompare(String(pb.player_name||""));
    if(sortMode==="alliance") return String(pa.alliance||"").localeCompare(String(pb.alliance||""));
    if(sortMode==="truegold") return (+pb.truegold||0)-(+pa.truegold||0);
    if(sortMode==="general") return (+pb.general_speedups||0)-(+pa.general_speedups||0);
    if(sortMode==="research") return (+pb.research_speedups||0)-(+pa.research_speedups||0);
    if(sortMode==="training") return (+pb.training_speedups||0)-(+pa.training_speedups||0);
    if(sortMode==="construction") return (+pb.construction_speedups||0)-(+pa.construction_speedups||0);
    return score(b)-score(a);
  });

  const appointment=appointmentFor(activeSlot.key);

  if(!active.length){
    box.innerHTML=`<p class="muted">${t("nobody")}</p>`;
    return;
  }

  box.innerHTML="";
  active.forEach(request=>{
    const p=request.player_profiles||{};
    const confirmed=appointment?.request_id===request.id;
    const card=document.createElement("div");
    card.className="applicant"+(confirmed?" confirmed":"");
    card.innerHTML=`
      <div class="applicant-head">
        <div><span class="alliance">${esc(p.alliance)}</span> <strong>${esc(p.player_name)}</strong></div>
        <small class="muted">ID ${esc(p.player_id)}</small>
      </div>
      <div class="resource-summary">
        🏆 ${p.truegold||0} TG · 💨 ${p.general_speedups||0}h · 📘 ${p.research_speedups||0}h · ⚔️ ${p.training_speedups||0}h · 🏗️ ${p.construction_speedups||0}h
        <div class="resource-freshness">${t("resource_updated")}: ${p.resource_updated_at?new Date(p.resource_updated_at).toLocaleString(undefined,{timeZone:"UTC",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",hour12:false})+" UTC":t("never")}</div>
      </div>
      <div class="note-editor">
        <label>${t("admin_notes")}<textarea class="admin-note">${esc(p.admin_note||"")}</textarea></label>
        <div class="note-actions"><button class="secondary save-note" type="button">${t("save_note")}</button></div>
      </div>
      <div class="applicant-actions">
        <button class="primary award" type="button" ${dayFinalised(currentDay)?"disabled":""}>${confirmed?t("confirmed"):t("award")}</button>
        <button class="danger reject" type="button" ${dayFinalised(currentDay)?"disabled":""}>${t("reject")}</button>
      </div>`;

    card.querySelector(".award").addEventListener("click",()=>awardRequest(request.id));
    card.querySelector(".reject").addEventListener("click",()=>rejectRequest(request.id));
    card.querySelector(".save-note").addEventListener("click",()=>saveAdminNote(request.profile_id,card.querySelector(".admin-note").value));
    box.appendChild(card);
  });
}

async function awardRequest(requestId){
  const { error }=await sb.rpc("award_slot",{p_request_id:requestId});
  if(error){alert(error.message);return}
  await loadAdminData();
  renderApplicants();
}

async function rejectRequest(requestId){
  const reason=prompt(t("reason")+" (optional):")||null;
  const { error }=await sb.rpc("reject_slot_request",{p_request_id:requestId,p_reason:reason});
  if(error){alert(error.message);return}
  await loadAdminData();
  renderApplicants();
}


function openManualBooking(){
  if(!activeSlot) return;
  $("manualBookingError").hidden=true;
  $("manualPlayerId").value="";
  $("manualPlayerName").value="";
  $("manualAlliance").value="KCB";
  $("manualBookingDialog").showModal();
}

async function submitManualBooking(event){
  event.preventDefault();
  const errorBox=$("manualBookingError");
  errorBox.hidden=true;

  const conflict=requests.find(r=>r.player_profiles?.player_id===$("manualPlayerId").value.trim() && r.status==="confirmed" && r.event_day===currentDay);
  if(conflict && !confirm(t("manual_conflict_confirm"))) return;

  const { error }=await sb.rpc("admin_manual_assign",{
    p_event_day:currentDay,
    p_slot_key:activeSlot.key,
    p_player_id:$("manualPlayerId").value.trim(),
    p_player_name:$("manualPlayerName").value.trim(),
    p_alliance:$("manualAlliance").value
  });

  if(error){
    errorBox.textContent=error.message;
    errorBox.hidden=false;
    return;
  }

  $("manualBookingDialog").close();
  $("applicantDialog").close();
  await loadAdminData();
  alert(t("manual_added"));
}

function renderRejectionLog(){
  const box=$("rejectionLog");
  if(!box) return;

  if(!rejectionLog.length){
    box.innerHTML=`<p class="muted" style="padding:8px">${t("no_rejections")}</p>`;
    return;
  }

  box.innerHTML="";
  rejectionLog.forEach(item=>{
    const row=document.createElement("div");
    row.className="rejection-row";
    const when=new Date(item.rejected_at).toLocaleString(undefined,{timeZone:"UTC",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",hour12:false})+" UTC";

    row.innerHTML=`
      <span class="alliance">${esc(item.alliance||"")}</span>
      <div class="rejection-main">
        <strong>${esc(item.player_name)} · ID ${esc(item.player_id)}</strong>
        <div class="rejection-meta">${esc(item.event_day)} · ${esc(item.slot_key)} · ${t("rejected_at")} ${esc(when)}<br>${t("reason")}: ${esc(item.reason||t("no_reason"))}</div>
      </div>
      <div class="rejection-actions">
        ${item.contacted
          ? `<span class="contacted-badge">${t("contacted")}</span>`
          : `<button class="secondary contact-btn" type="button">${t("mark_contacted")}</button>`}
      </div>`;

    const btn=row.querySelector(".contact-btn");
    if(btn) btn.addEventListener("click",()=>markContacted(item.id));
    box.appendChild(row);
  });
}

async function markContacted(logId){
  const { error }=await sb.rpc("mark_rejection_contacted",{p_log_id:logId});
  if(error){alert(error.message);return}
  await loadAdminData();
}

async function resetKvk(){
  if(admin?.admin_role!=="owner") return;
  const typed=prompt(t("reset_help")+"\n\n"+t("reset_confirm")+":");
  if(typed!=="RESET") return;

  const { error }=await sb.rpc("reset_kvk_cycle");
  if(error){alert(error.message);return}

  await loadAdminData();
  alert(t("reset_done"));
}


async function saveAdminNote(profileId,note){
  const { error }=await sb.rpc("set_admin_note",{p_profile_id:profileId,p_note:note});
  if(error){alert(error.message);return}
  alert(t("notes_saved"));
  await loadAdminData();
}

function renderNeedsAttention(){
  const box=$("needsAttentionList");
  if(!box) return;
  const rows=rejectionLog.filter(x=>!x.contacted);
  if(!rows.length){
    box.innerHTML=`<p class="muted" style="padding:8px">${t("none_need_attention")}</p>`;
    return;
  }
  box.innerHTML=rows.map(x=>`<div class="rejection-row">
    <span class="alliance">${esc(x.alliance||"")}</span>
    <div class="rejection-main"><strong>${esc(x.player_name)} · ID ${esc(x.player_id)}</strong><div class="rejection-meta">${esc(x.event_day)} · ${esc(x.slot_key)}</div></div>
    <div class="rejection-actions"><button class="secondary attention-contact" data-id="${x.id}" type="button">${t("mark_contacted")}</button></div>
  </div>`).join("");
  box.querySelectorAll(".attention-contact").forEach(btn=>btn.addEventListener("click",()=>markContacted(btn.dataset.id)));
}

function renderActivityLog(){
  const box=$("activityLog");
  if(!box) return;
  if(!activityLog.length){
    box.innerHTML='<p class="muted" style="padding:8px">No admin activity yet.</p>';
    return;
  }
  box.innerHTML=activityLog.map(x=>{
    const when=new Date(x.created_at).toLocaleString(undefined,{timeZone:"UTC",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",hour12:false})+" UTC";
    return `<div class="activity-row"><strong>${esc(x.action_type)}</strong><div class="activity-meta">${esc(x.actor_name||"Admin")} · ${esc(when)}${x.summary?` · ${esc(x.summary)}`:""}</div></div>`;
  }).join("");
}

function renderHistory(){
  const box=$("historyList");
  if(!box) return;
  if(!history.length){
    box.innerHTML='<p class="muted" style="padding:8px">No archived KvKs yet.</p>';
    return;
  }
  box.innerHTML=history.map(c=>{
    const apps=c.kvk_archive_appointments||[];
    return `<div class="history-row"><strong>${t("archive_name",{date:esc(c.cycle_start)})}</strong><div class="history-meta">${apps.length} confirmed appointments · archived ${new Date(c.archived_at).toLocaleDateString()}</div></div>`;
  }).join("");
}

async function finaliseDay(){
  if(!confirm(t("finalise_confirm"))) return;
  const { error }=await sb.rpc("set_day_finalised",{p_event_day:currentDay,p_finalised:true});
  if(error){alert(error.message);return}
  await loadAdminData();
}

async function reopenDay(){
  if(admin?.admin_role!=="owner") return;
  if(!confirm(t("reopen_confirm"))) return;
  const { error }=await sb.rpc("set_day_finalised",{p_event_day:currentDay,p_finalised:false});
  if(error){alert(error.message);return}
  await loadAdminData();
}

async function undoLastAction(){
  const { data,error }=await sb.rpc("undo_last_admin_action");
  if(error){alert(error.message);return}
  if(!data){alert(t("nothing_to_undo"));return}
  alert(t("undo_done"));
  await loadAdminData();
  if($("applicantDialog").open) renderApplicants();
}

async function archiveCurrentCycle(){
  if(admin?.admin_role!=="owner") return;
  if(!confirm(t("archive_help"))) return;
  const { error }=await sb.rpc("archive_current_kvk");
  if(error){alert(error.message);return}
  alert(t("archive_done"));
  await loadAdminData();
}

function bindEvents(){
  $("adminSearch").addEventListener("input",renderAdmin);
  $("allianceFilter").addEventListener("change",renderAdmin);
  $("sortApplicants").addEventListener("change",()=>{renderAdmin();if($("applicantDialog").open)renderApplicants();});
  $("finaliseDayBtn").addEventListener("click",finaliseDay);
  $("reopenDayBtn").addEventListener("click",reopenDay);
  $("undoLastBtn").addEventListener("click",undoLastAction);
  $("archiveCycleBtn").addEventListener("click",archiveCurrentCycle);
  $("manualAddBtn").addEventListener("click",openManualBooking);
  $("manualBookingForm").addEventListener("submit",submitManualBooking);
  $("resetKvkBtn").addEventListener("click",resetKvk);
  $("loginForm").addEventListener("submit",async event=>{
    event.preventDefault();
    $("loginError").hidden=true;

    const raw=$("loginIdentity").value.trim();
    const email=raw.includes("@")
      ? raw
      : `${raw.toLowerCase().replace(/[^a-z0-9._-]/g,"")}@kvk-planner.local`;

    const { error }=await sb.auth.signInWithPassword({
      email,
      password:$("loginPassword").value
    });

    if(error){
      $("loginError").textContent=t("login_failed");
      $("loginError").hidden=false;
      return;
    }

    if(!(await checkAdmin())){
      $("loginError").textContent=t("no_admin");
      $("loginError").hidden=false;
      await sb.auth.signOut();
      return;
    }

    showAdminApp(true);
    await loadAdminData();
  });

  $("logoutBtn").addEventListener("click",async()=>{
    await sb.auth.signOut();
    admin=null;
    showAdminApp(false);
  });

  document.querySelectorAll("[data-close]").forEach(btn=>{
    btn.addEventListener("click",()=>$(btn.dataset.close).close());
  });

  document.querySelectorAll(".day-tab").forEach(btn=>{
    btn.addEventListener("click",async()=>{
      document.querySelectorAll(".day-tab").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      currentDay=btn.dataset.day;
      await loadAdminData();
    });
  });

  window.addEventListener("kvk-language-changed",()=>{
    applyTranslations();
    if(!$("adminApp").hidden) renderAdmin();
  });
}

async function start(){
  initTheme();
  initLanguage();
  applyTranslations();
  bindEvents();

  if(await checkAdmin()){
    showAdminApp(true);
    await loadAdminData();
  }else{
    showAdminApp(false);
  }
}

start();
})();