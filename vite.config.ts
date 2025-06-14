import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    electron({
      main: {
        entry: 'src/main/index.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['@electron-toolkit/utils'],
              output: {
                format: 'cjs',
                entryFileNames: '[name].js'
              }
            },
            sourcemap: true,
            minify: false
          }
        }
      },
      preload: {
        input: { 
          preload: path.join(__dirname, 'src/preload/index.ts')
        },
        vite: {
          build: {
            rollupOptions: {
              external: ['electron'],
              output: {
                format: 'esm',
                entryFileNames: '[name].mjs'
              }
            },
            sourcemap: true,
            minify: false
          }
        }
      },
      renderer: {}
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})
