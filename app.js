const HOUSE_ORDER=["Merah","Biru","Kuning","Hijau","Purple"];
const HOUSE_META={Merah:{color:"#df3f47"},Biru:{color:"#246bfd"},Kuning:{color:"#e5ad00"},Hijau:{color:"#16875c"},Purple:{color:"#7c3aed"}};
const EMPTY_HOUSE={teacher:"",motto:"",slogan:"",captain:"",bannerBearer:"",flagBearer:"",members:[],participants:[],marchingTeam:[]};
let database={years:{}},year="2026",filter="Semua",activeHouse="Merah";
const $=id=>document.getElementById(id);
const safe=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const textOrEmpty=value=>value?safe(value):'<span class="not-set">Belum diisi</span>';

async function start(){
  try{database=await fetch("data.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error();return r.json()});}
  catch{document.body.insertAdjacentHTML("afterbegin",'<div class="error">Data tidak dapat dibaca. Sila muat semula halaman.</div>');return;}
  const years=Object.keys(database.years).sort();year=years.includes("2026")?"2026":years[0]||"2026";
  $("yearSelect").innerHTML=years.map(y=>`<option>${safe(y)}</option>`).join("");
  $("yearSelect").value=year;
  $("yearSelect").addEventListener("change",e=>{year=e.target.value;activeHouse="Merah";render()});
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
  renderHouseTabs();renderHouseDetail();renderMedals();renderWinners();renderSchedule();renderParticipants();
}

function renderHouseTabs(){
  $("houseTabs").innerHTML=HOUSE_ORDER.map(name=>`<button class="house-tab ${name===activeHouse?'active':''}" data-house="${name}" style="--house:${HOUSE_META[name].color}"><i></i>Rumah ${name}</button>`).join("");
  document.querySelectorAll(".house-tab").forEach(btn=>btn.onclick=()=>{activeHouse=btn.dataset.house;renderHouseTabs();renderHouseDetail()});
}

function nameList(items,empty){return items?.length?`<ol class="name-list">${items.map(item=>`<li>${safe(typeof item==="string"?item:item.name||"")}</li>`).join("")}</ol>`:`<p class="empty-small">${empty}</p>`}
function participantList(items){return items?.length?`<div class="mini-table"><div class="mini-head"><span>Nama murid</span><span>Acara</span><span>Kategori</span></div>${items.map(p=>`<div><b>${safe(p.name)}</b><span>${safe(p.event)}</span><span>${safe(p.category||"—")}</span></div>`).join("")}</div>`:'<p class="empty-small">Belum ada peserta didaftarkan.</p>'}

function renderHouseDetail(){
  const h=house(activeHouse),color=HOUSE_META[activeHouse].color;
  $("houseDetail").innerHTML=`<article class="house-profile" style="--house:${color}">
    <div class="house-identity"><span class="house-dot"></span><div><small>PROFIL PASUKAN</small><h3>Rumah ${safe(activeHouse)}</h3><blockquote>${h.slogan?`“${safe(h.slogan)}”`:'Slogan belum diisi'}</blockquote></div></div>
    <div class="info-grid"><div><small>Guru rumah sukan</small><b>${textOrEmpty(h.teacher)}</b></div><div><small>Moto rumah</small><b>${textOrEmpty(h.motto)}</b></div><div><small>Ketua rumah sukan</small><b>${textOrEmpty(h.captain)}</b></div><div><small>Pemegang sepanduk</small><b>${textOrEmpty(h.bannerBearer)}</b></div><div><small>Pemegang bendera</small><b>${textOrEmpty(h.flagBearer)}</b></div></div>
    <div class="list-grid"><section><div class="subheading"><b>Senarai ahli rumah</b><span>${(h.members||[]).length} ahli</span></div>${nameList(h.members,"Belum ada ahli didaftarkan.")}</section><section><div class="subheading"><b>Barisan kawad kaki</b><span>${(h.marchingTeam||[]).length} orang</span></div>${nameList(h.marchingTeam,"Belum ada nama barisan kawad kaki.")}</section></div>
    <section class="participants-card"><div class="subheading"><b>Peserta &amp; pertandingan</b><span>${(h.participants||[]).length} penyertaan</span></div>${participantList(h.participants)}</section>
  </article>`;
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
