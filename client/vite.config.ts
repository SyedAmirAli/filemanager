import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const clientRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(() => ({
    resolve: {
        alias: {
            '@': path.resolve(clientRoot, 'src'),
        },
    },
    plugins: [
        tailwindcss(),
        react(),
        {
            name: 'html-inject-server-url',
            transformIndexHtml(html) {
                /* Empty: same origin as the page (`/api`, Socket.IO on current host). */
                return html.replace(/__SERVER_URL__/g, JSON.stringify(''));
            },
        },
    ],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5180',
                changeOrigin: true,
            },
            '/socket.io': {
                target: 'http://127.0.0.1:5180',
                ws: true,
            },
        },
    },
}));
