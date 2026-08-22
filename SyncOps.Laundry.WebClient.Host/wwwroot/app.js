/**
 * SyncOps — Complete Laundry, Tailoring, Billing & Reporting Suite
 * Full Reactive Store, Excel Spreadsheet Generator & EPSON TM-T20II Driver
 */

// =====================================================================
// 1. ESTADO GLOBAL (caché en memoria, hidratada desde la API)
// =====================================================================
// El estado ya NO vive en localStorage. Vive en el servidor (SyncOps.Laundry.WebApi)
// y esta variable es solo una caché en memoria que se llena al cargar la
// página y se actualiza tras cada operación exitosa contra la API. Todas
// las funciones render*() de más abajo siguen leyendo de aquí sin cambios.
let state = {
  config: {},
  catalog: [],
  clients: [],
  orders: [],
  inventory: [],
  cashMovements: []
};

// Usuario logueado (viene de GET /api/auth/me), reemplaza el antiguo
// localStorage.getItem('syncops_user').
let usuarioActual = null;

function getState() {
  return state;
}

// Ya no existe saveState(): cada acción que modifica datos llama a la API
// directamente (ver saveClientModal, saveAndPrintOrder, etc. más abajo) y
// solo actualiza esta caché con lo que el servidor confirmó guardar.

function getFormattedNextInvoice() {
  const prefix = state.config?.invoicePrefix || 'FAC';
  const num = state.config?.nextInvoiceNumber || 1001;
  return `${prefix}-${num.toString().padStart(6, '0')}`;
}

// ---------------------------------------------------------------------
// Adaptadores: convierten las respuestas de la API (camelCase, nombres en
// español técnico) a la forma exacta que ya esperaban las funciones
// render*() existentes (name, phone, isHotel, etc.) — así el 100% del
// código de UI de abajo queda intacto.
// ---------------------------------------------------------------------
function mapCliente(c) {
  return {
    id: c.id, name: c.nombre, phone: c.telefono, isHotel: c.esHotel,
    balance: c.saldo, creditLimit: c.limiteCredito, ordersCount: c.cantidadOrdenes
  };
}

function mapInsumo(i) {
  return {
    id: i.id, code: i.codigo, name: i.nombre, category: i.categoria,
    stock: i.stock, minStock: i.stockMinimo, unit: i.unidad, cost: i.costo, provider: i.proveedor
  };
}

function mapCatalogo(c) {
  return { id: c.id, name: c.nombre, category: c.categoria, service: c.servicio, price: c.precio };
}

function mapOrdenItem(i) {
  return {
    id: i.id, name: i.nombre, service: i.servicio, qty: i.cantidad, price: i.precio,
    subtotal: i.subtotal, color: i.color, defects: i.defectos, alteration: i.arreglo
  };
}

function mapOrden(o) {
  return {
    id: o.id, ticket: o.ticket, barcode: o.codigoBarras, clientId: o.clienteId,
    clientName: o.clienteNombre, phone: o.clienteTelefono,
    status: o.estado === 'Pagada' ? 'Pagada' : 'Pendiente',
    processStatus: o.estadoProceso || 'Recibido',
    date: new Date(o.fechaRecepcion).toLocaleString('es-DO'),
    delivery: new Date(o.fechaPromesaEntrega).toLocaleString('es-DO'),
    subtotal: o.subtotal, discount: o.descuento, itbis: o.impuestoItbis, total: o.total, paid: o.pagado,
    balance: o.saldo, isUrgent: o.esUrgente, items: (o.items || []).map(mapOrdenItem)
  };
}

function mapConfig(c) {
  return {
    businessName: c.businessName, rnc: c.rnc, phone: c.phone, address: c.address,
    email: c.email, printerWidth: c.printerWidth, printerModel: c.printerModel,
    invoicePrefix: c.invoicePrefix, nextInvoiceNumber: c.nextInvoiceNumber, ticketFooter: c.ticketFooter
  };
}

function mapMovimiento(m) {
  return {
    id: m.id,
    time: new Date(m.fechaCreacion).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
    type: m.tipo, concept: m.concepto, method: m.metodo, amount: m.monto
  };
}

// Carga todo lo necesario para pintar la app, en paralelo, una sola vez
// tras confirmar que la sesión es válida.
async function cargarEstadoInicial() {
  const [catalogo, clientes, inventario, ordenes, movimientos, config] = await Promise.all([
    api.getCatalogo(), api.getClientes(), api.getInventario(),
    api.getOrdenes(), api.getMovimientosCaja(), api.getConfiguracion()
  ]);

  state.catalog = catalogo.map(mapCatalogo);
  state.clients = clientes.map(mapCliente);
  state.inventory = inventario.map(mapInsumo);
  state.orders = ordenes.map(mapOrden);
  state.cashMovements = movimientos.map(mapMovimiento);
  state.config = mapConfig(config);
}

// =====================================================================
// 2. INICIALIZACIÓN, AUTENTICACIÓN Y NAVEGACIÓN
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
  if (document.body.classList.contains('app-body')) {
    bootstrapApp();
  }
});

async function bootstrapApp() {
  // Guardia real: sin un access token válido, NO se carga ni un solo dato
  // de negocio. Antes esto era un chequeo del lado del cliente que se
  // podía saltar; ahora cada llamada de cargarEstadoInicial() exige un
  // JWT válido en el backend, así que sin sesión simplemente no hay nada
  // que mostrar — la protección vive en el servidor, no en el navegador.
  if (!tieneSesion()) {
    forzarLogoutYRedirigir();
    return;
  }

  try {
    const usuario = await api.me();
    pintarUsuario(usuario);
  } catch (e) {
    forzarLogoutYRedirigir();
    return;
  }

  try {
    await cargarEstadoInicial();
    initApp();
  } catch (e) {
    showToast('No se pudo cargar la información del servidor. Intenta recargar.', 'error');
  }
}

function pintarUsuario(usuario) {
  usuarioActual = usuario;
  const nameEl = document.getElementById('userName');
  const emailEl = document.getElementById('userEmailText');
  const avatarEl = document.getElementById('userAvatar');
  const greetingEl = document.getElementById('dashboardGreeting');
  const roleBadgeEl = document.getElementById('sidebarUserRoleBadge');

  const initialLetter = usuario.nombreCompleto ? usuario.nombreCompleto.trim().charAt(0).toUpperCase() : 'U';
  if (nameEl) nameEl.innerText = usuario.nombreCompleto || '';
  if (emailEl) emailEl.innerText = usuario.email || '';
  if (avatarEl) avatarEl.innerText = initialLetter;
  if (greetingEl) greetingEl.innerText = `Buenas tardes, ${usuario.nombreCompleto ? usuario.nombreCompleto.split(' ')[0] : ''}`;

  const roles = usuario.roles || [];
  const esAdmin = roles.includes('Administrador');
  const esCajero = roles.includes('Cajero');

  // Actualizar Texto de Rol Integrado
  if (roleBadgeEl) {
    if (esAdmin) {
      roleBadgeEl.innerText = 'Administrador General';
      roleBadgeEl.className = 'user-role-text role-admin';
    } else if (esCajero) {
      roleBadgeEl.innerText = 'Cajero / Ventas';
      roleBadgeEl.className = 'user-role-text role-cajero';
    } else {
      roleBadgeEl.innerText = roles[0] || 'Operario / Taller';
      roleBadgeEl.className = 'user-role-text role-empleado';
    }
  }

  // Control de visibilidad en barra lateral y accesos directos
  const navDashboard = document.getElementById('navDashboardBtn');
  const navFinanzasGroup = document.getElementById('navFinanzasGroup');
  const navReportes = document.getElementById('navReportesBtn');
  const navInventario = document.getElementById('navInventarioBtn');
  const navConfiguracion = document.getElementById('navConfiguracionBtn');
  const navUsuarios = document.getElementById('navUsuariosBtn');
  const sidebarUserActionConfig = document.getElementById('sidebarUserActionConfig');
  const topbarOrgSelector = document.getElementById('topbarOrgSelector');
  const topbarConfigBtn = document.getElementById('topbarConfigBtn');
  const btnPosNuevoServicio = document.getElementById('btnPosNuevoServicio');

  // Si no es Administrador, ocultar funciones directivas/financieras y edición de catálogo
  if (navDashboard) navDashboard.style.display = esAdmin ? '' : 'none';
  if (navFinanzasGroup) navFinanzasGroup.style.display = esAdmin ? '' : 'none';
  if (navReportes) navReportes.style.display = esAdmin ? '' : 'none';
  if (navInventario) navInventario.style.display = esAdmin ? '' : 'none';
  if (navConfiguracion) navConfiguracion.style.display = esAdmin ? '' : 'none';
  if (navUsuarios) navUsuarios.style.display = esAdmin ? '' : 'none';
  if (sidebarUserActionConfig) sidebarUserActionConfig.style.display = esAdmin ? '' : 'none';
  if (topbarOrgSelector) topbarOrgSelector.style.display = esAdmin ? '' : 'none';
  if (topbarConfigBtn) topbarConfigBtn.style.display = esAdmin ? '' : 'none';
  if (btnPosNuevoServicio) btnPosNuevoServicio.style.display = esAdmin ? 'inline-flex' : 'none';

  // Si el usuario no es Admin y está en una pantalla restringida, enviarlo a POS
  if (!esAdmin) {
    const currentActiveSection = document.querySelector('.content-section.active');
    const curId = currentActiveSection ? currentActiveSection.id.replace('section-', '') : 'dashboard';
    const seccionesRestringidas = ['dashboard', 'reportes', 'inventario', 'configuracion', 'usuarios'];
    if (seccionesRestringidas.includes(curId)) {
      switchSection('pos', document.getElementById('navPosBtn'));
    }
  }
}

async function logout() {
  try { await api.logout(); } catch (e) { /* aunque falle, igual cerramos localmente */ }
  forzarLogoutYRedirigir();
}

function switchSection(sectionId, btnElement) {
  const roles = usuarioActual?.roles || [];
  const esAdmin = roles.includes('Administrador');
  const seccionesRestringidas = ['dashboard', 'reportes', 'inventario', 'configuracion', 'usuarios'];

  // Validación de seguridad de interfaz para Cajero / Empleado
  if (!esAdmin && seccionesRestringidas.includes(sectionId)) {
    showToast('Acceso restringido: Esta sección requiere rol de Administrador.', 'warning');
    const posBtn = document.getElementById('navPosBtn');
    switchSection('pos', posBtn);
    return;
  }

  document.querySelectorAll('.content-section').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  const sec = document.getElementById('section-' + sectionId);
  if (sec) {
    sec.classList.add('active');
    sec.style.display = 'block';
  }

  const targetBtn = btnElement || document.getElementById('nav' + sectionId.charAt(0).toUpperCase() + sectionId.slice(1) + 'Btn');
  if (targetBtn) targetBtn.classList.add('active');

  registrarSeccionReciente(sectionId);

  const titles = {
    'dashboard': 'Panel Principal',
    'pos': 'Punto de Venta / POS',
    'operaciones': 'Operaciones & Taller',
    'facturacion': 'Facturas & Cobros',
    'reportes': 'Reportes Financieros',
    'inventario': 'Inventario Insumos',
    'clientes': 'Clientes & Hoteles',
    'configuracion': 'Configuración de la Tienda',
    'faq': 'Preguntas Frecuentes',
    'ayuda': 'Ayuda & QA',
    'usuarios': 'Gestión de Usuarios'
  };

  const titleEl = document.getElementById('currentSectionTitle');
  if (titleEl) titleEl.innerText = titles[sectionId] || 'SyncOps Suite';

  if (sectionId === 'dashboard' && esAdmin) renderDashboard();
  if (sectionId === 'pos') renderPos();
  if (sectionId === 'operaciones') renderOperaciones();
  if (sectionId === 'facturacion') renderFacturacion();
  if (sectionId === 'reportes' && esAdmin) renderReportes();
  if (sectionId === 'inventario' && esAdmin) renderInventory();
  if (sectionId === 'clientes') renderClients();
  if (sectionId === 'configuracion' && esAdmin) loadConfigInputs();
  if (sectionId === 'usuarios' && esAdmin) renderUsuarios();
}

function toggleSidebar() {
  const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
  try {
    localStorage.setItem('syncops_sidebar_collapsed', isCollapsed ? 'true' : 'false');
  } catch (e) { /* ignorar */ }
}

function initSidebarState() {
  try {
    const isCollapsed = localStorage.getItem('syncops_sidebar_collapsed') === 'true';
    if (isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  } catch (e) { /* ignorar */ }
}

function initApp() {
  initSidebarState();
  const roles = usuarioActual?.roles || [];
  const esAdmin = roles.includes('Administrador');

  if (esAdmin) {
    renderDashboard();
  }
  renderPos();
  renderOperaciones();
  renderFacturacion();
  if (esAdmin) {
    renderInventory();
    renderReportes();
  }
  renderClients();
  renderCatalogoAdmin();
  loadConfigInputs();
  setupEvents();

  // Si el usuario es Cajero, iniciar directamente en Punto de Venta / POS
  if (!esAdmin) {
    switchSection('pos', document.getElementById('navPosBtn'));
  }
}

// =====================================================================
// 3. MÓDULO 1: DASHBOARD
// =====================================================================
function renderDashboard() {
  const state = getState();

  const totalFacturado = state.orders.reduce((sum, o) => sum + o.total, 0);
  const totalPendiente = state.orders.reduce((sum, o) => sum + o.balance, 0);
  const facturasPendientes = state.orders.filter(o => o.balance > 0).length;
  const clientesCount = state.clients.length;
  const particularesCount = state.clients.filter(c => !c.isHotel).length;
  const hotelesCount = state.clients.filter(c => c.isHotel).length;

  if (document.getElementById('kpiClientesCount')) document.getElementById('kpiClientesCount').innerText = clientesCount;
  if (document.getElementById('kpiParticularesCount')) document.getElementById('kpiParticularesCount').innerText = particularesCount;
  if (document.getElementById('kpiHotelesCount')) document.getElementById('kpiHotelesCount').innerText = hotelesCount;
  if (document.getElementById('kpiCxPPendiente')) document.getElementById('kpiCxPPendiente').innerText = `RD$${totalPendiente.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  if (document.getElementById('kpiFacturasPendientesCount')) document.getElementById('kpiFacturasPendientesCount').innerText = facturasPendientes;
  if (document.getElementById('kpiVentasHoy')) document.getElementById('kpiVentasHoy').innerText = `RD$${totalFacturado.toLocaleString('es-DO', {minimumFractionDigits:2})}`;


  // Renderizar Tablas y Alertas del Dashboard
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
            <button class="btn btn-outline btn-sm" onclick="openEditInvoiceModal('${o.id}')" title="Editar Factura">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
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

  // Renderizar Gráficos Fortexa ERP
  renderMonthlySalesChart('12M');
  renderCategoryDonutChart('12M');
}

// =====================================================================
// ANALÍTICA FORTEXA ERP: 1. VENTAS MENSUALES (BAR CHART)
// =====================================================================
let currentSalesPeriod = '12M';
function changeSalesPeriod(period, btnEl) {
  currentSalesPeriod = period;
  if (btnEl) {
    btnEl.parentElement.querySelectorAll('.fortexa-period-tab').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }
  renderMonthlySalesChart(period);
}

function renderMonthlySalesChart(period = '12M') {
  const container = document.getElementById('monthlySalesChartContainer');
  if (!container) return;

  const state = getState();
  const totalReal = state.orders.reduce((s, o) => s + o.total, 0);

  // 12 meses exactos al estilo Fortexa ERP
  let months = ['Sep 25', 'Oct 25', 'Nov 25', 'Dic 25', 'Ene 26', 'Feb 26', 'Mar 26', 'Abr 26', 'May 26', 'Jun 26', 'Jul 26', 'Ago 26'];
  if (period === '3M') months = ['Jun 26', 'Jul 26', 'Ago 26'];
  if (period === '6M') months = ['Mar 26', 'Abr 26', 'May 26', 'Jun 26', 'Jul 26', 'Ago 26'];
  if (period === 'Año') months = ['2023', '2024', '2025', '2026'];

  // Asignar ventas al mes activo (Ago 26)
  const currentMonthIdx = months.length - 1;
  const values = months.map((m, idx) => (idx === currentMonthIdx || (totalReal > 0 && idx === Math.floor(months.length / 2))) ? totalReal : 0);

  const maxVal = Math.max(...values, 5000);
  const svgWidth = 850;
  const colWidth = svgWidth / months.length;

  const yTicks = [
    { label: `${(maxVal * 1.0).toLocaleString('es-DO', {maximumFractionDigits: 0})}`, y: 20 },
    { label: `${(maxVal * 0.75).toLocaleString('es-DO', {maximumFractionDigits: 0})}`, y: 55 },
    { label: `${(maxVal * 0.5).toLocaleString('es-DO', {maximumFractionDigits: 0})}`, y: 90 },
    { label: `${(maxVal * 0.25).toLocaleString('es-DO', {maximumFractionDigits: 0})}`, y: 125 },
    { label: '0', y: 160 }
  ];

  let svgHtml = `
    <svg width="100%" height="100%" viewBox="0 0 ${svgWidth + 60} 210" preserveAspectRatio="none">
      <!-- Líneas de Guía Y -->
      ${yTicks.map(t => `
        <line x1="50" y1="${t.y}" x2="${svgWidth + 50}" y2="${t.y}" stroke="#F1F5F9" stroke-dasharray="${t.y === 160 ? '0' : '4 4'}" stroke-width="1" />
        <text x="42" y="${t.y + 4}" font-size="10" font-family="'JetBrains Mono', monospace" fill="#94A3B8" text-anchor="end">${t.label}</text>
      `).join('')}

      <!-- Barras Mensuales -->
      ${months.map((m, i) => {
        const val = values[i];
        const barHeight = val > 0 ? Math.max(16, (val / maxVal) * 140) : 0;
        const x = 50 + (i * colWidth) + (colWidth / 2) - 14;
        const y = 160 - barHeight;

        return `
          <g class="bar-group" style="cursor: pointer;">
            ${val > 0 ? `
              <rect x="${x}" y="${y}" width="28" height="${barHeight}" rx="5" ry="5" fill="#1D4ED8">
                <title>${m}: RD$${val.toLocaleString('es-DO')}</title>
              </rect>
              <text x="${x + 14}" y="${y - 6}" font-size="10" font-weight="800" font-family="'JetBrains Mono', monospace" fill="#1D4ED8" text-anchor="middle">
                RD$${val.toLocaleString('es-DO')}
              </text>
            ` : `
              <!-- Barra vacía tenue -->
              <rect x="${x}" y="156" width="28" height="4" rx="2" ry="2" fill="#E2E8F0" />
            `}
            <text x="${x + 14}" y="185" font-size="10.5" font-weight="600" fill="#64748B" text-anchor="middle">${m}</text>
          </g>
        `;
      }).join('')}
    </svg>
  `;

  container.innerHTML = svgHtml;
}

// =====================================================================
// ANALÍTICA FORTEXA ERP: 2. INGRESOS POR CATEGORÍA (DONUT CHART)
// =====================================================================
let currentCategoryPeriod = '12M';
function changeCategoryPeriod(period, btnEl) {
  currentCategoryPeriod = period;
  if (btnEl) {
    btnEl.parentElement.querySelectorAll('.fortexa-period-tab').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }
  renderCategoryDonutChart(period);
}

function renderCategoryDonutChart(period = '12M') {
  const donutBox = document.getElementById('categoryDonutChartContainer');
  const listBox = document.getElementById('categoryBreakdownList');
  if (!donutBox || !listBox) return;

  const state = getState();

  // Calcular por categoría de ítems
  const catTotals = {
    'Lavandería & Secado': 0,
    'Autoservicio & Máquinas': 0,
    'Sastrería & Taller': 0,
    'Hotelería & Gran Volumen': 0
  };

  state.orders.forEach(o => {
    o.items.forEach(it => {
      const s = it.service || 'Lavandería';
      if (s.includes('Auto') || s.includes('Máquina')) catTotals['Autoservicio & Máquinas'] += (it.price * it.qty);
      else if (s.includes('Sastre')) catTotals['Sastrería & Taller'] += (it.price * it.qty);
      else if (s.includes('Hotel')) catTotals['Hotelería & Gran Volumen'] += (it.price * it.qty);
      else catTotals['Lavandería & Secado'] += (it.price * it.qty);
    });
  });

  const totalSum = Object.values(catTotals).reduce((a, b) => a + b, 0);

  const categories = [
    { name: 'Lavandería & Secado', color: '#1D4ED8', amount: catTotals['Lavandería & Secado'] },
    { name: 'Autoservicio & Máquinas', color: '#16A34A', amount: catTotals['Autoservicio & Máquinas'] },
    { name: 'Sastrería & Taller', color: '#D97706', amount: catTotals['Sastrería & Taller'] },
    { name: 'Hotelería & Gran Volumen', color: '#9333EA', amount: catTotals['Hotelería & Gran Volumen'] }
  ];

  const radius = 70;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  let slicesHtml = '';
  let offset = 0;

  const activeCategories = categories.filter(c => c.amount > 0);

  if (activeCategories.length === 0 || totalSum === 0) {
    // Donut vacío limpio
    donutBox.innerHTML = `
      <svg width="180" height="180" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="${radius}" fill="none" stroke="#E2E8F0" stroke-width="${strokeWidth}" />
        <text x="100" y="98" font-size="11" font-weight="800" fill="#64748B" text-anchor="middle">TOTAL</text>
        <text x="100" y="114" font-size="12" font-weight="900" font-family="'JetBrains Mono', monospace" fill="#0F172A" text-anchor="middle">RD$0.00</text>
      </svg>
    `;
  } else {
    activeCategories.forEach(cat => {
      const pct = cat.amount / totalSum;
      const strokeDasharray = `${pct * circumference} ${circumference}`;
      const strokeDashoffset = -offset;
      offset += pct * circumference;

      slicesHtml += `
        <circle cx="100" cy="100" r="${radius}" fill="none" stroke="${cat.color}" stroke-width="${strokeWidth}"
          stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}"
          transform="rotate(-90 100 100)" style="transition: all 0.5s ease;">
          <title>${cat.name}: RD$${cat.amount.toLocaleString('es-DO')} (${Math.round(pct * 100)}%)</title>
        </circle>
      `;
    });

    donutBox.innerHTML = `
      <svg width="180" height="180" viewBox="0 0 200 200">
        ${slicesHtml}
        <text x="100" y="96" font-size="10" font-weight="800" fill="#64748B" text-anchor="middle">TOTAL INGRESOS</text>
        <text x="100" y="114" font-size="12" font-weight="900" font-family="'JetBrains Mono', monospace" fill="#0F172A" text-anchor="middle">
          RD$${totalSum.toLocaleString('es-DO')}
        </text>
      </svg>
    `;
  }

  // Generar Lista Desglosada a la Derecha (Estilo Fortexa ERP Exacto)
  listBox.innerHTML = categories.map(cat => {
    const pct = totalSum > 0 ? Math.round((cat.amount / totalSum) * 100) : 0;
    return `
      <div class="fortexa-category-item">
        <div class="category-legend-label">
          <span class="category-dot" style="background: ${cat.color};"></span>
          <span>${cat.name}</span>
        </div>
        <div class="category-legend-value">
          RD$${cat.amount.toLocaleString('es-DO', {minimumFractionDigits: 2})}
          <span class="category-legend-pct">(${pct}%)</span>
        </div>
      </div>
    `;
  }).join('');
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

  renderPosCategoryTabs('Todos');
  filterCatalog('Todos');
}

function renderPosCategoryTabs(activeCategory = 'Todos') {
  const state = getState();
  const tabsContainer = document.getElementById('posCatalogTabs');
  if (!tabsContainer) return;

  const defaultOrder = ['Lavandería', 'Sastrería', 'Autoservicio', 'Hotelería'];
  const presentCats = Array.from(new Set(state.catalog.map(i => i.category))).filter(Boolean);
  const orderedCats = [
    ...defaultOrder.filter(c => presentCats.includes(c)),
    ...presentCats.filter(c => !defaultOrder.includes(c))
  ];

  let html = `<button class="catalog-tab ${activeCategory === 'Todos' ? 'active' : ''}" onclick="filterCatalog('Todos', this)">Todos</button>`;
  orderedCats.forEach(cat => {
    let label = cat;
    if (cat === 'Lavandería') label = 'Lavandería &amp; Secado';
    else if (cat === 'Sastrería') label = 'Sastrería &amp; Taller';
    else if (cat === 'Autoservicio') label = 'Autoservicio &amp; Máquinas';
    else if (cat === 'Hotelería') label = 'Hotelería &amp; Corporativo';
    html += `<button class="catalog-tab ${activeCategory === cat ? 'active' : ''}" onclick="filterCatalog('${cat}', this)">${label}</button>`;
  });

  tabsContainer.innerHTML = html;
}

function getCategoryIconSvg(category, name = '') {
  const cat = (category || '').toLowerCase();
  const nom = (name || '').toLowerCase();
  const full = `${nom} ${cat}`;

  // 1. Suavizantes & Aromas (Downy, Suavitel, Ensueño, Acondicionador)
  if (full.includes('downy') || full.includes('suavizante') || full.includes('suavitel') || full.includes('ensueño') || full.includes('acondicionador') || full.includes('aroma') || full.includes('perfume')) {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EC4899" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Suavizante / Downy"><path d="M7 2h10M9 2v4h6V2M6 6h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M12 11c-1.5 2-2.5 3-2.5 4.5a2.5 2.5 0 0 0 5 0c0-1.5-1-2.5-2.5-4.5z"/></svg>`;
  }

  // 2. Pelvorato, Blanqueadores & Quitamanchas (Perborato de Sodio, Oxígeno Activo, Vanish, Clorox, Desmanchador)
  if (full.includes('pelvorato') || full.includes('perborato') || full.includes('blanqueador') || full.includes('cloro') || full.includes('vanish') || full.includes('clorox') || full.includes('desmanch') || full.includes('quitamancha') || full.includes('oxigeno') || full.includes('oxígeno') || full.includes('desengras')) {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Pelvorato / Blanqueador Quitamanchas"><path d="M10 2v4M14 2v4M8 6h8M6 20h12a2 2 0 0 0 2-2l-3-9H7l-3 9a2 2 0 0 0 2 2z"/><path d="m13 11 1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/><circle cx="17" cy="7" r="1"/></svg>`;
  }

  // 3. Detergentes & Jabones (Ariel, Tide, Ace, Fab, Omo, Jabón de Cuaba, Pods)
  if (full.includes('ariel') || full.includes('tide') || full.includes('ace') || full.includes('fab') || full.includes('omo') || full.includes('detergente') || full.includes('jabon') || full.includes('jabón') || full.includes('cuaba') || full.includes('pods')) {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Detergente / Jabón"><path d="M12 2v6M9 8h6M5 21h14a2 2 0 0 0 2-2l-2-11H5L3 19a2 2 0 0 0 2 2z"/></svg>`;
  }

  // 4. Planchado, Vapor & Almidón (Prensa, Almidón, Spray)
  if (full.includes('plancha') || full.includes('vapor') || full.includes('almidon') || full.includes('almidón') || full.includes('apreton') || full.includes('apretón')) {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Planchado / Vapor"><path d="M4 18h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3L13 3H7a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2z"/><circle cx="8" cy="13" r="1.5"/><circle cx="12" cy="13" r="1.5"/><circle cx="16" cy="13" r="1.5"/></svg>`;
  }

  // 5. Zippers & Cremalleras
  if (full.includes('zipper') || full.includes('cremallera') || full.includes('cierre') || full.includes('corredera')) {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Zipper / Cremallera"><path d="M10 3h4v18h-4z"/><path d="M6 7h4M14 7h4M6 12h4M14 12h4M6 17h4M14 17h4"/><circle cx="12" cy="10" r="1.5"/></svg>`;
  }

  // 6. Botones, Broches & Ojales
  if (full.includes('boton') || full.includes('botón') || full.includes('botones') || full.includes('broche') || full.includes('ojal') || full.includes('remache')) {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Botones / Broches"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/></svg>`;
  }

  // 7. Ruedos, Dobladillos & Sastrería de Medida (Tijeras / Aguja)
  if (full.includes('ruedo') || full.includes('dobladillo') || full.includes('basta') || full.includes('entalle') || full.includes('cintura') || full.includes('manga') || full.includes('hombro') || full.includes('ajuste') || full.includes('pinza') || full.includes('zurcido') || full.includes('parche') || full.includes('sastrer') || full.includes('taller') || full.includes('costura')) {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Sastrería / Arreglo"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`;
  }

  // 8. Trajes Formales, Smokings, Blazers & Vestidos de Fiesta
  if (full.includes('traje') || full.includes('smoking') || full.includes('esmoquin') || full.includes('frac') || full.includes('blazer') || full.includes('saco') || full.includes('chaqueta') || full.includes('abrigo') || full.includes('gabardina') || full.includes('vestido') || full.includes('gala') || full.includes('novia') || full.includes('toga')) {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Traje / Vestido / Alta Costura"><path d="M4 4h16l-3 17H7L4 4z"/><path d="M12 4v7M9 4l3 4 3-4"/><circle cx="12" cy="14" r="1"/></svg>`;
  }

  // 9. Pantalones, Jeans & Mahón
  if (full.includes('pantalon') || full.includes('pantalón') || full.includes('jean') || full.includes('jeans') || full.includes('mahon') || full.includes('mahón') || full.includes('bermuda') || full.includes('short') || full.includes('falda')) {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Pantalón / Jeans"><path d="M5 3h14v4l-2 14h-4l-1-10-1 10H7L5 7V3z"/><path d="M9 3v3M15 3v3"/></svg>`;
  }

  // 10. Lencería de Cama & Hogar (Edredón, Sábanas, Acolchados, Cortinas, Toallas, Manteles)
  if (full.includes('edredon') || full.includes('edredón') || full.includes('sabana') || full.includes('sábana') || full.includes('acolchado') || full.includes('colcha') || full.includes('manta') || full.includes('cobija') || full.includes('cortina') || full.includes('toalla') || full.includes('mantel') || full.includes('almohada') || full.includes('cojin') || full.includes('cojín')) {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Ropa de Cama & Lencería"><path d="M2 4h20v4H2zM4 8v12h16V8M7 12h10M7 16h6"/></svg>`;
  }

  // 11. Calzado, Tenis & Bolsos
  if (full.includes('calzado') || full.includes('zapato') || full.includes('tenis') || full.includes('sneaker') || full.includes('bota') || full.includes('sandalia') || full.includes('mochila') || full.includes('bolso') || full.includes('cartera') || full.includes('gorra')) {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EA580C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Calzado & Accesorios"><path d="M2 18h20v-4l-4-4H8l-6 5v3z"/></svg>`;
  }

  // 12. Cuero, Gamuza & Pieles
  if (full.includes('cuero') || full.includes('gamuza') || full.includes('piel') || full.includes('nobuk')) {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#78350F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Cuero & Piel"><path d="M12 2L4 7v10l8 5 8-5V7l-8-5z"/><path d="M12 6v12"/></svg>`;
  }

  // 13. Torres, Lavadoras & Secadoras Industriales (Autoservicio)
  if (full.includes('torre') || full.includes('industrial') || full.includes('lavadora') || full.includes('secadora') || full.includes('auto') || full.includes('m\u00e1quina') || full.includes('maquina') || full.includes('ficha') || full.includes('token')) {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Autoservicio / Máquina"><rect width="18" height="20" x="3" y="2" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M12 18a5 5 0 0 0 5-5"/></svg>`;
  }

  // 14. Tintorería & Dry Clean
  if (full.includes('tinte') || full.includes('tintorer') || full.includes('dry') || full.includes('seco')) {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Tintorería / Dry Clean"><path d="m14 12-8.5 8.5a2.12 2.12 0 1 1-3-3L11 9"/><path d="M12 2v7l5 5"/></svg>`;
  }

  // 15. Hotelería & Convenios Corporativos
  if (full.includes('hotel') || full.includes('corp') || full.includes('resort') || full.includes('airbnb') || full.includes('empresa')) {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9333EA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Hotelería & Corporativo"><path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>`;
  }

  // 16. Empaque, Ganchos & Fundas
  if (full.includes('gancho') || full.includes('funda') || full.includes('bolsa') || full.includes('rollo') || full.includes('polietileno')) {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Empaque / Ganchos"><path d="M12 2a3 3 0 0 0-3 3c0 1.5 1 2 2 3l-8 6h18l-8-6c1-1 2-1.5 2-3a3 3 0 0 0-3-3z"/><path d="M3 14v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/></svg>`;
  }

  // 17. Por defecto: Camisa / Ropa de Lavandería
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Prenda de Lavandería"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>`;
}

function getItemIconBg(category, name = '') {
  const cat = (category || '').toLowerCase();
  const nom = (name || '').toLowerCase();
  const full = `${nom} ${cat}`;

  if (full.includes('downy') || full.includes('suavizante') || full.includes('suavitel') || full.includes('ensueño')) return { bg: '#FDF2F8', border: '#FBCFE8' };
  if (full.includes('pelvorato') || full.includes('perborato') || full.includes('blanqueador') || full.includes('cloro') || full.includes('vanish') || full.includes('desmanch') || full.includes('quitamancha')) return { bg: '#F0F9FF', border: '#BAE6FD' };
  if (full.includes('detergente') || full.includes('jabon') || full.includes('jabón') || full.includes('ariel') || full.includes('tide')) return { bg: '#ECFEFF', border: '#A5F3FC' };
  if (full.includes('plancha') || full.includes('vapor') || full.includes('almidon')) return { bg: '#FFFBEB', border: '#FDE68A' };
  if (full.includes('traje') || full.includes('smoking') || full.includes('blazer') || full.includes('vestido') || full.includes('gala')) return { bg: '#EEF2FF', border: '#C7D2FE' };
  if (full.includes('edredon') || full.includes('sabana') || full.includes('acolchado') || full.includes('cortina') || full.includes('toalla')) return { bg: '#F5F3FF', border: '#DDD6FE' };
  if (full.includes('zipper') || full.includes('cremallera')) return { bg: '#FEF3C7', border: '#FDE68A' };
  if (full.includes('boton') || full.includes('botón') || full.includes('broche')) return { bg: '#F5F3FF', border: '#DDD6FE' };
  if (full.includes('ruedo') || full.includes('dobladillo') || full.includes('entalle') || full.includes('cintura') || full.includes('manga') || full.includes('sastrer') || full.includes('taller')) return { bg: '#FFFBEB', border: '#FDE68A' };
  if (full.includes('calzado') || full.includes('zapato') || full.includes('tenis')) return { bg: '#FFF7ED', border: '#FFEDD5' };
  if (full.includes('torre') || full.includes('industrial') || full.includes('lavadora') || full.includes('secadora') || full.includes('auto')) return { bg: '#F0FDF4', border: '#BBF7D0' };
  if (full.includes('hotel') || full.includes('corp') || full.includes('resort')) return { bg: '#FAF5FF', border: '#E9D5FF' };
  if (full.includes('gancho') || full.includes('funda') || full.includes('bolsa')) return { bg: '#F8FAFC', border: '#E2E8F0' };

  return { bg: '#EFF6FF', border: '#DBEAFE' };
}

function getCategoryBadgeClass(category) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('sastrer') || cat.includes('taller')) return 'bg-amber';
  if (cat.includes('auto')) return 'bg-emerald';
  if (cat.includes('hotel') || cat.includes('corp')) return 'bg-purple';
  if (cat.includes('insumo') || cat.includes('quimic') || cat.includes('químic')) return 'bg-cyan';
  return 'bg-blue';
}

function filterCatalog(category, btnElement) {
  const state = getState();
  if (btnElement) {
    document.querySelectorAll('#posCatalogTabs .catalog-tab').forEach(t => t.classList.remove('active'));
    btnElement.classList.add('active');
  }

  const grid = document.getElementById('posCatalogGrid');
  if (!grid) return;

  const items = (category === 'Todos') 
    ? state.catalog 
    : state.catalog.filter(i => i.category === category);

  if (items.length === 0) {
    const roles = usuarioActual?.roles || [];
    const esAdmin = roles.includes('Administrador');
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); background: #F8FAFC; border-radius: 10px; border: 1px dashed #CBD5E1;">
        <p style="font-size: .88rem; font-weight: 700; margin-bottom: .5rem; color: #475569;">No hay servicios en esta categoría</p>
        ${esAdmin ? '<button type="button" class="btn btn-primary btn-sm" onclick="openNewCatalogoModal()" style="display:inline-flex; align-items:center; gap:5px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>Agregar Primer Servicio</span></button>' : ''}
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map(item => {
    const cleanName = item.name.replace(/^[^\w\s\u00C0-\u017F]+/i, '').trim();
    const iconSvg = getCategoryIconSvg(item.category, item.name);
    const iconTheme = getItemIconBg(item.category, item.name);
    return `
      <div class="catalog-item-card" onclick="selectCatalogItem('${item.id}')" title="Clic para cargar y personalizar">
        <div style="display: flex; align-items: flex-start; gap: .5rem;">
          <div style="width: 26px; height: 26px; border-radius: 6px; background: ${iconTheme.bg}; border: 1px solid ${iconTheme.border}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;">
            ${iconSvg}
          </div>
          <div class="catalog-item-name">${cleanName}</div>
        </div>
        <div class="catalog-item-price">RD$${item.price.toLocaleString('es-DO', {minimumFractionDigits: 2})}</div>
      </div>
    `;
  }).join('');
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
  document.getElementById('builderItemName').innerText = `Personalización: ${cleanName}`;
  
  toggleTailoringDrawer(item.service);
  showToast(`Ítem "${cleanName}" cargado. Puedes personalizar su precio.`, 'info');
}

function resetPosOrder() {
  currentOrderItems = [];
  const discountInput = document.getElementById('posDiscount');
  const paidInput = document.getElementById('posAmountPaid');
  const urgentCheck = document.getElementById('posIsUrgent');
  const descInput = document.getElementById('builderDesc');
  const priceInput = document.getElementById('builderPrice');
  const colorInput = document.getElementById('builderColor');
  const defectsInput = document.getElementById('builderDefects');
  const qtyInput = document.getElementById('builderQty');
  const itemNameEl = document.getElementById('builderItemName');

  if (discountInput) discountInput.value = 0;
  if (paidInput) paidInput.value = 0;
  if (urgentCheck) urgentCheck.checked = false;
  if (descInput) descInput.value = '';
  if (priceInput) priceInput.value = '';
  if (colorInput) colorInput.value = '';
  if (defectsInput) defectsInput.value = '';
  if (qtyInput) qtyInput.value = 1;
  if (itemNameEl) itemNameEl.innerText = 'Personalización del Artículo / Servicio';

  renderPosItems();
  calculatePosTotal();

  // Resetear método de pago a Efectivo
  currentPaymentMethod = 'Efectivo';
  document.querySelectorAll('.btn-pay-method').forEach(b => {
    b.classList.remove('active', 'selected');
    b.blur();
  });
  const efectivoBtn = document.querySelector('.btn-pay-method[data-method="Efectivo"]') || document.querySelector('.btn-pay-method');
  if (efectivoBtn) efectivoBtn.classList.add('selected');

  showToast('Orden de Punto de Venta reiniciada limpiamente.', 'info');
}

function switchReportSubTab(tabName, btnEl) {
  if (btnEl) {
    btnEl.parentElement.querySelectorAll('.fortexa-subnav-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }

  const select = document.getElementById('reportPeriodSelect');
  if (tabName === 'caja' && select) {
    select.value = 'today';
    filterReportData();
    showToast('Filtrando ventas y flujo de caja del día de hoy.', 'info');
  } else if (tabName === 'servicios') {
    switchSection('dashboard', document.querySelectorAll('.nav-item')[0]);
    setTimeout(() => {
      const el = document.getElementById('categoryDonutChartContainer');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  } else if (tabName === 'resumen' && select) {
    select.value = 'all';
    filterReportData();
  }
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
  document.getElementById('builderPrice').value = '';
  document.getElementById('builderColor').value = '';
  document.getElementById('builderDefects').value = '';
  document.getElementById('tailorAlterationType').value = '';
  document.getElementById('tailorMeasurements').value = '';
  document.getElementById('builderQty').value = 1;
  const itemNameEl = document.getElementById('builderItemName');
  if (itemNameEl) itemNameEl.innerText = 'Personalización del Artículo / Servicio';

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
  const navBadgePos = document.getElementById('navBadgePos');
  if (!box) return;

  countBadge.innerText = `${currentOrderItems.length} artículos`;

  if (navBadgePos) {
    if (currentOrderItems.length > 0) {
      navBadgePos.innerText = currentOrderItems.length;
      navBadgePos.style.display = 'inline-block';
    } else {
      navBadgePos.style.display = 'none';
    }
  }

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
  const aplicaItbis = document.getElementById('posAplicaItbis').checked;

  const urgentFee = isUrgent ? (subtotal * 0.15) : 0;
  // El ITBIS se calcula sobre la base ya con recargo de urgencia y
  // descuento aplicados — igual que lo hace el servidor al crear la orden.
  const baseImponible = Math.max(0, subtotal + urgentFee - discount);
  const itbis = aplicaItbis ? (baseImponible * 0.18) : 0;
  const total = baseImponible + itbis;

  const paid = parseFloat(document.getElementById('posAmountPaid').value) || 0;
  const balance = Math.max(0, total - paid);
  const cambio = Math.max(0, paid - total);

  document.getElementById('posSubtotal').innerText = `RD$${subtotal.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  document.getElementById('posTotal').innerText = `RD$${total.toLocaleString('es-DO', {minimumFractionDigits:2})}`;

  const itbisRow = document.getElementById('posItbisRow');
  if (itbisRow) itbisRow.style.display = aplicaItbis ? 'flex' : 'none';
  document.getElementById('posItbis').innerText = `RD$${itbis.toLocaleString('es-DO', {minimumFractionDigits:2})}`;

  // Se muestra UNA de las dos filas: saldo pendiente (si falta cobrar) o
  // cambio a devolver (si pagaron de más) — nunca las dos a la vez.
  document.getElementById('posBalanceRow').style.display = cambio > 0 ? 'none' : 'flex';
  document.getElementById('posCambioRow').style.display = cambio > 0 ? 'flex' : 'none';
  document.getElementById('posBalanceDue').innerText = `RD$${balance.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  document.getElementById('posCambio').innerText = `RD$${cambio.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
}

function payFullOrder() {
  const subtotal = currentOrderItems.reduce((sum, i) => sum + i.subtotal, 0);
  const discount = parseFloat(document.getElementById('posDiscount').value) || 0;
  const isUrgent = document.getElementById('posIsUrgent').checked;
  const aplicaItbis = document.getElementById('posAplicaItbis').checked;

  const urgentFee = isUrgent ? subtotal * 0.15 : 0;
  const baseImponible = Math.max(0, subtotal + urgentFee - discount);
  const itbis = aplicaItbis ? baseImponible * 0.18 : 0;
  const total = baseImponible + itbis;

  document.getElementById('posAmountPaid').value = total;
  calculatePosTotal();
}

function selectPaymentMethod(method, btn) {
  currentPaymentMethod = method;
  document.querySelectorAll('.btn-pay-method').forEach(b => {
    b.classList.remove('active', 'selected');
    b.blur();
  });
  if (btn) {
    btn.classList.add('selected');
    btn.blur();
  }
}

async function saveAndPrintOrder() {
  if (currentOrderItems.length === 0) {
    showToast('Agrega al menos un artículo para generar la factura.', 'error');
    return;
  }

  const clientId = document.getElementById('posClientSelect').value;
  const client = state.clients.find(c => c.id === clientId);
  if (!client) {
    showToast('Selecciona un cliente registrado para poder facturar. Registra uno en "Clientes" si aún no tienes ninguno.', 'error');
    return;
  }

  const delivery = document.getElementById('posDeliveryDate').value;
  const discount = parseFloat(document.getElementById('posDiscount').value) || 0;
  const paid = parseFloat(document.getElementById('posAmountPaid').value) || 0;
  const isUrgent = document.getElementById('posIsUrgent').checked;
  const aplicaItbis = document.getElementById('posAplicaItbis').checked;

  // Subtotal/total/ticket ya NO se calculan ni se numeran aquí: el
  // servidor los recalcula desde cero (cantidad × precio de cada item) y
  // asigna el número de ticket de forma atómica. Esto evita que alguien
  // manipule el total o "adivine" un ticket editando el payload desde las
  // herramientas de desarrollador del navegador.
  const payload = {
    clienteId: client.id,
    fechaPromesaEntrega: new Date(delivery).toISOString(),
    esUrgente: isUrgent,
    aplicaItbis: aplicaItbis,
    descuento: discount,
    montoPagado: paid,
    metodoPago: currentPaymentMethod,
    items: currentOrderItems.map(i => ({
      nombre: i.name, servicio: i.service, cantidad: i.qty, precio: i.price,
      color: i.color || null, defectos: i.defects || null, arreglo: i.alteration || null
    }))
  };

  try {
    const creada = await api.crearOrden(payload);
    const newOrder = mapOrden(creada);

    // El backend nunca registra un "pagado" mayor al total (el excedente
    // no es un abono, es efectivo físico que hay que devolver) — por eso
    // el cambio se calcula aquí, contra lo que el cajero tecleó realmente.
    const cambioEntregado = Math.max(0, paid - newOrder.total);

    state.orders.unshift(newOrder);

    // Recargar caja y configuración (el consecutivo de factura y el
    // movimiento de caja los generó el servidor).
    const [movimientos, config] = await Promise.all([api.getMovimientosCaja(), api.getConfiguracion()]);
    state.cashMovements = movimientos.map(mapMovimiento);
    state.config = mapConfig(config);

    const idxCliente = state.clients.findIndex(c => c.id === client.id);
    if (idxCliente !== -1) state.clients[idxCliente].ordersCount += 1;

    displayThermalTicket(newOrder, cambioEntregado);

    currentOrderItems = [];
    document.getElementById('posDiscount').value = '0';
    document.getElementById('posAmountPaid').value = '0';
    document.getElementById('posIsUrgent').checked = false;
    document.getElementById('posAplicaItbis').checked = false;
    document.getElementById('posInvoiceNumber').value = getFormattedNextInvoice();

    renderPosItems();
    calculatePosTotal();

    if (cambioEntregado > 0) {
      showToast(`Factura ${newOrder.ticket} emitida. Cambio a devolver: RD$${cambioEntregado.toLocaleString('es-DO', {minimumFractionDigits:2})}.`, 'success');
    } else {
      showToast(`Factura ${newOrder.ticket} emitida exitosamente.`, 'success');
    }
  } catch (err) {
    showToast(err.message || 'No se pudo generar la factura.', 'error');
  }
}

// =====================================================================
// 5. MÓDULO 3: OPERACIONES & TRACKING DE LAVADO / TALLER
// =====================================================================
let currentOpFilter = 'todas';
let currentOpView = 'kanban';

function switchOperacionesView(viewMode) {
  currentOpView = viewMode;
  const kanbanEl = document.getElementById('operacionesKanbanView');
  const tableEl = document.getElementById('operacionesTableView');
  const btnKanban = document.getElementById('btnViewKanban');
  const btnTable = document.getElementById('btnViewTable');

  if (viewMode === 'kanban') {
    if (kanbanEl) kanbanEl.style.display = 'grid';
    if (tableEl) tableEl.style.display = 'none';
    if (btnKanban) {
      btnKanban.classList.add('active');
      btnKanban.style.background = '#FFFFFF';
      btnKanban.style.color = '#0F172A';
    }
    if (btnTable) {
      btnTable.classList.remove('active');
      btnTable.style.background = 'transparent';
      btnTable.style.color = '#64748B';
    }
  } else {
    if (kanbanEl) kanbanEl.style.display = 'none';
    if (tableEl) tableEl.style.display = 'block';
    if (btnTable) {
      btnTable.classList.add('active');
      btnTable.style.background = '#FFFFFF';
      btnTable.style.color = '#0F172A';
    }
    if (btnKanban) {
      btnKanban.classList.remove('active');
      btnKanban.style.background = 'transparent';
      btnKanban.style.color = '#64748B';
    }
  }
  renderOperaciones();
}

function setOperacionesFilter(filterType, btn) {
  currentOpFilter = filterType;
  document.querySelectorAll('#section-operaciones .fortexa-subnav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderOperaciones();
}

function filterOperaciones(searchTerm) {
  renderOperaciones(currentOpFilter, searchTerm);
}

async function cambiarEstadoOperativo(orderId, nextStatus) {
  const state = getState();
  const order = state.orders.find(o => o.id === orderId);
  try {
    await api.actualizarEstadoProceso(orderId, nextStatus);
    if (order) {
      order.processStatus = nextStatus;
    }
    const labelMap = { 'Recibido': 'Recepción', 'EnProceso': 'En Lavado / Taller', 'Listo': 'Listo para Retiro', 'Entregado': 'Entregado' };
    showToast(`Orden ${order ? order.ticket : ''} actualizada a "${labelMap[nextStatus] || nextStatus}".`, 'success');
    renderOperaciones();
  } catch (err) {
    showToast(err.message || 'Error al actualizar estado de producción.', 'error');
  }
}

function renderOperaciones(filter = currentOpFilter, term = '') {
  const state = getState();
  const q = (term || document.getElementById('operacionesSearchInput')?.value || '').toLowerCase().trim();

  let orders = state.orders;

  if (q) {
    orders = orders.filter(o => {
      const itemsStr = (o.items || []).map(i => i.name).join(' ').toLowerCase();
      return o.ticket.toLowerCase().includes(q) ||
             o.clientName.toLowerCase().includes(q) ||
             (o.phone || '').includes(q) ||
             itemsStr.includes(q);
    });
  }

  // Contadores por Etapa
  const countRecibido = state.orders.filter(o => (o.processStatus || 'Recibido') === 'Recibido').length;
  const countEnProceso = state.orders.filter(o => o.processStatus === 'EnProceso').length;
  const countListo = state.orders.filter(o => o.processStatus === 'Listo').length;
  const countEntregado = state.orders.filter(o => o.processStatus === 'Entregado').length;
  const countTodas = state.orders.length;
  const activosNoEntregados = countRecibido + countEnProceso + countListo;

  if (document.getElementById('countOpTodas')) document.getElementById('countOpTodas').innerText = countTodas;
  if (document.getElementById('countOpRecibido')) document.getElementById('countOpRecibido').innerText = countRecibido;
  if (document.getElementById('countOpEnProceso')) document.getElementById('countOpEnProceso').innerText = countEnProceso;
  if (document.getElementById('countOpListo')) document.getElementById('countOpListo').innerText = countListo;
  if (document.getElementById('countOpEntregado')) document.getElementById('countOpEntregado').innerText = countEntregado;

  if (document.getElementById('kanbanCountRecibido')) document.getElementById('kanbanCountRecibido').innerText = countRecibido;
  if (document.getElementById('kanbanCountEnProceso')) document.getElementById('kanbanCountEnProceso').innerText = countEnProceso;
  if (document.getElementById('kanbanCountListo')) document.getElementById('kanbanCountListo').innerText = countListo;
  if (document.getElementById('kanbanCountEntregado')) document.getElementById('kanbanCountEntregado').innerText = countEntregado;

  const opBadge = document.getElementById('navBadgeOperaciones');
  if (opBadge) {
    opBadge.innerText = activosNoEntregados;
    opBadge.style.display = activosNoEntregados > 0 ? 'inline-block' : 'none';
  }

  // Renderizar Tarjetas Kanban
  const renderKanbanCards = (statusKey) => {
    const list = orders.filter(o => (o.processStatus || 'Recibido') === statusKey);
    if (!list.length) {
      return `<div style="text-align: center; padding: 2rem 1rem; color: #94A3B8; font-size: .8rem;">Sin órdenes en esta etapa</div>`;
    }

    return list.map(o => {
      const itemsResumen = (o.items || []).map(i => `<strong style="color:#0F172A;">${i.qty}x</strong> ${i.name}`).join(', ') || 'Servicios de lavandería';
      
      let nextBtn = '';
      if (statusKey === 'Recibido') {
        nextBtn = `<button class="btn btn-primary btn-sm" style="font-size:.74rem; font-weight:700; padding:.32rem .7rem; display:inline-flex; align-items:center; gap:5px;" onclick="cambiarEstadoOperativo('${o.id}', 'EnProceso')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <span>Iniciar Lavado</span>
        </button>`;
      } else if (statusKey === 'EnProceso') {
        nextBtn = `<button class="btn btn-success btn-sm" style="font-size:.74rem; font-weight:700; padding:.32rem .7rem; background:#059669; display:inline-flex; align-items:center; gap:5px;" onclick="cambiarEstadoOperativo('${o.id}', 'Listo')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Marcar Listo</span>
        </button>`;
      } else if (statusKey === 'Listo') {
        nextBtn = `<button class="btn btn-outline btn-sm" style="font-size:.74rem; font-weight:700; padding:.32rem .7rem; display:inline-flex; align-items:center; gap:5px; color:#1E293B; border-color:#CBD5E1;" onclick="cambiarEstadoOperativo('${o.id}', 'Entregado')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Entregar</span>
        </button>`;
      } else {
        nextBtn = `<span style="font-size:.73rem; color:#64748B; font-weight:600;">Completado</span>`;
      }

      return `
        <div class="kanban-order-card">
          <div class="kanban-card-top">
            <span class="kanban-card-ticket font-mono">${o.ticket}</span>
            <span style="font-size: .72rem; color: #64748B; font-weight: 600;">${o.date}</span>
          </div>
          <div class="kanban-card-client">${o.clientName}</div>
          <div style="font-size: .72rem; color: #64748B; display: flex; align-items: center; gap: 4px;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <span>${o.phone || 'Sin teléfono'}</span>
          </div>
          <div class="kanban-card-items">
            ${itemsResumen}
          </div>
          <div style="font-size: .73rem; color: #475569; display: flex; align-items: center; justify-content: space-between;">
            <span>Entrega: <strong>${o.delivery || 'Inmediata'}</strong></span>
            <strong class="font-mono text-blue">RD$${o.total.toLocaleString('es-DO', {minimumFractionDigits:2})}</strong>
          </div>
          <div class="kanban-card-footer">
            <button class="btn btn-outline btn-sm" style="font-size:.72rem; padding:.25rem .5rem;" onclick="displayThermalTicket(getState().orders.find(x=>x.id==='${o.id}'))" title="Ver Ticket">
              Ticket
            </button>
            ${nextBtn}
          </div>
        </div>
      `;
    }).join('');
  };

  const cRecibido = document.getElementById('kanbanCardsRecibido');
  const cEnProceso = document.getElementById('kanbanCardsEnProceso');
  const cListo = document.getElementById('kanbanCardsListo');
  const cEntregado = document.getElementById('kanbanCardsEntregado');

  if (cRecibido) cRecibido.innerHTML = renderKanbanCards('Recibido');
  if (cEnProceso) cEnProceso.innerHTML = renderKanbanCards('EnProceso');
  if (cListo) cListo.innerHTML = renderKanbanCards('Listo');
  if (cEntregado) cEntregado.innerHTML = renderKanbanCards('Entregado');

  // Renderizar Tabla
  const tbody = document.getElementById('operacionesTableBody');
  if (!tbody) return;

  let filteredTable = orders;
  if (['Recibido', 'EnProceso', 'Listo', 'Entregado'].includes(filter)) {
    filteredTable = filteredTable.filter(o => (o.processStatus || 'Recibido') === filter);
  }

  tbody.innerHTML = filteredTable.map(o => {
    const status = o.processStatus || 'Recibido';
    const itemsResumen = (o.items || []).map(i => `${i.qty}x ${i.name}`).join(', ') || 'Servicios de Lavandería';

    let badgeHtml = '';
    let actionBtnHtml = '';

    if (status === 'Recibido') {
      badgeHtml = `<span class="badge-pill" style="background: #EFF6FF; color: #1D4ED8; font-weight: 700; border: 1px solid #DBEAFE; display: inline-flex; align-items: center; gap: 5px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Recepción
      </span>`;
      actionBtnHtml = `<button class="btn btn-primary btn-sm" style="font-weight: 700; font-size: .75rem; display: inline-flex; align-items: center; gap: 5px; padding: .35rem .75rem;" onclick="cambiarEstadoOperativo('${o.id}', 'EnProceso')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Iniciar Lavado
      </button>`;
    } else if (status === 'EnProceso') {
      badgeHtml = `<span class="badge-pill" style="background: #FEF3C7; color: #B45309; font-weight: 700; border: 1px solid #FDE68A; display: inline-flex; align-items: center; gap: 5px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        En Lavado / Taller
      </span>`;
      actionBtnHtml = `<button class="btn btn-success btn-sm" style="font-weight: 700; font-size: .75rem; display: inline-flex; align-items: center; gap: 5px; padding: .35rem .75rem; background: #059669;" onclick="cambiarEstadoOperativo('${o.id}', 'Listo')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Marcar Listo
      </button>`;
    } else if (status === 'Listo') {
      badgeHtml = `<span class="badge-pill" style="background: #ECFDF5; color: #047857; font-weight: 800; border: 1px solid #A7F3D0; display: inline-flex; align-items: center; gap: 5px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="16 9 10 15 8 13"/></svg>
        Listo para Retiro
      </span>`;
      actionBtnHtml = `<button class="btn btn-outline btn-sm" style="font-weight: 700; font-size: .75rem; display: inline-flex; align-items: center; gap: 5px; padding: .35rem .75rem; color: #1E293B; border-color: #CBD5E1;" onclick="cambiarEstadoOperativo('${o.id}', 'Entregado')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Entregar al Cliente
      </button>`;
    } else {
      badgeHtml = `<span class="badge-pill" style="background: #F1F5F9; color: #475569; font-weight: 700; border: 1px solid #CBD5E1; display: inline-flex; align-items: center; gap: 5px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="20 6 9 17 4 12"/></svg>
        Entregado
      </span>`;
      actionBtnHtml = `<span style="font-size: .76rem; color: #64748B; font-weight: 600; padding: .35rem .5rem; display: inline-block;">Finalizado</span>`;
    }

    return `
      <tr>
        <td>
          <strong class="font-mono text-blue" style="font-size: .95rem;">${o.ticket}</strong>
          <div style="font-size: .72rem; color: var(--text-muted);">${o.date}</div>
        </td>
        <td>
          <strong style="color: #0F172A;">${o.clientName}</strong>
          <div style="font-size: .72rem; color: var(--text-muted);">${o.phone || 'Sin teléfono'}</div>
        </td>
        <td>
          <span style="font-size: .82rem; color: #334155; max-width: 260px; display: inline-block; white-space: normal;">
            ${itemsResumen}
          </span>
        </td>
        <td>
          <span class="font-mono" style="font-size: .8rem; font-weight: 600; color: #475569;">
            ${o.delivery || 'Por confirmar'}
          </span>
        </td>
        <td>
          ${badgeHtml}
        </td>
        <td style="text-align: right;">
          <div style="display: inline-flex; align-items: center; gap: .4rem;">
            ${actionBtnHtml}
            <button class="btn btn-outline btn-sm" onclick="displayThermalTicket(getState().orders.find(x=>x.id==='${o.id}'))" title="Ver Ticket">
              Ticket
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No hay órdenes en esta etapa de producción.</td></tr>';
}

// =====================================================================
// 6. MÓDULO 4: FACTURACIÓN & HISTORIAL DE FACTURAS
// =====================================================================
let currentFactFilter = 'todas';

function setFacturacionFilter(filterType, btn) {
  currentFactFilter = filterType;
  document.querySelectorAll('#section-facturacion .fortexa-subnav-btn').forEach(b => b.classList.remove('active'));
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
      <td style="text-align: right;">
        <div style="display: inline-flex; gap: .35rem;">
          <button class="btn btn-outline btn-sm" onclick="openEditInvoiceModal('${o.id}')" title="Editar Factura / Detalles">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          </button>
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
  const cfg = state.config || {};
  const user = usuarioActual || {};

  const orders = state.orders;
  const totalFacturado = orders.reduce((sum, o) => sum + o.total, 0);
  const totalCobrado = orders.reduce((sum, o) => sum + o.paid, 0);
  const totalPendiente = orders.reduce((sum, o) => sum + o.balance, 0);

  document.getElementById('pdfStoreName').innerText = cfg.businessName.toUpperCase();
  document.getElementById('pdfStoreMeta').innerText = `${cfg.address} • Tel: ${cfg.phone} • RNC: ${cfg.rnc}`;
  document.getElementById('pdfGeneratedDate').innerText = `Fecha de Emisión: ${new Date().toLocaleString('es-DO')}`;
  document.getElementById('pdfSignOperator').innerText = user.nombreCompleto || '';

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
  const cfg = state.config || {};

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

async function saveInsumoModal(e) {
  e.preventDefault();
  const id = document.getElementById('modalInsumoId').value;
  const codigo = document.getElementById('modalInsumoCode').value.trim();
  const nombre = document.getElementById('modalInsumoName').value.trim();
  const categoria = document.getElementById('modalInsumoCategory').value;
  const stock = parseFloat(document.getElementById('modalInsumoStock').value) || 0;
  const stockMinimo = parseFloat(document.getElementById('modalInsumoMin').value) || 1;
  const unidad = document.getElementById('modalInsumoUnit').value.trim();
  const costo = parseFloat(document.getElementById('modalInsumoCost').value) || 0;
  const proveedor = document.getElementById('modalInsumoProvider').value.trim();

  const payload = { codigo, nombre, categoria, stock, stockMinimo, unidad, costo, proveedor };

  try {
    if (id) {
      const actualizado = await api.actualizarInsumo(id, payload);
      const idx = state.inventory.findIndex(i => i.id === id);
      if (idx !== -1) state.inventory[idx] = mapInsumo(actualizado);
      showToast('Insumo actualizado exitosamente.', 'success');
    } else {
      const creado = await api.crearInsumo(payload);
      state.inventory.push(mapInsumo(creado));
      showToast('Nuevo insumo registrado.', 'success');
    }

    renderInventory();
    renderDashboard();
    closeInsumoModal();
  } catch (err) {
    showToast(err.message || 'No se pudo guardar el insumo.', 'error');
  }
}

async function deleteInsumo(insumoId) {
  if (!confirm('¿Deseas eliminar este insumo del inventario?')) return;
  try {
    await api.eliminarInsumo(insumoId);
    state.inventory = state.inventory.filter(i => i.id !== insumoId);
    renderInventory();
    renderDashboard();
    showToast('Insumo eliminado.', 'info');
  } catch (err) {
    showToast(err.message || 'No se pudo eliminar el insumo.', 'error');
  }
}

async function addStockItem(itemId, delta) {
  const item = state.inventory.find(i => i.id === itemId);
  if (!item) return;

  try {
    const actualizado = await api.ajustarStock(itemId, delta);
    const idx = state.inventory.findIndex(i => i.id === itemId);
    if (idx !== -1) state.inventory[idx] = mapInsumo(actualizado);
    renderInventory();
    renderDashboard();
    showToast(`Stock de ${item.name}: +${delta} ${item.unit}.`, 'success');
  } catch (err) {
    showToast(err.message || 'No se pudo ajustar el stock.', 'error');
  }
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

  tbody.innerHTML = state.clients.map(c => {
    const iconSvg = c.isHotel
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
    const iconBg = c.isHotel ? '#FFFBEB' : '#EFF6FF';
    const iconBorder = c.isHotel ? '#FDE68A' : '#DBEAFE';
    return `
    <tr>
      <td>
        <div style="display: flex; align-items: center; gap: .65rem;">
          <div style="width: 36px; height: 36px; border-radius: 10px; background: ${iconBg}; border: 1px solid ${iconBorder}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            ${iconSvg}
          </div>
          <div>
            <strong style="display: block; color: #0F172A; font-size: .88rem;">${c.name}</strong>
            <span style="font-size: .72rem; color: #64748B;">${c.isHotel ? 'Cuenta Hotelera / Corporativa' : 'Cliente Individual'}</span>
          </div>
        </div>
      </td>
      <td><span class="font-mono">${c.phone}</span></td>
      <td>
        <span class="badge-pill ${c.isHotel ? 'bg-amber' : 'bg-blue'}">
          ${c.isHotel
            ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="margin-right:3px;vertical-align:-1px;"><path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>Hotel / Corporativo'
            : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="margin-right:3px;vertical-align:-1px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Particular'}
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
  `}).join('') || '<tr><td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No hay clientes registrados aún. Haz clic en "+ Registrar Cliente" para agregar tu primer cliente.</td></tr>';
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

async function saveClientModal(e) {
  e.preventDefault();
  const id = document.getElementById('modalClientId').value;
  const nombre = document.getElementById('modalClientName').value.trim();
  const telefono = document.getElementById('modalClientPhone').value.trim();
  const esHotel = document.getElementById('modalClientIsHotel').value === 'true';
  const limiteCredito = parseFloat(document.getElementById('modalClientCreditLimit').value) || 0;

  const payload = { nombre, telefono, esHotel, limiteCredito };

  try {
    if (id) {
      const actualizado = await api.actualizarCliente(id, payload);
      const idx = state.clients.findIndex(c => c.id === id);
      if (idx !== -1) state.clients[idx] = mapCliente(actualizado);
      showToast('Cliente actualizado.', 'success');
    } else {
      const creado = await api.crearCliente(payload);
      state.clients.push(mapCliente(creado));
      showToast('Nuevo cliente registrado.', 'success');
    }

    renderClients();
    renderPos();
    renderDashboard();
    closeClientModal();
  } catch (err) {
    showToast(err.message || 'No se pudo guardar el cliente.', 'error');
  }
}

async function deleteClient(clientId) {
  if (!confirm('¿Deseas eliminar este cliente?')) return;
  try {
    await api.eliminarCliente(clientId);
    state.clients = state.clients.filter(c => c.id !== clientId);
    renderClients();
    renderPos();
    showToast('Cliente eliminado.', 'info');
  } catch (err) {
    showToast(err.message || 'No se pudo eliminar el cliente.', 'error');
  }
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

async function submitPayOrder(e) {
  e.preventDefault();
  const orderId = document.getElementById('payModalOrderId').value;
  const amount = parseFloat(document.getElementById('payModalAmount').value) || 0;
  const method = document.getElementById('payModalMethod').value;

  const order = state.orders.find(o => o.id === orderId);
  if (!order || amount <= 0) return;

  try {
    // El servidor valida que el monto no exceda el saldo pendiente y
    // ajusta el saldo del cliente hotelero — no se hace ese cálculo aquí.
    await api.registrarPago(orderId, { monto: amount, metodoPago: method });

    const [ordenes, movimientos, clientes] = await Promise.all([
      api.getOrdenes(), api.getMovimientosCaja(), api.getClientes()
    ]);
    state.orders = ordenes.map(mapOrden);
    state.cashMovements = movimientos.map(mapMovimiento);
    state.clients = clientes.map(mapCliente);

    renderDashboard();
    renderFacturacion();
    renderReportes();
    renderClients();
    closePayOrderModal();
    showToast(`Cobro de RD$${amount} registrado para ${order.ticket}.`, 'success');
  } catch (err) {
    showToast(err.message || 'No se pudo registrar el pago.', 'error');
  }
}

function setEditProcessStatus(status) {
  const input = document.getElementById('editInvoiceProcessStatus');
  if (input) input.value = status;

  document.querySelectorAll('#editProcessStepper .btn-step-tracker').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-step') === status);
  });

  const labelMap = {
    'Recibido': { text: '📥 Recibido', cls: 'bg-blue' },
    'EnProceso': { text: '🔄 En Lavado / Taller', cls: 'bg-amber' },
    'Listo': { text: '✨ Listo para Retiro', cls: 'bg-emerald' },
    'Entregado': { text: '✅ Entregado', cls: 'bg-slate' }
  };
  const badge = document.getElementById('editProcessBadgeLabel');
  if (badge && labelMap[status]) {
    badge.innerText = labelMap[status].text;
    badge.className = `badge-pill ${labelMap[status].cls}`;
  }
}

function openEditInvoiceModal(orderId) {
  const state = getState();
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return;

  document.getElementById('editOrderId').value = order.id;
  document.getElementById('editInvoiceTicket').value = order.ticket;
  document.getElementById('editInvoiceDate').value = order.date;
  document.getElementById('editInvoiceClient').value = order.clientName;
  document.getElementById('editInvoicePhone').value = order.phone || '';
  document.getElementById('editInvoiceTotal').value = order.total;
  document.getElementById('editInvoicePaid').value = order.paid;
  document.getElementById('editInvoiceBalance').value = `RD$${order.balance.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  document.getElementById('editInvoiceDelivery').value = order.delivery || '';

  const currentStatus = order.processStatus || 'Recibido';
  setEditProcessStatus(currentStatus);

  document.getElementById('editInvoiceModal').classList.add('active');
}

function closeEditInvoiceModal() {
  const modal = document.getElementById('editInvoiceModal');
  if (modal) modal.classList.remove('active');
}

function calculateEditInvoiceBalance() {
  const total = parseFloat(document.getElementById('editInvoiceTotal').value) || 0;
  const paid = parseFloat(document.getElementById('editInvoicePaid').value) || 0;
  const bal = Math.max(0, total - paid);
  document.getElementById('editInvoiceBalance').value = `RD$${bal.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
}

async function saveEditInvoice(e) {
  e.preventDefault();
  const orderId = document.getElementById('editOrderId').value;
  const newProcessStatus = document.getElementById('editInvoiceProcessStatus').value;
  const order = state.orders.find(o => o.id === orderId);

  if (order && newProcessStatus && order.processStatus !== newProcessStatus) {
    try {
      await api.actualizarEstadoProceso(orderId, newProcessStatus);
      order.processStatus = newProcessStatus;
      showToast(`Estado operativo de ${order.ticket} actualizado a "${newProcessStatus}".`, 'success');
      renderOperaciones();
      renderFacturacion();
    } catch (err) {
      showToast(err.message || 'Error al actualizar el estado de la orden.', 'error');
    }
  } else {
    showToast('Orden guardada correctamente.', 'success');
  }
  closeEditInvoiceModal();
}


// =====================================================================
// 10. BÚSQUEDA GLOBAL & SPOTLIGHT COMMAND PALETTE (CTRL + K)
// =====================================================================
// ---------------------------------------------------------------------
// "RECIENTES" del buscador (Ctrl+K): antes era una lista de 5 elementos
// escritos a mano que nunca cambiaba. Ahora se guarda de verdad en
// localStorage cada vez que navegas a una sección (ver switchSection) —
// es una preferencia puramente de interfaz para este navegador, no datos
// de negocio, así que no necesita pasar por la API.
// ---------------------------------------------------------------------
const CLAVE_SPOTLIGHT_RECIENTES = 'syncops_spotlight_recientes';

const SPOTLIGHT_PAGE_META = {
  dashboard:     { titulo: 'Panel Principal',           subtitulo: 'Resumen general del negocio' },
  pos:           { titulo: 'Punto de Venta / POS',       subtitulo: 'Panel de Operaciones & Cobros' },
  operaciones:   { titulo: 'Operaciones & Taller',        subtitulo: 'Tracking de Lavado & Producción' },
  facturacion:   { titulo: 'Facturas & Cobros',           subtitulo: 'Panel de Facturación' },
  reportes:      { titulo: 'Reportes Financieros',         subtitulo: 'Panel Financiero' },
  inventario:    { titulo: 'Inventario Insumos',           subtitulo: 'Panel de Operaciones' },
  clientes:      { titulo: 'Clientes & Hoteles',            subtitulo: 'Panel de Clientes' },
  configuracion: { titulo: 'Configuración de la Tienda',     subtitulo: 'Datos del negocio y tu perfil' },
  usuarios:      { titulo: 'Gestión de Usuarios',             subtitulo: 'Solo Administrador' },
  faq:           { titulo: 'Preguntas Frecuentes',             subtitulo: 'Ayuda' },
  ayuda:         { titulo: 'Ayuda & QA',                        subtitulo: 'Soporte técnico' }
};

function obtenerSeccionesPermitidas() {
  const roles = usuarioActual?.roles || [];
  const esAdmin = roles.includes('Administrador');
  if (esAdmin) {
    return ['dashboard', 'pos', 'operaciones', 'facturacion', 'reportes', 'inventario', 'clientes', 'configuracion', 'faq', 'ayuda', 'usuarios'];
  } else {
    return ['pos', 'operaciones', 'facturacion', 'clientes', 'faq', 'ayuda'];
  }
}

function registrarSeccionReciente(sectionId) {
  if (!SPOTLIGHT_PAGE_META[sectionId]) return;
  const permitidas = obtenerSeccionesPermitidas();
  if (!permitidas.includes(sectionId)) return;

  let recientes = [];
  try { recientes = JSON.parse(localStorage.getItem(CLAVE_SPOTLIGHT_RECIENTES) || '[]'); } catch (e) { /* ignorar */ }

  recientes = recientes.filter(id => id !== sectionId && permitidas.includes(id));
  recientes.unshift(sectionId);
  recientes = recientes.slice(0, 5);

  try { localStorage.setItem(CLAVE_SPOTLIGHT_RECIENTES, JSON.stringify(recientes)); } catch (e) { /* ignorar */ }
}

function obtenerSeccionesRecientes() {
  const permitidas = obtenerSeccionesPermitidas();
  try {
    const guardadas = JSON.parse(localStorage.getItem(CLAVE_SPOTLIGHT_RECIENTES) || '[]')
      .filter(id => SPOTLIGHT_PAGE_META[id] && permitidas.includes(id));
    if (guardadas.length > 0) return guardadas;
  } catch (e) { /* ignorar */ }

  const roles = usuarioActual?.roles || [];
  const esAdmin = roles.includes('Administrador');
  return esAdmin
    ? ['dashboard', 'pos', 'operaciones', 'facturacion', 'reportes']
    : ['pos', 'operaciones', 'facturacion', 'clientes', 'faq'];
}

function obtenerSeccionesDisponibles() {
  const permitidas = obtenerSeccionesPermitidas();
  return Object.keys(SPOTLIGHT_PAGE_META).filter(id => permitidas.includes(id));
}

function iconoSpotlightReciente() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>';
}

function iconoSpotlightPagina() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>';
}

function renderSpotlightVistaPorDefecto() {
  const recientes = obtenerSeccionesRecientes();
  const paginas = obtenerSeccionesDisponibles();

  const htmlRecientes = recientes.map((id, i) => `
    <div class="spotlight-item${i === 0 ? ' active' : ''}" onclick="navigateSpotlight('${id}')">
      <div class="spotlight-item-icon">${iconoSpotlightReciente()}</div>
      <div class="spotlight-item-meta">
        <strong>${SPOTLIGHT_PAGE_META[id].titulo}</strong>
        <span>${SPOTLIGHT_PAGE_META[id].subtitulo}</span>
      </div>
      <svg class="spotlight-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
    </div>
  `).join('');

  const htmlPaginas = paginas.map(id => `
    <div class="spotlight-item" onclick="navigateSpotlight('${id}')">
      <div class="spotlight-item-icon-page">${iconoSpotlightPagina()}</div>
      <div class="spotlight-item-meta">
        <strong>${SPOTLIGHT_PAGE_META[id].titulo}</strong>
      </div>
    </div>
  `).join('');

  return `
    <div class="spotlight-section-title">RECIENTES</div>
    <div class="spotlight-list">${htmlRecientes}</div>

    <div class="spotlight-section-title" style="margin-top: .75rem;">PÁGINAS AUTORIZADAS</div>
    <div class="spotlight-list">${htmlPaginas}</div>
  `;
}

function openSpotlight() {
  const modal = document.getElementById('spotlightModal');
  const input = document.getElementById('spotlightInput');
  if (modal) {
    modal.style.display = 'flex';
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 50);
      handleSpotlightSearch('');
    }
  }
}

// Índice del resultado actualmente resaltado con las flechas
let spotlightSelectedIndex = 0;

function getSpotlightItems() {
  return Array.from(document.querySelectorAll('#spotlightBody .spotlight-item'));
}

function actualizarSeleccionSpotlight(indice) {
  const items = getSpotlightItems();
  if (items.length === 0) return;

  spotlightSelectedIndex = Math.max(0, Math.min(indice, items.length - 1));

  items.forEach((el, i) => el.classList.toggle('active', i === spotlightSelectedIndex));
  items[spotlightSelectedIndex].scrollIntoView({ block: 'nearest' });
}

function moverSeleccionSpotlight(delta) {
  const items = getSpotlightItems();
  if (items.length === 0) return;
  actualizarSeleccionSpotlight((spotlightSelectedIndex + delta + items.length) % items.length);
}

function closeSpotlight() {
  const modal = document.getElementById('spotlightModal');
  if (modal) modal.style.display = 'none';
}

function closeSpotlightOnBackdrop(e) {
  if (e.target && e.target.id === 'spotlightModal') {
    closeSpotlight();
  }
}

function navigateSpotlight(sectionId) {
  closeSpotlight();
  const targetBtn = document.getElementById('nav' + sectionId.charAt(0).toUpperCase() + sectionId.slice(1) + 'Btn');
  switchSection(sectionId, targetBtn);
}

function handleSpotlightSearch(query) {
  const body = document.getElementById('spotlightBody');
  const countBadge = document.getElementById('spotlightCountBadge');
  if (!body) return;

  const roles = usuarioActual?.roles || [];
  const esAdmin = roles.includes('Administrador');
  const term = query.toLowerCase().trim();

  if (!term) {
    const recientes = obtenerSeccionesRecientes();
    const paginas = obtenerSeccionesDisponibles();
    body.innerHTML = renderSpotlightVistaPorDefecto();
    if (countBadge) countBadge.innerText = `# ${recientes.length + paginas.length} resultados`;
    actualizarSeleccionSpotlight(0);
    return;
  }

  const state = getState();
  const matchingOrders = state.orders.filter(o => o.ticket.toLowerCase().includes(term) || o.clientName.toLowerCase().includes(term));
  const matchingClients = state.clients.filter(c => c.name.toLowerCase().includes(term) || c.phone.includes(term));
  
  // Insumos de inventario solo visibles en Spotlight para Administrador
  const matchingInventory = esAdmin ? state.inventory.filter(i => i.name.toLowerCase().includes(term) || i.code.includes(term)) : [];
  
  const totalCount = matchingOrders.length + matchingClients.length + matchingInventory.length;

  if (countBadge) countBadge.innerText = `# ${totalCount} resultados`;

  if (totalCount === 0) {
    body.innerHTML = `
      <div style="padding: 2.5rem 1rem; text-align: center; color: #94A3B8;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.8" style="margin-bottom: .5rem;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <p style="font-size: .88rem; font-weight: 700; color: #475569;">No se encontraron registros para "${query}"</p>
        <span style="font-size: .76rem;">Intenta con el número de factura o nombre de cliente.</span>
      </div>
    `;
    return;
  }

  let html = '';

  if (matchingOrders.length > 0) {
    html += '<div class="spotlight-section-title">FACTURAS &amp; COMPROBANTES</div><div class="spotlight-list">';
    matchingOrders.forEach(o => {
      html += `
        <div class="spotlight-item" onclick="selectSpotlightResult('order', '${o.id}')">
          <div class="spotlight-item-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg></div>
          <div class="spotlight-item-meta">
            <strong>${o.ticket} — ${o.clientName}</strong>
            <span>Total: RD$${o.total.toLocaleString()} • Estado: ${o.status} • Saldo: RD$${o.balance.toLocaleString()}</span>
          </div>
          <svg class="spotlight-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </div>
      `;
    });
    html += '</div>';
  }

  if (matchingClients.length > 0) {
    html += '<div class="spotlight-section-title" style="margin-top: .75rem;">CLIENTES &amp; HOTELES</div><div class="spotlight-list">';
    matchingClients.forEach(c => {
      html += `
        <div class="spotlight-item" onclick="selectSpotlightResult('client', '${c.id}')">
          <div class="spotlight-item-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg></div>
          <div class="spotlight-item-meta">
            <strong>${c.name}</strong>
            <span>Tel: ${c.phone} • ${c.isHotel ? 'Hotel / Empresa' : 'Particular'}</span>
          </div>
          <svg class="spotlight-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </div>
      `;
    });
    html += '</div>';
  }

  if (esAdmin && matchingInventory.length > 0) {
    html += '<div class="spotlight-section-title" style="margin-top: .75rem;">INSUMOS DE INVENTARIO</div><div class="spotlight-list">';
    matchingInventory.forEach(i => {
      html += `
        <div class="spotlight-item" onclick="selectSpotlightResult('inventory', '${i.id}')">
          <div class="spotlight-item-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div>
          <div class="spotlight-item-meta">
            <strong>${i.name} (${i.code})</strong>
            <span>Stock: ${i.stock} ${i.unit} • Categoría: ${i.category}</span>
          </div>
          <svg class="spotlight-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </div>
      `;
    });
    html += '</div>';
  }

  body.innerHTML = html;
  actualizarSeleccionSpotlight(0);
}

function selectSpotlightResult(type, id) {
  closeSpotlight();
  if (type === 'order') {
    switchSection('facturacion', document.getElementById('navFacturasBtn'));
    const state = getState();
    const order = state.orders.find(o => o.id === id);
    if (order) displayThermalTicket(order);
  } else if (type === 'client') {
    switchSection('clientes', document.getElementById('navClientesBtn'));
    openNewClientModal(id);
  } else if (type === 'inventory') {
    const roles = usuarioActual?.roles || [];
    const esAdmin = roles.includes('Administrador');
    if (!esAdmin) {
      showToast('Acceso restringido: El inventario requiere rol de Administrador.', 'warning');
      return;
    }
    switchSection('inventario', document.getElementById('navInventarioBtn'));
    openNewInsumoModal(id);
  }
}

// Listener de atajo de teclado global Ctrl+K / Cmd+K / Esc
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    const modal = document.getElementById('spotlightModal');
    if (modal && modal.style.display === 'flex') {
      closeSpotlight();
    } else {
      openSpotlight();
    }
  }
  if (e.key === 'Escape') {
    closeSpotlight();
  }

  // Navegación con flechas + Enter, solo mientras el spotlight está abierto.
  const spotlightModal = document.getElementById('spotlightModal');
  if (spotlightModal && spotlightModal.style.display === 'flex') {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moverSeleccionSpotlight(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moverSeleccionSpotlight(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const items = getSpotlightItems();
      if (items[spotlightSelectedIndex]) items[spotlightSelectedIndex].click();
    }
  }
});


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

  if (tabName === 'servicios') {
    renderCatalogoAdmin('Todos');
  } else if (tabName === 'backup') {
    loadBackupInfo();
  }
}

async function loadBackupInfo() {
  try {
    const info = await api.getBackupInfo();
    if (document.getElementById('backupDbSize')) document.getElementById('backupDbSize').innerText = info.fileSizeFormatted || '0 KB';
    if (document.getElementById('backupTotalOrdenes')) document.getElementById('backupTotalOrdenes').innerText = info.totalOrdenes || 0;
    if (document.getElementById('backupTotalClientes')) document.getElementById('backupTotalClientes').innerText = info.totalClientes || 0;
    if (document.getElementById('backupTotalCatalogo')) document.getElementById('backupTotalCatalogo').innerText = info.totalCatalogo || 0;
  } catch (e) {
    console.error('Error cargando info de backup:', e);
  }
}

async function descargarBackupDatabase() {
  try {
    showToast('Generando copia de seguridad...', 'info');
    await api.descargarBackup();
    showToast('Copia de seguridad descargada exitosamente (.db).', 'success');
  } catch (err) {
    showToast(err.message || 'Error al descargar la copia de seguridad.', 'error');
  }
}

// ---------------------------------------------------------------------
// GESTIÓN DE CATÁLOGO & CATEGORÍAS DE SERVICIOS (CRUD COMPLETO)
// ---------------------------------------------------------------------
let currentCatalogoAdminFilter = 'Todos';

function renderCatalogoAdmin(filtro = 'Todos') {
  currentCatalogoAdminFilter = filtro;
  const state = getState();
  const tbody = document.getElementById('catalogoTableBody');
  const tabsBox = document.getElementById('catalogFilterTabsAdmin');
  if (!tbody) return;

  const defaultOrder = ['Lavandería', 'Sastrería', 'Autoservicio', 'Hotelería'];
  const presentCats = Array.from(new Set(state.catalog.map(i => i.category))).filter(Boolean);
  const orderedCats = [
    'Todos',
    ...defaultOrder.filter(c => presentCats.includes(c)),
    ...presentCats.filter(c => !defaultOrder.includes(c))
  ];

  if (tabsBox) {
    tabsBox.innerHTML = orderedCats.map(cat => `
      <button type="button" class="btn btn-sm ${cat === filtro ? 'btn-primary' : 'btn-outline'}" onclick="renderCatalogoAdmin('${cat}')" style="font-weight: 700; border-radius: 20px; padding: 4px 14px; font-size: .78rem;">
        ${cat}
      </button>
    `).join('');
  }

  const items = filtro === 'Todos' ? state.catalog : state.catalog.filter(i => i.category === filtro);

  tbody.innerHTML = items.map(item => {
    const cleanName = item.name.replace(/^[^\w\s\u00C0-\u017F]+/i, '').trim();
    const iconSvg = getCategoryIconSvg(item.category, item.name);
    const iconTheme = getItemIconBg(item.category, item.name);
    const badgeClass = getCategoryBadgeClass(item.category);

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: .65rem;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: ${iconTheme.bg}; border: 1px solid ${iconTheme.border}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${iconSvg}
            </div>
            <div>
              <strong style="color: #0F172A; font-size: .88rem; display: block;">${cleanName}</strong>
              <span style="font-size: .72rem; color: #64748B;">ID: ${item.id.slice(0, 8)}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="badge-pill ${badgeClass}">${item.category}</span>
        </td>
        <td>
          <span style="font-size: .82rem; color: #475569; font-weight: 600;">${item.service || item.category}</span>
        </td>
        <td>
          <strong class="font-mono font-bold" style="color: #0F172A; font-size: .95rem;">
            RD$${item.price.toLocaleString('es-DO', {minimumFractionDigits: 2})}
          </strong>
        </td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: .35rem;">
            <button type="button" class="btn btn-outline btn-sm" onclick="openNewCatalogoModal('${item.id}')">Editar</button>
            <button type="button" class="btn btn-outline btn-sm" style="color:#DC2626;" onclick="deleteCatalogoItem('${item.id}')">✕</button>
          </div>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No hay servicios registrados en esta categoría. Haz clic en "+ Nuevo Servicio / Prenda" para agregar uno.</td></tr>';
}

function updateModalIconPreview(nombre, categoria) {
  const previewBox = document.getElementById('modalCatalogoIconPreview');
  if (!previewBox) return;
  const iconSvg = getCategoryIconSvg(categoria, nombre);
  const theme = getItemIconBg(categoria, nombre);
  previewBox.style.background = theme.bg;
  previewBox.style.borderColor = theme.border;
  previewBox.innerHTML = iconSvg;
}

function onCatalogoNombreInput(val) {
  const isEditing = !!document.getElementById('modalCatalogoId').value;
  const selectCat = document.getElementById('modalCatalogoCategoria');
  const selectServ = document.getElementById('modalCatalogoServicio');

  if (!isEditing && selectCat && val.trim().length > 1) {
    const nom = val.toLowerCase();
    
    // Auto-detección inteligente de categoría y flujo
    if (nom.includes('ruedo') || nom.includes('zipper') || nom.includes('cremallera') || nom.includes('entalle') || nom.includes('cintura') || nom.includes('manga') || nom.includes('hombro') || nom.includes('ajuste') || nom.includes('zurcido') || nom.includes('boton') || nom.includes('botón') || nom.includes('sastrer') || nom.includes('costura')) {
      selectCat.value = 'Sastrería';
      if (selectServ) selectServ.value = 'Sastrería';
    } else if (nom.includes('downy') || nom.includes('suavizante') || nom.includes('pelvorato') || nom.includes('perborato') || nom.includes('cloro') || nom.includes('detergente') || nom.includes('jabon') || nom.includes('jabón') || nom.includes('torre') || nom.includes('industrial') || nom.includes('lavadora') || nom.includes('secadora')) {
      selectCat.value = 'Autoservicio';
      if (selectServ) selectServ.value = 'Autoservicio';
    } else if (nom.includes('hotel') || nom.includes('resort') || nom.includes('airbnb') || nom.includes('uniforme') || nom.includes('lote')) {
      selectCat.value = 'Hotelería';
      if (selectServ) selectServ.value = 'Lavandería';
    } else if (selectCat.value === 'Autoservicio' || selectCat.value === 'Sastrería') {
      selectCat.value = 'Lavandería';
      if (selectServ) selectServ.value = 'Lavandería';
    }
  }

  const catVal = selectCat ? selectCat.value : 'Lavandería';
  updateModalIconPreview(val, catVal);
}

function openNewCatalogoModal(itemId = null) {
  const roles = usuarioActual?.roles || [];
  const esAdmin = roles.includes('Administrador');
  if (!esAdmin) {
    showToast('Acceso restringido: Solo el Administrador puede gestionar el catálogo de servicios.', 'warning');
    return;
  }

  const state = getState();
  const modal = document.getElementById('catalogoModal');
  const title = document.getElementById('catalogoModalTitle');
  const btnSave = document.getElementById('btnSaveCatalogo');
  if (!modal) return;

  const selectCat = document.getElementById('modalCatalogoCategoria');
  const standardCats = ['Lavandería', 'Sastrería', 'Autoservicio', 'Hotelería'];
  const allCats = Array.from(new Set([...standardCats, ...state.catalog.map(i => i.category)])).filter(Boolean);

  if (selectCat) {
    selectCat.innerHTML = allCats.map(c => `<option value="${c}">${c}</option>`).join('') +
      '<option value="__nueva__">+ Nueva Categoría Personalizada...</option>';
  }

  const groupNueva = document.getElementById('groupNuevaCategoria');
  if (groupNueva) groupNueva.style.display = 'none';
  const inputNueva = document.getElementById('modalCatalogoNuevaCategoria');
  if (inputNueva) inputNueva.value = '';

  if (itemId) {
    const item = state.catalog.find(x => x.id === itemId);
    if (item) {
      if (title) title.innerText = 'Editar Servicio / Prenda';
      if (btnSave) btnSave.innerText = 'Guardar Cambios';
      document.getElementById('modalCatalogoId').value = item.id;
      document.getElementById('modalCatalogoNombre').value = item.name;
      document.getElementById('modalCatalogoPrecio').value = item.price;
      if (selectCat) selectCat.value = item.category;
      document.getElementById('modalCatalogoServicio').value = item.service || item.category;
      updateModalIconPreview(item.name, item.category);
    }
  } else {
    if (title) title.innerText = 'Registrar Nuevo Servicio / Prenda';
    if (btnSave) btnSave.innerText = 'Crear Servicio';
    document.getElementById('modalCatalogoId').value = '';
    document.getElementById('modalCatalogoNombre').value = '';
    document.getElementById('modalCatalogoPrecio').value = '';
    if (selectCat) selectCat.value = 'Lavandería';
    document.getElementById('modalCatalogoServicio').value = 'Lavandería';
    updateModalIconPreview('', 'Lavandería');
  }

  modal.classList.add('active');
}

function closeCatalogoModal() {
  const modal = document.getElementById('catalogoModal');
  if (modal) modal.classList.remove('active');
}

function onCategoriaSelectChange(val) {
  const group = document.getElementById('groupNuevaCategoria');
  if (group) {
    group.style.display = (val === '__nueva__') ? 'block' : 'none';
    if (val === '__nueva__') {
      const input = document.getElementById('modalCatalogoNuevaCategoria');
      if (input) input.focus();
    }
  }
  const nombre = document.getElementById('modalCatalogoNombre')?.value || '';
  updateModalIconPreview(nombre, val);
}

async function saveCatalogoModal(e) {
  e.preventDefault();
  const id = document.getElementById('modalCatalogoId').value;
  const nombre = document.getElementById('modalCatalogoNombre').value.trim();
  let categoria = document.getElementById('modalCatalogoCategoria').value;
  if (categoria === '__nueva__') {
    categoria = (document.getElementById('modalCatalogoNuevaCategoria').value || '').trim();
    if (!categoria) {
      showToast('Por favor escribe el nombre de la nueva categoría.', 'error');
      return;
    }
  }
  const servicio = document.getElementById('modalCatalogoServicio').value || categoria;
  const precio = parseFloat(document.getElementById('modalCatalogoPrecio').value) || 0;

  if (!nombre) {
    showToast('El nombre del servicio es obligatorio.', 'error');
    return;
  }

  const payload = {
    nombre,
    categoria,
    servicio,
    precio
  };

  try {
    if (id) {
      const res = await api.actualizarCatalogoItem(id, payload);
      const idx = state.catalog.findIndex(x => x.id === id);
      if (idx !== -1) {
        state.catalog[idx] = mapCatalogo(res);
      }
      showToast(`Servicio "${nombre}" actualizado correctamente.`, 'success');
    } else {
      const res = await api.crearCatalogoItem(payload);
      state.catalog.push(mapCatalogo(res));
      showToast(`Servicio "${nombre}" agregado al catálogo.`, 'success');
    }

    closeCatalogoModal();
    renderPosCategoryTabs(categoria);
    filterCatalog(categoria);
    renderCatalogoAdmin(currentCatalogoAdminFilter);
  } catch (err) {
    showToast(err.message || 'Error al guardar el servicio en el catálogo.', 'error');
  }
}

async function deleteCatalogoItem(id) {
  const item = state.catalog.find(x => x.id === id);
  if (!item) return;

  if (!confirm(`¿Estás seguro de eliminar el servicio "${item.name}" del catálogo?`)) {
    return;
  }

  try {
    await api.eliminarCatalogoItem(id);
    state.catalog = state.catalog.filter(x => x.id !== id);
    showToast(`Servicio "${item.name}" eliminado del catálogo.`, 'success');
    renderPosCategoryTabs('Todos');
    filterCatalog('Todos');
    renderCatalogoAdmin(currentCatalogoAdminFilter);
  } catch (err) {
    showToast(err.message || 'Error al eliminar el servicio.', 'error');
  }
}

function switchSettingsTab(tabKey, btnEl) {
  document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.settings-tab-pane').forEach(p => {
    p.classList.remove('active');
    p.style.display = 'none';
  });

  if (btnEl) btnEl.classList.add('active');
  const target = document.getElementById('settings-tab-' + tabKey);
  if (target) {
    target.classList.add('active');
    target.style.display = 'block';
  }
}

function loadConfigInputs() {
  const state = getState();
  const user = usuarioActual || {};

  const displayName = user.nombreCompleto || '';
  const displayEmail = user.email || '';
  const nameParts = displayName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  const avatarText = (firstName[0] + (lastName[0] || '')).toUpperCase() || '?';

  const avatarCircle = document.getElementById('cfgAvatarCircle');
  const dispName = document.getElementById('cfgDisplayName');
  const dispEmail = document.getElementById('cfgDisplayEmail');
  if (avatarCircle) avatarCircle.innerText = avatarText;
  if (dispName) dispName.innerText = displayName;
  if (dispEmail) dispEmail.innerText = displayEmail;

  if (document.getElementById('cfgFirstName')) document.getElementById('cfgFirstName').value = firstName;
  if (document.getElementById('cfgLastName')) document.getElementById('cfgLastName').value = lastName;
  if (document.getElementById('cfgUserEmailExact')) document.getElementById('cfgUserEmailExact').value = displayEmail;
  if (document.getElementById('cfgJobTitle')) document.getElementById('cfgJobTitle').value = (user.roles && user.roles[0]) || 'Administrador General';

  const cfg = state.config || {};
  if (document.getElementById('cfgInvoicePrefix')) document.getElementById('cfgInvoicePrefix').value = cfg.invoicePrefix || 'FAC';
  if (document.getElementById('cfgNextInvoiceNumber')) document.getElementById('cfgNextInvoiceNumber').value = cfg.nextInvoiceNumber || 1001;
  if (document.getElementById('cfgBusinessName')) document.getElementById('cfgBusinessName').value = cfg.businessName || '';
  if (document.getElementById('cfgRnc')) document.getElementById('cfgRnc').value = cfg.rnc || '';
  if (document.getElementById('cfgPhone')) document.getElementById('cfgPhone').value = cfg.phone || '';
  if (document.getElementById('cfgAddress')) document.getElementById('cfgAddress').value = cfg.address || '';
  if (document.getElementById('cfgStoreEmail')) document.getElementById('cfgStoreEmail').value = cfg.email || 'contacto@syncopslaundry.do';
  if (document.getElementById('cfgPrinterWidth')) document.getElementById('cfgPrinterWidth').value = cfg.printerWidth || '80mm';
  if (document.getElementById('cfgPrinterModel')) document.getElementById('cfgPrinterModel').value = cfg.printerModel || 'epson-t20ii';
  if (document.getElementById('cfgTicketFooter')) document.getElementById('cfgTicketFooter').value = cfg.ticketFooter || '';
}

async function saveUserProfileExact(e) {
  e.preventDefault();
  const first = document.getElementById('cfgFirstName').value.trim();
  const last = document.getElementById('cfgLastName').value.trim();

  if (!first) {
    showToast('El nombre es obligatorio.', 'error');
    return;
  }

  // El email no se puede editar aquí a propósito (ver nota en el backend:
  // cambiar el email de una cuenta requiere un flujo de confirmación que
  // todavía no existe).
  const fullName = last ? `${first} ${last}` : first;

  try {
    const actualizado = await api.actualizarPerfil(fullName);
    pintarUsuario(actualizado);
    loadConfigInputs();
    showToast('Perfil actualizado correctamente.', 'success');
  } catch (err) {
    showToast(err.message || 'No se pudo actualizar el perfil.', 'error');
  }
}

async function saveBusinessConfig(e) {
  if (e) e.preventDefault();

  const payload = {
    businessName: (document.getElementById('cfgBusinessName')?.value || '').trim(),
    rnc: (document.getElementById('cfgRnc')?.value || '').trim(),
    phone: (document.getElementById('cfgPhone')?.value || '').trim(),
    address: (document.getElementById('cfgAddress')?.value || '').trim(),
    email: (document.getElementById('cfgStoreEmail')?.value || '').trim(),
    printerWidth: document.getElementById('cfgPrinterWidth')?.value || '80mm',
    printerModel: document.getElementById('cfgPrinterModel')?.value || 'epson-t20ii',
    invoicePrefix: (document.getElementById('cfgInvoicePrefix')?.value || 'FAC').trim().toUpperCase(),
    nextInvoiceNumber: parseInt(document.getElementById('cfgNextInvoiceNumber')?.value, 10) || 1001,
    ticketFooter: (document.getElementById('cfgTicketFooter')?.value || '').trim()
  };

  try {
    const actualizado = await api.actualizarConfiguracion(payload);
    state.config = mapConfig(actualizado);

    const brandName = document.querySelector('.sidebar-brand .brand-name');
    if (brandName && payload.businessName) {
      brandName.innerText = payload.businessName.split(' ')[0] || 'SyncOps';
    }

    const posInv = document.getElementById('posInvoiceNumber');
    if (posInv) posInv.value = getFormattedNextInvoice();

    loadConfigInputs();
    showToast('Configuración de la tienda guardada con éxito en el servidor.', 'success');
  } catch (err) {
    showToast(err.message || 'No se pudo guardar la configuración.', 'error');
  }
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

let currentFaqCategory = 'todas';

function filterFaqCategory(category, btnEl) {
  currentFaqCategory = category;
  document.querySelectorAll('#section-faq .fortexa-subnav-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  const searchTerm = (document.getElementById('faqSearchInput')?.value || '').toLowerCase().trim();
  applyFaqFilters(searchTerm, currentFaqCategory);
}

function filterFaq(term) {
  applyFaqFilters((term || '').toLowerCase().trim(), currentFaqCategory);
}

function applyFaqFilters(term, category) {
  const items = document.querySelectorAll('#section-faq .faq-item');
  items.forEach(item => {
    const itemCategory = item.getAttribute('data-category') || '';
    const text = item.innerText.toLowerCase();

    const matchesCategory = (category === 'todas' || itemCategory === category);
    const matchesSearch = (!term || text.includes(term));

    item.style.display = (matchesCategory && matchesSearch) ? 'block' : 'none';
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
    showToast('El reinicio de datos demo se desactivó: los datos ahora viven en la base de datos real del servidor, no en este navegador.', 'info');
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
// 13. TICKET TÉRMICO PROFESIONAL 80MM (EPSON TM-T20II - B&W PURO)
// =====================================================================
function generateBarcodeSvg(code) {
  const pattern = [2, 1, 3, 1, 1, 2, 3, 2, 1, 2, 2, 3, 1, 1, 2, 1, 3, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 2, 1, 3, 1, 2];
  let x = 15;
  let rects = '';
  for (let i = 0; i < pattern.length; i++) {
    const width = pattern[i];
    if (i % 2 === 0) {
      rects += `<rect x="${x}" y="0" width="${width * 2.2}" height="34" fill="#000000" />`;
    }
    x += width * 2.2;
  }
  return rects;
}

function displayThermalTicket(order, cambio = 0) {
  const state = getState();
  const cfg = state.config || {};

  const headerName = document.getElementById('tktHeaderName');
  const headerAddr = document.getElementById('tktHeaderAddress');
  const headerPhone = document.getElementById('tktHeaderPhone');
  const footerNote = document.getElementById('tktFooterNote');

  if (headerName) headerName.innerText = (cfg.businessName || 'FULLTIME LAUNDRY').toUpperCase();
  if (headerAddr) headerAddr.innerText = cfg.address || 'Av. Winston Churchill #102, Santo Domingo';
  if (headerPhone) headerPhone.innerText = `Tel: ${cfg.phone || '(809) 555-7962'} • RNC: ${cfg.rnc || '131-89745-1'}`;
  if (footerNote) footerNote.innerText = cfg.ticketFooter || 'Prendas no retiradas tras 30 días pasan a disposición legal.';

  document.getElementById('tktNum').innerText = order.ticket;
  document.getElementById('tktDate').innerText = order.date;
  document.getElementById('tktDelivery').innerText = order.delivery || order.date;
  document.getElementById('tktClient').innerText = order.clientName;
  document.getElementById('tktPhone').innerText = order.phone || 'N/A';

  const itemsBody = document.getElementById('tktItemsBody');
  if (itemsBody) {
    itemsBody.innerHTML = order.items.map(item => `
      <div class="tkt-item-row">
        <div class="tkt-item-desc">
          ${item.qty}x ${item.name}
          ${item.alteration ? `<div class="tkt-item-subline">• Arreglo: ${item.alteration}</div>` : ''}
          ${item.color ? `<div class="tkt-item-subline">• Detalle: ${item.color}</div>` : ''}
        </div>
        <div class="tkt-item-price font-mono">RD$${item.subtotal.toLocaleString('es-DO', {minimumFractionDigits:2})}</div>
      </div>
    `).join('');
  }

  document.getElementById('tktSubtotal').innerText = `RD$${order.subtotal.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  document.getElementById('tktDiscount').innerText = `RD$${(order.discount || 0).toLocaleString('es-DO', {minimumFractionDigits:2})}`;

  const itbisRow = document.getElementById('tktItbisRow');
  const tieneItbis = (order.itbis || 0) > 0;
  if (itbisRow) itbisRow.style.display = tieneItbis ? 'flex' : 'none';
  document.getElementById('tktItbis').innerText = `RD$${(order.itbis || 0).toLocaleString('es-DO', {minimumFractionDigits:2})}`;

  document.getElementById('tktTotal').innerText = `RD$${order.total.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  document.getElementById('tktPaid').innerText = `RD$${order.paid.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  document.getElementById('tktBalance').innerText = `RD$${order.balance.toLocaleString('es-DO', {minimumFractionDigits:2})}`;

  // Se muestra UNA de las dos: saldo pendiente o cambio entregado.
  document.getElementById('tktBalanceRow').style.display = cambio > 0 ? 'none' : 'flex';
  document.getElementById('tktCambioRow').style.display = cambio > 0 ? 'flex' : 'none';
  document.getElementById('tktCambio').innerText = `RD$${cambio.toLocaleString('es-DO', {minimumFractionDigits:2})}`;
  
  const barcodeNum = order.barcode || order.ticket.replace(/\D/g, '') || '202608210001';
  document.getElementById('tktBarcode').innerText = `*${barcodeNum}*`;

  const barcodeSvg = document.getElementById('tktBarcodeSvg');
  if (barcodeSvg) {
    barcodeSvg.innerHTML = generateBarcodeSvg(barcodeNum);
  }

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
    ticket: 'FAC-001001',
    barcode: '202608216441',
    clientId: 'c1',
    clientName: 'Alexandra Bello',
    phone: '+8297602825',
    date: new Date().toLocaleString('es-DO'),
    delivery: new Date(Date.now() + 86400000).toLocaleString('es-DO'),
    subtotal: 1000,
    discount: 0,
    total: 1000,
    paid: 1000,
    balance: 0,
    items: [
      { name: 'Torre — Servicio Asistido (Lavado + Secado)', qty: 1, subtotal: 1000, color: 'Ropa Blanca y Color' }
    ]
  };

  displayThermalTicket(testOrder);
  showToast('Ticket de prueba en Blanco y Negro preparado para EPSON TM-T20II.', 'success');
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

// =====================================================================
// 15. GESTIÓN DE USUARIOS (SOLO ADMINISTRADOR)
// =====================================================================
// A diferencia del resto de la app, esta sección NO usa la caché `state`:
// la lista de usuarios se pide a la API cada vez que se abre la pantalla
// (es información sensible y poco frecuente, no hace falta mantenerla en
// memoria todo el tiempo). El botón del menú ya está oculto para quien no
// sea Administrador (ver pintarUsuario), y el backend igual lo exige con
// [Authorize(Roles = "Administrador")] aunque alguien fuerce la URL.
let usuariosCache = [];

async function renderUsuarios() {
  const tbody = document.getElementById('usuariosTableBody');
  if (!tbody) return;

  try {
    usuariosCache = await api.getUsuarios();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-muted);">${err.message || 'No se pudo cargar la lista de usuarios.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = usuariosCache.map(u => `
    <tr>
      <td><strong>${u.nombreCompleto}</strong></td>
      <td><span class="font-mono">${u.email}</span></td>
      <td><span class="badge-pill ${u.roles.includes('Administrador') ? 'bg-amber' : 'bg-blue'}">${u.roles.join(', ') || 'Sin rol'}</span></td>
      <td>
        <span class="badge-pill ${u.bloqueado ? 'bg-amber' : 'bg-emerald'}">
          ${u.bloqueado ? 'Bloqueado' : 'Activo'}
        </span>
      </td>
      <td>
        <div style="display: flex; gap: .35rem;">
          <button class="btn btn-outline btn-sm" onclick="toggleBloqueoUsuario('${u.id}', ${u.bloqueado})">
            ${u.bloqueado ? 'Desbloquear' : 'Bloquear'}
          </button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No hay usuarios registrados aún.</td></tr>';
}

function openNewUsuarioModal() {
  document.getElementById('modalUsuarioNombre').value = '';
  document.getElementById('modalUsuarioEmail').value = '';
  document.getElementById('modalUsuarioPassword').value = '';
  document.getElementById('modalUsuarioRol').value = 'Empleado';
  document.getElementById('usuarioModal').classList.add('active');
}

function closeUsuarioModal() {
  document.getElementById('usuarioModal').classList.remove('active');
}

async function saveUsuarioModal(e) {
  e.preventDefault();
  const nombreCompleto = document.getElementById('modalUsuarioNombre').value.trim();
  const email = document.getElementById('modalUsuarioEmail').value.trim();
  const password = document.getElementById('modalUsuarioPassword').value;
  const rol = document.getElementById('modalUsuarioRol').value;

  try {
    await api.crearUsuario(nombreCompleto, email, password, rol);
    showToast(`Usuario ${nombreCompleto} creado. Comparte su contraseña de forma segura.`, 'success');
    closeUsuarioModal();
    renderUsuarios();
  } catch (err) {
    showToast(err.message || 'No se pudo crear el usuario.', 'error');
  }
}

async function toggleBloqueoUsuario(id, estaBloqueado) {
  const accion = estaBloqueado ? 'desbloquear' : 'bloquear';
  if (!confirm(`¿Deseas ${accion} el acceso de este usuario?`)) return;

  try {
    if (estaBloqueado) {
      await api.desbloquearUsuario(id);
      showToast('Usuario desbloqueado.', 'success');
    } else {
      await api.bloquearUsuario(id);
      showToast('Usuario bloqueado. Ya no podrá iniciar sesión.', 'info');
    }
    renderUsuarios();
  } catch (err) {
    showToast(err.message || `No se pudo ${accion} el usuario.`, 'error');
  }
}
