// Lógica pura de EcoAlaya: dosis de solución nutritiva, rangos por cultivo y puntos.
// Sin dependencias del navegador para poder probarla con Node.

(function (root) {
  // Solución Hidropónica La Molina: 5 mL de A y 2 mL de B por litro de agua.
  const FORMULAS = {
    lamolina: { nombre: 'La Molina (A + B)', mlA: 5, mlB: 2 },
    personalizada: { nombre: 'Personalizada', mlA: null, mlB: null },
  };

  // Rangos orientativos de pH y conductividad eléctrica (EC, mS/cm).
  const CULTIVOS = {
    lechuga: { nombre: 'Lechuga', ph: [5.5, 6.5], ec: [0.8, 1.2], dias: 45 },
    albahaca: { nombre: 'Albahaca', ph: [5.5, 6.5], ec: [1.0, 1.6], dias: 60 },
    espinaca: { nombre: 'Espinaca', ph: [5.5, 6.6], ec: [1.8, 2.3], dias: 45 },
    fresa: { nombre: 'Fresa', ph: [5.5, 6.2], ec: [1.0, 1.5], dias: 90 },
    tomate: { nombre: 'Tomate', ph: [5.5, 6.5], ec: [2.0, 3.5], dias: 100 },
  };

  // Fracción de la dosis completa según la etapa del cultivo.
  const ETAPAS = {
    plantula: { nombre: 'Plántula / almácigo', factor: 0.5 },
    crecimiento: { nombre: 'Crecimiento', factor: 1 },
  };

  const PUNTOS = {
    sistema: 50,
    medicion: 10,
    medicionEnRango: 5,
    cosecha: 100,
  };

  const RECOMPENSAS = [
    { id: 'semillas', nombre: 'Sobre de semillas', costo: 150 },
    { id: 'nutrientes', nombre: 'Recarga de solución A + B (1 L)', costo: 400 },
    { id: 'phmetro', nombre: 'Kit medidor de pH', costo: 800 },
    { id: 'descuento', nombre: '15 % de descuento en un módulo', costo: 1200 },
  ];

  function redondear(valor, decimales) {
    const f = Math.pow(10, decimales);
    return Math.round(valor * f) / f;
  }

  function calcularDosis({ litros, formula = 'lamolina', etapa = 'crecimiento', mlA, mlB }) {
    litros = Number(litros);
    if (!(litros > 0)) throw new Error('El volumen de agua debe ser mayor a 0 litros.');
    const f = FORMULAS[formula];
    if (!f) throw new Error(`Fórmula desconocida: ${formula}`);
    const e = ETAPAS[etapa];
    if (!e) throw new Error(`Etapa desconocida: ${etapa}`);

    const porLitroA = f.mlA ?? Number(mlA);
    const porLitroB = f.mlB ?? Number(mlB);
    if (!(porLitroA >= 0) || !(porLitroB >= 0)) {
      throw new Error('Indica los mL por litro de las soluciones A y B.');
    }

    return {
      mlA: redondear(litros * porLitroA * e.factor, 1),
      mlB: redondear(litros * porLitroB * e.factor, 1),
      porLitroA: porLitroA * e.factor,
      porLitroB: porLitroB * e.factor,
    };
  }

  // Devuelve 'bajo', 'ok' o 'alto' para un valor frente a un rango [min, max].
  function clasificar(valor, [min, max]) {
    if (valor < min) return 'bajo';
    if (valor > max) return 'alto';
    return 'ok';
  }

  function evaluarMedicion(cultivo, { ph, ec }) {
    const c = CULTIVOS[cultivo];
    if (!c) throw new Error(`Cultivo desconocido: ${cultivo}`);
    const resultado = { ph: clasificar(Number(ph), c.ph), ec: clasificar(Number(ec), c.ec) };
    resultado.enRango = resultado.ph === 'ok' && resultado.ec === 'ok';
    resultado.consejos = [];
    if (resultado.ph === 'alto') resultado.consejos.push('pH alto: agrega regulador de pH "down" gota a gota y vuelve a medir.');
    if (resultado.ph === 'bajo') resultado.consejos.push('pH bajo: agrega regulador de pH "up" gota a gota y vuelve a medir.');
    if (resultado.ec === 'alto') resultado.consejos.push('EC alta: la solución está muy concentrada; agrega agua sin nutrientes.');
    if (resultado.ec === 'bajo') resultado.consejos.push('EC baja: faltan nutrientes; agrega solución A y B en la proporción indicada.');
    return resultado;
  }

  function puntosPorMedicion(evaluacion) {
    return PUNTOS.medicion + (evaluacion.enRango ? PUNTOS.medicionEnRango : 0);
  }

  function saldo(movimientos) {
    return movimientos.reduce((total, m) => total + m.puntos, 0);
  }

  const api = {
    FORMULAS, CULTIVOS, ETAPAS, PUNTOS, RECOMPENSAS,
    calcularDosis, evaluarMedicion, puntosPorMedicion, saldo,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EcoCalc = api;
})(this);
