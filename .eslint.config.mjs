/* eslint-env node */

export default {
  rules: {
    'import/order': 'error', // Import organization
    // INTERNAL: prevent double transforms on Animated components
    'internal/no-double-transform': 'warn',
  },
  plugins: {
    internal: {
      rules: {
        // eslint-disable-next-line no-undef
        'no-double-transform': require('./eslint-rules/noDoubleTransform.js'),
      },
    },
  },
}; 