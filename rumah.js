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
    const officialName=`Rumah ${houseName}`;
    document.documentElement.style.setProperty("--house",color);
    document.title=officialName+" | SK Ranggu";
    document.getElementById("profileYear").textContent=year;
    document.getElementById("profileOfficial").textContent=officialName;
    document.getElementById("profileHouse").textContent=`Rumah ${houseName} • Sekolah Kebangsaan Ranggu`;
    const profileLogo=document.getElementById("profileTempLogo");
    if(h.logo){profileLogo.classList.add("has-house-logo");profileLogo.innerHTML=`<img src="${safe(h.logo)}" alt="Logo Rumah ${safe(houseName)}">`}
    else{profileLogo.classList.remove("has-house-logo");profileLogo.innerHTML=`<span id="profileLogoText">${{Biru:"B",Kuning:"K",Ungu:"U",Merah:"M"}[houseName]}</span><small>LAMBANG RUMAH</small>`}

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
    const memberCount=Number(h.memberCount??members.length),participantCount=Number(h.participantCount??participants.length);
    document.getElementById("memberCountProfile").textContent=`${memberCount} ahli rumah`;
    document.getElementById("participantCountProfile").textContent=`${participantCount} penyertaan`;
    document.getElementById("memberLabel").textContent=`${memberCount} ahli`;
    document.getElementById("marchingLabel").textContent=marching.length?`${marching.length} orang`:"Akses guru";
    document.getElementById("participantLabel").textContent=`${participantCount} penyertaan`;
    [["memberCover",h.memberImage],["marchingCover",h.marchingImage],["participantCover",h.participantImage]].forEach(([id,image])=>{if(image){const cover=document.getElementById(id);cover.classList.add("has-cover-image");cover.style.setProperty("--cover-image",`url(${JSON.stringify(image)})`)}});
    const protectedPanel=(icon,title,copy)=>`<div class="profile-protected"><span class="protected-icon">${icon}</span><div><small>AKSES TERKAWAL</small><b>${title}</b><p>${copy}</p></div><a href="guru.html"><span>Log masuk Portal Guru</span><b>→</b></a></div>`;
    document.getElementById("memberList").innerHTML=members.length?renderNames(members,"Belum ada ahli rumah didaftarkan."):protectedPanel("🛡️","Senarai murid dilindungi","Nama dan kelas ahli rumah hanya boleh dilihat oleh guru Rumah "+houseName+" selepas log masuk.");
    document.getElementById("marchingList").innerHTML=marching.length?renderNames(marching,"Belum ada barisan kawad kaki didaftarkan."):protectedPanel("🥁","Barisan kawad dilindungi","Senarai ahli perbarisan disimpan dalam ruang kerja guru rumah yang selamat.");
    document.getElementById("participantList").innerHTML=participants.length?`<div class="profile-table"><div class="profile-table-head"><span>Nama murid</span><span>Acara</span><span>Kategori</span></div>${participants.map(p=>`<div><b>${safe(p.name)}</b><span>${safe(p.event)}</span><span>${safe(p.category||"—")}</span></div>`).join("")}</div>`:protectedPanel("🏁","Penyertaan atlet dilindungi","Nama peserta dan pilihan acara hanya diterbitkan mengikut aturan kejohanan.");
  }catch(error){
    document.getElementById("profileMain").innerHTML='<div class="profile-error"><h2>Profil belum tersedia</h2><p>Maklumat rumah sukan tidak dapat dibaca buat masa ini.</p><a class="primary" href="rumah-sukan.html">Kembali ke rumah sukan</a></div>';
  }
}
start();
