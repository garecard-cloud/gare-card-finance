/* ============================================================
   GARE CARD — analytics helpers (extends window.GC)
   ============================================================ */
(function () {
  const G = window.GC;

  G.findProduct = (state, id) => state.products.find(p => p.id === id);

  G.totals = (state) => {
    let income = 0, expense = 0;
    for (const t of state.transactions) {
      if (t.type === 'income') income += +t.amount || 0;
      else expense += +t.amount || 0;
    }
    return { income, expense, profit: income - expense };
  };

  // value of current inventory
  G.stockValue = (state) => {
    let cost = 0, retail = 0, units = 0;
    for (const p of state.products) {
      cost += (p.qty || 0) * (p.cost || 0);
      retail += (p.qty || 0) * (p.price || 0);
      units += p.qty || 0;
    }
    return { cost, retail, units, margin: retail - cost };
  };

  // top sellers from 'out' movements
  G.topSellers = (state, n = 10) => {
    const map = {};
    for (const m of state.movements) {
      if (m.type !== 'out') continue;
      const p = G.findProduct(state, m.productId);
      if (!p) continue;
      if (!map[m.productId]) map[m.productId] = { product: p, qty: 0, revenue: 0, profit: 0 };
      const r = map[m.productId];
      r.qty += m.qty;
      r.revenue += m.qty * (m.unitPrice || p.price || 0);
      r.profit += m.qty * ((m.unitPrice || p.price || 0) - (p.cost || 0));
    }
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, n);
  };

  G.lowStock = (state) =>
    state.products.filter(p => p.qty <= (p.reorder || 0)).sort((a, b) => (a.qty - a.reorder) - (b.qty - b.reorder));

  // enrich movements with product + sorted desc by date
  G.movementFeed = (state, productId = null) => {
    let list = state.movements.map(m => ({ ...m, product: G.findProduct(state, m.productId) }));
    if (productId) list = list.filter(m => m.productId === productId);
    return list.sort((a, b) => new Date(b.date) - new Date(a.date) || b.id.localeCompare(a.id));
  };

  // income/expense grouped by day (last ~ entries) for chart
  G.dailyFlow = (state) => {
    const map = {};
    for (const t of state.transactions) {
      const d = t.date;
      if (!map[d]) map[d] = { date: d, income: 0, expense: 0 };
      if (t.type === 'income') map[d].income += +t.amount || 0;
      else map[d].expense += +t.amount || 0;
    }
    return Object.values(map).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // sales (out movements) per category
  G.salesByCat = (state) => {
    const map = {};
    for (const m of state.movements) {
      if (m.type !== 'out') continue;
      const p = G.findProduct(state, m.productId);
      if (!p) continue;
      const c = p.cat;
      map[c] = (map[c] || 0) + m.qty * (m.unitPrice || p.price || 0);
    }
    return Object.entries(map).map(([cat, value]) => ({ cat, value, label: (G.CATS[cat] || G.CATS.other).label }))
      .sort((a, b) => b.value - a.value);
  };

  // transactions grouped by category for a given type
  G.txByCat = (state, type) => {
    const map = {};
    for (const t of state.transactions) {
      if (t.type !== type) continue;
      const c = t.cat || 'misc';
      if (!map[c]) map[c] = { cat: c, label: (G.FIN_CATS[c] || {}).label || c, value: 0, count: 0 };
      map[c].value += +t.amount || 0;
      map[c].count += 1;
    }
    return Object.values(map).sort((a, b) => b.value - a.value);
  };

  // stock value grouped by product category
  G.stockByCat = (state) => {
    const map = {};
    for (const p of state.products) {
      const c = p.cat;
      if (!map[c]) map[c] = { cat: c, label: (G.CATS[c] || G.CATS.other).label, cost: 0, retail: 0, units: 0, items: 0 };
      map[c].cost += (p.qty || 0) * (p.cost || 0);
      map[c].retail += (p.qty || 0) * (p.price || 0);
      map[c].units += p.qty || 0;
      map[c].items += 1;
    }
    return Object.values(map).sort((a, b) => b.cost - a.cost);
  };

  // CSV builder + download
  G.downloadCSV = (filename, rows) => {
    const esc = (v) => {
      v = v == null ? '' : String(v);
      if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
      return v;
    };
    const csv = '﻿' + rows.map(r => r.map(esc).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  };
})();
