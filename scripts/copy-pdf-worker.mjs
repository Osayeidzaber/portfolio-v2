import { mkdir, copyFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const source = dirname(require.resolve("pdfjs-dist/package.json"))
const destination = new URL("../public/oz-studio/", import.meta.url)
await mkdir(destination, { recursive: true })
await copyFile(join(source, "build/pdf.worker.min.mjs"), new URL("pdf.worker.min.mjs", destination))
await copyFile(join(source, "LICENSE"), new URL("pdfjs-LICENSE", destination))
console.log("[pdf] viewer worker synced with installed PDF.js")
