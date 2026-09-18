# require-read-r

Require `read -r` so backslashes are not mangled.

## Background

By default, `read` treats backslashes in its input as escape characters: it removes them and joins lines that end in a backslash. Input such as `C:\temp` or a line ending in `\` is silently changed. The `-r` option makes `read` keep backslashes as they are, which is almost always what you want.

## Rule Details

This rule warns about `read` commands that don't pass the `-r` option. The option can appear alone (`-r`) or combined with other short options (`-rs`), anywhere before `--`.

This rule is autofixable: it inserts `-r` immediately after `read`.

Examples of **incorrect** code for this rule:

```bash
# eslint bash/require-read-r: "error"

read line

read -p "Name: " name

while read line; do echo "$line"; done < input.txt
```

Examples of **correct** code for this rule:

```bash
# eslint bash/require-read-r: "error"

read -r line

read -r -p "Name: " name

read -rs password

while IFS= read -r line; do echo "$line"; done < input.txt
```

## Options

This rule has no options.

## When Not to Use It

If you intentionally want `read` to interpret backslash escapes, for example to allow line continuations in input, you can disable this rule for those lines.

## Prior Art

- [SC2162](https://www.shellcheck.net/wiki/SC2162)
