#!/bin/sh
set -eu

case "${PRODUCT:-aligner}" in
  aligner) PUBLIC_PORT="${PUBLIC_PORT:-8765}" ;;
  annotator) PUBLIC_PORT="${PUBLIC_PORT:-8766}" ;;
  studio) PUBLIC_PORT="${PUBLIC_PORT:-8767}" ;;
  *)
    echo "Unknown PRODUCT: ${PRODUCT}" >&2
    exit 1
    ;;
esac

export PUBLIC_PORT

envsubst '${PUBLIC_PORT} ${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

/usr/local/bin/lisca-server &
server_pid=$!

cleanup() {
  kill "$server_pid" 2>/dev/null || true
  wait "$server_pid" 2>/dev/null || true
}

trap cleanup INT TERM

exec nginx -g 'daemon off;'
