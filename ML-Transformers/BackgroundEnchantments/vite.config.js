const path = require('path')
const { defineConfig } = require('vite')

module.exports = defineConfig({
  root: path.join(__dirname, "./"),
  publicDir: path.join(__dirname, "public"),
  build: {
    outDir: path.join(__dirname, "dist"),
    emptyOutDir: true
  }
})
