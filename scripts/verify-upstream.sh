#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
# shellcheck source=./upstream-map.sh
source "$ROOT/scripts/upstream-map.sh"

UPSTREAM_COMMIT="$(tr -d '[:space:]' < "$ROOT/UPSTREAM_COMMIT")"
[[ -n "$UPSTREAM_COMMIT" ]] || { echo "UPSTREAM_COMMIT is empty." >&2; exit 1; }

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
UPSTREAM="$TMP_DIR/matt-skills"

git clone --quiet https://github.com/mattpocock/skills.git "$UPSTREAM"
git -C "$UPSTREAM" checkout --quiet --detach "$UPSTREAM_COMMIT"

for mapping in "${UPSTREAM_SKILL_MAP[@]}"; do
  source_path="${mapping%%|*}"
  skill_name="${mapping##*|}"
  if ! diff -qr "$UPSTREAM/$source_path" "$ROOT/skills/$skill_name" >/dev/null; then
    echo "Mirror differs from Matt upstream: $skill_name" >&2
    diff -qr "$UPSTREAM/$source_path" "$ROOT/skills/$skill_name" >&2 || true
    exit 1
  fi
done

cmp -s "$UPSTREAM/LICENSE" "$ROOT/MATT_LICENSE" || {
  echo "MATT_LICENSE differs from the pinned upstream license." >&2
  exit 1
}

echo "Upstream mirror verified at $UPSTREAM_COMMIT."
