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
  }
}

async function loadAdminData(){
  const [requestResult,appointmentResult]=await Promise.all([
    sb.from("slot_requests")
      .select("id,slot_key,event_day,minister_role,status,profile_id,player_profiles(player_id,player_name,alliance,truegold,general_speedups,research_speedups,training_speedups,construction_speedups)")
      .eq("event_day",currentDay)
      .in("status",["pending","confirmed"]),
    sb.from("appointments").select("*").eq("event_day",currentDay)
  ]);

  if(requestResult.error) throw requestResult.error;
  if(appointmentResult.error) throw appointmentResult.error;

  requests=requestResult.data||[];
  appointments=appointmentResult.data||[];
  renderAdmin();
}

function appointmentFor(slotKey){ return appointments.find(a=>a.slot_key===slotKey)||null; }
function pendingFor(slotKey){ return requests.filter(r=>r.slot_key===slotKey && r.status==="pending"); }

function renderAdmin(){
  applyTranslations();
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
    .filter(r=>r.slot_key===activeSlot.key && ["pending","confirmed"].includes(r.status))
    .sort((a,b)=>score(b)-score(a));

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
      </div>
      <div class="applicant-actions">
        <button class="primary award" type="button">${confirmed?t("confirmed"):t("award")}</button>
        <button class="danger reject" type="button">${t("reject")}</button>
      </div>`;

    card.querySelector(".award").addEventListener("click",()=>awardRequest(request.id));
    card.querySelector(".reject").addEventListener("click",()=>rejectRequest(request.id));
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
  const { error }=await sb.from("slot_requests").update({status:"rejected"}).eq("id",requestId);
  if(error){alert(error.message);return}
  await loadAdminData();
  renderApplicants();
}

function bindEvents(){
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