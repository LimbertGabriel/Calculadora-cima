// Lógica pura de Hidroponía CIMA: dosis de solución nutritiva, rangos por cultivo y fechas.
// Sin dependencias del navegador para poder probarla con Node.

(function (root) {
  // mL de cada concentrado por litro de agua.
  // Hidroponía CIMA: A (fosfato monoamónico + nitrato de potasio), B (sulfato de magnesio + micronutrientes)
  // y C (nitrato de calcio), cada concentrado preparado en 5 L.
  const PARTES = ['A', 'B', 'C'];
  const FORMULAS = {
    cima: { nombre: 'Hidroponía CIMA (A + B + C)', ml: { A: 5, B: 5, C: 5 } },
    personalizada: { nombre: 'Personalizada', ml: null },
  };

  // Hidroponía CIMA trabaja todos sus cultivos con la misma solución A + B + C y el mismo pH.
  // EC: la solución a 5 mL/L de cada parte queda cerca de 1.4 mS/cm.
  const SOLUCION_CIMA = { ph: [5.5, 6.5], ec: [1.0, 1.8] };
  const cultivo = (nombre, dias) => ({ nombre, ph: SOLUCION_CIMA.ph, ec: SOLUCION_CIMA.ec, dias });
  const CULTIVOS = {
    lechuga: cultivo('Lechuga', 45),
    acelga: cultivo('Acelga', 60),
    kale: cultivo('Kale', 60),
    apio: cultivo('Apio', 90),
    fresa: cultivo('Fresa', 90),
    tomate: cultivo('Tomate', 100),
  };

  // Fracción de la dosis completa según la etapa del cultivo.
  const ETAPAS = {
    plantula: { nombre: 'Plántula / almácigo', factor: 0.5 },
    crecimiento: { nombre: 'Crecimiento', factor: 1 },
  };

  // Cultivos que ya no se ofrecen y su reemplazo (para datos guardados antes).
  const CULTIVO_ANTERIOR = { albahaca: 'acelga', espinaca: 'kale' };
  function cultivoActual(id) {
    return CULTIVOS[id] ? id : CULTIVO_ANTERIOR[id] || 'lechuga';
  }

  function redondear(valor, decimales) {
    const f = Math.pow(10, decimales);
    return Math.round(valor * f) / f;
  }

  // Devuelve los mL de cada parte (A, B, C) para el volumen de agua indicado.
  // `personalizado` son los mL/L de cada parte cuando la fórmula es "personalizada".
  function calcularDosis({ litros, formula = 'cima', etapa = 'crecimiento', personalizado = {} }) {
    litros = Number(litros);
    if (!(litros > 0)) throw new Error('El volumen de agua debe ser mayor a 0 litros.');
    const f = FORMULAS[formula];
    if (!f) throw new Error(`Fórmula desconocida: ${formula}`);
    const e = ETAPAS[etapa];
    if (!e) throw new Error(`Etapa desconocida: ${etapa}`);

    const ml = {};
    const porLitro = {};
    for (const parte of PARTES) {
      const base = f.ml ? f.ml[parte] : Number(personalizado[parte]);
      if (!(base >= 0)) throw new Error('Indica los mL por litro de las soluciones A, B y C.');
      porLitro[parte] = base * e.factor;
      ml[parte] = redondear(litros * base * e.factor, 1);
    }
    return { ml, porLitro };
  }

  // Cuántas veces se puede llenar un tanque con un juego de nutrientes que rinde `rindeLitros`.
  function llenadosPorJuego(rindeLitros, litrosTanque) {
    return Math.floor(rindeLitros / litrosTanque);
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
    if (resultado.ph === 'alto') resultado.consejos.push('pH alto: agrega ácido nítrico diluido gota a gota, mezcla y vuelve a medir.');
    if (resultado.ph === 'bajo') resultado.consejos.push('pH bajo: agrega agua (o unas gotas de hidróxido de potasio), mezcla y vuelve a medir.');
    if (resultado.ec === 'alto') resultado.consejos.push('EC alta: la solución está muy concentrada; agrega agua sin nutrientes.');
    if (resultado.ec === 'bajo') resultado.consejos.push('EC baja: faltan nutrientes; agrega A, B y C en la proporción indicada.');
    return resultado;
  }

  // Fecha de hoy (o de `fecha`) en hora local como "AAAA-MM-DD".
  // toISOString usa hora UTC: en Bolivia, después de las 20:00 daría la fecha de mañana.
  function fechaLocal(fecha = new Date()) {
    const d = new Date(fecha);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Días enteros entre dos fechas "AAAA-MM-DD" (sin desfases por zona horaria).
  function diasEntre(desde, hasta) {
    const utc = (s) => {
      const [a, m, d] = s.split('-').map(Number);
      return Date.UTC(a, m - 1, d);
    };
    return Math.round((utc(hasta) - utc(desde)) / 86400000);
  }

  // Suma `dias` a una fecha "AAAA-MM-DD".
  function sumarDias(fecha, dias) {
    const [a, m, d] = fecha.split('-').map(Number);
    return fechaLocal(new Date(a, m - 1, d + dias));
  }

  const api = {
    PARTES, FORMULAS, SOLUCION_CIMA, CULTIVOS, ETAPAS,
    calcularDosis, llenadosPorJuego, cultivoActual, evaluarMedicion, fechaLocal, diasEntre, sumarDias,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EcoCalc = api;
})(this);
