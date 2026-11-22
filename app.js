// SEM VLOŽ SVOJU URL Z GOOGLE APPS SCRIPTU (končí na /exec)
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzaaHh3bFkrxZuXs5-7TY4HSYrjG4TAubRZgvTrV0lSHTjwkhslcnjAbfAGw-5KmzJV/exec';

const LOCAL_FALLBACK_KEY = 'vajb_space_github_cache_v1';

const DEFAULT_BARBERS = [
  { id: 'dominik', name: 'Dominik', color: 'bg-[#0097B2] text-white', commissionRate: 100 },
  { id: 'radovan', name: 'Radovan', color: 'bg-[#231F20] text-white', commissionRate: 100 },
  { id: 'frantisek', name: 'František', color: 'bg-[#007A91] text-white', commissionRate: 100 },
  { id: 'juraj', name: 'Juraj', color: 'bg-[#FF8C87] text-[#231F20]', commissionRate: 100 },
  { id: 'kristof', name: 'Krištof', color: 'bg-[#FFB6B3] text-[#231F20]', commissionRate: 50 }
];

const DEFAULT_PRODUCTS = [
  { id: 'tailors_salt_spray', name: 'Tailor´s Salt Spray 200 ml', category: 'Sprej', badge: '200 ml', accent: 'teal', buyPrice: 10.91, sellPrice: 16.00 },
  { id: 'tailors_clay', name: 'Tailor´s Clay 100 ml', category: 'Clay', badge: '100 ml', accent: 'slate', buyPrice: 11.76, sellPrice: 17.00 },
  { id: 'murray_ny_water', name: 'Florida Water NY 221 ml', category: 'Kolínska', badge: '221 ml', accent: 'teal', buyPrice: 7.13, sellPrice: 16.00 },
  { id: 'murray_peru_water', name: 'Florida Water Peru 270 ml', category: 'Kolínska', badge: '270 ml', accent: 'amber', buyPrice: 11.07, sellPrice: 17.00 },
  { id: 'immortal_nyc_venom', name: 'Immortal NYC Venom 150 ml', category: 'Styling', badge: '150 ml', accent: 'slate', buyPrice: 4.00, sellPrice: 8.00 },
  { id: 'reuzel_clay_matte', name: 'Reuzel Clay Matte Pomade 95 g', category: 'Pomáda', badge: '95 g', accent: 'teal', buyPrice: 12.30, sellPrice: 18.00 },
  { id: 'reuzel_extreme_hold', name: 'Reuzel Extreme Hold Matte Pomade 95 g', category: 'Pomáda', badge: '95 g', accent: 'slate', buyPrice: 14.76, sellPrice: 18.00 },
  { id: 'reuzel_surf_cream', name: 'Reuzel Surf Cream 95 g', category: 'Krém', badge: '95 g', accent: 'sky', buyPrice: 14.76, sellPrice: 20.00 }
];

const ACCENT_STYLES = {
  teal: { pill: 'bg-[#0097B2]/10 text-[#007A91] border-[#0097B2]/25', bar: 'bg-[#0097B2]' },
  slate: { pill: 'bg-slate-100 text-slate-700 border-slate-200', bar: 'bg-[#231F20]' },
  amber: { pill: 'bg-amber-50 text-amber-800 border-amber-200', bar: 'bg-amber-500' },
  sky: { pill: 'bg-sky-50 text-sky-800 border-sky-200', bar: 'bg-sky-600' }
};

const BARBER_AVATAR_STYLES = [
  'bg-[#0097B2] text-white',
  'bg-[#231F20] text-white',
  'bg-[#007A91] text-white',
  'bg-[#FF8C87] text-[#231F20]',
  'bg-[#FFB6B3] text-[#231F20]'
];

let state = {
  activeTab: 'pos',
  isAdminUnlocked: false,
  adminPassword: '2026',
  selectedBarberId: null,
  selectedProductId: null,
  quantity: 1,
  shippingRate: 5,
  commissionRate: 100,
  barbers: JSON.parse(JSON.stringify(DEFAULT_BARBERS)),
  products: JSON.parse(JSON.stringify(DEFAULT_PRODUCTS)),
  sales: [],
  isSyncing: false
};

let toastTimeout = null;

function isApiConfigured() {
  return GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.startsWith('https://');
}

function initApp() {
  setupAutoLockListeners();
  loadLocalFallback();
  renderAll();
  syncFromCloud(false);
}

function setupAutoLockListeners() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.isAdminUnlocked) lockAdminAndReturn(true);
  });
  window.addEventListener('blur', () => {
    if (state.isAdminUnlocked) lockAdminAndReturn(true);
  });
}

function setSyncBadge(text, isError = false) {
  const badge = document.getElementById('syncBadge');
  if (!badge) return;
  badge.textContent = text;
  badge.className = isError
    ? 'px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200'
    : 'px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-[#FFB6B3]/35 text-[#231F20] border border-[#231F20]/15';
}

async function apiRequest(payload = null) {
  if (!isApiConfigured()) return null;
  if (!payload) {
    const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'GET' });
    return res.json();
  }
  const res = await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function syncFromCloud(manual = false) {
  if (state.isSyncing) return;
  if (!isApiConfigured()) {
    setSyncBadge('Doplň URL z Google Tabuľky', true);
    return;
  }

  state.isSyncing = true;
  setSyncBadge('Synchronizujem...');
  try {
    const json = await apiRequest(null);
    if (json && json.ok && json.data) {
      applyCloudPayload(json.data);
      setSyncBadge('Google Cloud Sync');
      renderAll();
      if (manual) showToast('Synchronizované', 'Dáta boli načítané z Google Tabuľky.');
    } else {
      throw new Error(json && json.error ? json.error : 'Neplatná odpoveď zo servera');
    }
  } catch (err) {
    setSyncBadge('Offline režim', true);
    if (manual) showToast('Chyba spojenia', err.message || 'Skontroluj URL skriptu.');
  } finally {
    state.isSyncing = false;
  }
}

function applyCloudPayload(res) {
  if (!res) return;
  if (typeof res.shippingRate === 'number' && !isNaN(res.shippingRate)) state.shippingRate = clampRate(res.shippingRate);
  if (typeof res.commissionRate === 'number' && !isNaN(res.commissionRate)) state.commissionRate = clampRate(res.commissionRate);
  if (typeof res.adminPassword === 'string' && res.adminPassword.trim()) state.adminPassword = res.adminPassword.trim();

  if (Array.isArray(res.barbers) && res.barbers.length > 0) {
    state.barbers = res.barbers.map((b, idx) => {
      const isKristof = String(b.id).toLowerCase() === 'kristof' || String(b.name || '').trim().toLowerCase().startsWith('kri');
      const rate = (typeof b.commissionRate === 'number' && !isNaN(b.commissionRate)) ? clampRate(b.commissionRate) : (isKristof ? 50 : 100);
      return {
        id: String(b.id),
        name: String(b.name),
        color: b.color || BARBER_AVATAR_STYLES[idx % BARBER_AVATAR_STYLES.length],
        commissionRate: rate
      };
    });
  }

  if (Array.isArray(res.products) && res.products.length > 0) {
    const metaMap = {};
    DEFAULT_PRODUCTS.forEach(dp => { metaMap[dp.id] = dp; });
    state.products = res.products.map(p => {
      const meta = metaMap[p.id] || { category: 'Produkt', badge: '', accent: 'teal' };
      return {
        id: String(p.id),
        name: String(p.name),
        category: meta.category,
        badge: meta.badge,
        accent: meta.accent,
        buyPrice: roundMoney(p.buyPrice),
        sellPrice: roundMoney(p.sellPrice)
      };
    });
  }

  if (Array.isArray(res.sales)) state.sales = res.sales;
  saveLocalFallback();
}

function loadLocalFallback() {
  try {
    const raw = localStorage.getItem(LOCAL_FALLBACK_KEY);
    if (raw) applyCloudPayload(JSON.parse(raw));
  } catch (e) {}
}

function saveLocalFallback() {
  try {
    localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify({
      shippingRate: state.shippingRate,
      commissionRate: state.commissionRate,
      adminPassword: state.adminPassword,
      barbers: state.barbers,
      products: state.products,
      sales: state.sales
    }));
  } catch (e) {}
}

function roundMoney(val) {
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
}

function clampRate(val) {
  const n = Number(val);
  return isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
}

function formatEur(val) {
  return roundMoney(val).toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatDateTime(isoStr) {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return String(isoStr);
  return d.toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getBarberCommissionRate(barberId, barberName) {
  const found = state.barbers.find(b => b.id === barberId);
  if (found && typeof found.commissionRate === 'number' && !isNaN(found.commissionRate)) return clampRate(found.commissionRate);
  const isKristof = String(barberId || '').toLowerCase() === 'kristof' || String(barberName || '').trim().toLowerCase().startsWith('kri');
  return isKristof ? 50 : clampRate(state.commissionRate);
}

function calculateSaleFinancials(sale) {
  const revenue = roundMoney(sale.revenue);
  const grossProfit = roundMoney(sale.grossProfit);
  const shippingReserve = roundMoney(Math.max(0, grossProfit) * (state.shippingRate / 100));
  const baseAfterShipping = roundMoney(grossProfit - shippingReserve);
  const rate = getBarberCommissionRate(sale.barberId, sale.barberName);
  const commission = roundMoney(Math.max(0, baseAfterShipping) * (rate / 100));
  const shopNetProfit = roundMoney(baseAfterShipping - commission);
  return { revenue, grossProfit, shippingReserve, baseAfterShipping, commissionRate: rate, commission, shopNetProfit };
}

function showToast(title, body) {
  const el = document.getElementById('toastNotification');
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastBody').textContent = body;
  el.classList.remove('toast-exit');
  el.classList.add('toast-enter');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    el.classList.remove('toast-enter');
    el.classList.add('toast-exit');
  }, 3200);
}

function switchTab(tab) {
  if (tab === 'admin' && !state.isAdminUnlocked) {
    openPinModal();
    return;
  }
  if (tab === 'pos' && state.isAdminUnlocked) state.isAdminUnlocked = false;

  state.activeTab = tab;
  const posView = document.getElementById('posView');
  const adminView = document.getElementById('adminView');
  const tabPosBtn = document.getElementById('tabPosBtn');
  const tabAdminBtn = document.getElementById('tabAdminBtn');

  if (tab === 'pos') {
    posView.classList.remove('hidden');
    adminView.classList.add('hidden');
    tabPosBtn.className = 'flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-lg text-sm font-bold transition-all duration-150 bg-[#0097B2] text-white shadow-xs';
    tabAdminBtn.className = 'flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-lg text-sm font-bold transition-all duration-150 text-[#231F20]/75 hover:text-[#231F20]';
    renderPOS();
  } else {
    posView.classList.add('hidden');
    adminView.classList.remove('hidden');
    tabAdminBtn.className = 'flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-lg text-sm font-bold transition-all duration-150 bg-[#0097B2] text-white shadow-xs';
    tabPosBtn.className = 'flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-lg text-sm font-bold transition-all duration-150 text-[#231F20]/75 hover:text-[#231F20]';
    renderAdmin();
  }
}

function openPinModal() {
  const modal = document.getElementById('pinModal');
  const input = document.getElementById('pinModalInput');
  document.getElementById('pinModalError').classList.add('hidden');
  input.value = '';
  modal.classList.remove('hidden');
  setTimeout(() => input.focus(), 50);
}

function closePinModal() {
  document.getElementById('pinModal').classList.add('hidden');
}

function submitAdminPin(event) {
  event.preventDefault();
  const input = document.getElementById('pinModalInput');
  if ((input.value || '').trim() === (state.adminPassword || '2026').trim()) {
    state.isAdminUnlocked = true;
    closePinModal();
    switchTab('admin');
  } else {
    document.getElementById('pinModalError').classList.remove('hidden');
    input.value = '';
    input.focus();
  }
}

function lockAdminAndReturn(silent = false) {
  state.isAdminUnlocked = false;
  switchTab('pos');
  if (!silent) showToast('Prehľad zamknutý', 'Sekcia majiteľa bola opäť uzamknutá heslom.');
}

function selectBarber(id) { state.selectedBarberId = id; renderPOS(); }
function selectProduct(id) { state.selectedProductId = id; renderPOS(); }
function setQty(val) { state.quantity = Math.max(1, Math.min(50, Number(val) || 1)); renderPOS(); }
function changeQty(delta) { setQty(state.quantity + delta); }

async function recordSale() {
  const barber = state.barbers.find(b => b.id === state.selectedBarberId);
  const product = state.products.find(p => p.id === state.selectedProductId);
  if (!barber || !product) return showToast('Chýba výber', 'Najprv vyber barbera a produkt.');

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const qty = state.quantity;
  const revenue = roundMoney(product.sellPrice * qty);
  const grossProfit = roundMoney(revenue - product.buyPrice * qty);

  const saleObj = {
    id: `sale_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now.toISOString(),
    month: ym,
    barberId: barber.id,
    barberName: barber.name,
    productId: product.id,
    productName: product.name,
    qty,
    buyPrice: product.buyPrice,
    sellPrice: product.sellPrice,
    revenue,
    grossProfit
  };

  const btn = document.getElementById('submitSaleBtn');
  const btnText = document.getElementById('submitSaleBtnText');
  btn.disabled = true;
  btnText.textContent = 'UKLADÁM...';

  try {
    if (isApiConfigured()) {
      const json = await apiRequest({ action: 'recordSale', sale: saleObj });
      if (json && json.ok && json.data) applyCloudPayload(json.data);
      else state.sales.unshift(saleObj);
    } else {
      state.sales.unshift(saleObj);
      saveLocalFallback();
    }

    state.selectedBarberId = null;
    state.selectedProductId = null;
    state.quantity = 1;
    renderPOS();
    showToast(`Zapísané: ${barber.name} • ${qty} ks`, `${product.name} bol zapísaný.`);
  } catch (err) {
    showToast('Chyba ukladania', err.message || 'Skús znova.');
  } finally {
    btnText.textContent = 'ZAPÍSAŤ PREDAJ';
    btn.disabled = !(state.selectedBarberId && state.selectedProductId);
  }
}

function renderPOS() {
  const barberGrid = document.getElementById('barberGrid');
  const productGrid = document.getElementById('productGrid');
  const activeBarber = state.barbers.find(b => b.id === state.selectedBarberId);
  const activeProduct = state.products.find(p => p.id === state.selectedProductId);

  document.getElementById('selectedBarberLabel').textContent = activeBarber ? `Vybraný: ${activeBarber.name}` : 'Nevybraný';
  document.getElementById('selectedProductLabel').textContent = activeProduct ? `Vybraný: ${activeProduct.name}` : 'Nevybraný';

  barberGrid.innerHTML = state.barbers.map((b, idx) => {
    const isSelected = b.id === state.selectedBarberId;
    const initials = b.name.slice(0, 2).toUpperCase();
    const badgeStyle = b.color || BARBER_AVATAR_STYLES[idx % BARBER_AVATAR_STYLES.length];
    return `
      <button type="button" onclick="selectBarber('${escapeHtml(b.id)}')" class="flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all duration-150 ${isSelected ? 'bg-[#0097B2]/10 border-[#0097B2] shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}">
        <div class="w-9 h-9 rounded-lg ${badgeStyle} font-extrabold text-xs flex items-center justify-center shrink-0">${escapeHtml(initials)}</div>
        <div class="min-w-0 flex-1">
          <div class="font-bold text-sm sm:text-base text-slate-900 truncate">${escapeHtml(b.name)}</div>
          <div class="text-[11px] font-medium ${isSelected ? 'text-[#007A91]' : 'text-slate-400'}">${isSelected ? 'Vybraný' : 'Vybrať'}</div>
        </div>
      </button>
    `;
  }).join('');

  productGrid.innerHTML = state.products.map(p => {
    const isSelected = p.id === state.selectedProductId;
    const acc = ACCENT_STYLES[p.accent] || ACCENT_STYLES.teal;
    return `
      <button type="button" onclick="selectProduct('${escapeHtml(p.id)}')" class="relative overflow-hidden flex flex-col justify-between text-left p-4 rounded-xl border-2 transition-all duration-150 min-h-[116px] ${isSelected ? 'bg-[#0097B2]/10 border-[#0097B2] shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}">
        <div class="absolute top-0 left-0 right-0 h-1 ${isSelected ? 'bg-[#0097B2]' : acc.bar}"></div>
        <div class="flex items-center justify-between gap-2 w-full mb-2 pt-0.5">
          <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${acc.pill}">${escapeHtml(p.category || 'Produkt')}</span>
          ${p.badge ? `<span class="text-[11px] font-semibold text-slate-400">${escapeHtml(p.badge)}</span>` : ''}
        </div>
        <div class="font-bold text-sm sm:text-[15px] text-slate-900 leading-snug">${escapeHtml(p.name)}</div>
        <div class="mt-2.5 text-[11px] font-semibold ${isSelected ? 'text-[#007A91]' : 'text-slate-400'}">${isSelected ? '✓ Vybrané' : 'Vybrať'}</div>
      </button>
    `;
  }).join('');

  document.getElementById('qtyDisplay').textContent = String(state.quantity);
  [1, 2, 3].forEach(n => {
    const btn = document.getElementById(`quickQty${n}`);
    btn.className = state.quantity === n
      ? 'px-3 py-1.5 rounded-md text-xs font-bold transition bg-[#231F20] text-white'
      : 'px-3 py-1.5 rounded-md text-xs font-bold transition text-slate-600 hover:text-slate-900';
  });

  const hint = document.getElementById('posSummaryHint');
  const submitBtn = document.getElementById('submitSaleBtn');
  if (activeBarber && activeProduct) {
    hint.innerHTML = `<span class="text-slate-900 font-bold">${escapeHtml(activeBarber.name)}</span> • <span class="text-[#007A91] font-bold">${escapeHtml(activeProduct.name)}</span> (${state.quantity} ks)`;
    submitBtn.disabled = false;
  } else {
    hint.textContent = activeBarber ? `Vybraný: ${activeBarber.name} — vyber produkt` : 'Vyber barbera a produkt';
    submitBtn.disabled = true;
  }

  const recent = state.sales.slice(0, 10);
  document.getElementById('recentCountBadge').textContent = `${state.sales.length} záznamov`;
  document.getElementById('recentSalesBody').innerHTML = recent.length === 0
    ? `<tr><td colspan="4" class="py-8 text-center text-slate-400 text-sm">Zatiaľ nie sú zapísané žiadne predaje.</td></tr>`
    : recent.map(s => `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-3 px-3 text-xs text-slate-500 whitespace-nowrap font-mono">${escapeHtml(formatDateTime(s.timestamp))}</td>
        <td class="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">${escapeHtml(s.barberName)}</td>
        <td class="py-3 px-3 font-medium text-slate-700">${escapeHtml(s.productName)}</td>
        <td class="py-3 px-3 text-right font-extrabold text-slate-900 whitespace-nowrap">${s.qty} ks</td>
      </tr>
    `).join('');
}

function renderAdmin() {
  const monthFilter = document.getElementById('monthFilter');
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthsSet = new Set([currentMonth]);
  state.sales.forEach(s => { if (s.month) monthsSet.add(s.month); });
  const sortedMonths = Array.from(monthsSet).sort().reverse();
  const prevSelected = monthFilter.value || currentMonth;

  monthFilter.innerHTML = [`<option value="ALL">Všetky mesiace spolu</option>`, ...sortedMonths.map(m => `<option value="${m}">Obdobie: ${m}</option>`)].join('');
  monthFilter.value = (prevSelected === 'ALL' || sortedMonths.includes(prevSelected)) ? prevSelected : currentMonth;

  const selectedMonth = monthFilter.value;
  const filteredSales = selectedMonth === 'ALL' ? state.sales : state.sales.filter(s => s.month === selectedMonth);

  document.getElementById('shippingRateInput').value = state.shippingRate;
  document.getElementById('commissionRateInput').value = state.commissionRate;
  document.getElementById('adminPinInput').value = state.adminPassword;
  document.getElementById('bannerShippingInfo').textContent = `${state.shippingRate} % z hrubého zisku`;
  document.getElementById('bannerCommissionInfo').textContent = state.barbers.map(b => `${b.name} ${getBarberCommissionRate(b.id, b.name)} %`).join(' • ');
  document.getElementById('kpiShippingSub').textContent = `${state.shippingRate} % z hrubého zisku`;
  document.getElementById('payoutPeriodBadge').textContent = selectedMonth === 'ALL' ? 'Všetky obdobia' : `Mesiac ${selectedMonth}`;

  let totalUnits = 0, totalRevenue = 0, totalGrossProfit = 0, totalShippingReserve = 0, totalCommissions = 0, totalShopNetProfit = 0;
  const barberMap = {};
  state.barbers.forEach(b => {
    barberMap[b.id] = { id: b.id, name: b.name, rate: getBarberCommissionRate(b.id, b.name), units: 0, revenue: 0, grossProfit: 0, shippingReserve: 0, baseAfterShipping: 0, commission: 0 };
  });

  filteredSales.forEach(s => {
    const fin = calculateSaleFinancials(s);
    totalUnits += s.qty;
    totalRevenue = roundMoney(totalRevenue + fin.revenue);
    totalGrossProfit = roundMoney(totalGrossProfit + fin.grossProfit);
    totalShippingReserve = roundMoney(totalShippingReserve + fin.shippingReserve);
    totalCommissions = roundMoney(totalCommissions + fin.commission);
    totalShopNetProfit = roundMoney(totalShopNetProfit + fin.shopNetProfit);

    if (!barberMap[s.barberId]) {
      barberMap[s.barberId] = { id: s.barberId, name: s.barberName, rate: fin.commissionRate, units: 0, revenue: 0, grossProfit: 0, shippingReserve: 0, baseAfterShipping: 0, commission: 0 };
    }
    const entry = barberMap[s.barberId];
    entry.units += s.qty;
    entry.revenue = roundMoney(entry.revenue + fin.revenue);
    entry.grossProfit = roundMoney(entry.grossProfit + fin.grossProfit);
    entry.shippingReserve = roundMoney(entry.shippingReserve + fin.shippingReserve);
    entry.baseAfterShipping = roundMoney(entry.baseAfterShipping + fin.baseAfterShipping);
    entry.commission = roundMoney(entry.commission + fin.commission);
  });

  document.getElementById('kpiRevenue').textContent = formatEur(totalRevenue);
  document.getElementById('kpiUnitsText').textContent = `${totalUnits} predaných kusov`;
  document.getElementById('kpiGrossProfit').textContent = formatEur(totalGrossProfit);
  document.getElementById('kpiShippingReserve').textContent = formatEur(totalShippingReserve);
  document.getElementById('kpiCommissions').textContent = formatEur(totalCommissions);
  document.getElementById('kpiShopNetProfit').textContent = formatEur(totalShopNetProfit);

  document.getElementById('payoutTableBody').innerHTML = Object.values(barberMap).map(b => `
    <tr class="hover:bg-slate-50 transition">
      <td class="py-3.5 px-4 font-bold text-slate-900">
        <span>${escapeHtml(b.name)}</span>
        <span class="ml-2 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">${b.rate} %</span>
      </td>
      <td class="py-3.5 px-3 text-center font-semibold text-slate-700">${b.units} ks</td>
      <td class="py-3.5 px-3 text-right text-slate-700 tabular-nums">${formatEur(b.revenue)}</td>
      <td class="py-3.5 px-3 text-right text-[#007A91] font-semibold tabular-nums">${formatEur(b.grossProfit)}</td>
      <td class="py-3.5 px-3 text-right text-amber-600 font-medium tabular-nums">− ${formatEur(b.shippingReserve)}</td>
      <td class="py-3.5 px-3 text-right text-slate-700 tabular-nums">${formatEur(b.baseAfterShipping)}</td>
      <td class="py-3.5 px-4 text-right font-black text-emerald-700 text-base tabular-nums">${formatEur(b.commission)}</td>
    </tr>
  `).join('');

  document.getElementById('payoutTableFoot').innerHTML = `
    <tr>
      <td class="py-3.5 px-4 text-slate-900">SPOLU</td>
      <td class="py-3.5 px-3 text-center text-slate-900">${totalUnits} ks</td>
      <td class="py-3.5 px-3 text-right text-slate-900 tabular-nums">${formatEur(totalRevenue)}</td>
      <td class="py-3.5 px-3 text-right text-[#007A91] tabular-nums">${formatEur(totalGrossProfit)}</td>
      <td class="py-3.5 px-3 text-right text-amber-600 tabular-nums">− ${formatEur(totalShippingReserve)}</td>
      <td class="py-3.5 px-3 text-right text-slate-900 tabular-nums">${formatEur(roundMoney(totalGrossProfit - totalShippingReserve))}</td>
      <td class="py-3.5 px-4 text-right text-emerald-700 text-base tabular-nums">${formatEur(totalCommissions)}</td>
    </tr>
  `;

  document.getElementById('barbersManagerList').innerHTML = state.barbers.map((b, idx) => `
    <div class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2">
      <span class="w-7 h-7 rounded-lg bg-[#231F20] text-white font-bold text-xs flex items-center justify-center shrink-0">${idx + 1}</span>
      <input type="text" value="${escapeHtml(b.name)}" onchange="renameBarber('${escapeHtml(b.id)}', this.value)" class="flex-1 min-w-0 bg-white text-sm font-semibold text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-300" />
      <div class="flex items-center bg-white border border-slate-300 rounded-lg px-2 py-1 shrink-0">
        <input type="number" min="0" max="100" step="1" value="${getBarberCommissionRate(b.id, b.name)}" onchange="updateBarberRate('${escapeHtml(b.id)}', this.value)" class="w-12 text-right text-sm font-bold text-emerald-700 focus:outline-none tabular-nums" />
        <span class="ml-1 text-xs font-bold text-slate-500">%</span>
      </div>
      ${state.barbers.length > 1 ? `<button type="button" onclick="removeBarber('${escapeHtml(b.id)}')" class="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold">Zmazať</button>` : ''}
    </div>
  `).join('');

  document.getElementById('catalogTableBody').innerHTML = state.products.map((p, idx) => {
    const unitProfit = roundMoney(p.sellPrice - p.buyPrice);
    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-3 px-4 font-semibold text-slate-400">${idx + 1}</td>
        <td class="py-3 px-4"><span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">${escapeHtml(p.category || 'Produkt')}</span></td>
        <td class="py-3 px-4 font-bold text-slate-900">${escapeHtml(p.name)}</td>
        <td class="py-3 px-4 text-right"><input type="number" step="0.01" min="0" value="${p.buyPrice.toFixed(2)}" onchange="updateProductPrice('${escapeHtml(p.id)}', 'buyPrice', this.value)" class="w-24 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-right font-semibold text-slate-900 tabular-nums" /></td>
        <td class="py-3 px-4 text-right"><input type="number" step="0.01" min="0" value="${p.sellPrice.toFixed(2)}" onchange="updateProductPrice('${escapeHtml(p.id)}', 'sellPrice', this.value)" class="w-24 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-right font-bold text-[#007A91] tabular-nums" /></td>
        <td class="py-3 px-4 text-right font-extrabold ${unitProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'} tabular-nums">${formatEur(unitProfit)}</td>
      </tr>
    `;
  }).join('');

  document.getElementById('adminSalesBody').innerHTML = filteredSales.length === 0
    ? `<tr><td colspan="9" class="py-8 text-center text-slate-400 text-sm">V tomto období nie sú evidované žiadne predaje.</td></tr>`
    : filteredSales.map(s => {
      const fin = calculateSaleFinancials(s);
      return `
        <tr class="hover:bg-slate-50 transition">
          <td class="py-3 px-3 text-xs text-slate-500 whitespace-nowrap font-mono">${escapeHtml(formatDateTime(s.timestamp))}</td>
          <td class="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">${escapeHtml(s.barberName)}</td>
          <td class="py-3 px-3 font-medium text-slate-700">${escapeHtml(s.productName)}</td>
          <td class="py-3 px-3 text-center font-bold text-slate-900">${s.qty}</td>
          <td class="py-3 px-3 text-right text-slate-700 tabular-nums whitespace-nowrap">${formatEur(fin.revenue)}</td>
          <td class="py-3 px-3 text-right text-[#007A91] font-semibold tabular-nums whitespace-nowrap">${formatEur(fin.grossProfit)}</td>
          <td class="py-3 px-3 text-right text-amber-600 tabular-nums whitespace-nowrap">${formatEur(fin.shippingReserve)}</td>
          <td class="py-3 px-3 text-right font-extrabold text-emerald-700 tabular-nums whitespace-nowrap">${formatEur(fin.commission)}</td>
          <td class="py-3 px-3 text-right whitespace-nowrap"><button type="button" onclick="deleteSale('${escapeHtml(s.id)}')" class="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold">Zmazať</button></td>
        </tr>
      `;
    }).join('');
}

function renderAll() {
  renderPOS();
  if (state.isAdminUnlocked && state.activeTab === 'admin') renderAdmin();
}

function addBarber(event) {
  event.preventDefault();
  const input = document.getElementById('newBarberNameInput');
  const name = (input.value || '').trim();
  if (!name) return;
  state.barbers.push({ id: 'barber_' + Date.now(), name, color: BARBER_AVATAR_STYLES[state.barbers.length % BARBER_AVATAR_STYLES.length], commissionRate: clampRate(state.commissionRate) });
  input.value = '';
  renderAll();
  saveConfigToCloud();
}

function renameBarber(id, val) {
  const b = state.barbers.find(item => item.id === id);
  if (b && val.trim()) { b.name = val.trim(); renderAll(); }
}

function updateBarberRate(id, val) {
  const b = state.barbers.find(item => item.id === id);
  if (b) { b.commissionRate = clampRate(val); renderAdmin(); }
}

function removeBarber(id) {
  if (state.barbers.length <= 1) return;
  state.barbers = state.barbers.filter(b => b.id !== id);
  if (state.selectedBarberId === id) state.selectedBarberId = null;
  renderAll();
  saveConfigToCloud();
}

function updateProductPrice(id, field, rawVal) {
  const val = parseFloat(String(rawVal).replace(',', '.'));
  const prod = state.products.find(p => p.id === id);
  if (prod && !isNaN(val) && val >= 0) { prod[field] = roundMoney(val); renderAdmin(); }
}

async function saveConfigToCloud() {
  saveLocalFallback();
  if (!isApiConfigured()) return showToast('Chýba API link', 'Doplň URL z Google Tabuľky do app.js.');
  setSyncBadge('Ukladám...');
  try {
    const json = await apiRequest({
      action: 'saveConfig',
      config: { shippingRate: state.shippingRate, commissionRate: state.commissionRate, adminPassword: state.adminPassword, barbers: state.barbers, products: state.products }
    });
    if (json && json.ok && json.data) applyCloudPayload(json.data);
    setSyncBadge('Google Cloud Sync');
    showToast('Uložené do cloudu', 'Nastavenia, ceny aj % barberov sú uložené v Google Tabuľke.');
  } catch (err) {
    setSyncBadge('Chyba ukladania', true);
    showToast('Chyba', err.message || 'Skús znova.');
  }
}

async function deleteSale(saleId) {
  if (!isApiConfigured()) {
    state.sales = state.sales.filter(s => s.id !== saleId);
    saveLocalFallback();
    return renderAll();
  }
  setSyncBadge('Mažem...');
  try {
    const json = await apiRequest({ action: 'deleteSale', saleId });
    if (json && json.ok && json.data) applyCloudPayload(json.data);
    setSyncBadge('Google Cloud Sync');
    renderAll();
    showToast('Záznam vymazaný', 'Predaj bol odstránený z Google Tabuľky.');
  } catch (err) {
    setSyncBadge('Chyba', true);
  }
}

function requestClearAll() { document.getElementById('resetConfirmBar').classList.remove('hidden'); }
function cancelClearAll() { document.getElementById('resetConfirmBar').classList.add('hidden'); }

async function confirmClearAll() {
  cancelClearAll();
  if (!isApiConfigured()) {
    state.sales = [];
    saveLocalFallback();
    return renderAll();
  }
  setSyncBadge('Mažem predaje...');
  try {
    const json = await apiRequest({ action: 'clearAllSales' });
    if (json && json.ok && json.data) applyCloudPayload(json.data);
    setSyncBadge('Google Cloud Sync');
    renderAll();
    showToast('Predaje vymazané', 'Všetky predaje v Google Tabuľke boli vynulované.');
  } catch (err) {
    setSyncBadge('Chyba', true);
  }
}

function exportToCSV() {
  const selectedMonth = document.getElementById('monthFilter').value;
  const filteredSales = selectedMonth === 'ALL' ? state.sales : state.sales.filter(s => s.month === selectedMonth);
  const headers = ['Datum a cas', 'Obdobie', 'Barber', 'Produkt', 'Pocet ks', 'Nakup/ks (EUR)', 'Predaj/ks (EUR)', 'Trzba (EUR)', 'Hruby zisk (EUR)', `Rezerva ${state.shippingRate}% (EUR)`, 'Zaklad (EUR)', 'Sadzba barbera (%)', 'Provizia (EUR)', 'Zisk barbershop (EUR)'];
  const rows = filteredSales.map(s => {
    const fin = calculateSaleFinancials(s);
    return [formatDateTime(s.timestamp), s.month, `"${s.barberName}"`, `"${s.productName}"`, s.qty, Number(s.buyPrice).toFixed(2).replace('.', ','), Number(s.sellPrice).toFixed(2).replace('.', ','), fin.revenue.toFixed(2).replace('.', ','), fin.grossProfit.toFixed(2).replace('.', ','), fin.shippingReserve.toFixed(2).replace('.', ','), fin.baseAfterShipping.toFixed(2).replace('.', ','), `${fin.commissionRate}%`, fin.commission.toFixed(2).replace('.', ','), fin.shopNetProfit.toFixed(2).replace('.', ',')].join(';');
  });
  const blob = new Blob(['\uFEFF' + [headers.join(';'), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vajb_space_shop_${selectedMonth === 'ALL' ? 'vsetko' : selectedMonth}.csv`;
  a.click();
}

window.onload = initApp;
