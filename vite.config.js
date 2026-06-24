import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Strips remote-script URLs that ship inside bundled dependencies (e.g. jsPDF's
// optional PDFObject preview, which we never use). Manifest V3 forbids any
// reference to remotely hosted code in the package, and the Web Store scanner
// rejects the bundle if it finds these literals. We only call jsPDF's local
// save()/output paths, so blanking these strings is safe.
const stripRemoteUrls = () => ({
    name: 'strip-remote-urls',
    enforce: 'post',
    renderChunk(code) {
        const urls = [
            'https://cdnjs.cloudflare.com/ajax/libs/pdfobject/2.1.1/pdfobject.min.js',
            'https://github.com/foliojs/pdfkit/blob/master/lib/security.js',
        ]
        let out = code
        for (const url of urls) out = out.split(url).join('')
        return out === code ? null : { code: out, map: null }
    },
})

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), stripRemoteUrls()],
    build: {
        rollupOptions: {
            input: {
                dashboard: resolve(__dirname, 'dashboard.html'),
            },
        },
    },
})
