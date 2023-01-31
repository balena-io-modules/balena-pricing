import ts from "rollup-plugin-ts";
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
		ts({
			tsconfig: "tsconfig.browser.json",
		}),
		nodeResolve(),
		commonjs(),
		terser(),
	],
};
