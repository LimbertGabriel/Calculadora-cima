# Calculadora-cima · EcoAlaya

Calcula dosis de solución nutritiva, registra tu cultivo hidropónico y gana **puntos EcoAlaya**.

Es el paso 1 del programa de fidelización de EcoAlaya: una app web, pensada para usarse
desde el celular, sin blockchain todavía. Cuando se valide con clientes reales, los puntos
podrán migrarse a un token/NFT.

## Funciones

- **Calculadora**: mL de solución A y B según litros de agua, cultivo, fórmula
  (La Molina 5 mL/L A + 2 mL/L B, o personalizada) y etapa (plántula = media dosis).
- **Mis sistemas**: registro de cada sistema hidropónico (tipo, cultivo, tanque, fecha de siembra).
- **Registro**: mediciones de pH y EC con consejos automáticos si están fuera de rango, y cosechas en gramos.
- **Puntos**: saldo, recompensas canjeables, historial de movimientos y respaldo JSON.

Los datos se guardan en el navegador del cliente (`localStorage`).

## Configuración

Fórmulas, rangos por cultivo, puntos y recompensas están en `js/calc.js`
(`FORMULAS`, `CULTIVOS`, `PUNTOS`, `RECOMPENSAS`). Los rangos de pH/EC son orientativos:
ajústalos a tus variedades y a tu fórmula.

## Uso

Abre `index.html` o publícalo con GitHub Pages. Para probar localmente:

```sh
python3 -m http.server 8000   # y abre http://localhost:8000
npm test                      # pruebas de la lógica de cálculo
```
