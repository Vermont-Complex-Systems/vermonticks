import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import dsv from '@rollup/plugin-dsv';
import path from 'path';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), dsv()],
	resolve: {
		alias: {
			$data: path.resolve('./src/data'),
			$styles: path.resolve('./src/styles')
		}
	}
});
