import { defineConfig } from 'vite'
import { readFileSync, copyFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'

// Read version from package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))
const version = packageJson.version

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    // Copy service worker after build
    rollupOptions: {
      output: {
        // Ensure we can hook into the build lifecycle
      }
    }
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
    {
      name: 'copy-service-worker',
      closeBundle() {
        // Copy service worker from root to dist after build completes
        try {
          mkdirSync(resolve(__dirname, 'dist'), { recursive: true })
          copyFileSync(
            resolve(__dirname, 'sw.js'),
            resolve(__dirname, 'dist/sw.js')
          )
          console.log('✅ Service worker copied to dist/')
        } catch (error) {
          console.error('❌ Failed to copy service worker:', error)
        }
      }
    }
  ]
});