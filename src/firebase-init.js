/* ================================================================
   GARE CARD — Firebase Init + Auth/DB wrappers
   Exports: window.GCFirebaseReady, window.GCAuth, window.GCDB
   ================================================================ */
(function () {
  const cfg = window.FIREBASE_CONFIG || {};
  const isConfigured = cfg.apiKey && !cfg.apiKey.startsWith('YOUR_');

  window.GCFirebaseReady = false;
  window.GCAuth = null;
  window.GCDB = null;

  if (!isConfigured) {
    console.info('[GARE CARD] Firebase ยังไม่ได้ตั้งค่า — ใช้ localStorage mode');
    return;
  }

  try {
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    window.GCAuth = firebase.auth();
    window.GCDB = firebase.firestore();
    window.GCDB.settings({ experimentalForceLongPolling: false });
    window.GCFirebaseReady = true;
    console.info('[GARE CARD] Firebase พร้อมใช้งาน ✓');
  } catch (e) {
    console.error('[GARE CARD] Firebase init error:', e);
  }
})();
