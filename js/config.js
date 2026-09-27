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
};
