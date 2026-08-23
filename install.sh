#!/usr/bin/env bash
set -euo pipefail

AGENT="claude-code"
GLOBAL=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent)
      AGENT="${2:?--agent requires a value}"
      shift 2
      ;;
    -g|--global)
      GLOBAL=true
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

install_skills() {
  local source="$1"
  shift

  if [[ "$GLOBAL" == true ]]; then
    npx skills@latest add "$source" "$@" -a "$AGENT" -g -y
  else
    npx skills@latest add "$source" "$@" -a "$AGENT" -y
  fi
}

verify_shipflow() {
  local output

  if [[ "$GLOBAL" == true ]]; then
    output="$(npx skills@latest list -g -a "$AGENT" 2>&1)"
  else
    output="$(npx skills@latest list -a "$AGENT" 2>&1)"
  fi

  if ! printf '%s\n' "$output" | grep -q 'shipflow'; then
    echo "ShipFlow installation verification failed." >&2
    echo "Installed skills reported by the CLI:" >&2
    printf '%s\n' "$output" >&2
    exit 1
  fi
}

echo "ShipFlow installer"
echo "Installing Matt Pocock upstream skills..."
install_skills mattpocock/skills \
  --skill setup-matt-pocock-skills \
  --skill grill-with-docs \
  --skill grilling \
  --skill domain-modeling \
  --skill to-spec \
  --skill to-tickets \
  --skill implement \
  --skill tdd \
  --skill code-review

echo "Installing ShipFlow orchestrator..."
# ShipFlow is a single-skill repository with SKILL.md at the repository root.
# Do not add another --skill discovery/filter step here.
install_skills janily/shipflow

echo "Verifying ShipFlow installation..."
verify_shipflow

echo
printf 'ShipFlow installed and verified for %s.\n' "$AGENT"
echo "In each repository, run /setup-matt-pocock-skills once before first use and choose Local Markdown when desired."
echo "Then run: /shipflow <your development goal>"
