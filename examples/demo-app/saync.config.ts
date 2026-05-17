/**
 * Saync config for the demo-app. `saync start` picks this up
 * automatically.
 */
export default {
  appUrl: 'http://localhost:5173',
  port: 3777,
  watch: ['src/**/*.{ts,tsx}'],
  mode: 'local' as const,
};
