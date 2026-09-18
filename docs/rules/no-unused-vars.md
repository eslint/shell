# no-unused-vars

Disallow variables that are assigned but never used.

## Background

A variable that is assigned but never read is usually a sign of a bug: a misspelled name (`colour=red` followed by `echo "$color"`), leftover code from a refactor, or a value that was meant to be used later. Removing unused variables also makes scripts easier to follow.

## Rule Details

This rule warns about variables that are assigned somewhere in the file but never read anywhere in the file.

A variable counts as assigned by:

- an assignment, including `declare`, `local`, `typeset`, and array element assignments such as `arr[1]=x`;
- the variable of a `for` loop;
- the variable names passed to `read`, `mapfile`, `readarray`, or `getopts`;
- an arithmetic assignment such as `(( total = 1 + 2 ))` or `(( count++ ))`.

A variable counts as used when:

- it is expanded with `$name` or `${...}`;
- it appears by name in arithmetic, as in `$((count + 1))`;
- it is passed to `unset`, `export`, or `readonly`;
- it is exported, with `export` or `declare -x`;
- it is assigned as an environment prefix to a command, as in `LC_ALL=C sort`.

The rule never warns about:

- names that start with `_`;
- special variables that the shell or common tools read, such as `IFS`, `PATH`, `PS1`, `OPTIND`, `REPLY`, and the `LC_*` variables;
- names listed in the `allowed` option.

If a file uses `eval`, `source` (or `.`), or a nameref (`declare -n`), this rule doesn't report anything in that file, because variables may be read in ways that static analysis can't see.

The rule analyzes the whole file at once and doesn't model function scope. For example, an unused `local x` inside a function isn't reported if some other `x` is read elsewhere in the file. Indirect references such as `${!ref}` count as a use of `ref` only, not of the variable it points to.

Examples of **incorrect** code for this rule:

```bash
# eslint shell/no-unused-vars: "error"

count=0

read -r first second

for i in 1 2 3; do echo "hello"; done

(( total = price * 2 ))
```

Examples of **correct** code for this rule:

```bash
# eslint shell/no-unused-vars: "error"

name="world"
echo "Hello, $name"

read -r first _rest
echo "$first"

for i in 1 2 3; do echo "$i"; done

export API_URL=https://example.com

LC_ALL=C sort data.txt

IFS=,

_ignored=1
```

## Options

This rule has one object option:

- `allowed` (default: `[]`): an array of variable names to never report. This is useful for variables that are read by other scripts that source this one.

Examples of **correct** code for this rule with `{ "allowed": ["VERSION"] }`:

```bash
# eslint shell/no-unused-vars: ["error", { "allowed": ["VERSION"] }]

VERSION=1.2.3
```

## When Not to Use It

Scripts that are meant to be sourced by other scripts often define variables for the caller to use. The rule can't see those uses, so it reports the variables as unused. For such files, use the `allowed` option, prefix the names with `_`, or disable this rule.

## Prior Art

- [SC2034](https://www.shellcheck.net/wiki/SC2034)
