const META={Merah:{label:"Wira",color:"#e5484d"},Biru:{label:"Perkasa",color:"#246bfd"},Kuning:{label:"Juara",color:"#e5ad00"},Hijau:{label:"Cekal",color:"#1e9b67"}};
let database={years:{}},year="2026",filter="Semua";
const $=id=>document.getElementById(id);
const safe=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

async function start(){
  try{database=await fetch("data.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error();return r.json()});}
  catch{document.body.insertAdjacentHTML("afterbegin",'<div class="error">Data tidak dapat dibaca. Sila muat semula halaman.</div>');return;}
  const years=Object.keys(database.years).sort(); year=years[0]||"2026";
  $("yearSelect").innerHTML=years.map(y=>`<option>${safe(y)}</option>`).join("");
  $("yearSelect").addEventListener("change",e=>{year=e.target.value;render()});
  document.querySelectorAll(".filters button").forEach(btn=>btn.addEventListener("click",()=>{filter=btn.dataset.filter;document.querySelectorAll(".filters button").forEach(b=>b.classList.toggle("active",b===btn));renderSchedule()}));
  const dialog=$("adminDialog"); $("adminButton").onclick=$("heroAdmin").onclick=()=>dialog.showModal(); $("closeDialog").onclick=()=>dialog.close(); dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
  $("menuButton").onclick=()=>{const nav=$("mainNav"),open=nav.classList.toggle("open");$("menuButton").setAttribute("aria-expanded",open)};
  document.querySelectorAll("#mainNav a").forEach(a=>a.addEventListener("click",()=>$("mainNav").classList.remove("open")));
  render();
}
function current(){return database.years[year]||{housePoints:{},results:[],schedule:[]}}
function render(){
  const d=current(),results=Array.isArray(d.results)?d.results:[];
  $("heroYear").textContent=$("stampYear").textContent=year;
  $("studentCount").textContent=results.length; $("eventCount").textContent=new Set(results.map(r=>r.event)).size; $("winnerCount").textContent=results.filter(r=>Number(r.place)===1).length;
  renderHouses();renderWinners();renderSchedule();renderRecords();
}
function renderHouses(){
  const d=current(),results=d.results||[],list=Object.keys(META).map(name=>({name,points:Number(d.housePoints?.[name]||0),gold:results.filter(r=>r.house===name&&Number(r.place)===1).length,silver:results.filter(r=>r.house===name&&Number(r.place)===2).length,bronze:results.filter(r=>r.house===name&&Number(r.place)===3).length})).sort((a,b)=>b.points-a.points),max=Math.max(1,...list.map(x=>x.points));
  $("houseCards").innerHTML=list.map((h,i)=>`<article class="house ${i===0?"leader":""}" style="--house:${META[h.name].color}"><span class="rank">${String(i+1).padStart(2,"0")}</span><h3><i></i>Rumah ${h.name}</h3><small>${META[h.name].label}</small><div class="points"><b>${h.points}</b> MATA</div><div class="bar"><i style="width:${h.points/max*100}%"></i></div><p>🥇 ${h.gold} &nbsp; 🥈 ${h.silver} &nbsp; 🥉 ${h.bronze}</p></article>`).join("");
}
function renderWinners(){const winners=(current().results||[]).filter(r=>Number(r.place)===1);$("winnerList").innerHTML=winners.length?winners.map(r=>`<article><b>1</b><div><small>${safe(r.event)}</small><strong>${safe(r.athlete)}</strong><span>Rumah ${safe(r.house)}</span></div><em>${safe(r.mark||"Johan")}</em></article>`).join(""):`<div class="empty">Belum ada pemenang direkodkan untuk tahun ${safe(year)}.</div>`}
function renderSchedule(){const rows=(current().schedule||[]).filter(r=>filter==="Semua"||r.category===filter);$("scheduleList").innerHTML=rows.length?`<div class="schedule-head"><span>Masa</span><span>Acara</span><span>Kategori</span><span>Status</span></div>`+rows.map(r=>`<div class="schedule-row"><b>${safe(r.time)}</b><div><strong>${safe(r.event)}</strong><small>Stadium SK Ranggu</small></div><span class="tag ${r.category==='Padang'?'green':''}">${safe(r.category)}</span><span>${safe(r.status)}</span></div>`).join(""):`<div class="empty light">Jadual belum dimasukkan untuk tahun ${safe(year)}.</div>`}
function renderRecords(){const rows=current().results||[];$("recordTable").innerHTML=rows.length?`<div class="record-head"><span>Murid</span><span>Acara</span><span>Rumah</span><span>Kedudukan</span><span>Catatan</span></div>`+rows.map(r=>`<div class="record-row"><b>${safe(r.athlete)}</b><span>${safe(r.event)}</span><span>${safe(r.house)}</span><span>${safe(r.place)}</span><span>${safe(r.mark||"—")}</span></div>`).join(""):`<div class="empty light">Belum ada rekod murid. Admin boleh menambahnya melalui butang “Admin / Ubah Data”.</div>`}
start();
