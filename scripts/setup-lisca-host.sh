#!/usr/bin/env bash
# Prepare /var/lisca for Docker bind mounts and lab SSH users.
#
# Usage (requires root):
#   sudo ./scripts/setup-lisca-host.sh
#   sudo ./scripts/setup-lisca-host.sh --user tianyi
set -euo pipefail

LISCA_ROOT="${LISCA_ROOT:-/var/lisca}"
LISCA_GROUP="${LISCA_GROUP:-lisca}"
FIRST_USER="${FIRST_USER:-tianyi}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --root)
      LISCA_ROOT="$2"
      shift 2
      ;;
    --user)
      FIRST_USER="$2"
      shift 2
      ;;
    -h | --help)
      echo "Usage: sudo $0 [--root /var/lisca] [--user tianyi]"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

getent group "${LISCA_GROUP}" >/dev/null 2>&1 || groupadd "${LISCA_GROUP}"

mkdir -p "${LISCA_ROOT}/source" "${LISCA_ROOT}/workspace" "${LISCA_ROOT}/config"
chgrp -R "${LISCA_GROUP}" "${LISCA_ROOT}"
chmod -R g+rwX "${LISCA_ROOT}"
chmod g+s "${LISCA_ROOT}/workspace"

if id -u "${FIRST_USER}" >/dev/null 2>&1; then
  usermod -aG "${LISCA_GROUP}" "${FIRST_USER}"
  echo "Added existing user ${FIRST_USER} to group ${LISCA_GROUP}"
else
  useradd -m -g "${LISCA_GROUP}" -G "${LISCA_GROUP}" -s /bin/bash "${FIRST_USER}"
  echo "Created user ${FIRST_USER} (set password: passwd ${FIRST_USER})"
fi

echo ""
echo "Host layout:"
echo "  ${LISCA_ROOT}/source/     raw microscopy (ro in containers)"
echo "  ${LISCA_ROOT}/workspace/  run folders (create per experiment)"
echo "  ${LISCA_ROOT}/config/      Studio profiles and memory (studio service only)"
echo ""
echo "Example:"
echo "  sudo -u ${FIRST_USER} mkdir -p ${LISCA_ROOT}/workspace/my-run"
echo ""
echo "SSH tunnel:"
echo "  ssh -L 8765:localhost:8765 -L 8766:localhost:8766 -L 8767:localhost:8767 ${FIRST_USER}@<host>"
echo ""
echo "Start apps: docker compose up --build"
