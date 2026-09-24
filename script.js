let times={},dateData={},audioOn=false,lastPlayed="",locationSource="";
const FALLBACK={lat:-7.65,lon:111.37,label:"Lokasi Mushola At Taqwa"};
const P=[["Fajr","Subuh"],["Sunrise","Syuruq"],["Dhuhr","Dzuhur"],["Asr","Ashar"],["Maghrib","Maghrib"],["Isha","Isya"]];
const IQAMAH={Fajr:"04:15",Sunrise:"—",Dhuhr:"11:36",Asr:"14:48",Maghrib:"17:40",Isha:"18:00"};
const $=id=>document.getElementById(id);
function applyTheme(theme){const allowed=["green","blue","gold","purple","ramadan","led","glass","classic"];if(!allowed.includes(theme))theme="green";document.body.dataset.theme=theme;localStorage.setItem("prayerTheme",theme);document.querySelectorAll(".theme-panel button").forEach(b=>b.classList.toggle("active",b.dataset.theme===theme))}
const themeFromUrl=new URLSearchParams(window.location.search).get("theme");
applyTheme(themeFromUrl||localStorage.getItem("prayerTheme")||"green");
function applyLayout(layout){const allowed=["a","b","c"];if(!allowed.includes(layout))layout="a";document.body.classList.remove("layout-a","layout-b","layout-c");document.body.classList.add("layout-"+layout);localStorage.setItem("prayerLayout",layout);document.querySelectorAll(".layout-panel button").forEach(b=>b.classList.toggle("active",b.dataset.layout===layout))}
const layoutFromUrl=new URLSearchParams(window.location.search).get("layout");
applyLayout(layoutFromUrl||localStorage.getItem("prayerLayout")||"a");
document.querySelectorAll(".layout-panel button").forEach(b=>b.onclick=()=>applyLayout(b.dataset.layout));
document.querySelectorAll(".theme-panel button").forEach(b=>b.onclick=()=>applyTheme(b.dataset.theme));
const isTV=new URLSearchParams(window.location.search).get("tv")==="1"||window.matchMedia("(min-width:1200px) and (orientation:landscape)").matches;
if(isTV)document.body.classList.add("tv-mode");

function setStatus(text){$("status").textContent=text}
function setLocationText(text){$("location").textContent=text}

async function getUserLocation(){
  setLocationText("Mencari lokasi…");
  if(!navigator.geolocation){
    locationSource="fallback";
    setLocationText(FALLBACK.label);
    return load(FALLBACK.lat,FALLBACK.lon);
  }
  navigator.geolocation.getCurrentPosition(
    p=>{
      locationSource="gps";
      load(p.coords.latitude,p.coords.longitude);
      reverseLocation(p.coords.latitude,p.coords.longitude);
    },
    ()=>{
      locationSource="fallback";
      setLocationText(FALLBACK.label);
      load(FALLBACK.lat,FALLBACK.lon);
    },
    {enableHighAccuracy:true,timeout:10000,maximumAge:300000}
  );
}

async function reverseLocation(lat,lon){
  try{
    const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=12&accept-language=id`,{headers:{"Accept":"application/json"}});
    if(!r.ok)throw new Error("reverse geocode");
    const d=await r.json(),a=d.address||{};
    setLocationText(a.village||a.town||a.city||a.county||"Lokasi Mushola At Taqwa");
  }catch{setLocationText("Mushola At Taqwa")}
}

async function load(lat,lon){
  try{
    const r=await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=11`,{cache:"no-store"});
    if(!r.ok)throw new Error("AlAdhan");
    const d=await r.json();
    if(!d.data?.timings)throw new Error("No timings");
    times=d.data.timings;
    dateData=d.data.date||{};
    localStorage.setItem("times",JSON.stringify(times));
    localStorage.setItem("dateData",JSON.stringify(dateData));
    setStatus(locationSource==="fallback"?"Online · Fallback":"Online");
    render();
  }catch{
    const c=localStorage.getItem("times");
    if(c){
      try{
        times=JSON.parse(c);
        dateData=JSON.parse(localStorage.getItem("dateData")||"{}");
        setStatus("Offline · Cache");
        render();
      }catch{
        setStatus("Gagal");
      }
    }else{
      setStatus("Gagal");
      $("prayer-times").innerHTML='<div class="loading">Jadwal sholat belum tersedia. Coba Perbarui Lokasi.</div>';
    }
  }
}

function render(){
  const n=new Date(),cur=n.getHours()*60+n.getMinutes(),box=$("prayer-times");
  box.innerHTML="";
  P.forEach((x,i)=>{
    const t=times[x[0]];
    if(!t)return;
    const [h,m]=t.split(":").map(Number);
    let active=false;
    if(x[0]!=="Sunrise"){
      const next=P.slice(i+1).find(y=>y[0]!=="Sunrise"&&times[y[0]]);
      const nh=next?times[next[0]].split(":").map(Number):null;
      active=cur>=h*60+m&&(!nh||cur<nh[0]*60+nh[1]);
    }
    box.innerHTML+=`<div class="prayer-card ${active?"active":""}"><h3>${x[1]}</h3><p>${t}</p><small>${x[0]==="Sunrise"?"Matahari terbit":"Waktu sholat"}</small><span class="iqamah">IQAMAH ${IQAMAH[x[0]]||"—"}</span></div>`;
  });
}

function tick(){
  const n=new Date(),h=String(n.getHours()).padStart(2,"0"),m=String(n.getMinutes()).padStart(2,"0"),s=String(n.getSeconds()).padStart(2,"0");
  $("clock").textContent=`${h}:${m}:${s}`;
  $("date").textContent=n.toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  if(dateData.hijri)$("hijri").textContent=`${dateData.hijri.day} ${dateData.hijri.month?.en||""} ${dateData.hijri.year} H`;
  render();

  let cur=n.getHours()*60+n.getMinutes()+n.getSeconds()/60,next=null;
  for(const x of P){
    if(x[0]==="Sunrise")continue;
    const q=times[x[0]]?.split(":").map(Number);
    if(q&&q[0]*60+q[1]>cur){next=[x[1],q[0]*60+q[1]];break}
  }
  if(!next&&times.Fajr){
    const q=times.Fajr.split(":").map(Number);
    next=["Subuh Esok",1440+q[0]*60+q[1]];
  }
  if(next){
    const d=Math.max(0,next[1]-cur),hh=Math.floor(d/60),mm=Math.floor(d%60),ss=Math.floor((d*60)%60);
    $("next-label").textContent="MENUJU "+next[0].toUpperCase();
    $("next").textContent=`${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  }

  if(audioOn&&!($("night").checked&&(n.getHours()>=22||n.getHours()<4))){
    for(const x of P.filter(x=>x[0]!=="Sunrise")){
      if(times[x[0]]===`${h}:${m}`&&lastPlayed!==`${x[0]}-${h}:${m}`){
        $("adzan").currentTime=0;
        $("adzan").play().catch(()=>{});
        lastPlayed=`${x[0]}-${h}:${m}`;
      }
    }
  }
}

$("audio").onclick=()=>{
  audioOn=true;
  $("audio").textContent="🔊 Suara Adzan Aktif";
  $("adzan").play().then(()=>{$("adzan").pause();$("adzan").currentTime=0}).catch(()=>{});
};
$("locbtn").onclick=getUserLocation;
$("full").onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();

if(navigator.getBattery)navigator.getBattery().then(b=>{
  const f=()=>$( "battery").textContent=Math.round(b.level*100)+"%"+(b.charging?" ⚡":"");
  f();b.onlevelchange=f;b.onchargingchange=f;
}).catch(()=>{});

setInterval(tick,1000);
tick();
getUserLocation();

const BG_IMAGES=[
"https://commons.wikimedia.org/wiki/Special:FilePath/Sunset%20mosque.jpg?width=1920",
"https://commons.wikimedia.org/wiki/Special:FilePath/Koutoubia%20Mosque%20Sunset.jpg?width=1920",
"https://commons.wikimedia.org/wiki/Special:FilePath/Mosque%20with%20Sunset.jpg?width=1600",
"https://commons.wikimedia.org/wiki/Special:FilePath/Sultan%20Omar%20Ali%20Saifuddin%20Mosque%2002.jpg?width=1920",
"https://commons.wikimedia.org/wiki/Special:FilePath/Masjid%20Istiqlal%20Jadi%20Destinasi%20Favorit%20Ngabuburit%20dan%20Berbuka%20Puasa.jpg?width=1920"
];
const bgA=document.querySelector(".bg-a"),bgB=document.querySelector(".bg-b");
let bgIndex=0,bgLayer=bgA;
function showBg(url,layer){
  layer.style.backgroundImage=`url("${url}")`;
  requestAnimationFrame(()=>layer.classList.add("active"));
}
function slideBackground(){
  const next=(bgIndex+1)%BG_IMAGES.length;
  const nextLayer=bgLayer===bgA?bgB:bgA;
  nextLayer.classList.remove("active");
  showBg(BG_IMAGES[next],nextLayer);
  setTimeout(()=>{bgLayer.classList.remove("active");bgLayer=nextLayer;bgIndex=next},1900);
}
if(bgA&&bgB){
  showBg(BG_IMAGES[0],bgA);
  setInterval(slideBackground,15000);
}
