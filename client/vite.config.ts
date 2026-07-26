import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	base: "/not-diep",
	server: {
		port: 5441,
		strictPort: true,
		allowedHosts: ["huey.ckefgisc.org"]
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			paths: {
				base: "/not-diep"
			},
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	]
});
