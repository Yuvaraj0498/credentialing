#!/usr/bin/env bash
# Updates THIS site from git, rebuilds it and restarts it. Run from anywhere:
#   bash deploy/deploy.sh            update + build + restart
#   bash deploy/deploy.sh --first    first time: build and create the pm2 processes
# The site's own settings stay outside git: deploy/site.env and backend/config/application.properties.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

[ -f deploy/site.env ] || { echo "Missing deploy/site.env — copy deploy/site.env.example and fill it in."; exit 1; }
[ -f backend/config/application.properties ] || { echo "Missing backend/config/application.properties — copy the .example and fill it in."; exit 1; }
# shellcheck disable=SC1091
source deploy/site.env
: "${BRANCH:?}" "${BACKEND_PM2:?}" "${ADMIN_PM2:?}" "${ADMIN_PORT:?}"

# Refuse to run over local edits of tracked files: on a server only the git-ignored settings may differ.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "This folder has local changes to tracked files — they would be mixed into the update:"
  git status --short
  echo "Undo them (git checkout -- <file>) or move site settings into the git-ignored files, then run again."
  exit 1
fi

echo "== $ROOT  (branch $BRANCH)"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
echo "== now at $(git log --oneline -1)"

echo "== backend build"
(cd backend && bash ./mvnw -q -DskipTests package)
JAR="$(ls backend/target/credentialing-*.jar | grep -v '\.original$' | head -1)"

echo "== admin build"
(cd admin && npm ci && npm run build)

if [ "${1:-}" = "--first" ]; then
  # backend runs from the backend folder so it reads backend/config/application.properties
  (cd backend && pm2 start java --name "$BACKEND_PM2" -- -jar "$ROOT/$JAR")
  (cd admin && PORT="$ADMIN_PORT" pm2 start npm --name "$ADMIN_PM2" -- start)
else
  pm2 restart "$BACKEND_PM2"
  PORT="$ADMIN_PORT" pm2 restart "$ADMIN_PM2" --update-env
fi
pm2 save
echo "== done: $(git log --oneline -1)"
