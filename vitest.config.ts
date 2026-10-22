/**
 * @fileoverview Vitest configuration file.
 * @author Claude Opus 5.5
 */

//------------------------------------------------------------------------------
// Imports
//------------------------------------------------------------------------------

import { defineConfig } from "vitest/config";

//------------------------------------------------------------------------------
// Exports
//------------------------------------------------------------------------------

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.spec.ts", "tests/**/*.test.ts"],
		coverage: {
			provider: "v8",
			include: ["src/**/*.ts"],
			exclude: ["src/**/*.spec.ts", "src/**/*.d.ts"],
		},
	},
});
