/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        vexa: {
          black: '#000000',
          white: '#FFFFFF',
          gray900: '#0A0A0A',
          gray700: '#404040',
          gray500: '#737373',
          gray300: '#D4D4D4',
          gray100: '#F5F5F5',
        },
      },
      fontFamily: {
        inter: ['Inter'],
        'inter-bold': ['Inter-Bold'],
        'inter-semibold': ['Inter-SemiBold'],
        'inter-medium': ['Inter-Medium'],
        'inter-light': ['Inter-Light'],
      },
      borderRadius: {
        'vexa': '16px',
        'vexa-sm': '12px',
        'vexa-lg': '24px',
      },
    },
  },
  plugins: [],
};
