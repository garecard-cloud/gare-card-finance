/* ============================================================
   GARE CARD — data layer (sample seed + localStorage store)
   exposes window.GC
   ============================================================ */
(function () {
  const KEY = 'garecard_store_v2';

  const CATS = {
    cards:     { label: 'การ์ดสะสม',   short: 'CARD', code: 'C' },
    sealed:    { label: 'กล่อง/บูสเตอร์', short: 'SEALED', code: 'S' },
    accessory: { label: 'อุปกรณ์เสริม',  short: 'ACC', code: 'A' },
    food:      { label: 'อาหาร/เครื่องดื่ม', short: 'F&B', code: 'F' },
    other:     { label: 'อื่น ๆ',       short: 'MISC', code: 'M' },
  };

  const FIN_CATS = {
    sale:      { label: 'ขายสินค้า', type: 'income' },
    consign:   { label: 'ฝากขาย/คอมมิชชั่น', type: 'income' },
    event:     { label: 'ออกบูธ/อีเวนต์', type: 'income' },
    fnb:       { label: 'อาหารและเครื่องดื่ม', type: 'income' },
    director_loan: { label: 'เงินกู้กรรมการ', type: 'income' },
    restock:   { label: 'รับสินค้าเข้า', type: 'expense' },
    grading:   { label: 'ค่าเกรดดิ้ง', type: 'expense' },
    rent:      { label: 'ค่าเช่า/ที่', type: 'expense' },
    marketing: { label: 'การตลาด/โฆษณา', type: 'expense' },
    shipping:  { label: 'ค่าส่ง/แพ็ค', type: 'expense' },
    renovate:  { label: 'รีโนเวท', type: 'expense' },
    misc:      { label: 'เบ็ดเตล็ด', type: 'expense' },
  };

  // ---- seed products ----
  const P = (id,name,cat,sku,cost,price,qty,reorder,extra={}) =>
    ({ id, name, cat, sku, cost, price, qty, reorder, createdAt:'2026-01-12', supplier:'-', note:'', ...extra });

  const seedProducts = [];

  // ---- seed movements (in / out) over recent weeks ----
  let mid = 100;
  const M = (productId,type,qty,unitPrice,date,note='') =>
    ({ id:'MV-'+(mid++), productId, type, qty, unitPrice, date, note });

  const seedMovements = [];

  // ---- seed finance transactions ----
  let tid = 200;
  const T = (type,cat,amount,date,note='') => ({ id:'TX-'+(tid++), type, cat, amount, date, note, slip:null });
  const seedTx = [];

  function freshState() {
    return {
      startingCapital: 470000,
      products: seedProducts.map(p => ({ ...p })),
      movements: seedMovements.map(m => ({ ...m })),
      transactions: seedTx.map(t => ({ ...t })),
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.startingCapital == null) s.startingCapital = 470000;
        return s;
      }
    } catch (e) {}
    const s = freshState();
    save(s);
    return s;
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }
  function reset() {
    const s = freshState();
    save(s);
    return s;
  }

  // ---- helpers ----
  const money = (n, dp=0) => '฿' + Number(n||0).toLocaleString('th-TH', { minimumFractionDigits:dp, maximumFractionDigits:dp });
  const moneyShort = (n) => {
    n = Number(n||0);
    if (Math.abs(n) >= 1e6) return '฿' + (n/1e6).toFixed(2) + 'M';
    if (Math.abs(n) >= 1e3) return '฿' + (n/1e3).toFixed(1) + 'K';
    return '฿' + n.toLocaleString('th-TH');
  };
  const fmtDate = (d) => {
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('th-TH', { day:'2-digit', month:'short', year:'2-digit' });
  };
  const uid = (pre) => pre + '-' + Math.random().toString(36).slice(2,7).toUpperCase();

  window.GC = { KEY, CATS, FIN_CATS, load, save, reset, freshState, money, moneyShort, fmtDate, uid };
})();
