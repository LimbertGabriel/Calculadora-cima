// Interfaz de Hidroponía CIMA: calculadora, sistemas, registro de cultivo y Club CIMA.
(function () {
  const C = window.EcoCalc;
  const CONFIG = window.CIMA_CONFIG || {};
  const PRODUCTOS = CONFIG.productos || [];
  const CLAVE = 'ecoalaya:v1';
  const $ = (sel) => document.querySelector(sel);
  const icono = (nombre) => `<svg aria-hidden="true"><use href="#i-${nombre}"/></svg>`;

  let estado = cargar();

  function vacio() {
    return { sistemas: [], mediciones: [], cosechas: [] };
  }

  // Completa lo que falte y quita datos de versiones anteriores (puntos y canjes).
  function normalizar(datos) {
    const d = { ...vacio(), ...datos };
    delete d.movimientos;
    for (const k of ['sistemas', 'mediciones', 'cosechas']) if (!Array.isArray(d[k])) d[k] = [];
    for (const sis of d.sistemas) sis.cultivo = C.cultivoActual(sis.cultivo);
    return d;
  }

  function cargar() {
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE));
      return guardado ? normalizar(guardado) : vacio();
    } catch {
      return vacio();
    }
  }

  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(estado));
    } catch {
      // Sin almacenamiento disponible: los datos viven solo en esta sesión.
    }
  }

  function id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  const hoy = () => C.fechaLocal();

  // "2026-10-15" → "15 oct." (con año si no es el actual).
  function fechaCorta(fecha) {
    const [a, m, d] = fecha.split('-').map(Number);
    const opciones = { day: 'numeric', month: 'short' };
    if (a !== new Date().getFullYear()) opciones.year = 'numeric';
    return new Date(a, m - 1, d).toLocaleDateString('es-BO', opciones);
  }

  function gramosTexto(g) {
    return g >= 1000 ? `${(g / 1000).toFixed(g >= 10000 ? 0 : 1).replace('.', ',')} kg` : `${g} g`;
  }

  function escapar(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  }

  function aviso(mensaje) {
    const el = $('#aviso');
    el.textContent = mensaje;
    el.hidden = false;
    clearTimeout(aviso.t);
    aviso.t = setTimeout(() => { el.hidden = true; }, 3500);
  }

  // Confirmación dentro de la página (los diálogos del navegador no funcionan en todas partes).
  function confirmar(mensaje, textoSi = 'Sí, continuar') {
    const dlg = $('#confirmar');
    dlg.querySelector('p').textContent = mensaje;
    dlg.querySelector('[value="si"]').textContent = textoSi;
    dlg.returnValue = '';
    dlg.showModal();
    return new Promise((resolver) => {
      dlg.addEventListener('close', () => resolver(dlg.returnValue === 'si'), { once: true });
    });
  }

  function opciones(select, mapa) {
    select.innerHTML = Object.entries(mapa)
      .map(([clave, v]) => `<option value="${clave}">${escapar(v.nombre)}</option>`)
      .join('');
  }

  function sistemaPorId(sid) {
    return estado.sistemas.find((s) => s.id === sid);
  }

  // Las fechas no pueden ser futuras.
  function fijarFechas(form) {
    form.querySelectorAll('input[type="date"]').forEach((input) => {
      input.max = hoy();
      if (!input.value) input.value = hoy();
    });
  }

  // ---------- Pestañas ----------
  function iniciarPestanas() {
    document.querySelectorAll('[role="tab"]').forEach((boton) => {
      boton.addEventListener('click', () => {
        document.querySelectorAll('[role="tab"]').forEach((b) => b.setAttribute('aria-selected', b === boton));
        document.querySelectorAll('[role="tabpanel"]').forEach((p) => { p.hidden = p.id !== boton.getAttribute('aria-controls'); });
        window.scrollTo(0, 0);
      });
    });
  }

  // ---------- Calculadora ----------
  function iniciarCalculadora() {
    const form = $('#form-calc');
    opciones(form.formula, C.FORMULAS);
    opciones(form.etapa, C.ETAPAS);
    opciones(form.cultivo, C.CULTIVOS);
    form.etapa.value = 'crecimiento';

    const alternarPersonalizada = () => {
      $('#calc-personalizada').hidden = form.formula.value !== 'personalizada';
    };
    form.formula.addEventListener('change', alternarPersonalizada);
    alternarPersonalizada();

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const salida = $('#calc-resultado');
      try {
        const litros = Number(form.litros.value);
        const d = C.calcularDosis({
          litros,
          formula: form.formula.value,
          etapa: form.etapa.value,
          personalizado: { A: form.mlA.value, B: form.mlB.value, C: form.mlC.value },
        });
        const c = C.CULTIVOS[form.cultivo.value];
        const juegos = PRODUCTOS.filter((p) => p.tipo === 'nutrientes' && p.rindeLitros && p.precio != null)
          .map((p) => `<li><span class="texto">${escapar(p.nombre)} (Bs ${p.precio})</span><b>${C.llenadosPorJuego(p.rindeLitros, litros)} tanques</b></li>`)
          .join('');
        salida.innerHTML = `
          <div class="dosis">
            ${C.PARTES.map((parte) => `<div class="parte-${parte.toLowerCase()}"><small>Solución ${parte}</small><span class="cifra">${d.ml[parte]}</span><span class="unidad">mL</span></div>`).join('')}
          </div>
          <p>Para ${litros} L de agua: ${C.PARTES.map((parte) => `${d.porLitro[parte]} mL/L de ${parte}`).join(', ')}.</p>
          <ol class="pasos">
            <li>Llena el tanque con el agua.</li>
            <li>Agrega la <b>A</b> y mezcla bien.</li>
            <li>Agrega la <b>B</b> y mezcla bien.</li>
            <li>Agrega la <b>C</b> y mezcla bien. Luego mide y ajusta el pH.</li>
          </ol>
          <p class="aviso-quimico">Nunca mezcles los concentrados entre sí: el calcio de la C se junta con el fosfato de la A y el sulfato de la B y forma un sólido que las plantas no pueden absorber.</p>
          <p class="aviso-quimico"><b>Ajuste de pH:</b> si está alto, agrega ácido nítrico diluido gota a gota; si está bajo, agrega agua (o unas gotas de hidróxido de potasio). El ácido nítrico es corrosivo: usa guantes y lentes, y vierte siempre el ácido sobre el agua, nunca al revés.</p>
          <p class="rango">Rango ideal para ${escapar(c.nombre)}: pH ${c.ph[0].toFixed(1)}–${c.ph[1].toFixed(1)} · EC ${c.ec[0].toFixed(1)}–${c.ec[1].toFixed(1)} mS/cm</p>
          ${juegos ? `<h3 class="titulo-seccion">¿Cuánto te rinde cada juego de nutrientes?</h3><ul class="lista">${juegos}</ul>` : ''}`;
      } catch (err) {
        salida.innerHTML = `<p class="error">${escapar(err.message)}</p>`;
      }
    });
  }

  // ---------- Catálogo y contacto ----------
  function enlaceWhatsApp(texto) {
    return `https://wa.me/${CONFIG.whatsapp || ''}?text=${encodeURIComponent(texto)}`;
  }

  const ICONO_PRODUCTO = { sistema: 'sistema', nutrientes: 'gota', medidor: 'ph', curso: 'libro' };

  function renderCatalogo() {
    const tarjeta = (p) => {
      const precio = p.precio == null ? null : `Bs ${p.precio}`;
      const mensaje = precio
        ? `Hola Hidroponía CIMA, quiero pedir: ${p.nombre} (${precio}). Estoy en ${CONFIG.ciudad || 'Bolivia'}.`
        : `Hola Hidroponía CIMA, quiero información y precio de: ${p.nombre}. Estoy en ${CONFIG.ciudad || 'Bolivia'}.`;
      return `<article class="producto producto-${p.tipo}">
        <span class="producto-icono">${icono(ICONO_PRODUCTO[p.tipo] || 'hoja')}</span>
        <div class="producto-texto">
          <h3>${escapar(p.nombre)}</h3>
          ${p.descripcion ? `<p>${escapar(p.descripcion)}</p>` : ''}
          ${p.rindeLitros && precio ? `<p>Rinde ${p.rindeLitros} L de solución (Bs ${(p.precio / p.rindeLitros).toFixed(2).replace('.', ',')} por litro).</p>` : ''}
        </div>
        <div class="producto-compra">
          ${precio ? `<b class="precio">${precio}</b>` : '<span class="precio-consulta">Consultar precio</span>'}
          <a class="boton" href="${enlaceWhatsApp(mensaje)}" target="_blank" rel="noopener">${icono('chat')}${precio ? 'Pedir' : 'Consultar'}</a>
        </div>
      </article>`;
    };
    const de = (...tipos) => PRODUCTOS.filter((p) => tipos.includes(p.tipo)).map(tarjeta).join('');
    $('#catalogo-sistemas').innerHTML = de('sistema');
    $('#catalogo-nutrientes').innerHTML = de('nutrientes');
    $('#catalogo-medidores').innerHTML = de('medidor', 'curso');
  }

  function renderContacto() {
    $('#contacto-cabecera').href = enlaceWhatsApp('Hola Hidroponía CIMA, tengo una consulta sobre mi cultivo.');
    const numero = CONFIG.whatsapp || '';
    const telefono = numero.startsWith('591') ? `+591 ${numero.slice(3)}` : numero;
    const filas = [
      numero && { icono: 'chat', titulo: 'WhatsApp', texto: telefono, href: enlaceWhatsApp('Hola Hidroponía CIMA, tengo una consulta.') },
      CONFIG.correo && { icono: 'correo', titulo: 'Correo', texto: CONFIG.correo, href: `mailto:${CONFIG.correo}` },
      CONFIG.web && { icono: 'web', titulo: 'Página web', texto: CONFIG.web.replace(/^https?:\/\/(www\.)?/, ''), href: CONFIG.web },
    ].filter(Boolean);
    $('#contacto').innerHTML = filas.map((f) => `
      <a class="contacto-fila" href="${f.href}" target="_blank" rel="noopener">
        <span class="contacto-icono">${icono(f.icono)}</span>
        <span><small>${f.titulo}</small><b>${escapar(f.texto)}</b></span>
      </a>`).join('') + (CONFIG.ciudad ? `<p class="contacto-nota">Entregas en ${escapar(CONFIG.ciudad)}.</p>` : '');
  }

  // ---------- Club CIMA ----------
  function renderClub() {
    const club = CONFIG.club;
    if (!club) return;
    $('#club-planes').innerHTML = club.planes.map((p) => {
      const precio = p.precio == null ? null : `Bs ${p.precio}`;
      const mensaje = `Hola Hidroponía CIMA, quiero unirme al ${p.nombre}${precio ? ` (${precio})` : ''}. Estoy en ${CONFIG.ciudad || 'Bolivia'}. ¿Cómo me inscribo?`;
      return `<article class="plan ${p.destacado ? 'plan-destacado' : ''}">
        ${p.destacado ? '<span class="plan-etiqueta">Recomendado</span>' : ''}
        <h3>${escapar(p.nombre)}</h3>
        <p class="plan-precio">${precio ? `<b>${precio}</b> al mes` : '<span>Consultar precio</span>'}</p>
        <ul>${p.beneficios.map((b) => `<li>${icono('check')}${escapar(b)}</li>`).join('')}</ul>
        <a class="boton ${p.destacado ? '' : 'secundario'}" href="${enlaceWhatsApp(mensaje)}" target="_blank" rel="noopener">${icono('chat')}Quiero ser socio</a>
      </article>`;
    }).join('');
    $('#club-pago').textContent = club.pago || '';
  }

  // ---------- Sistemas ----------
  function iniciarSistemas() {
    const form = $('#form-sistema');
    opciones(form.cultivo, C.CULTIVOS);
    fijarFechas(form);
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      estado.sistemas.push({
        id: id(),
        nombre: form.nombre.value.trim(),
        tipo: form.tipo.value,
        cultivo: form.cultivo.value,
        litros: Number(form.litros.value),
        inicio: form.inicio.value,
      });
      guardar();
      form.reset();
      fijarFechas(form);
      aviso('Sistema registrado. Ya puedes anotar sus mediciones en Registro.');
      render();
    });

    $('#lista-sistemas').addEventListener('click', async (ev) => {
      const boton = ev.target.closest('[data-borrar-sistema]');
      if (!boton) return;
      const s = sistemaPorId(boton.dataset.borrarSistema);
      if (!s) return;
      if (!(await confirmar(`¿Borrar "${s.nombre}"? También se borrarán sus mediciones y cosechas.`, 'Borrar'))) return;
      estado.sistemas = estado.sistemas.filter((x) => x.id !== s.id);
      estado.mediciones = estado.mediciones.filter((m) => m.sistema !== s.id);
      estado.cosechas = estado.cosechas.filter((c) => c.sistema !== s.id);
      guardar();
      aviso('Sistema borrado.');
      render();
    });
  }

  function ultimaMedicion(sid) {
    return estado.mediciones
      .filter((m) => m.sistema === sid)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .at(-1);
  }

  function renderSistemas() {
    const lista = $('#lista-sistemas');
    if (!estado.sistemas.length) {
      lista.innerHTML = '<p class="vacio tarjeta" style="padding:16px;margin:0">Aún no registras ningún sistema. Registra el tuyo abajo para seguir su avance hasta la cosecha.</p>';
      return;
    }
    lista.innerHTML = estado.sistemas.map((s) => {
      const c = C.CULTIVOS[s.cultivo];
      const dias = Math.max(0, C.diasEntre(s.inicio, hoy()));
      const avance = Math.min(100, Math.round((dias / c.dias) * 100));
      const listo = dias >= c.dias;
      const ultima = ultimaMedicion(s.id);
      const evaluacion = ultima && C.evaluarMedicion(s.cultivo, ultima);
      const cosechado = estado.cosechas.filter((x) => x.sistema === s.id).reduce((t, x) => t + x.gramos, 0);
      const medicion = ultima
        ? `<span class="chip ${evaluacion.enRango ? 'chip-ok' : 'chip-alerta'}">${icono(evaluacion.enRango ? 'check' : 'alerta')}pH ${ultima.ph} · EC ${ultima.ec}</span><small>${fechaCorta(ultima.fecha)}</small>`
        : '<span class="chip">Sin mediciones todavía</span>';
      return `<article class="tarjeta sistema">
        <div class="sistema-cab">
          <h3>${escapar(s.nombre)}</h3>
          <button type="button" class="borrar" data-borrar-sistema="${s.id}" aria-label="Borrar el sistema ${escapar(s.nombre)}">${icono('basura')}</button>
        </div>
        <p>${escapar(s.tipo)} · ${escapar(c.nombre)} · ${s.litros} L</p>
        <div class="progreso" role="progressbar" aria-label="Avance hasta la cosecha" aria-valuenow="${avance}" aria-valuemin="0" aria-valuemax="100"><span style="width:${avance}%"></span></div>
        <div class="sistema-fechas">
          <span>Día ${dias} de ~${c.dias}</span>
          <span class="${listo ? 'listo-cosecha' : ''}">${icono('calendario')}${listo ? '¡Listo para cosechar!' : `Cosecha aprox. ${fechaCorta(C.sumarDias(s.inicio, c.dias))}`}</span>
        </div>
        <div class="sistema-medicion">${medicion}</div>
        ${cosechado ? `<p>Cosechado: <b>${gramosTexto(cosechado)}</b></p>` : ''}
      </article>`;
    }).join('');
  }

  // ---------- Registro (mediciones y cosechas) ----------
  function iniciarRegistro() {
    const fm = $('#form-medicion');
    fijarFechas(fm);
    fm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const s = sistemaPorId(fm.sistema.value);
      if (!s) return aviso('Primero registra un sistema en la pestaña Sistemas.');
      const medicion = { id: id(), sistema: s.id, fecha: fm.fecha.value, ph: Number(fm.ph.value), ec: Number(fm.ec.value), temp: fm.temp.value ? Number(fm.temp.value) : null };
      const evaluacion = C.evaluarMedicion(s.cultivo, medicion);
      estado.mediciones.push(medicion);
      guardar();
      const consejoTemp = medicion.temp != null && (medicion.temp > 26 || medicion.temp < 16)
        ? `<li>Agua ${medicion.temp > 26 ? 'caliente' : 'fría'} (${medicion.temp} °C): lo ideal es 16–26 °C. ${medicion.temp > 26 ? 'Da sombra al tanque o agrega agua fresca.' : 'Protege el tanque del frío por la noche.'}</li>`
        : '';
      $('#medicion-resultado').innerHTML = evaluacion.enRango && !consejoTemp
        ? '<p class="ok">¡Todo en rango! Tu solución está perfecta.</p>'
        : `<ul class="consejos">${evaluacion.consejos.map((t) => `<li>${escapar(t)}</li>`).join('')}${consejoTemp}</ul>`;
      fm.ph.value = fm.ec.value = fm.temp.value = '';
      aviso('Medición guardada.');
      render();
    });

    const fc = $('#form-cosecha');
    fijarFechas(fc);
    fc.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const s = sistemaPorId(fc.sistema.value);
      if (!s) return aviso('Primero registra un sistema en la pestaña Sistemas.');
      estado.cosechas.push({ id: id(), sistema: s.id, fecha: fc.fecha.value, gramos: Number(fc.gramos.value), nota: fc.nota.value.trim() });
      guardar();
      fc.gramos.value = fc.nota.value = '';
      aviso('¡Felicidades por tu cosecha!');
      render();
    });

    $('#historial').addEventListener('click', async (ev) => {
      const boton = ev.target.closest('[data-borrar]');
      if (!boton) return;
      const [tipo, rid] = boton.dataset.borrar.split(':');
      const lista = tipo === 'medicion' ? 'mediciones' : 'cosechas';
      if (!(await confirmar(`¿Borrar este registro de ${tipo === 'medicion' ? 'medición' : 'cosecha'}?`, 'Borrar'))) return;
      estado[lista] = estado[lista].filter((x) => x.id !== rid);
      guardar();
      aviso('Registro borrado.');
      render();
    });
  }

  function renderRegistro() {
    const opts = estado.sistemas.map((s) => `<option value="${s.id}">${escapar(s.nombre)}</option>`).join('');
    ['#form-medicion', '#form-cosecha'].forEach((sel) => {
      const form = $(sel);
      const select = form.sistema;
      const actual = select.value;
      select.innerHTML = opts || '<option value="">Registra un sistema primero</option>';
      if (actual && sistemaPorId(actual)) select.value = actual;
      form.querySelector('[type="submit"]').disabled = !estado.sistemas.length;
    });

    const total = estado.cosechas.reduce((t, c) => t + c.gramos, 0);
    $('#resumen-registro').innerHTML = estado.mediciones.length || estado.cosechas.length
      ? `<div class="dato"><b>${estado.mediciones.length}</b><small>mediciones</small></div>
         <div class="dato"><b>${estado.cosechas.length}</b><small>cosechas</small></div>
         <div class="dato"><b>${gramosTexto(total)}</b><small>cosechado</small></div>`
      : '';

    const nombre = (sid) => escapar(sistemaPorId(sid)?.nombre ?? '—');
    const filas = [
      ...estado.mediciones.map((m) => {
        const s = sistemaPorId(m.sistema);
        const ok = s && C.evaluarMedicion(s.cultivo, m).enRango;
        return { fecha: m.fecha, clave: `medicion:${m.id}`, icono: ok ? 'check' : 'alerta', clase: ok ? 'pos' : 'aviso-texto', texto: `${nombre(m.sistema)}: pH ${m.ph} · EC ${m.ec}${m.temp != null ? ` · ${m.temp} °C` : ''}` };
      }),
      ...estado.cosechas.map((c) => ({ fecha: c.fecha, clave: `cosecha:${c.id}`, icono: 'balanza', clase: 'pos', texto: `${nombre(c.sistema)}: cosecha de ${gramosTexto(c.gramos)}${c.nota ? ` — ${escapar(c.nota)}` : ''}` })),
    ].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 30);
    $('#historial').innerHTML = filas.length
      ? filas.map((f) => `<li><time>${fechaCorta(f.fecha)}</time><span class="historial-icono ${f.clase}">${icono(f.icono)}</span><span class="texto">${f.texto}</span><button type="button" class="borrar" data-borrar="${f.clave}" aria-label="Borrar registro">${icono('basura')}</button></li>`).join('')
      : '<li class="vacio">Sin registros todavía. Mide el pH y la EC una vez por semana.</li>';
  }

  // ---------- Respaldo ----------
  function iniciarRespaldo() {
    $('#exportar').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cima-respaldo-${hoy()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });

    $('#importar').addEventListener('change', async (ev) => {
      const archivo = ev.target.files[0];
      if (!archivo) return;
      try {
        const datos = JSON.parse(await archivo.text());
        if (!datos || typeof datos !== 'object') throw new Error('vacío');
        estado = normalizar(datos);
        guardar();
        render();
        aviso('Respaldo cargado.');
      } catch {
        aviso('El archivo no es un respaldo válido.');
      }
      ev.target.value = '';
    });
  }

  function render() {
    renderSistemas();
    renderRegistro();
  }

  // Puente para el juego.
  window.EcoApp = { aviso, confirmar, enlaceWhatsApp };

  iniciarPestanas();
  iniciarCalculadora();
  renderCatalogo();
  renderClub();
  renderContacto();
  iniciarSistemas();
  iniciarRegistro();
  iniciarRespaldo();
  render();
})();
