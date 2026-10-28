// GitHub Actions ile 15 dakikada bir çalışır: hatırlatma saati gelen ve o gün çalışmamış kullanıcılara bildirim gönderir.
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, Timestamp, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SA)) });
const ORIGIN = process.env.APP_ORIGIN || "https://dansyeribilgi-cmyk.github.io";

const localDay = (tz, d = new Date()) => {
  const f = z => new Intl.DateTimeFormat("en-CA", { timeZone: z, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  try { return f(tz); } catch (e) { return f("Europe/Istanbul"); }
};
const dayDiff = (a, b) => Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 864e5);

function message(lastStudy, today, name) {
  const hi = name ? name.split(" ")[0] + ", " : "";
  if (!lastStudy) return { title: "⏱ Günün egzersizi hazır", body: hi + "5 dakikanı ayır, ilk adımı bugün at!" };
  const d = dayDiff(today, lastStudy);
  if (d <= 1) return { title: "Bugün henüz çalışmadın 🔥", body: hi + "serini koru: 5 dakikalık egzersiz seni bekliyor." };
  if (d === 2) return { title: "1 gündür çalışmıyoruz 😕", body: hi + "bugün 5 dakikayla geri dönelim mi?" };
  if (d === 3) return { title: "2 gündür çalışmıyoruz 😟", body: hi + "sınav yaklaşıyor, kısa bir egzersizle başlayalım." };
  return { title: `${d - 1} gündür çalışmıyoruz 😢`, body: hi + "seni özledik! Sadece 5 dakika, hadi başlayalım." };
}

(async () => {
  const db = getFirestore(), now = Date.now();
  // Bildirimi kapatanlarda nextAt silinir; bu yüzden tek alanlı sorgu yeterli (ek indeks gerekmez)
  const snap = await db.collection("users").where("notify.nextAt", "<=", Timestamp.fromMillis(now)).limit(500).get();
  let sent = 0;
  for (const doc of snap.docs) {
    const u = doc.data(), n = u.notify || {};
    let next = n.nextAt.toMillis();
    while (next <= now) next += 864e5;
    const upd = { "notify.nextAt": Timestamp.fromMillis(next), "notify.lastRun": Timestamp.fromMillis(now) };
    // Saat 2 saatten fazla geçtiyse (ör. zamanlayıcı gecikti) bugünü atla, gece yarısı bildirim gitmesin
    const late = now - n.nextAt.toMillis() > 2 * 3600e3;
    const today = localDay(n.tz || "Europe/Istanbul");
    const tokens = (u.tokens || []).filter(Boolean);
    if (n.enabled && !late && u.lastStudy !== today && tokens.length) {
      const m = message(u.lastStudy, today, u.name || "");
      const origin = n.origin || ORIGIN;
      const res = await getMessaging().sendEachForMulticast({
        tokens,
        webpush: {
          notification: { title: m.title, body: m.body, icon: origin + "/icon-192.png", badge: origin + "/icon-192.png", tag: "gunluk", renotify: true, data: { link: origin + "/#gunluk" } },
          fcmOptions: { link: origin + "/#gunluk" },
        },
      });
      const bad = [];
      res.responses.forEach((r, i) => {
        const c = r.error && r.error.code;
        if (c === "messaging/registration-token-not-registered" || c === "messaging/invalid-registration-token" || c === "messaging/invalid-argument") bad.push(tokens[i]);
      });
      if (bad.length) upd.tokens = FieldValue.arrayRemove(...bad);
      sent += res.successCount;
      upd["notify.lastSent"] = Timestamp.fromMillis(now);
    }
    await doc.ref.update(upd);
  }
  console.log(`kontrol: ${snap.size} kullanıcı, gönderilen bildirim: ${sent}`);
})().catch(e => { console.error(e); process.exit(1); });
