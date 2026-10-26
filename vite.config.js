// Configuración de Vite
// El servidor de la NASA no permite que el navegador pida su JSON directamente (no envía CORS),
// así que Vite hace de intermediario: /nasa/... → https://mars.nasa.gov/...
export default {
  server: {
    port: 5173,
    proxy: {
      '/nasa': {
        target: 'https://mars.nasa.gov',
        changeOrigin: true,
        rewrite: (ruta) => ruta.replace(/^\/nasa/, ''),
      },
    },
  },
};
