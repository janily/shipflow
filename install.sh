#!/usr/bin/env bash
set -euo pipefail

INSTALLER_VERSION="1.2.0"
AGENT="claude-code"
GLOBAL=false
PROJECT_ROOT="$(pwd -P)"
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

shipflow_path() {
  case "$AGENT" in
    codex)
      if [[ "$GLOBAL" == true ]]; then
        printf '%s\n' "${CODEX_HOME:-$HOME/.codex}/skills/shipflow/SKILL.md"
      else
        printf '%s\n' "$PROJECT_ROOT/.agents/skills/shipflow/SKILL.md"
      fi
      ;;
    cursor)
      if [[ "$GLOBAL" == true ]]; then
        printf '%s\n' "$HOME/.cursor/skills/shipflow/SKILL.md"
      else
        printf '%s\n' "$PROJECT_ROOT/.agents/skills/shipflow/SKILL.md"
      fi
      ;;
    claude-code)
      if [[ "$GLOBAL" == true ]]; then
        printf '%s\n' "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills/shipflow/SKILL.md"
      else
        printf '%s\n' "$PROJECT_ROOT/.claude/skills/shipflow/SKILL.md"
      fi
      ;;
  esac
}

verify_shipflow() {
  local destination
  destination="$(shipflow_path)"

  [[ -s "$destination" ]] || return 1
  grep -Eq '^name:[[:space:]]*shipflow[[:space:]]*$' "$destination"
}

install_shipflow_via_cli() {
  local source
  source="${SHIPFLOW_SKILL_URL}?ts=$(date +%s)"

  echo "Trying official skills CLI (direct URL + --copy)..."
  if [[ "$GLOBAL" == true ]]; then
    npx skills@latest add "$source" --copy -a "$AGENT" -g -y
  else
    npx skills@latest add "$source" --copy -a "$AGENT" -y
  fi
}

install_shipflow_fallback() {
  local destination destination_dir
  destination="$(shipflow_path)"
  destination_dir="$(dirname "$destination")"
  TMP_FILE="$(mktemp)"

  echo "Using deterministic file fallback..."
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
}

ensure_shipflow_installed() {
  local destination
  destination="$(shipflow_path)"

  echo "ShipFlow target: $destination"

  if install_shipflow_via_cli; then
    if verify_shipflow; then
      echo "Verified ShipFlow after CLI install: $destination"
      return 0
    fi
    echo "skills CLI returned successfully but ShipFlow file was not found; falling back." >&2
  else
    echo "skills CLI ShipFlow install failed; falling back." >&2
  fi

  install_shipflow_fallback

  if ! verify_shipflow; then
    echo "ShipFlow fallback verification failed." >&2
    echo "Expected: $destination" >&2
    exit 1
  fi

  echo "Verified ShipFlow after fallback: $destination"
}

install_upstream_skills() {
  echo "Installing Matt Pocock upstream skills..."
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

print_final_state() {
  local destination skills_root
  destination="$(shipflow_path)"
  skills_root="$(dirname "$(dirname "$destination")")"

  echo
  echo "Final skill root: $skills_root"
  if [[ -d "$skills_root" ]]; then
    find "$skills_root" -maxdepth 2 -name SKILL.md -print | sort
  fi
}

echo "ShipFlow installer ${INSTALLER_VERSION}"
echo "Project root: $PROJECT_ROOT"

echo "Installing ShipFlow orchestrator first..."
ensure_shipflow_installed

install_upstream_skills

# Verify again after upstream installation so later CLI work cannot silently remove it.
if ! verify_shipflow; then
  echo "ShipFlow disappeared after upstream installation; restoring it." >&2
  install_shipflow_fallback
fi

if ! verify_shipflow; then
  echo "Final ShipFlow verification failed." >&2
  echo "Expected: $(shipflow_path)" >&2
  exit 1
fi

print_final_state

echo
printf 'ShipFlow installed and verified for %s.\n' "$AGENT"
echo "Run /setup-matt-pocock-skills once per repository, then use: /shipflow <your development goal>"
