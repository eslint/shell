/**
 * @fileoverview A test-only plugin with rules that exercise the Bash
 * language independently of the rules shipped by the plugin.
 */

import type { BashRuleDefinition, CommandNode } from "../../src/index.js";

/**
 * Creates a rule that reports every simple command with the given name.
 */
function createCommandRule(
	commandName: string,
): BashRuleDefinition<{ MessageIds: "found" }> {
	return {
		meta: {
			type: "problem",
			schema: [],
			messages: {
				found: `Unexpected '${commandName}' command.`,
			},
		},

		create(context) {
			return {
				Command(node: CommandNode) {
					const [part] = node.name?.parts ?? [];

					if (
						part?.type === "Literal" &&
						part.value === commandName
					) {
						context.report({ node, messageId: "found" });
					}
				},
			};
		},
	};
}

export default {
	rules: {
		"no-forbidden": createCommandRule("forbidden"),
		"no-deprecated": createCommandRule("deprecated"),
	},
};
