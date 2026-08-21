/**
 * SyncOps — Laundry, Tailoring & Coin-op Suite (Web App Logic)
 */

// =====================================================================
// 1. LIENZO DE ANIMACIÓN DE PARTÍCULAS (PARTICLE CONSTELLATION)
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
    { id: 'c1', name: 'Carlos Manuel Fernández', phone: '809-555-1234', isHotel: false, balance: 0, creditLimit: 0, ordersCount: 4 },
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
        { name: 'Pantalón de Vestir Azul Marino', service: 'Sastrería', qty: 1, price: 350, alteration: 'Ajuste de Cintura + Ruedo 39"' },
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
    { id: 'i4', code: '746001006', name: 'Hilos Gutermann Surtidos Sastrería', category: 'Sastrería & Costura', unit: 'Conos', stock: 24, minStock: 10, cost: 180, provider: 'Importadora Textil' },
    { id: 'i5', code: '746001007', name: 'Zippers / Cremalleras Metálicas YKK', category: 'Sastrería & Costura', unit: 'Packs', stock: 12, minStock: 5, cost: 450, provider: 'Importadora Textil' }
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
// 3. INICIALIZACIÓN Y NAVEGACIÓN SPA
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Verificar autenticación si estamos en index.html
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
  if (nameEl) nameEl.innerText = user.name || 'Luis Bravo Bello';
  if (avatarEl) avatarEl.innerText = user.avatar || 'LB';
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
    'dashboard': 'Panel de Control & Métricas',
    'pos': 'Punto de Venta / Recepción de Prendas',
    'kanban': 'Tablero de Taller & Flujo de Prendas',
    'autoservicio': 'Monitoreo de Autoservicio & Torres',
    'inventario': 'Inventario de Insumos & Suministros',
    'clientes': 'Directorio de Clientes & Hoteles',
    'caja': 'Control de Caja & Arqueo'
  };

  const titleEl = document.getElementById('currentSectionTitle');
  if (titleEl) titleEl.innerText = titles[sectionId] || 'SyncOps Laundry Suite';

  // Renderizar contenido dinámico al cambiar
  if (sectionId === 'dashboard') renderDashboard();
  if (sectionId === 'pos') renderPos();
  if (sectionId === 'kanban') renderKanban();
  if (sectionId === 'autoservicio') renderMachines();
  if (sectionId === 'inventario') renderInventory();
  if (sectionId === 'clientes') renderClients();
  if (sectionId === 'caja') renderCash();
}

function initApp() {
  // Iniciar reloj
  setInterval(() => {
    const clock = document.getElementById('liveClock');
    if (clock) clock.innerText = new Date().toLocaleTimeString('es-DO');
  }, 1000);

  // Iniciar temporizador de ciclos de lavadoras
  setInterval(tickMachineCycles, 1000);

  // Renderizar vistas iniciales
  renderDashboard();
  renderPos();
  renderKanban();
  renderMachines();
  renderInventory();
  renderClients();
  renderCash();
}

// =====================================================================
// 4. MÓDULO 1: DASHBOARD
// =====================================================================
function renderDashboard() {
  const state = getState();

  // Calcular métricas
  const ventasHoy = state.cashMovements
    .filter(m => m.type !== 'Apertura')
    .reduce((sum, m) => sum + m.amount, 0);

  const prendasTaller = state.orders
    .filter(o => o.status !== 'Listo' && o.status !== 'Entregado')
    .reduce((sum, o) => sum + o.items.length, 0);

  const maquinasEnUso = state.machines.filter(m => m.status === 'EnCiclo').length;
  const maquinasLibres = state.machines.filter(m => m.status === 'Disponible').length;

  const creditoHoteles = state.clients
    .filter(c => c.isHotel)
    .reduce((sum, c) => sum + c.balance, 0);

  document.getElementById('kpiVentasHoy').innerText = `RD$${ventasHoy.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  document.getElementById('kpiPrendasTaller').innerText = prendasTaller;
  document.getElementById('kpiMaquinasUso').innerText = maquinasEnUso;
  document.getElementById('kpiAutoservicio').innerHTML = `<span class="text-blue">${maquinasEnUso}</span> <span class="kpi-dim">en uso / ${maquinasLibres} libres</span>`;
  document.getElementById('kpiHotelesCredito').innerText = `RD$${creditoHoteles.toLocaleString('es-DO', {minimumFractionDigits:2})}`;

  // Tabla órdenes recientes
  const tbody = document.querySelector('#tableRecentOrders tbody');
  if (tbody) {
    tbody.innerHTML = state.orders.slice(0, 5).map(o => `
      <tr>
        <td><strong class="font-mono text-blue">${o.ticket}</strong><div style="font-size: .72rem; color: var(--text-muted);">${o.date}</div></td>
        <td><strong>${o.clientName}</strong></td>
        <td><span class="status-badge ${getStatusClass(o.status)}"><span class="status-dot"></span> ${o.status}</span></td>
        <td style="text-align: right;"><strong class="font-mono">RD$${o.total.toLocaleString('es-DO')}</strong><div style="font-size: .72rem; color: #DC2626; font-weight: 700;">${o.balance > 0 ? 'Pend: RD$' + o.balance : 'Pagado'}</div></td>
      </tr>
    `).join('');
  }

  // Alertas de insumos
  const alertsBox = document.getElementById('dashboardAlertsList');
  const insumosBajoStock = state.inventory.filter(i => i.stock <= i.minStock);
  if (alertsBox) {
    alertsBox.innerHTML = insumosBajoStock.map(i => `
      <div style="background: var(--status-danger-bg); border: 1px solid var(--status-danger-border); border-radius: var(--r-md); padding: .75rem 1rem; margin-bottom: .5rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="color: var(--status-danger-text); font-size: .84rem;">${i.name}</strong>
          <div style="font-size: .72rem; color: var(--text-muted);">Prov: ${i.provider}</div>
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

  // Cargar clientes en select
  const select = document.getElementById('posClientSelect');
  if (select) {
    select.innerHTML = state.clients.map(c => `
      <option value="${c.id}">${c.name} ${c.isHotel ? '(🏨 Hotel / Crédito)' : ''}</option>
    `).join('');
  }

  // Fecha por defecto mañana
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
  document.getElementById('builderItemName').innerText = `Configurando: ${item.name}`;
  
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

  // Limpiar campos
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
        ${item.alteration ? `<div style="color: var(--blue-vibrant); font-size: .72rem; font-weight: 700;">✂️ ${item.alteration}</div>` : ''}
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

  // Registrar cobro en caja si hubo abono
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

  // Si tiene balance y es hotel, sumar a su cuenta corriente
  if (balance > 0 && client.isHotel) {
    client.balance += balance;
  }

  saveState(state);

  // Mostrar Ticket Modal
  displayThermalTicket(newOrder);

  // Limpiar POS
  currentOrderItems = [];
  document.getElementById('posDiscount').value = '0';
  document.getElementById('posAmountPaid').value = '0';
  document.getElementById('posIsUrgent').checked = false;
  renderPosItems();
  calculatePosTotal();

  showToast(`¡Orden ${ticket} creada exitosamente!`, 'success');
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
      <div class="kanban-meta">📅 Entrega: ${order.delivery}</div>
      ${order.isUrgent ? '<div class="badge-pill bg-rose font-bold" style="background:#FFE4E6; color:#E11D48; margin-bottom:.5rem;">⚡ Urgente</div>' : ''}
      <button class="kanban-btn-advance" onclick="advanceOrderStatus('${order.id}')">
        ${getNextStepLabel(order.status)}
      </button>
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
    case 'EnPlanchado': return 'Listo para Mostrador ✓';
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
  showToast(`Ticket ${order.ticket} actualizado a: ${order.status}`, 'success');
}

function filterKanban(val) {
  renderKanban(val);
}

// =====================================================================
// 7. MÓDULO 4: AUTOSERVICIO & TORRES DE MONEDAS
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

      <!-- Tambor con animación giratoria -->
      <div class="drum-visual ${m.status === 'EnCiclo' ? 'drum-spinning' : ''}">
        <span class="drum-clothes">${m.status === 'EnCiclo' ? '🫧' : '👕'}</span>
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
          ${m.status === 'EnCiclo' ? 'En Ciclo' : '▶ Ciclo'}
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

      <div class="drum-visual ${m.status === 'EnCiclo' ? 'drum-spinning' : ''}" style="border-color: #818CF8;">
        <span class="drum-clothes">${m.status === 'EnCiclo' ? '🌊' : '🏨'}</span>
      </div>

      <div class="machine-timer font-mono" style="color: #312E81;">
        ${m.status === 'EnCiclo' ? formatSecs(m.remainingSecs) : '00:00'}
      </div>

      <div class="machine-cashbox" style="background: #FFFFFF;">
        <span>Capacidad Lbs:</span>
        <strong class="font-mono">75-80 Lbs</strong>
      </div>

      <button class="btn btn-success btn-block" onclick="startMachineCycle('${m.id}')" ${m.status === 'EnCiclo' ? 'disabled' : ''}>
        ${m.status === 'EnCiclo' ? 'Lavado Pesado en Curso' : 'Iniciar Ciclo Industrial (45 min)'}
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
        showToast(`¡Ciclo de lavado completado en ${m.code}!`, 'success');
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
  machine.remainingSecs = 35 * 60; // 35 minutos
  machine.totalCycles += 1;
  machine.cashbox += machine.price;

  saveState(state);
  renderMachines();
  renderDashboard();
  showToast(`Ciclo iniciado en ${machine.code}. Sonido de monedas registrado.`, 'success');
}

function emptyMachineCashbox(machineId) {
  const state = getState();
  const machine = state.machines.find(m => m.id === machineId);
  if (!machine || machine.cashbox <= 0) {
    showToast('El cajetín no tiene dinero acumulado.', 'error');
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
  showToast(`Cajetín vaciado. RD$${amount} agregados al turno de caja.`, 'success');
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
  showToast(`Venta de ${qty} fichas registrada por RD$${total.toLocaleString('es-DO')}.`, 'success');
}

// =====================================================================
// 8. MÓDULO 5: INVENTARIO, CLIENTES & CAJA
// =====================================================================
function renderInventory() {
  const state = getState();
  const tbody = document.getElementById('inventoryTableBody');
  const restockSelect = document.getElementById('quickRestockSelect');
  if (!tbody) return;

  tbody.innerHTML = state.inventory.map(i => `
    <tr>
      <td><span class="font-mono text-muted">${i.code}</span></td>
      <td><strong>${i.name}</strong><div style="font-size:.72rem; color:var(--text-muted);">Prov: ${i.provider}</div></td>
      <td><span class="badge-pill bg-blue">${i.category}</span></td>
      <td><strong class="font-mono ${i.stock <= i.minStock ? 'text-rose font-bold' : ''}">${i.stock} ${i.unit}</strong></td>
      <td><span class="font-mono">${i.minStock} ${i.unit}</span></td>
      <td><span class="font-mono">RD$${i.cost}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="addStockItem('${i.id}', 5)">+5 ${i.unit}</button>
      </td>
    </tr>
  `).join('');

  if (restockSelect) {
    restockSelect.innerHTML = state.inventory.map(i => `
      <option value="${i.id}">${i.name} (Actual: ${i.stock} ${i.unit})</option>
    `).join('');
  }
}

function addStockItem(itemId, delta) {
  const state = getState();
  const item = state.inventory.find(i => i.id === itemId);
  if (!item) return;

  item.stock += delta;
  saveState(state);
  renderInventory();
  renderDashboard();
  showToast(`Stock de ${item.name} aumentado en +${delta} ${item.unit}.`, 'success');
}

function executeQuickRestock() {
  const select = document.getElementById('quickRestockSelect');
  const qty = parseFloat(document.getElementById('quickRestockQty').value) || 0;
  if (select && select.value && qty > 0) {
    addStockItem(select.value, qty);
  }
}

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
          ${c.isHotel ? '🏨 Hotel / Corporativo' : '👤 Particular'}
        </span>
      </td>
      <td>
        <strong class="font-mono ${c.balance > 0 ? 'text-rose font-bold' : ''}">
          RD$${c.balance.toLocaleString('es-DO', {minimumFractionDigits:2})}
        </strong>
      </td>
      <td><span class="font-mono">${c.creditLimit > 0 ? 'RD$' + c.creditLimit.toLocaleString('es-DO') : 'Sin Crédito'}</span></td>
      <td><span class="font-mono">${c.ordersCount}</span></td>
    </tr>
  `).join('');
}

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
  showToast(`Turno cerrado con éxito. Arqueo registrado por RD$${declared}.`, 'success');
}

// =====================================================================
// 9. TICKET TÉRMICO IMPRIMIBLE
// =====================================================================
function displayThermalTicket(order) {
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
// 10. SISTEMA DE TOASTS
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
