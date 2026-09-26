// Motor de "Mi Huerto EcoAlaya": simulación hidropónica por turnos (un turno = un día).
// Lógica pura, sin navegador, para poder probarla con Node.

(function (root) {
  const Calc = root.EcoCalc || (typeof require === 'function' ? require('./calc.js') : null);

  const LITROS = 20;
  const AGUA_GRIFO = { ph: 7.2, ec: 0.2 };
  const DOSIS_EC = 0.3; // EC que sube cada dosis de nutrientes en el tanque de 20 L
  const DOSIS_FRACCION = 0.25; // cada dosis es 1/4 de la dosis completa de la calculadora
  const PASO_PH = 0.3;
  const TEMP_IDEAL = [16, 26];
  const NIVEL_MINIMO = 30;

  // Parámetros de juego por cultivo; los rangos de pH/EC vienen de la calculadora.
  const PLANTAS = {
    lechuga: { dias: 10, semilla: 10, precio: 35, gramos: 250, xp: 20, nivel: 1 },
    albahaca: { dias: 12, semilla: 15, precio: 50, gramos: 120, xp: 25, nivel: 2 },
    espinaca: { dias: 11, semilla: 15, precio: 45, gramos: 200, xp: 25, nivel: 3 },
    fresa: { dias: 18, semilla: 30, precio: 110, gramos: 300, xp: 45, nivel: 4 },
    tomate: { dias: 22, semilla: 40, precio: 150, gramos: 900, xp: 60, nivel: 5 },
  };

  const INSUMOS = {
    nutrientes: { nombre: 'Nutrientes A + B', costo: 2 },
    phMenos: { nombre: 'pH down', costo: 1 },
    phMas: { nombre: 'pH up', costo: 1 },
    agua: { nombre: 'Rellenar agua', costo: 0 },
    cambio: { nombre: 'Cambiar toda el agua', costo: 3 },
    tratamiento: { nombre: 'Jabón potásico', costo: 10 },
  };

  const MEJORAS = {
    modulo: { nombre: 'Módulo extra (+3 macetas)', costo: 150, max: 2, descripcion: 'Más espacio para cultivar.' },
    aislado: { nombre: 'Tanque aislado', costo: 120, max: 1, descripcion: 'La temperatura del agua cambia mucho menos.' },
    dosificador: { nombre: 'Dosificador automático', costo: 250, max: 1, descripcion: 'Agrega nutrientes solo cuando la EC baja (cobra el insumo).' },
    controladorPh: { nombre: 'Controlador de pH', costo: 300, max: 1, descripcion: 'Corrige el pH solo cada día (cobra el insumo).' },
  };

  const LOGROS = {
    primeraCosecha: { nombre: 'Primera cosecha', descripcion: 'Cosecha tu primera planta.', puntos: 30 },
    semanaPerfecta: { nombre: 'Semana perfecta', descripcion: '7 días seguidos con todo en rango.', puntos: 40 },
    diezCosechas: { nombre: 'Huerto productivo', descripcion: 'Cosecha 10 plantas.', puntos: 60 },
    coleccion: { nombre: 'Colección completa', descripcion: 'Cosecha los 5 cultivos.', puntos: 100 },
    kilo: { nombre: 'Primer kilo', descripcion: 'Cosecha 1 kg en total.', puntos: 30 },
  };

  const MACETAS_INICIALES = 6;
  const MONEDAS_INICIALES = 150;

  function nuevoJuego(semilla = Date.now()) {
    return {
      version: 1,
      dia: 1,
      monedas: MONEDAS_INICIALES,
      xp: 0,
      semilla: semilla >>> 0,
      agua: { ph: AGUA_GRIFO.ph, ec: AGUA_GRIFO.ec, nivel: 100, temp: 20 },
      plaga: false,
      macetas: Array(MACETAS_INICIALES).fill(null),
      mejoras: {},
      racha: 0,
      stats: { cosechas: 0, gramos: 0, cultivos: {} },
      logros: {},
      eventos: ['¡Bienvenido! Tu tanque tiene agua del grifo: agrega nutrientes y baja el pH antes de sembrar.'],
    };
  }

  // Generador pseudoaleatorio con estado guardado (mulberry32), para simulaciones reproducibles.
  function aleatorio(j) {
    j.semilla = (j.semilla + 0x6d2b79f5) >>> 0;
    let t = j.semilla;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const r2 = (v) => Math.round(v * 100) / 100;
  const limitar = (v, min, max) => Math.min(max, Math.max(min, v));

  function nivelJugador(j) {
    return 1 + Math.floor(j.xp / 100);
  }

  function rangoDe(cultivo) {
    const c = Calc.CULTIVOS[cultivo];
    return { ph: c.ph, ec: c.ec };
  }

  // Rango común a todos los cultivos plantados (vivos). null si no son compatibles.
  function rangoTanque(j) {
    const vivos = j.macetas.filter((m) => m && !m.muerta).map((m) => m.cultivo);
    const cultivos = vivos.length ? [...new Set(vivos)] : ['lechuga'];
    const r = { ph: [-Infinity, Infinity], ec: [-Infinity, Infinity] };
    for (const c of cultivos) {
      const rc = rangoDe(c);
      for (const k of ['ph', 'ec']) {
        r[k] = [Math.max(r[k][0], rc[k][0]), Math.min(r[k][1], rc[k][1])];
      }
    }
    r.compatible = r.ph[0] <= r.ph[1] && r.ec[0] <= r.ec[1];
    r.cultivos = cultivos;
    return r;
  }

  function distancia(valor, [min, max]) {
    if (valor < min) return min - valor;
    if (valor > max) return valor - max;
    return 0;
  }

  // Lista de problemas actuales del tanque para una planta (o el tanque en general).
  function diagnostico(j, cultivo) {
    const a = j.agua;
    const problemas = [];
    const r = cultivo ? rangoDe(cultivo) : rangoTanque(j);
    if (a.ph > r.ph[1]) problemas.push({ tipo: 'phAlto', texto: `pH alto (${a.ph.toFixed(1)}). Usa pH down.` });
    if (a.ph < r.ph[0]) problemas.push({ tipo: 'phBajo', texto: `pH bajo (${a.ph.toFixed(1)}). Usa pH up.` });
    if (a.ec > r.ec[1]) problemas.push({ tipo: 'ecAlta', texto: `EC alta (${a.ec.toFixed(1)}). Agrega agua para diluir.` });
    if (a.ec < r.ec[0]) problemas.push({ tipo: 'ecBaja', texto: `EC baja (${a.ec.toFixed(1)}). Agrega nutrientes.` });
    if (a.nivel < NIVEL_MINIMO) problemas.push({ tipo: 'nivel', texto: `Nivel de agua muy bajo (${Math.round(a.nivel)} %). Rellena el tanque.` });
    if (a.temp > TEMP_IDEAL[1]) problemas.push({ tipo: 'calor', texto: `Agua caliente (${a.temp.toFixed(0)} °C): menos oxígeno para las raíces.` });
    if (a.temp < TEMP_IDEAL[0]) problemas.push({ tipo: 'frio', texto: `Agua fría (${a.temp.toFixed(0)} °C): las plantas crecen lento.` });
    if (j.plaga) problemas.push({ tipo: 'plaga', texto: 'Hay pulgones en tus plantas. Aplica jabón potásico.' });
    return problemas;
  }

  function error(mensaje) {
    return { ok: false, mensaje };
  }

  function pagar(j, costo) {
    if (j.monedas < costo) return false;
    j.monedas -= costo;
    return true;
  }

  // Dosis real equivalente, para enseñar a usar la calculadora.
  function dosisReal() {
    const d = Calc.calcularDosis({ litros: LITROS });
    return { mlA: d.mlA * DOSIS_FRACCION, mlB: d.mlB * DOSIS_FRACCION };
  }

  function usarInsumo(j, id) {
    const insumo = INSUMOS[id];
    if (!insumo) return error('Insumo desconocido.');
    const a = j.agua;
    if (id === 'tratamiento' && !j.plaga) return error('No hay plaga que tratar.');
    if (id === 'agua' && a.nivel >= 99) return error('El tanque ya está lleno.');
    if (!pagar(j, insumo.costo)) return error('No tienes monedas suficientes.');

    let mensaje;
    switch (id) {
      case 'nutrientes': {
        a.ec = r2(a.ec + DOSIS_EC * (100 / a.nivel));
        const d = dosisReal();
        mensaje = `EC sube a ${a.ec.toFixed(1)}. En la vida real: ${d.mlA} mL de A y ${d.mlB} mL de B en ${LITROS} L.`;
        break;
      }
      case 'phMenos':
        a.ph = r2(a.ph - PASO_PH);
        mensaje = `pH baja a ${a.ph.toFixed(1)}.`;
        break;
      case 'phMas':
        a.ph = r2(a.ph + PASO_PH);
        mensaje = `pH sube a ${a.ph.toFixed(1)}.`;
        break;
      case 'agua':
        a.ec = r2((a.ec * a.nivel) / 100);
        a.ph = r2((a.ph * a.nivel + AGUA_GRIFO.ph * (100 - a.nivel)) / 100);
        a.nivel = 100;
        mensaje = `Tanque lleno. La EC se diluye a ${a.ec.toFixed(1)}.`;
        break;
      case 'cambio':
        Object.assign(a, { ph: AGUA_GRIFO.ph, ec: AGUA_GRIFO.ec, nivel: 100 });
        mensaje = 'Agua nueva. Recuerda: agrega nutrientes y ajusta el pH.';
        break;
      case 'tratamiento':
        j.plaga = false;
        mensaje = 'Plaga controlada.';
        break;
    }
    return { ok: true, mensaje };
  }

  function sembrar(j, indice, cultivo) {
    const p = PLANTAS[cultivo];
    if (!p) return error('Cultivo desconocido.');
    if (indice < 0 || indice >= j.macetas.length) return error('Maceta inválida.');
    if (j.macetas[indice]) return error('Esa maceta está ocupada.');
    if (nivelJugador(j) < p.nivel) return error(`Se desbloquea en el nivel ${p.nivel}.`);
    if (!pagar(j, p.semilla)) return error('No tienes monedas suficientes.');
    j.macetas[indice] = { cultivo, crecimiento: 0, salud: 100, sumaSalud: 0, dias: 0, muerta: false };
    return { ok: true, mensaje: `Sembraste ${Calc.CULTIVOS[cultivo].nombre.toLowerCase()}.` };
  }

  function cosechar(j, indice) {
    const m = j.macetas[indice];
    if (!m || m.muerta || m.crecimiento < 100) return error('Esta planta aún no está lista.');
    const p = PLANTAS[m.cultivo];
    const calidad = m.dias ? m.sumaSalud / m.dias / 100 : 1;
    const monedas = Math.round(p.precio * (0.4 + 0.6 * calidad));
    const gramos = Math.round(p.gramos * (0.5 + 0.5 * calidad));
    j.monedas += monedas;
    j.xp += p.xp;
    j.stats.cosechas += 1;
    j.stats.gramos += gramos;
    j.stats.cultivos[m.cultivo] = (j.stats.cultivos[m.cultivo] || 0) + 1;
    j.macetas[indice] = null;
    return { ok: true, mensaje: `Cosechaste ${gramos} g de ${Calc.CULTIVOS[m.cultivo].nombre.toLowerCase()} (+${monedas} monedas, calidad ${Math.round(calidad * 100)} %).`, monedas, gramos };
  }

  function retirar(j, indice) {
    if (!j.macetas[indice]) return error('La maceta está vacía.');
    j.macetas[indice] = null;
    return { ok: true, mensaje: 'Maceta liberada.' };
  }

  function comprarMejora(j, id) {
    const mejora = MEJORAS[id];
    if (!mejora) return error('Mejora desconocida.');
    const actual = j.mejoras[id] || 0;
    if (actual >= mejora.max) return error('Ya tienes esta mejora.');
    if (!pagar(j, mejora.costo)) return error('No tienes monedas suficientes.');
    j.mejoras[id] = actual + 1;
    if (id === 'modulo') j.macetas.push(null, null, null);
    return { ok: true, mensaje: `Instalaste: ${mejora.nombre}.` };
  }

  // Penalización diaria de salud para una planta según el estado del agua.
  function efectoSalud(j, cultivo) {
    const a = j.agua;
    const r = rangoDe(cultivo);
    let delta = 4;
    delta -= distancia(a.ph, r.ph) * 20;
    delta -= distancia(a.ec, r.ec) * 25;
    if (a.nivel < NIVEL_MINIMO) delta -= 15;
    if (a.temp > TEMP_IDEAL[1] || a.temp < TEMP_IDEAL[0]) delta -= 5;
    if (j.plaga) delta -= 8;
    return delta;
  }

  function automatizar(j, eventos) {
    const r = rangoTanque(j);
    if (!r.compatible) return;
    const a = j.agua;
    if (j.mejoras.dosificador && a.ec < r.ec[0] && pagar(j, INSUMOS.nutrientes.costo)) {
      a.ec = r2(a.ec + DOSIS_EC * (100 / a.nivel));
      eventos.push('El dosificador agregó nutrientes.');
    }
    if (j.mejoras.controladorPh) {
      const objetivo = (r.ph[0] + r.ph[1]) / 2;
      if (distancia(a.ph, r.ph) > 0 && pagar(j, INSUMOS.phMenos.costo)) {
        a.ph = r2(objetivo);
        eventos.push('El controlador corrigió el pH.');
      }
    }
  }

  function pasarDia(j) {
    const a = j.agua;
    const eventos = [];
    const vivas = j.macetas.filter((m) => m && !m.muerta);

    // Clima: la temperatura del agua se mueve al azar; el tanque aislado la acerca a 21 °C.
    const aislado = !!j.mejoras.aislado;
    a.temp += (aleatorio(j) - 0.5) * (aislado ? 1.2 : 4);
    a.temp += (21 - a.temp) * (aislado ? 0.5 : 0.15);
    a.temp = r2(limitar(a.temp, 10, 34));

    // Evaporación y consumo: el agua baja, las sales se concentran y las plantas se comen los nutrientes.
    const nivelAntes = a.nivel;
    const consumoAgua = 3 + Math.max(0, a.temp - 20) * 0.4 + vivas.length * 0.8;
    a.nivel = r2(limitar(a.nivel - consumoAgua, 0, 100));
    if (a.nivel > 0) a.ec *= nivelAntes / a.nivel;
    const consumoNutrientes = vivas.reduce((t, m) => t + 0.015 + (m.crecimiento / 100) * 0.03, 0);
    a.ec = r2(Math.max(0, a.ec - consumoNutrientes));
    a.ph = r2(limitar(a.ph + 0.08 + aleatorio(j) * 0.12, 3, 9));

    // Plagas: más probables con calor.
    if (!j.plaga && vivas.length && aleatorio(j) < (a.temp > 26 ? 0.12 : 0.04)) {
      j.plaga = true;
      eventos.push('¡Aparecieron pulgones! Aplica jabón potásico.');
    }

    // Crecimiento y salud de cada planta.
    for (const m of vivas) {
      const p = PLANTAS[m.cultivo];
      m.salud = r2(limitar(m.salud + efectoSalud(j, m.cultivo), 0, 100));
      m.dias += 1;
      m.sumaSalud += m.salud;
      const nombre = Calc.CULTIVOS[m.cultivo].nombre;
      if (m.salud <= 0) {
        m.muerta = true;
        eventos.push(`Se murió una planta de ${nombre.toLowerCase()}.`);
        continue;
      }
      if (m.salud >= 40 && m.crecimiento < 100) {
        const antes = m.crecimiento;
        m.crecimiento = r2(Math.min(100, m.crecimiento + (100 / p.dias) * (0.5 + m.salud / 200)));
        if (antes < 100 && m.crecimiento >= 100) eventos.push(`¡${nombre} lista para cosechar!`);
      } else if (m.salud < 40) {
        eventos.push(`${nombre} está sufriendo y dejó de crecer.`);
      }
    }

    automatizar(j, eventos);

    // Racha de días perfectos (solo cuenta con plantas sembradas).
    const perfecto = vivas.length > 0 && diagnostico(j).length === 0 && rangoTanque(j).compatible;
    j.racha = perfecto ? j.racha + 1 : 0;

    // Rescate: si te quedaste sin monedas ni plantas, EcoAlaya te regala semillas.
    if (!j.macetas.some((m) => m && !m.muerta) && j.monedas < PLANTAS.lechuga.semilla + INSUMOS.nutrientes.costo * 3) {
      j.monedas += 30;
      eventos.push('EcoAlaya te regaló 30 monedas para volver a empezar.');
    }

    j.dia += 1;
    j.eventos = eventos;
    return eventos;
  }

  // Devuelve los logros recién desbloqueados (y los marca como obtenidos).
  function revisarLogros(j) {
    const cumple = {
      primeraCosecha: j.stats.cosechas >= 1,
      semanaPerfecta: j.racha >= 7,
      diezCosechas: j.stats.cosechas >= 10,
      coleccion: Object.keys(PLANTAS).every((c) => j.stats.cultivos[c]),
      kilo: j.stats.gramos >= 1000,
    };
    const nuevos = [];
    for (const [id, ok] of Object.entries(cumple)) {
      if (ok && !j.logros[id]) {
        j.logros[id] = j.dia;
        nuevos.push({ id, ...LOGROS[id] });
      }
    }
    return nuevos;
  }

  const api = {
    LITROS, PLANTAS, INSUMOS, MEJORAS, LOGROS, TEMP_IDEAL, NIVEL_MINIMO,
    nuevoJuego, nivelJugador, rangoTanque, diagnostico, dosisReal,
    usarInsumo, sembrar, cosechar, retirar, comprarMejora, pasarDia, revisarLogros,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EcoJuego = api;
})(this);
