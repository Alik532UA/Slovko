import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: undefined,
			precompress: false,
			strict: true
		}),
		paths: {
			// Для GitHub Pages: https://username.github.io/Slovko/
			base: process.env.NODE_ENV === 'production' ? '/Slovko' : ''
		}
	}
};

export default config;
