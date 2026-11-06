// Pegar dentro de theme.extend en tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        quinn: {
          navy: '#0B1F3A',
          amber: '#F5A524',
          blue: '#2563C9',
          sky: '#DCE8FA',
          'amber-soft': '#FDEBC8',
          ink: '#1E2633',
          slate: '#5A6475',
          line: '#DDE2EA',
          mist: '#F3F5F9',
          success: '#1A7F55',
          error: '#C2372F',
        },
      },
      fontFamily: {
        sans: ['Lato', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        bubble: '18px',
      },
    },
  },
};
