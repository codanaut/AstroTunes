import adapter from '@sveltejs/adapter-static';

const config = {
	kit: {
		adapter: adapter({
			fallback: 'index.html' // Tauri and Docker prefer index.html over 404.html
		}),
		paths: {
			// Only apply a base path if we are specifically building for GH Pages
			base: process.env.NODE_ENV === 'production' && process.env.BASE_PATH ? process.env.BASE_PATH : '',
			relative: !(process.env.NODE_ENV === 'production' && process.env.BASE_PATH) // Absolute paths for GH Pages, relative for Tauri
		}
	}
};

export default config;