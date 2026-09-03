/** @type {import('tailwindcss').Config} */
export default {
  /* 터치 기기에서 hover 스타일이 남지 않게 한다 */
  future: { hoverOnlyWhenSupported: true },
  content: ['./index.html', './games/**/*.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
