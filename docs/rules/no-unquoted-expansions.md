# no-unquoted-expansions

Require quoting parameter expansions and command substitutions that are subject to word splitting.

## Background

When an expansion such as `$file` or `$(cmd)` is not quoted, Bash splits its value on whitespace and then expands any glob characters in the pieces. A file named `my report.txt` becomes two arguments, and a value containing `*` can turn into a list of unrelated files. Wrapping the expansion in double quotes (`"$file"`) passes the value through as a single argument.

## Rule Details

This rule warns about unquoted parameter expansions (`$var`, `${var}`, `$@`, `$1`, and so on) and command substitutions (`$(...)` and backticks) in positions where word splitting happens:

- a command's name and arguments, including arguments to `[ ... ]`;
- the word list of a `for ... in` loop;
- redirection targets, such as `> $file`.

The rule does not warn about:

- expansions inside double quotes;
- parameters that can't contain whitespace: `$?`, `$$`, `$!`, `$#`, `$-`, and length expansions such as `${#array[@]}`;
- contexts where Bash doesn't split words: variable assignments (`x=$y`), `[[ ... ]]`, `case` subjects, arithmetic such as `$((...))`, and heredoc or herestring redirects (`<<`, `<<-`, `<<<`).

This rule is autofixable when the expansion is the entire word: `$var` becomes `"$var"`. Words that mix an expansion with other text, such as `prefix$var`, are reported but not fixed.

Examples of **incorrect** code for this rule:

```bash
# eslint bash/no-unquoted-expansions: "error"

rm $file

cp $source $destination

for f in $files; do echo "$f"; done

echo $(ls)

sort data.txt > $output

$command --verbose
```

Examples of **correct** code for this rule:

```bash
# eslint bash/no-unquoted-expansions: "error"

rm "$file"

cp "$source" "$destination"

for f in "$@"; do echo "$f"; done

echo "$(ls)"

name=$other

[[ $a == "$b" ]]

echo $? $# ${#items[@]}

echo $((count + 1))

cat <<< $input
```

## Options

This rule has no options.

## When Not to Use It

Occasionally word splitting is intended, such as passing a space-separated list of flags stored in a variable. Prefer an array (`"${flags[@]}"`) in that case; otherwise, use a disable comment for the specific line rather than disabling this rule.

## Prior Art

- [SC2086](https://www.shellcheck.net/wiki/SC2086)
- [SC2046](https://www.shellcheck.net/wiki/SC2046)
