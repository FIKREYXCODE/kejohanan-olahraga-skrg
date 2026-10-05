(function(){
  const items=[
    ["index.html","📊 Dashboard",["","index.html"]],
    ["pingat.html","🏆 Papan Markah",["pingat.html"]],
    ["kalendar.html","📅 Kalendar",["kalendar.html"]],
    ["saringan.html","🏁 Saringan",["saringan.html"]],
    ["rumah-sukan.html","🛡 Rumah Sukan",["rumah-sukan.html","rumah.html","murid.html"]],
    ["aturcara.html","⏱ Atur Cara",["aturcara.html"]],
    ["penyertaan.html","🏃 Penyertaan",["penyertaan.html"]],
    ["acara.html","🎽 Acara",["acara.html"]],
    ["jawatankuasa.html","👥 Jawatankuasa",["jawatankuasa.html"]],
    ["organisasi-sekolah.html","🏛 Organisasi Sekolah",["organisasi-sekolah.html"]],
    ["cetak.html","🖨 Cetakan",["cetak.html"]],
    ["guru.html","🔐 Log Masuk",["guru.html"]]
  ];
  const page=location.pathname.split("/").pop()||"index.html",header=document.querySelector("header.site-bar,header.topbar");
  if(!header||document.body.classList.contains("teacher-auth-page"))return;
  let nav=document.querySelector(".dashboard-nav");
  if(!nav){nav=document.createElement("nav");nav.className="dashboard-nav";nav.setAttribute("aria-label","Menu utama kejohanan")}
  const selectedYear=new URLSearchParams(location.search).get("tahun")||"2026";
  nav.innerHTML=items.map(([href,label,matches])=>{const active=matches.includes(page);const url=new URL(href,location.href);if(href!=="guru.html")url.searchParams.set("tahun",selectedYear);return`<a${active?' class="active" aria-current="page"':href==="guru.html"?' class="nav-login"':""} href="${url.pathname.split("/").pop()}${url.search}">${label}</a>`}).join("");
  let shell=document.querySelector(".global-nav-shell");if(!shell){shell=document.createElement("div");shell.className="global-nav-shell";header.insertAdjacentElement("afterend",shell)}shell.append(nav);
})();
