#!/usr/bin/env bash
set -euo pipefail

INSTALLER_VERSION="1.1.0"
AGENT="claude-code"
GLOBAL=false
SHIPFLOW_SKILL_URL="https://raw.githubusercontent.com/janily/shipflow/main/SKILL.md"
TMP_FILE=""

cleanup() {
  if [[ -n "${TMP_FILE:-}" && -f "$TMP_FILE" ]]; then
    rm -f "$TMP_FILE"
  fi
}
trap cleanup EXIT

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

case "$AGENT" in
  claude-code|codex|cursor) ;;
  *)
    echo "Unsupported agent: $AGENT" >&2
    echo "Supported agents: claude-code, codex, cursor" >&2
    exit 2
    ;;
esac

install_upstream_skills() {
  if [[ "$GLOBAL" == true ]]; then
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
      -a "$AGENT" -g -y
  else
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
      -a "$AGENT" -y
  fi
}

shipflow_path() {
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
  esac
}

install_shipflow() {
  local destination destination_dir
  destination="$(shipflow_path)"
  destination_dir="$(dirname "$destination")"
  TMP_FILE="$(mktemp)"

  echo "Downloading ShipFlow SKILL.md..."
  curl -fL --retry 3 --retry-delay 1 \
    -H 'Cache-Control: no-cache' \
    "${SHIPFLOW_SKILL_URL}?ts=$(date +%s)" \
    -o "$TMP_FILE"

  if ! grep -Eq '^name:[[:space:]]*shipflow[[:space:]]*$' "$TMP_FILE"; then
    echo "Downloaded file is not a valid ShipFlow SKILL.md." >&2
    exit 1
  fi

  mkdir -p "$destination_dir"
  cp "$TMP_FILE" "$destination"
  chmod 0644 "$destination"

  echo "Installed ShipFlow: $destination"
}

verify_shipflow() {
  local destination
  destination="$(shipflow_path)"

  if [[ ! -s "$destination" ]]; then
    echo "ShipFlow installation verification failed: file missing." >&2
    echo "Expected: $destination" >&2
    exit 1
  fi

  if ! grep -Eq '^name:[[:space:]]*shipflow[[:space:]]*$' "$destination"; then
    echo "ShipFlow installation verification failed: invalid SKILL.md." >&2
    echo "File: $destination" >&2
    exit 1
  fi

  echo "Verified ShipFlow: $destination"
}

echo "ShipFlow installer ${INSTALLER_VERSION}"
echo "Installing Matt Pocock upstream skills..."
install_upstream_skills

echo "Installing ShipFlow orchestrator..."
install_shipflow

echo "Verifying ShipFlow installation..."
verify_shipflow

echo
printf 'ShipFlow installed and verified for %s.\n' "$AGENT"
echo "Run /setup-matt-pocock-skills once per repository, then use: /shipflow <your development goal>"
