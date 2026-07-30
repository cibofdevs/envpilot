#!/bin/sh
set -eu

echo "[dev] Resolving Maven dependencies..."
mvn -q -B dependency:go-offline || true

# mvn/Spring Boot has no built-in "recompile on save", so poll the sources
# for changes and restart `spring-boot:run` when they do. Polling (rather
# than inotify, e.g. via entr) is used because filesystem change events
# from host edits don't reliably propagate through Docker Desktop's bind
# mount on macOS/Windows. `fork=false` runs the app in the same JVM as
# Maven so a single `kill` fully stops it.
checksum() {
  find pom.xml src -type f -exec stat -c '%Y %n' {} + 2>/dev/null | sort | md5sum
}

start_app() {
  mvn spring-boot:run -Dspring-boot.run.fork=false &
  APP_PID=$!
}

is_running() {
  kill -0 "$APP_PID" 2>/dev/null
}

start_app
last_checksum=$(checksum)

while true; do
  sleep 2
  current_checksum=$(checksum)
  if [ "$current_checksum" != "$last_checksum" ]; then
    echo "[dev] Change detected, restarting..."
    kill "$APP_PID" 2>/dev/null || true
    wait "$APP_PID" 2>/dev/null || true
    last_checksum="$current_checksum"
    start_app
  elif ! is_running; then
    # The app exited on its own - typically because it started before a
    # dependency (Vault/Postgres) was ready to accept connections, which
    # happens after the whole compose stack restarts (e.g. Docker Desktop
    # restarting): dev-mode Vault loses its seeded secrets on restart and
    # needs vault-init to re-run before the app can read them. Retry with
    # a backoff instead of sitting dead until a source file happens to
    # change.
    wait "$APP_PID" 2>/dev/null || true
    echo "[dev] App exited unexpectedly, retrying in 5s..."
    sleep 5
    start_app
  fi
done
