#!/bin/sh
set -e

REPO=/demo-repos/pay-channel-demo.git

if [ -d "$REPO" ]; then
  echo "Demo repo already seeded at $REPO, skipping"
  exit 0
fi

WORKDIR=/tmp/seed-work
rm -rf "$WORKDIR" && mkdir -p "$WORKDIR"
cd "$WORKDIR"

git init -q
git config user.email "demo@envpilot.local"
git config user.name "EnvPilot Demo Seed"

echo "init" > README.md
git add README.md
git commit -q -m "init"
git branch -M master

git checkout -q -b develop
echo "develop work" >> README.md
git commit -aqm "develop work"

git checkout -q -b release/1.0 master
echo "release 1.0" >> README.md
git commit -aqm "release 1.0"

git checkout -q -b feature/pay-channel-fix master
echo "feature work" >> README.md
git commit -aqm "feature work"

git checkout -q master

mkdir -p /demo-repos
git clone -q --bare . "$REPO"

echo "Seeded demo repo at $REPO with branches: master, develop, release/1.0, feature/pay-channel-fix"
