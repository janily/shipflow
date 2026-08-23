#!/usr/bin/env bash
set -euo pipefail

INSTALLER_VERSION="1.0.1"
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

expected_shipflow_path() {
  case "$AGENT" in
    codex)
      if [[ "$GLOBAL" == true ]]; then
        printf '%s\n' "${CODEX_HOME:-$HOME/.codex}/skills/shipflow/SKILL.md"
      else
        printf '%s\n' ".agents/skills/shipflow/SKILL.md"
      fi
      ;;
    cursor)
      if [[ "$GLOBAL" == true ]]; then
        printf '%s\n' "$HOME/.cursor/skills/shipflow/SKILL.md"
      else
        printf '%s\n' ".agents/skills/shipflow/SKILL.md"
      fi
      ;;
    claude-code)
      if [[ "$GLOBAL" == true ]]; then
        printf '%s\n' "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills/shipflow/SKILL.md"
      else
        printf '%s\n' ".claude/skills/shipflow/SKILL.md"
      fi
      ;;
    *)
      printf '%s\n' ""
      ;;
  esac
}

verify_shipflow() {
  local expected_path output
  expected_path="$(expected_shipflow_path)"

  if [[ -n "$expected_path" && -f "$expected_path" ]]; then
    echo "Verified: $expected_path"
    return 0
  fi

  if [[ "$GLOBAL" == true ]]; then
    output="$(npx skills@latest list -g -a "$AGENT" 2>&1 || true)"
  else
    output="$(npx skills@latest list -a "$AGENT" 2>&1 || true)"
  fi

  if printf '%s\n' "$output" | grep -qi 'shipflow'; then
    echo "Verified: shipflow is present in the skills CLI list."
    return 0
  fi

  echo "ShipFlow installation verification failed." >&2
  if [[ -n "$expected_path" ]]; then
    echo "Expected file: $expected_path" >&2
  fi
  echo "Installed skills reported by the CLI:" >&2
  printf '%s\n' "$output" >&2
  exit 1
}

echo "ShipFlow installer ${INSTALLER_VERSION}"
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
# ShipFlow is a single skill. Install the SKILL.md directly instead of relying
# on repository discovery. The timestamp also avoids stale CDN/proxy responses.
SHIPFLOW_SKILL_URL="https://raw.githubusercontent.com/janily/shipflow/main/SKILL.md?ts=$(date +%s)"
install_skills "$SHIPFLOW_SKILL_URL"

echo "Verifying ShipFlow installation..."
verify_shipflow

echo
printf 'ShipFlow installed and verified for %s.\n' "$AGENT"
echo "In each repository, run /setup-matt-pocock-skills once before first use and choose Local Markdown when desired."
echo "Then run: /shipflow <your development goal>"
