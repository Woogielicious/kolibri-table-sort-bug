import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * base:
 *   lokal  → "/"
 *   GitHub Pages (Project Page) → "/<repo-name>/"
 * Der Workflow .github/workflows/deploy.yml setzt VITE_BASE_PATH automatisch
 * auf den Repository-Namen.
 */
export default defineConfig({
	base: process.env.VITE_BASE_PATH ?? '/',
	plugins: [react()],
	server: {
		port: 5173,
		open: true,
	},
});
