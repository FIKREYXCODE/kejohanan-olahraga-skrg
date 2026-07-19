const HOUSE_ORDER=["Biru","Kuning","Ungu","Merah"];
const HOUSE_META={Biru:{color:"#246bfd"},Kuning:{color:"#e5ad00"},Ungu:{color:"#5b3fd0"},Merah:{color:"#df3f47"}};
const EMPTY_HOUSE={teacher:"",motto:"",slogan:"",captain:"",bannerBearer:"",flagBearer:"",members:[],participants:[],marchingTeam:[]};
let database={years:{}},year="2026",filter="Semua";
const $=id=>document.getElementById(id);
const safe=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const textOrEmpty=value=>value?safe(value):'<span class="not-set">Belum diisi</span>';

async function start(){
  try{database=await fetch("data.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error();return r.json()});}
  catch{document.body.insertAdjacentHTML("afterbegin",'<div class="error">Data tidak dapat dibaca. Sila muat semula halaman.</div>');return;}
  const years=Object.keys(database.years).sort();year=years.includes("2026")?"2026":years[0]||"2026";
  $("yearSelect").innerHTML=years.map(y=>`<option>${safe(y)}</option>`).join("");
  $("yearSelect").value=year;
  $("yearSelect").addEventListener("change",e=>{year=e.target.value;render()});
  document.querySelectorAll(".filters button").forEach(btn=>btn.addEventListener("click",()=>{filter=btn.dataset.filter;document.querySelectorAll(".filters button").forEach(b=>b.classList.toggle("active",b===btn));renderSchedule()}));
  const dialog=$("adminDialog");$("adminButton").onclick=$("heroAdmin").onclick=()=>dialog.showModal();$("closeDialog").onclick=()=>dialog.close();dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
  $("menuButton").onclick=()=>{const nav=$("mainNav"),open=nav.classList.toggle("open");$("menuButton").setAttribute("aria-expanded",open)};
  document.querySelectorAll("#mainNav a").forEach(a=>a.addEventListener("click",()=>$("mainNav").classList.remove("open")));
  render();
}

function current(){return database.years[year]||{houses:{},schedule:[],results:[]}}
function house(name){return {...EMPTY_HOUSE,...(current().houses?.[name]||{})}}
function allParticipants(){return HOUSE_ORDER.flatMap(name=>(house(name).participants||[]).map(p=>({...p,house:name})))}
function render(){
  const d=current(),members=HOUSE_ORDER.reduce((n,name)=>n+(house(name).members||[]).length,0),participants=allParticipants();
  $("heroYear").textContent=$("stampYear").textContent=year;
  $("houseCount").textContent=HOUSE_ORDER.length;$("memberCount").textContent=members;$("participantCount").textContent=participants.length;$("eventCount").textContent=(d.schedule||[]).length;
  renderHouseCards();renderMedals();renderWinners();renderSchedule();renderParticipants();
}

function renderHouseCards(){
  $("houseCards").innerHTML=HOUSE_ORDER.map((name,index)=>{
    const h=house(name),teachers=(h.teacher||"").split(";").map(x=>x.trim()).filter(Boolean);
    const coordinator=(teachers.find(x=>/\(K\)/i.test(x))||teachers[0]||"Belum diisi").replace(/\s*\(K\)\s*/i,"");
    const official=h.officialName||`Rumah ${name}`;
    const url=`rumah.html?rumah=${encodeURIComponent(name)}&tahun=${encodeURIComponent(year)}`;
    return `<a class="house-card house-card-${index+1}" href="${url}" style="--house:${HOUSE_META[name].color}">
      <div class="house-card-top"><span class="house-number">0${index+1}</span><i aria-hidden="true"></i><span>RUMAH ${safe(name).toUpperCase()}</span></div>
      <div class="house-card-body"><small>NAMA RASMI PASUKAN</small><h3>${safe(official)}</h3><div class="house-card-meta"><span><b>${teachers.length}</b> guru</span><span><small>Ketua guru</small><b>${safe(coordinator)}</b></span></div></div>
      <div class="house-card-link"><span>Lihat profil lengkap</span><b>→</b></div>
    </a>`;
  }).join("");
}

function medalRows(){
  const results=current().results||[];
  return HOUSE_ORDER.map(name=>{const rows=results.filter(r=>r.house===name);return{name,gold:rows.filter(r=>Number(r.place)===1).length,silver:rows.filter(r=>Number(r.place)===2).length,bronze:rows.filter(r=>Number(r.place)===3).length}}).map(x=>({...x,total:x.gold+x.silver+x.bronze})).sort((a,b)=>b.gold-a.gold||b.silver-a.silver||b.bronze-a.bronze||HOUSE_ORDER.indexOf(a.name)-HOUSE_ORDER.indexOf(b.name));
}
function renderMedals(){
  const rows=medalRows(),hasResults=rows.some(r=>r.total>0);
  $("medalTable").innerHTML=`<div class="medal-head"><span>Kedudukan</span><span>Rumah</span><span>🥇 Emas</span><span>🥈 Perak</span><span>🥉 Gangsa</span><span>Jumlah</span></div>${rows.map((r,i)=>`<div class="medal-row"><b>${hasResults?i+1:'—'}</b><strong style="--house:${HOUSE_META[r.name].color}"><i></i>Rumah ${r.name}</strong><span>${r.gold}</span><span>${r.silver}</span><span>${r.bronze}</span><b>${r.total}</b></div>`).join("")}${!hasResults?'<p class="table-note">Belum ada pingat direkodkan untuk tahun ini.</p>':''}`;
}

function renderWinners(){
  const winners=(current().results||[]).filter(r=>Number(r.place)===1);
  $("winnerList").innerHTML=winners.length?winners.map(r=>`<article><b>1</b><div><small>${safe(r.event)}</small><strong>${safe(r.athlete)}</strong><span>Rumah ${safe(r.house)}</span></div><em>${safe(r.mark||"Johan")}</em></article>`).join(""):`<div class="empty">Belum ada keputusan atau pemenang direkodkan untuk tahun ${safe(year)}.</div>`;
}

function renderSchedule(){
  const rows=(current().schedule||[]).filter(r=>filter==="Semua"||r.category===filter);
  $("scheduleList").innerHTML=rows.length?`<div class="schedule-head"><span>Masa</span><span>Acara / Pertandingan</span><span>Kategori</span><span>Tempat</span><span>Status</span></div>`+rows.map(r=>`<div class="schedule-row"><b>${safe(r.time)}</b><div><strong>${safe(r.event)}</strong><small>${safe(r.note||"")}</small></div><span class="tag">${safe(r.category)}</span><span>${safe(r.venue||"—")}</span><span>${safe(r.status||"Dijadualkan")}</span></div>`).join(""):`<div class="empty light">Atur cara dan pertandingan belum dimasukkan untuk tahun ${safe(year)}.</div>`;
}

function renderParticipants(){
  const rows=allParticipants();
  $("participantTable").innerHTML=rows.length?`<div class="record-head"><span>Nama murid</span><span>Rumah</span><span>Acara</span><span>Kategori</span></div>`+rows.map(r=>`<div class="record-row"><b>${safe(r.name)}</b><span>Rumah ${safe(r.house)}</span><span>${safe(r.event)}</span><span>${safe(r.category||"—")}</span></div>`).join(""):`<div class="empty light">Belum ada peserta dimasukkan daripada borang penghantaran penyertaan.</div>`;
}
start();
