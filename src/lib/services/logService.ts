export const logConfig = {
	auth: false,
	profile: true,
	editor: true,
	store: false,
	game: false,
	sync: true,
};

export const logService = {
	log(category: keyof typeof logConfig, message: string, ...args: any[]) {
		if (logConfig[category]) {
			console.log(`[${category.toUpperCase()}] ${message}`, ...args);
		}
	},
	error(category: keyof typeof logConfig, message: string, ...args: any[]) {
		console.error(`[${category.toUpperCase()}] ${message}`, ...args);
	},
	warn(category: keyof typeof logConfig, message: string, ...args: any[]) {
		console.warn(`[${category.toUpperCase()}] ${message}`, ...args);
	},
};
