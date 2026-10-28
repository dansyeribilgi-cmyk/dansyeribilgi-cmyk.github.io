// Giriş, kullanıcıya özel kayıt (Firestore) ve bildirim (FCM) katmanı.
// FB_READY false ise demo mod: Firebase'e bağlanmaz, ilerleme sadece bu cihazda tutulur.
const V = "10.12.2", G = `https://www.gstatic.com/firebasejs/${V}/`;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const LOGIN = $("#login");
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

const ERR = {
  "auth/invalid-credential": "E-posta veya şifre hatalı.",
  "auth/wrong-password": "E-posta veya şifre hatalı.",
  "auth/user-not-found": "Bu e-postayla kayıtlı hesap yok. “Hesap oluştur”u dene.",
  "auth/email-already-in-use": "Bu e-postayla zaten bir hesap var. Giriş yapmayı dene.",
  "auth/weak-password": "Şifre en az 6 karakter olmalı.",
  "auth/invalid-email": "E-posta adresi geçersiz görünüyor.",
  "auth/missing-password": "Şifreni yaz.",
  "auth/network-request-failed": "İnternet bağlantını kontrol et.",
  "auth/too-many-requests": "Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.",
  "auth/popup-blocked": "Açılır pencere engellendi, yönlendirme ile deneniyor…",
  "auth/unauthorized-domain": "Bu alan adı Firebase'de yetkili değil (Authentication → Settings → Authorized domains).",
  "auth/operation-not-allowed": "Bu giriş yöntemi Firebase'de açık değil (Authentication → Sign-in method).",
};
const errMsg = e => ERR[e && e.code] || ((e && e.code) ? "Bir sorun oldu (" + e.code + ")." : "Bir sorun oldu, tekrar dene.");

const GICON = `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

let mode = "in"; // in | up | reset
function drawLogin(note = "") {
  LOGIN.hidden = false;
  const demo = !window.FB_READY;
  LOGIN.innerHTML = `
  <span class="lg">${typeof LOGO !== "undefined" ? LOGO : ""}</span>
  <h1>Antrenörlük<br>Eğitimi</h1>
  <p>Kademe 1 sınavına her gün birkaç dakikayla hazırlan. İlerlemen hesabına kaydedilir, hangi cihazdan girersen gir kaldığın yerden devam edersin.</p>
  ${demo ? `<p class="note" style="margin:0">Demo mod: Firebase ayarları henüz girilmedi. İlerleme sadece bu cihazda tutulur.</p>
  <button class="btn" id="demo">Demo olarak devam et</button>` : `
  <button class="btn gbtn" id="g">${GICON}Google ile devam et</button>
  <div class="or">veya e-posta ile</div>
  <form id="f" novalidate>
    ${mode === "up" ? `<input id="nm" autocomplete="name" placeholder="Adın" aria-label="Adın">` : ""}
    <input id="em" type="email" autocomplete="email" inputmode="email" placeholder="E-posta" aria-label="E-posta">
    ${mode !== "reset" ? `<input id="pw" type="password" autocomplete="${mode === "up" ? "new-password" : "current-password"}" placeholder="Şifre${mode === "up" ? " (en az 6 karakter)" : ""}" aria-label="Şifre">` : ""}
    <button class="btn" type="submit" id="sb">${mode === "in" ? "Giriş yap" : mode === "up" ? "Hesap oluştur" : "Sıfırlama bağlantısı gönder"}</button>
  </form>
  <div class="err" id="er" role="alert">${esc(note)}</div>
  <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px">
    ${mode === "in" ? `<button class="lnk" data-m="up">Hesap oluştur</button><button class="lnk" data-m="reset">Şifremi unuttum</button>` : `<button class="lnk" data-m="in">Girişe dön</button>`}
  </div>`}
  <p class="credit" style="margin:6px 0 0">Hazırlayan <b>Serhat Tuna</b></p>`;
  if (demo) { $("#demo").onclick = () => startUser({ uid: "demo", email: "", displayName: "Demo kullanıcı" }, null); return; }
  LOGIN.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { mode = b.dataset.m; drawLogin(); });
  $("#g").onclick = google;
  $("#f").onsubmit = e => { e.preventDefault(); emailSubmit(); };
}
function drawSplash() {
  LOGIN.hidden = false;
  LOGIN.innerHTML = `<span class="lg">${typeof LOGO !== "undefined" ? LOGO : ""}</span><p>Yükleniyor…</p>`;
}
const setErr = (m, ok) => { const el = $("#er"); if (el) { el.textContent = m; el.style.color = ok ? "var(--good)" : ""; } };
const busy = (b) => LOGIN.querySelectorAll("button,input").forEach(x => x.disabled = b);

// ---------- Firebase ----------
let A, F, M, app, auth, db, user = null, ref = null;
async function boot() {
  [A, F] = await Promise.all([import(G + "firebase-auth.js"), import(G + "firebase-firestore.js")]);
  const { initializeApp } = await import(G + "firebase-app.js");
  app = initializeApp(window.FB_CONFIG);
  auth = A.getAuth(app); auth.languageCode = "tr";
  db = F.getFirestore(app);
  A.getRedirectResult(auth).catch(e => drawLogin(errMsg(e)));
  A.onAuthStateChanged(auth, async u => {
    if (!u) { user = null; ref = null; try { window.APP_STOP && APP_STOP(); } catch (e) {} drawLogin(); return; }
    drawSplash();
    user = u; ref = F.doc(db, "users", u.uid);
    let remote = null;
    try {
      const snap = await F.getDoc(ref);
      if (snap.exists()) remote = snap.data().state || null;
      else await F.setDoc(ref, { email: u.email || "", name: u.displayName || "", createdAt: F.serverTimestamp() });
    } catch (e) { console.warn("Firestore okunamadı, yerel kayıtla devam", e); }
    startUser(u, remote);
  });
}
function startUser(u, remote) {
  user = user || u;
  APP_LOAD(u.uid, remote);
  APP_START();
}

async function google() {
  setErr(""); busy(true);
  const p = new A.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
  try {
    if (isStandalone()) await A.signInWithRedirect(auth, p); // ana ekrandan açılan uygulamada açılır pencere sorun çıkarır
    else await A.signInWithPopup(auth, p);
  } catch (e) {
    if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") { try { await A.signInWithRedirect(auth, p); return; } catch (e2) { e = e2; } }
    busy(false);
    if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") setErr(errMsg(e));
  }
}
async function emailSubmit() {
  const em = ($("#em").value || "").trim(), pw = $("#pw") ? $("#pw").value : "";
  setErr(""); busy(true);
  try {
    if (mode === "reset") {
      await A.sendPasswordResetEmail(auth, em);
      busy(false); mode = "in"; drawLogin(); setErr("Şifre sıfırlama bağlantısı e-postana gönderildi. Gereksiz (spam) klasörüne de bak.", true);
    } else if (mode === "up") {
      const nm = ($("#nm").value || "").trim();
      const c = await A.createUserWithEmailAndPassword(auth, em, pw);
      if (nm) { try { await A.updateProfile(c.user, { displayName: nm }); } catch (e) {} }
    } else {
      await A.signInWithEmailAndPassword(auth, em, pw);
    }
  } catch (e) { busy(false); setErr(errMsg(e)); }
}

// ---------- kayıt ----------
let timer = null, pending = null;
function flush() {
  clearTimeout(timer); timer = null;
  if (!pending || !ref) return;
  const S = JSON.parse(JSON.stringify(pending)); pending = null;
  const last = [S.last, S.ex && S.ex.last].filter(Boolean).sort().pop() || null;
  F.updateDoc(ref, { state: S, lastStudy: last, email: user.email || "", name: user.displayName || "", updatedAt: F.serverTimestamp() })
    .catch(e => console.warn("Kayıt buluta yazılamadı (internet gelince tekrar denenecek)", e));
}
addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
addEventListener("pagehide", flush);

// ---------- bildirim ----------
function nextAt(time) {
  const [h, m] = time.split(":").map(Number), d = new Date();
  d.setHours(h, m, 0, 0);
  if (d <= new Date()) d.setDate(d.getDate() + 1);
  return d;
}
async function enableNotify(time) {
  if (!window.FB_READY) return { ok: false, msg: "Demo modda bildirim yok. Firebase ayarları girilince açılır." };
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    return { ok: false, msg: ios ? "iPhone'da bildirim için önce Safari'de Paylaş → Ana Ekrana Ekle yap, sonra uygulamayı ana ekrandaki simgeden açıp burayı tekrar aç." : "Bu tarayıcı bildirimleri desteklemiyor. Chrome ile dene." };
  }
  try {
    M = M || await import(G + "firebase-messaging.js");
    if (!(await M.isSupported())) return { ok: false, msg: "Bu tarayıcı bildirimleri desteklemiyor. Chrome ile dene." };
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, msg: "Bildirim izni verilmedi. Tarayıcı ya da telefon ayarlarından bu siteye bildirim izni verip tekrar dene." };
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const token = await M.getToken(M.getMessaging(app), { vapidKey: window.FB_VAPID, serviceWorkerRegistration: reg });
    if (!token) return { ok: false, msg: "Bildirim anahtarı alınamadı, tekrar dene." };
    await F.setDoc(ref, {
      notify: { enabled: true, time, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Istanbul", nextAt: nextAt(time), origin: location.origin },
      tokens: F.arrayUnion(token)
    }, { merge: true });
    try { localStorage.setItem("ae-token", token); } catch (e) {}
    return { ok: true };
  } catch (e) {
    console.warn(e);
    return { ok: false, msg: "Bildirim açılamadı: " + (e.code || e.message || e) };
  }
}
async function disableNotify() {
  if (!ref) return;
  try { await F.setDoc(ref, { notify: { enabled: false, nextAt: F.deleteField() } }, { merge: true }); } catch (e) { console.warn(e); }
}

window.FBX = {
  queueSave(S) { if (!ref) return; pending = S; clearTimeout(timer); timer = setTimeout(flush, 1500); },
  enableNotify, disableNotify,
  name: () => (user && (user.displayName || (user.email || "").split("@")[0])) || "",
  email: () => (user && user.email) || (window.FB_READY ? "" : "Demo mod · sadece bu cihaz"),
  async signOut() {
    flush();
    if (!window.FB_READY) { user = null; APP_STOP(); drawLogin(); return; }
    // bu cihazdaki bildirim anahtarını hesaptan çıkar, başkası girince ona bildirim gitmesin
    try { const t = localStorage.getItem("ae-token"); if (t && ref) await F.updateDoc(ref, { tokens: F.arrayRemove(t) }); localStorage.removeItem("ae-token"); } catch (e) {}
    await A.signOut(auth);
  },
};

drawSplash();
if (window.FB_READY) boot().catch(e => { console.error(e); drawLogin("Bağlantı kurulamadı. İnternetini kontrol edip sayfayı yenile."); });
else drawLogin();
