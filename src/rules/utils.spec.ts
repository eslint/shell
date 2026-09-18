/**
 * @fileoverview Tests for rule helper utilities.
 */

import { describe, expect, it } from "vitest";
import { parseBash } from "../parser/parse.js";
import {
	getCommandName,
	getExpansions,
	getStaticText,
	isCommandNamed,
} from "./utils.js";
import type { CommandNode, WordNode } from "../types.js";

function firstCommand(text: string): CommandNode {
	return parseBash(text).ast.body[0] as CommandNode;
}

function firstArgument(text: string): WordNode {
	const word = firstCommand(text).arguments[0];

	if (!word) {
		throw new Error("Expected an argument");
	}

	return word;
}

describe("getStaticText", () => {
	it("should return plain literal text", () => {
		expect(getStaticText(firstArgument("echo hello\n"))).toBe("hello");
	});

	it("should unquote single-quoted text", () => {
		expect(getStaticText(firstArgument("echo 'a b'\n"))).toBe("a b");
	});

	it("should unquote double-quoted literal text", () => {
		expect(getStaticText(firstArgument('echo "a b"\n'))).toBe("a b");
	});

	it("should join mixed static parts", () => {
		expect(getStaticText(firstArgument("echo pre'mid'\"post\"\n"))).toBe(
			"premidpost",
		);
	});

	it("should return null for words with expansions", () => {
		expect(getStaticText(firstArgument("echo $var\n"))).toBeNull();
		expect(getStaticText(firstArgument('echo "x$var"\n'))).toBeNull();
		expect(getStaticText(firstArgument("echo $(pwd)\n"))).toBeNull();
	});
});

describe("getCommandName", () => {
	it("should return the static command name", () => {
		expect(getCommandName(firstCommand("echo hi\n"))).toBe("echo");
	});

	it("should return null for dynamic names", () => {
		expect(getCommandName(firstCommand("$cmd hi\n"))).toBeNull();
	});

	it("should return null for assignment-only commands", () => {
		expect(getCommandName(firstCommand("x=1\n"))).toBeNull();
	});
});

describe("isCommandNamed", () => {
	it("should match commands by name", () => {
		expect(isCommandNamed(firstCommand("cd /tmp\n"), "cd")).toBe(true);
		expect(isCommandNamed(firstCommand("cd /tmp\n"), "ls")).toBe(false);
	});

	it("should not match non-command statements", () => {
		const statement = parseBash("a | b\n").ast.body[0]!;

		expect(isCommandNamed(statement, "a")).toBe(false);
	});
});

describe("getExpansions", () => {
	it("should return top-level expansions", () => {
		const expansions = getExpansions(firstArgument("echo a$b$(c)\n"));

		expect(expansions).toHaveLength(2);
		expect(expansions[0]?.type).toBe("ParameterExpansion");
		expect(expansions[1]?.type).toBe("CommandSubstitution");
	});

	it("should skip quoted expansions by default", () => {
		const expansions = getExpansions(firstArgument('echo "$a"\n'));

		expect(expansions).toHaveLength(0);
	});

	it("should include quoted expansions when requested", () => {
		const expansions = getExpansions(firstArgument('echo "$a$(b)"\n'), {
			includeQuoted: true,
		});

		expect(expansions).toHaveLength(2);
	});
});
