import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import dsv from "@rollup/plugin-dsv";
import path from "path";

export default defineConfig({
	plugins: [sveltekit(), dsv()],
	resolve: {
		alias: {
			$data: path.resolve("./src/data"),
			$styles: path.resolve("./src/styles"),
		}
	},
});
