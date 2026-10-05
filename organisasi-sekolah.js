const SCHOOL_CHARTS={
  pentadbiran:{title:"Carta Organisasi Pentadbiran",description:"Bidang pengurusan pentadbiran SK Ranggu tahun 2026.",image:"assets/organisasi/pentadbiran-2026.jpg"},
  kurikulum:{title:"Carta Organisasi Kurikulum",description:"Panitia, penyelaras dan unit kurikulum SK Ranggu tahun 2026.",image:"assets/organisasi/kurikulum-2026.jpg"},
  hem:{title:"Carta Organisasi Hal Ehwal Murid",description:"Kebajikan, disiplin, bantuan, keselamatan dan pengurusan murid tahun 2026.",image:"assets/organisasi/hem-2026.jpg"},
  kokurikulum:{title:"Carta Organisasi Kokurikulum",description:"Kelab dan persatuan, sukan permainan serta unit beruniform tahun 2026.",image:"assets/organisasi/kokurikulum-2026.jpg"}
};
const chartImage=document.getElementById("schoolChartImage"),dialog=document.getElementById("chartDialog"),dialogImage=document.getElementById("chartDialogImage");
function selectChart(button){
  const chart=SCHOOL_CHARTS[button.dataset.chart];if(!chart)return;
  document.querySelectorAll("[data-chart]").forEach(item=>{const active=item===button;item.classList.toggle("active",active);item.setAttribute("aria-selected",String(active))});
  document.getElementById("chartViewerTitle").textContent=chart.title;document.getElementById("chartViewerDescription").textContent=chart.description;chartImage.src=chart.image;chartImage.alt=`${chart.title} SK Ranggu 2026`;dialogImage.src=chart.image;dialogImage.alt=chartImage.alt;
}
document.querySelectorAll("[data-chart]").forEach(button=>button.addEventListener("click",()=>selectChart(button)));
document.getElementById("chartFullscreen").addEventListener("click",()=>dialog.showModal());dialog.querySelector(".dialog-close").addEventListener("click",()=>dialog.close());dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close()});
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
