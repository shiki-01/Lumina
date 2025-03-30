import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'
import { searchForWorkspaceRoot } from 'vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        output: {
          format: 'cjs'
        }
      }
    }
  },
  renderer: {
    plugins: [svelte()],
    server: {
      fs: {
        allow: [
          searchForWorkspaceRoot(process.cwd()),
          path.resolve(__dirname, './src/renderer'),
          path.resolve(__dirname, './src/renderer/master.css.ts')
        ]
      }
    }
  }
})
