#!/usr/bin/env bash
set -euo pipefail

INSTALLER_VERSION="2.0.0"
AGENT="claude-code"
GLOBAL=false
PROJECT_ROOT="$(pwd -P)"
SHIPFLOW_SKILL_API="https://api.github.com/repos/janily/shipflow/contents/SKILL.md?ref=main"
MATT_TARBALL_URL="https://api.github.com/repos/mattpocock/skills/tarball/main"
TMP_DIR=""

REQUIRED_UPSTREAM_SKILLS="
setup-matt-pocock-skills
grill-with-docs
grilling
domain-modeling
to-spec
to-tickets
implement
tdd
code-review
"

cleanup() {
  if [[ -n "${TMP_DIR:-}" && -d "$TMP_DIR" ]]; then
    rm -rf "$TMP_DIR"
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

skills_root() {
  case "$AGENT" in
    codex)
      if [[ "$GLOBAL" == true ]]; then
        printf '%s\n' "${CODEX_HOME:-$HOME/.codex}/skills"
      else
        printf '%s\n' "$PROJECT_ROOT/.agents/skills"
      fi
      ;;
    cursor)
      if [[ "$GLOBAL" == true ]]; then
        printf '%s\n' "$HOME/.cursor/skills"
      else
        printf '%s\n' "$PROJECT_ROOT/.agents/skills"
      fi
      ;;
    claude-code)
      if [[ "$GLOBAL" == true ]]; then
        printf '%s\n' "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills"
      else
        printf '%s\n' "$PROJECT_ROOT/.claude/skills"
      fi
      ;;
  esac
}

verify_skill() {
  local skill="$1"
  local file="$(skills_root)/$skill/SKILL.md"
  [[ -s "$file" ]] || return 1
  grep -Eq "^name:[[:space:]]*${skill}[[:space:]]*$" "$file"
}

install_shipflow() {
  local root destination tmp_file
  root="$(skills_root)"
  destination="$root/shipflow"
  tmp_file="$TMP_DIR/shipflow.SKILL.md"

  echo "Downloading ShipFlow..."
  curl -fL --retry 3 --retry-delay 1 \
    -H 'Accept: application/vnd.github.raw+json' \
    -H 'Cache-Control: no-cache' \
    "$SHIPFLOW_SKILL_API" \
    -o "$tmp_file"

  if ! grep -Eq '^name:[[:space:]]*shipflow[[:space:]]*$' "$tmp_file"; then
    echo "Downloaded ShipFlow SKILL.md is invalid." >&2
    exit 1
  fi

  rm -rf "$destination"
  mkdir -p "$destination"
  cp "$tmp_file" "$destination/SKILL.md"
  chmod 0644 "$destination/SKILL.md"

  if ! verify_skill shipflow; then
    echo "Failed to verify ShipFlow after installation." >&2
    exit 1
  fi

  echo "Installed: shipflow"
}

download_matt_source() {
  local archive extract root_candidate
  archive="$TMP_DIR/matt-skills.tar.gz"
  extract="$TMP_DIR/matt-skills"

  echo "Downloading Matt Pocock upstream skills..."
  curl -fL --retry 3 --retry-delay 1 \
    -H 'Cache-Control: no-cache' \
    "$MATT_TARBALL_URL?ts=$(date +%s)" \
    -o "$archive"

  mkdir -p "$extract"
  tar -xzf "$archive" -C "$extract"

  MATT_ROOT=""
  for root_candidate in "$extract"/*; do
    if [[ -d "$root_candidate" ]]; then
      MATT_ROOT="$root_candidate"
      break
    fi
  done

  if [[ -z "$MATT_ROOT" || ! -d "$MATT_ROOT" ]]; then
    echo "Could not locate extracted mattpocock/skills repository." >&2
    exit 1
  fi
}

find_upstream_skill_file() {
  local skill="$1"
  local matches count first

  matches="$(find "$MATT_ROOT" -type f -name SKILL.md -exec grep -l -E "^name:[[:space:]]*${skill}[[:space:]]*$" {} \; || true)"
  count="$(printf '%s\n' "$matches" | awk 'NF { n++ } END { print n + 0 }')"

  if [[ "$count" -ne 1 ]]; then
    echo "Expected exactly one upstream skill named '$skill', found $count." >&2
    if [[ -n "$matches" ]]; then
      printf '%s\n' "$matches" >&2
    fi
    exit 1
  fi

  first="$(printf '%s\n' "$matches" | awk 'NF { print; exit }')"
  printf '%s\n' "$first"
}

install_upstream_skill() {
  local skill="$1"
  local source_file source_dir destination root

  source_file="$(find_upstream_skill_file "$skill")"
  source_dir="$(dirname "$source_file")"
  root="$(skills_root)"
  destination="$root/$skill"

  rm -rf "$destination"
  mkdir -p "$root"
  cp -R "$source_dir" "$destination"

  if ! verify_skill "$skill"; then
    echo "Failed to verify upstream skill: $skill" >&2
    exit 1
  fi

  echo "Installed: $skill"
}

install_all_upstream_skills() {
  local skill
  printf '%s\n' "$REQUIRED_UPSTREAM_SKILLS" | while IFS= read -r skill; do
    [[ -n "$skill" ]] || continue
    install_upstream_skill "$skill"
  done
}

verify_all() {
  local skill failures
  failures=0

  if ! verify_skill shipflow; then
    echo "Missing or invalid: shipflow" >&2
    failures=1
  fi

  printf '%s\n' "$REQUIRED_UPSTREAM_SKILLS" | while IFS= read -r skill; do
    [[ -n "$skill" ]] || continue
    if ! verify_skill "$skill"; then
      echo "Missing or invalid: $skill" >&2
      exit 10
    fi
  done

  [[ "$failures" -eq 0 ]]
}

print_final_state() {
  local root
  root="$(skills_root)"
  echo
  echo "Final skill root: $root"
  find "$root" -maxdepth 2 -name SKILL.md -print | sort
}

for command in curl tar find grep awk cp mkdir rm dirname chmod; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required command not found: $command" >&2
    exit 1
  fi
done

TMP_DIR="$(mktemp -d)"
MATT_ROOT=""

printf 'ShipFlow installer %s\n' "$INSTALLER_VERSION"
echo "Project root: $PROJECT_ROOT"
echo "Target skill root: $(skills_root)"

mkdir -p "$(skills_root)"

download_matt_source
install_all_upstream_skills
install_shipflow
verify_all
print_final_state

echo
printf 'Installed and verified ShipFlow + 9 Matt Pocock skills for %s.\n' "$AGENT"
echo "Run /setup-matt-pocock-skills once per repository, then use: /shipflow <your development goal>"
