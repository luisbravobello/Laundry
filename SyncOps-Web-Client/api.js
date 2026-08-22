/**
 * SyncOps — Cliente API
 * Reemplaza el acceso directo a localStorage por llamadas al backend
 * ASP.NET Core (SyncOps.Laundry.WebApi), protegidas con JWT.
 */
const API_BASE_URL = 'https://localhost:5443/api';

// El access token vive en memoria + sessionStorage (se pierde al cerrar la
// pestaña). Nunca en localStorage: así una sesión no sobrevive más de lo
// necesario. El refresh token real vive en una cookie httpOnly que este
// script ni siquiera puede leer.
let accessToken = sessionStorage.getItem('syncops_access_token') || null;

function setAccessToken(token) {
  accessToken = token;
  if (token) {
    sessionStorage.setItem('syncops_access_token', token);
  } else {
    sessionStorage.removeItem('syncops_access_token');
  }
}

function tieneSesion() {
  return !!accessToken;
}

async function intentarRefrescarSesion() {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!res.ok) return false;
    const data = await res.json();
    setAccessToken(data.accessToken);
    return true;
  } catch (e) {
    return false;
  }
}

function forzarLogoutYRedirigir() {
  setAccessToken(null);
  if (!window.location.pathname.toLowerCase().endsWith('login.html')) {
    window.location.href = 'login.html';
  }
}

async function apiFetch(path, options = {}, yaReintentado = false) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include' // necesario para que la cookie de refresh viaje
  });

  // Access token vencido (15 min): se intenta renovar UNA vez con el
  // refresh token antes de mandar al usuario de vuelta al login.
  if (res.status === 401 && !yaReintentado) {
    const renovado = await intentarRefrescarSesion();
    if (renovado) {
      return apiFetch(path, options, true);
    }
    forzarLogoutYRedirigir();
    throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
  }

  if (!res.ok) {
    let mensaje = 'Ocurrió un error al comunicarse con el servidor.';
    try {
      const data = await res.json();
      mensaje = data.message || (data.errors ? data.errors.join(', ') : mensaje);
    } catch (e) { /* respuesta sin cuerpo JSON */ }
    throw new Error(mensaje);
  }

  if (res.status === 204) return null;
  return res.json();
}

const api = {
  // --- Autenticación ---
  login: (email, password) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (nombreCompleto, email, password, tienda) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ nombreCompleto, email, password, tienda }) }),
  me: () => apiFetch('/auth/me'),
  actualizarPerfil: (nombreCompleto) =>
    apiFetch('/auth/perfil', { method: 'PUT', body: JSON.stringify({ nombreCompleto }) }),
  crearUsuario: (nombreCompleto, email, password, rol) =>
    apiFetch('/auth/usuarios', { method: 'POST', body: JSON.stringify({ nombreCompleto, email, password, rol }) }),
  getUsuarios: () => apiFetch('/auth/usuarios'),
  bloquearUsuario: (id) => apiFetch(`/auth/usuarios/${id}/bloquear`, { method: 'POST' }),
  desbloquearUsuario: (id) => apiFetch(`/auth/usuarios/${id}/desbloquear`, { method: 'POST' }),
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
  forgotPassword: (email) =>
    apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (email, token, nuevaPassword) =>
    apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, token, nuevaPassword }) }),

  // --- Catálogo y Servicios ---
  getCatalogo: () => apiFetch('/catalogo'),
  crearCatalogoItem: (data) => apiFetch('/catalogo', { method: 'POST', body: JSON.stringify(data) }),
  actualizarCatalogoItem: (id, data) => apiFetch(`/catalogo/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminarCatalogoItem: (id) => apiFetch(`/catalogo/${id}`, { method: 'DELETE' }),

  // --- Clientes ---
  getClientes: () => apiFetch('/clientes'),
  crearCliente: (data) => apiFetch('/clientes', { method: 'POST', body: JSON.stringify(data) }),
  actualizarCliente: (id, data) => apiFetch(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminarCliente: (id) => apiFetch(`/clientes/${id}`, { method: 'DELETE' }),

  // --- Inventario ---
  getInventario: () => apiFetch('/inventario'),
  crearInsumo: (data) => apiFetch('/inventario', { method: 'POST', body: JSON.stringify(data) }),
  actualizarInsumo: (id, data) => apiFetch(`/inventario/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  ajustarStock: (id, delta) => apiFetch(`/inventario/${id}/ajustar-stock`, { method: 'POST', body: JSON.stringify({ delta }) }),
  eliminarInsumo: (id) => apiFetch(`/inventario/${id}`, { method: 'DELETE' }),

  // --- Órdenes ---
  getOrdenes: () => apiFetch('/ordenes'),
  crearOrden: (data) => apiFetch('/ordenes', { method: 'POST', body: JSON.stringify(data) }),
  registrarPago: (id, data) => apiFetch(`/ordenes/${id}/pagos`, { method: 'POST', body: JSON.stringify(data) }),
  actualizarEstadoProceso: (id, estadoProceso) =>
    apiFetch(`/ordenes/${id}/estado-proceso`, { method: 'PATCH', body: JSON.stringify({ estadoProceso }) }),

  // --- Caja ---
  getMovimientosCaja: () => apiFetch('/caja/movimientos'),
  getResumenCajaHoy: () => apiFetch('/caja/resumen-hoy'),

  // --- Configuración & Backups ---
  getConfiguracion: () => apiFetch('/configuracion'),
  actualizarConfiguracion: (data) => apiFetch('/configuracion', { method: 'PUT', body: JSON.stringify(data) }),
  getBackupInfo: () => apiFetch('/backup/info'),
  descargarBackup: async () => {
    const token = getAccessToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE_URL}/backup/download`, {
      method: 'GET',
      credentials: 'include',
      headers
    });
    if (!res.ok) {
      throw new Error('Error al descargar la copia de seguridad.');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SyncOps_Backup_${new Date().toISOString().slice(0, 10)}.db`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }
};
