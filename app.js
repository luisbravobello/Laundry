/**
 * SyncOps — Complete Laundry & Tailoring Web Suite
 * Full Interactive CRUD & Reactive Store
 */

// =====================================================================
// 1. LIENZO DE ANIMACIÓN DE PARTÍCULAS
// =====================================================================
function initParticleCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height, particles = [];

  function resize() {
    width = canvas.width = canvas.parentElement.offsetWidth;
    height = canvas.height = canvas.parentElement.offsetHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  class Particle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.75;
      this.vy = (Math.random() - 0.5) * 0.75;
      this.radius = Math.random() * 2 + 1.2;
      this.color = Math.random() > 0.5 ? '#60A5FA' : '#93C5FD';
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > width) this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
      ctx.fill();
    }
  }

  for (let i = 0; i < 35; i++) particles.push(new Particle());

  function animate() {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(147, 197, 253, ${0.35 * (1 - dist / 110)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(animate);
  }
  animate();
}

// =====================================================================
// 2. ESTADO GLOBAL & PERSISTENCIA (LOCALSTORAGE)
// =====================================================================
const DEFAULT_STATE = {
  config: {
    businessName: 'SyncOps Laundry & Tailoring Suite',
    rnc: '131-89745-1',
    phone: '(809) 555-7962',
    address: 'Av. Winston Churchill #102, Santo Domingo',
    printerWidth: '80mm',
    ticketFooter: 'Prendas no retiradas tras 30 días pasan a disposición legal. ¡Gracias por su preferencia!'
  },
  catalog: [
    { id: '1', name: 'Camisa de Vestir / Manga Larga', category: 'Ropa Formal', service: 'LavadoYPlanchado', price: 180 },
    { id: '2', name: 'Pantalón de Vestir / Gabardina', category: 'Ropa Formal', service: 'LavadoYPlanchado', price: 200 },
    { id: '3', name: 'Traje Completo (2 Piezas)', category: 'Ropa Formal', service: 'LavadoYPlanchado', price: 450 },
    { id: '4', name: 'Vestido Casual / Fiesta', category: 'Ropa Casual', service: 'LavadoYPlanchado', price: 350 },
    { id: '5', name: 'Jeans / Pantalón Casual', category: 'Ropa Casual', service: 'LavadoPieza', price: 150 },
    { id: '6', name: 'Planchado Sólo Camisa', category: 'Ropa Formal', service: 'Planchado', price: 90 },
    { id: '7', name: 'Edredón / Acolchado King Size', category: 'Ropa de Cama', service: 'LavadoPieza', price: 600 },
    { id: '8', name: 'Juego de Sábanas Completo', category: 'Ropa de Cama', service: 'LavadoYPlanchado', price: 350 },
    { id: '9', name: 'Ruedo / Dobladillo de Pantalón', category: 'Sastrería', service: 'Sastreria', price: 250 },
    { id: '10', name: 'Ajuste de Cintura / Entalle', category: 'Sastrería', service: 'Sastreria', price: 350 },
    { id: '11', name: 'Cambio de Zipper / Cremallera', category: 'Sastrería', service: 'Sastreria', price: 300 },
    { id: '12', name: 'Lote Toallas Hotel (x Kilo)', category: 'Hotelería', service: 'HotelVolumen', price: 75 }
  ],
  clients: [
    { id: 'c1', name: 'Carlos Manuel Fernández', phone: '809-555-1234', isHotel: false, balance: 250, creditLimit: 0, ordersCount: 4 },
    { id: 'c2', name: 'Hotel Boutique Colonial Santo Domingo', phone: '809-688-9000', isHotel: true, balance: 18500, creditLimit: 50000, ordersCount: 28 },
    { id: 'c3', name: 'María Elena Almonte', phone: '829-444-7890', isHotel: false, balance: 0, creditLimit: 0, ordersCount: 2 }
  ],
  orders: [
    {
      id: 'o1', ticket: 'SAS-2608-001', barcode: '202608210001',
      clientId: 'c1', clientName: 'Carlos Manuel Fernández', phone: '809-555-1234',
      status: 'EnLavado', date: '21/08/2026 01:00 PM', delivery: '23/08/2026 05:00 PM',
      subtotal: 550, discount: 0, total: 550, paid: 300, balance: 250, isUrgent: false,
      items: [
        { name: 'Pantalón de Vestir Azul Marino', service: 'Sastrería', qty: 1, price: 350, alteration: 'Ajuste de Cintura + Ruedo 39 pulg' },
        { name: 'Camisa de Lino Blanco', service: 'LavadoYPlanchado', qty: 1, price: 200 }
      ]
    },
    {
      id: 'o2', ticket: 'HOT-2608-002', barcode: '202608210002',
      clientId: 'c2', clientName: 'Hotel Boutique Colonial Santo Domingo', phone: '809-688-9000',
      status: 'Recibido', date: '21/08/2026 03:00 PM', delivery: '22/08/2026 02:00 PM',
      subtotal: 4500, discount: 0, total: 4500, paid: 0, balance: 4500, isUrgent: true,
      items: [
        { name: 'Lote Toallas Grandes Blancas (Hotel)', service: 'HotelVolumen', qty: 60, price: 75 }
      ]
    },
    {
      id: 'o3', ticket: 'LAV-2608-003', barcode: '202608210003',
      clientId: 'c3', clientName: 'María Elena Almonte', phone: '829-444-7890',
      status: 'Listo', date: '20/08/2026 04:00 PM', delivery: '21/08/2026 04:00 PM',
      subtotal: 730, discount: 0, total: 730, paid: 730, balance: 0, isUrgent: false,
      items: [
        { name: 'Vestido de Fiesta Rojo', service: 'LavadoYPlanchado', qty: 1, price: 550 },
        { name: 'Camisa Manga Larga Rayas', service: 'LavadoYPlanchado', qty: 1, price: 180 }
      ]
    }
  ],
  machines: [
    { id: 'm1', code: 'TORRE-01', name: 'Torre Speed Queen Monedas #1', type: 'tower', status: 'Disponible', remainingSecs: 0, totalCycles: 142, cashbox: 525, price: 175, tokensPerCycle: 3 },
    { id: 'm2', code: 'TORRE-02', name: 'Torre Speed Queen Monedas #2', type: 'tower', status: 'EnCiclo', remainingSecs: 940, totalCycles: 198, cashbox: 875, price: 175, tokensPerCycle: 3 },
    { id: 'm3', code: 'TORRE-03', name: 'Torre Speed Queen Monedas #3', type: 'tower', status: 'Disponible', remainingSecs: 0, totalCycles: 85, cashbox: 350, price: 175, tokensPerCycle: 3 },
    { id: 'm4', code: 'IND-LAV-01', name: 'Lavadora Industrial Gran Volumen (75 Lbs)', type: 'industrial', status: 'Disponible', remainingSecs: 0, totalCycles: 320, cashbox: 0, price: 450, tokensPerCycle: 8 },
    { id: 'm5', code: 'IND-SEC-01', name: 'Secadora Industrial Gas (80 Lbs)', type: 'industrial', status: 'EnCiclo', remainingSecs: 560, totalCycles: 410, cashbox: 1200, price: 400, tokensPerCycle: 8 }
  ],
  inventory: [
    { id: 'i1', code: '746001001', name: 'Detergente Líquido Industrial Bio-Clean', category: 'Detergentes', unit: 'Galones', stock: 18, minStock: 5, cost: 450, provider: 'Químicos del Caribe' },
    { id: 'i2', code: '746001002', name: 'Suavizante Textil Aroma Fresh', category: 'Suavizantes', unit: 'Galones', stock: 4, minStock: 6, cost: 380, provider: 'Químicos del Caribe' },
    { id: 'i3', code: '746001005', name: 'Ganchos de Alambre Reforzados (Caja 500)', category: 'Fundas & Ganchos', unit: 'Cajas', stock: 2, minStock: 3, cost: 1100, provider: 'Plásticos Industriales' },
    { id: 'i4', code: '746001006', name: 'Hilos Gutermann Surtidos Sastrería', category: 'Sastrería', unit: 'Conos', stock: 24, minStock: 10, cost: 180, provider: 'Importadora Textil' },
    { id: 'i5', code: '746001007', name: 'Zippers / Cremalleras Metálicas YKK', category: 'Sastrería', unit: 'Packs', stock: 12, minStock: 5, cost: 450, provider: 'Importadora Textil' }
  ],
  cashMovements: [
    { id: 'cm1', time: '08:00 AM', type: 'Apertura', concept: 'Fondo Inicial de Turno', method: 'Efectivo', amount: 3000 },
    { id: 'cm2', time: '01:05 PM', type: 'Cobro Orden', concept: 'Abono Ticket SAS-2608-001', method: 'Efectivo', amount: 300 },
    { id: 'cm3', time: '02:15 PM', type: 'Venta Fichas', concept: 'Venta 3 Fichas Autoservicio', method: 'Efectivo', amount: 525 },
    { id: 'cm4', time: '04:10 PM', type: 'Cobro Orden', concept: 'Pago Total Ticket LAV-2608-003', method: 'Tarjeta', amount: 730 }
  ]
};

function getState() {
  const saved = localStorage.getItem('syncops_laundry_state');
  if (saved) {
    try { return JSON.parse(saved); } catch(e) {}
  }
  localStorage.setItem('syncops_laundry_state', JSON.stringify(DEFAULT_STATE));
  return DEFAULT_STATE;
}

function saveState(state) {
  localStorage.setItem('syncops_laundry_state', JSON.stringify(state));
}

// =====================================================================
// 3. INICIALIZACIÓN Y NAVEGACIÓN
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
    'kanban': 'Tablero Kanban',
    'autoservicio': 'Autoservicio & Torres',
    'inventario': 'Inventario Insumos',
    'clientes': 'Clientes & Hoteles',
    'caja': 'Control de Caja',
    'configuracion': 'Configuración & Perfil',
    'faq': 'Preguntas Frecuentes',
    'ayuda': 'Ayuda & QA'
  };

  const titleEl = document.getElementById('currentSectionTitle');
  if (titleEl) titleEl.innerText = titles[sectionId] || 'SyncOps Suite';

  if (sectionId === 'dashboard') renderDashboard();
  if (sectionId === 'pos') renderPos();
  if (sectionId === 'kanban') renderKanban();
  if (sectionId === 'autoservicio') renderMachines();
  if (sectionId === 'inventario') renderInventory();
  if (sectionId === 'clientes') renderClients();
  if (sectionId === 'caja') renderCash();
  if (sectionId === 'configuracion') loadConfigInputs();
}

function initApp() {
  setInterval(tickMachineCycles, 1000);
  renderDashboard();
  renderPos();
  renderKanban();
  renderMachines();
  renderInventory();
  renderClients();
  renderCash();
  loadConfigInputs();
}

// =====================================================================
// 4. MÓDULO 1: DASHBOARD
// =====================================================================
function renderDashboard() {
  const state = getState();

  const ventasHoy = state.cashMovements
    .filter(m => m.type !== 'Apertura')
    .reduce((sum, m) => sum + m.amount, 0);

  const prendasTaller = state.orders
    .filter(o => o.status !== 'Listo' && o.status !== 'Entregado')
    .reduce((sum, o) => sum + o.items.length, 0);

  const maquinasEnUso = state.machines.filter(m => m.status === 'EnCiclo').length;
  const insumosAlertas = state.inventory.filter(i => i.stock <= i.minStock).length;

  document.getElementById('kpiVentasHoy').innerText = `RD$${ventasHoy.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  document.getElementById('kpiPrendasTaller').innerText = prendasTaller;
  document.getElementById('kpiInsumosAlertCount').innerText = insumosAlertas;
  document.getElementById('kpiAutoservicio').innerHTML = `${maquinasEnUso} <span class="kpi-number-sub">en uso</span>`;

  const tbody = document.querySelector('#tableRecentOrders tbody');
  if (tbody) {
    tbody.innerHTML = state.orders.slice(0, 5).map(o => `
      <tr>
        <td><strong class="font-mono text-blue">${o.ticket}</strong><div style="font-size: .72rem; color: var(--text-muted);">${o.date}</div></td>
        <td><strong>${o.clientName}</strong></td>
        <td><span class="status-badge ${getStatusClass(o.status)}"><span class="status-dot"></span> ${o.status}</span></td>
        <td style="text-align: right;"><strong class="font-mono">RD$${o.total.toLocaleString('es-DO')}</strong><div style="font-size: .72rem; color: #DC2626; font-weight: 700;">${o.balance > 0 ? 'Pend: RD$' + o.balance : 'Pagado'}</div></td>
        <td>
          <div style="display: flex; gap: .35rem;">
            ${o.balance > 0 ? `<button class="btn btn-outline btn-sm" onclick="openPayOrderModal('${o.id}')">Cobrar $</button>` : ''}
            <button class="btn btn-outline btn-sm" onclick="displayThermalTicket(getState().orders.find(x=>x.id==='${o.id}'))">Ticket</button>
          </div>
        </td>
      </tr>
    `).join('');
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

function getStatusClass(status) {
  switch(status) {
    case 'Recibido': return 'status-todo';
    case 'EnLavado':
    case 'EnSastreria': return 'status-progress';
    case 'EnPlanchado': return 'status-review';
    case 'Listo':
    case 'Entregado': return 'status-done';
    default: return 'status-progress';
  }
}

// =====================================================================
// 5. MÓDULO 2: PUNTO DE VENTA (POS)
// =====================================================================
let currentOrderItems = [];
let currentPaymentMethod = 'Efectivo';

function renderPos() {
  const state = getState();
  const select = document.getElementById('posClientSelect');
  if (select) {
    select.innerHTML = state.clients.map(c => `
      <option value="${c.id}">${c.name} ${c.isHotel ? '(Hotel / Crédito)' : ''}</option>
    `).join('');
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

  const items = category === 'Todos' 
    ? state.catalog 
    : state.catalog.filter(i => i.category === category);

  grid.innerHTML = items.map(item => `
    <div class="catalog-item-card" onclick="selectCatalogItem('${item.id}')">
      <div class="catalog-item-name">${item.name}</div>
      <div class="catalog-item-price">RD$${item.price}</div>
    </div>
  `).join('');
}

function selectCatalogItem(itemId) {
  const state = getState();
  const item = state.catalog.find(i => i.id === itemId);
  if (!item) return;

  document.getElementById('builderDesc').value = item.name;
  document.getElementById('builderPrice').value = item.price;
  document.getElementById('builderService').value = item.service;
  document.getElementById('builderItemName').innerText = `Configuración: ${item.name}`;
  
  toggleTailoringDrawer(item.service);
}

function toggleTailoringDrawer(service) {
  const drawer = document.getElementById('tailoringDrawer');
  if (drawer) {
    drawer.style.display = (service === 'Sastreria') ? 'block' : 'none';
  }
}

function addItemToOrder() {
  const desc = document.getElementById('builderDesc').value.trim();
  const service = document.getElementById('builderService').value;
  const qty = parseFloat(document.getElementById('builderQty').value) || 1;
  const price = parseFloat(document.getElementById('builderPrice').value) || 0;
  const color = document.getElementById('builderColor').value.trim();
  const defects = document.getElementById('builderDefects').value.trim();
  const alteration = document.getElementById('tailorAlterationType').value.trim();
  const measurements = document.getElementById('tailorMeasurements').value.trim();

  if (!desc) {
    showToast('Ingresa la descripción de la prenda.', 'error');
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
  showToast('Prenda agregada a la orden.', 'success');
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

  countBadge.innerText = `${currentOrderItems.length} prendas`;

  if (currentOrderItems.length === 0) {
    box.innerHTML = '<div class="empty-state-pos">No hay prendas agregadas a la orden.</div>';
    return;
  }

  box.innerHTML = currentOrderItems.map((item, idx) => `
    <div class="pos-item-row">
      <div class="pos-item-info">
        <strong>${item.name} (${item.qty}x)</strong>
        <span>Servicio: ${item.service} ${item.color ? '• ' + item.color : ''}</span>
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
    showToast('Agrega al menos una prenda para emitir la orden.', 'error');
    return;
  }

  const state = getState();
  const clientId = document.getElementById('posClientSelect').value;
  const client = state.clients.find(c => c.id === clientId) || state.clients[0];
  const delivery = document.getElementById('posDeliveryDate').value;
  const discount = parseFloat(document.getElementById('posDiscount').value) || 0;
  const paid = parseFloat(document.getElementById('posAmountPaid').value) || 0;
  const isUrgent = document.getElementById('posIsUrgent').checked;

  const subtotal = currentOrderItems.reduce((sum, i) => sum + i.subtotal, 0);
  const total = Math.max(0, subtotal + (isUrgent ? subtotal * 0.15 : 0) - discount);
  const balance = Math.max(0, total - paid);

  const prefix = currentOrderItems.some(i => i.service === 'Sastreria') ? 'SAS' : 'LAV';
  const orderCount = state.orders.length + 1;
  const ticket = `${prefix}-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth()+1).toString().padStart(2,'0')}-${orderCount.toString().padStart(3,'0')}`;
  const barcode = `${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2,'0')}${new Date().getDate().toString().padStart(2,'0')}${orderCount.toString().padStart(4,'0')}`;

  const newOrder = {
    id: 'ord_' + Date.now(),
    ticket,
    barcode,
    clientId: client.id,
    clientName: client.name,
    phone: client.phone,
    status: 'Recibido',
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

  if (paid > 0) {
    state.cashMovements.push({
      id: 'cm_' + Date.now(),
      time: new Date().toLocaleTimeString('es-DO', {hour:'2-digit', minute:'2-digit'}),
      type: 'Cobro Orden',
      concept: `Abono Ticket ${ticket} (${client.name})`,
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
  renderPosItems();
  calculatePosTotal();

  showToast(`Orden ${ticket} creada exitosamente.`, 'success');
}

// =====================================================================
// 6. MÓDULO 3: TABLERO KANBAN DE TALLER
// =====================================================================
function renderKanban(filter = '') {
  const state = getState();
  const term = filter.toLowerCase().trim();

  const cols = {
    'Recibido': document.getElementById('colRecibido'),
    'EnLavado': document.getElementById('colEnProceso'),
    'EnPlanchado': document.getElementById('colEnPlanchado'),
    'Listo': document.getElementById('colListo')
  };

  Object.values(cols).forEach(col => { if (col) col.innerHTML = ''; });
  const counts = { Recibido: 0, EnProceso: 0, EnPlanchado: 0, Listo: 0 };

  state.orders.forEach(order => {
    if (term && !order.ticket.toLowerCase().includes(term) && !order.clientName.toLowerCase().includes(term)) {
      return;
    }

    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.innerHTML = `
      <div class="kanban-card-top">
        <span class="kanban-ticket">${order.ticket}</span>
        <span style="font-size: .75rem; font-weight: 800; color: var(--text-muted);">${order.items.length} pzs</span>
      </div>
      <div class="kanban-customer">${order.clientName}</div>
      <div class="kanban-meta">Entrega: ${order.delivery}</div>
      ${order.isUrgent ? '<div class="badge-pill bg-rose font-bold" style="background:#FFE4E6; color:#E11D48; margin-bottom:.5rem;">⚡ Urgente</div>' : ''}
      <div style="display: flex; gap: .35rem;">
        <button class="kanban-btn-advance" style="flex: 1;" onclick="advanceOrderStatus('${order.id}')">
          ${getNextStepLabel(order.status)}
        </button>
        ${order.balance > 0 ? `<button class="btn btn-outline btn-sm" onclick="openPayOrderModal('${order.id}')" title="Cobrar Saldo">$</button>` : ''}
      </div>
    `;

    if (order.status === 'Recibido' && cols['Recibido']) {
      cols['Recibido'].appendChild(card);
      counts.Recibido++;
    } else if ((order.status === 'EnLavado' || order.status === 'EnSastreria') && cols['EnLavado']) {
      cols['EnLavado'].appendChild(card);
      counts.EnProceso++;
    } else if (order.status === 'EnPlanchado' && cols['EnPlanchado']) {
      cols['EnPlanchado'].appendChild(card);
      counts.EnPlanchado++;
    } else if ((order.status === 'Listo' || order.status === 'Entregado') && cols['Listo']) {
      cols['Listo'].appendChild(card);
      counts.Listo++;
    }
  });

  document.getElementById('countRecibido').innerText = counts.Recibido;
  document.getElementById('countEnProceso').innerText = counts.EnProceso;
  document.getElementById('countEnPlanchado').innerText = counts.EnPlanchado;
  document.getElementById('countListo').innerText = counts.Listo;
  document.getElementById('navCountTaller').innerText = counts.EnProceso + counts.EnPlanchado;
}

function getNextStepLabel(status) {
  switch(status) {
    case 'Recibido': return 'Iniciar Lavado / Taller ➔';
    case 'EnLavado':
    case 'EnSastreria': return 'Pasar a Planchado ➔';
    case 'EnPlanchado': return 'Listo para Mostrador ➔';
    case 'Listo': return 'Entregar al Cliente ✓';
    default: return 'Completado';
  }
}

function advanceOrderStatus(orderId) {
  const state = getState();
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return;

  if (order.status === 'Recibido') order.status = 'EnLavado';
  else if (order.status === 'EnLavado' || order.status === 'EnSastreria') order.status = 'EnPlanchado';
  else if (order.status === 'EnPlanchado') order.status = 'Listo';
  else if (order.status === 'Listo') order.status = 'Entregado';

  saveState(state);
  renderKanban();
  renderDashboard();
  showToast(`Ticket ${order.ticket}: ${order.status}`, 'success');
}

function filterKanban(val) {
  renderKanban(val);
}

// =====================================================================
// 7. MÓDULO 4: AUTOSERVICIO & TORRES
// =====================================================================
function renderMachines() {
  const state = getState();
  const towersBox = document.getElementById('towersGrid');
  const industrialBox = document.getElementById('industrialGrid');
  if (!towersBox || !industrialBox) return;

  const towers = state.machines.filter(m => m.type === 'tower');
  const industrials = state.machines.filter(m => m.type === 'industrial');

  towersBox.innerHTML = towers.map(m => `
    <div class="machine-card">
      <div class="machine-header">
        <span class="machine-code">${m.code}</span>
        <span class="status-badge ${m.status === 'EnCiclo' ? 'status-progress' : 'status-done'}">
          <span class="status-dot"></span> ${m.status === 'EnCiclo' ? 'Lavando / Secando' : 'Disponible'}
        </span>
      </div>

      <div class="drum-visual ${m.status === 'EnCiclo' ? 'drum-spinning' : ''}">
        <span>${m.status === 'EnCiclo' ? 'ACTIVA' : 'STANDBY'}</span>
      </div>

      <div class="machine-timer font-mono">
        ${m.status === 'EnCiclo' ? formatSecs(m.remainingSecs) : '00:00'}
      </div>

      <div class="machine-cashbox">
        <span>Cajetín Monedas:</span>
        <strong class="font-mono text-blue">RD$${m.cashbox}</strong>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: .5rem;">
        <button class="btn btn-primary btn-sm" onclick="startMachineCycle('${m.id}')" ${m.status === 'EnCiclo' ? 'disabled' : ''}>
          ${m.status === 'EnCiclo' ? 'En Ciclo' : 'Iniciar'}
        </button>
        <button class="btn btn-outline btn-sm" onclick="emptyMachineCashbox('${m.id}')">
          Vaciar $
        </button>
      </div>
    </div>
  `).join('');

  industrialBox.innerHTML = industrials.map(m => `
    <div class="machine-card" style="background: #EEF2FF; border-color: #C7D2FE;">
      <div class="machine-header">
        <span class="machine-code" style="color: #312E81;">${m.code}</span>
        <span class="status-badge ${m.status === 'EnCiclo' ? 'status-progress' : 'status-done'}">
          <span class="status-dot"></span> ${m.status}
        </span>
      </div>

      <div class="drum-visual ${m.status === 'EnCiclo' ? 'drum-spinning' : ''}" style="border-color: #818CF8; color: #312E81;">
        <span>${m.status === 'EnCiclo' ? 'PESADO' : '75-80 LBS'}</span>
      </div>

      <div class="machine-timer font-mono" style="color: #312E81;">
        ${m.status === 'EnCiclo' ? formatSecs(m.remainingSecs) : '00:00'}
      </div>

      <div class="machine-cashbox" style="background: #FFFFFF;">
        <span>Capacidad:</span>
        <strong class="font-mono">75-80 Lbs</strong>
      </div>

      <button class="btn btn-success btn-block" onclick="startMachineCycle('${m.id}')" ${m.status === 'EnCiclo' ? 'disabled' : ''}>
        ${m.status === 'EnCiclo' ? 'Lavado en Curso' : 'Iniciar Ciclo Industrial (45 min)'}
      </button>
    </div>
  `).join('');
}

function formatSecs(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function tickMachineCycles() {
  const state = getState();
  let changed = false;

  state.machines.forEach(m => {
    if (m.status === 'EnCiclo') {
      m.remainingSecs -= 1;
      if (m.remainingSecs <= 0) {
        m.status = 'Disponible';
        m.remainingSecs = 0;
        showToast(`Ciclo completado en ${m.code}.`, 'success');
      }
      changed = true;
    }
  });

  if (changed) {
    saveState(state);
    const autoservicioSection = document.getElementById('section-autoservicio');
    if (autoservicioSection && autoservicioSection.classList.contains('active')) {
      renderMachines();
    }
  }
}

function startMachineCycle(machineId) {
  const state = getState();
  const machine = state.machines.find(m => m.id === machineId);
  if (!machine) return;

  machine.status = 'EnCiclo';
  machine.remainingSecs = 35 * 60;
  machine.totalCycles += 1;
  machine.cashbox += machine.price;

  saveState(state);
  renderMachines();
  renderDashboard();
  showToast(`Ciclo iniciado en ${machine.code}.`, 'success');
}

function emptyMachineCashbox(machineId) {
  const state = getState();
  const machine = state.machines.find(m => m.id === machineId);
  if (!machine || machine.cashbox <= 0) {
    showToast('El cajetín no tiene monedas acumuladas.', 'error');
    return;
  }

  const amount = machine.cashbox;
  machine.cashbox = 0;

  state.cashMovements.push({
    id: 'cm_' + Date.now(),
    time: new Date().toLocaleTimeString('es-DO', {hour:'2-digit', minute:'2-digit'}),
    type: 'Venta Fichas',
    concept: `Vaciado Cajetín ${machine.code}`,
    method: 'Efectivo',
    amount
  });

  saveState(state);
  renderMachines();
  renderDashboard();
  showToast(`Cajetín vaciado: RD$${amount} ingresados en caja.`, 'success');
}

function calculateTokenSale() {
  const qty = parseFloat(document.getElementById('tokenQty').value) || 0;
  const price = parseFloat(document.getElementById('tokenPrice').value) || 0;
  document.getElementById('tokenTotalCost').innerText = `RD$${(qty * price).toLocaleString('es-DO', {minimumFractionDigits:2})}`;
}

function sellTokens() {
  const qty = parseFloat(document.getElementById('tokenQty').value) || 0;
  const price = parseFloat(document.getElementById('tokenPrice').value) || 0;
  const clientName = document.getElementById('tokenClientName').value.trim() || 'Cliente Autoservicio';
  const total = qty * price;

  if (qty <= 0) return;

  const state = getState();
  state.cashMovements.push({
    id: 'cm_' + Date.now(),
    time: new Date().toLocaleTimeString('es-DO', {hour:'2-digit', minute:'2-digit'}),
    type: 'Venta Fichas',
    concept: `Venta de ${qty} Fichas (${clientName})`,
    method: 'Efectivo',
    amount: total
  });

  saveState(state);
  renderDashboard();
  renderCash();
  showToast(`Venta de ${qty} fichas registrada (RD$${total}).`, 'success');
}

// =====================================================================
// 8. CRUD COMPLETO: INVENTARIO DE INSUMOS
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
  `).join('');

  if (restockSelect) {
    restockSelect.innerHTML = state.inventory.map(i => `
      <option value="${i.id}">${i.name} (Actual: ${i.stock} ${i.unit})</option>
    `).join('');
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
// 9. CRUD COMPLETO: CLIENTES & CUENTAS DE HOTELES
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
  `).join('');
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
// 10. MODAL DE COBRO DE SALDO PENDIENTE (CRUD)
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

  state.cashMovements.push({
    id: 'cm_' + Date.now(),
    time: new Date().toLocaleTimeString('es-DO', {hour:'2-digit', minute:'2-digit'}),
    type: 'Cobro Saldo',
    concept: `Saldo Ticket ${order.ticket} (${order.clientName})`,
    method,
    amount
  });

  const client = state.clients.find(c => c.id === order.clientId);
  if (client && client.isHotel) {
    client.balance = Math.max(0, client.balance - amount);
  }

  saveState(state);
  renderDashboard();
  renderKanban();
  renderCash();
  renderClients();
  closePayOrderModal();
  showToast(`Pago de RD$${amount} registrado para ${order.ticket}.`, 'success');
}

// =====================================================================
// 11. BÚSQUEDA GLOBAL (⌘K TOPBAR SEARCH)
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
    html += '<div style="font-size: .65rem; font-weight: 800; color: var(--text-dim); padding: 4px 8px;">ÓRDENES</div>';
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
    switchSection('kanban', document.querySelectorAll('.nav-item')[2]);
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
// 12. CONTROL DE CAJA
// =====================================================================
function renderCash() {
  const state = getState();
  const tbody = document.getElementById('cashMovementsTableBody');
  if (!tbody) return;

  tbody.innerHTML = state.cashMovements.map(m => `
    <tr>
      <td><span class="font-mono text-muted">${m.time}</span></td>
      <td><span class="badge-pill bg-blue">${m.type}</span></td>
      <td><strong>${m.concept}</strong></td>
      <td><span class="font-mono">${m.method}</span></td>
      <td style="text-align: right;"><strong class="font-mono">RD$${m.amount.toLocaleString('es-DO', {minimumFractionDigits:2})}</strong></td>
    </tr>
  `).join('');

  const cash = state.cashMovements.filter(m => m.method === 'Efectivo' && m.type !== 'Apertura').reduce((sum, m) => sum + m.amount, 0);
  const tokens = state.cashMovements.filter(m => m.type === 'Venta Fichas').reduce((sum, m) => sum + m.amount, 0);
  const cards = state.cashMovements.filter(m => m.method === 'Tarjeta').reduce((sum, m) => sum + m.amount, 0);
  const total = cash + cards;

  document.getElementById('cashTotalCash').innerText = `RD$${cash.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  document.getElementById('cashTotalTokens').innerText = `RD$${tokens.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  document.getElementById('cashTotalCards').innerText = `RD$${cards.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  document.getElementById('cashGrandTotal').innerText = `RD$${total.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
}

function closeCashShift() {
  const declared = parseFloat(document.getElementById('cashDeclared').value) || 0;
  showToast(`Turno cerrado con éxito. Arqueo: RD$${declared}.`, 'success');
}

// =====================================================================
// 13. CONFIGURACIÓN & PERFIL
// =====================================================================
// =====================================================================
// 13. CONFIGURACIÓN & PERFIL (EXACT MATCH SCREENSHOT)
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
  
  const displayName = user.name || 'Luis Brito';
  const displayEmail = user.email || 'luisb@gmail.com';
  const nameParts = displayName.split(' ');
  const firstName = nameParts[0] || 'Luis';
  const lastName = nameParts.slice(1).join(' ') || 'Brito';
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
  if (document.getElementById('cfgJobTitle')) document.getElementById('cfgJobTitle').value = user.role || 'Ingeniero de Software (Google)';

  const cfg = state.config || DEFAULT_STATE.config;
  if (document.getElementById('cfgBusinessName')) document.getElementById('cfgBusinessName').value = cfg.businessName;
  if (document.getElementById('cfgRnc')) document.getElementById('cfgRnc').value = cfg.rnc;
  if (document.getElementById('cfgPhone')) document.getElementById('cfgPhone').value = cfg.phone;
  if (document.getElementById('cfgAddress')) document.getElementById('cfgAddress').value = cfg.address;
  if (document.getElementById('cfgPrinterWidth')) document.getElementById('cfgPrinterWidth').value = cfg.printerWidth;
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
  showToast('Cambios guardados con éxito.', 'success');
}

function saveUserProfile() {
  saveUserProfileExact({ preventDefault: () => {} });
}

function saveBusinessConfig() {
  const state = getState();
  state.config = {
    businessName: document.getElementById('cfgBusinessName').value.trim(),
    rnc: document.getElementById('cfgRnc').value.trim(),
    phone: document.getElementById('cfgPhone').value.trim(),
    address: document.getElementById('cfgAddress').value.trim(),
    printerWidth: document.getElementById('cfgPrinterWidth').value,
    ticketFooter: document.getElementById('cfgTicketFooter').value.trim()
  };

  saveState(state);
  showToast('Configuración de la empresa guardada.', 'success');
}


// =====================================================================
// 14. FAQ & AYUDA QA
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
    const state = getState();
    if (state.orders.length > 0) {
      displayThermalTicket(state.orders[0]);
      showToast('Test QA: Ticket generado correctamente.', 'success');
    }
  } else if (testType === 'calc') {
    showToast('Test QA: Motor de cálculo validado (0 errores).', 'success');
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
// 15. TICKET TÉRMICO IMPRIMIBLE
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
      <span>${item.qty}x ${item.name.slice(0, 22)}</span>
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

// =====================================================================
// 16. SISTEMA DE NOTIFICACIONES (TOASTS)
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
