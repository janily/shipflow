#!/usr/bin/env bash
set -euo pipefail

AGENT="claude-code"
SCOPE_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent)
      AGENT="${2:?--agent requires a value}"
      shift 2
      ;;
    -g|--global)
      SCOPE_ARGS+=("-g")
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

echo "Installing Matt Pocock upstream skills..."
npx skills@latest add mattpocock/skills \
  --skill setup-matt-pocock-skills \
  --skill grill-with-docs \
  --skill grilling \
  --skill domain-modeling \
  --skill to-spec \
  --skill to-tickets \
  --skill implement \
  --skill tdd \
  --skill code-review \
  -a "$AGENT" "${SCOPE_ARGS[@]}" -y

echo "Installing ShipFlow orchestrator..."
npx skills@latest add janily/shipflow \
  --skill shipflow \
  -a "$AGENT" "${SCOPE_ARGS[@]}" -y

echo
printf 'ShipFlow installed for %s.\n' "$AGENT"
echo "In each repository, run /setup-matt-pocock-skills once before first use and choose Local Markdown when desired."
echo "Then run: /shipflow <your development goal>"
