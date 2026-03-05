#!/bin/bash
echo "DEBUG: PORT=$PORT NODE_OPTIONS=$NODE_OPTIONS" >&2
echo "DEBUG: Running: node --dns-result-order=ipv4first node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${PORT:-5175}" >&2
exec node --dns-result-order=ipv4first node_modules/vite/bin/vite.js --host 127.0.0.1 --port "${PORT:-5175}"
