#!/bin/zsh
# Runs every round-8 batch, eight at a time. Finished batches are skipped by dispatch.sh.
cd /Users/congwang/Projects/recipes
seq 0 15 | xargs -P 8 -I{} zsh docs/round8/dispatch.sh {}
