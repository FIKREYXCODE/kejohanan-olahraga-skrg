const HOUSE_ORDER=["Biru","Kuning","Ungu","Merah"];
const HOUSE_META={Biru:{color:"#246bfd"},Kuning:{color:"#e5ad00"},Ungu:{color:"#5b3fd0"},Merah:{color:"#df3f47"}};
const DATA_API="https://script.google.com/macros/s/AKfycbx3r8_KKM-jHIpPoL6dEa-IKIXZqfjxWDr3jJQF8AC2QvjL7MUrEGBuoNRkvpG9k6lnhQ/exec";
async function loadDatabase(){
  try{
    const response=await fetch(DATA_API,{cache:"no-store",redirect:"follow"});
    if(!response.ok)throw Error("API tidak tersedia");
    const live=await response.json();
    if(live.error||!live.years)throw Error(live.message||"Data API tidak sah");
    window.__dataSource="Google Sheet";document.documentElement.dataset.dataSource="google-sheet";
    return live;
  }catch(error){
    const fallback=await fetch("data.json",{cache:"no-store"});
    if(!fallback.ok)throw error;
    window.__dataSource="Sandaran GitHub";document.documentElement.dataset.dataSource="github-fallback";
    return fallback.json();
  }
}
const safe=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const show=value=>value?safe(value):'<span class="not-set">Belum diisi</span>';
const params=new URLSearchParams(location.search);
let houseName=params.get("rumah")||"Biru";
let year=params.get("tahun")||"2026";
if(!HOUSE_ORDER.includes(houseName))houseName="Biru";

function renderNames(items,empty){
  return items?.length?`<ol class="profile-list">${items.map(x=>`<li>${safe(typeof x==="string"?x:x.name||"")}</li>`).join("")}</ol>`:`<p class="profile-empty">${empty}</p>`;
}

async function start(){
  try{
    const database=await loadDatabase();
    const years=database.years||{};
    if(!years[year])year=Object.keys(years).sort()[0]||"2026";
    const h=years[year]?.houses?.[houseName];
    if(!h)throw Error("Rumah tidak ditemui");
    const color=HOUSE_META[houseName].color;
    document.documentElement.style.setProperty("--house",color);
    document.title=`${h.officialName||"Rumah "+houseName} | SK Ranggu`;
    document.getElementById("profileYear").textContent=year;
    document.getElementById("profileOfficial").textContent=h.officialName||`Rumah ${houseName}`;
    document.getElementById("profileHouse").textContent=`Rumah ${houseName} • Sekolah Kebangsaan Ranggu`;

    const teachers=(h.teacher||"").split(";").map(x=>x.trim()).filter(Boolean);
    document.getElementById("teacherCount").textContent=`${teachers.length} guru`;
    document.getElementById("teacherLabel").textContent=`${teachers.length} orang`;
    document.getElementById("teacherList").innerHTML=teachers.length?teachers.map((teacher,i)=>{
      const isCoordinator=/\(K\)/i.test(teacher);
      const name=teacher.replace(/\s*\(K\)\s*/i,"");
      return `<div class="teacher-card"><span>${String(i+1).padStart(2,"0")}</span><b>${safe(name)}</b>${isCoordinator?'<em class="coordinator">KETUA GURU</em>':""}</div>`;
    }).join(""):'<p class="profile-empty">Nama guru belum diisi.</p>';

    document.getElementById("profileMotto").innerHTML=show(h.motto);
    document.getElementById("profileSlogan").innerHTML=show(h.slogan);
    document.getElementById("profileCaptain").innerHTML=show(h.captain);
    document.getElementById("profileBanner").innerHTML=show(h.bannerBearer);
    document.getElementById("profileFlag").innerHTML=show(h.flagBearer);

    const members=h.members||[],marching=h.marchingTeam||[],participants=h.participants||[];
    document.getElementById("memberCountProfile").textContent=`${members.length} ahli rumah`;
    document.getElementById("participantCountProfile").textContent=`${participants.length} penyertaan`;
    document.getElementById("memberLabel").textContent=`${members.length} ahli`;
    document.getElementById("marchingLabel").textContent=`${marching.length} orang`;
    document.getElementById("participantLabel").textContent=`${participants.length} penyertaan`;
    document.getElementById("memberList").innerHTML=renderNames(members,"Belum ada ahli rumah didaftarkan.");
    document.getElementById("marchingList").innerHTML=renderNames(marching,"Belum ada barisan kawad kaki didaftarkan.");
    document.getElementById("participantList").innerHTML=participants.length?`<div class="profile-table"><div class="profile-table-head"><span>Nama murid</span><span>Acara</span><span>Kategori</span></div>${participants.map(p=>`<div><b>${safe(p.name)}</b><span>${safe(p.event)}</span><span>${safe(p.category||"—")}</span></div>`).join("")}</div>`:'<p class="profile-empty">Belum ada peserta acara didaftarkan.</p>';
  }catch(error){
    document.getElementById("profileMain").innerHTML='<div class="profile-error"><h2>Profil belum tersedia</h2><p>Maklumat rumah sukan tidak dapat dibaca buat masa ini.</p><a class="primary" href="index.html#rumah">Kembali ke rumah sukan</a></div>';
  }
}
start();