#!/bin/bash
# Stop hook: nag while this checkout is carrying commits nobody else can see.
#
# Why this exists on top of the SessionStart check: SessionStart only catches
# unpushed work at the START of the NEXT session on THIS machine. That is too
# late — the owner runs parallel cloud sessions, and one of those can start
# (from the last pushed commit) at any point in between. That is exactly how
# 2026-07-18 went wrong: v0.66-v0.70 were committed here, never pushed, and a
# cloud session rebuilt the same SESSION_LOG to-do list from v0.65.
#
# Deliberately silent unless `ahead > 0`, so it says nothing on a normal turn
# and only speaks in the one state that actually causes divergence. Never
# blocks — it advises, it does not hijack the turn.
cd "$(dirname "$0")/../.." || exit 0

ahead=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)
[ "${ahead:-0}" -eq 0 ] && exit 0

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
printf '{"systemMessage":"⚠️ %s local commit(s) on %s are NOT pushed. Push before this session ends — an unpushed commit is invisible to parallel sessions, which is what caused the 18 Jul divergence."}\n' "$ahead" "$branch"
exit 0
