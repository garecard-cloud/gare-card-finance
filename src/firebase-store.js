/* ================================================================
   GARE CARD — Firestore data layer
   window.gcStore = FirestoreStore instance (set by app.jsx)
   ================================================================ */
(function () {
  class FirestoreStore {
    constructor(db, storeId) {
      this.db = db;
      this.storeId = storeId;
      this.ref = db.collection('gc_stores').doc(storeId);
      this._unsubs = [];
      this._stateListeners = [];
      this._posListeners = [];
    }

    /* ---- User Management ---- */
    async getUserRole(uid) {
      try {
        const doc = await this.ref.collection('users').doc(uid).get();
        return doc.exists ? doc.data().role : null;
      } catch { return null; }
    }

    async setUser(uid, data) {
      await this.ref.collection('users').doc(uid).set(data, { merge: true });
    }

    async isFirstUser() {
      const snap = await this.ref.collection('users').limit(1).get();
      return snap.empty;
    }

    async getUsers() {
      const snap = await this.ref.collection('users').get();
      return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    }

    async removeUser(uid) {
      await this.ref.collection('users').doc(uid).delete();
    }

    /* ---- Real-time State Sync ---- */
    subscribeAll(onChange) {
      const parts = { products: null, transactions: null, movements: null, settings: null };
      const flags = { products: false, transactions: false, movements: false, settings: false };
      const tryNotify = () => {
        if (!flags.products || !flags.transactions || !flags.movements || !flags.settings) return;
        onChange({
          products: parts.products || [],
          transactions: parts.transactions || [],
          movements: parts.movements || [],
          startingCapital: parts.settings?.startingCapital ?? 0,
        });
      };
      const u1 = this.ref.collection('products').onSnapshot(snap => {
        parts.products = snap.docs.map(d => d.data()); flags.products = true; tryNotify();
      }, e => console.warn('products:', e));
      const u2 = this.ref.collection('transactions').onSnapshot(snap => {
        parts.transactions = snap.docs.map(d => d.data()); flags.transactions = true; tryNotify();
      }, e => console.warn('transactions:', e));
      const u3 = this.ref.collection('movements').onSnapshot(snap => {
        parts.movements = snap.docs.map(d => d.data()); flags.movements = true; tryNotify();
      }, e => console.warn('movements:', e));
      const u4 = this.ref.collection('settings').doc('main').onSnapshot(doc => {
        parts.settings = doc.exists ? doc.data() : {}; flags.settings = true; tryNotify();
      }, e => console.warn('settings:', e));
      this._unsubs.push(u1, u2, u3, u4);
      return () => [u1, u2, u3, u4].forEach(u => u());
    }

    /* ---- Individual writes (called per operation) ---- */
    batch() { return this.db.batch(); }

    async saveProduct(p) {
      await this.ref.collection('products').doc(p.id).set(p);
    }
    async deleteProduct(id) {
      await this.ref.collection('products').doc(id).delete();
    }
    async saveTransaction(tx) {
      const { slip, ...safe } = tx; // Don't store base64 slips in Firestore
      await this.ref.collection('transactions').doc(tx.id).set(safe);
    }
    async deleteTransaction(id) {
      await this.ref.collection('transactions').doc(id).delete();
    }
    async saveMovement(mv) {
      await this.ref.collection('movements').doc(mv.id).set(mv);
    }
    async deleteMovement(id) {
      await this.ref.collection('movements').doc(id).delete();
    }
    async saveSettings(s) {
      await this.ref.collection('settings').doc('main').set(s, { merge: true });
    }

    /* ---- POS Events ---- */
    subscribePOSEvents(callback) {
      const unsub = this.ref.collection('pos_events')
        .orderBy('timestamp', 'desc').limit(50)
        .onSnapshot(snap => {
          callback(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })));
        }, err => console.warn('pos_events listener:', err));
      this._unsubs.push(unsub);
      return unsub;
    }

    async markPOSProcessed(firestoreId) {
      await this.ref.collection('pos_events').doc(firestoreId).update({
        processed: true,
        processedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }

    async addPOSEvent(event) {
      await this.ref.collection('pos_events').add({
        ...event,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        processed: false,
      });
    }

    /* ---- Seed initial data to Firestore ---- */
    async seedFromLocalState(state) {
      const batchSize = 400; // Firestore batch limit is 500
      let batch = this.db.batch();
      let count = 0;
      const commit = async () => { await batch.commit(); batch = this.db.batch(); count = 0; };

      for (const p of (state.products || [])) {
        batch.set(this.ref.collection('products').doc(p.id), p);
        if (++count >= batchSize) await commit();
      }
      for (const t of (state.transactions || [])) {
        const { slip, ...safe } = t;
        batch.set(this.ref.collection('transactions').doc(t.id), safe);
        if (++count >= batchSize) await commit();
      }
      for (const m of (state.movements || [])) {
        batch.set(this.ref.collection('movements').doc(m.id), m);
        if (++count >= batchSize) await commit();
      }
      batch.set(this.ref.collection('settings').doc('main'), { startingCapital: state.startingCapital || 0 });
      await batch.commit();
    }

    destroy() {
      this._unsubs.forEach(u => u());
      this._unsubs = [];
    }
  }

  window.FirestoreStore = FirestoreStore;
})();
