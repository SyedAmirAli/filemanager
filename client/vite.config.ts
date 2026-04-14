import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const PRODUCTION_SERVER_URL = 'https://filemanager.syedamirali.me';

export default defineConfig(({ mode }) => ({
    plugins: [
        react(),
        {
            name: 'html-inject-server-url',
            transformIndexHtml(html) {
                const url = mode === 'production' ? PRODUCTION_SERVER_URL : '';
                return html.replace(/__SERVER_URL__/g, JSON.stringify(url));
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
