(() => {
"use strict";
const sb=window.supabase.createClient(window.KVK_CONFIG.supabaseUrl,window.KVK_CONFIG.supabaseKey),I=window.KVK_I18N,t=(k,v)=>I.t(k,v),$=id=>document.getElementById(id);
const DAYS={monday:{role:"chief",icon:"🏛️",startDay:"Sunday",startMinute:1425,slotCount:49},tuesday:{role:"chief",icon:"🏛️",startDay:"Monday",startMinute:1425,slotCount:49},thursday:{role:"noble",icon:"👑",startDay:"Wednesday",startMinute:1425,slotCount:49}};
const names=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
let currentDay="monday",admin=null,requests=[],appointments=[],active=null;
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
function tp(sd,sm,o){let d=names.indexOf(sd),m=sm+o;while(m>=1440){m-=1440;d=(d+1)%7}return{day:names[d],time:`${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`}}
function slot(day,i){const c=DAYS[day],s=tp(c.startDay,c.startMinute,i*30),e=tp(c.startDay,c.startMinute,(i+1)*30);let key=`${day}-${i}`;if((day==="monday"&&i===48)||(day==="tuesday"&&i===0))key="chief-crossover";return{key,display:`${s.time}–${e.time}`,full:s.day===e.day?`${s.day} ${s.time}–${e.time}`:`${s.day} ${s.time} → ${e.day} ${e.time}`,cross:s.day!==e.day}}
function roleText(d=currentDay){return t(DAYS[d].role)}
function titleText(d){return t(`${d}_title`)}
function dayText(d){return t(d)}
function fillLanguageSelect(){const s=$("languageSelect");s.value=I.current;s.onchange=()=>I.set(s.value)}
function setText(selector,value){const el=document.querySelector(selector);if(el)el.textContent=value}
function applyStatic(){
  document.title=t("admin_title");
  setText(".brand-block h1","👑 "+t("admin_title"));
  setText(".brand-block p",t("private_dashboard"));
  setText('a[href="index.html"]',"← "+t("player_planner"));
  if($("logoutBtn"))$("logoutBtn").textContent=t("logout");
  setText("#adminLoginCard h2",t("admin_login_title"));
  setText("#adminLoginCard p",t("admin_help"));
  if($("loginIdentityLabel"))$("loginIdentityLabel").textContent=t("username_email");
  if($("loginPasswordLabel"))$("loginPasswordLabel").textContent=t("password");
  setText("#loginForm .login-submit",t("login"));
  setText(".admin-welcome > span",t("private_data"));
  if($("reviewHelp"))$("reviewHelp").textContent=t("review");
  setText("#applicantDialog h2",t("slot_requests"));
  document.querySelectorAll(".day-tab").forEach(b=>{
    const d=b.dataset.day,sp=b.querySelector("span");
    if(!sp)return;
    const firstText=[...sp.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
    if(firstText)firstText.textContent=titleText(d);
    const small=sp.querySelector("small");
    if(small)small.textContent=dayText(d);
  });
  if($("adminCrossoverNote"))$("adminCrossoverNote").textContent="🔁 "+t("crossover");
}
async function checkAdmin(){const {data:{session}}=await sb.auth.getSession();if(!session||session.user.is_anonymous)return false;const {data,error}=await sb.from("admin_users").select("admin_role,display_name").eq("id",session.user.id).maybeSingle();if(error||!data)return false;admin=data;return true}
function show(on){$("adminLoginCard").hidden=on;$("adminApp").hidden=!on;$("logoutBtn").hidden=!on;if(on){$("adminName").textContent=admin.display_name||"Admin";$("adminRole").textContent=admin.admin_role.toUpperCase()}}
async function load(){const r=await sb.from("slot_requests").select("id,slot_key,event_day,minister_role,status,profile_id,player_profiles(player_id,player_name,alliance,truegold,general_speedups,research_speedups,training_speedups,construction_speedups)").eq("event_day",currentDay).in("status",["pending","confirmed"]);if(r.error)throw r.error;requests=r.data||[];const a=await sb.from("appointments").select("*").eq("event_day",currentDay);if(a.error)throw a.error;appointments=a.data||[];render()}
function apFor(k){return appointments.find(a=>a.slot_key===k)||null}
function reqFor(k){return requests.filter(r=>r.slot_key===k&&r.status==="pending")}
function render(){
  applyStatic();$("adminRoleTitle").textContent=`${DAYS[currentDay].icon} ${roleText()}`;$("adminCrossoverNote").hidden=currentDay!=="tuesday";
  const list=$("adminSlotList");list.innerHTML="";let pc=0,cc=0;
  for(let i=0;i<DAYS[currentDay].slotCount;i++){
    const s=slot(currentDay,i),rs=reqFor(s.key),ap=apFor(s.key);pc+=rs.length;if(ap)cc++;
    const row=document.createElement("div");row.className="slot admin-slot"+(s.cross?" cross":"")+(ap?" confirmed":rs.length?" pending":"");
    row.innerHTML=`<div class="slot-time">${s.display}</div><div class="slot-main">${ap?`<span class="alliance">${esc(ap.alliance)}</span><strong>${esc(ap.player_name)}</strong>`:rs.length?`<strong>${rs.length} ${t(rs.length===1?"applicant":"applicants")}</strong>`:`<span class="muted">${t("no_requests")}</span>`}</div><div class="slot-status">${ap?`✓ ${t("confirmed")}`:rs.length?t("pending_count",{n:rs.length}):""}</div>`;
    row.onclick=()=>openApplicants(s);list.appendChild(row);
  }
  $("adminPendingBadge").textContent=t("pending_count",{n:pc});$("adminConfirmedBadge").textContent=t("confirmed_count",{n:cc});
}
function score(r){const p=r.player_profiles||{};if(currentDay==="monday")return(+p.truegold||0)*10+(+p.general_speedups||0)+(+p.construction_speedups||0);if(currentDay==="tuesday")return(+p.truegold||0)*8+(+p.general_speedups||0)+(+p.research_speedups||0)+(+p.construction_speedups||0)*.5;return(+p.general_speedups||0)+(+p.training_speedups||0)+(+p.truegold||0)*2}
function openApplicants(s){active=s;$("applicantSlotLabel").textContent=`${roleText()} · ${s.full}`;renderApplicants();$("applicantDialog").showModal()}
function renderApplicants(){
  const rs=requests.filter(r=>r.slot_key===active.key&&["pending","confirmed"].includes(r.status)).sort((a,b)=>score(b)-score(a)),box=$("applicantList"),ap=apFor(active.key);
  if(!rs.length){box.innerHTML=`<p class="muted">${t("nobody")}</p>`;return}
  box.innerHTML="";
  rs.forEach(r=>{const p=r.player_profiles||{},confirmed=ap?.request_id===r.id,d=document.createElement("div");d.className="applicant"+(confirmed?" confirmed":"");
    d.innerHTML=`<div class="applicant-head"><div><span class="alliance">${esc(p.alliance)}</span> <strong>${esc(p.player_name)}</strong></div><small class="muted">ID ${esc(p.player_id)}</small></div><div class="resource-summary">🏆 ${p.truegold||0} TG · 💨 ${p.general_speedups||0}h · 📘 ${p.research_speedups||0}h · ⚔️ ${p.training_speedups||0}h · 🏗️ ${p.construction_speedups||0}h</div><div class="applicant-actions"><button class="primary award">${confirmed?t("confirmed"):t("award")}</button><button class="danger reject">${t("reject")}</button></div>`;
    d.querySelector(".award").onclick=()=>award(r.id);d.querySelector(".reject").onclick=()=>reject(r.id);box.appendChild(d);
  });
}
async function award(id){const {error}=await sb.rpc("award_slot",{p_request_id:id});if(error){alert(error.message);return}await load();renderApplicants()}
async function reject(id){const {error}=await sb.from("slot_requests").update({status:"rejected"}).eq("id",id);if(error){alert(error.message);return}await load();renderApplicants()}
initTheme();fillLanguageSelect();applyStatic();window.addEventListener("kvk-language-changed",()=>{applyStatic();if(!$("adminApp").hidden)render()});
$("loginForm").onsubmit=async e=>{
  e.preventDefault();$("loginError").hidden=true;
  const raw=$("loginIdentity").value.trim();
  const email=raw.includes("@")?raw:`${raw.toLowerCase().replace(/[^a-z0-9._-]/g,"")}@kvk-planner.local`;
  const {error}=await sb.auth.signInWithPassword({email,password:$("loginPassword").value});
  if(error){$("loginError").textContent=t("login_failed");$("loginError").hidden=false;return}
  if(!(await checkAdmin())){$("loginError").textContent=t("no_admin");$("loginError").hidden=false;return}
  show(true);await load();
};
$("logoutBtn").onclick=async()=>{await sb.auth.signOut();show(false)};
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$(b.dataset.close).close());
document.querySelectorAll(".day-tab").forEach(b=>b.onclick=async()=>{document.querySelectorAll(".day-tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentDay=b.dataset.day;await load()});
(async()=>{if(await checkAdmin()){show(true);await load()}else show(false)})();
})();