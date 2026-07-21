/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        yt: {
          bg: '#212121',
          surface: '#0f0f0f',
          chip: 'rgba(255,255,255,0.1)',
          muted: '#aaaaaa',
          red: '#FF0000',
        },
      },
    },
  },
  plugins: [],
};
