import cds from '@sap/cds/eslint.config.mjs'
import cdsPlugin from '@sap/eslint-plugin-cds'

export default [
  // UI app has its own lint setup; the rest is generated or build output
  { ignores: ['app/**', 'gen/**', '.deploy/**', 'mta_archives/**', 'mta-op-*/**', '@cds-models/**'] },
  ...cds.recommended,
  cdsPlugin.configs.recommended
]
