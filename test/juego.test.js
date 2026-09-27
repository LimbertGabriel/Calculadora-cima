const test = require('node:test');
const assert = require('node:assert');
const J = require('../js/juego.js');

// Jugador que corrige el agua cada día igual que lo haría un buen cliente.
function cuidar(j) {
  const r = J.rangoTanque(j);
  const a = j.agua;
  if (j.plaga) J.usarInsumo(j, 'tratamiento');
  if (a.nivel < 50) J.usarInsumo(j, 'agua');
  for (let i = 0; i < 6 && a.ec < r.ec[0]; i++) J.usarInsumo(j, 'nutrientes');
  for (let i = 0; i < 6 && a.ec > r.ec[1] && a.nivel < 99; i++) J.usarInsumo(j, 'agua');
  for (let i = 0; i < 8 && a.ph > r.ph[1] - 0.2; i++) J.usarInsumo(j, 'phMenos');
  for (let i = 0; i < 8 && a.ph < r.ph[0]; i++) J.usarInsumo(j, 'phMas');
}

function sembrarTodo(j, cultivo) {
  j.macetas.forEach((m, i) => { if (!m) J.sembrar(j, i, cultivo); });
}

function cosecharTodo(j) {
  j.macetas.forEach((m, i) => {
    if (m && m.crecimiento >= 100 && !m.muerta) J.cosechar(j, i);
    else if (m && m.muerta) J.retirar(j, i);
  });
}

test('juego nuevo empieza con agua del grifo y macetas vacías', () => {
  const j = J.nuevoJuego(1);
  assert.strictEqual(j.agua.ph, 7.2);
  assert.strictEqual(j.macetas.length, 6);
  assert.ok(j.macetas.every((m) => m === null));
  assert.ok(J.diagnostico(j).some((p) => p.tipo === 'phAlto'));
});

test('insumos modifican el agua y cobran monedas', () => {
  const j = J.nuevoJuego(1);
  const antes = j.monedas;
  assert.ok(J.usarInsumo(j, 'nutrientes').ok);
  assert.strictEqual(j.agua.ec, 0.5);
  assert.ok(J.usarInsumo(j, 'phMenos').ok);
  assert.strictEqual(j.agua.ph, 6.9);
  assert.strictEqual(j.monedas, antes - 3);
  assert.strictEqual(J.usarInsumo(j, 'tratamiento').ok, false);
});

test('la dosis real enseña los mL de la calculadora', () => {
  assert.deepStrictEqual(J.dosisReal(), { A: 25, B: 25, C: 25 });
});

test('no se puede sembrar un cultivo bloqueado ni en maceta ocupada', () => {
  const j = J.nuevoJuego(1);
  assert.strictEqual(J.sembrar(j, 0, 'tomate').ok, false);
  assert.ok(J.sembrar(j, 0, 'lechuga').ok);
  assert.strictEqual(J.sembrar(j, 0, 'lechuga').ok, false);
});

test('rellenar agua diluye la EC', () => {
  const j = J.nuevoJuego(1);
  Object.assign(j.agua, { ec: 1.6, nivel: 50 });
  J.usarInsumo(j, 'agua');
  assert.strictEqual(j.agua.nivel, 100);
  assert.strictEqual(j.agua.ec, 0.8);
});

test('mezclar cultivos incompatibles se detecta', () => {
  const j = J.nuevoJuego(1);
  j.xp = 1000;
  J.sembrar(j, 0, 'lechuga');
  J.sembrar(j, 1, 'tomate');
  assert.strictEqual(J.rangoTanque(j).compatible, false);
});

test('módulo extra agrega 3 macetas', () => {
  const j = J.nuevoJuego(1);
  j.monedas = 1000;
  assert.ok(J.comprarMejora(j, 'modulo').ok);
  assert.strictEqual(j.macetas.length, 9);
});

test('un jugador cuidadoso cosecha, gana monedas y logros', () => {
  for (const semilla of [1, 2, 3, 42, 99]) {
    const j = J.nuevoJuego(semilla);
    cuidar(j);
    sembrarTodo(j, 'lechuga');
    const logros = [];
    for (let d = 0; d < 40; d++) {
      cuidar(j);
      J.pasarDia(j);
      cosecharTodo(j);
      logros.push(...J.revisarLogros(j));
      sembrarTodo(j, 'lechuga');
    }
    assert.ok(j.stats.cosechas >= 18, `semilla ${semilla}: solo ${j.stats.cosechas} cosechas`);
    assert.ok(j.monedas > J.nuevoJuego().monedas, `semilla ${semilla}: ${j.monedas} monedas`);
    assert.ok(logros.some((l) => l.id === 'primeraCosecha'));
    assert.ok(J.nivelJugador(j) >= 3);
  }
});

test('un jugador descuidado pierde sus plantas', () => {
  const j = J.nuevoJuego(7);
  sembrarTodo(j, 'lechuga');
  for (let d = 0; d < 20; d++) J.pasarDia(j);
  assert.ok(j.macetas.every((m) => m && m.muerta));
  assert.strictEqual(j.stats.cosechas, 0);
});

test('los logros se entregan una sola vez', () => {
  const j = J.nuevoJuego(1);
  j.stats.cosechas = 1;
  assert.strictEqual(J.revisarLogros(j).length, 1);
  assert.strictEqual(J.revisarLogros(j).length, 0);
});

// ---------- Invernadero ----------

function manejarInvernadero(j) {
  const { config } = J.mejorConfiguracion(j);
  for (const [control, valor] of Object.entries(config)) J.cambiarInvernadero(j, control, valor);
}

for (const region of ['occidente', 'oriente']) {
  test(`un jugador cuidadoso cosecha en el invernadero de ${region}`, () => {
    for (const semilla of [1, 2, 3, 42, 99]) {
      const j = J.nuevoJuego(semilla, region);
      cuidar(j);
      sembrarTodo(j, 'lechuga');
      for (let d = 0; d < 40; d++) {
        for (const fase of ['dia', 'noche']) {
          cuidar(j);
          manejarInvernadero(j);
          J.pasarFase(j);
        }
        cosecharTodo(j);
        J.revisarLogros(j);
        sembrarTodo(j, 'lechuga');
      }
      assert.ok(j.stats.cosechas >= 18, `${region} semilla ${semilla}: ${j.stats.cosechas} cosechas`);
      assert.ok(j.monedas > 150, `${region} semilla ${semilla}: ${j.monedas} monedas`);
      assert.strictEqual(j.dia, 41);
    }
  });
}

test('sin manejar el invernadero, las heladas del Altiplano dañan las plantas', () => {
  const j = J.nuevoJuego(5, 'occidente');
  cuidar(j);
  sembrarTodo(j, 'lechuga');
  let dano = 0;
  for (let f = 0; f < 20; f++) {
    cuidar(j);
    // Deja todo abierto y sin manta, día y noche.
    Object.assign(j.invernadero, { cortinas: true, ventanas: true, manta: false });
    dano += J.efectoClima(j).dano;
    J.pasarFase(j);
  }
  assert.ok(dano >= 60, `daño total ${dano}`);
});

test('la manta térmica protege de la helada y de día quita luz', () => {
  const j = J.nuevoJuego(1, 'occidente');
  j.fase = 'noche';
  j.pronostico = { id: 'helada', texto: 'Helada', ext: -5, sol: 0, viento: false, humedo: false, helada: true };
  assert.ok(J.efectoClima(j, { cortinas: false, ventanas: false, manta: false }).dano > 0);
  assert.strictEqual(J.efectoClima(j, { cortinas: false, ventanas: false, manta: true }).dano, 4);
  j.fase = 'dia';
  j.pronostico = { id: 'soleado', texto: 'Día soleado', ext: 16, sol: 14, viento: false, humedo: false, helada: false };
  assert.ok(J.efectoClima(j, { cortinas: false, ventanas: false, manta: true }).motivos.some((m) => m.includes('luz')));
});

test('en el oriente la humedad encerrada daña y ventilar la evita', () => {
  const j = J.nuevoJuego(1, 'oriente');
  j.pronostico = { id: 'humedo', texto: 'Día húmedo', ext: 29, sol: 6, viento: false, humedo: true, helada: false };
  assert.ok(J.efectoClima(j, { cortinas: false, ventanas: false, manta: false }).dano >= 8);
  assert.strictEqual(J.efectoClima(j, { cortinas: true, ventanas: true, manta: false }).dano, 0);
});

test('un día tiene dos fases y el crecimiento ocurre al terminar la noche', () => {
  const j = J.nuevoJuego(1);
  cuidar(j);
  J.sembrar(j, 0, 'lechuga');
  manejarInvernadero(j);
  J.pasarFase(j);
  assert.strictEqual(j.fase, 'noche');
  assert.strictEqual(j.dia, 1);
  assert.strictEqual(j.macetas[0].crecimiento, 0);
  manejarInvernadero(j);
  J.pasarFase(j);
  assert.strictEqual(j.fase, 'dia');
  assert.strictEqual(j.dia, 2);
  assert.ok(j.macetas[0].crecimiento > 0);
});

test('las partidas guardadas antes se actualizan', () => {
  const viejo = J.nuevoJuego(1);
  delete viejo.region; delete viejo.fase; delete viejo.invernadero; delete viejo.pronostico;
  viejo.macetas[0] = { cultivo: 'albahaca', crecimiento: 50, salud: 90, sumaSalud: 0, dias: 3, muerta: false };
  viejo.stats.cultivos = { espinaca: 2 };
  J.migrar(viejo);
  assert.strictEqual(viejo.region, 'occidente');
  assert.strictEqual(viejo.macetas[0].cultivo, 'acelga');
  assert.deepStrictEqual(viejo.stats.cultivos, { kale: 2 });
  assert.ok(viejo.pronostico && viejo.invernadero);
});
