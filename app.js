(() => {
"use strict";
const sb=window.supabase.createClient(window.KVK_CONFIG.supabaseUrl,window.KVK_CONFIG.supabaseKey);
const I=window.KVK_I18N,t=(k,v)=>I.t(k,v),$=id=>document.getElementById(id);
const DAYS={
  monday:{role:"chief",icon:"🏛️",startDay:"Sunday",startMinute:1425,slotCount:49,tips:{good:["Truegold","Construction speed up","Intel missions","Master skills"],ok:["Charms","Research speed up"],skip:["Troop speed up","Roulette","Shards","Gather rss","Level up pets","Refinement pets","Forgehammer","Widgets","Mithril","Gov. gear","Master emblem","Manuscript"]}},
  tuesday:{role:"chief",icon:"🏛️",startDay:"Monday",startMinute:1425,slotCount:49,tips:{good:["Roulette","Shards","Gather rss","Master skills","Master emblem","Manuscript"],ok:["Truegold","Construction speed up","Research speed up"],skip:["Charms","Troop speed up","Intel missions","Level up pets","Refinement pets","Forgehammer","Widgets","Mithril","Gov. gear"]}},
  thursday:{role:"noble",icon:"👑",startDay:"Wednesday",startMinute:1425,slotCount:49,tips:{good:["Charms","Troop speed up","Gather rss"],ok:["Forgehammer","Widgets","Mithril"],skip:["Truegold","Construction speed up","Research speed up","Intel missions","Roulette","Shards","Level up pets","Refinement pets","Gov. gear","Master skills","Master emblem","Manuscript"]}}
};
const names=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
let currentDay="monday",selected=new Set(),user=null,profile=null,appointments=[],myRequests=[];
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
function tp(sd,sm,o){let d=names.indexOf(sd),m=sm+o;while(m>=1440){m-=1440;d=(d+1)%7}return{day:names[d],time:`${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`}}
function slot(day,i){const c=DAYS[day],s=tp(c.startDay,c.startMinute,i*30),e=tp(c.startDay,c.startMinute,(i+1)*30);let key=`${day}-${i}`;if((day==="monday"&&i===48)||(day==="tuesday"&&i===0))key="chief-crossover";return{key,display:`${s.time}–${e.time}`,full:s.day===e.day?`${s.day} ${s.time}–${e.time}`:`${s.day} ${s.time} → ${e.day} ${e.time}`,cross:s.day!==e.day}}
function roleText(day=currentDay){return t(DAYS[day].role)}
function titleText(day){return t(`${day}_title`)}
function dayText(day){return t(day)}
function fillLanguageSelect(){const s=$("languageSelect");s.value=I.current;s.onchange=()=>I.set(s.value)}
function setText(selector,value){const el=document.querySelector(selector);if(el)el.textContent=value}
function applyStatic(){
  document.title=t("planner");
  setText(".brand-block h1","⚔️ "+t("planner"));
  if($("profileBtn"))$("profileBtn").textContent=t("my_profile");
  setText('a[href="admin.html"]',t("admin_login"));
  if($("roleSmall"))$("roleSmall").textContent=roleText();
  setText(".info-bar strong",t("select_slots"));
  setText("#tipsToggle strong",t("points_tips"));

  const locked=$("lockedPanel");
  if(locked){
    const lockedSpan=locked.querySelector(":scope > span");
    if(lockedSpan){
      lockedSpan.textContent="🔒 "+t("profile_gate");
    }else{
      // Compatibility with the earlier HTML version where this was a text node.
      const btn=$("lockedProfileBtn");
      const textNode=[...locked.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
      if(textNode)textNode.textContent="🔒 "+t("profile_gate")+" ";
      else if(btn)locked.insertBefore(document.createTextNode("🔒 "+t("profile_gate")+" "),btn);
    }
  }

  if($("lockedProfileBtn"))$("lockedProfileBtn").textContent=t("complete_profile");
  setText("#selectionPanel strong",t("choose_times"));
  setText("#selectionPanel p",t("choose_help"));
  if($("submitBtn"))$("submitBtn").textContent=t("submit");
  setText(".my-requests .schedule-header strong",t("my_requests"));
  setText(".my-requests .schedule-header small",t("my_requests_help"));
  if($("crossoverNote"))$("crossoverNote").textContent="🔁 "+t("crossover");

  document.querySelectorAll(".day-tab").forEach(b=>{
    const d=b.dataset.day,sp=b.querySelector("span");
    if(!sp)return;
    const firstText=[...sp.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
    if(firstText)firstText.textContent=titleText(d);
    const small=sp.querySelector("small");
    if(small)small.textContent=dayText(d);
  });

  document.querySelectorAll("[data-i18n]").forEach(el=>el.textContent=t(el.dataset.i18n));
  setText(".resource-box h3",t("resources"));
  document.querySelectorAll('[data-close="profileDialog"]').forEach(b=>{if(b.textContent.trim()!=="×")b.textContent=t("cancel")});
}
function banner(msg,kind=""){$("connectionBanner").textContent=msg;$("connectionBanner").className=`connection-banner ${kind}`}
function renderTips(){const a=DAYS[currentDay].tips;$("tipsPanel").innerHTML=[["good","✅ "+t("great"),a.good],["ok","🟧 "+t("ok"),a.ok],["skip","⛔ "+t("skip"),a.skip]].map(([c,h,x])=>`<div class="tip ${c}"><h4>${h}</h4><div class="chips">${x.map(v=>`<span>${v}</span>`).join("")}</div></div>`).join("")}
async function ensureAuth(){const {data:{session}}=await sb.auth.getSession();if(session){user=session.user;return}const {data,error}=await sb.auth.signInAnonymously();if(error)throw new Error("Anonymous sign-in is not enabled in Supabase.");user=data.user}
async function loadProfile(){const {data,error}=await sb.from("player_profiles").select("*").eq("user_id",user.id).maybeSingle();if(error)throw error;profile=data}
async function loadData(){const a=await sb.from("appointments").select("slot_key,event_day,minister_role,player_name,alliance");if(a.error)throw a.error;appointments=a.data||[];if(profile){const r=await sb.from("slot_requests").select("id,slot_key,event_day,minister_role,status").eq("profile_id",profile.id);if(r.error)throw r.error;myRequests=r.data||[]}else myRequests=[]}
function apFor(k){return appointments.find(a=>a.slot_key===k)||null}
function mineFor(k){return myRequests.find(r=>r.slot_key===k&&["pending","confirmed"].includes(r.status))||null}
function profileUI(){
  const ok=!!profile;
  const status=$("profileStatus");
  if(status){
    status.textContent=ok?`✓ ${profile.alliance} · ${profile.player_name} · ID ${profile.player_id}`:t("profile_required");
    status.className=`profile-status ${ok?"complete":"incomplete"}`;
  }
  if($("lockedPanel"))$("lockedPanel").hidden=ok;
  if($("selectionPanel"))$("selectionPanel").hidden=!ok;
  if(!ok&&$("profileDialog")&&!$("profileDialog").open)openProfile(false);
}
function render(){
  applyStatic();renderTips();
  $("roleTitle").textContent=`${DAYS[currentDay].icon} ${roleText()}`;
  $("crossoverNote").hidden=currentDay!=="tuesday";
  const list=$("slotList");list.innerHTML="";let confirmed=0;
  for(let i=0;i<DAYS[currentDay].slotCount;i++){
    const s=slot(currentDay,i),ap=apFor(s.key),mine=mineFor(s.key);if(ap)confirmed++;
    const row=document.createElement("div");row.className="slot"+(s.cross?" cross":"")+(ap?" confirmed":mine?" pending":"")+(selected.has(s.key)?" selected":"");
    const cb=document.createElement("input");cb.type="checkbox";cb.checked=selected.has(s.key);cb.disabled=!profile||!!ap;cb.onclick=e=>{e.stopPropagation();toggle(s.key)};
    const tm=document.createElement("div");tm.className="slot-time";tm.textContent=s.display;
    const main=document.createElement("div");main.className="slot-main";main.innerHTML=ap?`<span class="alliance">${esc(ap.alliance)}</span><strong>${esc(ap.player_name)}</strong>`:mine?`<span class="muted">${t("your_pending")}</span>`:`<span class="muted">${t("available")}</span>`;
    const st=document.createElement("div");st.className="slot-status";st.textContent=ap?`✓ ${t("confirmed")}`:mine?t("pending"):"";
    row.append(cb,tm,main,st);row.onclick=()=>{if(profile&&!ap)toggle(s.key)};list.appendChild(row);
  }
  $("scheduleSummary").textContent=t("confirmed_count",{n:confirmed});
  $("confirmedBadge").textContent=t("confirmed_count",{n:confirmed});
  $("selectionCount").textContent=t("selected",{n:selected.size});
  $("selectionCount").classList.toggle("valid",selected.size>=3&&selected.size<=5);
  $("submitBtn").disabled=!profile||selected.size<3||selected.size>5;
  renderMine();profileUI();
}
function toggle(k){if(selected.has(k))selected.delete(k);else{if(selected.size>=5){alert(t("max_five"));return}selected.add(k)}render()}
function renderMine(){
  const box=$("myRequests");
  if(!profile){box.innerHTML=`<p class="muted" style="padding:10px 14px">${t("complete_first")}</p>`;return}
  const rows=myRequests.filter(r=>["pending","confirmed"].includes(r.status));
  if(!rows.length){box.innerHTML=`<p class="muted" style="padding:10px 14px">${t("no_active")}</p>`;return}
  box.innerHTML=rows.map(r=>{let d=r.slot_key;for(let i=0;i<DAYS[r.event_day].slotCount;i++){const s=slot(r.event_day,i);if(s.key===r.slot_key){d=s.full;break}}return`<div class="request-row"><span class="alliance">${profile.alliance}</span><div><strong>${titleText(r.event_day)}</strong><div class="muted">${d} · ${roleText(r.event_day)}</div></div><span class="${r.status==="confirmed"?"status-confirmed":"status-pending"}">${r.status==="confirmed"?`✓ ${t("confirmed")}`:t("pending")}</span></div>`}).join("");
}
function resetDialog(){
  $("profileError").hidden=true;$("profileLookupStatus").hidden=true;$("profileDetails").hidden=true;$("saveProfileBtn").hidden=true;$("findProfileBtn").hidden=false;$("playerId").disabled=false;
  $("profileDialogTitle").textContent=t("find_profile");$("profileIntro").textContent=t("find_intro");$("findProfileBtn").textContent=t("continue");$("saveProfileBtn").textContent=t("save");
}
function fillFields(p){$("playerName").value=p?.player_name||"";$("alliance").value=p?.alliance||"KCB";$("truegold").value=p?.truegold??0;$("general").value=p?.general_speedups??0;$("research").value=p?.research_speedups??0;$("training").value=p?.training_speedups??0;$("construction").value=p?.construction_speedups??0}
function openProfile(edit=true){
  resetDialog();
  if(profile&&edit){
    $("profileDialogTitle").textContent=t("my_profile");$("profileIntro").textContent=t("edit_intro");$("playerId").value=profile.player_id;$("playerId").disabled=true;$("findProfileBtn").hidden=true;$("profileDetails").hidden=false;$("saveProfileBtn").hidden=false;fillFields(profile);
  }else{$("playerId").value="";fillFields(null)}
  $("profileDialog").showModal();
}
async function findProfile(){
  const id=$("playerId").value.trim(),err=$("profileError"),status=$("profileLookupStatus");
  err.hidden=true;status.hidden=true;
  if(!id){err.textContent=t("enter_id");err.hidden=false;return}
  $("findProfileBtn").disabled=true;$("findProfileBtn").textContent=t("checking");
  try{
    const {data,error}=await sb.rpc("claim_player_profile",{p_player_id:id});if(error)throw error;
    if(data){
      await loadProfile();
      if(!profile){
        const direct=await sb.from("player_profiles").select("*").eq("id",data).maybeSingle();
        if(direct.error)throw direct.error;
        profile=direct.data;
      }
      await loadData();
      if($("profileDialog").open)$("profileDialog").close();
      render();
      banner(`✓ ${t("welcome",{name:profile.player_name})}`,"ok");
      return
    }
    $("profileDialogTitle").textContent=t("create_profile");$("profileIntro").textContent=t("create_intro");$("profileDetails").hidden=false;$("saveProfileBtn").hidden=false;$("findProfileBtn").hidden=true;$("playerId").disabled=true;status.textContent=t("new_id");status.className="lookup-status new";status.hidden=false;
  }catch(e){err.textContent=e.message;err.hidden=false}
  finally{$("findProfileBtn").disabled=false;$("findProfileBtn").textContent=t("continue")}
}
async function saveProfile(e){
  e.preventDefault();const err=$("profileError");err.hidden=true;if($("profileDetails").hidden)return;
  const p={user_id:user.id,player_id:profile?.player_id||$("playerId").value.trim(),player_name:$("playerName").value.trim(),alliance:$("alliance").value,truegold:+$("truegold").value||0,general_speedups:+$("general").value||0,research_speedups:+$("research").value||0,training_speedups:+$("training").value||0,construction_speedups:+$("construction").value||0};
  if(!p.player_name){err.textContent=t("enter_name");err.hidden=false;return}
  const q=profile?sb.from("player_profiles").update(p).eq("id",profile.id).select().single():sb.from("player_profiles").insert(p).select().single();
  const {data,error}=await q;if(error){err.textContent=error.message;err.hidden=false;return}
  profile=data;$("profileDialog").close();await refresh();
}
async function submit(){
  const {error}=await sb.rpc("submit_slot_requests",{p_event_day:currentDay,p_slot_keys:[...selected]});
  if(error){alert(error.message);return}
  selected.clear();await refresh();alert(t("requests_saved"));
}
async function refresh(){await loadProfile();await loadData();render()}
fillLanguageSelect();window.addEventListener("kvk-language-changed",render);
document.querySelectorAll(".day-tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".day-tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentDay=b.dataset.day;selected.clear();render()});
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$(b.dataset.close).close());
$("profileBtn").onclick=()=>openProfile(true);$("lockedProfileBtn").onclick=()=>openProfile(false);$("findProfileBtn").onclick=findProfile;$("profileForm").onsubmit=saveProfile;$("submitBtn").onclick=submit;
$("tipsToggle").onclick=()=>{$("tipsPanel").hidden=!$("tipsPanel").hidden;$("tipsArrow").textContent=$("tipsPanel").hidden?"›":"⌄"};
(async()=>{try{banner(t("connecting"));await ensureAuth();await refresh();banner(`✓ ${t("connected")}`,"ok")}catch(e){console.error(e);banner(e.message,"error")}})();
})();