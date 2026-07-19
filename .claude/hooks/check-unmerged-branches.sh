#!/bin/bash
# SessionStart hook: list remote branches that carry commits NOT yet on
# origin/main, so Claude proactively tells the owner and offers to merge them.
# Why: the owner thinks of branches as finished features waiting to land, and
# was surprised that work (e.g. the Generate brief reorder) sat unmerged on a
# side branch while the live app never got it. This surfaces that every session.
# Branches under archive/ are deliberately retired snapshots — skip them.
# Silent when every branch is already merged into main.
cd "$(dirname "$0")/../.." || exit 0

git fetch --quiet origin 2>/dev/null   # offline is fine — falls back to cached refs

summary=""
count=0
for ref in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin 2>/dev/null); do
  case "$ref" in
    origin/main|origin/HEAD|origin/archive/*) continue ;;
  esac
  ahead=$(git rev-list --count "origin/main..$ref" 2>/dev/null || echo 0)
  if [ "${ahead:-0}" -gt 0 ]; then
    name="${ref#origin/}"
    subj=$(git log -1 --format='%s' "$ref" 2>/dev/null)
    summary="$summary • $name ($ahead ahead) — latest: $subj\\n"
    count=$((count + 1))
  fi
done

if [ "$count" -gt 0 ]; then
  msg="🌿 $count branch(es) have commits NOT on main. Tell the owner and ask which (if any) to merge — do NOT merge automatically; some branches are experiments, superseded, or unrelated apps:\\n$summary"
  # No jq on this machine; the message is script-controlled (branch names and
  # commit subjects only), so printf-built JSON is acceptable. Escape any stray
  # double-quotes from commit subjects so the JSON stays valid.
  safe=$(printf '%s' "$msg" | sed 's/"/\\"/g')
  printf '{"systemMessage":"%s","hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$safe" "$safe"
fi
exit 0
