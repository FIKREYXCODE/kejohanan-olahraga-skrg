const AUTH_API="https://script.google.com/macros/s/AKfycbx3r8_KKM-jHIpPoL6dEa-IKIXZqfjxWDr3jJQF8AC2QvjL7MUrEGBuoNRkvpG9k6lnhQ/exec";
const SESSION_KEY="skrg_teacher_session";
const HOUSE_COLORS={Biru:"#246bfd",Kuning:"#e5ad00",Ungu:"#6b3de0",Merah:"#e5484d"};
const $=id=>document.getElementById(id);
const safe=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let session=null,workspaceData=null;

async function api(payload){
  const response=await fetch(AUTH_API,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded;charset=UTF-8"},body:new URLSearchParams(payload),redirect:"follow",cache:"no-store"});
  if(!response.ok)throw Error("Pelayan data tidak dapat dihubungi.");
  const data=await response.json();
  if(data.error)throw Error(data.message||"Permintaan tidak berjaya.");
  return data;
}

function message(target,text,type="error"){target.textContent=text;target.className=`form-message ${type}`}
function clearMessage(target){target.textContent="";target.className="form-message"}
function initials(name){return String(name||"Guru").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()}

async function login(event){
  event.preventDefault();const button=event.submitter;clearMessage($("loginMessage"));button.disabled=true;button.innerHTML="Menyemak…";
  try{
    const result=await api({action:"login",id:$("teacherId").value.trim(),password:$("teacherPassword").value});
    session={token:result.token,user:result.user,mustChange:Boolean(result.mustChange)};sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));
    if(result.mustChange){$("currentPassword").value=$("teacherPassword").value;$("changePasswordDialog").showModal();return}
    await openWorkspace();
  }catch(error){message($("loginMessage"),error.message)}finally{button.disabled=false;button.innerHTML='Masuk ke Portal Guru <span>→</span>'}
}

async function changePassword(event){
  event.preventDefault();clearMessage($("passwordMessage"));const button=event.submitter;
  if($("newPassword").value!==$("confirmPassword").value){message($("passwordMessage"),"Ulangan kata laluan baharu tidak sama.");return}
  button.disabled=true;button.textContent="Menyimpan…";
  try{
    await api({action:"changePassword",token:session.token,currentPassword:$("currentPassword").value,newPassword:$("newPassword").value});
    session.mustChange=false;sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));message($("passwordMessage"),"Kata laluan berjaya disimpan.","success");setTimeout(async()=>{$("changePasswordDialog").close();await openWorkspace()},650);
  }catch(error){message($("passwordMessage"),error.message)}finally{button.disabled=false;button.textContent="Simpan kata laluan baharu"}
}

async function openWorkspace(){
  $("loginCard").hidden=true;$("teacherWorkspace").hidden=false;
  const user=session.user;$("workspaceName").textContent=user.name||"Guru SK Ranggu";$("workspaceIdentity").textContent=`${user.id} • ${user.house||"Pentadbir"}`;$("workspaceInitials").textContent=initials(user.name);$("workspaceRole").textContent=user.role||"Guru";
  await loadWorkspace();$("teacherWorkspace").scrollIntoView({behavior:"smooth",block:"start"});
}

async function loadWorkspace(){
  const year=$("workspaceYear").value;
  try{workspaceData=await api({action:"teacherData",token:session.token,year,house:session.user.house||""});renderWorkspace()}
  catch(error){if(/sesi/i.test(error.message)){sessionStorage.removeItem(SESSION_KEY);location.reload();return}$("pupilRows").innerHTML=`<div class="secure-empty">${safe(error.message)}</div>`}
}

function renderWorkspace(){
  const house=workspaceData.house||session.user.house||"Pentadbir",profile=workspaceData.profile||{},color=HOUSE_COLORS[house]||"#0b4da2";
  $("workspaceHouse").style.setProperty("--house",color);$("houseTitle").textContent=house?`Rumah ${house}`:"Paparan Pentadbir";$("houseMotto").textContent=[profile.officialName,profile.motto].filter(Boolean).join(" • ")||"Maklumat rasmi rumah sukan";
  $("workspacePupilCount").textContent=(workspaceData.pupils||[]).length;$("workspaceEntryCount").textContent=(workspaceData.entries||[]).length;
  renderPupils();renderEntries();
  const items=[["Nama rasmi",profile.officialName],["Moto",profile.motto],["Slogan",profile.slogan],["Ketua rumah",profile.captain],["Pemegang sepanduk",profile.bannerBearer],["Pemegang bendera",profile.flagBearer]];
  $("profileDetails").innerHTML=items.map(([label,value])=>`<article><small>${safe(label)}</small><b>${safe(value||"Belum diisi")}</b></article>`).join("");
}

function renderPupils(){
  const query=$("pupilSearch").value.trim().toLowerCase();const rows=(workspaceData?.pupils||[]).filter(row=>!query||`${row.name} ${row.class}`.toLowerCase().includes(query));
  $("pupilRows").innerHTML=rows.length?`<div class="secure-row secure-head"><span>ID</span><span>Nama murid</span><span>Kelas</span><span>Jantina</span></div>${rows.map(row=>`<div class="secure-row"><span>${safe(row.id||"—")}</span><b>${safe(row.name)}</b><span>${safe(row.class||"—")}</span><span>${safe(row.gender||"—")}</span></div>`).join("")}`:'<div class="secure-empty">Tiada rekod murid dijumpai.</div>';
}
function renderEntries(){const rows=workspaceData?.entries||[];$("entryRows").innerHTML=rows.length?`<div class="secure-row entry secure-head"><span>Nama murid</span><span>Acara</span><span>Kategori</span><span>Status</span></div>${rows.map(row=>`<div class="secure-row entry"><b>${safe(row.name)}</b><span>${safe(row.event)}</span><span>${safe(row.category||"—")}</span><span>${safe(row.status||"Aktif")}</span></div>`).join("")}`:'<div class="secure-empty">Belum ada penyertaan direkodkan untuk tahun ini.</div>'}

async function logout(){try{if(session?.token)await api({action:"logout",token:session.token})}catch{}sessionStorage.removeItem(SESSION_KEY);location.reload()}
function switchTab(button){document.querySelectorAll("[data-workspace-tab]").forEach(x=>x.classList.toggle("active",x===button));["pupils","entries","profile"].forEach(name=>$(name+"Panel").hidden=name!==button.dataset.workspaceTab)}

$("loginForm").addEventListener("submit",login);$("changePasswordForm").addEventListener("submit",changePassword);$("logoutButton").addEventListener("click",logout);$("workspaceYear").addEventListener("change",loadWorkspace);$("pupilSearch").addEventListener("input",renderPupils);$("forgotButton").addEventListener("click",()=>$("adminHelpDialog").showModal());
document.querySelectorAll("[data-workspace-tab]").forEach(button=>button.addEventListener("click",()=>switchTab(button)));document.querySelectorAll("[data-close-dialog]").forEach(button=>button.addEventListener("click",()=>button.closest("dialog").close()));document.querySelectorAll("[data-toggle-password]").forEach(button=>button.addEventListener("click",()=>{const input=$(button.dataset.togglePassword);input.type=input.type==="password"?"text":"password";button.textContent=input.type==="password"?"Lihat":"Sorok"}));

try{session=JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null")}catch{session=null}if(session?.token&&session?.user){if(session.mustChange)$("changePasswordDialog").showModal();else openWorkspace()}
