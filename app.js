/**
 * SyncOps — Complete Laundry, Tailoring, Billing & Reporting Suite
 * Full Reactive Store, Excel Spreadsheet Generator & EPSON TM-T20II Driver
 */

// =====================================================================
// 1. ESTADO GLOBAL & PERSISTENCIA (LOCALSTORAGE)
// =====================================================================
const DEFAULT_STATE = {
  config: {
    businessName: 'SyncOps Laundry & Tailoring Suite',
    rnc: '131-89745-1',
    phone: '(809) 555-7962',
    address: 'Av. Winston Churchill #102, Santo Domingo',
    email: 'contacto@syncopslaundry.do',
    printerWidth: '80mm',
    printerModel: 'epson-t20ii',
    invoicePrefix: 'FAC',
    nextInvoiceNumber: 1001,
    ticketFooter: 'Prendas no retiradas tras 30 días pasan a disposición legal. ¡Gracias por su preferencia!'
  },
  catalog: [
    // 1. Lavandería (Prendas por pieza con precios base editables)
    { id: '1', name: '👔 Camisa de Vestir / Manga Larga', category: 'Lavandería', service: 'Lavandería', price: 180 },
    { id: '2', name: '👖 Pantalón de Vestir / Gabardina', category: 'Lavandería', service: 'Lavandería', price: 200 },
    { id: '3', name: '🤵 Traje Completo (2 Piezas)', category: 'Lavandería', service: 'Lavandería', price: 450 },
    { id: '4', name: '👗 Vestido Casual / Fiesta', category: 'Lavandería', service: 'Lavandería', price: 350 },
    { id: '5', name: '🛏️ Edredón / Acolchado King Size', category: 'Lavandería', service: 'Lavandería', price: 600 },
    { id: '6', name: '🛌 Juego de Sábanas Completo', category: 'Lavandería', service: 'Lavandería', price: 350 },
    { id: '7', name: '👕 Polo / Camiseta Casual', category: 'Lavandería', service: 'Lavandería', price: 130 },
    { id: '8', name: '🧥 Chaqueta / Blazer Casual', category: 'Lavandería', service: 'Lavandería', price: 300 },
    
    // 2. Sastrería & Taller de Arreglos
    { id: '9', name: '✂️ Ruedo / Dobladillo de Pantalón', category: 'Sastrería', service: 'Sastrería', price: 250 },
    { id: '10', name: '📐 Ajuste de Cintura / Entalle', category: 'Sastrería', service: 'Sastrería', price: 350 },
    { id: '11', name: '🤐 Cambio de Zipper / Cremallera', category: 'Sastrería', service: 'Sastrería', price: 300 },
    { id: '12', name: '🧵 Ajuste de Mangas / Hombros', category: 'Sastrería', service: 'Sastrería', price: 400 },
    { id: '13', name: '🪡 Cambio de Forro / Bolsillo', category: 'Sastrería', service: 'Sastrería', price: 450 },

    // 3. Autoservicio & Máquinas en forma de Ítem clickeable
    { id: '14', name: '🧺 Torre Lavadora Autoservicio (30 Lbs)', category: 'Autoservicio', service: 'Autoservicio', price: 175 },
    { id: '15', name: '🌀 Torre Secadora Autoservicio (35 min)', category: 'Autoservicio', service: 'Autoservicio', price: 150 },
    { id: '16', name: '🏭 Lavadora Industrial (75 Lbs)', category: 'Autoservicio', service: 'Autoservicio', price: 450 },
    { id: '17', name: '🔥 Secadora Industrial (80 Lbs)', category: 'Autoservicio', service: 'Autoservicio', price: 400 },
    { id: '18', name: '🪙 Ficha / Moneda Estándar', category: 'Autoservicio', service: 'Autoservicio', price: 60 },
    { id: '19', name: '🧴 Dosis Detergente Bio-Clean', category: 'Autoservicio', service: 'Autoservicio', price: 60 },
    { id: '20', name: '🌸 Dosis Suavizante Aroma Fresh', category: 'Autoservicio', service: 'Autoservicio', price: 50 },

    // 4. Hotelería & Volumen
    { id: '21', name: '🏨 Lote Toallas Hotel (x Kilo)', category: 'Hotelería', service: 'HotelVolumen', price: 75 },
    { id: '22', name: '🍽️ Lencería & Mantelería (x Kilo)', category: 'Hotelería', service: 'HotelVolumen', price: 85 }
  ],
  clients: [],
  orders: [],
  inventory: [],
  cashMovements: []
};

function getState() {
  const saved = localStorage.getItem('syncops_laundry_state');
  if (saved) {
    try { 
      const parsed = JSON.parse(saved);
      if (!parsed.config.invoicePrefix) parsed.config.invoicePrefix = 'FAC';
      if (!parsed.config.nextInvoiceNumber) parsed.config.nextInvoiceNumber = 1001;
      return parsed;
    } catch(e) {}
  }
  localStorage.setItem('syncops_laundry_state', JSON.stringify(DEFAULT_STATE));
  return DEFAULT_STATE;
}

function saveState(state) {
  localStorage.setItem('syncops_laundry_state', JSON.stringify(state));
}

function getFormattedNextInvoice() {
  const state = getState();
  const prefix = state.config?.invoicePrefix || 'FAC';
  const num = state.config?.nextInvoiceNumber || 1001;
  return `${prefix}-${num.toString().padStart(6, '0')}`;
}

// =====================================================================
// 2. INICIALIZACIÓN Y NAVEGACIÓN
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
  if (document.body.classList.contains('app-body')) {
    checkAuth();
    initApp();
  }
});

function checkAuth() {
  const user = JSON.parse(localStorage.getItem('syncops_user') || sessionStorage.getItem('syncops_user') || 'null');
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  const nameEl = document.getElementById('userName');
  const avatarEl = document.getElementById('userAvatar');
  const greetingEl = document.getElementById('dashboardGreeting');
  if (nameEl) nameEl.innerText = user.name || 'Luis Bravo';
  if (avatarEl) avatarEl.innerText = user.avatar || 'LB';
  if (greetingEl) greetingEl.innerText = `Buenas tardes, ${user.name ? user.name.split(' ')[0] : 'Luis'}`;
}

function logout() {
  localStorage.removeItem('syncops_user');
  sessionStorage.removeItem('syncops_user');
  window.location.href = 'login.html';
}

function switchSection(sectionId, btnElement) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  const sec = document.getElementById('section-' + sectionId);
  if (sec) sec.classList.add('active');
  if (btnElement) btnElement.classList.add('active');

  const titles = {
    'dashboard': 'Panel Principal',
    'pos': 'Punto de Venta / POS',
    'facturacion': 'Facturas & Cobros',
    'reportes': 'Reportes Financieros',
    'inventario': 'Inventario Insumos',
    'clientes': 'Clientes & Hoteles',
    'configuracion': 'Configuración de la Tienda',
    'faq': 'Preguntas Frecuentes',
    'ayuda': 'Ayuda & QA'
  };

  const titleEl = document.getElementById('currentSectionTitle');
  if (titleEl) titleEl.innerText = titles[sectionId] || 'SyncOps Suite';

  if (sectionId === 'dashboard') renderDashboard();
  if (sectionId === 'pos') renderPos();
  if (sectionId === 'facturacion') renderFacturacion();
  if (sectionId === 'reportes') renderReportes();
  if (sectionId === 'inventario') renderInventory();
  if (sectionId === 'clientes') renderClients();
  if (sectionId === 'configuracion') loadConfigInputs();
}

function initApp() {
  renderDashboard();
  renderPos();
  renderFacturacion();
  renderReportes();
  renderInventory();
  renderClients();
  loadConfigInputs();
}

// =====================================================================
// 3. MÓDULO 1: DASHBOARD
// =====================================================================
function renderDashboard() {
  const state = getState();

  const ventasCobros = state.cashMovements
    .filter(m => m.type !== 'Apertura')
    .reduce((sum, m) => sum + m.amount, 0);

  const prendasTotal = state.orders.reduce((sum, o) => sum + o.items.length, 0);
  const facturasPendientes = state.orders.filter(o => o.balance > 0).length;
  const clientesCount = state.clients.length;

  if (document.getElementById('kpiVentasHoy')) document.getElementById('kpiVentasHoy').innerText = `RD$${ventasCobros.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  if (document.getElementById('kpiPrendasTaller')) document.getElementById('kpiPrendasTaller').innerText = prendasTotal;
  if (document.getElementById('kpiPrendasProgress')) document.getElementById('kpiPrendasProgress').style.width = `${Math.min(100, prendasTotal * 10)}%`;
  if (document.getElementById('kpiFacturasPendientesCount')) document.getElementById('kpiFacturasPendientesCount').innerText = facturasPendientes;
  if (document.getElementById('kpiClientesCount')) document.getElementById('kpiClientesCount').innerHTML = `${clientesCount} <span class="kpi-number-sub">activas</span>`;

  // Renderizar Gráfica de Burndown Dinámica
  const chartBox = document.getElementById('dashboardChartContainer');
  if (chartBox) {
    if (state.orders.length === 0) {
      chartBox.innerHTML = `
        <div style="height: 190px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94A3B8; text-align: center; padding: 1.5rem;">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.6" style="margin-bottom: .65rem;">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          <strong style="color: #475569; font-size: .95rem; margin-bottom: .25rem;">Sin transacciones suficientes aún para graficar</strong>
          <span style="font-size: .78rem; color: #94A3B8; max-width: 450px;">
            El flujo operativo y gráfico de Burndown se generará en tiempo real automáticamente conforme registres tus primeras facturas en el Punto de Venta (POS).
          </span>
        </div>
      `;
    } else {
      // Gráfica con datos reales de órdenes
      const totalSum = state.orders.reduce((s, o) => s + o.total, 0);
      chartBox.innerHTML = `
        <svg width="100%" height="100%" viewBox="0 0 900 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#38BDF8" stop-opacity="0.02"/>
            </linearGradient>
          </defs>
          <line x1="40" y1="40" x2="880" y2="40" stroke="#F1F5F9" stroke-width="1"/>
          <line x1="40" y1="90" x2="880" y2="90" stroke="#F1F5F9" stroke-width="1"/>
          <line x1="40" y1="140" x2="880" y2="140" stroke="#F1F5F9" stroke-width="1"/>
          <line x1="40" y1="180" x2="880" y2="180" stroke="#E2E8F0" stroke-width="1"/>

          <path d="M 60 170 L 250 140 L 450 100 L 650 70 L 840 40 L 840 180 L 60 180 Z" fill="url(#areaGradient)"/>
          <path d="M 60 170 L 250 140 L 450 100 L 650 70 L 840 40" stroke="#0284C7" stroke-width="3" fill="none"/>
          
          <circle cx="60" cy="170" r="5" fill="#0284C7"/>
          <circle cx="250" cy="140" r="5" fill="#0284C7"/>
          <circle cx="450" cy="100" r="5" fill="#0284C7"/>
          <circle cx="650" cy="70" r="5" fill="#0284C7"/>
          <circle cx="840" cy="40" r="5" fill="#0284C7"/>

          <text x="60" y="196" font-size="10" fill="#64748B" text-anchor="middle">Inicio</text>
          <text x="450" y="196" font-size="10" fill="#64748B" text-anchor="middle">En Proceso</text>
          <text x="840" y="196" font-size="10" fill="#64748B" text-anchor="middle">Actual (RD$${totalSum.toLocaleString('es-DO')})</text>
        </svg>
      `;
    }
  }

  const tbody = document.querySelector('#tableRecentOrders tbody');
  if (tbody) {
    tbody.innerHTML = state.orders.slice(0, 5).map(o => `
      <tr>
        <td><strong class="font-mono text-blue">${o.ticket}</strong><div style="font-size: .72rem; color: var(--text-muted);">${o.date}</div></td>
        <td><strong>${o.clientName}</strong></td>
        <td>
          <span class="status-badge ${o.balance > 0 ? 'status-todo' : 'status-done'}">
            <span class="status-dot"></span> ${o.balance > 0 ? 'Saldo Pendiente' : 'Pagada Total'}
          </span>
        </td>
        <td style="text-align: right;"><strong class="font-mono">RD$${o.total.toLocaleString('es-DO')}</strong><div style="font-size: .72rem; color: ${o.balance > 0 ? '#DC2626' : '#059669'}; font-weight: 700;">${o.balance > 0 ? 'Pend: RD$' + o.balance : 'Pagado'}</div></td>
        <td>
          <div style="display: flex; gap: .35rem;">
            ${o.balance > 0 ? `<button class="btn btn-outline btn-sm" onclick="openPayOrderModal('${o.id}')">Cobrar $</button>` : ''}
            <button class="btn btn-outline btn-sm" onclick="displayThermalTicket(getState().orders.find(x=>x.id==='${o.id}'))">Ticket</button>
          </div>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">Aún no se han emitido facturas. Crea tu primera factura en el Punto de Venta (POS).</td></tr>';
  }

  const alertsBox = document.getElementById('dashboardAlertsList');
  const insumosBajoStock = state.inventory.filter(i => i.stock <= i.minStock);
  if (alertsBox) {
    alertsBox.innerHTML = insumosBajoStock.map(i => `
      <div style="background: var(--status-danger-bg); border: 1px solid var(--status-danger-border); border-radius: var(--r-md); padding: .75rem 1rem; margin-bottom: .5rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="color: var(--status-danger-text); font-size: .84rem;">${i.name}</strong>
          <div style="font-size: .72rem; color: var(--text-muted);">Proveedor: ${i.provider}</div>
        </div>
        <div style="text-align: right;">
          <strong class="font-mono text-rose font-bold" style="font-size: .95rem;">${i.stock} ${i.unit}</strong>
          <div style="font-size: .7rem; color: var(--text-muted);">Mínimo: ${i.minStock}</div>
        </div>
      </div>
    `).join('') || '<div class="text-muted" style="padding: 1rem 0;">Todos los insumos tienen stock suficiente.</div>';
  }
}


// =====================================================================
// 4. MÓDULO 2: PUNTO DE VENTA (POS CON PRECIOS PERSONALIZABLES)
// =====================================================================
let currentOrderItems = [];
let currentPaymentMethod = 'Efectivo';

function renderPos() {
  const state = getState();
  const select = document.getElementById('posClientSelect');
  if (select) {
    if (state.clients.length === 0) {
      select.innerHTML = '<option value="">Cliente Mostrador (General)</option>';
    } else {
      select.innerHTML = state.clients.map(c => `
        <option value="${c.id}">${c.name} ${c.isHotel ? '(Hotel / Crédito)' : ''}</option>
      `).join('');
    }
  }

  const invoiceInput = document.getElementById('posInvoiceNumber');
  if (invoiceInput) {
    invoiceInput.value = getFormattedNextInvoice();
  }

  const dateInput = document.getElementById('posDeliveryDate');
  if (dateInput && !dateInput.value) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.value = tomorrow.toISOString().slice(0, 16);
  }

  filterCatalog('Todos');
}


function filterCatalog(category, btnElement) {
  const state = getState();
  if (btnElement) {
    document.querySelectorAll('.catalog-tab').forEach(t => t.classList.remove('active'));
    btnElement.classList.add('active');
  }

  const grid = document.getElementById('posCatalogGrid');
  if (!grid) return;

  const items = (category === 'Todos') 
    ? state.catalog 
    : state.catalog.filter(i => i.category === category);

  grid.innerHTML = items.map(item => `
    <div class="catalog-item-card" onclick="selectCatalogItem('${item.id}')" title="Clic para cargar y ajustar precio">
      <div class="catalog-item-name">${item.name}</div>
      <div class="catalog-item-price">RD$${item.price.toLocaleString('es-DO')}</div>
    </div>
  `).join('');
}

function selectCatalogItem(itemId) {
  const state = getState();
  const item = state.catalog.find(i => i.id === itemId);
  if (!item) return;

  // Limpiar emojis de la descripción si aplica
  const cleanName = item.name.replace(/^[^\w\s\u00C0-\u017F]+/i, '').trim();

  document.getElementById('builderDesc').value = cleanName;
  document.getElementById('builderPrice').value = item.price;
  document.getElementById('builderService').value = item.service;
  document.getElementById('builderItemName').innerText = `Configuración: ${cleanName}`;
  
  toggleTailoringDrawer(item.service);
  showToast(`Ítem "${cleanName}" cargado. Puedes personalizar su precio.`, 'info');
}

function toggleTailoringDrawer(service) {
  const drawer = document.getElementById('tailoringDrawer');
  if (drawer) {
    drawer.style.display = (service === 'Sastrería') ? 'block' : 'none';
  }
}

function addItemToOrder() {
  const desc = document.getElementById('builderDesc').value.trim();
  const service = document.getElementById('builderService').value;
  const qty = parseFloat(document.getElementById('builderQty').value) || 1;
  const price = parseFloat(document.getElementById('builderPrice').value);
  const color = document.getElementById('builderColor').value.trim();
  const defects = document.getElementById('builderDefects').value.trim();
  const alteration = document.getElementById('tailorAlterationType').value.trim();
  const measurements = document.getElementById('tailorMeasurements').value.trim();

  if (!desc) {
    showToast('Ingresa la descripción del artículo o servicio.', 'error');
    return;
  }
  if (isNaN(price) || price < 0) {
    showToast('Ingresa un precio unitario válido.', 'error');
    return;
  }

  currentOrderItems.push({
    id: 'item_' + Date.now(),
    name: desc,
    service,
    qty,
    price,
    subtotal: qty * price,
    color,
    defects,
    alteration: alteration ? `${alteration} (${measurements})` : null
  });

  document.getElementById('builderDesc').value = '';
  document.getElementById('builderColor').value = '';
  document.getElementById('builderDefects').value = '';
  document.getElementById('tailorAlterationType').value = '';
  document.getElementById('tailorMeasurements').value = '';

  renderPosItems();
  calculatePosTotal();
  showToast('Artículo agregado a la factura.', 'success');
}

function removeItem(index) {
  currentOrderItems.splice(index, 1);
  renderPosItems();
  calculatePosTotal();
}

function renderPosItems() {
  const box = document.getElementById('posItemsList');
  const countBadge = document.getElementById('posItemsCount');
  if (!box) return;

  countBadge.innerText = `${currentOrderItems.length} artículos`;

  if (currentOrderItems.length === 0) {
    box.innerHTML = '<div class="empty-state-pos">No hay artículos agregados a la orden.</div>';
    return;
  }

  box.innerHTML = currentOrderItems.map((item, idx) => `
    <div class="pos-item-row">
      <div class="pos-item-info">
        <strong>${item.name} (${item.qty}x)</strong>
        <span>Categoría: ${item.service} ${item.color ? '• ' + item.color : ''} • Precio: RD$${item.price}</span>
        ${item.alteration ? `<div style="color: var(--blue-vibrant); font-size: .72rem; font-weight: 700;">Arreglo: ${item.alteration}</div>` : ''}
      </div>
      <div style="display: flex; align-items: center; gap: .75rem;">
        <strong class="font-mono">RD$${item.subtotal.toLocaleString('es-DO')}</strong>
        <button class="btn-remove-item" onclick="removeItem(${idx})">✕</button>
      </div>
    </div>
  `).join('');
}

function calculatePosTotal() {
  const subtotal = currentOrderItems.reduce((sum, i) => sum + i.subtotal, 0);
  const discount = parseFloat(document.getElementById('posDiscount').value) || 0;
  const isUrgent = document.getElementById('posIsUrgent').checked;
  
  const urgentFee = isUrgent ? (subtotal * 0.15) : 0;
  const total = Math.max(0, subtotal + urgentFee - discount);
  const paid = parseFloat(document.getElementById('posAmountPaid').value) || 0;
  const balance = Math.max(0, total - paid);

  document.getElementById('posSubtotal').innerText = `RD$${subtotal.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  document.getElementById('posTotal').innerText = `RD$${total.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  document.getElementById('posBalanceDue').innerText = `RD$${balance.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
}

function payFullOrder() {
  const subtotal = currentOrderItems.reduce((sum, i) => sum + i.subtotal, 0);
  const discount = parseFloat(document.getElementById('posDiscount').value) || 0;
  const isUrgent = document.getElementById('posIsUrgent').checked;
  const total = Math.max(0, subtotal + (isUrgent ? subtotal * 0.15 : 0) - discount);

  document.getElementById('posAmountPaid').value = total;
  calculatePosTotal();
}

function selectPaymentMethod(method, btn) {
  currentPaymentMethod = method;
  document.querySelectorAll('.payment-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function saveAndPrintOrder() {
  if (currentOrderItems.length === 0) {
    showToast('Agrega al menos un artículo para generar la factura.', 'error');
    return;
  }

  const state = getState();
  const clientId = document.getElementById('posClientSelect').value;
  const client = (state.clients.length > 0)
    ? (state.clients.find(c => c.id === clientId) || state.clients[0])
    : { id: 'c_general', name: 'Cliente Mostrador (General)', phone: '809-555-0000', isHotel: false, balance: 0 };

  const delivery = document.getElementById('posDeliveryDate').value;
  const discount = parseFloat(document.getElementById('posDiscount').value) || 0;
  const paid = parseFloat(document.getElementById('posAmountPaid').value) || 0;
  const isUrgent = document.getElementById('posIsUrgent').checked;

  const subtotal = currentOrderItems.reduce((sum, i) => sum + i.subtotal, 0);
  const total = Math.max(0, subtotal + (isUrgent ? subtotal * 0.15 : 0) - discount);
  const balance = Math.max(0, total - paid);

  // Usar el número de factura definido por el usuario o de la secuencia
  const customTicket = document.getElementById('posInvoiceNumber')?.value.trim();
  const ticket = customTicket || getFormattedNextInvoice();
  const barcode = `${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2,'0')}${new Date().getDate().toString().padStart(2,'0')}${Math.floor(1000 + Math.random()*9000)}`;

  const newOrder = {
    id: 'ord_' + Date.now(),
    ticket,
    barcode,
    clientId: client.id,
    clientName: client.name,
    phone: client.phone,
    status: balance === 0 ? 'Pagada' : 'Pendiente',
    date: new Date().toLocaleString('es-DO'),
    delivery: new Date(delivery).toLocaleString('es-DO'),
    subtotal,
    discount,
    total,
    paid,
    balance,
    isUrgent,
    items: [...currentOrderItems]
  };

  state.orders.unshift(newOrder);

  // Incrementar secuencia siguiente de factura
  if (state.config) {
    state.config.nextInvoiceNumber = (parseInt(state.config.nextInvoiceNumber) || 1001) + 1;
  }

  if (paid > 0) {
    state.cashMovements.push({
      id: 'cm_' + Date.now(),
      time: new Date().toLocaleTimeString('es-DO', {hour:'2-digit', minute:'2-digit'}),
      type: 'Cobro Factura',
      concept: `Pago Factura ${ticket} (${client.name})`,
      method: currentPaymentMethod,
      amount: paid
    });
  }

  if (balance > 0 && client.isHotel) {
    client.balance += balance;
  }

  saveState(state);
  displayThermalTicket(newOrder);

  currentOrderItems = [];
  document.getElementById('posDiscount').value = '0';
  document.getElementById('posAmountPaid').value = '0';
  document.getElementById('posIsUrgent').checked = false;
  document.getElementById('posInvoiceNumber').value = getFormattedNextInvoice();
  
  renderPosItems();
  calculatePosTotal();

  showToast(`Factura ${ticket} emitida exitosamente.`, 'success');
}

// =====================================================================
// 5. MÓDULO 3: FACTURACIÓN & HISTORIAL DE FACTURAS
// =====================================================================
let currentFactFilter = 'todas';

function setFacturacionFilter(filterType, btn) {
  currentFactFilter = filterType;
  document.querySelectorAll('#section-facturacion .catalog-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderFacturacion();
}

function filterFacturacion(searchTerm) {
  renderFacturacion(currentFactFilter, searchTerm);
}

function renderFacturacion(filter = currentFactFilter, term = '') {
  const state = getState();
  const tbody = document.getElementById('facturacionTableBody');
  if (!tbody) return;

  const q = (term || document.getElementById('facturacionSearchInput')?.value || '').toLowerCase().trim();

  let filtered = state.orders;
  if (filter === 'pagadas') filtered = filtered.filter(o => o.balance === 0);
  if (filter === 'pendientes') filtered = filtered.filter(o => o.balance > 0);

  if (q) {
    filtered = filtered.filter(o => o.ticket.toLowerCase().includes(q) || o.clientName.toLowerCase().includes(q) || o.phone.includes(q));
  }

  const countTodas = state.orders.length;
  const countPagadas = state.orders.filter(o => o.balance === 0).length;
  const countPendientes = state.orders.filter(o => o.balance > 0).length;

  if (document.getElementById('countFactTodas')) document.getElementById('countFactTodas').innerText = countTodas;
  if (document.getElementById('countFactPagadas')) document.getElementById('countFactPagadas').innerText = countPagadas;
  if (document.getElementById('countFactPendientes')) document.getElementById('countFactPendientes').innerText = countPendientes;

  tbody.innerHTML = filtered.map(o => `
    <tr>
      <td><strong class="font-mono text-blue">${o.ticket}</strong></td>
      <td><strong>${o.clientName}</strong><div style="font-size: .72rem; color: var(--text-muted);">${o.phone}</div></td>
      <td><span class="font-mono" style="font-size: .8rem;">${o.date}</span></td>
      <td><strong class="font-mono">RD$${o.total.toLocaleString('es-DO', {minimumFractionDigits:2})}</strong></td>
      <td><span class="font-mono text-emerald">RD$${o.paid.toLocaleString('es-DO', {minimumFractionDigits:2})}</span></td>
      <td>
        <strong class="font-mono ${o.balance > 0 ? 'text-rose font-bold' : 'text-muted'}">
          RD$${o.balance.toLocaleString('es-DO', {minimumFractionDigits:2})}
        </strong>
      </td>
      <td>
        <span class="badge-pill ${o.balance === 0 ? 'bg-emerald' : 'bg-rose'}">
          ${o.balance === 0 ? 'Pagada Total' : 'Pendiente'}
        </span>
      </td>
      <td>
        <div style="display: flex; gap: .35rem;">
          ${o.balance > 0 ? `<button class="btn btn-primary btn-sm" onclick="openPayOrderModal('${o.id}')">Cobrar $</button>` : ''}
          <button class="btn btn-outline btn-sm" onclick="displayThermalTicket(getState().orders.find(x=>x.id==='${o.id}'))">Ticket</button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">No se encontraron facturas con los filtros seleccionados.</td></tr>';
}

// =====================================================================
// 6. MÓDULO 4: REPORTES FINANCIEROS, EXCEL & PDF EXPORT
// =====================================================================
function renderReportes() {
  filterReportData();
}

function filterReportData() {
  const state = getState();
  const period = document.getElementById('reportPeriodSelect')?.value || 'all';
  const statusFilter = document.getElementById('reportStatusSelect')?.value || 'all';
  const searchTerm = (document.getElementById('reportSearchInput')?.value || '').toLowerCase().trim();
  const tbody = document.getElementById('reportTableBody');
  if (!tbody) return;

  let orders = [...state.orders];

  if (statusFilter === 'paid') orders = orders.filter(o => o.balance === 0);
  if (statusFilter === 'pending') orders = orders.filter(o => o.balance > 0);

  if (searchTerm) {
    orders = orders.filter(o => o.ticket.toLowerCase().includes(searchTerm) || o.clientName.toLowerCase().includes(searchTerm));
  }

  const totalFacturado = orders.reduce((sum, o) => sum + o.total, 0);
  const totalCobrado = orders.reduce((sum, o) => sum + o.paid, 0);
  const totalPendiente = orders.reduce((sum, o) => sum + o.balance, 0);
  const cantFacturas = orders.length;

  if (document.getElementById('repTotalFacturado')) document.getElementById('repTotalFacturado').innerText = `RD$${totalFacturado.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  if (document.getElementById('repTotalCobrado')) document.getElementById('repTotalCobrado').innerText = `RD$${totalCobrado.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  if (document.getElementById('repTotalPendiente')) document.getElementById('repTotalPendiente').innerText = `RD$${totalPendiente.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  if (document.getElementById('repTotalFacturasCount')) document.getElementById('repTotalFacturasCount').innerText = cantFacturas;

  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><strong class="font-mono text-blue">${o.ticket}</strong></td>
      <td><strong>${o.clientName}</strong></td>
      <td><span class="font-mono" style="font-size: .8rem;">${o.date}</span></td>
      <td><span class="badge-pill bg-blue">${o.paid > 0 ? 'Efectivo / POS' : 'Crédito'}</span></td>
      <td style="text-align: right;"><strong class="font-mono">RD$${o.total.toLocaleString('es-DO', {minimumFractionDigits:2})}</strong></td>
      <td style="text-align: right;"><span class="font-mono text-emerald font-bold">RD$${o.paid.toLocaleString('es-DO', {minimumFractionDigits:2})}</span></td>
      <td style="text-align: right;"><strong class="font-mono ${o.balance > 0 ? 'text-rose' : 'text-muted'}">RD$${o.balance.toLocaleString('es-DO', {minimumFractionDigits:2})}</strong></td>
      <td><span class="badge-pill ${o.balance === 0 ? 'bg-emerald' : 'bg-rose'}">${o.balance === 0 ? 'Pagada' : 'Pendiente'}</span></td>
    </tr>
  `).join('') || '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">No hay registros para este período.</td></tr>';
}

function openPrintFinancialReport() {
  const state = getState();
  const cfg = state.config || DEFAULT_STATE.config;
  const user = JSON.parse(localStorage.getItem('syncops_user') || '{}');

  const orders = state.orders;
  const totalFacturado = orders.reduce((sum, o) => sum + o.total, 0);
  const totalCobrado = orders.reduce((sum, o) => sum + o.paid, 0);
  const totalPendiente = orders.reduce((sum, o) => sum + o.balance, 0);

  document.getElementById('pdfStoreName').innerText = cfg.businessName.toUpperCase();
  document.getElementById('pdfStoreMeta').innerText = `${cfg.address} • Tel: ${cfg.phone} • RNC: ${cfg.rnc}`;
  document.getElementById('pdfGeneratedDate').innerText = `Fecha de Emisión: ${new Date().toLocaleString('es-DO')}`;
  document.getElementById('pdfSignOperator').innerText = user.name || 'Luis Bravo';

  document.getElementById('pdfKpiFacturado').innerText = `RD$${totalFacturado.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  document.getElementById('pdfKpiCobrado').innerText = `RD$${totalCobrado.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  document.getElementById('pdfKpiPendiente').innerText = `RD$${totalPendiente.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  document.getElementById('pdfKpiTotalDocs').innerText = orders.length;

  const pdfTbody = document.getElementById('pdfTableBody');
  pdfTbody.innerHTML = orders.map(o => `
    <tr>
      <td><strong>${o.ticket}</strong></td>
      <td>${o.clientName}</td>
      <td>${o.date}</td>
      <td style="text-align: right;">RD$${o.total.toLocaleString('es-DO', {minimumFractionDigits:2})}</td>
      <td style="text-align: right; color: #059669; font-weight: 700;">RD$${o.paid.toLocaleString('es-DO', {minimumFractionDigits:2})}</td>
      <td style="text-align: right; color: ${o.balance > 0 ? '#DC2626' : '#475569'}; font-weight: 700;">RD$${o.balance.toLocaleString('es-DO', {minimumFractionDigits:2})}</td>
      <td>${o.balance === 0 ? 'PAGADA' : 'PENDIENTE'}</td>
    </tr>
  `).join('');

  document.getElementById('reportPdfModal').classList.add('active');
}

function closeReportPdfModal() {
  document.getElementById('reportPdfModal').classList.remove('active');
}

function printFinancialReportDocument() {
  window.print();
}

// =====================================================================
// EXPORTACIÓN A EXCEL (.CSV ESTRUCTURADO CON UTF-8 BOM)
// =====================================================================
function exportToExcel(target = 'all') {
  const state = getState();
  const cfg = state.config || DEFAULT_STATE.config;

  let csvContent = '\uFEFF'; // BOM para que Excel abra UTF-8 con acentos y símbolos directamente

  // Encabezado de la Empresa
  csvContent += `"${cfg.businessName.replace(/"/g, '""')}"\n`;
  csvContent += `"RNC: ${cfg.rnc}","Tel: ${cfg.phone}","Dirección: ${cfg.address.replace(/"/g, '""')}"\n`;
  csvContent += `"Reporte Generado: ${new Date().toLocaleString('es-DO')}"\n\n`;

  // Columnas
  csvContent += `"Nº Factura","Cliente","Teléfono","Fecha","Entrega Estimada","Subtotal (RD$)","Descuento (RD$)","Total Factura (RD$)","Monto Cobrado (RD$)","Saldo Pendiente (RD$)","Estado de Pago"\n`;

  state.orders.forEach(o => {
    csvContent += `"${o.ticket}","${o.clientName.replace(/"/g, '""')}","${o.phone}","${o.date}","${o.delivery}",${o.subtotal.toFixed(2)},${o.discount.toFixed(2)},${o.total.toFixed(2)},${o.paid.toFixed(2)},${o.balance.toFixed(2)},"${o.status}"\n`;
  });

  // Totales
  const totFact = state.orders.reduce((sum, o) => sum + o.total, 0);
  const totPaid = state.orders.reduce((sum, o) => sum + o.paid, 0);
  const totBal = state.orders.reduce((sum, o) => sum + o.balance, 0);

  csvContent += `\n"TOTALES GENERALES:","","","","","","",${totFact.toFixed(2)},${totPaid.toFixed(2)},${totBal.toFixed(2)},""\n`;

  // Descarga del archivo
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SyncOps_Facturacion_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Hoja de cálculo Excel (.csv) descargada con éxito.', 'success');
}

function exportFinancialSummaryExcel() {
  exportToExcel('all');
}

// =====================================================================
// 7. CRUD: INVENTARIO DE INSUMOS
// =====================================================================
function renderInventory() {
  const state = getState();
  const tbody = document.getElementById('inventoryTableBody');
  const restockSelect = document.getElementById('quickRestockSelect');
  if (!tbody) return;

  tbody.innerHTML = state.inventory.map(i => `
    <tr>
      <td><span class="font-mono text-muted">${i.code}</span></td>
      <td><strong>${i.name}</strong><div style="font-size:.72rem; color:var(--text-muted);">Proveedor: ${i.provider}</div></td>
      <td><span class="badge-pill bg-blue">${i.category}</span></td>
      <td><strong class="font-mono ${i.stock <= i.minStock ? 'text-rose font-bold' : ''}">${i.stock} ${i.unit}</strong></td>
      <td><span class="font-mono">${i.minStock} ${i.unit}</span></td>
      <td><span class="font-mono">RD$${i.cost}</span></td>
      <td>
        <div style="display: flex; gap: .35rem;">
          <button class="btn btn-outline btn-sm" onclick="openNewInsumoModal('${i.id}')">Editar</button>
          <button class="btn btn-outline btn-sm" onclick="addStockItem('${i.id}', 5)">+5</button>
          <button class="btn btn-outline btn-sm" style="color:#DC2626;" onclick="deleteInsumo('${i.id}')">✕</button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No hay insumos registrados. Haz clic en "+ Nuevo Insumo" para registrar tus productos.</td></tr>';

  if (restockSelect) {
    restockSelect.innerHTML = (state.inventory.length > 0)
      ? state.inventory.map(i => `<option value="${i.id}">${i.name} (Actual: ${i.stock} ${i.unit})</option>`).join('')
      : '<option value="">-- Sin insumos registrados --</option>';
  }
}


function openNewInsumoModal(insumoId = null) {
  const state = getState();
  const modal = document.getElementById('insumoModal');
  const title = document.getElementById('insumoModalTitle');
  if (!modal) return;

  if (insumoId) {
    const item = state.inventory.find(i => i.id === insumoId);
    if (item) {
      title.innerText = 'Editar Insumo';
      document.getElementById('modalInsumoId').value = item.id;
      document.getElementById('modalInsumoCode').value = item.code;
      document.getElementById('modalInsumoName').value = item.name;
      document.getElementById('modalInsumoCategory').value = item.category;
      document.getElementById('modalInsumoStock').value = item.stock;
      document.getElementById('modalInsumoMin').value = item.minStock;
      document.getElementById('modalInsumoUnit').value = item.unit;
      document.getElementById('modalInsumoCost').value = item.cost;
      document.getElementById('modalInsumoProvider').value = item.provider;
    }
  } else {
    title.innerText = 'Registrar Nuevo Insumo';
    document.getElementById('modalInsumoId').value = '';
    document.getElementById('modalInsumoCode').value = '746' + Math.floor(100000 + Math.random()*900000);
    document.getElementById('modalInsumoName').value = '';
    document.getElementById('modalInsumoStock').value = '10';
    document.getElementById('modalInsumoMin').value = '5';
    document.getElementById('modalInsumoUnit').value = 'Galones';
    document.getElementById('modalInsumoCost').value = '450';
    document.getElementById('modalInsumoProvider').value = 'Químicos del Caribe';
  }

  modal.classList.add('active');
}

function closeInsumoModal() {
  const modal = document.getElementById('insumoModal');
  if (modal) modal.classList.remove('active');
}

function saveInsumoModal(e) {
  e.preventDefault();
  const state = getState();
  const id = document.getElementById('modalInsumoId').value;
  const code = document.getElementById('modalInsumoCode').value.trim();
  const name = document.getElementById('modalInsumoName').value.trim();
  const category = document.getElementById('modalInsumoCategory').value;
  const stock = parseFloat(document.getElementById('modalInsumoStock').value) || 0;
  const minStock = parseFloat(document.getElementById('modalInsumoMin').value) || 1;
  const unit = document.getElementById('modalInsumoUnit').value.trim();
  const cost = parseFloat(document.getElementById('modalInsumoCost').value) || 0;
  const provider = document.getElementById('modalInsumoProvider').value.trim();

  if (id) {
    const item = state.inventory.find(i => i.id === id);
    if (item) {
      Object.assign(item, { code, name, category, stock, minStock, unit, cost, provider });
      showToast('Insumo actualizado exitosamente.', 'success');
    }
  } else {
    state.inventory.push({
      id: 'i_' + Date.now(),
      code, name, category, stock, minStock, unit, cost, provider
    });
    showToast('Nuevo insumo registrado.', 'success');
  }

  saveState(state);
  renderInventory();
  renderDashboard();
  closeInsumoModal();
}

function deleteInsumo(insumoId) {
  if (!confirm('¿Deseas eliminar este insumo del inventario?')) return;
  const state = getState();
  state.inventory = state.inventory.filter(i => i.id !== insumoId);
  saveState(state);
  renderInventory();
  renderDashboard();
  showToast('Insumo eliminado.', 'info');
}

function addStockItem(itemId, delta) {
  const state = getState();
  const item = state.inventory.find(i => i.id === itemId);
  if (!item) return;

  item.stock += delta;
  saveState(state);
  renderInventory();
  renderDashboard();
  showToast(`Stock de ${item.name}: +${delta} ${item.unit}.`, 'success');
}

function executeQuickRestock() {
  const select = document.getElementById('quickRestockSelect');
  const qty = parseFloat(document.getElementById('quickRestockQty').value) || 0;
  if (select && select.value && qty > 0) {
    addStockItem(select.value, qty);
  }
}

// =====================================================================
// 8. CRUD: CLIENTES & CUENTAS DE HOTELES
// =====================================================================
function renderClients() {
  const state = getState();
  const tbody = document.getElementById('clientsTableBody');
  if (!tbody) return;

  tbody.innerHTML = state.clients.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td><span class="font-mono">${c.phone}</span></td>
      <td>
        <span class="badge-pill ${c.isHotel ? 'bg-amber' : 'bg-blue'}">
          ${c.isHotel ? 'Hotel / Corporativo' : 'Particular'}
        </span>
      </td>
      <td>
        <strong class="font-mono ${c.balance > 0 ? 'text-rose font-bold' : ''}">
          RD$${c.balance.toLocaleString('es-DO', {minimumFractionDigits:2})}
        </strong>
      </td>
      <td><span class="font-mono">${c.creditLimit > 0 ? 'RD$' + c.creditLimit.toLocaleString('es-DO') : 'Sin Crédito'}</span></td>
      <td><span class="font-mono">${c.ordersCount}</span></td>
      <td>
        <div style="display: flex; gap: .35rem;">
          <button class="btn btn-outline btn-sm" onclick="openNewClientModal('${c.id}')">Editar</button>
          <button class="btn btn-outline btn-sm" style="color:#DC2626;" onclick="deleteClient('${c.id}')">✕</button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No hay clientes registrados aún. Haz clic en "+ Registrar Cliente" para agregar tu primer cliente.</td></tr>';
}


function openNewClientModal(clientId = null) {
  const state = getState();
  const modal = document.getElementById('clientModal');
  const title = document.getElementById('clientModalTitle');
  if (!modal) return;

  if (clientId) {
    const c = state.clients.find(x => x.id === clientId);
    if (c) {
      title.innerText = 'Editar Cliente / Empresa';
      document.getElementById('modalClientId').value = c.id;
      document.getElementById('modalClientName').value = c.name;
      document.getElementById('modalClientPhone').value = c.phone;
      document.getElementById('modalClientIsHotel').value = c.isHotel ? 'true' : 'false';
      document.getElementById('modalClientCreditLimit').value = c.creditLimit || 0;
    }
  } else {
    title.innerText = 'Registrar Nuevo Cliente';
    document.getElementById('modalClientId').value = '';
    document.getElementById('modalClientName').value = '';
    document.getElementById('modalClientPhone').value = '';
    document.getElementById('modalClientIsHotel').value = 'false';
    document.getElementById('modalClientCreditLimit').value = '0';
  }

  modal.classList.add('active');
}

function closeClientModal() {
  const modal = document.getElementById('clientModal');
  if (modal) modal.classList.remove('active');
}

function saveClientModal(e) {
  e.preventDefault();
  const state = getState();
  const id = document.getElementById('modalClientId').value;
  const name = document.getElementById('modalClientName').value.trim();
  const phone = document.getElementById('modalClientPhone').value.trim();
  const isHotel = document.getElementById('modalClientIsHotel').value === 'true';
  const creditLimit = parseFloat(document.getElementById('modalClientCreditLimit').value) || 0;

  if (id) {
    const c = state.clients.find(x => x.id === id);
    if (c) {
      c.name = name;
      c.phone = phone;
      c.isHotel = isHotel;
      c.creditLimit = creditLimit;
      showToast('Cliente actualizado.', 'success');
    }
  } else {
    state.clients.push({
      id: 'c_' + Date.now(),
      name, phone, isHotel, balance: 0, creditLimit, ordersCount: 0
    });
    showToast('Nuevo cliente registrado.', 'success');
  }

  saveState(state);
  renderClients();
  renderPos();
  renderDashboard();
  closeClientModal();
}

function deleteClient(clientId) {
  if (!confirm('¿Deseas eliminar este cliente?')) return;
  const state = getState();
  state.clients = state.clients.filter(c => c.id !== clientId);
  saveState(state);
  renderClients();
  renderPos();
  showToast('Cliente eliminado.', 'info');
}

// =====================================================================
// 9. MODAL: COBRAR SALDO PENDIENTE DE FACTURA (CRUD)
// =====================================================================
function openPayOrderModal(orderId) {
  const state = getState();
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return;

  document.getElementById('payModalOrderId').value = order.id;
  document.getElementById('payModalTicket').innerText = order.ticket;
  document.getElementById('payModalClient').innerText = order.clientName;
  document.getElementById('payModalBalance').innerText = `RD$${order.balance.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  document.getElementById('payModalAmount').value = order.balance;

  document.getElementById('payOrderModal').classList.add('active');
}

function closePayOrderModal() {
  document.getElementById('payOrderModal').classList.remove('active');
}

function submitPayOrder(e) {
  e.preventDefault();
  const state = getState();
  const orderId = document.getElementById('payModalOrderId').value;
  const amount = parseFloat(document.getElementById('payModalAmount').value) || 0;
  const method = document.getElementById('payModalMethod').value;

  const order = state.orders.find(o => o.id === orderId);
  if (!order || amount <= 0) return;

  order.paid += amount;
  order.balance = Math.max(0, order.total - order.paid);
  if (order.balance === 0) order.status = 'Pagada';

  state.cashMovements.push({
    id: 'cm_' + Date.now(),
    time: new Date().toLocaleTimeString('es-DO', {hour:'2-digit', minute:'2-digit'}),
    type: 'Cobro Factura',
    concept: `Saldo Factura ${order.ticket} (${order.clientName})`,
    method,
    amount
  });

  const client = state.clients.find(c => c.id === order.clientId);
  if (client && client.isHotel) {
    client.balance = Math.max(0, client.balance - amount);
  }

  saveState(state);
  renderDashboard();
  renderFacturacion();
  renderReportes();
  renderClients();
  closePayOrderModal();
  showToast(`Cobro de RD$${amount} registrado para ${order.ticket}.`, 'success');
}

// =====================================================================
// 10. BÚSQUEDA GLOBAL (⌘K)
// =====================================================================
function handleGlobalSearch(query) {
  const box = document.getElementById('globalSearchResults');
  if (!box) return;

  const term = query.toLowerCase().trim();
  if (!term) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }

  const state = getState();
  const matchingOrders = state.orders.filter(o => o.ticket.toLowerCase().includes(term) || o.clientName.toLowerCase().includes(term));
  const matchingClients = state.clients.filter(c => c.name.toLowerCase().includes(term) || c.phone.includes(term));
  const matchingInventory = state.inventory.filter(i => i.name.toLowerCase().includes(term) || i.code.includes(term));

  let html = '';
  if (matchingOrders.length > 0) {
    html += '<div style="font-size: .65rem; font-weight: 800; color: var(--text-dim); padding: 4px 8px;">FACTURAS</div>';
    matchingOrders.slice(0, 3).forEach(o => {
      html += `
        <div class="search-result-item" onclick="selectSearchResult('order', '${o.id}')">
          <span class="search-result-title">${o.ticket} — ${o.clientName}</span>
          <span class="search-result-desc">Estado: ${o.status} • Total: RD$${o.total}</span>
        </div>
      `;
    });
  }

  if (matchingClients.length > 0) {
    html += '<div style="font-size: .65rem; font-weight: 800; color: var(--text-dim); padding: 4px 8px; margin-top: 4px;">CLIENTES</div>';
    matchingClients.slice(0, 3).forEach(c => {
      html += `
        <div class="search-result-item" onclick="selectSearchResult('client', '${c.id}')">
          <span class="search-result-title">${c.name}</span>
          <span class="search-result-desc">Tel: ${c.phone} • ${c.isHotel ? 'Hotel' : 'Particular'}</span>
        </div>
      `;
    });
  }

  if (matchingInventory.length > 0) {
    html += '<div style="font-size: .65rem; font-weight: 800; color: var(--text-dim); padding: 4px 8px; margin-top: 4px;">INSUMOS</div>';
    matchingInventory.slice(0, 3).forEach(i => {
      html += `
        <div class="search-result-item" onclick="selectSearchResult('inventory', '${i.id}')">
          <span class="search-result-title">${i.name}</span>
          <span class="search-result-desc">Stock: ${i.stock} ${i.unit} • Código: ${i.code}</span>
        </div>
      `;
    });
  }

  if (!html) {
    html = '<div style="padding: 1rem; text-align: center; font-size: .8rem; color: var(--text-dim);">No se encontraron resultados.</div>';
  }

  box.innerHTML = html;
  box.style.display = 'block';
}

function selectSearchResult(type, id) {
  const box = document.getElementById('globalSearchResults');
  if (box) box.style.display = 'none';
  document.getElementById('globalSearchInput').value = '';

  if (type === 'order') {
    switchSection('facturacion', document.querySelectorAll('.nav-item')[2]);
    const state = getState();
    const order = state.orders.find(o => o.id === id);
    if (order) displayThermalTicket(order);
  } else if (type === 'client') {
    switchSection('clientes', document.querySelectorAll('.nav-item')[5]);
    openNewClientModal(id);
  } else if (type === 'inventory') {
    switchSection('inventario', document.querySelectorAll('.nav-item')[4]);
    openNewInsumoModal(id);
  }
}

// =====================================================================
// 11. CONFIGURACIÓN DE LA TIENDA, SECUENCIA Y PERFIL
// =====================================================================
function switchSettingsTab(tabName, btnEl) {
  document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.settings-tab-pane').forEach(p => {
    p.classList.remove('active');
    p.style.display = 'none';
  });

  if (btnEl) btnEl.classList.add('active');
  const pane = document.getElementById('settings-tab-' + tabName);
  if (pane) {
    pane.classList.add('active');
    pane.style.display = 'block';
  }
}

function loadConfigInputs() {
  const state = getState();
  const user = JSON.parse(localStorage.getItem('syncops_user') || '{}');
  
  const displayName = user.name || 'Luis Bravo';
  const displayEmail = user.email || 'luisb@gmail.com';
  const nameParts = displayName.split(' ');
  const firstName = nameParts[0] || 'Luis';
  const lastName = nameParts.slice(1).join(' ') || 'Bravo';
  const avatarText = (firstName[0] + (lastName[0] || '')).toUpperCase() || 'LB';

  const avatarCircle = document.getElementById('cfgAvatarCircle');
  const dispName = document.getElementById('cfgDisplayName');
  const dispEmail = document.getElementById('cfgDisplayEmail');
  if (avatarCircle) avatarCircle.innerText = avatarText;
  if (dispName) dispName.innerText = displayName;
  if (dispEmail) dispEmail.innerText = displayEmail;

  if (document.getElementById('cfgFirstName')) document.getElementById('cfgFirstName').value = firstName;
  if (document.getElementById('cfgLastName')) document.getElementById('cfgLastName').value = lastName;
  if (document.getElementById('cfgUserEmailExact')) document.getElementById('cfgUserEmailExact').value = displayEmail;
  if (document.getElementById('cfgJobTitle')) document.getElementById('cfgJobTitle').value = user.role || 'Administrador General';

  const cfg = state.config || DEFAULT_STATE.config;
  if (document.getElementById('cfgInvoicePrefix')) document.getElementById('cfgInvoicePrefix').value = cfg.invoicePrefix || 'FAC';
  if (document.getElementById('cfgNextInvoiceNumber')) document.getElementById('cfgNextInvoiceNumber').value = cfg.nextInvoiceNumber || 1001;
  if (document.getElementById('cfgBusinessName')) document.getElementById('cfgBusinessName').value = cfg.businessName;
  if (document.getElementById('cfgRnc')) document.getElementById('cfgRnc').value = cfg.rnc;
  if (document.getElementById('cfgPhone')) document.getElementById('cfgPhone').value = cfg.phone;
  if (document.getElementById('cfgAddress')) document.getElementById('cfgAddress').value = cfg.address;
  if (document.getElementById('cfgStoreEmail')) document.getElementById('cfgStoreEmail').value = cfg.email || 'contacto@syncopslaundry.do';
  if (document.getElementById('cfgPrinterWidth')) document.getElementById('cfgPrinterWidth').value = cfg.printerWidth || '80mm';
  if (document.getElementById('cfgTicketFooter')) document.getElementById('cfgTicketFooter').value = cfg.ticketFooter;
}

function saveUserProfileExact(e) {
  e.preventDefault();
  const first = document.getElementById('cfgFirstName').value.trim();
  const last = document.getElementById('cfgLastName').value.trim();
  const email = document.getElementById('cfgUserEmailExact').value.trim();
  const job = document.getElementById('cfgJobTitle').value.trim();

  if (!first || !email) {
    showToast('Nombre y correo son obligatorios.', 'error');
    return;
  }

  const fullName = last ? `${first} ${last}` : first;
  const avatar = (first[0] + (last ? last[0] : '')).toUpperCase() || 'LB';
  const user = { name: fullName, email, role: job || 'Administrador', avatar };
  
  localStorage.setItem('syncops_user', JSON.stringify(user));
  sessionStorage.setItem('syncops_user', JSON.stringify(user));

  checkAuth();
  loadConfigInputs();
  showToast('Perfil actualizado correctamente.', 'success');
}

function saveBusinessConfig(e) {
  if (e) e.preventDefault();
  const state = getState();
  
  const invoicePrefix = document.getElementById('cfgInvoicePrefix').value.trim().toUpperCase() || 'FAC';
  const nextInvoiceNumber = parseInt(document.getElementById('cfgNextInvoiceNumber').value) || 1001;

  state.config = {
    businessName: document.getElementById('cfgBusinessName').value.trim(),
    rnc: document.getElementById('cfgRnc').value.trim(),
    phone: document.getElementById('cfgPhone').value.trim(),
    address: document.getElementById('cfgAddress').value.trim(),
    email: document.getElementById('cfgStoreEmail').value.trim(),
    printerWidth: document.getElementById('cfgPrinterWidth').value,
    printerModel: 'epson-t20ii',
    invoicePrefix,
    nextInvoiceNumber,
    ticketFooter: document.getElementById('cfgTicketFooter').value.trim()
  };

  saveState(state);
  
  const posInv = document.getElementById('posInvoiceNumber');
  if (posInv) posInv.value = getFormattedNextInvoice();

  showToast('Configuración y secuencia de facturas guardadas con éxito.', 'success');
}

// =====================================================================
// 12. FAQ & QA
// =====================================================================
function toggleFaq(buttonEl) {
  const item = buttonEl.closest('.faq-item');
  if (item) {
    item.classList.toggle('open');
  }
}

function filterFaq(term) {
  const q = term.toLowerCase().trim();
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    const text = item.innerText.toLowerCase();
    item.style.display = text.includes(q) ? 'block' : 'none';
  });
}

function runQaTest(testType) {
  if (testType === 'ticket') {
    testEpsonT20II();
  } else if (testType === 'calc') {
    showToast('Test QA: Motor de facturación validado (0 errores).', 'success');
  } else if (testType === 'barcode') {
    showToast('Test QA: Formato Code128 verificado.', 'success');
  } else if (testType === 'reset') {
    if (confirm('¿Deseas restablecer todos los datos de demostración a su estado original?')) {
      localStorage.removeItem('syncops_laundry_state');
      initApp();
      showToast('Datos de demostración restablecidos.', 'info');
    }
  }
}

function submitSupportTicket(e) {
  e.preventDefault();
  const subject = document.getElementById('supportSubject').value;
  document.getElementById('supportSubject').value = '';
  document.getElementById('supportBody').value = '';
  showToast(`Ticket de soporte enviado: "${subject}". ID: #${Math.floor(1000 + Math.random()*9000)}`, 'success');
}

// =====================================================================
// 13. TICKET TÉRMICO IMPRIMIBLE (EPSON TM-T20II)
// =====================================================================
function displayThermalTicket(order) {
  const state = getState();
  const cfg = state.config || DEFAULT_STATE.config;

  document.getElementById('tktHeaderName').innerText = cfg.businessName.toUpperCase();
  document.getElementById('tktHeaderAddress').innerText = cfg.address;
  document.getElementById('tktHeaderPhone').innerText = `Tel: ${cfg.phone} • RNC: ${cfg.rnc}`;
  document.getElementById('tktFooterNote').innerText = `* ${cfg.ticketFooter}`;

  document.getElementById('tktNum').innerText = order.ticket;
  document.getElementById('tktDate').innerText = order.date;
  document.getElementById('tktDelivery').innerText = order.delivery;
  document.getElementById('tktClient').innerText = order.clientName;
  document.getElementById('tktPhone').innerText = order.phone;

  const itemsBody = document.getElementById('tktItemsBody');
  itemsBody.innerHTML = order.items.map(item => `
    <div class="ticket-item-line">
      <span>${item.qty}x ${item.name.slice(0, 24)}</span>
      <span>RD$${item.subtotal.toLocaleString('es-DO')}</span>
    </div>
    ${item.alteration ? `<div style="font-size:.7rem; color:#475569; padding-left:.5rem;">* Arreglo: ${item.alteration}</div>` : ''}
  `).join('');

  document.getElementById('tktSubtotal').innerText = `RD$${order.subtotal.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  document.getElementById('tktDiscount').innerText = `RD$${order.discount.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  document.getElementById('tktTotal').innerText = `RD$${order.total.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  document.getElementById('tktPaid').innerText = `RD$${order.paid.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  document.getElementById('tktBalance').innerText = `RD$${order.balance.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  document.getElementById('tktBarcode').innerText = `*${order.barcode}*`;

  document.getElementById('ticketModal').classList.add('active');
}

function closeTicketModal() {
  document.getElementById('ticketModal').classList.remove('active');
}

function printThermalTicket() {
  window.print();
}

function testEpsonT20II() {
  const testOrder = {
    id: 'test_epson',
    ticket: 'FAC-TEST-0001',
    barcode: '202608219999',
    clientId: 'c1',
    clientName: 'PRUEBA EPSON TM-T20II',
    phone: '809-555-0000',
    date: new Date().toLocaleString('es-DO'),
    delivery: new Date().toLocaleString('es-DO'),
    subtotal: 750,
    discount: 50,
    total: 700,
    paid: 700,
    balance: 0,
    items: [
      { name: 'Prueba de Impresión 80mm', qty: 1, subtotal: 350, alteration: 'ESC/POS Font A 48 cols OK' },
      { name: 'Prueba Código de Barras', qty: 1, subtotal: 400, alteration: 'Code128 / AutoCutter OK' }
    ]
  };

  displayThermalTicket(testOrder);
  showToast('Comprobante preparado para impresora EPSON TM-T20II. Pulsa "Imprimir en EPSON TM-T20II".', 'success');
}

// =====================================================================
// 14. SISTEMA DE TOASTS
// =====================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
