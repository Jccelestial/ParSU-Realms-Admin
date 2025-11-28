#!/bin/sh
set -e

# push-admin-dashboard.sh
# Small helper to initialize the current folder as a fresh repo and push to
# Jccelestial/<repo>. Run this locally as the Jccelestial user.

REPO_OWNER="Jccelestial"
REPO_NAME="ParsuRealms-admin-dashboard"
DIR="$(pwd)"

echo "This script will create a fresh git repo from the current directory and push it to ${REPO_OWNER}/${REPO_NAME}."
echo "Make sure you are authenticated as ${REPO_OWNER} on GitHub (gh auth login or SSH key)."

read -p "Proceed? (y/N) " confirm
if [ "${confirm}" != "y" ] && [ "${confirm}" != "Y" ]; then
  echo "Aborted."
  exit 1
fi

if [ -d .git ]; then
  echo "Removing existing .git to create a fresh repository..."
  rm -rf .git
fi

git init
git config user.name "${REPO_OWNER}" || true
git config user.email "you@example.com" || true
git add .
git commit -m "Initial import: admin-dashboard"
git branch -M main

echo "Choose remote URL type: 1) HTTPS 2) SSH"
read -r choice
if [ "${choice}" = "2" ]; then
  REMOTE_URL="git@github.com:${REPO_OWNER}/${REPO_NAME}.git"
else
  REMOTE_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}.git"
fi

git remote add origin "${REMOTE_URL}" || git remote set-url origin "${REMOTE_URL}"

echo "Pushing to ${REMOTE_URL}..."
git push -u origin main

echo "Push finished. If this is the first push, go to GitHub to add the VERCEL_TOKEN secret so the Action can deploy."
