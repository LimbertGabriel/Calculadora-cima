# Inventario web + WhatsApp (Google Sheets / Apps Script)

Página web para cargar el inventario desde el celular. Guarda los datos en la planilla
**Inventario** (cada producto usa dos filas: Código / Descripción arriba y Cantidad / Vencimiento abajo)
y arma el aviso de vencimientos para enviarlo por WhatsApp con un toque.

## Instalación
1. Abre la planilla y entra a **Extensiones → Apps Script**.
2. Pega `Code.gs` en el archivo `Código.gs`. Cambia la clave en `PIN`.
3. Crea un archivo HTML llamado exactamente `Index` (**+ → HTML**) y pega `Index.html`.
4. Guarda y entra a **Implementar → Nueva implementación → Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
5. Autoriza los permisos y copia el enlace `/exec`. Ese enlace es el que compartes con tu equipo.

Si después cambias el código: **Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva versión**,
así el enlace se mantiene.

## Uso
- Agregar, editar o borrar productos. Los cambios se escriben directamente en la planilla.
- Los contactos se guardan en la hoja **Contactos**, que se crea sola.
- En **Enviar por WhatsApp**, cada botón abre WhatsApp con el mensaje listo; solo hay que tocar Enviar.
  "Elegir contacto o grupo…" permite mandarlo a un grupo.
