import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";

export default {
	input: "./src/browser.ts",
	output: {
		dir: "browser",
		format: "iife",
	},
	plugins: [
		typescript({
			tsconfig: "tsconfig.browser.json",
		}),
		nodeResolve(),
		commonjs(),
		terser(),
	],
};
