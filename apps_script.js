// ============================================================
// RUTAS EUROPAN — Google Apps Script Backend
// ============================================================
// Pegar este código en: Google Sheet → Extensiones → Apps Script
// Desplegar como: Aplicación web → Cualquier persona
// ============================================================

const HEADERS = ['Orden', 'Cliente', 'Dirección_1', 'Maps_URL_1', 'Dirección_2', 'Maps_URL_2', 'Tipo_descarga', 'Notas', 'Teléfono'];

// ==================== HTTP HANDLERS ==========================

function doGet(e) {
  try {
    const action = e.parameter.action;
    let result;

    switch (action) {
      case 'getRoute':
        result = getRoute(e.parameter.ruta, e.parameter.dia);
        break;
      case 'getAllClients':
        result = getAllClients();
        break;
      default:
        result = { success: false, error: 'Acción GET desconocida: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    let result;

    switch (action) {
      case 'updateClient':
        result = updateClientData(body.sheetName, body.row, body.data);
        break;
      case 'addClient':
        result = addClientData(body.sheetName, body.data);
        break;
      case 'deleteClient':
        result = deleteClientData(body.sheetName, body.row);
        break;
      case 'swapOrder':
        result = swapOrderData(body.sheetName, body.row1, body.row2);
        break;
      default:
        result = { success: false, error: 'Acción POST desconocida: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==================== READ OPERATIONS ========================

/**
 * Obtiene todos los clientes de una pestaña específica (ruta+día).
 * @param {string} ruta - Número de ruta (2, 3, 4, 5)
 * @param {string} dia - Día de la semana (Lunes, Martes, etc.)
 * @returns {Object} { success, data, sheetName }
 */
function getRoute(ruta, dia) {
  const sheetName = 'Ruta' + ruta + '_' + dia;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return { success: false, error: 'Pestaña no encontrada: ' + sheetName };
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { success: true, data: [], sheetName: sheetName };
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
  const clients = data
    .map((row, index) => ({
      rowIndex: index + 2,
      orden: row[0],
      cliente: row[1],
      direccion1: row[2],
      mapsUrl1: row[3],
      direccion2: row[4],
      mapsUrl2: row[5],
      tipoDescarga: row[6],
      notas: row[7],
      telefono: row[8] || ''
    }))
    .filter(c => c.cliente !== '');

  // Ordenar por columna Orden
  clients.sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));

  return { success: true, data: clients, sheetName: sheetName };
}

/**
 * Obtiene todos los clientes de todas las pestañas (para búsqueda global).
 * @returns {Object} { success, data }
 */
function getAllClients() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rutas = ['2', '3', '4', '5'];
  const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const allClients = [];

  for (const ruta of rutas) {
    for (const dia of dias) {
      const sheetName = 'Ruta' + ruta + '_' + dia;
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) continue;

      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) continue;

      const data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
      data.forEach((row, index) => {
        if (row[1] !== '') {
          allClients.push({
            rowIndex: index + 2,
            sheetName: sheetName,
            ruta: ruta,
            dia: dia,
            orden: row[0],
            cliente: row[1],
            direccion1: row[2],
            mapsUrl1: row[3],
            direccion2: row[4],
            mapsUrl2: row[5],
            tipoDescarga: row[6],
            notas: row[7],
            telefono: row[8] || ''
          });
        }
      });
    }
  }

  return { success: true, data: allClients };
}

// ==================== WRITE OPERATIONS =======================

/**
 * Actualiza los campos de un cliente en una fila específica.
 * @param {string} sheetName - Nombre de la pestaña
 * @param {number} row - Número de fila (1-based)
 * @param {Object} data - Campos a actualizar
 * @returns {Object} { success }
 */
function updateClientData(sheetName, row, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return { success: false, error: 'Pestaña no encontrada: ' + sheetName };
  }

  const fieldMap = {
    orden: 1,
    cliente: 2,
    direccion1: 3,
    mapsUrl1: 4,
    direccion2: 5,
    mapsUrl2: 6,
    tipoDescarga: 7,
    notas: 8,
    telefono: 9
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (data.hasOwnProperty(key)) {
      sheet.getRange(row, col).setValue(data[key]);
    }
  }

  return { success: true };
}

/**
 * Añade un nuevo cliente al final de una pestaña.
 * @param {string} sheetName - Nombre de la pestaña
 * @param {Object} data - Datos del nuevo cliente
 * @returns {Object} { success, rowIndex }
 */
function addClientData(sheetName, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return { success: false, error: 'Pestaña no encontrada: ' + sheetName };
  }

  const lastRow = sheet.getLastRow();
  const newRow = lastRow + 1;

  // Si no se especifica orden, usar el último + 1
  const orden = data.orden || (lastRow > 1 ? Number(sheet.getRange(lastRow, 1).getValue()) + 1 : 1);

  sheet.getRange(newRow, 1, 1, 9).setValues([[
    orden,
    data.cliente || '',
    data.direccion1 || '',
    data.mapsUrl1 || '',
    data.direccion2 || '',
    data.mapsUrl2 || '',
    data.tipoDescarga || 'única',
    data.notas || '',
    data.telefono || ''
  ]]);

  return { success: true, rowIndex: newRow };
}

/**
 * Elimina un cliente (fila) de una pestaña.
 * @param {string} sheetName - Nombre de la pestaña
 * @param {number} row - Número de fila a eliminar
 * @returns {Object} { success }
 */
function deleteClientData(sheetName, row) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return { success: false, error: 'Pestaña no encontrada: ' + sheetName };
  }

  sheet.deleteRow(row);

  return { success: true };
}

/**
 * Intercambia el valor de Orden entre dos filas.
 * @param {string} sheetName - Nombre de la pestaña
 * @param {number} row1 - Fila del primer cliente
 * @param {number} row2 - Fila del segundo cliente
 * @returns {Object} { success }
 */
function swapOrderData(sheetName, row1, row2) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return { success: false, error: 'Pestaña no encontrada: ' + sheetName };
  }

  const order1 = sheet.getRange(row1, 1).getValue();
  const order2 = sheet.getRange(row2, 1).getValue();

  sheet.getRange(row1, 1).setValue(order2);
  sheet.getRange(row2, 1).setValue(order1);

  return { success: true };
}

// ==================== SETUP UTILITY ==========================

/**
 * Ejecutar UNA SOLA VEZ para crear las 20 pestañas con cabeceras.
 * Menú: seleccionar esta función y pulsar ▶️ Ejecutar.
 */
function setupHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rutas = ['2', '3', '4', '5'];
  const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

  for (const ruta of rutas) {
    for (const dia of dias) {
      const sheetName = 'Ruta' + ruta + '_' + dia;
      let sheet = ss.getSheetByName(sheetName);

      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }

      // Cabeceras en fila 1
      sheet.getRange(1, 1, 1, 9).setValues([HEADERS]);
      sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
      sheet.getRange(1, 1, 1, 9).setBackground('#3a5a2c');
      sheet.getRange(1, 1, 1, 9).setFontColor('#ffffff');

      // Ajustar anchos de columna
      sheet.setColumnWidth(1, 60);   // Orden
      sheet.setColumnWidth(2, 180);  // Cliente
      sheet.setColumnWidth(3, 200);  // Dirección_1
      sheet.setColumnWidth(4, 250);  // Maps_URL_1
      sheet.setColumnWidth(5, 200);  // Dirección_2
      sheet.setColumnWidth(6, 250);  // Maps_URL_2
      sheet.setColumnWidth(7, 120);  // Tipo_descarga
      sheet.setColumnWidth(8, 200);  // Notas
      sheet.setColumnWidth(9, 120);  // Teléfono

      // Validación para Tipo_descarga (columna G)
      const tipoRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['única', 'ambas', 'elegir'])
        .setAllowInvalid(false)
        .build();
      sheet.getRange('G2:G500').setDataValidation(tipoRule);

      // Congelar fila de cabeceras
      sheet.setFrozenRows(1);
    }
  }

  // Intentar eliminar la hoja por defecto
  const defaultNames = ['Sheet1', 'Hoja 1', 'Hoja1'];
  for (const name of defaultNames) {
    const defaultSheet = ss.getSheetByName(name);
    if (defaultSheet && ss.getSheets().length > 1) {
      try {
        ss.deleteSheet(defaultSheet);
      } catch (e) {
        // Ignorar si no se puede eliminar
      }
    }
  }

  SpreadsheetApp.getUi().alert('✅ ¡Setup completado! Se crearon 20 pestañas con cabeceras.');
}
