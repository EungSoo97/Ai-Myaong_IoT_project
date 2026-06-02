#!/usr/bin/env bash
set -euo pipefail

TARGET_USER="${SUDO_USER:-${USER:-}}"
RULE_FILE="/etc/polkit-1/rules.d/80-aimyaong-networkmanager.rules"

if [[ -z "$TARGET_USER" || "$TARGET_USER" == "root" ]]; then
  echo "Run this with sudo from the Raspberry Pi user that runs the Pi agent."
  echo "Example: sudo bash ./scripts/allow-networkmanager-control.sh"
  exit 1
fi

if ! command -v nmcli >/dev/null 2>&1; then
  echo "nmcli was not found. Install or enable NetworkManager first."
  exit 1
fi

TMP_RULE="$(mktemp)"
trap 'rm -f "$TMP_RULE"' EXIT

cat > "$TMP_RULE" <<EOF
polkit.addRule(function(action, subject) {
  if (subject.user == "$TARGET_USER" &&
      action.id.indexOf("org.freedesktop.NetworkManager.") == 0) {
    return polkit.Result.YES;
  }
});
EOF

install -m 0644 -o root -g root "$TMP_RULE" "$RULE_FILE"

if command -v systemctl >/dev/null 2>&1; then
  systemctl restart polkit 2>/dev/null || systemctl restart polkit.service 2>/dev/null || true
fi

echo "NetworkManager control permission was granted to user: $TARGET_USER"
echo "Rule installed: $RULE_FILE"
echo "Restart the Raspberry Pi agent after this."
