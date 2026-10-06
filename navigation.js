(function(){
  const items=[
    ["index.html","📊 Dashboard",["","index.html"]],
    ["pingat.html","🏆 Papan Markah",["pingat.html"]],
    ["kalendar.html","📅 Kalendar",["kalendar.html"]],
    ["saringan.html","🏁 Carta Perlawanan",["saringan.html"]],
    ["pengadil.html","⏱ Pengadil",["pengadil.html"]],
    ["rumah-sukan.html","🛡 Rumah Sukan",["rumah-sukan.html","rumah.html","murid.html"]],
    ["aturcara.html","⏱ Atur Cara",["aturcara.html"]],
    ["penyertaan.html","🏃 Penyertaan",["penyertaan.html"]],
    ["acara.html","🎽 Acara",["acara.html"]],
    ["jawatankuasa.html","👥 Jawatankuasa",["jawatankuasa.html"]],
    ["organisasi-sekolah.html","🏛 Organisasi Sekolah",["organisasi-sekolah.html"]],
    ["cetak.html","🖨 Cetakan",["cetak.html"]],
    ["guru.html","🔐 Guru",["guru.html"]]
  ];
  const page=location.pathname.split("/").pop()||"index.html",header=document.querySelector("header.site-bar,header.topbar");
  if(!header||document.body.classList.contains("teacher-auth-page"))return;
  let nav=document.querySelector(".dashboard-nav");
  if(!nav){nav=document.createElement("nav");nav.className="dashboard-nav";nav.setAttribute("aria-label","Menu utama kejohanan")}
  const selectedYear=new URLSearchParams(location.search).get("tahun")||"2026";
  nav.innerHTML=items.map(([href,label,matches])=>{const active=matches.includes(page);const url=new URL(href,location.href);if(!["guru.html","pengadil.html"].includes(href))url.searchParams.set("tahun",selectedYear);const loginClass=["guru.html","pengadil.html"].includes(href);return`<a${active?' class="active" aria-current="page"':loginClass?' class="nav-login"':""} href="${url.pathname.split("/").pop()}${url.search}">${label}</a>`}).join("");
  let shell=document.querySelector(".global-nav-shell");if(!shell){shell=document.createElement("div");shell.className="global-nav-shell";header.insertAdjacentElement("afterend",shell)}shell.append(nav);
  if(page!=="pengadil.html"&&!document.querySelector(".mobile-judge-shortcut")){const shortcut=document.createElement("a");shortcut.className="mobile-judge-shortcut";shortcut.href="pengadil.html";shortcut.setAttribute("aria-label","Buka Portal Pengadil");shortcut.innerHTML="<span>⏱</span><b>Pengadil</b>";document.body.append(shortcut)}
  const renderTicker=settings=>{
    const text=String(settings?.tickerText||"").trim();
    if(!settings?.tickerActive||!text||document.querySelector(".news-ticker"))return;
    const ticker=document.createElement("aside");ticker.className="news-ticker";ticker.setAttribute("aria-label","Hebahan semasa");
    const label=document.createElement("strong");label.textContent="HEBAHAN";
    const viewport=document.createElement("div");viewport.className="news-ticker-viewport";
    const track=document.createElement("div");track.className="news-ticker-track";
    [0,1].forEach(()=>{const item=document.createElement("span");item.textContent=text;track.append(item)});
    viewport.append(track);ticker.append(label,viewport);document.body.append(ticker);document.body.classList.add("has-news-ticker");
  };
  const endpoint="https://script.google.com/macros/s/AKfycbx3r8_KKM-jHIpPoL6dEa-IKIXZqfjxWDr3jJQF8AC2QvjL7MUrEGBuoNRkvpG9k6lnhQ/exec";
  fetch(endpoint,{cache:"no-store",redirect:"follow"}).then(response=>response.ok?response.json():Promise.reject()).catch(()=>fetch("data.json",{cache:"no-store"}).then(response=>response.json())).then(data=>renderTicker(data?.settings)).catch(()=>{});
})();
