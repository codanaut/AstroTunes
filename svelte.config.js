import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: 'index.html'
		}),
		paths: {
			// Change 'astrotunes' to your exact GitHub repository name
			base: process.env.NODE_ENV === 'production' ? '/astrotunes' : '',
		}
	}
};

export default config;