# Calculadora-cima · Hidroponía CIMA

Calcula dosis de solución nutritiva, registra tu cultivo hidropónico y gana **puntos CIMA**.

Es el paso 1 del programa de fidelización de Hidroponía CIMA: una app web, pensada para usarse
desde el celular, sin blockchain todavía. Cuando se valide con clientes reales, los puntos
podrán migrarse a un token/NFT.

## Funciones

- **Mi Huerto CIMA (juego)**: simulador hidropónico por días. El tanque cambia solo como en la vida real
  (el pH sube, las plantas consumen nutrientes, el agua se evapora, la temperatura varía, aparecen plagas)
  y el jugador lo corrige con nutrientes A + B + C, ácido nítrico (baja pH), agua o hidróxido de potasio (sube pH) y jabón potásico. Las plantas crecen, se
  enferman o mueren según el cuidado; al cosechar ganas monedas y experiencia, subes de nivel y
  desbloqueas cultivos (lechuga → albahaca → espinaca → fresa → tomate). La tienda de mejoras tiene un
  botón de WhatsApp para pedir el producto real, y los **logros dan puntos CIMA reales**.
- **Calculadora**: mL de solución A y B según litros de agua, cultivo, fórmula
  (fórmula CIMA de 3 partes: 5 mL/L de A, B y C, o personalizada) y etapa (plántula = media dosis).
- **Mis sistemas**: registro de cada sistema hidropónico (tipo, cultivo, tanque, fecha de siembra).
- **Registro**: mediciones de pH y EC con consejos automáticos si están fuera de rango, y cosechas en gramos.
- **Puntos**: saldo, recompensas canjeables, historial de movimientos y respaldo JSON.

Los datos se guardan en el navegador del cliente (`localStorage`). La app es instalable en el
celular ("Agregar a pantalla de inicio") y funciona sin internet.

## Configuración

- **WhatsApp de Hidroponía CIMA**: pon tu número en `js/config.js` para que los botones de compra lleguen a ti.
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

## App Android (APK)

**Descarga directa:** https://github.com/LimbertGabriel/Calculadora-cima/releases/download/apk-latest/HidroponiaCIMA.apk

Cada cambio subido a `main` (o a la rama de desarrollo) compila un APK nuevo en GitHub Actions
(`.github/workflows/apk.yml`) y reemplaza el de ese enlace. El APK se instala encima del anterior
sin perder el progreso.

Para compilarlo en tu computadora (necesita Android Studio / Android SDK y JDK 21):

```sh
npm install
npm run android:sync      # copia la app web al proyecto Android
cd android && ./gradlew assembleDebug
```

La llave `android/app/ecoalaya-pruebas.keystore` es solo para APK de prueba y es pública.
Para Play Store hay que crear una llave privada y no subirla al repositorio.
