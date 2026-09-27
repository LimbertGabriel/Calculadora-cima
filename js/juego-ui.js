// Interfaz de "Mi Huerto CIMA".
(function () {
  const J = window.EcoJuego;
  const C = window.EcoCalc;
  const App = window.EcoApp;
  const CLAVE = 'ecoalaya:juego:v1';
  const $ = (sel) => document.querySelector(sel);
  const sinMovimiento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Producto real que corresponde a cada mejora del juego (para el botón de WhatsApp).
  const PRODUCTO_REAL = {
    modulo: 'un módulo de expansión para mi sistema',
    aislado: 'un tanque aislado',
    dosificador: 'un dosificador automático de nutrientes',
    controladorPh: 'un controlador de pH',
  };

  const ICONO_INSUMO = {
    nutrientes: 'gota',
    phMenos: 'bajar',
    phMas: 'subir',
    agua: 'olas',
    cambio: 'ciclo',
    tratamiento: 'frasco',
  };

  const ICONO_MEJORA = {
    modulo: 'modulo',
    aislado: 'termometro',
    dosificador: 'gotero',
    controladorPh: 'ph',
  };

  const icono = (id) => `<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const moneda = (n) => `<span class="costo">${icono('moneda')}${n}</span>`;

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

  // "lechuga, albahaca y tomate"
  function enumerar(ids) {
    const n = ids.map((c) => nombreCultivo(c).toLowerCase());
    return n.length > 1 ? `${n.slice(0, -1).join(', ')} y ${n.at(-1)}` : n[0];
  }

  function enlaceWhatsApp(texto) {
    const numero = (window.CIMA_CONFIG && window.CIMA_CONFIG.whatsapp) || '';
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
      mensajes.push(`Logro “${logro.nombre}”: +${logro.puntos} puntos CIMA.`);
    }
    guardar();
    render();
    if (mensajes.length) App.aviso(mensajes.join(' '));
    return r;
  }

  // ---------- Dibujo de la escena ----------

  const ESCENA = { ancho: 360, porFila: 6, altoFila: 100, cielo: 34, altoTanque: 78 };

  function colorHoja(m) {
    if (m.muerta) return 'var(--planta-muerta)';
    if (m.salud >= 70) return 'var(--planta-sana)';
    if (m.salud >= 40) return 'var(--planta-regular)';
    return 'var(--planta-mala)';
  }

  // Forma de las hojas por cultivo: [ancho relativo, largo máximo, apertura en grados].
  const FORMA = {
    lechuga: [0.8, 28, 80],
    albahaca: [0.55, 20, 70],
    espinaca: [0.5, 30, 58],
    fresa: [0.75, 20, 85],
    tomate: [0.5, 20, 60],
  };

  // Hoja con punta: sale de (0,0) hacia arriba con largo l y ancho w.
  function hoja(l, w) {
    return `M0 0C${w} ${-l * 0.25} ${w * 0.7} ${-l * 0.85} 0 ${-l}C${-w * 0.7} ${-l * 0.85} ${-w} ${-l * 0.25} 0 0Z`;
  }

  function plantaSVG(m, x, y, { insignia = true } = {}) {
    const [ancho, largoMax, apertura] = FORMA[m.cultivo];
    const g = m.crecimiento / 100;
    const color = colorHoja(m);
    const partes = [];

    if (g < 0.12 && !m.muerta) {
      partes.push(`<path d="${hoja(9, 6)}" transform="translate(${x} ${y}) rotate(-40)" fill="${color}"/>`);
      partes.push(`<path d="${hoja(9, 6)}" transform="translate(${x} ${y}) rotate(40)" fill="${color}"/>`);
      return `<g class="planta">${partes.join('')}</g>`;
    }

    const alto = m.cultivo === 'tomate' ? 10 + g * 32 : 0;
    if (alto) partes.push(`<path d="M${x} ${y}q-2 ${-alto / 2} 0 ${-alto}" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round"/>`);

    const hojas = 3 + Math.round(g * 5);
    const largo = 9 + g * (largoMax - 9);
    for (let i = 0; i < hojas; i++) {
      const t = i / (hojas - 1);
      let angulo = -apertura + t * apertura * 2;
      if (m.muerta) angulo = angulo * 1.5 + (angulo < 0 ? -45 : 45);
      const base = alto ? y - alto * (0.2 + 0.8 * ((i % 3) / 2)) : y;
      const l = largo * (0.8 + 0.2 * Math.sin(i * 1.7 + 1));
      partes.push(`<path d="${hoja(l, l * ancho / 2)}" transform="translate(${x} ${base}) rotate(${angulo.toFixed(1)})" fill="${color}" stroke="var(--planta-borde)" stroke-width="0.7"/>`);
      partes.push(`<path d="M0 -1L0 ${(-l * 0.8).toFixed(1)}" transform="translate(${x} ${base}) rotate(${angulo.toFixed(1)})" stroke="rgba(255,255,255,0.35)" stroke-width="0.9" stroke-linecap="round"/>`);
    }

    if (!m.muerta && (m.cultivo === 'fresa' || m.cultivo === 'tomate') && g >= 0.75) {
      const maduro = g >= 1;
      const fruto = m.cultivo === 'fresa' ? 'var(--fresa)' : 'var(--tomate)';
      const pos = m.cultivo === 'fresa' ? [[-12, -3], [11, -2], [1, -8]] : [[-8, -alto * 0.45], [9, -alto * 0.65], [-4, -alto * 0.85]];
      for (const [dx, dy] of pos) {
        const r = m.cultivo === 'fresa' ? 4.2 : 5.2;
        partes.push(`<circle cx="${x + dx}" cy="${y + dy}" r="${r}" fill="${maduro ? fruto : 'var(--fruto-verde)'}" stroke="var(--planta-borde)" stroke-width="0.7"/>`);
        partes.push(`<circle cx="${x + dx - r * 0.35}" cy="${y + dy - r * 0.35}" r="${r * 0.3}" fill="rgba(255,255,255,0.5)"/>`);
      }
    }

    if (juego.plaga && !m.muerta && insignia) {
      partes.push(`<ellipse cx="${x + 6}" cy="${y - largo * 0.6}" rx="2.2" ry="1.6" fill="#3b4a1c"/><ellipse cx="${x - 7}" cy="${y - largo * 0.4}" rx="2" ry="1.5" fill="#3b4a1c"/>`);
    }

    let extra = '';
    if (!m.muerta && g >= 1 && insignia) {
      const top = y - (alto || 0) - largo - 8;
      extra = `<g class="listo"><circle cx="${x}" cy="${top}" r="8.5" fill="var(--sol)" stroke="#fff" stroke-width="1.5"/><path d="M${x - 3.5} ${top}l2.4 2.4 4.6-4.6" stroke="#3a2200" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    }
    const retraso = ((x * 7) % 50) / 10;
    return `<g class="planta" style="animation-delay:-${retraso}s">${partes.join('')}</g>${extra}`;
  }

  function posicionMaceta(i) {
    const { ancho, porFila, altoFila, cielo } = ESCENA;
    const f = Math.floor(i / porFila);
    const col = i % porFila;
    return { x: 38 + col * ((ancho - 76) / (porFila - 1)), y: cielo + f * altoFila + altoFila - 14 };
  }

  function renderEscena() {
    const { ancho, porFila, altoFila, cielo, altoTanque } = ESCENA;
    const filas = Math.ceil(juego.macetas.length / porFila);
    const tanqueY = cielo + filas * altoFila + 10;
    const alto = tanqueY + altoTanque + 14;
    const a = juego.agua;
    const p = [];

    // Cielo, sol, nubes y colinas.
    p.push(`<defs>
      <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--cielo-1)"/><stop offset="1" style="stop-color:var(--cielo-2)"/></linearGradient>
      <clipPath id="interior"><rect x="26" y="${tanqueY + 6}" width="${ancho - 52}" height="${altoTanque - 12}" rx="9"/></clipPath>
    </defs>`);
    p.push(`<rect width="${ancho}" height="${alto}" fill="url(#cielo)"/>`);
    p.push(`<circle cx="${ancho - 46}" cy="30" r="26" fill="var(--astro)" opacity="0.18"/><circle cx="${ancho - 46}" cy="30" r="15" fill="var(--astro)"/>`);
    p.push(`<g class="nube" fill="var(--nube)" opacity="0.9"><circle cx="40" cy="26" r="9"/><circle cx="52" cy="22" r="12"/><circle cx="66" cy="27" r="8"/><rect x="40" y="26" width="26" height="9" rx="4.5"/></g>`);
    p.push(`<g class="nube lenta" fill="var(--nube)" opacity="0.7" style="animation-delay:-25s"><circle cx="150" cy="44" r="7"/><circle cx="160" cy="40" r="9"/><circle cx="171" cy="45" r="6"/><rect x="150" y="44" width="21" height="7" rx="3.5"/></g>`);
    p.push(`<path d="M0 ${tanqueY - 30}Q70 ${tanqueY - 70} 150 ${tanqueY - 34}T360 ${tanqueY - 44}V${alto}H0Z" fill="var(--colina-1)"/>`);
    p.push(`<path d="M0 ${tanqueY - 8}Q110 ${tanqueY - 40} 220 ${tanqueY - 14}T360 ${tanqueY - 20}V${alto}H0Z" fill="var(--colina-2)"/>`);

    // Tuberías de cultivo (canales NFT) y retorno al tanque.
    for (let f = 0; f < filas; f++) {
      const tuboY = cielo + f * altoFila + altoFila - 14;
      p.push(`<line x1="${ancho - 22}" y1="${tuboY + 8}" x2="${ancho - 22}" y2="${tanqueY + 6}" stroke="var(--tubo-borde)" stroke-width="4" stroke-linecap="round"/>`);
      p.push(`<rect x="8" y="${tuboY}" width="${ancho - 16}" height="18" rx="9" fill="var(--tubo)" stroke="var(--tubo-borde)" stroke-width="1.5"/>`);
      p.push(`<rect x="16" y="${tuboY + 3}" width="${ancho - 32}" height="3" rx="1.5" fill="#fff" opacity="0.5"/>`);
    }
    p.push(`<line x1="22" y1="${tanqueY + 20}" x2="22" y2="${cielo + altoFila - 6}" stroke="var(--tubo-borde)" stroke-width="4" stroke-linecap="round"/>`);

    // Tanque con olas y burbujas; el agua se tiñe de verde con más nutrientes.
    const altoAgua = Math.max(0, (altoTanque - 12) * (a.nivel / 100));
    const superficie = tanqueY + altoTanque - 6 - altoAgua;
    const tinte = Math.min(1, a.ec / 2.5);
    p.push(`<rect x="20" y="${tanqueY}" width="${ancho - 40}" height="${altoTanque}" rx="14" fill="var(--tanque)" stroke="var(--tanque-borde)" stroke-width="2"/>`);
    let ola = `M-40 ${superficie}`;
    for (let x = -40; x < ancho + 40; x += 40) ola += `q10 -4 20 0t20 0`;
    ola += `V${tanqueY + altoTanque}H-40Z`;
    const burbujas = a.nivel > 10 ? [60, 110, 170, 230, 290].map((bx, k) => `<circle class="burbuja" cx="${bx}" cy="${tanqueY + altoTanque - 10}" r="${2 + (k % 2)}" fill="#fff" style="animation-delay:${k * 0.55}s"/>`).join('') : '';
    p.push(`<g clip-path="url(#interior)">
      <path class="ola" d="${ola}" fill="var(--agua-escena)"/>
      <rect x="0" y="${superficie}" width="${ancho}" height="${altoAgua + 10}" fill="#6fcf7a" opacity="${(tinte * 0.35).toFixed(2)}"/>
      ${burbujas}
    </g>`);
    p.push(`<rect x="32" y="${tanqueY + 10}" width="6" height="${altoTanque - 22}" rx="3" fill="#fff" opacity="0.35"/>`);
    const claroTexto = a.nivel > 45;
    p.push(`<text x="${ancho / 2}" y="${tanqueY + altoTanque / 2 + 5}" text-anchor="middle" class="texto-tanque" style="fill:${claroTexto ? '#fff' : 'var(--texto)'}">${Math.round(a.nivel)} % · ${J.LITROS} L</text>`);

    if (juego.plaga) {
      p.push(`<g><rect x="12" y="10" width="86" height="24" rx="12" fill="var(--mal)"/><text x="55" y="26.5" text-anchor="middle" class="texto-tanque" style="fill:#fff">¡Plaga!</text></g>`);
    }

    // Macetas con sus plantas.
    juego.macetas.forEach((m, i) => {
      const { x, y } = posicionMaceta(i);
      const etiqueta = m ? `${nombreCultivo(m.cultivo)}${m.muerta ? ' (muerta)' : `, ${Math.round(m.crecimiento)} % crecida, salud ${Math.round(m.salud)} %`}` : 'Maceta vacía: tocar para sembrar';
      p.push(`<g class="maceta" data-maceta="${i}" role="button" tabindex="0" aria-label="${escapar(etiqueta)}">`);
      p.push(`<rect class="zona" x="${x - 27}" y="${y - 84}" width="54" height="104" rx="12"/>`);
      p.push(`<path d="M${x - 10} ${y - 1}h20l-3 14h-14z" fill="var(--maceta)"/>`);
      p.push(`<circle cx="${x - 5}" cy="${y - 1}" r="2.2" fill="var(--arcilla)"/><circle cx="${x}" cy="${y - 2}" r="2.2" fill="var(--arcilla)"/><circle cx="${x + 5}" cy="${y - 1}" r="2.2" fill="var(--arcilla)"/>`);
      if (m) p.push(plantaSVG(m, x, y - 2));
      else p.push(`<circle cx="${x}" cy="${y - 20}" r="12" fill="rgba(255,255,255,0.45)" stroke="var(--hoja)" stroke-width="1.5" stroke-dasharray="3 3"/><path d="M${x - 5} ${y - 20}h10M${x} ${y - 25}v10" stroke="var(--hoja)" stroke-width="2" stroke-linecap="round"/>`);
      p.push('</g>');
    });

    $('#escena').innerHTML = `<svg viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="Tu sistema hidropónico">${p.join('')}</svg>`;
    renderEscena.alto = alto;
  }

  // Muestra una ganancia que sube desde una maceta (p. ej. "+35" monedas).
  function flotante(indice, texto) {
    if (sinMovimiento) return;
    const { x, y } = posicionMaceta(indice);
    const el = document.createElement('span');
    el.className = 'flotante';
    el.style.left = `${(x / ESCENA.ancho) * 100}%`;
    el.style.top = `${((y - 40) / renderEscena.alto) * 100}%`;
    el.innerHTML = `${icono('moneda')}${escapar(texto)}`;
    $('#flotantes').appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  // ---------- Medidores y diagnóstico ----------

  function medidor({ etiqueta, icono: ic, valor, texto, unidad, escala, rango }) {
    const pct = (v) => Math.min(100, Math.max(0, ((v - escala[0]) / (escala[1] - escala[0])) * 100));
    let estado = 'bien';
    if (rango && valor < rango[0]) estado = 'bajo';
    if (rango && valor > rango[1]) estado = 'alto';
    const banda = rango ? `<span class="banda" style="left:${pct(rango[0])}%;width:${pct(rango[1]) - pct(rango[0])}%"></span>` : '';
    return `<div class="medidor ${estado === 'bien' ? 'en-rango' : 'fuera'}">
      <div class="medidor-cab"><span class="medidor-nombre">${icono(ic)}${etiqueta}</span><span class="estado ${estado}">${estado === 'bien' ? 'Bien' : estado === 'alto' ? 'Alto' : 'Bajo'}</span></div>
      <div class="medidor-valor">${texto}${unidad ? `<small>${unidad}</small>` : ''}</div>
      <div class="medidor-barra">${banda}<span class="marca" style="left:${pct(valor)}%"></span></div>
    </div>`;
  }

  function renderMedidores() {
    const a = juego.agua;
    const r = J.rangoTanque(juego);
    const rangoValido = (x) => (x[0] <= x[1] ? x : null);
    $('#medidores').innerHTML = [
      medidor({ etiqueta: 'pH', icono: 'ph', valor: a.ph, texto: a.ph.toFixed(1), escala: [4, 8.5], rango: rangoValido(r.ph) }),
      medidor({ etiqueta: 'EC', icono: 'gota', valor: a.ec, texto: a.ec.toFixed(1), unidad: 'mS/cm', escala: [0, 4], rango: rangoValido(r.ec) }),
      medidor({ etiqueta: 'Nivel', icono: 'olas', valor: a.nivel, texto: Math.round(a.nivel), unidad: '%', escala: [0, 100], rango: [J.NIVEL_MINIMO, 100] }),
      medidor({ etiqueta: 'Temp.', icono: 'termometro', valor: a.temp, texto: a.temp.toFixed(1), unidad: '°C', escala: [10, 34], rango: J.TEMP_IDEAL }),
    ].join('');
  }

  function renderDiagnostico() {
    const r = J.rangoTanque(juego);
    const problemas = J.diagnostico(juego);
    const hayPlantas = juego.macetas.some((m) => m && !m.muerta);
    const el = $('#diagnostico');
    let clase = 'sin-problemas';
    let html;
    if (!r.compatible) {
      clase = 'incompatible';
      html = `<div class="diag-titulo">${icono('alerta')}Cultivos incompatibles</div>
        <p>${enumerar(r.cultivos).replace(/^./, (l) => l.toUpperCase())} necesitan rangos de pH/EC distintos. Algunas plantas sufrirán siempre.</p>`;
    } else if (problemas.length) {
      clase = 'con-problemas';
      html = `<div class="diag-titulo">${icono('alerta')}Tu tanque necesita atención</div>
        <ul>${problemas.map((x) => `<li>${escapar(x.texto)}</li>`).join('')}</ul>`;
    } else if (hayPlantas) {
      html = `<div class="diag-titulo">${icono('check')}Todo en orden${juego.racha ? ` · racha de ${juego.racha} ${juego.racha === 1 ? 'día' : 'días'}` : ''}</div>`;
    } else {
      html = `<div class="diag-titulo">${icono('check')}El agua está lista</div><p>Toca una maceta vacía para sembrar.</p>`;
    }
    if (r.compatible) {
      html += `<div class="objetivo">Objetivo para ${enumerar(r.cultivos)}:
        <span class="chip">pH ${r.ph[0]}–${r.ph[1]}</span><span class="chip">EC ${r.ec[0]}–${r.ec[1]}</span></div>`;
    }
    el.className = `diagnostico ${clase}`;
    el.innerHTML = html.replace(/<p>/g, '<p style="margin:0">');
  }

  function renderAcciones() {
    $('#acciones').innerHTML = Object.entries(J.INSUMOS).map(([id, ins]) => `
      <button type="button" class="accion" data-insumo="${id}" ${juego.monedas < ins.costo || (id === 'tratamiento' && !juego.plaga) ? 'disabled' : ''}>
        <span class="accion-icono">${icono(ICONO_INSUMO[id])}</span>
        <span>${escapar(ins.nombre)}</span>
        ${ins.costo ? moneda(ins.costo) : '<span class="costo">Gratis</span>'}
      </button>`).join('');
  }

  function renderEstado() {
    const xp = juego.xp % 100;
    $('#j-dia').textContent = juego.dia;
    $('#j-nivel').textContent = J.nivelJugador(juego);
    $('#j-anillo').style.setProperty('--p', xp);
    $('#j-xp-texto').textContent = `${xp}/100 XP`;
    $('#j-monedas').textContent = juego.monedas;
    $('#pasar-dia span').textContent = `Pasar al día ${juego.dia + 1}`;
    $('#eventos').innerHTML = juego.eventos.length
      ? `<h3>Bitácora · día ${juego.dia}</h3><ul>${juego.eventos.map((e) => `<li>${escapar(e)}</li>`).join('')}</ul>`
      : '';
  }

  function renderTienda() {
    $('#tienda').innerHTML = Object.entries(J.MEJORAS).map(([id, m]) => {
      const tiene = juego.mejoras[id] || 0;
      const agotada = tiene >= m.max;
      return `<article class="mejora ${tiene ? 'instalada' : ''}">
        <span class="mejora-icono">${icono(ICONO_MEJORA[id])}</span>
        <div>
          <h3>${escapar(m.nombre)}${tiene ? ` <span class="insignia-mini">${m.max > 1 ? `${tiene}/${m.max}` : 'Instalado'}</span>` : ''}</h3>
          <p>${escapar(m.descripcion)}</p>
          <a href="${enlaceWhatsApp(`Hola Hidroponía CIMA, jugando Mi Huerto CIMA me interesó ${PRODUCTO_REAL[id]}. ¿Me dan más información?`)}" target="_blank" rel="noopener">${icono('chat')}Pídelo de verdad a CIMA</a>
        </div>
        <button type="button" data-mejora="${id}" ${agotada || juego.monedas < m.costo ? 'disabled' : ''} aria-label="${agotada ? 'Instalado' : `Comprar por ${m.costo} monedas`}">${agotada ? icono('check') : moneda(m.costo)}</button>
      </article>`;
    }).join('');
  }

  function renderLogros() {
    $('#logros').innerHTML = Object.entries(J.LOGROS).map(([id, l]) => {
      const ok = !!juego.logros[id];
      return `<li class="logro ${ok ? 'obtenido' : ''}">
        <span class="logro-icono">${icono(ok ? 'medalla' : 'candado')}</span>
        <b>${escapar(l.nombre)}</b>
        <small>${escapar(l.descripcion)}</small>
        <span class="premio">${ok ? 'Ganado · ' : ''}+${l.puntos} pts</span>
      </li>`;
    }).join('');
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

  function dibujoCultivo(id) {
    const m = { cultivo: id, crecimiento: 100, salud: 100, muerta: false };
    const caja = id === 'tomate' ? '-36 -70 72 74' : '-25 -34 50 38';
    return `<svg viewBox="${caja}">${plantaSVG(m, 0, 0, { insignia: false })}</svg>`;
  }

  function anillo(valor, etiqueta, color) {
    return `<div class="anillo-grande"><span class="anillo salud" style="--p:${Math.round(valor)};--c:${color}"><b>${Math.round(valor)}%</b></span><small>${etiqueta}</small></div>`;
  }

  function abrirHoja(indice) {
    const hojaEl = $('#hoja');
    const m = juego.macetas[indice];
    let html;
    if (!m) {
      const nivel = J.nivelJugador(juego);
      html = `<h2>Sembrar en la maceta ${indice + 1}</h2><ul class="semillas">${Object.entries(J.PLANTAS).map(([id, p]) => {
        const c = C.CULTIVOS[id];
        const bloqueada = nivel < p.nivel;
        return `<li class="semilla ${bloqueada ? 'bloqueada' : ''}">
          <span class="semilla-dibujo">${dibujoCultivo(id)}</span>
          <span><b>${c.nombre}</b><small>${bloqueada ? `Se desbloquea en el nivel ${p.nivel}` : `${p.dias} días · pH ${c.ph[0]}–${c.ph[1]} · EC ${c.ec[0]}–${c.ec[1]}<br>Se vende en ~${p.precio} monedas`}</small></span>
          <button type="button" data-sembrar="${id}" ${bloqueada || juego.monedas < p.semilla ? 'disabled' : ''} aria-label="${bloqueada ? 'Bloqueado' : `Sembrar por ${p.semilla} monedas`}">${bloqueada ? icono('candado') : moneda(p.semilla)}</button>
        </li>`;
      }).join('')}</ul>`;
    } else {
      const c = C.CULTIVOS[m.cultivo];
      const listo = !m.muerta && m.crecimiento >= 100;
      const problemas = m.muerta ? [] : J.diagnostico(juego, m.cultivo).map((x) => `<li>${escapar(x.texto)}</li>`);
      const colorSalud = m.salud >= 70 ? 'var(--ok)' : m.salud >= 40 ? 'var(--aviso)' : 'var(--mal)';
      html = `<h2>${c.nombre}${m.muerta ? ' (muerta)' : listo ? ' · ¡lista!' : ''}</h2>
        <div class="anillos">${anillo(m.crecimiento, 'Crecimiento', 'var(--hoja)')}${anillo(m.salud, 'Salud', colorSalud)}</div>
        <p class="nota">Día ${m.dias} de ~${J.PLANTAS[m.cultivo].dias}. Ideal: pH ${c.ph[0]}–${c.ph[1]} · EC ${c.ec[0]}–${c.ec[1]}.</p>
        ${problemas.length ? `<ul class="consejos">${problemas.join('')}</ul>` : ''}
        ${listo ? `<button type="button" data-cosechar class="grande">${icono('check')}Cosechar</button>` : ''}
        <button type="button" data-retirar class="secundario grande">${m.muerta ? 'Retirar planta muerta' : 'Arrancar planta'}</button>`;
    }
    hojaEl.innerHTML = `<form method="dialog" class="cerrar"><button aria-label="Cerrar">${icono('cerrar')}</button></form>${html}`;
    hojaEl.dataset.maceta = indice;
    if (!hojaEl.open) hojaEl.showModal();
  }

  function pasarDia() {
    const boton = $('#pasar-dia');
    const avanzar = () => accion(() => {
      J.pasarDia(juego);
      return { ok: true };
    });
    $('.escena-marco').scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth', block: 'start' });
    if (sinMovimiento) return avanzar();
    // Anochece, pasa el día y amanece.
    const marco = $('.escena-marco');
    boton.disabled = true;
    marco.classList.remove('anochece');
    void marco.offsetWidth;
    marco.classList.add('anochece');
    setTimeout(avanzar, 450);
    setTimeout(() => {
      marco.classList.remove('anochece');
      boton.disabled = false;
    }, 1000);
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

    $('#hoja').addEventListener('click', async (ev) => {
      const hojaEl = $('#hoja');
      if (ev.target === hojaEl) return hojaEl.close(); // clic fuera del contenido
      const i = Number(hojaEl.dataset.maceta);
      const boton = ev.target.closest('button');
      if (!boton) return;
      if (boton.dataset.sembrar) {
        const r = accion(() => J.sembrar(juego, i, boton.dataset.sembrar));
        if (r.ok) hojaEl.close();
      } else if ('cosechar' in boton.dataset) {
        const r = accion(() => J.cosechar(juego, i));
        hojaEl.close();
        if (r.ok) flotante(i, `+${r.monedas}`);
      } else if ('retirar' in boton.dataset) {
        const m = juego.macetas[i];
        if (m && !m.muerta && !(await App.confirmar('¿Arrancar esta planta? Perderás la semilla.', 'Arrancar'))) return;
        accion(() => J.retirar(juego, i));
        hojaEl.close();
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

    $('#pasar-dia').addEventListener('click', pasarDia);

    $('#reiniciar').addEventListener('click', async () => {
      if (!(await App.confirmar('¿Reiniciar el juego? Perderás tu huerto y monedas. Tus puntos CIMA y logros se conservan.', 'Reiniciar'))) return;
      const logros = juego.logros;
      juego = J.nuevoJuego();
      juego.logros = logros; // evita volver a cobrar puntos por los mismos logros
      guardar();
      render();
    });

    $('#cta-sistema').href = enlaceWhatsApp('Hola Hidroponía CIMA, jugué Mi Huerto CIMA y quiero información sobre los sistemas hidropónicos.');
    render();
  }

  iniciar();
})();
