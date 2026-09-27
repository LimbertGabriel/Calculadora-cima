const test = require('node:test');
const assert = require('node:assert');
const C = require('../js/calc.js');

test('dosis EcoAlaya A + B + C para 20 L en crecimiento', () => {
  const d = C.calcularDosis({ litros: 20 });
  assert.deepStrictEqual(d.ml, { A: 100, B: 100, C: 100 });
  assert.deepStrictEqual(d.porLitro, { A: 5, B: 5, C: 5 });
});

test('plántula usa media dosis', () => {
  const d = C.calcularDosis({ litros: 10, etapa: 'plantula' });
  assert.deepStrictEqual(d.ml, { A: 25, B: 25, C: 25 });
});

test('fórmula personalizada', () => {
  const d = C.calcularDosis({ litros: 3, formula: 'personalizada', personalizado: { A: 4, B: 1.5, C: 2 } });
  assert.deepStrictEqual(d.ml, { A: 12, B: 4.5, C: 6 });
  assert.throws(() => C.calcularDosis({ litros: 3, formula: 'personalizada', personalizado: { A: 4, B: 1.5 } }));
});

test('volumen inválido lanza error', () => {
  assert.throws(() => C.calcularDosis({ litros: 0 }));
  assert.throws(() => C.calcularDosis({ litros: 'abc' }));
});

test('evaluación de medición en rango da puntos extra', () => {
  const e = C.evaluarMedicion('lechuga', { ph: 6, ec: 1 });
  assert.ok(e.enRango);
  assert.strictEqual(C.puntosPorMedicion(e), 15);
});

test('evaluación fuera de rango da consejos', () => {
  const e = C.evaluarMedicion('lechuga', { ph: 7.2, ec: 0.5 });
  assert.strictEqual(e.ph, 'alto');
  assert.strictEqual(e.ec, 'bajo');
  assert.strictEqual(e.consejos.length, 2);
  assert.strictEqual(C.puntosPorMedicion(e), 10);
});

test('saldo suma y resta movimientos', () => {
  assert.strictEqual(C.saldo([{ puntos: 50 }, { puntos: 100 }, { puntos: -150 }]), 0);
});

test('un juego de 200 L llena 10 tanques de 20 L', () => {
  assert.strictEqual(C.llenadosPorJuego(200, 20), 10);
  assert.strictEqual(C.llenadosPorJuego(1000, 30), 33);
});
