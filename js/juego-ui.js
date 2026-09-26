// Interfaz de "Mi Huerto EcoAlaya".
(function () {
  const J = window.EcoJuego;
  const C = window.EcoCalc;
  const App = window.EcoApp;
  const CLAVE = 'ecoalaya:juego:v1';
  const $ = (sel) => document.querySelector(sel);

  // Producto real que corresponde a cada mejora del juego (para el botón de WhatsApp).
  const PRODUCTO_REAL = {
    modulo: 'un módulo de expansión para mi sistema',
    aislado: 'un tanque aislado',
    dosificador: 'un dosificador automático de nutrientes',
    controladorPh: 'un controlador de pH',
  };

  const ICONO_INSUMO = {
    nutrientes: 'M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z',
    phMenos: 'M5 12h14',
    phMas: 'M5 12h14M12 5v14',
    agua: 'M4 14c2-2 4-2 6 0s4 2 6 0 3-2 4-1M4 19c2-2 4-2 6 0s4 2 6 0 3-2 4-1',
    cambio: 'M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2M20 4v5h-5M4 20v-5h5',
    tratamiento: 'M9 3h6M10 3v4l-4 6v7h12v-7l-4-6V3',
  };

  let juego = cargar();

  function cargar() {
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE));
      if (guardado && guardado.version === 1) return guardado;
    } catch {
      // Datos dañados o sin almacenamiento: empezamos de nuevo.
    }
    return J.nuevoJuego();
  }

  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(juego));
    } catch {
      // Sin almacenamiento disponible: el juego vive solo en esta sesión.
    }
  }

  function escapar(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  }

  function nombreCultivo(id) {
    return C.CULTIVOS[id].nombre;
  }

  function enlaceWhatsApp(texto) {
    const numero = (window.ECOALAYA_CONFIG && window.ECOALAYA_CONFIG.whatsapp) || '';
    return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  }

  // Ejecuta una acción del motor, guarda, revisa logros/nivel y vuelve a dibujar.
  function accion(fn) {
    const nivelAntes = J.nivelJugador(juego);
    const r = fn();
    if (r && r.ok === false) {
      App.aviso(r.mensaje);
      return r;
    }
    const mensajes = [];
    if (r && r.mensaje) mensajes.push(r.mensaje);
    const nivel = J.nivelJugador(juego);
    if (nivel > nivelAntes) {
      const nuevos = Object.entries(J.PLANTAS).filter(([, p]) => p.nivel === nivel).map(([id]) => nombreCultivo(id));
      mensajes.push(`¡Subiste a nivel ${nivel}!${nuevos.length ? ` Desbloqueaste: ${nuevos.join(', ')}.` : ''}`);
    }
    for (const logro of J.revisarLogros(juego)) {
      App.otorgarPuntos(logro.puntos, `Logro del juego: ${logro.nombre}`);
      mensajes.push(`🏆 Logro “${logro.nombre}”: +${logro.puntos} puntos EcoAlaya`);
    }
    guardar();
    render();
    if (mensajes.length) App.aviso(mensajes.join(' '));
    return r;
  }

  // ---------- Dibujo de la escena ----------

  function colorHoja(m) {
    if (m.muerta) return 'var(--planta-muerta)';
    if (m.salud >= 70) return 'var(--planta-sana)';
    if (m.salud >= 40) return 'var(--planta-regular)';
    return 'var(--planta-mala)';
  }

  // Forma de las hojas por cultivo: [ancho relativo, largo máximo, apertura en grados].
  const FORMA = {
    lechuga: [0.55, 30, 80],
    albahaca: [0.45, 22, 70],
    espinaca: [0.4, 32, 60],
    fresa: [0.6, 22, 85],
    tomate: [0.4, 22, 55],
  };

  function plantaSVG(m, x, y) {
    const [ancho, largoMax, apertura] = FORMA[m.cultivo];
    const g = m.crecimiento / 100;
    const color = colorHoja(m);
    const partes = [];

    if (g < 0.12 && !m.muerta) {
      partes.push(`<ellipse cx="${x - 3}" cy="${y - 5}" rx="3" ry="5" transform="rotate(-35 ${x - 3} ${y - 5})" fill="${color}"/>`);
      partes.push(`<ellipse cx="${x + 3}" cy="${y - 5}" rx="3" ry="5" transform="rotate(35 ${x + 3} ${y - 5})" fill="${color}"/>`);
      return partes.join('');
    }

    const alto = m.cultivo === 'tomate' ? 10 + g * 32 : 0;
    if (alto) partes.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${y - alto}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`);

    const hojas = 3 + Math.round(g * 5);
    const largo = 8 + g * (largoMax - 8);
    for (let i = 0; i < hojas; i++) {
      const t = hojas === 1 ? 0.5 : i / (hojas - 1);
      let angulo = -apertura + t * apertura * 2;
      if (m.muerta) angulo = angulo * 1.6 + (angulo < 0 ? -40 : 40);
      const base = alto ? y - alto * (0.25 + 0.75 * ((i % 3) / 2)) : y;
      const cy = base - largo / 2;
      partes.push(`<ellipse cx="${x}" cy="${cy}" rx="${largo * ancho / 2}" ry="${largo / 2}" transform="rotate(${angulo} ${x} ${base})" fill="${color}" stroke="var(--planta-borde)" stroke-width="0.6"/>`);
    }

    if (!m.muerta && (m.cultivo === 'fresa' || m.cultivo === 'tomate') && g >= 0.75) {
      const maduro = g >= 1;
      const fruto = m.cultivo === 'fresa' ? 'var(--fresa)' : 'var(--tomate)';
      const pos = m.cultivo === 'fresa' ? [[-12, -4], [10, -2], [2, -9]] : [[-8, -alto * 0.5], [9, -alto * 0.7], [-4, -alto * 0.85]];
      for (const [dx, dy] of pos) {
        partes.push(`<circle cx="${x + dx}" cy="${y + dy}" r="${m.cultivo === 'fresa' ? 4 : 5}" fill="${maduro ? fruto : 'var(--fruto-verde)'}" stroke="var(--planta-borde)" stroke-width="0.6"/>`);
      }
    }

    if (!m.muerta && g >= 1) {
      const top = y - (alto || 0) - largo - 6;
      partes.push(`<g class="listo"><circle cx="${x}" cy="${top}" r="7" fill="var(--acento)"/><path d="M${x - 3} ${top}l2 2 4-4" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>`);
    }
    return partes.join('');
  }

  function renderEscena() {
    const porFila = 6;
    const filas = Math.ceil(juego.macetas.length / porFila);
    const altoFila = 96;
    const ancho = 360;
    const altoTanque = 70;
    const alto = filas * altoFila + altoTanque + 16;
    const a = juego.agua;
    const partes = [];

    // Tanque con el nivel de agua; el tono del agua sugiere la concentración de nutrientes.
    const tanqueY = filas * altoFila + 8;
    const altoAgua = (altoTanque - 8) * (a.nivel / 100);
    const tinte = Math.min(1, a.ec / 2.5);
    partes.push(`<rect x="20" y="${tanqueY}" width="${ancho - 40}" height="${altoTanque}" rx="10" fill="var(--tanque)" stroke="var(--tanque-borde)" stroke-width="2"/>`);
    partes.push(`<rect x="24" y="${tanqueY + altoTanque - 4 - altoAgua}" width="${ancho - 48}" height="${altoAgua}" rx="7" fill="var(--agua)" opacity="${0.55 + tinte * 0.4}"/>`);
    partes.push(`<text x="${ancho / 2}" y="${tanqueY + altoTanque / 2 + 5}" text-anchor="middle" class="texto-tanque">${Math.round(a.nivel)} % · ${J.LITROS} L</text>`);
    if (juego.plaga) partes.push(`<text x="${ancho - 30}" y="${tanqueY - 6}" text-anchor="end" class="texto-plaga">🐛 plaga</text>`);

    for (let f = 0; f < filas; f++) {
      const tuboY = f * altoFila + altoFila - 12;
      partes.push(`<rect x="10" y="${tuboY}" width="${ancho - 20}" height="16" rx="8" fill="var(--tubo)" stroke="var(--tubo-borde)"/>`);
      partes.push(`<line x1="${ancho - 24}" y1="${tuboY + 16}" x2="${ancho - 24}" y2="${tanqueY}" stroke="var(--tubo-borde)" stroke-width="3"/>`);
    }

    juego.macetas.forEach((m, i) => {
      const f = Math.floor(i / porFila);
      const col = i % porFila;
      const x = 38 + col * ((ancho - 76) / (porFila - 1));
      const y = f * altoFila + altoFila - 12;
      const etiqueta = m ? `${nombreCultivo(m.cultivo)}${m.muerta ? ' (muerta)' : `, ${Math.round(m.crecimiento)} % crecida, salud ${Math.round(m.salud)} %`}` : 'Maceta vacía: tocar para sembrar';
      partes.push(`<g class="maceta" data-maceta="${i}" role="button" tabindex="0" aria-label="${escapar(etiqueta)}">`);
      partes.push(`<rect x="${x - 26}" y="${y - 80}" width="52" height="96" fill="transparent"/>`);
      partes.push(`<rect x="${x - 9}" y="${y - 2}" width="18" height="12" rx="3" fill="var(--maceta)"/>`);
      if (m) partes.push(plantaSVG(m, x, y - 2));
      else partes.push(`<circle cx="${x}" cy="${y - 18}" r="11" fill="none" stroke="var(--suave)" stroke-dasharray="3 3"/><path d="M${x - 5} ${y - 18}h10M${x} ${y - 23}v10" stroke="var(--suave)" stroke-width="1.6"/>`);
      partes.push('</g>');
    });

    $('#escena').innerHTML = `<svg viewBox="0 0 ${ancho} ${alto}" role="img">${partes.join('')}</svg>`;
  }

  // ---------- Medidores y diagnóstico ----------

  function medidor({ etiqueta, valor, texto, escala, rango }) {
    const pct = (v) => Math.min(100, Math.max(0, ((v - escala[0]) / (escala[1] - escala[0])) * 100));
    const ok = rango && valor >= rango[0] && valor <= rango[1];
    const banda = rango ? `<span class="banda" style="left:${pct(rango[0])}%;width:${pct(rango[1]) - pct(rango[0])}%"></span>` : '';
    return `<div class="medidor ${ok ? 'en-rango' : 'fuera'}">
      <div class="medidor-cab"><span>${etiqueta}</span><b>${texto}</b></div>
      <div class="medidor-barra">${banda}<span class="marca" style="left:${pct(valor)}%"></span></div>
    </div>`;
  }

  function renderMedidores() {
    const a = juego.agua;
    const r = J.rangoTanque(juego);
    const rangoValido = (x) => (x[0] <= x[1] ? x : null);
    $('#medidores').innerHTML = [
      medidor({ etiqueta: 'pH', valor: a.ph, texto: a.ph.toFixed(1), escala: [4, 8.5], rango: rangoValido(r.ph) }),
      medidor({ etiqueta: 'EC (mS/cm)', valor: a.ec, texto: a.ec.toFixed(1), escala: [0, 4], rango: rangoValido(r.ec) }),
      medidor({ etiqueta: 'Nivel', valor: a.nivel, texto: `${Math.round(a.nivel)} %`, escala: [0, 100], rango: [J.NIVEL_MINIMO, 100] }),
      medidor({ etiqueta: 'Temperatura', valor: a.temp, texto: `${a.temp.toFixed(1)} °C`, escala: [10, 34], rango: J.TEMP_IDEAL }),
    ].join('');
  }

  function renderDiagnostico() {
    const r = J.rangoTanque(juego);
    const problemas = J.diagnostico(juego);
    const hayPlantas = juego.macetas.some((m) => m && !m.muerta);
    let html;
    if (!r.compatible) {
      html = `<p class="alerta"><b>Cultivos incompatibles:</b> ${r.cultivos.map(nombreCultivo).join(' y ')} necesitan rangos de pH/EC distintos. Algunas plantas sufrirán siempre.</p>`;
    } else if (problemas.length) {
      html = `<ul>${problemas.map((p) => `<li>${escapar(p.texto)}</li>`).join('')}</ul>`;
    } else if (hayPlantas) {
      html = `<p class="ok">Todo en rango. ${juego.racha ? `Racha perfecta: ${juego.racha} ${juego.racha === 1 ? 'día' : 'días'}.` : ''}</p>`;
    } else {
      html = '<p class="ok">El agua está lista. Toca una maceta vacía para sembrar.</p>';
    }
    const objetivo = r.compatible
      ? `<small>Objetivo para ${r.cultivos.map((c) => nombreCultivo(c).toLowerCase()).join(', ')}: pH ${r.ph[0]}–${r.ph[1]} · EC ${r.ec[0]}–${r.ec[1]}</small>`
      : '';
    const el = $('#diagnostico');
    el.className = `diagnostico ${problemas.length || !r.compatible ? 'con-problemas' : 'sin-problemas'}`;
    el.innerHTML = html + objetivo;
  }

  function renderAcciones() {
    $('#acciones').innerHTML = Object.entries(J.INSUMOS).map(([id, ins]) => `
      <button type="button" class="accion" data-insumo="${id}" ${juego.monedas < ins.costo || (id === 'tratamiento' && !juego.plaga) ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONO_INSUMO[id]}"/></svg>
        <span>${escapar(ins.nombre)}</span>
        <small>${ins.costo ? `${ins.costo} 🪙` : 'Gratis'}</small>
      </button>`).join('');
  }

  function renderEstado() {
    $('#j-dia').textContent = juego.dia;
    $('#j-nivel').textContent = J.nivelJugador(juego);
    $('#j-xp').style.width = `${juego.xp % 100}%`;
    $('#j-monedas').textContent = juego.monedas;
    $('#eventos').innerHTML = juego.eventos.length
      ? `<h3>Día ${juego.dia}</h3><ul>${juego.eventos.map((e) => `<li>${escapar(e)}</li>`).join('')}</ul>`
      : '';
  }

  function renderTienda() {
    $('#tienda').innerHTML = Object.entries(J.MEJORAS).map(([id, m]) => {
      const tiene = juego.mejoras[id] || 0;
      const agotada = tiene >= m.max;
      return `<article class="mejora">
        <div>
          <h3>${escapar(m.nombre)}${tiene ? ` <span class="insignia-mini">${m.max > 1 ? `${tiene}/${m.max}` : 'Instalado'}</span>` : ''}</h3>
          <p>${escapar(m.descripcion)}</p>
          <a href="${enlaceWhatsApp(`Hola EcoAlaya, jugando Mi Huerto me interesó ${PRODUCTO_REAL[id]}. ¿Me dan más información?`)}" target="_blank" rel="noopener">¿Lo quieres de verdad? Pídelo a EcoAlaya</a>
        </div>
        <button type="button" data-mejora="${id}" ${agotada || juego.monedas < m.costo ? 'disabled' : ''}>${agotada ? 'Listo' : `${m.costo} 🪙`}</button>
      </article>`;
    }).join('');
  }

  function renderLogros() {
    $('#logros').innerHTML = Object.entries(J.LOGROS).map(([id, l]) => `
      <li class="${juego.logros[id] ? 'obtenido' : ''}">
        <span class="texto"><b>${escapar(l.nombre)}</b><br><small>${escapar(l.descripcion)}</small></span>
        <b class="${juego.logros[id] ? 'pos' : 'pendiente'}">${juego.logros[id] ? '✓ ' : ''}+${l.puntos} pts</b>
      </li>`).join('');
  }

  function render() {
    renderEstado();
    renderEscena();
    renderDiagnostico();
    renderMedidores();
    renderAcciones();
    renderTienda();
    renderLogros();
  }

  // ---------- Hoja inferior (sembrar / cosechar) ----------

  function abrirHoja(indice) {
    const hoja = $('#hoja');
    const m = juego.macetas[indice];
    let html;
    if (!m) {
      const nivel = J.nivelJugador(juego);
      html = `<h2>Sembrar en la maceta ${indice + 1}</h2><ul class="lista semillas">${Object.entries(J.PLANTAS).map(([id, p]) => {
        const c = C.CULTIVOS[id];
        const bloqueada = nivel < p.nivel;
        return `<li>
          <span class="texto"><b>${c.nombre}</b><br><small>${bloqueada ? `Se desbloquea en el nivel ${p.nivel}` : `${p.dias} días · pH ${c.ph[0]}–${c.ph[1]} · EC ${c.ec[0]}–${c.ec[1]} · vende ~${p.precio} 🪙`}</small></span>
          <button type="button" data-sembrar="${id}" ${bloqueada || juego.monedas < p.semilla ? 'disabled' : ''}>${bloqueada ? '🔒' : `${p.semilla} 🪙`}</button>
        </li>`;
      }).join('')}</ul>`;
    } else {
      const c = C.CULTIVOS[m.cultivo];
      const listo = !m.muerta && m.crecimiento >= 100;
      const problemas = m.muerta ? [] : J.diagnostico(juego, m.cultivo).map((p) => `<li>${escapar(p.texto)}</li>`);
      html = `<h2>${c.nombre}${m.muerta ? ' (muerta)' : ''}</h2>
        <div class="resumen">
          <div><span class="cifra">${Math.round(m.crecimiento)}%</span><small>crecimiento</small></div>
          <div><span class="cifra">${Math.round(m.salud)}%</span><small>salud</small></div>
        </div>
        <p class="nota">Día ${m.dias} de ~${J.PLANTAS[m.cultivo].dias}. Ideal: pH ${c.ph[0]}–${c.ph[1]} · EC ${c.ec[0]}–${c.ec[1]}.</p>
        ${problemas.length ? `<ul class="consejos">${problemas.join('')}</ul>` : ''}
        ${listo ? '<button type="button" data-cosechar class="grande">Cosechar</button>' : ''}
        <button type="button" data-retirar class="secundario grande">${m.muerta ? 'Retirar planta muerta' : 'Arrancar planta'}</button>`;
    }
    hoja.innerHTML = `<form method="dialog" class="cerrar"><button aria-label="Cerrar">✕</button></form>${html}`;
    hoja.dataset.maceta = indice;
    if (!hoja.open) hoja.showModal();
  }

  function iniciar() {
    $('#escena').addEventListener('click', (ev) => {
      const g = ev.target.closest('[data-maceta]');
      if (g) abrirHoja(Number(g.dataset.maceta));
    });
    $('#escena').addEventListener('keydown', (ev) => {
      const g = ev.target.closest('[data-maceta]');
      if (g && (ev.key === 'Enter' || ev.key === ' ')) {
        ev.preventDefault();
        abrirHoja(Number(g.dataset.maceta));
      }
    });

    $('#hoja').addEventListener('click', (ev) => {
      const hoja = $('#hoja');
      if (ev.target === hoja) return hoja.close(); // clic fuera del contenido
      const i = Number(hoja.dataset.maceta);
      const boton = ev.target.closest('button');
      if (!boton) return;
      if (boton.dataset.sembrar) {
        const r = accion(() => J.sembrar(juego, i, boton.dataset.sembrar));
        if (r.ok) hoja.close();
      } else if ('cosechar' in boton.dataset) {
        accion(() => J.cosechar(juego, i));
        hoja.close();
      } else if ('retirar' in boton.dataset) {
        const m = juego.macetas[i];
        if (m && !m.muerta && !confirm('¿Seguro que quieres arrancar esta planta? Perderás la semilla.')) return;
        accion(() => J.retirar(juego, i));
        hoja.close();
      }
    });

    $('#acciones').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-insumo]');
      if (b) accion(() => J.usarInsumo(juego, b.dataset.insumo));
    });

    $('#tienda').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-mejora]');
      if (b) accion(() => J.comprarMejora(juego, b.dataset.mejora));
    });

    $('#pasar-dia').addEventListener('click', () => {
      accion(() => {
        J.pasarDia(juego);
        return { ok: true };
      });
      $('#escena').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    $('#reiniciar').addEventListener('click', () => {
      if (!confirm('¿Reiniciar el juego? Perderás tu huerto y monedas (tus puntos EcoAlaya y logros ya ganados se conservan).')) return;
      const logros = juego.logros;
      juego = J.nuevoJuego();
      juego.logros = logros; // evita volver a cobrar puntos por los mismos logros
      guardar();
      render();
    });

    $('#cta-sistema').href = enlaceWhatsApp('Hola EcoAlaya, jugué Mi Huerto y quiero información sobre el sistema hidropónico familiar.');
    render();
  }

  iniciar();
})();
