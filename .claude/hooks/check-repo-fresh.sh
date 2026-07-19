#!/bin/bash
# SessionStart hook: warn when this checkout is stale or carrying leftovers.
# Why: the owner runs parallel Claude sessions (cloud/web) that push to main,
# so this Mac's checkout silently falls behind — on 2026-07-18 an audit ran
# against v0.45 while origin/main was at v0.65. This makes that impossible
# to miss again. Silent when everything is clean.
# Checks both directions: BEHIND (stale code) and AHEAD (unpushed commits that
# other sessions cannot see). Ahead was added after those two failure modes
# combined into a full divergence on 2026-07-18/19.
cd "$(dirname "$0")/../.." || exit 0

git fetch --quiet origin 2>/dev/null   # offline is fine — falls back to cached refs

behind=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)
ahead=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)
dirty=$(git status --porcelain --untracked-files=no 2>/dev/null | wc -l | tr -d ' ')
stashes=$(git stash list 2>/dev/null | wc -l | tr -d ' ')

msg=""
[ "${behind:-0}" -gt 0 ] && msg="⚠️ Checkout is $behind commit(s) BEHIND origin/main — pull before doing anything (other sessions push here)."
# Unpushed commits were this hook's blind spot, and they caused the 18 Jul
# divergence: five local commits (v0.66-v0.70) were made and never pushed, so a
# later cloud session started from the last PUSHED commit and redid the same
# SESSION_LOG to-do list. Committed-but-unpushed is invisible to every other
# session, so flag it as loudly as being behind.
[ "${ahead:-0}" -gt 0 ] && msg="$msg ⚠️ $ahead local commit(s) NOT PUSHED to origin/main — push them, or a parallel session will start from stale code and duplicate the work."
[ "${behind:-0}" -gt 0 ] && [ "${ahead:-0}" -gt 0 ] && msg="$msg 🔴 Branch has DIVERGED (both ahead and behind) — reconcile before starting new work; do not just pull."
[ "${dirty:-0}" -gt 0 ] && msg="$msg ⚠️ $dirty tracked file(s) carry uncommitted changes from a previous session — commit, stash, or discard them first."
[ "${stashes:-0}" -gt 0 ] && msg="$msg ℹ️ $stashes stash(es) parked (see: git stash list)."

if [ -n "$msg" ]; then
  # No jq on this machine; msg is script-controlled (no quotes/backslashes),
  # so printf-built JSON is safe here.
  printf '{"systemMessage":"%s","hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$msg" "$msg"
fi
exit 0
