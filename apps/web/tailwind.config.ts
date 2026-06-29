import type { Config } from 'tailwindcss';

// Paleta clara y amigable. Acentos tomados de la marca Build4Venezuela
// (rojo / amarillo / azul de la bandera) sobre una base de papel neutra.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Superficies (tema claro)
        paper: '#f4f5f7', // fondo de la app
        surface: '#ffffff', // tarjetas
        ink: '#15181e', // texto principal
        muted: '#5d6675', // texto secundario
        line: '#e5e7ec', // bordes suaves

        // Marca (acentos). Versiones "ink" para texto legible sobre blanco.
        coral: '#ef3b56', // rojo bandera
        coralInk: '#c0182f',
        amber: '#fcd43d', // amarillo bandera
        amberInk: '#946400',
        sky: '#6fcaef', // azul bandera
        skyInk: '#136a98',
        wa: '#25d366', // verde WhatsApp (canal ciudadano)
        waInk: '#0e8a45',

        // Prioridades (legibles sobre fondo claro)
        prio: {
          critica: '#e11d3f',
          alta: '#ea6a0a',
          media: '#b07d00',
          baja: '#136a98',
        },
      },
      fontFamily: {
        // Fuente de campaña para títulos, datos y etiquetas.
        display: ['var(--font-display)', 'ui-monospace', 'monospace'],
        // Cuerpo legible y liviano (sin descargas extra → offline-first).
        sans: [
          'var(--font-body)',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.2rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(21, 24, 30, 0.04), 0 8px 24px -16px rgba(21, 24, 30, 0.18)',
        pop: '0 12px 40px -12px rgba(21, 24, 30, 0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
