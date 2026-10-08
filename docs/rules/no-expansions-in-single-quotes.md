# no-expansions-in-single-quotes

Disallow expansion-like syntax inside single quotes, where it is not expanded.

## Background

Inside single quotes, the shell treats every character literally. Variables, command substitutions, and backticks are not expanded, so `'$HOME'` is the five characters `$HOME`, not your home directory. Writing an expansion inside single quotes is usually a mistake where double quotes were intended.

## Rule Details

This rule warns when a single-quoted string contains text that looks like an expansion: `$name`, `${...}`, `$(...)`, or text wrapped in a pair of backticks.

The rule does not warn about:

- Positional-style references such as `$1`. These are common in `awk` and `sed` programs, where single quotes are used on purpose so the shell leaves them alone.
- A `$` followed by a digit or punctuation, such as `'costs $5'`.
- ANSI-C quoted strings (`$'...'`).

Examples of **incorrect** code for this rule:

```bash
# eslint shell/no-expansions-in-single-quotes: "error"

echo 'Hello, $USER'

echo 'Home is ${HOME}'

echo 'Today is $(date)'

echo 'Run `make` first'
```

Examples of **correct** code for this rule:

```bash
# eslint shell/no-expansions-in-single-quotes: "error"

echo "Hello, $USER"

awk '{ print $1 }' data.txt

echo 'That costs $5'

echo $'Tab:\there'
```

## Options

This rule has no options.

## When Not to Use It

Sometimes single quotes are used precisely to delay expansion, for example `trap 'rm -f $tmpfile' EXIT` or `sh -c 'echo $HOME'`. This rule is set to `"warn"` in the recommended configuration for that reason. If your scripts frequently pass shell code as strings, you can disable this rule or use a disable comment for those lines.

## Prior Art

- [SC2016](https://www.shellcheck.net/wiki/SC2016)
