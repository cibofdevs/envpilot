#!/bin/sh
set -eu

export VAULT_ADDR="${VAULT_ADDR:-http://vault:8200}"
export VAULT_TOKEN="${VAULT_TOKEN}"

echo "[vault-init] Waiting for Vault to be ready..."
until vault status >/dev/null 2>&1; do
  sleep 2
done

echo "[vault-init] Enabling kv-v2 secrets engine at path 'envpilot' (ok if already enabled)..."
vault secrets enable -path=envpilot -version=2 kv 2>/dev/null || true

echo "[vault-init] Writing application secrets to envpilot/envpilot..."
vault kv put envpilot/envpilot \
    database.username="${DB_USERNAME}" \
    database.password="${DB_PASSWORD}" \
    jwt.secret="${JWT_SECRET}" \
    email.username="${EMAIL_USERNAME}" \
    email.password="${EMAIL_PASSWORD}"

echo "[vault-init] Done."
