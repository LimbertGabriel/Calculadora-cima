const test = require('node:test');
const assert = require('node:assert');
const C = require('../js/calc.js');

test('dosis Hidroponía CIMA A + B + C para 20 L en crecimiento', () => {
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

test('evaluación de medición en rango', () => {
  const e = C.evaluarMedicion('lechuga', { ph: 6, ec: 1 });
  assert.ok(e.enRango);
  assert.strictEqual(e.consejos.length, 0);
});

test('evaluación fuera de rango da consejos', () => {
  const e = C.evaluarMedicion('lechuga', { ph: 7.2, ec: 0.5 });
  assert.strictEqual(e.ph, 'alto');
  assert.strictEqual(e.ec, 'bajo');
  assert.strictEqual(e.consejos.length, 2);
});

test('la app ya no tiene puntos ni recompensas', () => {
  assert.strictEqual(C.PUNTOS, undefined);
  assert.strictEqual(C.RECOMPENSAS, undefined);
});

test('fechas en hora local, sin desfase de zona horaria', () => {
  // 15 de octubre a las 22:00 sigue siendo 15 de octubre (en UTC ya sería el 16).
  assert.strictEqual(C.fechaLocal(new Date(2026, 9, 15, 22, 0)), '2026-10-15');
  assert.strictEqual(C.diasEntre('2026-10-01', '2026-10-15'), 14);
  assert.strictEqual(C.diasEntre('2026-02-27', '2026-03-02'), 3);
  assert.strictEqual(C.sumarDias('2026-10-15', 45), '2026-11-29');
});

test('un juego de 200 L llena 10 tanques de 20 L', () => {
  assert.strictEqual(C.llenadosPorJuego(200, 20), 10);
  assert.strictEqual(C.llenadosPorJuego(1000, 30), 33);
});
