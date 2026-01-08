import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// adapter-static config for SPA mode
		adapter: adapter({
			// vital for Tauri: it generates a single index.html for all routes
			fallback: 'index.html' 
		})
	}
};

export default config;