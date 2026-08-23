#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
# shellcheck source=./upstream-map.sh
source "$ROOT/scripts/upstream-map.sh"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
UPSTREAM="$TMP_DIR/matt-skills"

UPSTREAM_REF="${1:-main}"

git clone --quiet https://github.com/mattpocock/skills.git "$UPSTREAM"
if [[ "$UPSTREAM_REF" != "main" ]]; then
  git -C "$UPSTREAM" checkout --quiet --detach "$UPSTREAM_REF"
fi

mkdir -p "$ROOT/skills"

for mapping in "${UPSTREAM_SKILL_MAP[@]}"; do
  source_path="${mapping%%|*}"
  skill_name="${mapping##*|}"
  source_dir="$UPSTREAM/$source_path"
  destination="$ROOT/skills/$skill_name"

  if [[ ! -f "$source_dir/SKILL.md" ]]; then
    echo "Missing upstream skill: $source_path" >&2
    exit 1
  fi

  rm -rf "$destination"
  cp -R "$source_dir" "$destination"
  echo "Synced: $skill_name"
done

git -C "$UPSTREAM" rev-parse HEAD > "$ROOT/UPSTREAM_COMMIT"
cp "$UPSTREAM/LICENSE" "$ROOT/MATT_LICENSE"

echo "Pinned upstream: $(cat "$ROOT/UPSTREAM_COMMIT")"
