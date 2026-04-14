// ============================================================
// RUTAS EUROPAN — App principal
// ============================================================
// PWA para gestión de rutas de reparto con Google Sheets backend
// ============================================================

// ==================== CONFIGURACIÓN ==========================
const CONFIG = {
  // ⬇️ PEGAR AQUÍ la URL del Apps Script tras desplegarlo como Web App
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyr7rWC6uiTnAqqyQRHbIMMQ-6VgyWoufHPx6YoJX1xEqnAXjg26Y7Ki1eh5h7uvcw/exec',

  DEBOUNCE_MS: 300,
  ROUTES: ['2', '3', '4', '5'],
  DAYS: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
  DAY_LABELS: {
    'Lunes': 'L',
    'Martes': 'M',
    'Miércoles': 'X',
    'Jueves': 'J',
    'Viernes': 'V'
  }
};

// ==================== ESTADO ================================
const state = {
  selectedRuta: null,
  selectedDia: null,
  currentSheetName: '',
  clients: [],
  allClients: null,
  savedScrollY: 0,
  previousScreen: 'selector',
  isLoading: false
};

// ==================== DOM HELPERS ============================
const $ = (id) => document.getElementById(id);

// ==================== INICIALIZACIÓN ========================
document.addEventListener('DOMContentLoaded', init);

function init() {
  setupEventListeners();
  autoSelectToday();
  showScreen('selector');

  // Registrar Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('Service Worker registration failed:', err);
    });
  }
}

// ==================== AUTO-SELECCIONAR DÍA HOY ==============
function autoSelectToday() {
  const dayIndex = new Date().getDay(); // 0=Dom, 1=Lun...
  const dayMap = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes' };
  const today = dayMap[dayIndex];

  if (today) {
    const btn = document.querySelector(`#dia-selector .toggle-btn[data-value="${today}"]`);
    if (btn) {
      btn.classList.add('active');
      state.selectedDia = today;
      updateVerRutaButton();
    }
  }
}

// ==================== EVENT LISTENERS ========================
function setupEventListeners() {
  // Toggle buttons: Ruta
  document.querySelectorAll('#ruta-selector .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#ruta-selector .toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedRuta = btn.dataset.value;
      updateVerRutaButton();
    });
  });

  // Toggle buttons: Día
  document.querySelectorAll('#dia-selector .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#dia-selector .toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedDia = btn.dataset.value;
      updateVerRutaButton();
    });
  });

  // Ver ruta
  $('btn-ver-ruta').addEventListener('click', loadAndShowRoute);

  // Buscar desde selector
  $('btn-buscar-global').addEventListener('click', () => {
    state.previousScreen = 'selector';
    showScreen('buscar');
    $('search-input').focus();
  });

  // Volver al selector desde ruta
  $('btn-back-selector').addEventListener('click', () => {
    showScreen('selector');
  });

  // Buscar desde lista de ruta
  $('btn-search-from-list').addEventListener('click', () => {
    state.savedScrollY = window.scrollY;
    state.previousScreen = 'ruta';
    showScreen('buscar');
    $('search-input').focus();
  });

  // Volver desde búsqueda
  $('btn-back-from-search').addEventListener('click', goBackFromSearch);
  $('btn-volver-ruta').addEventListener('click', goBackFromSearch);

  // Input de búsqueda con debounce
  let debounceTimer;
  $('search-input').addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => handleSearch(e.target.value), CONFIG.DEBOUNCE_MS);
  });

  // FAB: añadir cliente
  $('btn-add-client').addEventListener('click', showAddClientModal);

  // Overlay del modal: cerrar al pulsar
  $('modal-overlay').addEventListener('click', closeEditModal);
}

// ==================== NAVEGACIÓN =============================
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(`screen-${name}`).classList.add('active');

  // Cargar todos los clientes si vamos a búsqueda
  if (name === 'buscar' && !state.allClients) {
    loadAllClients();
  }

  // Restaurar scroll al volver a ruta
  if (name === 'ruta') {
    setTimeout(() => window.scrollTo(0, state.savedScrollY), 50);
  }

  // Scroll arriba para otras pantallas
  if (name !== 'ruta') {
    window.scrollTo(0, 0);
  }
}

function goBackFromSearch() {
  $('search-input').value = '';
  $('search-results').innerHTML = '';

  if (state.previousScreen === 'ruta' && state.clients.length > 0) {
    showScreen('ruta');
  } else {
    showScreen('selector');
  }
}

function updateVerRutaButton() {
  const btn = $('btn-ver-ruta');
  const ready = state.selectedRuta && state.selectedDia;
  btn.disabled = !ready;

  if (ready) {
    btn.textContent = `Ver Ruta ${state.selectedRuta} · ${state.selectedDia} →`;
  } else {
    btn.textContent = 'Ver ruta →';
  }
}

// ==================== DEMO DATA ==============================
const DEMO_CLIENTS = [
  { rowIndex: 2, orden: 1, cliente: 'Panadería López', direccion1: 'C/ Gran Vía 15, Madrid', mapsUrl1: 'https://maps.google.com/?q=Gran+Via+15+Madrid', direccion2: '', mapsUrl2: '', tipoDescarga: 'única', notas: 'Entregar antes de las 8:00', telefono1: '600123456', telefono2: '' },
  { rowIndex: 3, orden: 2, cliente: 'Bar El Cruce', direccion1: 'Av. de la Constitución 42', mapsUrl1: 'https://maps.google.com/?q=Av+Constitucion+42', direccion2: 'C/ Sierpes 8, local 2', mapsUrl2: 'https://maps.google.com/?q=Sierpes+8', tipoDescarga: 'ambas', notas: '', telefono1: '', telefono2: '' },
  { rowIndex: 4, orden: 3, cliente: 'Hotel Reina Victoria', direccion1: 'Plaza Santa Ana 14', mapsUrl1: 'https://maps.google.com/?q=Plaza+Santa+Ana+14', direccion2: 'C/ Huertas 3, cocina', mapsUrl2: 'https://maps.google.com/?q=Huertas+3', tipoDescarga: 'elegir', notas: 'Preguntar por Marcos', telefono1: '915678901', telefono2: '611222333' },
  { rowIndex: 5, orden: 4, cliente: 'Supermercado Día', direccion1: 'C/ Alcalá 120', mapsUrl1: 'https://maps.google.com/?q=Alcala+120+Madrid', direccion2: '', mapsUrl2: '', tipoDescarga: 'única', notas: 'Muelle de carga trasero', telefono1: '', telefono2: '' },
  { rowIndex: 6, orden: 5, cliente: 'Cafetería Central', direccion1: 'Paseo del Prado 28', mapsUrl1: 'https://maps.google.com/?q=Paseo+Prado+28', direccion2: 'C/ Moratín 5', mapsUrl2: 'https://maps.google.com/?q=Moratin+5', tipoDescarga: 'ambas', notas: '', telefono1: '', telefono2: '' },
  { rowIndex: 7, orden: 6, cliente: 'Restaurante Mar Azul', direccion1: 'C/ Serrano 55', mapsUrl1: 'https://maps.google.com/?q=Serrano+55', direccion2: '', mapsUrl2: '', tipoDescarga: 'única', notas: 'Solo martes y jueves', telefono1: '688999111', telefono2: '' },
];

function isDemoMode() {
  return !CONFIG.SCRIPT_URL;
}

// ==================== API ====================================
async function apiGet(action, params = {}) {
  // Modo demo: devolver datos de ejemplo
  if (isDemoMode()) {
    await new Promise(r => setTimeout(r, 400)); // Simular latencia
    if (action === 'getRoute') {
      const sheetName = `Ruta${params.ruta}_${params.dia}`;
      return { success: true, data: JSON.parse(JSON.stringify(DEMO_CLIENTS)), sheetName };
    }
    if (action === 'getAllClients') {
      const all = [];
      ['2', '3', '4', '5'].forEach(ruta => {
        ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].forEach(dia => {
          DEMO_CLIENTS.forEach(c => {
            all.push({ ...JSON.parse(JSON.stringify(c)), ruta, dia, sheetName: `Ruta${ruta}_${dia}` });
          });
        });
      });
      return { success: true, data: all };
    }
    return { success: true };
  }

  const url = new URL(CONFIG.SCRIPT_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  showLoading(true);
  try {
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Error desconocido');
    return result;
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
    throw err;
  } finally {
    showLoading(false);
  }
}

async function apiPost(action, payload = {}) {
  // Modo demo: simular escritura
  if (isDemoMode()) {
    showLoading(true);
    await new Promise(r => setTimeout(r, 300));
    showLoading(false);
    if (action === 'addClient') {
      return { success: true, rowIndex: 100 + Math.floor(Math.random() * 900) };
    }
    return { success: true };
  }

  showLoading(true);
  try {
    const response = await fetch(CONFIG.SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, ...payload })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Error desconocido');
    return result;
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
    throw err;
  } finally {
    showLoading(false);
  }
}

// ==================== CARGAR RUTA ============================
async function loadAndShowRoute() {
  try {
    const result = await apiGet('getRoute', {
      ruta: state.selectedRuta,
      dia: state.selectedDia
    });

    state.clients = result.data;
    state.currentSheetName = result.sheetName;
    $('ruta-title').textContent = `Ruta ${state.selectedRuta} · ${state.selectedDia}`;
    renderClientList();
    showScreen('ruta');
  } catch (err) {
    // Error ya mostrado por apiGet
  }
}

// ==================== RENDERIZAR LISTA =======================
function renderClientList() {
  const container = $('client-list');

  if (state.clients.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📋</span>
        <p>No hay clientes en esta ruta</p>
        <p class="text-muted">Pulsa + para añadir el primero</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.clients.map((client, index) =>
    renderClientCard(client, index, state.clients.length)
  ).join('');
}

function renderClientCard(client, index, total) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const tipo = (client.tipoDescarga || 'única').toLowerCase().trim();

  // Botones de Maps según tipo de descarga
  let mapsHtml = '';
  let btnLlamar = '';
  if (client.telefono1 || client.telefono2) {
    btnLlamar += client.telefono1 ? `<a href="tel:${esc(client.telefono1)}" class="btn-maps" style="background:var(--primary-dark); flex: 0.8 !important;" title="Llamar Tel 1">📞 1</a>` : '';
    btnLlamar += client.telefono2 ? `<a href="tel:${esc(client.telefono2)}" class="btn-maps" style="background:var(--primary-dark); flex: 0.8 !important;" title="Llamar Tel 2">📞 2</a>` : '';
  }

  if (tipo === 'ambas') {
    mapsHtml = `
      <div class="maps-buttons">
        ${client.mapsUrl1 ? `<a href="${esc(client.mapsUrl1)}" target="_blank" rel="noopener" class="btn-maps">📍 Parada 1</a>` : ''}
        ${client.mapsUrl2 ? `<a href="${esc(client.mapsUrl2)}" target="_blank" rel="noopener" class="btn-maps">📍 Parada 2</a>` : ''}
        ${btnLlamar}
      </div>
    `;
  } else if (tipo === 'elegir') {
    mapsHtml = `
      <div class="choose-label">⚡ Elige destino hoy</div>
      <div class="maps-buttons">
        ${client.mapsUrl1 ? `<a href="${esc(client.mapsUrl1)}" target="_blank" rel="noopener" class="btn-maps btn-maps-choose">📍 Dir. 1</a>` : ''}
        ${client.mapsUrl2 ? `<a href="${esc(client.mapsUrl2)}" target="_blank" rel="noopener" class="btn-maps btn-maps-choose">📍 Dir. 2</a>` : ''}
        ${btnLlamar}
      </div>
    `;
  } else {
    // única (default)
    const url = client.mapsUrl1 || client.mapsUrl2;
    if (url || btnLlamar) {
      mapsHtml = `
        <div class="maps-buttons">
          ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener" class="btn-maps">📍 Maps</a>` : ''}
          ${btnLlamar}
        </div>
      `;
    }
  }

  const notasHtml = client.notas
    ? `<div class="client-notas">📝 ${esc(client.notas)}</div>`
    : '';

  return `
    <div class="client-card" data-index="${index}" style="animation-delay: ${index * 0.04}s">
      <div class="card-header">
        <div class="reorder-buttons">
          <button class="btn-reorder ${isFirst ? 'disabled' : ''}"
                  onclick="handleMoveClient(${index}, 'up')"
                  ${isFirst ? 'disabled' : ''}
                  aria-label="Subir">▲</button>
          <button class="btn-reorder ${isLast ? 'disabled' : ''}"
                  onclick="handleMoveClient(${index}, 'down')"
                  ${isLast ? 'disabled' : ''}
                  aria-label="Bajar">▼</button>
        </div>
        <div class="client-info">
          <span class="client-order">${client.orden}</span>
          <span class="client-name">${esc(client.cliente)}</span>
        </div>
        <button class="btn-edit" onclick="showEditModal(${index})" aria-label="Editar">✏️</button>
      </div>
      ${notasHtml}
      ${mapsHtml}
    </div>
  `;
}

// ==================== REORDENAR ==============================
async function handleMoveClient(index, direction) {
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= state.clients.length) return;

  const client1 = state.clients[index];
  const client2 = state.clients[targetIndex];

  try {
    await apiPost('swapOrder', {
      sheetName: state.currentSheetName,
      row1: client1.rowIndex,
      row2: client2.rowIndex
    });

    // Intercambiar valores de orden localmente
    const tempOrder = client1.orden;
    client1.orden = client2.orden;
    client2.orden = tempOrder;

    // Intercambiar posiciones en el array
    state.clients[index] = client2;
    state.clients[targetIndex] = client1;

    renderClientList();
    showToast('✅ Orden actualizado');

    // Invalidar cache de búsqueda
    state.allClients = null;
  } catch (err) {
    // Error ya mostrado
  }
}

// ==================== MODAL: EDITAR =========================
function showEditModal(index) {
  const client = state.clients[index];
  const modal = $('edit-modal');
  const form = $('edit-form');

  $('modal-title').textContent = 'Editar cliente';

  form.innerHTML = `
    <input type="hidden" id="edit-index" value="${index}">
    <input type="hidden" id="edit-row" value="${client.rowIndex}">

    <div class="form-group">
      <label for="edit-orden">Orden</label>
      <input type="number" id="edit-orden" value="${client.orden}" min="1" inputmode="numeric">
    </div>

    <div class="form-group">
      <label for="edit-cliente">Cliente</label>
      <input type="text" id="edit-cliente" value="${esc(client.cliente)}">
    </div>

    <div class="form-group">
      <label for="edit-telefono1">Teléfono 1</label>
      <input type="tel" id="edit-telefono1" value="${esc(client.telefono1 || '')}">
    </div>

    <div class="form-group">
      <label for="edit-telefono2">Teléfono 2</label>
      <input type="tel" id="edit-telefono2" value="${esc(client.telefono2 || '')}">
    </div>

    <div class="form-group">
      <label for="edit-direccion1">Dirección 1</label>
      <input type="text" id="edit-direccion1" value="${esc(client.direccion1 || '')}">
    </div>

    <div class="form-group">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <label for="edit-mapsUrl1" style="margin-bottom: 0;">Maps URL 1</label>
        <button type="button" class="btn-gps" onclick="getCurrentGPS('edit-mapsUrl1', this)" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 4px 8px; font-size: 11px; font-weight: 600; cursor: pointer; color: var(--primary);">📍 Mi GPS</button>
      </div>
      <input type="url" id="edit-mapsUrl1" value="${esc(client.mapsUrl1 || '')}" placeholder="https://maps.google.com/..." inputmode="url">
    </div>

    <div class="form-group">
      <label for="edit-direccion2">Dirección 2</label>
      <input type="text" id="edit-direccion2" value="${esc(client.direccion2 || '')}">
    </div>

    <div class="form-group">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <label for="edit-mapsUrl2" style="margin-bottom: 0;">Maps URL 2</label>
        <button type="button" class="btn-gps" onclick="getCurrentGPS('edit-mapsUrl2', this)" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 4px 8px; font-size: 11px; font-weight: 600; cursor: pointer; color: var(--primary);">📍 Mi GPS</button>
      </div>
      <input type="url" id="edit-mapsUrl2" value="${esc(client.mapsUrl2 || '')}" placeholder="https://maps.google.com/..." inputmode="url">
    </div>

    <div class="form-group">
      <label for="edit-tipo">Tipo descarga</label>
      <select id="edit-tipo">
        <option value="única" ${(client.tipoDescarga || '').toLowerCase() === 'única' ? 'selected' : ''}>Única</option>
        <option value="ambas" ${(client.tipoDescarga || '').toLowerCase() === 'ambas' ? 'selected' : ''}>Ambas</option>
        <option value="elegir" ${(client.tipoDescarga || '').toLowerCase() === 'elegir' ? 'selected' : ''}>Elegir</option>
      </select>
    </div>

    <div class="form-group">
      <label for="edit-notas">Notas</label>
      <textarea id="edit-notas" rows="3">${esc(client.notas || '')}</textarea>
    </div>

    <div class="modal-actions">
      <button type="button" class="btn-danger" onclick="handleDeleteClient(${index})">🗑️</button>
      <button type="button" class="btn-secondary" onclick="closeEditModal()">Cancelar</button>
      <button type="submit" class="btn-primary">💾 Guardar</button>
    </div>
  `;

  form.onsubmit = (e) => {
    e.preventDefault();
    handleSaveClient(index);
  };

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// ==================== MODAL: AÑADIR =========================
function showAddClientModal() {
  const modal = $('edit-modal');
  const form = $('edit-form');

  const maxOrder = state.clients.reduce((max, c) => Math.max(max, Number(c.orden) || 0), 0);

  $('modal-title').textContent = 'Nuevo cliente';

  form.innerHTML = `
    <input type="hidden" id="edit-index" value="-1">

    <div class="form-group">
      <label for="edit-orden">Orden</label>
      <input type="number" id="edit-orden" value="${maxOrder + 1}" min="1" inputmode="numeric">
    </div>

    <div class="form-group">
      <label for="edit-cliente">Cliente *</label>
      <input type="text" id="edit-cliente" value="" required>
    </div>

    <div class="form-group">
      <label for="edit-telefono1">Teléfono 1</label>
      <input type="tel" id="edit-telefono1" value="">
    </div>

    <div class="form-group">
      <label for="edit-telefono2">Teléfono 2</label>
      <input type="tel" id="edit-telefono2" value="">
    </div>

    <div class="form-group">
      <label for="edit-direccion1">Dirección 1</label>
      <input type="text" id="edit-direccion1" value="">
    </div>

    <div class="form-group">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <label for="edit-mapsUrl1" style="margin-bottom: 0;">Maps URL 1</label>
        <button type="button" class="btn-gps" onclick="getCurrentGPS('edit-mapsUrl1', this)" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 4px 8px; font-size: 11px; font-weight: 600; cursor: pointer; color: var(--primary);">📍 Mi GPS</button>
      </div>
      <input type="url" id="edit-mapsUrl1" value="" placeholder="https://maps.google.com/..." inputmode="url">
    </div>

    <div class="form-group">
      <label for="edit-direccion2">Dirección 2</label>
      <input type="text" id="edit-direccion2" value="">
    </div>

    <div class="form-group">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <label for="edit-mapsUrl2" style="margin-bottom: 0;">Maps URL 2</label>
        <button type="button" class="btn-gps" onclick="getCurrentGPS('edit-mapsUrl2', this)" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 4px 8px; font-size: 11px; font-weight: 600; cursor: pointer; color: var(--primary);">📍 Mi GPS</button>
      </div>
      <input type="url" id="edit-mapsUrl2" value="" placeholder="https://maps.google.com/..." inputmode="url">
    </div>

    <div class="form-group">
      <label for="edit-tipo">Tipo descarga</label>
      <select id="edit-tipo">
        <option value="única" selected>Única</option>
        <option value="ambas">Ambas</option>
        <option value="elegir">Elegir</option>
      </select>
    </div>

    <div class="form-group">
      <label for="edit-notas">Notas</label>
      <textarea id="edit-notas" rows="3"></textarea>
    </div>

    <div class="modal-actions">
      <button type="button" class="btn-secondary" onclick="closeEditModal()">Cancelar</button>
      <button type="submit" class="btn-primary">➕ Añadir</button>
    </div>
  `;

  form.onsubmit = (e) => {
    e.preventDefault();
    handleAddClient();
  };

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// ==================== MODAL: CERRAR =========================
function closeEditModal() {
  $('edit-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// ==================== GUARDAR EDICIÓN =======================
async function handleSaveClient(index) {
  const data = getFormData();
  if (!data.cliente.trim()) {
    showToast('⚠️ El nombre es obligatorio', 'error');
    return;
  }

  const row = parseInt($('edit-row').value);

  try {
    await apiPost('updateClient', {
      sheetName: state.currentSheetName,
      row: row,
      data: data
    });

    // Actualizar estado local
    Object.assign(state.clients[index], data);
    // Re-ordenar por campo Orden
    state.clients.sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));

    renderClientList();
    closeEditModal();
    showToast('✅ Cliente actualizado');
    state.allClients = null;
  } catch (err) {
    // Error ya mostrado
  }
}

// ==================== AÑADIR CLIENTE ========================
async function handleAddClient() {
  const data = getFormData();
  if (!data.cliente.trim()) {
    showToast('⚠️ El nombre es obligatorio', 'error');
    return;
  }

  try {
    const result = await apiPost('addClient', {
      sheetName: state.currentSheetName,
      data: data
    });

    // Añadir a estado local
    state.clients.push({
      rowIndex: result.rowIndex,
      ...data
    });
    state.clients.sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));

    renderClientList();
    closeEditModal();
    showToast('✅ Cliente añadido');
    state.allClients = null;
  } catch (err) {
    // Error ya mostrado
  }
}

// ==================== ELIMINAR CLIENTE ======================
async function handleDeleteClient(index) {
  const client = state.clients[index];
  if (!confirm(`¿Eliminar "${client.cliente}" de esta ruta?`)) return;

  try {
    await apiPost('deleteClient', {
      sheetName: state.currentSheetName,
      row: client.rowIndex
    });

    const deletedRow = client.rowIndex;
    state.clients.splice(index, 1);

    // Actualizar rowIndex de los que están por debajo
    state.clients.forEach(c => {
      if (c.rowIndex > deletedRow) {
        c.rowIndex--;
      }
    });

    renderClientList();
    closeEditModal();
    showToast('🗑️ Cliente eliminado');
    state.allClients = null;
  } catch (err) {
    // Error ya mostrado
  }
}

// ==================== FORMULARIO HELPER =====================
function getFormData() {
  return {
    orden: parseInt($('edit-orden').value) || 1,
    cliente: $('edit-cliente').value.trim(),
    direccion1: $('edit-direccion1').value.trim(),
    mapsUrl1: $('edit-mapsUrl1').value.trim(),
    direccion2: $('edit-direccion2').value.trim(),
    mapsUrl2: $('edit-mapsUrl2').value.trim(),
    tipoDescarga: $('edit-tipo').value,
    notas: $('edit-notas').value.trim(),
    telefono1: $('edit-telefono1').value.trim(),
    telefono2: $('edit-telefono2').value.trim()
  };
}

// ==================== GEOLOCALIZACIÓN ========================
function getCurrentGPS(inputId, btn) {
  if (!navigator.geolocation) {
    showToast('⚠️ Tu dispositivo no soporta GPS en la web', 'error');
    return;
  }

  const originalText = btn.textContent;
  btn.textContent = '⏳...';
  btn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      // Generar link de Google Maps
      const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
      $(inputId).value = mapsLink;
      showToast('📍 Ubicación obtenida');
      btn.textContent = originalText;
      btn.disabled = false;
    },
    (err) => {
      showToast('❌ Error al obtener GPS (revisa permisos)', 'error');
      btn.textContent = originalText;
      btn.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

// ==================== BÚSQUEDA ===============================
async function loadAllClients() {
  if (state.allClients) return;

  try {
    const result = await apiGet('getAllClients');
    state.allClients = result.data;
  } catch (err) {
    // Error ya mostrado
  }
}

function handleSearch(query) {
  const q = query.toLowerCase().trim();

  if (!q) {
    $('search-results').innerHTML = '';
    return;
  }

  if (!state.allClients) {
    $('search-results').innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⏳</span>
        <p>Cargando datos…</p>
      </div>
    `;
    // Reintentar cuando se carguen
    loadAllClients().then(() => handleSearch(query));
    return;
  }

  const results = state.allClients.filter(client => {
    const haystack = [
      client.cliente,
      client.direccion1,
      client.direccion2,
      client.notas
    ].filter(Boolean).join(' ').toLowerCase();

    return haystack.includes(q);
  });

  renderSearchResults(results, q);
}

function renderSearchResults(results, query) {
  const container = $('search-results');

  if (results.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <p>Sin resultados para "${esc(query)}"</p>
      </div>
    `;
    return;
  }

  container.innerHTML = results.map((client, i) => {
    const tipo = (client.tipoDescarga || 'única').toLowerCase().trim();
    let mapsHtml = '';
    
    let btnLlamar = '';
    if (client.telefono1 || client.telefono2) {
      btnLlamar += client.telefono1 ? `<a href="tel:${esc(client.telefono1)}" class="btn-maps btn-maps-sm" style="background:var(--primary-dark); flex: 0.8 !important;" title="Llamar Tel 1">📞 1</a>` : '';
      btnLlamar += client.telefono2 ? `<a href="tel:${esc(client.telefono2)}" class="btn-maps btn-maps-sm" style="background:var(--primary-dark); flex: 0.8 !important;" title="Llamar Tel 2">📞 2</a>` : '';
    }

    if (tipo === 'ambas') {
      mapsHtml = `
        <div class="maps-buttons">
          ${client.mapsUrl1 ? `<a href="${esc(client.mapsUrl1)}" target="_blank" rel="noopener" class="btn-maps btn-maps-sm">📍 P.1</a>` : ''}
          ${client.mapsUrl2 ? `<a href="${esc(client.mapsUrl2)}" target="_blank" rel="noopener" class="btn-maps btn-maps-sm">📍 P.2</a>` : ''}
          ${btnLlamar}
        </div>
      `;
    } else if (tipo === 'elegir') {
      mapsHtml = `
        <div class="maps-buttons">
          ${client.mapsUrl1 ? `<a href="${esc(client.mapsUrl1)}" target="_blank" rel="noopener" class="btn-maps btn-maps-sm btn-maps-choose">📍 Dir.1</a>` : ''}
          ${client.mapsUrl2 ? `<a href="${esc(client.mapsUrl2)}" target="_blank" rel="noopener" class="btn-maps btn-maps-sm btn-maps-choose">📍 Dir.2</a>` : ''}
          ${btnLlamar}
        </div>
      `;
    } else {
      const url = client.mapsUrl1 || client.mapsUrl2;
      if (url || btnLlamar) {
        mapsHtml = `
          <div class="maps-buttons">
            ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener" class="btn-maps btn-maps-sm">📍 Maps</a>` : ''}
            ${btnLlamar}
          </div>
        `;
      }
    }

    return `
      <div class="client-card search-result-card" style="animation-delay: ${i * 0.03}s">
        <div class="card-header">
          <div class="client-info">
            <span class="client-name">${highlightMatch(client.cliente, query)}</span>
          </div>
        </div>
        <div class="search-meta">Ruta ${client.ruta} · ${client.dia}</div>
        ${mapsHtml}
      </div>
    `;
  }).join('');
}

// ==================== HIGHLIGHT MATCH ========================
function highlightMatch(text, query) {
  if (!text || !query) return esc(text);
  const escaped = esc(text);
  const idx = escaped.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return escaped;

  const before = escaped.substring(0, idx);
  const match = escaped.substring(idx, idx + query.length);
  const after = escaped.substring(idx + query.length);

  return `${before}<mark style="background:#e8f0dc;color:#2d4a1f;padding:0 2px;border-radius:3px">${match}</mark>${after}`;
}

// ==================== UI HELPERS =============================
function showLoading(show) {
  state.isLoading = show;
  $('loading').classList.toggle('hidden', !show);
}

let toastTimer;
function showToast(message, type = 'success') {
  clearTimeout(toastTimer);
  const toast = $('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  // Forzar reflow para re-iniciar animación
  toast.offsetHeight;
  toast.classList.remove('hidden');
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ==================== ESCAPE HTML ============================
function esc(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
