import {defineConfig} from 'tsup'

export default defineConfig({
  dts: true,
  clean: true,
  minify: false,
  splitting: false,
  format: ['esm', 'cjs'],
  entry: ['src/index.ts']
})
