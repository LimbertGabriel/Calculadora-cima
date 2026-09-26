const test = require('node:test');
const assert = require('node:assert');
const C = require('../js/calc.js');

test('dosis La Molina para 20 L en crecimiento', () => {
  const d = C.calcularDosis({ litros: 20 });
  assert.strictEqual(d.mlA, 100);
  assert.strictEqual(d.mlB, 40);
});

test('plántula usa media dosis', () => {
  const d = C.calcularDosis({ litros: 10, etapa: 'plantula' });
  assert.strictEqual(d.mlA, 25);
  assert.strictEqual(d.mlB, 10);
});

test('fórmula personalizada', () => {
  const d = C.calcularDosis({ litros: 3, formula: 'personalizada', mlA: 4, mlB: 1.5 });
  assert.strictEqual(d.mlA, 12);
  assert.strictEqual(d.mlB, 4.5);
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
