/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
    'autoprefixer': {}, // Include autoprefixer to ensure cross-browser compatibility
  },
};
export default config;