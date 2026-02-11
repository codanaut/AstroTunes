import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: 'index.html'
		}),
		paths: {
			// This prefix is required for GitHub Pages subfolder hosting
			base: '/astrotunes',
		}
	}
};

export default config;