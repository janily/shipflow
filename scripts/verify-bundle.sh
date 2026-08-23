#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
# shellcheck source=./upstream-map.sh
source "$ROOT/scripts/upstream-map.sh"

if [[ -f "$ROOT/SKILL.md" ]]; then
  echo "Root SKILL.md must not exist in a multi-skill bundle." >&2
  exit 1
fi

if [[ -f "$ROOT/install.sh" ]]; then
  echo "Custom install.sh must not exist; use npx skills." >&2
  exit 1
fi

verify_skill() {
  local skill="$1"
  local file="$ROOT/skills/$skill/SKILL.md"
  [[ -s "$file" ]] || { echo "Missing: $file" >&2; return 1; }
  grep -Eq "^name:[[:space:]]*${skill}[[:space:]]*$" "$file" || {
    echo "Frontmatter name mismatch: $file" >&2
    return 1
  }
}

verify_skill shipflow
for mapping in "${UPSTREAM_SKILL_MAP[@]}"; do
  verify_skill "${mapping##*|}"
done

[[ -s "$ROOT/UPSTREAM_COMMIT" ]] || { echo "UPSTREAM_COMMIT is missing." >&2; exit 1; }
[[ -s "$ROOT/MATT_LICENSE" ]] || { echo "MATT_LICENSE is missing." >&2; exit 1; }

echo "Bundle structure verified: ShipFlow + ${#UPSTREAM_SKILL_MAP[@]} upstream skills."
