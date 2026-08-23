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
install_skills janily/shipflow \
  --skill shipflow

echo
printf 'ShipFlow installed for %s.\n' "$AGENT"
echo "In each repository, run /setup-matt-pocock-skills once before first use and choose Local Markdown when desired."
echo "Then run: /shipflow <your development goal>"
