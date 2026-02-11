import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: 'index.html' //
		}),
		paths: {
			// This ensures the JS looks in /astrotunes/ instead of /
			base: process.env.NODE_ENV === 'production' ? '/astrotunes' : '',
			relative: true
		}
	}
};

export default config;