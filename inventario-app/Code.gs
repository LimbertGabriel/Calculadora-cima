// ====== CONFIGURA AQUÍ ======
const PIN = '1234';   // clave para entrar a la página ('' = sin clave)
// ============================

const HOJA = 'Inventario';
const HOJA_CONTACTOS = 'Contactos';
const FILA_INICIO = 6;   // primera fila de productos (fila de Código/Descripción)

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Inventario')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ---------- Inventario ----------

function getInventario(pin) {
  verificar_(pin);
  const h = hoja_();
  const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  const diasAviso = Number(h.getRange('E1').getValue()) || 30;
  const hoy = Date.parse(Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd'));
  const filas = bloques_(h) * 2;
  const datos = filas ? h.getRange(FILA_INICIO, 1, filas, 2).getValues() : [];

  const items = [];
  for (let i = 0; i + 1 < datos.length; i += 2) {
    const [codigo, desc] = datos[i];
    const [cant, venc] = datos[i + 1];
    if (codigo === '' && desc === '') continue;

    let fecha = '', dias = null, estado = '';
    if (venc instanceof Date) {
      fecha = Utilities.formatDate(venc, tz, 'yyyy-MM-dd');
      dias = Math.round((Date.parse(fecha) - hoy) / 86400000);
      estado = dias < 0 ? 'Vencido' : dias <= diasAviso ? 'Por vencer' : 'Vigente';
    }
    items.push({
      fila: FILA_INICIO + i,
      codigo: String(codigo),
      desc: String(desc),
      cant: cant === '' ? '' : Number(cant),
      fecha, dias, estado
    });
  }
  return { items, diasAviso, contactos: getContactos_() };
}

function guardarProducto(pin, p) {
  verificar_(pin);
  if (!String(p.codigo).trim() || !String(p.desc).trim()) throw new Error('Falta código o descripción');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const h = hoja_();
    const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
    const fila = p.fila ? filaValida_(Number(p.fila)) : buscarBloqueLibre_(h);

    h.getRange(fila, 1, 1, 2).setValues([[String(p.codigo).trim(), String(p.desc).trim()]]);
    h.getRange(fila + 1, 1, 1, 2).setValues([[
      p.cant === '' || p.cant == null ? '' : Number(p.cant),
      p.fecha ? Utilities.parseDate(p.fecha, tz, 'yyyy-MM-dd') : ''
    ]]);
  } finally {
    lock.releaseLock();
  }
  return getInventario(pin);
}

function borrarProducto(pin, fila) {
  verificar_(pin);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // Solo borra los datos; la fórmula de Estado y el formato se quedan para reusar el espacio
    hoja_().getRange(filaValida_(Number(fila)), 1, 2, 2).clearContent();
  } finally {
    lock.releaseLock();
  }
  return getInventario(pin);
}

// ---------- Contactos ----------

function agregarContacto(pin, nombre, tel) {
  verificar_(pin);
  const digitos = String(tel).replace(/\D/g, '');
  if (!nombre || digitos.length < 8) throw new Error('Escribe nombre y teléfono con código de país');
  hojaContactos_().appendRow([String(nombre).trim(), digitos]);
  return getInventario(pin);
}

function borrarContacto(pin, tel) {
  verificar_(pin);
  const h = hojaContactos_();
  const tels = h.getRange(1, 2, h.getLastRow(), 1).getDisplayValues();
  for (let i = tels.length - 1; i >= 1; i--) {
    if (tels[i][0].replace(/\D/g, '') === String(tel)) { h.deleteRow(i + 1); break; }
  }
  return getInventario(pin);
}

// ---------- Auxiliares ----------

function verificar_(pin) {
  if (PIN && String(pin) !== PIN) throw new Error('Clave incorrecta');
}

function hoja_() {
  const h = SpreadsheetApp.getActive().getSheetByName(HOJA);
  if (!h) throw new Error('No existe la hoja "' + HOJA + '"');
  return h;
}

function hojaContactos_() {
  const ss = SpreadsheetApp.getActive();
  let h = ss.getSheetByName(HOJA_CONTACTOS);
  if (!h) {
    h = ss.insertSheet(HOJA_CONTACTOS);
    h.appendRow(['Nombre', 'Teléfono (con código de país)']);
    h.getRange('B:B').setNumberFormat('@');
    h.getRange('1:1').setFontWeight('bold');
    h.setFrozenRows(1);
  }
  return h;
}

function getContactos_() {
  const h = hojaContactos_();
  const n = h.getLastRow() - 1;
  if (n < 1) return [];
  return h.getRange(2, 1, n, 2).getDisplayValues()
    .map(([nombre, tel]) => ({ nombre, tel: tel.replace(/\D/g, '') }))
    .filter(c => c.tel);
}

// Cantidad de bloques de 2 filas que tiene la hoja (la columna Estado tiene fórmula en todos)
function bloques_(h) {
  return Math.max(0, Math.ceil((h.getLastRow() - FILA_INICIO + 1) / 2));
}

function filaValida_(fila) {
  if (!(fila >= FILA_INICIO) || (fila - FILA_INICIO) % 2 !== 0) throw new Error('Fila inválida');
  return fila;
}

// Primer bloque vacío; si no hay, copia el último bloque (formato y fórmula) al final
function buscarBloqueLibre_(h) {
  const n = bloques_(h);
  const vals = n ? h.getRange(FILA_INICIO, 1, n * 2, 2).getValues() : [];
  for (let i = 0; i + 1 < vals.length; i += 2) {
    if ([vals[i][0], vals[i][1], vals[i + 1][0], vals[i + 1][1]].every(v => v === '')) return FILA_INICIO + i;
  }
  const nueva = FILA_INICIO + n * 2;
  if (h.getMaxRows() < nueva + 1) h.insertRowsAfter(h.getMaxRows(), 20);
  if (n) {
    h.getRange(nueva - 2, 1, 2, 3).copyTo(h.getRange(nueva, 1, 2, 3));
    h.getRange(nueva, 1, 2, 2).clearContent();
  }
  return nueva;
}
