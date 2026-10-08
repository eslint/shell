# no-useless-cat

Disallow useless `cat` at the start of a pipeline.

## Background

`cat file | cmd` starts an extra process only to copy a file into a pipe. Most commands accept a filename argument (`cmd file`), and every command can read from a redirect (`cmd < file`). Either form is simpler and avoids the extra process.

## Rule Details

This rule warns when the first command of a pipeline is `cat` with exactly one filename argument and no redirects.

The rule doesn't warn when `cat` actually does something, such as concatenating several files or using options like `-n`. It also skips arguments that aren't static text, such as `cat "$file"`.

Examples of **incorrect** code for this rule:

```bash
# eslint shell/no-useless-cat: "error"

cat file.txt | grep error

cat /var/log/syslog | tail -n 20 | grep kernel
```

Examples of **correct** code for this rule:

```bash
# eslint shell/no-useless-cat: "error"

grep error file.txt

grep error < file.txt

cat header.txt body.txt | gzip > out.gz

cat -n file.txt | head
```

## Options

This rule has no options.

## When Not to Use It

Some people prefer `cat file | cmd` because the data reads left to right. If you prefer that style, you can safely disable this rule.

## Prior Art

- [SC2002](https://www.shellcheck.net/wiki/SC2002)
