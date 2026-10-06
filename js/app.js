// Interfaz de Hidroponía CIMA: calculadora, sistemas, registro de cultivo y puntos.
(function () {
  const C = window.EcoCalc;
  const CONFIG = window.CIMA_CONFIG || {};
  const PRODUCTOS = CONFIG.productos || [];
  const CLAVE = 'ecoalaya:v1';
  const $ = (sel) => document.querySelector(sel);

  let estado = cargar();

  function vacio() {
    return { sistemas: [], mediciones: [], cosechas: [], movimientos: [] };
  }

  function cargar() {
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE));
      if (!guardado) return vacio();
      const datos = { ...vacio(), ...guardado };
      // Cultivos que ya no se ofrecen pasan a su reemplazo.
      for (const sis of datos.sistemas) sis.cultivo = C.cultivoActual(sis.cultivo);
      return datos;
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

  function hoy() {
    return new Date().toISOString().slice(0, 10);
  }

  function escapar(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  }

  function sumarPuntos(puntos, motivo) {
    estado.movimientos.push({ id: id(), fecha: hoy(), puntos, motivo });
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

  // ---------- Catálogo ----------
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
        <span class="producto-icono"><svg aria-hidden="true"><use href="#i-${ICONO_PRODUCTO[p.tipo] || 'hoja'}"/></svg></span>
        <div class="producto-texto">
          <h3>${escapar(p.nombre)}</h3>
          ${p.descripcion ? `<p>${escapar(p.descripcion)}</p>` : ''}
          ${p.rindeLitros && precio ? `<p>Rinde ${p.rindeLitros} L de solución (Bs ${(p.precio / p.rindeLitros).toFixed(2).replace('.', ',')} por litro).</p>` : ''}
        </div>
        <div class="producto-compra">
          ${precio ? `<b class="precio">${precio}</b>` : '<span class="precio-consulta">Consultar precio</span>'}
          <a class="boton" href="${enlaceWhatsApp(mensaje)}" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-chat"/></svg>${precio ? 'Pedir' : 'Consultar'}</a>
        </div>
      </article>`;
    };
    const de = (...tipos) => PRODUCTOS.filter((p) => tipos.includes(p.tipo)).map(tarjeta).join('');
    $('#catalogo-sistemas').innerHTML = de('sistema');
    $('#catalogo-nutrientes').innerHTML = de('nutrientes');
    $('#catalogo-medidores').innerHTML = de('medidor', 'curso');
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
        <ul>${p.beneficios.map((b) => `<li><svg aria-hidden="true"><use href="#i-check"/></svg>${escapar(b)}</li>`).join('')}</ul>
        <a class="boton ${p.destacado ? '' : 'secundario'}" href="${enlaceWhatsApp(mensaje)}" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-chat"/></svg>Quiero ser socio</a>
      </article>`;
    }).join('');
    $('#club-pago').textContent = club.pago || '';
  }

  // ---------- Sistemas ----------
  function iniciarSistemas() {
    const form = $('#form-sistema');
    opciones(form.cultivo, C.CULTIVOS);
    form.inicio.value = hoy();
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
      sumarPuntos(C.PUNTOS.sistema, `Registro del sistema "${form.nombre.value.trim()}"`);
      guardar();
      form.reset();
      form.inicio.value = hoy();
      aviso(`Sistema registrado: +${C.PUNTOS.sistema} puntos`);
      render();
    });
  }

  function renderSistemas() {
    const lista = $('#lista-sistemas');
    if (!estado.sistemas.length) {
      lista.innerHTML = '<p class="vacio tarjeta" style="padding:16px;margin:0">Aún no registras ningún sistema. Registra el tuyo abajo para seguir su cosecha.</p>';
      return;
    }
    lista.innerHTML = estado.sistemas.map((s) => {
      const c = C.CULTIVOS[s.cultivo];
      const dias = Math.floor((Date.now() - new Date(s.inicio)) / 86400000);
      const ultima = estado.mediciones.filter((m) => m.sistema === s.id).at(-1);
      const avance = Math.min(100, Math.round((Math.max(dias, 0) / c.dias) * 100));
      return `<article class="tarjeta sistema">
        <div class="sistema-cab"><h3>${escapar(s.nombre)}</h3><b>${avance} %</b></div>
        <p>${escapar(s.tipo)} · ${escapar(c.nombre)} · ${s.litros} L</p>
        <div class="progreso" role="progressbar" aria-valuenow="${avance}" aria-valuemin="0" aria-valuemax="100"><span style="width:${avance}%"></span></div>
        <p>Día ${Math.max(dias, 0)} de ~${c.dias} hasta la cosecha</p>
        <p>${ultima ? `Última medición: pH ${ultima.ph} · EC ${ultima.ec}` : 'Sin mediciones todavía'}</p>
      </article>`;
    }).join('');
  }

  // ---------- Registro (mediciones y cosechas) ----------
  function iniciarRegistro() {
    const fm = $('#form-medicion');
    fm.fecha.value = hoy();
    fm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const s = sistemaPorId(fm.sistema.value);
      if (!s) return aviso('Primero registra un sistema.');
      const medicion = { id: id(), sistema: s.id, fecha: fm.fecha.value, ph: Number(fm.ph.value), ec: Number(fm.ec.value), temp: fm.temp.value ? Number(fm.temp.value) : null };
      const evaluacion = C.evaluarMedicion(s.cultivo, medicion);
      const puntos = C.puntosPorMedicion(evaluacion);
      estado.mediciones.push(medicion);
      sumarPuntos(puntos, `Medición en "${s.nombre}"${evaluacion.enRango ? ' (en rango)' : ''}`);
      guardar();
      $('#medicion-resultado').innerHTML = evaluacion.enRango
        ? '<p class="ok">¡Todo en rango! Tu solución está perfecta.</p>'
        : `<ul class="consejos">${evaluacion.consejos.map((t) => `<li>${escapar(t)}</li>`).join('')}</ul>`;
      fm.ph.value = fm.ec.value = fm.temp.value = '';
      aviso(`Medición guardada: +${puntos} puntos`);
      render();
    });

    const fc = $('#form-cosecha');
    fc.fecha.value = hoy();
    fc.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const s = sistemaPorId(fc.sistema.value);
      if (!s) return aviso('Primero registra un sistema.');
      estado.cosechas.push({ id: id(), sistema: s.id, fecha: fc.fecha.value, gramos: Number(fc.gramos.value), nota: fc.nota.value.trim() });
      sumarPuntos(C.PUNTOS.cosecha, `Cosecha en "${s.nombre}"`);
      guardar();
      fc.gramos.value = fc.nota.value = '';
      aviso(`¡Felicidades por tu cosecha! +${C.PUNTOS.cosecha} puntos`);
      render();
    });
  }

  function renderRegistro() {
    const opts = estado.sistemas.map((s) => `<option value="${s.id}">${escapar(s.nombre)}</option>`).join('');
    ['#form-medicion', '#form-cosecha'].forEach((sel) => {
      const select = $(sel).sistema;
      const actual = select.value;
      select.innerHTML = opts || '<option value="">Registra un sistema primero</option>';
      if (actual) select.value = actual;
    });

    const nombre = (sid) => escapar(sistemaPorId(sid)?.nombre ?? '—');
    const filas = [
      ...estado.mediciones.map((m) => ({ fecha: m.fecha, texto: `${nombre(m.sistema)}: pH ${m.ph} · EC ${m.ec}${m.temp != null ? ` · ${m.temp} °C` : ''}` })),
      ...estado.cosechas.map((c) => ({ fecha: c.fecha, texto: `${nombre(c.sistema)}: cosecha de ${c.gramos} g${c.nota ? ` — ${escapar(c.nota)}` : ''}` })),
    ].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 15);
    $('#historial').innerHTML = filas.length
      ? filas.map((f) => `<li><time>${f.fecha}</time><span class="texto">${f.texto}</span></li>`).join('')
      : '<li class="vacio">Sin registros todavía.</li>';
  }

  // ---------- Puntos ----------
  function renderPuntos() {
    const total = C.saldo(estado.movimientos);
    $('#saldo').textContent = total;
    $('#saldo-cabecera').textContent = total;
    const cosechado = estado.cosechas.reduce((t, c) => t + c.gramos, 0);
    $('#total-cosecha').textContent = (cosechado / 1000).toFixed(2);

    $('#recompensas').innerHTML = C.RECOMPENSAS.map((r) => {
      const avance = Math.min(100, Math.round((total / r.costo) * 100));
      return `<li class="recompensa">
        <span class="recompensa-icono"><svg aria-hidden="true"><use href="#i-regalo"/></svg></span>
        <span><b>${escapar(r.nombre)}</b><small>${total >= r.costo ? `${r.costo} pts · ¡ya puedes canjearlo!` : `${total} de ${r.costo} pts`}</small>
          <span class="progreso"><span style="width:${avance}%"></span></span></span>
        <button type="button" data-canje="${r.id}" ${total < r.costo ? 'disabled' : ''}>Canjear</button>
      </li>`;
    }).join('');

    $('#movimientos').innerHTML = estado.movimientos.slice().reverse().slice(0, 20)
      .map((m) => `<li><time>${m.fecha}</time><span class="texto">${escapar(m.motivo)}</span><b class="${m.puntos < 0 ? 'neg' : 'pos'}">${m.puntos > 0 ? '+' : ''}${m.puntos}</b></li>`)
      .join('') || '<li class="vacio">Aún no tienes movimientos.</li>';
  }

  function iniciarPuntos() {
    $('#recompensas').addEventListener('click', async (ev) => {
      const boton = ev.target.closest('[data-canje]');
      if (!boton) return;
      const r = C.RECOMPENSAS.find((x) => x.id === boton.dataset.canje);
      if (C.saldo(estado.movimientos) < r.costo) return;
      if (!(await confirmar(`¿Canjear ${r.costo} puntos por "${r.nombre}"?`, 'Canjear'))) return;
      sumarPuntos(-r.costo, `Canje: ${r.nombre}`);
      guardar();
      aviso('Canje registrado. Muestra este movimiento a Hidroponía CIMA para recibir tu premio.');
      render();
    });

    $('#exportar').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cima-respaldo-${hoy()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

    $('#importar').addEventListener('change', async (ev) => {
      const archivo = ev.target.files[0];
      if (!archivo) return;
      try {
        const datos = JSON.parse(await archivo.text());
        estado = { ...vacio(), ...datos };
        guardar();
        render();
        aviso('Respaldo importado.');
      } catch {
        aviso('El archivo no es un respaldo válido.');
      }
      ev.target.value = '';
    });
  }

  function render() {
    renderSistemas();
    renderRegistro();
    renderPuntos();
  }

  // Puente para el juego: sus logros suman puntos CIMA reales.
  window.EcoApp = {
    aviso,
    confirmar,
    otorgarPuntos(puntos, motivo) {
      sumarPuntos(puntos, motivo);
      guardar();
      render();
    },
  };

  iniciarPestanas();
  iniciarCalculadora();
  renderCatalogo();
  renderClub();
  iniciarSistemas();
  iniciarRegistro();
  iniciarPuntos();
  render();
})();
