/* «Ӟеч-а бур-а удмурт кыл?» — мобильное приложение для изучения удмуртского языка (5–10 лет).
   Работает полностью оффлайн: все слова, картинки и шрифты внутри приложения. */
(function () {
  "use strict";

  // ---------------------------------------------------------------- data
  const TOPICS = window.UDM_TOPICS;
  const WORDS = [];
  TOPICS.forEach((t) => t.words.forEach((w, i) => { w.id = t.id + ":" + i; w.t = t; WORDS.push(w); }));
  const WBYID = Object.fromEntries(WORDS.map((w) => [w.id, w]));
  const TBYID = Object.fromEntries(TOPICS.map((t) => [t.id, t]));
  const IMGS = window.UDM_IMG || {};
  const ART = window.UDM_ART;
  const IS_ANDROID = !!window.AndroidBridge;

  const AVATARS = ["Fox", "Bear", "Rabbit", "Hedgehog", "Chipmunk", "Owl", "Wolf", "Moose", "Cat", "Dog", "Beaver", "Duck"];
  const PW_ITEMS = ["Bear", "Fox", "Rabbit", "Hedgehog", "Strawberry", "Sun with face", "Evergreen tree", "Star", "Red heart"];
  const DAILY_GOAL = 60;
  const IZHEVSK = [56.8526, 53.2045];

  const GAMES = [
    { id: "quiz", name: "Выбери перевод", desc: "Картинка или слово — найди верный ответ", img: "Bullseye", bg: "#FDE7E4" },
    { id: "odd", name: "Найди лишнее", desc: "Три слова из одной темы, а одно — лишнее", img: "Magnifying glass tilted left", bg: "#E3F0FD" },
    { id: "sort", name: "Сортировка", desc: "Перетащи слова в нужную корзинку", img: "Basket", bg: "#FFF3D1" },
    { id: "memory", name: "Найди пару", desc: "Открой карточки: слово и его картинка", img: "Puzzle piece", bg: "#DDF4E6" },
    { id: "build", name: "Собери слово", desc: "Поставь буквы в правильном порядке", img: "Pencil", bg: "#F1E6FF" },
    { id: "tf", name: "Правда или ложь", desc: "Подходит ли слово к картинке?", img: "Check mark button", bg: "#FFE9D6" }
  ];
  const GBYID = Object.fromEntries(GAMES.map((g) => [g.id, g]));

  const ACHIEVEMENTS = [
    { id: "first", t: "Первое слово", d: "Открой первую карточку", img: "Seedling" },
    { id: "topic", t: "Знаток темы", d: "Выучи целую тему", img: "Graduation cap" },
    { id: "num", t: "Считаю до 10", d: "Выучи все числа", img: "Abacus" },
    { id: "wild", t: "Друг леса", d: "Выучи диких животных", img: "Bear" },
    { id: "games", t: "Игроман", d: "Сыграй во все 6 игр", img: "Joystick" },
    { id: "perfect", t: "Без ошибок", d: "Пройди игру без ошибок", img: "Hundred points" },
    { id: "streak3", t: "3 дня подряд", d: "Занимайся 3 дня подряд", img: "Fire" },
    { id: "words30", t: "30 слов", d: "Выучи 30 слов", img: "Crown" },
    { id: "xp500", t: "500 звёзд", d: "Собери 500 звёзд", img: "Glowing star" }
  ];

  // ---------------------------------------------------------------- storage
  const KEY = "udm-kyl-v1";
  let DB = { users: {}, order: [], current: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) DB = Object.assign(DB, JSON.parse(raw));
  } catch (e) { /* хранилище недоступно — работаем в памяти */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) {} }
  const U = () => DB.users[DB.current];
  const S = () => (U() ? U().settings : { sound: true, voice: true, rate: "norm" });

  function hash(str) {
    let h1 = 0xdeadbeef ^ 7, h2 = 0x41c6ce57 ^ 7;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  const pad = (n) => String(n).padStart(2, "0");
  const dkey = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const today = () => dkey(new Date());
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return dkey(d); };

  function newUser(name, avatar, pw) {
    return {
      id: "u" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
      name, avatar, pw: hash(pw.join("|")), created: today(),
      xp: 0, words: {}, days: {}, games: {}, ach: [], lastTopic: "all",
      settings: { sound: true, voice: true, voiceMode: "udm", rate: "norm", notif: false, notifTime: "18:00", geo: false }, tips: {}, learnView: "map", stopsDone: 0
    };
  }
  function day() {
    const u = U(), k = today();
    if (!u.days[k]) u.days[k] = { a: 0, c: 0, xp: 0, sec: 0, seen: 0 };
    return u.days[k];
  }
  function wrec(id) {
    const u = U();
    if (!u.words[id]) u.words[id] = { s: 0, c: 0, e: 0, k: false };
    return u.words[id];
  }
  const learned = (w) => { const r = U() && U().words[w.id]; return !!r && (r.k || (r.c >= 2 && r.c > r.e)); };
  const learnedCount = (list) => (list || WORDS).filter(learned).length;

  let lastAct = 0, lastSwipe = 0;
  function touch() {
    if (!U()) return;
    const now = Date.now();
    if (lastAct && now - lastAct < 60000) day().sec += Math.round((now - lastAct) / 1000);
    lastAct = now;
  }
  function addXP(n) { U().xp += n; day().xp += n; }
  function recordAnswer(w, ok) {
    const r = wrec(w.id), d = day();
    ok ? r.c++ : r.e++;
    d.a++; if (ok) { d.c++; addXP(10); }
    r.last = Date.now();
    save();
  }
  function markSeen(w) {
    const r = wrec(w.id);
    if (!r.s) { day().seen++; addXP(2); }
    r.s++;
    save();
  }
  function streak() {
    const u = U(); let n = 0;
    for (let i = 0; i < 400; i++) {
      const d = u.days[daysAgo(i)];
      const active = d && (d.a > 0 || d.seen > 0 || d.xp > 0);
      if (active) n++; else if (i > 0) break;
    }
    return n;
  }
  function accuracy(u) {
    let c = 0, a = 0;
    Object.values(u.days).forEach((d) => { a += d.a; c += d.c; });
    return a ? Math.round((c / a) * 100) : 0;
  }
  function hardWords(n) {
    const u = U();
    return WORDS.map((w) => ({ w, r: u.words[w.id] }))
      .filter((x) => x.r && x.r.e > 0 && x.r.e >= x.r.c * 0.5)
      .sort((a, b) => (b.r.e - b.r.c * 0.5) - (a.r.e - a.r.c * 0.5))
      .slice(0, n).map((x) => x.w);
  }

  // ---------------------------------------------------------------- utils
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sample = (a, n) => shuffle(a).slice(0, n);
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const IMG = (n) => IMGS[n] || "";
  const ico = (n, cls) => `<img ${cls ? `class="${cls}"` : ""} src="${IMG(n)}" alt="" draggable="false">`;
  function pic(img, cls) {
    cls = cls || "";
    if (Array.isArray(img)) return `<div class="pic duo ${cls}">${img.map((n) => `<img src="${IMG(n)}" alt="" draggable="false">`).join("")}</div>`;
    if (img.startsWith("c:")) return `<div class="pic ${cls}">${ART.render(img)}</div>`;
    return `<div class="pic ${cls}"><img src="${IMG(img)}" alt="" draggable="false"></div>`;
  }
  const sameImg = (a, b) => JSON.stringify(a.img) === JSON.stringify(b.img);

  // ---------------------------------------------------------------- pronunciation
  const VOW = "аеёиоуыэюяӥӧ";
  const TRMAP = { "ӝ": "дж", "ӟ": "дз", "ӵ": "ч", "ӥ": "и", "ӧ": "о" };
  const STRESS_EXC = { "тау": ["тау"] };
  function syllables(word) {
    if (STRESS_EXC[word]) return STRESS_EXC[word];
    const ch = [...word];
    const vi = ch.map((c, i) => (VOW.includes(c) ? i : -1)).filter((i) => i >= 0);
    if (vi.length <= 1) return [word];
    const out = []; let start = 0;
    for (let k = 0; k < vi.length - 1; k++) {
      const a = vi[k], b = vi[k + 1], units = [];
      for (let j = a + 1; j < b; j++) {
        if ((ch[j] === "ь" || ch[j] === "ъ") && units.length) units[units.length - 1].push(j); else units.push([j]);
      }
      const cut = units.length === 0 ? b : units[units.length - 1][0];
      out.push(ch.slice(start, cut).join("")); start = cut;
    }
    out.push(ch.slice(start).join(""));
    return out;
  }
  const translit = (s) => [...s].map((c) => TRMAP[c] || c).join("");
  function transcription(w) {
    const text = w.u.toLowerCase().replace(/[!?.…]/g, "");
    if (w.t.phrases) return "[" + translit(text) + "]";
    return "[" + text.split(" ").map((word) => word.split("-").map((part) => {
      const sy = syllables(part).map(translit);
      sy[sy.length - 1] = "<em>" + sy[sy.length - 1] + "</em>";
      return sy.join("·");
    }).join("-")).join(" ") + "]";
  }
  function ttsText(w) {
    const text = w.u.toLowerCase().replace(/…/g, "");
    if (w.t.phrases) return translit(text);
    return text.split(" ").map((word) => word.split("-").map((part) => {
      const sy = syllables(part);
      const last = sy.length - 1;
      if (sy.length > 1) {
        const s = [...sy[last]]; const vi = s.findIndex((c) => VOW.includes(c));
        if (vi >= 0) s.splice(vi + 1, 0, "́");
        sy[last] = s.join("");
      }
      return translit(sy.join(""));
    }).join(" ")).join(" ");
  }
  let warnedTTS = false;
  const AUD = window.UDM_AUDIO || {};
  let curAudio = null;
  function playKey(key) {
    const s = S();
    if (!s.voice || s.voiceMode === "device" || !AUD[key]) return false;
    try {
      if (curAudio) curAudio.pause();
      try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch (e) {}
      curAudio = new Audio(AUD[key]);
      curAudio.playbackRate = s.rate === "slow" ? 0.82 : 1;
      try { curAudio.preservesPitch = true; } catch (e) {}
      curAudio.volume = 0.95;
      const p = curAudio.play(); if (p && p.catch) p.catch(() => {});
      return true;
    } catch (e) { return false; }
  }
  function stopVoice() { try { if (curAudio) curAudio.pause(); if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch (e) {} }
  function pickVoice() {
    const voices = speechSynthesis.getVoices().filter((x) => /^ru/i.test(x.lang));
    const rank = (v) => (/natural|neural|online|google|milena|svetlana|dariya|irina|anna/i.test(v.name) ? 2 : 0) + (v.localService ? 1 : 0);
    return voices.sort((a, b) => rank(b) - rank(a))[0];
  }
  function sayLine(k) {
    if (playKey("l:" + k)) return;
    const t = (window.UDM_LINES || {})[k]; if (t) speak(t);
  }
  function speak(w) {
    if (!S().voice) return;
    if (typeof w !== "string" && playKey("w:" + w.u)) return;
    const rate = S().rate === "slow" ? 0.65 : 0.9;
    const text = typeof w === "string" ? w : ttsText(w);
    try {
      if (IS_ANDROID && window.AndroidBridge.speak) { window.AndroidBridge.speak(text, rate); return; }
      if ("speechSynthesis" in window) {
        const voices = speechSynthesis.getVoices();
        const v = pickVoice();
        if (!v && voices.length && !warnedTTS) { warnedTTS = true; toast("Speaking head", "На устройстве нет русского голоса — смотри транскрипцию"); }
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "ru-RU"; u.rate = rate * 0.95; u.pitch = 1.08; if (v) u.voice = v;
        speechSynthesis.cancel(); speechSynthesis.speak(u);
      }
    } catch (e) {}
  }
  if ("speechSynthesis" in window) { try { speechSynthesis.getVoices(); } catch (e) {} }

  // ---------------------------------------------------------------- sound effects
  let actx = null;
  function tone(freqs, dur, type, gap, vol) {
    if (!S().sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      const t0 = actx.currentTime + 0.01;
      freqs.forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type; o.frequency.value = f;
        const st = t0 + i * gap;
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(vol, st + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
        o.connect(g); g.connect(actx.destination);
        o.start(st); o.stop(st + dur + 0.03);
      });
    } catch (e) {}
  }
  const sfx = {
    ok: () => tone([660, 990], 0.2, "sine", 0.09, 0.2),
    bad: () => { tone([260, 200], 0.22, "triangle", 0.12, 0.16); try { if (S().sound && navigator.vibrate) navigator.vibrate(60); } catch (e) {} },
    tap: () => tone([560], 0.06, "sine", 0, 0.08),
    flip: () => tone([420, 620], 0.07, "sine", 0.045, 0.07),
    win: () => tone([523, 659, 784, 1047], 0.3, "sine", 0.11, 0.2)
  };

  // ---------------------------------------------------------------- ui helpers
  const app = document.getElementById("app");
  let NAV = [];
  let G = null; // текущая игра
  const SVG_BACK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>`;
  const SVG_X = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
  const SUN = (c) => ART.sunSignSVG(c);
  const BEAR = (pose, mood, cls) => `<div class="bear ${cls || ""}">${window.UDM_MASCOT.svg(pose, mood)}</div>`;

  function top(o) {
    return `<header class="top">${o.back ? `<button class="icon-btn" data-act="back" aria-label="Назад">${SVG_BACK}</button>` : ""}<h1>${o.title}${o.sub ? `<span class="sub">${o.sub}</span>` : ""}</h1>${o.right || ""}</header>`;
  }
  function tabbar(active) {
    const tabs = [["home", "Главная", "House with garden"], ["learn", "Учить", "Books"], ["games", "Играть", "Video game"], ["profile", "Профиль", U() ? U().avatar : "Fox"], ["settings", "Настройки", "Gear"]];
    return `<nav class="tabbar">${tabs.map(([id, t, im]) => `<button data-act="tab" data-to="${id}" class="${active === id ? "on" : ""}" aria-label="${t}">${ico(im)}${t}</button>`).join("")}</nav>`;
  }
  function show(name, params, opts) {
    params = params || {}; opts = opts || {};
    if (name !== "game") G = null;
    if (opts.root) NAV = [{ name, params }];
    else if (opts.replace) NAV[NAV.length - 1] = { name, params };
    else NAV.push({ name, params });
    draw();
  }
  function draw() {
    const cur = NAV[NAV.length - 1];
    const s = SCREENS[cur.name](cur.params);
    const withHelper = U() && (s.tab || cur.name === "game" || cur.name === "deck");
    app.innerHTML = `<div class="screen ${s.tab ? "with-tabs" : ""} ${s.cls || ""}">${s.html}</div>${s.tab ? tabbar(s.tab) : ""}${withHelper ? helperBtn() : ""}`;
    if (s.mount) s.mount();
    if (U() && ["home", "learn"].includes(cur.name) && showArrival()) return;
    if (U() && cur.name !== "home") autoTip(helpFor());
  }
  function back() {
    if (closeCoach()) { tourStep = -1; return true; }
    if (closeModal()) return true;
    if (NAV.length > 1) { NAV.pop(); G = null; draw(); return true; }
    if (U() && NAV[0].name !== "home") { show("home", {}, { root: true }); return true; }
    return false;
  }
  window.appBack = () => back();

  function toast(img, text) {
    const old = app.querySelector(".toast"); if (old) old.remove();
    const el = document.createElement("div");
    el.className = "toast"; el.innerHTML = `${ico(img)}<span>${text}</span>`;
    app.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }
  function confetti() {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = document.createElement("div"); el.className = "confetti";
    const cols = ["#D7262E", "#1E1A1D", "#FFFFFF", "#FFC23D", "#2F9E62", "#3E8EDE"];
    let s = "";
    for (let i = 0; i < 46; i++) s += `<i style="left:${Math.random() * 100}%;background:${rnd(cols)};animation-duration:${1.6 + Math.random() * 1.6}s;animation-delay:${Math.random() * 0.4}s;transform:rotate(${Math.random() * 360}deg)"></i>`;
    el.innerHTML = s; app.appendChild(el);
    setTimeout(() => el.remove(), 3800);
  }
  function modal(html, onMount) {
    closeModal();
    const bg = document.createElement("div");
    bg.className = "modal-bg";
    bg.innerHTML = `<div class="modal" role="dialog"><button class="modal-x" data-act="close" aria-label="Закрыть">${SVG_X}</button>${html}</div>`;
    bg.addEventListener("click", (e) => { if (e.target === bg) closeModal(); });
    app.appendChild(bg);
    if (onMount) onMount(bg.querySelector(".modal"));
  }
  function closeModal() { const m = app.querySelector(".modal-bg"); if (m) { m.remove(); return true; } return false; }

  function checkAchievements() {
    const u = U(); if (!u) return;
    checkArrival();
    const has = (id) => u.ach.includes(id);
    const unlocked = [];
    const give = (id) => { if (!has(id)) { u.ach.push(id); unlocked.push(id); } };
    if (Object.values(u.words).some((r) => r.s > 0)) give("first");
    if (TOPICS.some((t) => learnedCount(t.words) === t.words.length)) give("topic");
    if (learnedCount(TBYID.num.words) === TBYID.num.words.length) give("num");
    if (learnedCount(TBYID.wild.words) === TBYID.wild.words.length) give("wild");
    if (GAMES.every((g) => u.games[g.id] && u.games[g.id].n > 0)) give("games");
    if (Object.values(u.games).some((g) => g.perfect)) give("perfect");
    if (streak() >= 3) give("streak3");
    if (learnedCount() >= 30) give("words30");
    if (u.xp >= 500) give("xp500");
    if (unlocked.length) {
      save();
      const a = ACHIEVEMENTS.find((x) => x.id === unlocked[0]);
      setTimeout(() => { toast(a.img, "Новая награда: " + a.t); confetti(); sfx.win(); }, 400);
    }
  }

  function wordOfDay() {
    const pool = WORDS.filter((w) => !w.t.phrases && !w.t.bonus);
    const d = new Date(); const n = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    return pool[(n * 7) % pool.length];
  }

  // ---------------------------------------------------------------- geolocation
  let GEO = null; // {km, inside}
  function haversine(a, b) {
    const R = 6371, toR = (x) => (x * Math.PI) / 180;
    const dLat = toR(b[0] - a[0]), dLon = toR(b[1] - a[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[0])) * Math.cos(toR(b[0])) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function requestGeo(cb) {
    if (!navigator.geolocation) { cb && cb(false); return; }
    try {
      navigator.geolocation.getCurrentPosition((p) => {
        const here = [p.coords.latitude, p.coords.longitude];
        const inside = here[0] > 56 && here[0] < 58.6 && here[1] > 51.1 && here[1] < 54.5;
        GEO = { km: Math.round(haversine(here, IZHEVSK)), inside };
        cb && cb(true);
      }, () => cb && cb(false), { timeout: 8000, maximumAge: 3600000 });
    } catch (e) { cb && cb(false); }
  }
  function geoChip() {
    if (!U() || !S().geo || !GEO) return "";
    return GEO.inside
      ? `<div class="geo-chip">${ico("Round pushpin")}<span>Ты в Удмуртии! До Ижкара (Ижевска) — ${GEO.km} км</span></div>`
      : `<div class="geo-chip">${ico("World map")}<span>До Ижкара (Ижевска) ${GEO.km} км. Удмуртия ждёт в гости!</span></div>`;
  }

  // ---------------------------------------------------------------- notifications
  function setReminder(on, cb) {
    const s = S();
    const [h, m] = s.notifTime.split(":").map(Number);
    if (IS_ANDROID && window.AndroidBridge.scheduleReminder) {
      try {
        const r = on ? window.AndroidBridge.scheduleReminder(h, m) : window.AndroidBridge.cancelReminder();
        cb(r !== "denied"); return;
      } catch (e) { cb(false); return; }
    }
    if (!on) { cb(true); return; }
    if ("Notification" in window && Notification.requestPermission) {
      try {
        const p = Notification.requestPermission();
        if (p && p.then) p.then((res) => cb(res === "granted")).catch(() => cb(false)); else cb(false);
      } catch (e) { cb(false); }
    } else cb(false);
  }

  // ---------------------------------------------------------------- journey
  const STOPS = window.UDM_JOURNEY;
  const SBYID = Object.fromEntries(STOPS.map((x) => [x.id, x]));
  const stopDone = (st) => { const t = TBYID[st.topic]; return learnedCount(t.words) / t.words.length >= 0.7; };
  function journeyState() {
    const doneFlags = STOPS.map(stopDone);
    let ci = doneFlags.findIndex((d) => !d); if (ci < 0) ci = STOPS.length - 1;
    // пройдено подряд с начала пути
    let streakDone = 0; while (streakDone < STOPS.length && doneFlags[streakDone]) streakDone++;
    return { flags: doneFlags, done: doneFlags.filter(Boolean).length, ci, cur: STOPS[ci], next: STOPS[Math.min(ci + 1, STOPS.length - 1)], streakDone };
  }
  const pw = (v, pts) => { for (let i = 0; i < pts.length - 1; i++) { const [a0, b0] = pts[i], [a1, b1] = pts[i + 1]; if ((v >= a0 && v <= a1) || (v <= a0 && v >= a1) || i === pts.length - 2) return b0 + ((v - a0) / (a1 - a0)) * (b1 - b0); } return 0; };
  // схематичная карта: юг и восток растянуты, чтобы города не налезали друг на друга
  const PROJ = (lat, lon) => [pw(lon, [[51.1, 14], [52.8, 110], [54.5, 346]]), pw(lat, [[58.7, 20], [57.35, 250], [55.9, 640]])];
  function smoothPath(pts, closed) {
    const n = pts.length; if (n < 2) return "";
    const P = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
    let d = `M${P(0)[0].toFixed(1)} ${P(0)[1].toFixed(1)}`;
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d + (closed ? "Z" : "");
  }
  function picSVG(img, x, y, size) {
    if (Array.isArray(img)) img = img[0];
    if (img.startsWith("c:")) return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 100 100">${ART.render(img).replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</svg>`;
    return `<image href="${IMG(img)}" x="${x}" y="${y}" width="${size}" height="${size}"/>`;
  }
  function journeyMap(j) {
    const outline = smoothPath(window.UDM_OUTLINE.map(([a, b]) => PROJ(a, b)), true);
    const kama = smoothPath([[57.45, 54.38], [57.2, 54.22], [56.95, 54.06], [56.72, 53.93], [56.47, 53.87], [56.3, 54.02], [56.18, 54.32], [56.1, 54.6]].map(([a, b]) => PROJ(a, b)), false);
    const cheptsa = smoothPath([[58.35, 53.75], [58.2, 53.3], [58.1, 52.95], [58.14, 52.66], [58.25, 52.3], [58.35, 51.9]].map(([a, b]) => PROJ(a, b)), false);
    const izh = smoothPath([[57.05, 53.25], [56.86, 53.25], [56.6, 53.45], [56.4, 53.62], [56.2, 53.8], [56.13, 54.05]].map(([a, b]) => PROJ(a, b)), false);
    const pts = STOPS.map((st) => [st.x, st.y]);
    const route = smoothPath(pts, false);
    const doneRoute = j.streakDone > 0 ? smoothPath(pts.slice(0, Math.min(j.streakDone + 1, pts.length)), false) : "";
    const trees = [[57.75, 52.0], [57.2, 51.7], [58.4, 53.3], [56.95, 52.3], [57.55, 53.9], [56.15, 53.0], [57.15, 53.4], [56.6, 52.6], [57.9, 52.5], [56.3, 52.2]];
    const izhP = PROJ(56.86, 53.27);
    let s = `<svg class="jmap" viewBox="0 0 360 656" role="img" aria-label="Карта путешествия по Удмуртии">
      <defs><pattern id="orn-land" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M11 6l5 5-5 5-5-5z" fill="#CFE5BC"/></pattern></defs>
      <path d="${outline}" fill="#E6F2D9" stroke="#FFFFFF" stroke-width="10" stroke-linejoin="round"/>
      <path d="${outline}" fill="url(#orn-land)" opacity=".7"/>
      <path d="${outline}" fill="none" stroke="#D7262E" stroke-width="2" stroke-dasharray="6 5" stroke-linejoin="round"/>
      <path d="${kama}" fill="none" stroke="#8CC4EE" stroke-width="9" stroke-linecap="round"/>
      <path d="${cheptsa}" fill="none" stroke="#9FCFF2" stroke-width="5" stroke-linecap="round"/>
      <path d="${izh}" fill="none" stroke="#9FCFF2" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="${izhP[0] + 30}" cy="${izhP[1] - 22}" rx="9" ry="15" fill="#9FCFF2" transform="rotate(-20 ${izhP[0] + 30} ${izhP[1] - 22})"/>
      <text x="${PROJ(56.62, 54.2)[0]}" y="${PROJ(56.62, 54.2)[1]}" class="river" transform="rotate(70 ${PROJ(56.62, 54.2)[0]} ${PROJ(56.62, 54.2)[1]})">Кам</text>
      <text x="${PROJ(58.27, 52.2)[0]}" y="${PROJ(58.27, 52.2)[1]}" class="river">Чепца</text>
      ${trees.map(([a, b]) => { const [x, y] = PROJ(a, b); return `<image href="${IMG("Evergreen tree")}" x="${x - 11}" y="${y - 13}" width="22" height="22" opacity=".85"/>`; }).join("")}
      <path d="${route}" fill="none" stroke="#B9AC9C" stroke-width="4" stroke-dasharray="2 9" stroke-linecap="round"/>
      ${doneRoute ? `<path d="${doneRoute}" fill="none" stroke="#D7262E" stroke-width="5" stroke-linecap="round"/>` : ""}`;
    STOPS.forEach((st, i) => {
      const [x, y] = pts[i], t = TBYID[st.topic], done = j.flags[i], cur = i === j.ci;
      const below = st.lab !== "t";
      const lx = x, anchor = "middle";
      const ly = below ? y + 38 : (st.ru !== st.udm ? y - 42 : y - 30);
      s += `<g class="stop ${done ? "done" : ""} ${cur ? "cur-stop" : ""}" data-act="stop" data-id="${st.id}" role="button" tabindex="0" aria-label="${esc(st.udm)}">
        <circle cx="${x}" cy="${y + 2}" r="23" fill="#3A1D10" opacity=".12"/>
        <circle cx="${x}" cy="${y}" r="22" fill="#FFFFFF" stroke="${done ? "#2F9E62" : cur ? "#D7262E" : t.color}" stroke-width="${cur ? 5 : 4}"/>
        ${picSVG(t.img, x - 14, y - 14, 28)}
        <circle cx="${x - 17}" cy="${y - 17}" r="9" fill="${done ? "#2F9E62" : "#1E1A1D"}"/>
        <text x="${x - 17}" y="${y - 13.5}" text-anchor="middle" class="num">${done ? "✓" : i + 1}</text>
        <text x="${lx}" y="${ly}" text-anchor="${anchor}" class="cname">${esc(st.udm)}</text>
        ${st.ru !== st.udm ? `<text x="${lx}" y="${ly + 12}" text-anchor="${anchor}" class="cru">${esc(st.ru)}</text>` : ""}
      </g>`;
    });
    const [bx, by] = pts[j.ci];
    s += `<g class="map-bear" transform="translate(${bx + 6} ${by - 78})"><g class="bob"><svg width="52" height="58" viewBox="0 0 200 222">${window.UDM_MASCOT.svg("wave", "happy").replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</svg></g></g>`;
    return s + `</svg>`;
  }
  function journeyCard() {
    const j = journeyState();
    return `<button class="journey" data-act="tab" data-to="learn">
      <div class="j-top">${BEAR("point", "happy", "j-bear")}<div class="grow"><span class="lbl">Путешествие по Удмуртии</span><b>Мы в: ${esc(j.cur.udm)}</b><small>${j.done >= STOPS.length ? "Ты прошёл всю Удмуртию!" : `Учим «${esc(TBYID[j.cur.topic].ru)}» · дальше ${esc(j.next.udm)}`}</small></div></div>
      <div class="j-dots">${STOPS.map((st, i) => `<i class="${j.flags[i] ? "on" : ""} ${i === j.ci ? "cur" : ""}"></i>`).join("")}</div>
    </button>`;
  }
  function stopModal(id) {
    const st = SBYID[id], t = TBYID[st.topic], n = learnedCount(t.words), done = stopDone(st);
    modal(`<div class="stop-modal">
      <div class="row">${BEAR("point", "happy", "sm-bear")}<div class="grow"><span class="lbl">Остановка ${STOPS.indexOf(st) + 1} из ${STOPS.length}</span><h2>${esc(st.udm)}</h2>${st.ru !== st.udm ? `<div class="muted" style="font-weight:800">${esc(st.ru)}</div>` : ""}</div></div>
      <div class="bubble">${esc(st.fact)} <button class="say" data-act="say-key" data-key="c:${st.id}">${ico("Speaker high volume")}</button></div>
      <div class="list-btn" style="box-shadow:none;background:var(--linen-2)">${pic(t.img)}<div class="grow"><b>Тема: ${esc(t.ru)}</b><div class="muted" style="font-size:13px">Выучено ${n} из ${t.words.length}${done ? " · остановка пройдена" : ""}</div></div></div>
      <div class="row2"><button class="btn green" data-act="deck" data-t="${t.id}">${ico("Books")}Учить</button><button class="btn sun" data-act="play-topic" data-t="${t.id}">${ico("Video game")}Играть</button></div>
    </div>`);
    playKey("c:" + st.id);
  }
  function checkArrival() {
    const u = U(); if (!u) return;
    const j = journeyState();
    if (u.stopsDone == null) { u.stopsDone = j.done; return; }
    if (j.done > u.stopsDone) { u.arrive = j.ci; u.stopsDone = j.done; save(); }
  }
  function showArrival() {
    const u = U(); if (!u || u.arrive == null) return false;
    const st = STOPS[u.arrive]; delete u.arrive; save();
    const all = journeyState().done >= STOPS.length;
    setTimeout(() => {
      confetti(); sfx.win();
      modal(`<div class="result" style="padding-top:0">${BEAR("cheer", "joy", "big")}
        <h2>${all ? "Ты прошёл всю Удмуртию!" : "Ура! Едем дальше!"}</h2>
        <div class="score">${all ? "Все 12 остановок пройдены. Ты настоящий знаток!" : `Следующая остановка — ${esc(st.udm)}${/^[А-ЯЁ]/.test(st.ru) ? " (" + esc(st.ru) + ")" : ""}`}</div>
        <div class="bubble" style="text-align:left">${esc(st.fact)}</div>
        <div class="actions"><button class="btn block" data-act="open-map">${ico("World map")}Открыть карту</button></div></div>`);
      sayLine("arrive"); setTimeout(() => { if (app.querySelector(".modal")) playKey("c:" + st.id); }, 1400);
    }, 500);
    return true;
  }

  // ---------------------------------------------------------------- guide (медвежонок-помощник)
  const TOUR = [
    { k: "hello", sel: null, pose: "wave" },
    { k: "tour_journey", sel: ".journey", pose: "point" },
    { k: "tour_wod", sel: ".wod", pose: "point" },
    { k: "tour_learn", sel: '.tabbar [data-to="learn"]', pose: "point" },
    { k: "tour_games", sel: '.tabbar [data-to="games"]', pose: "point" },
    { k: "tour_profile", sel: '.tabbar [data-to="profile"]', pose: "point" },
    { k: "tour_settings", sel: '.tabbar [data-to="settings"]', pose: "point" },
    { k: "tour_help", sel: ".helper", pose: "cheer" }
  ];
  let tourStep = -1;
  function closeCoach() { const c = app.querySelector(".coach"); if (c) { c.remove(); return true; } return false; }
  function coach(o) {
    closeCoach();
    const text = (window.UDM_LINES || {})[o.k] || o.text || "";
    const el = document.createElement("div");
    el.className = "coach";
    let spot = "", above = false;
    if (o.sel) {
      const t = app.querySelector(o.sel);
      if (t) {
        const sc = t.closest(".scroll");
        if (sc) { const r0 = t.getBoundingClientRect(), s0 = sc.getBoundingClientRect(); if (r0.top < s0.top || r0.bottom > s0.bottom) sc.scrollTop += r0.top - s0.top - 80; }
        const r = t.getBoundingClientRect(), a = app.getBoundingClientRect();
        const pad = 6;
        spot = `<div class="spot" style="left:${r.left - a.left - pad}px;top:${r.top - a.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px"></div>`;
        above = r.top - a.top > a.height * 0.55;
      }
    }
    const step = o.step != null ? `<span class="c-step">${o.step + 1} / ${o.total}</span>` : "";
    el.innerHTML = `${spot || `<div class="dim"></div>`}
      <div class="c-box ${above ? "c-top" : ""}">
        ${BEAR(o.pose || "wave", o.mood || "happy", "c-bear")}
        <div class="c-bubble">${step}<p>${esc(text)}</p>
          <div class="c-actions">
            <button class="say" data-act="coach-say" data-k="${o.k}">${ico("Speaker high volume")}Ещё раз</button>
            ${o.step != null ? `${o.step > 0 ? "" : `<button class="link" data-act="tour-skip">Пропустить</button>`}<button class="btn green" data-act="tour-next">${o.step + 1 < o.total ? "Дальше" : "Понятно!"}</button>`
              : `${o.tour ? `<button class="link" data-act="tour-start">Экскурсия</button>` : ""}<button class="btn green" data-act="coach-close">Понятно!</button>`}
          </div></div></div>`;
    app.appendChild(el);
    sayLine(o.k);
  }
  function startTour() {
    if (NAV[NAV.length - 1].name !== "home") show("home", {}, { root: true });
    tourStep = 0; tourShow();
  }
  function tourShow() { const st = TOUR[tourStep]; coach({ k: st.k, sel: st.sel, pose: st.pose, step: tourStep, total: TOUR.length }); }
  function helpFor() {
    const cur = NAV[NAV.length - 1]; if (!cur) return null;
    if (cur.name === "game") return "help_" + cur.params.g;
    return { home: "help_home", learn: (U() && U().learnView === "list") ? "help_topics" : "help_learn", deck: "help_deck", games: "help_games", profile: "help_profile", settings: "help_settings" }[cur.name] || "help_home";
  }
  function autoTip(key) {
    const u = U(); if (!u || !key || tourStep >= 0) return;
    u.tips = u.tips || {};
    if (u.tips[key]) return;
    u.tips[key] = 1; save();
    setTimeout(() => { if (!app.querySelector(".modal-bg") && !app.querySelector(".coach")) coach({ k: key, pose: "point" }); }, 650);
  }
  const helperBtn = () => `<button class="helper" data-act="helper" aria-label="Подсказка медвежонка">${window.UDM_MASCOT.svg("wave", "happy")}<span>?</span></button>`;

  // ---------------------------------------------------------------- SCREENS
  const SCREENS = {};

  // ---- Welcome
  SCREENS.welcome = () => ({
    cls: "auth",
    html: `<main class="scroll">
      <div class="hero">
        ${BEAR("wave", "happy", "mascot")}
        <h1>Ӟеч-а бур-а,<br>удмурт кыл?</h1>
        <p>Здравствуй, удмуртский язык! Учим слова, играем и собираем звёзды.</p>
      </div>
      <div class="orn-line"></div>
      <div class="panel">
        <div class="mascot-tip">${BEAR("idle", "happy", "tip")}<div class="bubble">Ӟечбуресь! Я медвежонок <b>Гондырпи</b>. Это по-удмуртски и значит «медвежонок». Я первоклассник и помогу тебе!</div></div>
        <button class="btn block" data-act="go" data-to="register">${ico("Sparkles")}Начать учиться</button>
        ${DB.order.length ? `<button class="btn ghost block" data-act="go" data-to="login">У меня уже есть профиль</button>` : ""}
      </div>
    </main>`
  });

  // ---- Login
  SCREENS.login = () => ({
    cls: "auth",
    html: `<main class="scroll">
      <div class="hero">${BEAR("wave", "happy", "mascot small")}<h1>Кто занимается?</h1><p>Выбери свой профиль</p></div>
      <div class="orn-line"></div>
      <div class="panel">
        <div class="profiles">
          ${DB.order.map((id) => { const u = DB.users[id]; return u ? `<button class="profile-tile" data-act="pick-user" data-id="${id}">${ico(u.avatar)}<span>${esc(u.name)}</span></button>` : ""; }).join("")}
          <button class="profile-tile add" data-act="go" data-to="register"><b>+</b><span>Новый</span></button>
        </div>
        <p class="note">На одном планшете могут заниматься несколько детей — у каждого свой прогресс.</p>
      </div>
    </main>`
  });

  // ---- Picture password (login)
  SCREENS.pin = (p) => {
    const u = DB.users[p.id];
    const st = { seq: [] };
    return {
      cls: "auth",
      html: `${top({ title: esc(u.name), sub: "Введи свой секрет из картинок", back: true })}
      <main class="scroll">
        <div class="panel" id="pinPanel">
          <div class="row" style="justify-content:center">${ico(u.avatar)}</div>
          <div class="pw-slots" id="slots">${[0, 1, 2].map(() => `<div class="pw-slot"></div>`).join("")}</div>
          <div class="pw-grid">${PW_ITEMS.map((n, i) => `<button data-act="pin-tap" data-i="${i}" aria-label="картинка ${i + 1}">${ico(n)}</button>`).join("")}</div>
          <button class="link" data-act="forgot" data-id="${u.id}" style="align-self:center">Забыл секрет?</button>
        </div>
      </main>`,
      mount() { app._pin = { st, u }; }
    };
  };

  // ---- Register (3 шага)
  SCREENS.register = (p) => {
    const st = p.st || { step: 1, name: "", avatar: "Fox", seq: [], resetFor: p.resetFor || null };
    p.st = st;
    let body = "";
    if (st.step === 1) {
      body = `<div class="panel">
        <h2>Как тебя зовут?</h2>
        <label class="field" for="nm">Имя<input id="nm" maxlength="16" autocomplete="off" placeholder="Например, Аня" value="${esc(st.name)}"></label>
        <h2>Выбери друга-аватара</h2>
        <div class="avatars">${AVATARS.map((a) => `<button data-act="ava" data-a="${a}" class="${st.avatar === a ? "on" : ""}" aria-label="${a}">${ico(a)}</button>`).join("")}</div>
        <button class="btn block" data-act="reg-next">Дальше</button>
      </div>`;
    } else {
      body = `<div class="panel">
        <h2>${st.resetFor ? "Новый секрет" : "Придумай секрет"}</h2>
        <p class="muted" style="margin:0;font-weight:700">Нажми на три картинки по порядку. Это твой пароль — запомни его!</p>
        <div class="pw-slots" id="slots">${[0, 1, 2].map((i) => `<div class="pw-slot ${st.seq[i] != null ? "full" : ""}">${st.seq[i] != null ? ico(PW_ITEMS[st.seq[i]]) : ""}</div>`).join("")}</div>
        <div class="pw-grid">${PW_ITEMS.map((n, i) => `<button data-act="reg-pw" data-i="${i}">${ico(n)}</button>`).join("")}</div>
        <div class="row2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <button class="btn ghost" data-act="reg-clear">Заново</button>
          <button class="btn green" data-act="reg-done" ${st.seq.length < 3 ? "disabled" : ""}>Готово</button>
        </div>
      </div>`;
    }
    return {
      cls: "auth",
      html: `${top({ title: st.resetFor ? "Новый секрет" : "Новый профиль", sub: st.resetFor ? "" : "Шаг " + st.step + " из 2", back: true })}<main class="scroll">${body}</main>`,
      mount() { const nm = document.getElementById("nm"); if (nm) nm.addEventListener("input", () => (st.name = nm.value)); }
    };
  };

  // ---- Home
  SCREENS.home = () => {
    const u = U(), w = wordOfDay(), d = day(), st = streak();
    const pct = Math.min(1, d.xp / DAILY_GOAL);
    const C = 2 * Math.PI * 26;
    const hour = new Date().getHours();
    const greet = hour < 11 ? "Бур ӵукна" : "Ӟечбуресь";
    const nextTopic = TOPICS.find((t) => learnedCount(t.words) < t.words.length) || TOPICS[0];
    const tips = [
      `«${esc(w.u)}» — это <b>${esc(w.r)}</b>. Скажи вслух!`,
      `Сегодня собрано <b>${d.xp}</b> из ${DAILY_GOAL} звёзд. Вперёд!`,
      `Попробуй игру <b>«${rnd(GAMES).name}»</b>!`,
      `«Тау» значит <b>спасибо</b>. Тау, что учишь удмуртский!`,
      `Нажми на меня, если нужна подсказка!`
    ];
    const week = [6, 5, 4, 3, 2, 1, 0].map((i) => { const x = u.days[daysAgo(i)]; return `<i class="${x && (x.a || x.seen) ? "on" : ""} ${i === 0 ? "today" : ""}"></i>`; }).join("");
    return {
      tab: "home",
      html: `<header class="top"><div class="hello grow"><img class="ava" src="${IMG(u.avatar)}" alt=""><h1>${greet},<br>${esc(u.name)}!</h1></div>
        <div class="stat-chips"><span class="chip" title="Дней подряд">${ico("Fire")}${st}</span><span class="chip" title="Звёзды">${ico("Glowing star")}${u.xp}</span></div></header>
      <main class="scroll">
        <div class="mascot-tip" data-act="helper">${BEAR("wave", "happy", "tip")}<div class="bubble">${rnd(tips)}</div></div>
        ${journeyCard()}
        <div class="wod" data-act="wod" role="button" tabindex="0">
          <span class="lbl">Слово дня</span>
          <span class="w">${esc(w.u)}</span>
          <span class="t">${esc(w.r)}</span>
          ${pic(w.img)}
          <span class="say" data-act="say" data-id="${w.id}">${ico("Speaker high volume")}Слушать</span>
        </div>
        ${geoChip()}
        <div class="section-title">Главное меню</div>
        <div class="menu-grid">
          <button class="menu-tile t-learn" data-act="tab" data-to="learn"><div><b>Обучение</b><small>Карточки слов</small></div>${ico("Books")}</button>
          <button class="menu-tile t-games" data-act="tab" data-to="games"><div><b>Игры</b><small>6 игр со словами</small></div>${ico("Video game")}</button>
          <button class="menu-tile t-profile" data-act="tab" data-to="profile"><div><b>Профиль</b><small>Мои успехи</small></div>${ico(u.avatar)}</button>
          <button class="menu-tile t-settings" data-act="tab" data-to="settings"><div><b>Настройки</b><small>Звук и другое</small></div>${ico("Gear")}</button>
        </div>
        <div class="card goal">
          <div class="ring"><svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="26" fill="none" stroke="#F3EADD" stroke-width="7"/><circle cx="30" cy="30" r="26" fill="none" stroke="#FFC23D" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/></svg><span>${Math.round(pct * 100)}%</span></div>
          <div class="grow"><b>Цель на сегодня</b><div class="muted" style="font-weight:700;font-size:14px">${d.xp} из ${DAILY_GOAL} звёзд · ${st} ${plural(st, "день", "дня", "дней")} подряд</div><div class="week">${week}</div></div>
        </div>
        <button class="list-btn" data-act="deck" data-t="${nextTopic.id}">${pic(nextTopic.img)}<div class="grow"><b>Продолжить: ${esc(nextTopic.ru)}</b><div class="muted" style="font-size:13px">Изучено ${learnedCount(nextTopic.words)} из ${nextTopic.words.length}</div></div><span class="chev">›</span></button>
      </main>`
    };
  };

  function plural(n, a, b, c) { const m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return a; if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return b; return c; }

  // ---- Learn: topics
  SCREENS.learn = () => {
    const u = U(), view = u.learnView || "map";
    const j = journeyState();
    const topics = `<div class="section-title">Темы <small>${learnedCount()} из ${WORDS.length} слов изучено</small></div>
      <div class="topics">${TOPICS.map((t) => {
        const n = learnedCount(t.words), all = t.words.length;
        return `<button class="topic" style="--tc:${t.color}" data-act="deck" data-t="${t.id}">
          ${t.bonus ? `<span class="badge">НОВОЕ</span>` : n === all ? `<span class="badge">ГОТОВО</span>` : ""}
          ${pic(t.img)}<b>${esc(t.ru)}</b><span class="udm">${esc(t.udm)}</span>
          <span class="cnt">${n} / ${all}</span><span class="bar"><i style="width:${(n / all) * 100}%"></i></span></button>`;
      }).join("")}</div>
      <div class="section-title">Особые удмуртские буквы</div>
      <div class="letters">${window.UDM_LETTERS.map((l) => `<button class="letter" data-act="say-text" data-key="${esc(l.e.split(" — ")[0])}" data-text="${esc(translit(l.e.split(" — ")[0]))}"><b>${l.l.split(" ")[0]}</b><span>${l.s}</span></button>`).join("")}</div>
      <p class="note">Нажми на букву, чтобы услышать пример: ${window.UDM_LETTERS.map((l) => l.e).join(", ")}.</p>`;
    const map = `<div class="map-head"><div><b>Путешествие по Удмуртии</b><small>Пройдено ${j.done} из ${STOPS.length} остановок</small></div><span class="chip map-chip">${ico("Round pushpin")}${esc(j.cur.udm)}</span></div>
      <div class="map-card">${journeyMap(j)}</div>
      <p class="note">Нажми на город: медвежонок расскажет о нём, и вы выучите его слова. Остановка пройдена, когда выучено 70% слов темы.</p>`;
    return {
      tab: "learn",
      help: view === "map" ? "help_learn" : "help_topics",
      html: `${top({ title: "Обучение", sub: "Дышетскон · путешествие и карточки" })}
      <main class="scroll">
        <div class="seg big-seg"><button class="${view === "map" ? "on" : ""}" data-act="lview" data-v="map">${ico("World map")}Карта</button><button class="${view !== "map" ? "on" : ""}" data-act="lview" data-v="list">${ico("Books")}Все темы</button></div>
        ${view === "map" ? map : topics}
      </main>`,
      mount() { const c = app.querySelector(".cur-stop"); if (c && view === "map") { const sc = app.querySelector(".scroll"); const r = c.getBoundingClientRect(), sr = sc.getBoundingClientRect(); if (r.top > sr.bottom - 120) sc.scrollTop += r.top - sr.top - sr.height / 2; } }
    };
  };

  // ---- Deck (карточки)
  SCREENS.deck = (p) => {
    const t = TBYID[p.t];
    if (p.i == null) {
      // начать с первого невыученного слова
      const f = t.words.findIndex((w) => !learned(w));
      p.i = f >= 0 ? f : 0;
    }
    const w = t.words[p.i];
    const kn = learned(w);
    return {
      cls: "deck",
      html: `${top({ title: esc(t.ru), sub: esc(t.udm), back: true })}
      <main class="scroll" style="--tc:${t.color}">
        <div class="deck-top"><div class="dots"><i style="width:${((p.i + 1) / t.words.length) * 100}%"></i></div><b>${p.i + 1}/${t.words.length}</b></div>
        <div class="flash-wrap"><div class="flash" id="flash" data-act="flip" role="button" aria-label="Перевернуть карточку">
          <div class="face front ${t.phrases ? "phrase" : ""}">
            ${pic(w.img)}
            <div class="udm-word">${esc(w.u)}</div>
            <div class="tr">${transcription(w)}</div>
            <span class="say big" data-act="say" data-id="${w.id}">${ico("Speaker high volume")}Слушать</span>
            <span class="hint-tap">Нажми на карточку — узнаешь перевод</span>
          </div>
          <div class="face back">
            <div class="ru">${esc(w.r)}</div>
            <div class="udm-small">${esc(w.u)}${w.alt ? ` (${esc(w.alt)})` : ""}</div>
            <div class="tr">${transcription(w)}</div>
            ${kn ? `<span class="say" style="background:#fff">${ico("Check mark button")}Уже знаю</span>` : ""}
            <span class="hint-tap">Нажми ещё раз, чтобы вернуться</span>
          </div>
        </div></div>
        <div class="deck-actions">
          <button class="btn ghost" data-act="deck-next" data-k="0">${ico("Repeat button")}Ещё учу</button>
          <button class="btn green" data-act="deck-next" data-k="1">${ico("Check mark button")}Знаю!</button>
        </div>
        <div class="row" style="justify-content:space-between">
          <button class="link" data-act="deck-prev" ${p.i === 0 ? 'style="visibility:hidden"' : ""}>‹ Назад</button>
          <button class="link" data-act="deck-skip">Дальше ›</button>
        </div>
      </main>`,
      mount() {
        markSeen(w); checkAchievements();
        setTimeout(() => speak(w), 250);
        // свайпы
        const el = document.getElementById("flash"); let x0 = null;
        el.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
        el.addEventListener("touchend", (e) => {
          if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null;
          if (Math.abs(dx) > 60) { lastSwipe = Date.now(); dx < 0 ? deckMove(1) : deckMove(-1); }
        });
      }
    };
  };
  function deckMove(delta, known) {
    const cur = NAV[NAV.length - 1], p = cur.params, t = TBYID[p.t];
    if (known != null) { const r = wrec(t.words[p.i].id); r.k = !!known; if (known) addXP(3); save(); checkAchievements(); }
    const ni = p.i + delta;
    if (ni < 0) return;
    if (ni >= t.words.length) { deckDone(t); return; }
    p.i = ni; sfx.flip(); draw();
  }
  function deckDone(t) {
    sfx.win(); confetti();
    const n = learnedCount(t.words);
    modal(`<div class="result">
      ${BEAR("cheer", "joy", "big")}
      <h2>Тема пройдена!</h2>
      <div class="score">«${esc(t.ru)}»: изучено ${n} из ${t.words.length}</div>
      <div class="actions">
        <button class="btn block green" data-act="play-topic" data-t="${t.id}">${ico("Video game")}Играть с этими словами</button>
        <button class="btn block ghost" data-act="deck-again" data-t="${t.id}">Повторить карточки</button>
        <button class="btn block ghost" data-act="close-to" data-to="learn">К темам</button>
      </div></div>`);
  }

  // ---- Games list
  SCREENS.games = () => {
    const u = U();
    const sel = u.lastTopic || "all";
    const hard = hardWords(12);
    const pills = [["all", "Все темы", null]].concat(hard.length >= 4 ? [["hard", "Трудные слова", "Brain"]] : []).concat(TOPICS.map((t) => [t.id, t.ru, t.img]));
    return {
      tab: "games",
      html: `${top({ title: "Игры", sub: "Шудонъёс · закрепляем слова" })}
      <main class="scroll">
        <div class="section-title">Слова для игры</div>
        <div class="pick-topics">${pills.map(([id, t, im]) => `<button class="pill ${sel === id ? "on" : ""}" data-act="sel-topic" data-t="${id}">${im ? pic(im) : ""}${esc(t)}</button>`).join("")}</div>
        <div class="section-title">Выбери игру</div>
        <div class="games">${GAMES.map((g) => {
          const best = (u.games[g.id] && u.games[g.id].best) || 0;
          return `<button class="game-row" data-act="start-game" data-g="${g.id}"><span class="gi" style="background:${g.bg}">${ico(g.img)}</span>
            <span class="grow"><b>${g.name}</b><small>${g.desc}</small><span class="best">${[1, 2, 3].map((i) => `<img class="${best >= i ? "" : "off"}" src="${IMG("Star")}" alt="">`).join("")}</span></span><span class="chev" style="color:var(--muted);font-size:24px">›</span></button>`;
        }).join("")}</div>
      </main>`
    };
  };

  function poolFor(sel) {
    if (sel === "hard") { const h = hardWords(12); return h.length >= 4 ? h : WORDS.slice(); }
    if (sel && TBYID[sel]) return TBYID[sel].words.slice();
    return WORDS.slice();
  }
  function topicLabel(sel) { return sel === "hard" ? "Трудные слова" : TBYID[sel] ? TBYID[sel].ru : "Все темы"; }

  // ---- Game screen
  SCREENS.game = (p) => {
    const g = GBYID[p.g];
    if (!G || G.id !== p.g || G.key !== p.key) G = GAME_INIT[p.g](p.topic || "all", p.key);
    return {
      cls: "game",
      html: `${top({ title: g.name, sub: topicLabel(G.topic), back: true, right: `<span class="chip">${ico("Glowing star")}<span id="gscore">${G.score}</span></span>` })}
      <main class="scroll" id="gbody"></main>`,
      mount() { renderGame(); }
    };
  };
  function startGame(gid, topic) {
    U().lastTopic = topic; save();
    show("game", { g: gid, topic, key: Date.now() });
  }
  function renderGame() {
    const body = document.getElementById("gbody");
    if (!body || !G) return;
    const fb = app.querySelector(".feedback"); if (fb) fb.remove();
    body.innerHTML = G.done ? resultHTML() : GAME_VIEW[G.id]();
    const sc = document.getElementById("gscore"); if (sc) sc.textContent = G.score;
    if (!G.done && GAME_MOUNT[G.id]) GAME_MOUNT[G.id](body);
    body.scrollTop = 0;
  }
  function progressBar() {
    return `<div class="deck-top"><div class="dots"><i style="width:${(G.round / G.total) * 100}%"></i></div><b>${Math.min(G.round + 1, G.total)}/${G.total}</b></div>`;
  }
  function feedback(ok, w, extra) {
    const el = document.createElement("div");
    el.className = "feedback " + (ok ? "ok" : "bad");
    el.innerHTML = ok
      ? `${BEAR("cheer", "joy", "fb")}<div class="grow">${rnd(["Молодец!", "Верно!", "Умничка!", "Так держать!"])}<small>${w ? esc(w.u) + " — " + esc(w.r) : ""}</small></div>`
      : `${BEAR("think", "sad", "fb")}<div class="grow">${extra || "Почти! Запомни:"}<small>${w ? esc(w.u) + " — " + esc(w.r) : ""}</small></div><button class="btn sun" data-act="g-next" style="min-height:44px;padding:0 16px">Дальше</button>`;
    app.appendChild(el);
  }
  function answer(ok, w, extra) {
    if (G.locked) return;
    G.locked = true;
    if (w) recordAnswer(w, ok);
    if (ok) { G.score += 10; G.right++; sfx.ok(); } else { G.wrong++; sfx.bad(); if (w && !G.mistakes.includes(w)) G.mistakes.push(w); }
    const sc = document.getElementById("gscore"); if (sc) sc.textContent = G.score;
    feedback(ok, w, extra);
    if (w) setTimeout(() => speak(w), ok ? 150 : 350);
    else setTimeout(() => sayLine(ok ? rnd(["ok1", "ok2", "ok3"]) : rnd(["bad1", "bad2"])), 150);
    if (ok) setTimeout(nextRound, 1100);
  }
  function nextRound() {
    if (!G) return;
    G.locked = false; G.round++;
    if (G.round >= G.total) finishGame(); else { if (G.prep) G.prep(); renderGame(); }
  }
  function finishGame() {
    const u = U();
    const pct = G.right / Math.max(1, G.right + G.wrong);
    const stars = G.starsFn ? G.starsFn() : pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : 1;
    const bonus = stars * 5;
    addXP(bonus);
    const rec = u.games[G.id] || (u.games[G.id] = { n: 0, best: 0 });
    rec.n++; rec.best = Math.max(rec.best, stars);
    if (G.wrong === 0) rec.perfect = true;
    G.done = true; G.stars = stars; G.bonus = bonus;
    save();
    renderGame();
    if (stars === 3) confetti();
    sfx.win(); setTimeout(() => sayLine("win"), 500);
    checkAchievements();
  }
  function resultHTML() {
    const titles = ["", "Хорошее начало!", "Здорово!", "Великолепно!"];
    return `<div class="result">
      ${BEAR(G.stars >= 2 ? "cheer" : "idle", G.stars >= 2 ? "joy" : "happy", "big")}
      <div class="stars">${[1, 2, 3].map((i) => `<img class="${G.stars >= i ? "on" : "off"}" src="${IMG("Star")}" alt="">`).join("")}</div>
      <h2>${titles[G.stars]}</h2>
      <div class="score">Верно: ${G.right}${G.wrong ? ` · ошибок: ${G.wrong}` : " · без ошибок!"}</div>
      <div class="earn">${ico("Glowing star")}+${U().xp - G.xp0} звёзд</div>
      ${G.mistakes.length ? `<div class="card mistakes"><div class="section-title" style="font-size:16px">Повтори эти слова</div>${G.mistakes.slice(0, 6).map((w) => `<div class="m">${pic(w.img)}<div class="grow"><b>${esc(w.u)}</b><div class="muted" style="font-weight:700">${esc(w.r)}</div></div><button class="say" data-act="say" data-id="${w.id}">${ico("Speaker high volume")}</button></div>`).join("")}</div>` : ""}
      <div class="actions">
        <button class="btn block green" data-act="start-game" data-g="${G.id}">${ico("Repeat button")}Ещё раз</button>
        ${TBYID[G.topic] ? `<button class="btn block ghost" data-act="deck" data-t="${G.topic}">${ico("Books")}Повторить карточки</button>` : ""}
        <button class="btn block ghost" data-act="tab" data-to="games">Другая игра</button>
      </div></div>`;
  }

  const rbase = (r) => r.replace(/\s*\(.*\)/, "").trim();
  const CONFLICT_PAIRS = [["кузпал", "кышно"], ["атай-анай", "анай"], ["атай-анай", "атай"]];
  function clash(a, b) {
    if (a === b || a.generic || b.generic) return true;
    if (rbase(a.r) === rbase(b.r) || a.u === b.u || sameImg(a, b)) return true;
    return CONFLICT_PAIRS.some(([x, y]) => (a.u === x && b.u === y) || (a.u === y && b.u === x));
  }
  function distractors(w, n) {
    const ok = (x) => !clash(x, w);
    const same = shuffle(w.t.words.filter(ok));
    const other = shuffle(WORDS.filter((x) => x.t !== w.t && ok(x)));
    const res = [];
    for (const x of same.concat(other)) {
      if (res.length >= n) break;
      if (!res.some((y) => clash(x, y))) res.push(x);
    }
    return res;
  }
  function seq(pool, n) { const out = []; let s = shuffle(pool); while (out.length < n) { if (!s.length) s = shuffle(pool); out.push(s.pop()); } return out; }
  function base(id, topic, key, total) { return { id, topic, key, total, xp0: U().xp, round: 0, score: 0, right: 0, wrong: 0, mistakes: [], locked: false, done: false }; }

  const GAME_INIT = {}, GAME_VIEW = {}, GAME_MOUNT = {};

  // 1. Выбери перевод
  GAME_INIT.quiz = (topic, key) => {
    const g = base("quiz", topic, key, 10);
    const items = seq(poolFor(topic), 10);
    g.prep = () => {
      const w = items[g.round];
      g.w = w; g.mode = Math.random() < 0.5 ? "u2r" : "p2u";
      g.opts = shuffle([w].concat(distractors(w, 3)));
    };
    g.prep();
    return g;
  };
  GAME_VIEW.quiz = () => {
    const w = G.w;
    if (G.mode === "u2r") {
      return `${progressBar()}<div class="q-card"><span class="ask">Как переводится слово?</span><div class="big">${esc(w.u)}</div><span class="say" data-act="say" data-id="${w.id}">${ico("Speaker high volume")}Слушать</span></div>
      <div class="answers">${G.opts.map((o) => `<button class="ans" data-act="g-pick" data-id="${o.id}">${esc(o.r)}</button>`).join("")}</div>`;
    }
    return `${progressBar()}<div class="q-card"><span class="ask">Как это по-удмуртски?</span>${pic(w.img)}</div>
      <div class="answers">${G.opts.map((o) => `<button class="ans udm" data-act="g-pick" data-id="${o.id}">${esc(o.u)}</button>`).join("")}</div>`;
  };

  // 2. Найди лишнее
  const SIMILAR = [["food", "veg", "berry"], ["wild", "home"]];
  const CONCRETE = ["num", "wild", "home", "food", "clothes", "family", "veg", "colors", "berry"];
  GAME_INIT.odd = (topic, key) => {
    const g = base("odd", topic, key, 8);
    const big = TOPICS.filter((t) => CONCRETE.includes(t.id));
    g.prep = () => {
      const A = CONCRETE.includes(topic) ? TBYID[topic] : rnd(big);
      const bad = SIMILAR.find((s) => s.includes(A.id)) || [];
      const B = rnd(big.filter((t) => t !== A && !bad.includes(t.id)));
      const three = sample(A.words.filter((w) => !w.generic), 3), odd = rnd(B.words.filter((w) => !w.generic));
      g.A = A; g.B = B; g.odd = odd; g.hint = false;
      g.cards = shuffle(three.concat([odd]));
    };
    g.prep();
    return g;
  };
  GAME_VIEW.odd = () => `${progressBar()}
    <div class="q-card"><span class="ask">Три слова из одной темы. Какое слово лишнее?</span></div>
    <div class="odd-grid">${G.cards.map((w) => `<button class="ans" data-act="g-odd" data-id="${w.id}">${G.hint ? pic(w.img) : ""}<span>${esc(w.u)}</span></button>`).join("")}</div>
    <div class="row" style="justify-content:center">${G.hint ? "" : `<button class="btn ghost" data-act="g-hint">${ico("Light bulb")}Подсказка: картинки</button>`}</div>`;

  // 3. Сортировка
  GAME_INIT.sort = (topic, key) => {
    const g = base("sort", topic, key, 1);
    const sets = window.UDM_SORT_SETS;
    const fit = sets.filter((s) => s.a.topics.includes(topic) || s.b.topics.includes(topic));
    const set = rnd(fit.length ? fit : sets);
    const wa = WORDS.filter((w) => set.a.topics.includes(w.t.id));
    const wb = WORDS.filter((w) => set.b.topics.includes(w.t.id) && !set.a.topics.includes(w.t.id));
    const items = sample(wa, 4).map((w) => ({ w, side: "a" })).concat(sample(wb, 4).map((w) => ({ w, side: "b" })));
    g.set = set; g.items = shuffle(items); g.placed = { a: [], b: [] }; g.tries = {}; g.sel = null;
    g.starsFn = () => (g.wrong === 0 ? 3 : g.wrong <= 2 ? 2 : 1);
    return g;
  };
  GAME_VIEW.sort = () => {
    const left = G.items.filter((it) => !it.done);
    return `<div class="q-card" style="padding:12px"><span class="ask">Перетащи слово в нужную корзинку (или нажми на слово, потом на корзинку)</span></div>
      <div class="sort-pool" id="pool">${left.map((it) => `<div class="sort-item ${G.sel === it.w.id ? "sel" : ""}" data-id="${it.w.id}" role="button" tabindex="0">${pic(it.w.img)}<span>${esc(it.w.u)}</span></div>`).join("") || `<p class="muted" style="font-weight:800">Всё разложено!</p>`}</div>
      <div class="baskets">${["a", "b"].map((s) => `<div class="basket" data-side="${s}" data-act="g-basket"><h3>${G.set[s].title}</h3><div class="got">${G.placed[s].map((w) => pic(w.img)).join("")}</div></div>`).join("")}</div>`;
  };
  GAME_MOUNT.sort = (body) => {
    let drag = null;
    body.querySelectorAll(".sort-item").forEach((el) => {
      el.addEventListener("pointerdown", (e) => {
        if (G.locked) return;
        const r = el.getBoundingClientRect();
        drag = { el, id: el.dataset.id, dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, moved: false, clone: null };
        el.setPointerCapture && el.setPointerCapture(e.pointerId);
      });
      el.addEventListener("pointermove", (e) => {
        if (!drag || drag.el !== el) return;
        if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return;
        if (!drag.moved) {
          drag.moved = true;
          const c = el.cloneNode(true); c.classList.add("dragging"); c.style.width = el.offsetWidth + "px";
          document.body.appendChild(c); drag.clone = c; el.classList.add("ghost-slot");
        }
        drag.clone.style.left = e.clientX - drag.dx + "px"; drag.clone.style.top = e.clientY - drag.dy + "px";
        body.querySelectorAll(".basket").forEach((b) => { const r = b.getBoundingClientRect(); b.classList.toggle("over", e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom); });
      });
      const end = (e) => {
        if (!drag || drag.el !== el) return;
        const d = drag; drag = null;
        if (d.clone) d.clone.remove();
        el.classList.remove("ghost-slot");
        let target = null;
        body.querySelectorAll(".basket").forEach((b) => { if (b.classList.contains("over")) target = b; b.classList.remove("over"); });
        if (!d.moved) { G.sel = G.sel === d.id ? null : d.id; sfx.tap(); renderGame(); return; }
        if (target) sortDrop(d.id, target.dataset.side);
      };
      el.addEventListener("pointerup", end);
      el.addEventListener("pointercancel", end);
    });
  };
  function sortDrop(id, side) {
    const it = G.items.find((x) => x.w.id === id && !x.done);
    if (!it) return;
    G.sel = null;
    if (it.side === side) {
      it.done = true; G.placed[side].push(it.w);
      const first = !G.tries[id];
      recordAnswer(it.w, true); G.score += first ? 10 : 5; G.right++;
      sfx.ok(); speak(it.w);
      renderGame();
      if (G.items.every((x) => x.done)) setTimeout(finishGame, 700);
    } else {
      G.tries[id] = (G.tries[id] || 0) + 1; G.wrong++;
      recordAnswer(it.w, false); if (!G.mistakes.includes(it.w)) G.mistakes.push(it.w);
      sfx.bad(); renderGame();
      const b = app.querySelector(`.basket[data-side="${side}"]`); if (b) b.classList.add("flash-bad");
      toast("Thinking face", `${it.w.u} — ${it.w.r}. Попробуй другую корзинку`);
    }
  }

  // 4. Найди пару
  GAME_INIT.memory = (topic, key) => {
    const g = base("memory", topic, key, 1);
    let pool = poolFor(topic);
    const uniq = [];
    shuffle(pool).concat(shuffle(WORDS)).forEach((w) => { if (uniq.length < 6 && !uniq.some((x) => sameImg(x, w) || x.u === w.u) && w.u.length <= 12) uniq.push(w); });
    g.cards = shuffle(uniq.flatMap((w) => [{ w, k: "u" }, { w, k: "p" }])).map((c, i) => ({ ...c, i }));
    g.open = []; g.moves = 0;
    g.starsFn = () => (g.moves <= 9 ? 3 : g.moves <= 13 ? 2 : 1);
    return g;
  };
  GAME_VIEW.memory = () => `<div class="row" style="justify-content:space-between;font-weight:800"><span>Найди пары: слово + картинка</span><span class="muted">Ходов: ${G.moves}</span></div>
    <div class="memory">${G.cards.map((c) => `<button class="mcard ${c.done ? "done" : ""} ${G.open.includes(c.i) ? "open" : ""}" data-act="g-mem" data-i="${c.i}" aria-label="карточка"><div class="in"><div class="fr"><span>${SUN("#D7262E")}</span></div><div class="bk">${c.k === "p" ? pic(c.w.img) : esc(c.w.u)}</div></div></button>`).join("")}</div>`;

  // 5. Собери слово
  GAME_INIT.build = (topic, key) => {
    const g = base("build", topic, key, 6);
    const okw = (w) => !/[\s\-…!?]/.test(w.u) && [...w.u].length >= 2 && [...w.u].length <= 9;
    let pool = poolFor(topic).filter(okw);
    if (pool.length < 3) pool = WORDS.filter(okw);
    const items = seq(pool, 6);
    g.prep = () => {
      const w = items[g.round];
      const letters = [...w.u.toLowerCase()];
      let mixed = shuffle(letters.map((l, i) => ({ l, i })));
      if (letters.length > 1) { let guard = 0; while (mixed.map((x) => x.l).join("") === letters.join("") && guard++ < 10) mixed = shuffle(mixed); }
      g.w = w; g.letters = letters; g.tiles = mixed.map((x, k) => ({ l: x.l, k, used: false })); g.slots = letters.map(() => null); g.failed = false;
    };
    g.prep();
    return g;
  };
  GAME_VIEW.build = () => `${progressBar()}
    <div class="q-card">${pic(G.w.img)}<div class="big" style="font-size:26px">${esc(G.w.r)}</div><span class="say" data-act="say" data-id="${G.w.id}">${ico("Speaker high volume")}Подсказка-звук</span></div>
    <div class="build-slots" id="slots">${G.slots.map((s, i) => `<button class="slot ${s != null ? "full" : ""}" data-act="g-slot" data-i="${i}">${s != null ? esc(G.tiles[s].l) : ""}</button>`).join("")}</div>
    <div class="tiles">${G.tiles.map((t) => `<button class="tile ${t.used ? "used" : ""}" data-act="g-tile" data-k="${t.k}">${esc(t.l)}</button>`).join("")}</div>
    <div class="row" style="justify-content:center"><button class="btn ghost" data-act="g-bhint">${ico("Light bulb")}Подсказка</button></div>`;
  function buildCheck() {
    if (G.slots.some((s) => s == null)) return;
    const word = G.slots.map((s) => G.tiles[s].l).join("");
    if (word === G.letters.join("")) {
      document.querySelectorAll(".slot").forEach((s) => s.classList.add("ok"));
      if (!G.failed) answer(true, G.w);
      else { G.locked = true; sfx.ok(); speak(G.w); feedback(true, G.w); setTimeout(nextRound, 1100); }
    } else {
      if (!G.failed) { G.failed = true; recordAnswer(G.w, false); G.wrong++; if (!G.mistakes.includes(G.w)) G.mistakes.push(G.w); }
      sfx.bad();
      const sl = document.getElementById("slots"); sl.classList.add("shake");
      setTimeout(() => {
        // убрать неверно поставленные буквы
        G.slots = G.slots.map((s, i) => (s != null && G.tiles[s].l === G.letters[i] ? s : null));
        G.tiles.forEach((t) => (t.used = G.slots.includes(t.k)));
        renderGame();
      }, 500);
    }
  }

  // 6. Правда / ложь
  GAME_INIT.tf = (topic, key) => {
    const g = base("tf", topic, key, 10);
    const items = seq(poolFor(topic), 10);
    g.prep = () => {
      const w = items[g.round];
      g.w = w; g.truth = w.generic ? true : Math.random() < 0.5;
      g.shown = g.truth ? w : distractors(w, 1)[0] || w;
      if (g.shown === w) g.truth = true;
    };
    g.prep();
    return g;
  };
  GAME_VIEW.tf = () => `${progressBar()}
    <div class="q-card">${pic(G.shown.img)}<div class="big">${esc(G.w.u)}</div><span class="say" data-act="say" data-id="${G.w.id}">${ico("Speaker high volume")}Слушать</span><span class="ask">Слово подходит к картинке?</span></div>
    <div class="tf-btns"><button class="btn green" data-act="g-tf" data-v="1">${ico("Check mark button")}Верно</button><button class="btn" data-act="g-tf" data-v="0">${ico("Cross mark")}Неверно</button></div>`;

  // ---- Profile
  SCREENS.profile = () => {
    const u = U(), st = streak(), lc = learnedCount();
    const hard = hardWords(5);
    const days7 = [6, 5, 4, 3, 2, 1, 0].map((i) => { const k = daysAgo(i); const d = new Date(); d.setDate(d.getDate() - i); return { k, wd: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"][d.getDay()], v: (u.days[k] && u.days[k].xp) || 0 }; });
    const max = Math.max(DAILY_GOAL, ...days7.map((d) => d.v));
    const W = 320, H = 150, bw = 30, gap = (W - 7 * bw) / 8;
    const bars = days7.map((d, i) => {
      const x = gap + i * (bw + gap), h = Math.round((d.v / max) * 96), y = 118 - h;
      return `<rect x="${x}" y="${y}" width="${bw}" height="${Math.max(h, 3)}" rx="8" fill="${i === 6 ? "#D7262E" : d.v >= DAILY_GOAL ? "#FFC23D" : "#F2D9A0"}"/><text x="${x + bw / 2}" y="${y - 6}" text-anchor="middle" class="v">${d.v || ""}</text><text x="${x + bw / 2}" y="138" text-anchor="middle">${d.wd}</text>`;
    }).join("");
    const goalY = 118 - Math.round((DAILY_GOAL / max) * 96);
    return {
      tab: "profile",
      html: `<header class="top"><div class="prof-head grow"><img class="ava" src="${IMG(u.avatar)}" alt=""><h1>${esc(u.name)}<span class="sub">Учится с ${u.created.split("-").reverse().join(".")}</span></h1></div><button class="icon-btn" data-act="edit-profile" aria-label="Редактировать профиль">${ico("Pencil")}</button></header>
      <main class="scroll">
        <div class="tiles4">
          <div class="stat">${ico("Books")}<div><b>${lc}</b><small>слов изучено из ${WORDS.length}</small></div></div>
          <div class="stat">${ico("Glowing star")}<div><b>${u.xp}</b><small>звёзд собрано</small></div></div>
          <div class="stat">${ico("Fire")}<div><b>${st}</b><small>${plural(st, "день", "дня", "дней")} подряд</small></div></div>
          <div class="stat">${ico("Bullseye")}<div><b>${accuracy(u)}%</b><small>верных ответов</small></div></div>
        </div>
        <div class="card"><div class="section-title" style="font-size:17px">Прогресс по дням <small>звёзды за 7 дней</small></div>
          <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Звёзды по дням"><line x1="0" x2="${W}" y1="${goalY}" y2="${goalY}" stroke="#2F9E62" stroke-width="1.5" stroke-dasharray="4 4"/><text x="2" y="${goalY - 4}" text-anchor="start" style="fill:#2F9E62">цель ${DAILY_GOAL}</text><line x1="0" x2="${W}" y1="118" y2="118" stroke="#EADFD2"/>${bars}</svg>
        </div>
        <div class="card"><div class="section-title" style="font-size:17px">Трудные слова <small>чаще всего ошибки</small></div>
          ${hard.length ? `<div class="hard">${hard.map((w) => { const r = u.words[w.id]; return `<div class="h">${pic(w.img)}<div class="grow"><b>${esc(w.u)}</b><div class="muted" style="font-weight:700;font-size:14px">${esc(w.r)}</div></div><span class="err">${r.e} ош.</span><button class="say" data-act="say" data-id="${w.id}">${ico("Speaker high volume")}</button></div>`; }).join("")}</div>
          ${hard.length >= 4 ? `<button class="btn block sun" style="margin-top:10px" data-act="play-hard">${ico("Brain")}Потренировать трудные слова</button>` : ""}` : `<p class="muted" style="font-weight:700;margin:6px 0 0">Ошибок пока нет. Сыграй в игры — и здесь появятся слова, которые стоит повторить.</p>`}
        </div>
        <div class="section-title">Награды <small>${u.ach.length} из ${ACHIEVEMENTS.length}</small></div>
        <div class="ach">${ACHIEVEMENTS.map((a) => `<div class="${u.ach.includes(a.id) ? "" : "off"}" title="${a.d}">${ico(a.img)}${a.t}<div class="muted" style="font-weight:700;font-size:11px;margin-top:2px">${a.d}</div></div>`).join("")}</div>
        <div class="section-title">Об удмуртском языке</div>
        <div class="facts">${window.UDM_FACTS.map((f) => `<div class="fact"><span class="ss">${SUN("#FFFFFF")}</span><b>${f.t}</b><p>${f.d}</p></div>`).join("")}</div>
        <button class="list-btn" data-act="gate" data-to="report">${ico("Clipboard")}<div class="grow"><b>Отчёт для родителей и учителя</b><div class="muted" style="font-size:13px">Краткая сводка успехов</div></div><span class="chev">›</span></button>
        <button class="list-btn" data-act="tour-start">${BEAR("wave", "happy", "lb-bear")}<div class="grow"><b>Экскурсия с Гондырпи</b><div class="muted" style="font-size:13px">Медвежонок ещё раз покажет приложение</div></div><span class="chev">›</span></button>
        <button class="list-btn" data-act="switch-user">${ico("Bust in silhouette")}<div class="grow"><b>Сменить профиль</b><div class="muted" style="font-size:13px">Выйти и выбрать другого ученика</div></div><span class="chev">›</span></button>
      </main>`
    };
  };

  // ---- Report
  function reportData() {
    const u = U();
    let a = 0, c = 0, sec = 0, act = 0;
    for (let i = 0; i < 7; i++) { const d = u.days[daysAgo(i)]; if (d) { a += d.a; c += d.c; sec += d.sec; if (d.a || d.seen) act++; } }
    const topics = TOPICS.map((t) => {
      let ta = 0, tc = 0; t.words.forEach((w) => { const r = u.words[w.id]; if (r) { ta += r.c + r.e; tc += r.c; } });
      return { t, n: learnedCount(t.words), all: t.words.length, acc: ta ? Math.round((tc / ta) * 100) : null };
    });
    const advice = [];
    const weak = topics.filter((x) => x.acc != null && x.acc < 70).sort((x, y) => x.acc - y.acc)[0];
    if (weak) advice.push(`Повторите тему «${weak.t.ru}» — точность ${weak.acc}%.`);
    const fresh = topics.find((x) => x.n === 0);
    if (fresh) advice.push(`Начните новую тему «${fresh.t.ru}».`);
    if (act < 3) advice.push("Лучше заниматься понемногу каждый день: 10 минут в день полезнее, чем час раз в неделю.");
    const hard = hardWords(5);
    if (hard.length) advice.push(`Произносите вместе трудные слова: ${hard.map((w) => w.u).join(", ")}.`);
    if (!advice.length) advice.push("Отличная работа! Можно переходить к фразам и теме «Моя родина — Удмуртия».");
    return { u, a, c, acc: a ? Math.round((c / a) * 100) : 0, min: Math.round(sec / 60), act, topics, hard, advice, learned: learnedCount() };
  }
  function reportText(r) {
    const d = new Date();
    return [
      `Отчёт об успехах: ${r.u.name}`,
      `Приложение «Ӟеч-а бур-а удмурт кыл?», ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`,
      ``,
      `За последние 7 дней: занятий — ${r.act} дн., ответов — ${r.a}, верных — ${r.acc}%, время — около ${r.min} мин.`,
      `Изучено слов: ${r.learned} из ${WORDS.length}. Звёзд: ${r.u.xp}. Серия: ${streak()} дн.`,
      ``,
      `По темам:`,
      ...r.topics.map((x) => `• ${x.t.ru}: ${x.n}/${x.all}${x.acc != null ? `, точность ${x.acc}%` : ""}`),
      ``,
      r.hard.length ? `Трудные слова: ${r.hard.map((w) => `${w.u} (${w.r})`).join(", ")}` : `Трудных слов нет.`,
      ``,
      `Рекомендации:`,
      ...r.advice.map((x) => `• ${x}`)
    ].join("\n");
  }
  SCREENS.report = () => {
    const r = reportData();
    return {
      cls: "report",
      html: `${top({ title: "Отчёт для взрослых", sub: esc(r.u.name) + " · последние 7 дней", back: true })}
      <main class="scroll">
        <div class="card"><h3>Сводка</h3>
          <div class="kv"><span>Дней с занятиями</span><b>${r.act} из 7</b></div>
          <div class="kv"><span>Ответов в играх</span><b>${r.a}</b></div>
          <div class="kv"><span>Верных ответов</span><b>${r.acc}%</b></div>
          <div class="kv"><span>Время в приложении</span><b>≈ ${r.min} мин</b></div>
          <div class="kv"><span>Изучено слов</span><b>${r.learned} из ${WORDS.length}</b></div>
          <div class="kv"><span>Серия дней подряд</span><b>${streak()}</b></div>
        </div>
        <div class="card"><h3>Темы</h3>${r.topics.map((x) => `<div class="tbar"><span>${esc(x.t.ru)}</span><span class="b"><i style="width:${(x.n / x.all) * 100}%;background:${x.t.color}"></i></span><span>${x.n}/${x.all}</span></div>`).join("")}</div>
        <div class="advice"><b>Рекомендации</b><ul>${r.advice.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></div>
        <button class="btn block" data-act="copy-report">${ico("Clipboard")}${IS_ANDROID ? "Отправить учителю" : "Скопировать отчёт"}</button>
        <textarea id="repText" readonly hidden style="width:100%;min-height:200px;border-radius:16px;border:2px solid var(--line);padding:12px;font:inherit;font-size:14px;background:var(--card);color:var(--ink)">${esc(reportText(r))}</textarea>
        <p class="note">Отчёт можно переслать учителю в мессенджер — так он увидит, какие слова ребёнку даются труднее.</p>
      </main>`
    };
  };

  // ---- Settings
  SCREENS.settings = () => {
    const s = S();
    const tg = (k, on) => `<button class="toggle" role="switch" aria-checked="${on}" data-act="toggle" data-k="${k}" aria-label="${k}"></button>`;
    return {
      tab: "settings",
      html: `${top({ title: "Настройки" })}
      <main class="scroll">
        <div class="set-group">
          <div class="set">${ico(s.sound ? "Speaker high volume" : "Muted speaker")}<div class="grow"><b>Звук</b><small>Звуки в играх и при ответах</small></div>${tg("sound", s.sound)}</div>
          <div class="set">${ico("Speaking head")}<div class="grow"><b>Озвучка слов</b><small>Слово читается вслух на карточках и в играх</small></div>${tg("voice", s.voice)}</div>
          <div class="set wrap">${ico("Speaking head")}<div class="grow"><b>Голос</b><small>Удмуртский — нейросеть, обученная на удмуртской речи. Работает без интернета.</small></div><div class="seg"><button class="${s.voiceMode !== "device" ? "on" : ""}" data-act="vmode" data-v="udm">Удмуртский</button><button class="${s.voiceMode === "device" ? "on" : ""}" data-act="vmode" data-v="device">Голос телефона</button></div></div>
          <div class="set wrap">${ico("Snail")}<div class="grow"><b>Скорость речи</b><small>Медленно — проще повторять</small></div><div class="seg"><button class="${s.rate === "slow" ? "on" : ""}" data-act="rate" data-v="slow">Медленно</button><button class="${s.rate !== "slow" ? "on" : ""}" data-act="rate" data-v="norm">Обычно</button></div></div>
        </div>
        <div class="set-group">
          <div class="set">${ico(s.notif ? "Bell" : "Bell with slash")}<div class="grow"><b>Уведомления</b><small>Напоминание позаниматься каждый день</small><span id="notifMsg"></span></div>${tg("notif", s.notif)}</div>
          ${s.notif ? `<div class="set wrap">${ico("Alarm clock")}<div class="grow"><b>Время напоминания</b></div><div class="seg">${["17:00", "18:00", "19:00"].map((t) => `<button class="${s.notifTime === t ? "on" : ""}" data-act="ntime" data-v="${t}">${t}</button>`).join("")}</div></div>` : ""}
          <div class="set">${ico("Round pushpin")}<div class="grow"><b>Геолокация</b><small>Покажем, далеко ли ты от Ижкара (Ижевска)</small><span id="geoMsg">${s.geo && GEO ? `<span class="status-msg">${GEO.inside ? "Ты в Удмуртии!" : "До Ижевска " + GEO.km + " км"}</span>` : ""}</span></div>${tg("geo", s.geo)}</div>
        </div>
        <div class="set-group">
          <button class="set" style="width:100%;text-align:left" data-act="edit-profile">${ico("Pencil")}<div class="grow"><b>Редактировать профиль</b><small>Имя и аватар</small></div></button>
          <button class="set" style="width:100%;text-align:left" data-act="gate" data-to="reset">${ico("Repeat button")}<div class="grow"><b>Сбросить прогресс</b><small>Для взрослых</small></div></button>
          <button class="set" style="width:100%;text-align:left" data-act="gate" data-to="delete">${ico("Cross mark")}<div class="grow"><b>Удалить профиль</b><small>Для взрослых</small></div></button>
          <button class="set" style="width:100%;text-align:left" data-act="switch-user">${ico("Bust in silhouette")}<div class="grow"><b>Сменить профиль</b></div></button>
        </div>
        <div class="card" style="font-size:13.5px;font-weight:600;color:var(--ink-2)">
          <b style="font-family:var(--display);font-size:16px;color:var(--ink)">«Ӟеч-а бур-а удмурт кыл?»</b><br>
          Версия 1.0 · работает без интернета · ${WORDS.length} слов и фраз в ${TOPICS.length} темах.<br>
          Слова — по материалам кейса. Иллюстрации — Microsoft Fluent Emoji (MIT) и собственные рисунки с удмуртским орнаментом. Шрифты Rubik и Nunito (OFL).
        </div>
      </main>`
    };
  };

  // ---------------------------------------------------------------- actions
  const ACT = {};
  ACT.helper = () => { sfx.tap(); coach({ k: helpFor(), pose: "wave", tour: NAV[NAV.length - 1].name === "home" }); };
  ACT["coach-close"] = () => { stopVoice(); closeCoach(); };
  ACT["coach-say"] = (el) => sayLine(el.dataset.k);
  ACT["tour-start"] = () => startTour();
  ACT["tour-next"] = () => { stopVoice(); tourStep++; if (tourStep >= TOUR.length) { tourStep = -1; closeCoach(); const u = U(); u.tips = u.tips || {}; u.tips.help_home = 1; save(); return; } tourShow(); };
  ACT["tour-skip"] = () => { stopVoice(); tourStep = -1; closeCoach(); };
  ACT.stop = (el) => { sfx.tap(); stopModal(el.dataset.id); };
  ACT["say-key"] = (el) => playKey(el.dataset.key);
  ACT.lview = (el) => { U().learnView = el.dataset.v; save(); sfx.tap(); draw(); };
  ACT["open-map"] = () => { closeModal(); U().learnView = "map"; save(); show("learn", {}, { root: true }); };
  ACT.go = (el) => show(el.dataset.to);
  ACT.back = () => back();
  ACT.tab = (el) => { closeModal(); sfx.tap(); show(el.dataset.to, {}, { root: true }); };
  ACT["pick-user"] = (el) => show("pin", { id: el.dataset.id });
  ACT["pin-tap"] = (el) => {
    const P = app._pin; if (!P) return;
    sfx.tap();
    P.st.seq.push(+el.dataset.i);
    const slots = app.querySelectorAll(".pw-slot");
    P.st.seq.forEach((v, i) => { slots[i].classList.add("full"); slots[i].innerHTML = ico(PW_ITEMS[v]); });
    if (P.st.seq.length === 3) {
      if (hash(P.st.seq.join("|")) === P.u.pw) {
        DB.current = P.u.id; save(); sfx.win(); login();
      } else {
        sfx.bad();
        const panel = document.getElementById("pinPanel"); panel.classList.remove("shake"); void panel.offsetWidth; panel.classList.add("shake");
        setTimeout(() => { P.st.seq = []; slots.forEach((s) => { s.classList.remove("full"); s.innerHTML = ""; }); }, 450);
      }
    }
  };
  ACT.forgot = (el) => gate(() => show("register", { resetFor: el.dataset.id, st: { step: 2, name: "", avatar: "", seq: [], resetFor: el.dataset.id } }, { replace: true }));
  ACT.ava = (el) => {
    const p = NAV[NAV.length - 1].params; p.st.avatar = el.dataset.a; sfx.tap();
    app.querySelectorAll(".avatars button").forEach((b) => b.classList.toggle("on", b === el));
  };
  ACT["reg-next"] = () => {
    const p = NAV[NAV.length - 1].params; const nm = document.getElementById("nm");
    p.st.name = (nm.value || "").trim();
    if (!p.st.name) { nm.focus(); nm.classList.add("shake"); setTimeout(() => nm.classList.remove("shake"), 500); toast("Pencil", "Напиши своё имя"); return; }
    p.st.step = 2; draw();
  };
  ACT["reg-pw"] = (el) => { const p = NAV[NAV.length - 1].params; if (p.st.seq.length >= 3) return; sfx.tap(); p.st.seq.push(+el.dataset.i); draw(); };
  ACT["reg-clear"] = () => { const p = NAV[NAV.length - 1].params; p.st.seq = []; draw(); };
  ACT["reg-done"] = () => {
    const st = NAV[NAV.length - 1].params.st;
    if (st.seq.length < 3) return;
    if (st.resetFor) {
      DB.users[st.resetFor].pw = hash(st.seq.join("|")); DB.current = st.resetFor; save();
      toast("Key", "Новый секрет сохранён"); login(); return;
    }
    const u = newUser(st.name, st.avatar, st.seq);
    DB.users[u.id] = u; DB.order.push(u.id); DB.current = u.id; save();
    sfx.win(); login(true);
  };
  function login(isNew) {
    show("home", {}, { root: true });
    if (S().geo) requestGeo(() => { if (NAV[NAV.length - 1].name === "home") draw(); });
    if (isNew) {
      confetti();
      const seq = NAV.length && DB.users[DB.current];
      setTimeout(() => startTour(), 600);
    }
  }
  ACT.close = () => closeModal();
  ACT["close-to"] = (el) => { closeModal(); show(el.dataset.to, {}, { root: true }); };
  ACT.say = (el, d, e) => { e.stopPropagation(); const w = WBYID[el.dataset.id]; if (w) { speak(w); el.animate && el.animate([{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }], { duration: 300 }); } };
  ACT["say-text"] = (el) => { if (!playKey("w:" + el.dataset.key)) speak(el.dataset.text); };
  ACT.wod = () => {
    const w = wordOfDay(); markSeen(w); speak(w);
    modal(`<div class="result" style="padding-top:0">
      <span class="lbl" style="font-weight:900;letter-spacing:.1em;color:var(--red);font-size:12px">СЛОВО ДНЯ · ${esc(w.t.ru.toUpperCase())}</span>
      ${pic(w.img, "")}<h2 style="font-size:40px">${esc(w.u)}</h2>
      <div class="score">${esc(w.r)} · <span class="tr" style="font-size:16px">${transcription(w)}</span></div>
      <button class="say big" data-act="say" data-id="${w.id}">${ico("Speaker high volume")}Слушать ещё раз</button>
      <div class="actions"><button class="btn block" data-act="deck" data-t="${w.t.id}">Учить тему «${esc(w.t.ru)}»</button></div>
    </div>`, (m) => { const p = m.querySelector(".pic"); p.style.width = "160px"; p.style.height = "160px"; });
  };
  ACT.deck = (el) => { closeModal(); show("deck", { t: el.dataset.t }); };
  ACT["deck-again"] = (el) => { closeModal(); show("deck", { t: el.dataset.t, i: 0 }, { replace: true }); };
  ACT.flip = (el) => { if (Date.now() - lastSwipe < 450) return; el.classList.toggle("flipped"); sfx.flip(); };
  ACT["deck-next"] = (el) => deckMove(1, el.dataset.k === "1");
  ACT["deck-prev"] = () => deckMove(-1);
  ACT["deck-skip"] = () => deckMove(1);
  ACT["play-topic"] = (el) => { closeModal(); U().lastTopic = el.dataset.t; save(); show("games", {}, { root: true }); };
  ACT["play-hard"] = () => startGame("quiz", "hard");
  ACT["sel-topic"] = (el) => { U().lastTopic = el.dataset.t; save(); sfx.tap(); const sc = app.querySelector(".scroll").scrollTop; draw(); app.querySelector(".scroll").scrollTop = sc; };
  ACT["start-game"] = (el) => {
    const topic = G && G.done ? G.topic : U().lastTopic || "all";
    if (G && G.done) { NAV.pop(); }
    startGame(el.dataset.g, topic);
  };
  ACT["g-next"] = () => nextRound();
  ACT["g-pick"] = (el) => {
    if (G.locked) return;
    const ok = el.dataset.id === G.w.id;
    app.querySelectorAll(".ans").forEach((b) => { if (b.dataset.id === G.w.id) b.classList.add("ok"); else if (b === el) b.classList.add("bad"); else b.classList.add("dim"); });
    answer(ok, G.w);
  };
  ACT["g-odd"] = (el) => {
    if (G.locked) return;
    const ok = el.dataset.id === G.odd.id;
    G.hint = true;
    app.querySelectorAll(".odd-grid .ans").forEach((b) => {
      const w = WBYID[b.dataset.id];
      if (!b.querySelector(".pic")) b.insertAdjacentHTML("afterbegin", pic(w.img));
      if (w === G.odd) b.classList.add("ok"); else if (b === el) b.classList.add("bad"); else b.classList.add("dim");
    });
    answer(ok, G.odd, `Лишнее — «${G.odd.u}» (${G.B.ru}). Остальные — ${G.A.ru}.`);
  };
  ACT["g-hint"] = () => { G.hint = true; sfx.tap(); renderGame(); };
  ACT["g-basket"] = (el) => { if (G && G.sel) sortDrop(G.sel, el.dataset.side); };
  ACT["g-mem"] = (el) => {
    const i = +el.dataset.i, c = G.cards[i];
    if (G.locked || c.done || G.open.includes(i)) return;
    sfx.flip();
    G.open.push(i); el.classList.add("open");
    if (c.k === "u") speak(c.w);
    if (G.open.length === 2) {
      G.moves++; G.locked = true;
      const [a, b] = G.open.map((k) => G.cards[k]);
      const mv = app.querySelector(".memory").previousElementSibling.querySelector(".muted"); if (mv) mv.textContent = "Ходов: " + G.moves;
      if (a.w === b.w) {
        setTimeout(() => {
          a.done = b.done = true; G.open = []; G.locked = false; G.right++; G.score += 10;
          recordAnswer(a.w, true); sfx.ok(); speak(a.w);
          renderGame();
          if (G.cards.every((x) => x.done)) setTimeout(finishGame, 600);
        }, 450);
      } else {
        setTimeout(() => { G.open = []; G.locked = false; renderGame(); }, 950);
      }
    }
  };
  ACT["g-tile"] = (el) => {
    if (G.locked) return;
    const t = G.tiles[+el.dataset.k]; if (t.used) return;
    const free = G.slots.indexOf(null); if (free < 0) return;
    sfx.tap(); t.used = true; G.slots[free] = t.k; renderGame(); buildCheck();
  };
  ACT["g-slot"] = (el) => {
    if (G.locked) return;
    const i = +el.dataset.i, s = G.slots[i]; if (s == null) return;
    G.tiles[s].used = false; G.slots[i] = null; sfx.tap(); renderGame();
  };
  ACT["g-bhint"] = () => {
    if (G.locked) return;
    // поставить следующую правильную букву
    G.slots = G.slots.map((s, i) => (s != null && G.tiles[s].l === G.letters[i] ? s : null));
    G.tiles.forEach((t) => (t.used = G.slots.includes(t.k)));
    const i = G.slots.indexOf(null); if (i < 0) return;
    const t = G.tiles.find((x) => !x.used && x.l === G.letters[i]);
    if (t) { t.used = true; G.slots[i] = t.k; }
    G.score = Math.max(0, G.score - 2);
    renderGame(); buildCheck();
  };
  ACT["g-tf"] = (el) => {
    if (G.locked) return;
    const said = el.dataset.v === "1", ok = said === G.truth;
    answer(ok, G.w, G.truth ? "Это было верно!" : `Неверно: на картинке «${G.shown.r}».`);
  };

  // профиль, отчёт, настройки
  function gate(then) {
    const a = 3 + Math.floor(Math.random() * 6), b = 4 + Math.floor(Math.random() * 5), r = a + b;
    const opts = shuffle([r, r + 1 + Math.floor(Math.random() * 3), r - 1 - Math.floor(Math.random() * 2)]);
    app._gate = { r, then };
    modal(`<div class="gate"><h2>Только для взрослых</h2><p class="muted" style="margin:0;font-weight:700">Решите пример, чтобы продолжить</p><div class="q">${a} + ${b} = ?</div>
      <div class="opts">${opts.map((o) => `<button class="btn ghost" data-act="gate-ans" data-v="${o}">${o}</button>`).join("")}</div>
      <button class="link" data-act="close">Отмена</button></div>`);
  }
  ACT.gate = (el) => {
    const to = el.dataset.to;
    gate(() => {
      if (to === "report") show("report");
      else if (to === "reset") confirmModal("Сбросить весь прогресс?", "Звёзды, изученные слова и награды пропадут. Профиль останется.", "Сбросить", () => {
        const u = U(); Object.assign(u, { xp: 0, words: {}, days: {}, games: {}, ach: [] }); save(); toast("Repeat button", "Прогресс сброшен"); draw();
      });
      else if (to === "delete") confirmModal("Удалить профиль?", `Профиль «${esc(U().name)}» и весь его прогресс будут удалены с устройства.`, "Удалить", () => {
        const id = DB.current; delete DB.users[id]; DB.order = DB.order.filter((x) => x !== id); DB.current = null; save();
        show(DB.order.length ? "login" : "welcome", {}, { root: true });
      });
    });
  };
  ACT["gate-ans"] = (el) => {
    const g = app._gate;
    if (+el.dataset.v === g.r) { closeModal(); g.then(); }
    else { sfx.bad(); const m = app.querySelector(".modal"); m.classList.remove("shake"); void m.offsetWidth; m.classList.add("shake"); }
  };
  function confirmModal(title, text, btn, fn) {
    app._confirm = fn;
    modal(`<h2>${title}</h2><p style="margin:0;font-weight:600">${text}</p><div class="row2"><button class="btn ghost" data-act="close">Отмена</button><button class="btn" data-act="confirm-yes">${btn}</button></div>`);
  }
  ACT["confirm-yes"] = () => { closeModal(); app._confirm && app._confirm(); };
  ACT["edit-profile"] = () => {
    const u = U(); app._edit = { avatar: u.avatar };
    modal(`<h2>Мой профиль</h2>
      <label class="field" for="ename">Имя<input id="ename" maxlength="16" value="${esc(u.name)}"></label>
      <div class="avatars">${AVATARS.map((a) => `<button data-act="e-ava" data-a="${a}" class="${u.avatar === a ? "on" : ""}">${ico(a)}</button>`).join("")}</div>
      <button class="btn block green" data-act="e-save">Сохранить</button>`);
  };
  ACT["e-ava"] = (el) => { app._edit.avatar = el.dataset.a; app.querySelectorAll(".modal .avatars button").forEach((b) => b.classList.toggle("on", b === el)); sfx.tap(); };
  ACT["e-save"] = () => {
    const n = document.getElementById("ename").value.trim(); if (!n) return;
    const u = U(); u.name = n; u.avatar = app._edit.avatar; save(); closeModal(); toast(u.avatar, "Профиль сохранён"); draw();
  };
  ACT["switch-user"] = () => { DB.current = null; save(); show("login", {}, { root: true }); };
  ACT["copy-report"] = () => {
    const text = reportText(reportData());
    if (IS_ANDROID && window.AndroidBridge.share) { try { window.AndroidBridge.share(text); return; } catch (e) {} }
    const ta = document.getElementById("repText");
    const fallback = () => { ta.hidden = false; ta.focus(); ta.select(); toast("Clipboard", "Выделите текст и скопируйте"); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast("Check mark button", "Отчёт скопирован"), fallback);
      else fallback();
    } catch (e) { fallback(); }
  };
  ACT.toggle = (el) => {
    const k = el.dataset.k, s = S();
    s[k] = !s[k]; save(); sfx.tap();
    if (k === "notif") {
      draw();
      setReminder(s.notif, (ok) => {
        const m = document.getElementById("notifMsg");
        if (!s.notif) return;
        if (ok) { if (m) m.innerHTML = `<span class="status-msg">Напомним в ${s.notifTime}</span>`; }
        else if (m) m.innerHTML = `<span class="status-msg warn">${IS_ANDROID ? "Разрешите уведомления в настройках телефона" : "В браузере напоминания недоступны — они работают в Android-приложении"}</span>`;
      });
      return;
    }
    if (k === "geo") {
      if (s.geo) {
        draw();
        const m = document.getElementById("geoMsg"); if (m) m.innerHTML = `<span class="status-msg">Определяем…</span>`;
        if (IS_ANDROID && window.AndroidBridge.requestLocation) { try { window.AndroidBridge.requestLocation(); } catch (e) {} }
        requestGeo((ok) => {
          const m2 = document.getElementById("geoMsg"); if (!m2) return;
          m2.innerHTML = ok ? `<span class="status-msg">${GEO.inside ? "Ты в Удмуртии!" : "До Ижевска " + GEO.km + " км"}</span>` : `<span class="status-msg warn">Нет доступа к геолокации. Разрешите его в настройках.</span>`;
        });
        return;
      }
      GEO = null;
    }
    draw();
  };
  ACT.vmode = (el) => { S().voiceMode = el.dataset.v; save(); draw(); speak(wordOfDay()); };
  ACT.rate = (el) => { S().rate = el.dataset.v; save(); draw(); speak(wordOfDay()); };
  ACT.ntime = (el) => { S().notifTime = el.dataset.v; save(); setReminder(true, () => {}); draw(); };

  app.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el || !app.contains(el)) return;
    touch();
    const fn = ACT[el.dataset.act];
    if (fn) fn(el, el.dataset, e);
  });
  app.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("sort-item")) {
      e.preventDefault(); G.sel = e.target.dataset.id; renderGame();
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") back(); });

  // ---------------------------------------------------------------- start
  function migrate() {
    Object.values(DB.users).forEach((u) => {
      u.settings = Object.assign({ sound: true, voice: true, voiceMode: "udm", rate: "norm", notif: false, notifTime: "18:00", geo: false }, u.settings || {});
      u.tips = u.tips || {}; u.learnView = u.learnView || "map";
    });
  }
  migrate();
  function boot() {
    if (U()) { show("home", {}, { root: true }); if (S().geo) requestGeo(() => { if (NAV[NAV.length - 1].name === "home") draw(); }); }
    else if (DB.order.length) show("login", {}, { root: true });
    else show("welcome", {}, { root: true });
  }
  window.UDM_DEBUG = { DB: () => DB, show, transcription, ttsText, WORDS, startTour, journeyState };
  boot();
})();
