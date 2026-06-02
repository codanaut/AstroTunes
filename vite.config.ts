import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import pkg from './package.json';

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version)
	},
	server: {
		host: '0.0.0.0', // or true to expose to all local IPs
		port: 5173,
	},
});