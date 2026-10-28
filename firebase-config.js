// Firebase proje ayarları.
// Firebase Console → Proje ayarları → Genel → "Uygulamalarınız" → Web uygulaması → SDK kurulumu ve yapılandırması → "Config"
// Oradaki değerleri aşağıya yapıştır. "BURAYA" yazan değerler kaldıkça uygulama demo modda (sadece bu cihazda) çalışır.
var FB_CONFIG = {
  apiKey: "AIzaSyDT0lvfEcHBPN3AaZMp42C-0iPmyJCT4MY",
  authDomain: "antronorluk-egitimi.firebaseapp.com",
  projectId: "antronorluk-egitimi",
  storageBucket: "antronorluk-egitimi.firebasestorage.app",
  messagingSenderId: "394481668844",
  appId: "1:394481668844:web:85d0b5fd617bcc8b2acbc9"
};
// Cloud Messaging → Web yapılandırması → Web Push sertifikaları → Anahtar çifti (Key pair)
var FB_VAPID = "BOV9zJVpwKFiSWYcqvHpMu2Uk1BoyK_TNoBIkgIPb9CADEAp9ipikscIDYHAqHsDZRjCdjwceVdQHRyl2UgPIFo";
var FB_READY = !/BURAYA/.test(FB_CONFIG.apiKey + FB_CONFIG.projectId);
