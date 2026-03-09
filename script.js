let prayerTimesData = {};
let audioEnabled = false;

function enableAudio() {
    audioEnabled = true;
    const btn = document.getElementById('audio-btn');
    btn.innerText = "Suara Adzan Aktif 🔊";
    btn.style.background = "#00ff88";
    btn.style.color = "#111";
}

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            getPrayerTimes(pos.coords.latitude, pos.coords.longitude);
        }, () => getPrayerTimes(-6.20, 106.84)); // Default Jakarta
    }
}

async function getPrayerTimes(lat, lon) {
    const url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=11`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        prayerTimesData = data.data.timings;
        document.getElementById('location').innerText = `Lokasi: ${lat.toFixed(2)}, ${lon.toFixed(2)}`;
        renderPrayers();
    } catch (e) { console.error("Gagal ambil API", e); }
}

function renderPrayers() {
    const container = document.getElementById('prayer-times');
    container.innerHTML = '';
    const now = new Date();
    const currentTotalMin = now.getHours() * 60 + now.getMinutes();

    const prayers = [
        {key:'Fajr', n:'Subuh'}, {key:'Dhuhr', n:'Dzuhur'}, 
        {key:'Asr', n:'Ashar'}, {key:'Maghrib', n:'Maghrib'}, {key:'Isha', n:'Isya'}
    ];

    prayers.forEach((p, i) => {
        const [h, m] = prayerTimesData[p.key].split(':').map(Number);
        const prayerMin = h * 60 + m;
        let activeClass = "";
        
        // Logika highlight kartu aktif
        if (i < prayers.length - 1) {
            const [nh, nm] = prayerTimesData[prayers[i+1].key].split(':').map(Number);
            if (currentTotalMin >= prayerMin && currentTotalMin < (nh*60+nm)) activeClass = "active";
        } else if (currentTotalMin >= prayerMin) { activeClass = "active"; }

        container.innerHTML += `<div class="prayer-card ${activeClass}"><h3>${p.n}</h3><p>${prayerTimesData[p.key]}</p></div>`;
    });
}

function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${h}:${m}:${s}`;
    
    document.getElementById('clock').innerText = timeStr;
    document.getElementById('date').innerText = now.toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
    
    checkAdzan(`${h}:${m}`);
    updateCountdown(now.getHours(), now.getMinutes());
}

function checkAdzan(nowStr) {
    const hour = new Date().getHours();
    const isMute = document.getElementById('night-mute').checked && (hour >= 22 || hour < 4);
    
    if (audioEnabled && !isMute) {
        ['Fajr','Dhuhr','Asr','Maghrib','Isha'].forEach(k => {
            if (nowStr === prayerTimesData[k]) {
                const a = document.getElementById('adzan-audio');
                if (a.paused) a.play();
            }
        });
    }
}

function updateCountdown(hNow, mNow) {
    if (!prayerTimesData.Fajr) return;
    const nowMin = hNow * 60 + mNow;
    const prayers = [
        {n:'Subuh', t:prayerTimesData.Fajr}, {n:'Dzuhur', t:prayerTimesData.Dhuhr},
        {n:'Ashar', t:prayerTimesData.Asr}, {n:'Maghrib', t:prayerTimesData.Maghrib}, {n:'Isya', t:prayerTimesData.Isha}
    ];

    let next = null;
    for (let p of prayers) {
        const [h, m] = p.t.split(':').map(Number);
        if ((h * 60 + m) > nowMin) { next = {n:p.n, m: (h*60+m)}; break; }
    }

    if (!next) { 
        const [h, m] = prayers[0].t.split(':').map(Number);
        next = {n:'Subuh Esok', m: (1440 + h*60 + m)}; 
    }

    const diff = next.m - nowMin;
    document.getElementById('next-prayer-info').innerText = `${Math.floor(diff/60)}j ${diff%60}m menuju ${next.n}`;
}

setInterval(updateClock, 1000);
getLocation();