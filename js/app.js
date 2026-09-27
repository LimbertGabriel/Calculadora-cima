// Interfaz de EcoAlaya: calculadora, sistemas, registro de cultivo y puntos.
(function () {
  const C = window.EcoCalc;
  const CLAVE = 'ecoalaya:v1';
  const $ = (sel) => document.querySelector(sel);

  let estado = cargar();

  function vacio() {
    return { sistemas: [], mediciones: [], cosechas: [], movimientos: [] };
  }

  function cargar() {
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE));
      return guardado ? { ...vacio(), ...guardado } : vacio();
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
        const d = C.calcularDosis({
          litros: form.litros.value,
          formula: form.formula.value,
          etapa: form.etapa.value,
          mlA: form.mlA.value,
          mlB: form.mlB.value,
        });
        const c = C.CULTIVOS[form.cultivo.value];
        salida.innerHTML = `
          <div class="dosis">
            <div><small>Solución A</small><span class="cifra">${d.mlA}</span><span class="unidad">mL</span></div>
            <div><small>Solución B</small><span class="cifra">${d.mlB}</span><span class="unidad">mL</span></div>
          </div>
          <p>Para ${escapar(form.litros.value)} L de agua (${d.porLitroA} mL/L de A y ${d.porLitroB} mL/L de B).
          Agrega primero la A, mezcla bien y luego la B; nunca las mezcles puras.</p>
          <p class="rango">Rango ideal para ${escapar(c.nombre)}: pH ${c.ph[0]}–${c.ph[1]} · EC ${c.ec[0]}–${c.ec[1]} mS/cm</p>`;
      } catch (err) {
        salida.innerHTML = `<p class="error">${escapar(err.message)}</p>`;
      }
    });
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
      aviso('Canje registrado. Muestra este movimiento a EcoAlaya para recibir tu premio.');
      render();
    });

    $('#exportar').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ecoalaya-respaldo-${hoy()}.json`;
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

  // Puente para el juego: sus logros suman puntos EcoAlaya reales.
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
  iniciarSistemas();
  iniciarRegistro();
  iniciarPuntos();
  render();
})();
