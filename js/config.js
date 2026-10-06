// Datos de Hidroponía CIMA que puedes cambiar sin tocar el resto de la app.
window.CIMA_CONFIG = {
  // WhatsApp con código de país, sin "+" ni espacios. Si queda vacío, WhatsApp pedirá elegir el contacto.
  whatsapp: '59177569746',
  ciudad: 'La Paz',
  correo: 'contacto@hidroponiacima.com',
  web: 'https://www.hidroponiacima.com',

  // Catálogo con precios en bolivianos (precio: null muestra "Consultar precio").
  // `rindeLitros` indica cuánta solución nutritiva prepara un juego A + B + C.
  productos: [
    { id: 'torre', tipo: 'sistema', nombre: 'Torre hidropónica', precio: 650, descripcion: 'Cultivo vertical para balcón, patio o terraza. Ocupa poco espacio.' },
    { id: 'nft', tipo: 'sistema', nombre: 'Sistema familiar NFT', precio: 850, descripcion: 'Canales NFT para lechugas, espinaca y hierbas. Ideal para la familia.' },
    { id: 'nutri200', tipo: 'nutrientes', nombre: 'Nutrientes A + B + C · 200 L', precio: 40, rindeLitros: 200 },
    { id: 'nutri500', tipo: 'nutrientes', nombre: 'Nutrientes A + B + C · 500 L', precio: 60, rindeLitros: 500 },
    { id: 'nutri1000', tipo: 'nutrientes', nombre: 'Nutrientes A + B + C · 1000 L', precio: 110, rindeLitros: 1000 },
    { id: 'medidor-ph', tipo: 'medidor', nombre: 'Medidor de pH', precio: null, descripcion: 'Mide la acidez de tu solución para ajustarla a tiempo.' },
    { id: 'medidor-ec', tipo: 'medidor', nombre: 'Medidor de EC', precio: null, descripcion: 'Mide cuántos nutrientes tiene el agua de tu tanque.' },
    { id: 'curso', tipo: 'curso', nombre: 'Curso de hidroponía para principiantes', precio: null, descripcion: 'Aprende a cultivar con Hidroponía CIMA, la mayor productora de lechugas hidropónicas de la región.' },
  ],

  // Club CIMA: suscripción mensual. Pon el precio en bolivianos cuando lo definas (null = "Consultar precio").
  club: {
    pago: 'Pago mensual por QR o transferencia. Entregas en La Paz y El Alto.',
    planes: [
      {
        id: 'club',
        nombre: 'Club CIMA',
        precio: null,
        destacado: true,
        beneficios: [
          'Plantines frescos de CIMA cada mes',
          'Nutrientes A + B + C según lo que consume tu sistema',
          'Asesoría por WhatsApp cuando la necesites',
        ],
      },
      {
        id: 'plus',
        nombre: 'Club CIMA Plus',
        precio: null,
        beneficios: [
          'Todo lo del Club CIMA',
          'Visita técnica cada 3 meses',
          'Revisión de pH y EC con medidor profesional',
          'Acceso al curso de hidroponía para principiantes',
        ],
      },
      {
        id: 'cuotas',
        nombre: 'Tu sistema en cuotas',
        precio: null,
        beneficios: [
          'Torre (Bs 650) o sistema NFT (Bs 850) pagado en cuotas mensuales',
          'Club CIMA incluido mientras pagas tus cuotas',
          'Instalación y primera siembra con nosotros',
        ],
      },
    ],
  },
};
