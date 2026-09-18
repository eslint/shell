/**
 * @fileoverview Minimal ambient type declarations for the `mvdan-sh` package,
 * a GopherJS build of mvdan.cc/sh. Only the surface used by this package is
 * declared. Struct fields are exposed as properties and positions as
 * method-bearing objects.
 */

declare module "mvdan-sh" {
	interface MvdanPos {
		Line(): number;
		Col(): number;
		Offset(): number;
	}

	/**
	 * A node from the mvdan-sh syntax tree. Fields vary by node type
	 * (discoverable via `syntax.NodeType()`), so this is intentionally
	 * permissive.
	 */
	interface MvdanNode {
		Pos(): MvdanPos;
		End(): MvdanPos;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- GopherJS objects are untyped.
		[field: string]: any;
	}

	interface MvdanParser {
		Parse(source: string, name: string): MvdanNode;
	}

	interface MvdanSyntax {
		NewParser(...options: unknown[]): MvdanParser;
		NodeType(node: unknown): string;
		Walk(
			node: MvdanNode,
			visitor: (node: MvdanNode | null) => boolean,
		): void;
		KeepComments(enabled: boolean): unknown;
		Variant(lang: number): unknown;
		LangBash: number;
		LangPOSIX: number;
		LangMirBSDKorn: number;
	}

	const mvdan: {
		syntax: MvdanSyntax;
	};

	export default mvdan;
}
