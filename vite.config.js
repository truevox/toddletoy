import { defineConfig } from 'vite'
import { readFileSync } from 'fs'
import { VitePWA } from 'vite-plugin-pwa'

// Read version from package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))
const version = packageJson.version

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist'
  },
  server: {
    port: 4001,
    open: true,
    historyApiFallback: true
  },
  define: {
    // Inject version as environment variable
    __APP_VERSION__: JSON.stringify(version)
  },
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: '.',
      filename: 'sw.js',
      injectRegister: false,
      registerType: 'prompt',
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2,ttf,otf}'],
        // emojis.json/things.json are bundled directly into the JS at build
        // time (see src/game.js) and are no longer fetched at runtime, so
        // precaching them separately would just be dead weight.
        globIgnores: ['emojis.json', 'things.json']
      }
    })
  ]
});
