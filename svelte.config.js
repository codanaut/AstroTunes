import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			// Changed from index.html to 404.html to better handle 
			// GitHub Pages' specific routing behavior
			fallback: '404.html'
		}),
		paths: {
			// This reads the BASE_PATH set in your GitHub Action
			base: process.argv.includes('dev') ? '' : process.env.BASE_PATH
		}
	}
};

export default config;