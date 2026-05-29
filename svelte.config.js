import adapter from "@sveltejs/adapter-static";

const basePath = process.env.BASE_PATH || "/Slovko";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: "build",
			assets: "build",
			fallback: "404.html",
			precompress: false,
			strict: true,
		}),
		paths: {
			base: basePath,
		},
		prerender: {
			handleHttpError: ({ path, referrer, message }) => {
				if (path.endsWith("manifest.json")) {
					return;
				}

				throw new Error(message);
			},
		},
	},
};

export default config;
