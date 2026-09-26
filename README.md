# Calculadora-cima · EcoAlaya

Calcula dosis de solución nutritiva, registra tu cultivo hidropónico y gana **puntos EcoAlaya**.

Es el paso 1 del programa de fidelización de EcoAlaya: una app web, pensada para usarse
desde el celular, sin blockchain todavía. Cuando se valide con clientes reales, los puntos
podrán migrarse a un token/NFT.

## Funciones

- **Mi Huerto (juego)**: simulador hidropónico por días. El tanque cambia solo como en la vida real
  (el pH sube, las plantas consumen nutrientes, el agua se evapora, la temperatura varía, aparecen plagas)
  y el jugador lo corrige con nutrientes, pH down/up, agua y jabón potásico. Las plantas crecen, se
  enferman o mueren según el cuidado; al cosechar ganas monedas y experiencia, subes de nivel y
  desbloqueas cultivos (lechuga → albahaca → espinaca → fresa → tomate). La tienda de mejoras tiene un
  botón de WhatsApp para pedir el producto real, y los **logros dan puntos EcoAlaya reales**.
- **Calculadora**: mL de solución A y B según litros de agua, cultivo, fórmula
  (La Molina 5 mL/L A + 2 mL/L B, o personalizada) y etapa (plántula = media dosis).
- **Mis sistemas**: registro de cada sistema hidropónico (tipo, cultivo, tanque, fecha de siembra).
- **Registro**: mediciones de pH y EC con consejos automáticos si están fuera de rango, y cosechas en gramos.
- **Puntos**: saldo, recompensas canjeables, historial de movimientos y respaldo JSON.

Los datos se guardan en el navegador del cliente (`localStorage`). La app es instalable en el
celular ("Agregar a pantalla de inicio") y funciona sin internet.

## Configuración

- **WhatsApp de EcoAlaya**: pon tu número en `js/config.js` para que los botones de compra lleguen a ti.
- **Juego**: cultivos, precios, insumos, mejoras y logros están en `js/juego.js`
  (`PLANTAS`, `INSUMOS`, `MEJORAS`, `LOGROS`).
- **Al publicar cambios**, sube la versión de `CACHE` en `sw.js` para que los celulares descarguen la nueva versión.

Fórmulas, rangos por cultivo, puntos y recompensas están en `js/calc.js`
(`FORMULAS`, `CULTIVOS`, `PUNTOS`, `RECOMPENSAS`). Los rangos de pH/EC son orientativos:
ajústalos a tus variedades y a tu fórmula.

## Uso

Abre `index.html` o publícalo con GitHub Pages. Para probar localmente:

```sh
python3 -m http.server 8000   # y abre http://localhost:8000
npm test                      # pruebas de la calculadora y del motor del juego
```
