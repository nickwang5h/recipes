#!/bin/zsh
# usage: covers.sh <batch-index> — draws the covers for one batch of batches.json with Codex's image tool,
# then installs them as 1200 px JPEGs and adds cover/coverAlt to each recipe that has none yet.
SP=/private/tmp/claude-501/-Users-congwang-Projects-design-atlas/9ea6e0f3-bcb2-44ad-bcef-5d5a7e615389/scratchpad
R=/Users/congwang/Projects/recipes
I=$1
D=$SP/r8-covers/$(printf %02d $I)
mkdir -p $D
SLUGS=($(python3 -c "import json; print(' '.join(r['slug'] for r in json.load(open('$R/docs/round8/batches.json'))[$I]))"))
TODO=()
for s in $SLUGS; do [ -e $D/$s.png ] || TODO+=($s); done
if (( ${#TODO} )); then
  STYLE=$(sed '/^要画的菜：/,$d' $R/docs/round6/cover-style.txt)
  PROMPT="$STYLE
要画的菜：
$(printf '%s.png\n' $TODO)"
  codex exec -m gpt-6.1-terra --skip-git-repo-check -s workspace-write -C $D --ephemeral -o $D/report.md -- "$PROMPT" < /dev/null > $D/log.txt 2>&1
fi
for s in $SLUGS; do
  [ -e $D/$s.png ] || { echo "missing $s"; continue; }
  [ -e $R/src/assets/covers/recipes/$s.jpg ] || sips -s format jpeg -s formatOptions 80 -Z 1200 $D/$s.png --out $R/src/assets/covers/recipes/$s.jpg > /dev/null
done
echo "covers $I done $(date +%H:%M)" >> $SP/r8/covers.log
