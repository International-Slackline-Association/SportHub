/* eslint-disable import/no-anonymous-default-export */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,css,mjs}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        desktop: '24rem', // 384px
      },
      boxShadow: {
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      colors: {
        primary: 'var(--color-primary)', /* ISA Green */
        primaryDark: 'var(--color-primary-dark)', /* ISA Dark Green */
      },
      spacing: {
        // Define custom spacing if needed - helps maintain consistency
        '0.5': '0.125rem',
        '1': '0.25rem',
        '2': '0.5rem',
        '3': '0.75rem',
        '4': '1rem'
      },
    },
  },
  plugins: [
    // include any additional plugins
  ],
};