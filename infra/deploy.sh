#!/bin/sh
# Deploys one image tag on the VPS (docs/IMPLEMENTATION-PLAN.md I4). Run from /opt/site, by the deploy workflow over
# SSH or by hand:
#
#   ./deploy.sh <git-sha>        deploy (or roll back to) the images tagged with that commit
#   ./deploy.sh --previous       roll back to the tag that was live before the last deploy
#
# The tag lives in release.env, which only this script writes. .env (secrets, REGISTRY) is never read or written
# here: Compose interpolates from both files, release.env last. Manual Compose commands must pass both:
#   docker compose --env-file .env --env-file release.env ps
set -eu

cd "$(dirname "$0")"

if [ "${1:-}" = "--previous" ]; then
  [ -f release.previous ] || { echo "No previous release recorded." >&2; exit 1; }
  tag=$(cat release.previous)
else
  tag=${1:-}
fi

# A commit SHA (7–40 hex characters); anything else is refused before it reaches Compose.
case "$tag" in
  '' | *[!0-9a-f]*) echo "Usage: $0 <git-sha> | --previous" >&2; exit 2 ;;
esac
if [ "${#tag}" -lt 7 ] || [ "${#tag}" -gt 40 ]; then
  echo "Not a commit SHA: $tag" >&2
  exit 2
fi

[ -f .env ] || { echo "/opt/site/.env is missing (create it from .env.example)." >&2; exit 1; }

current=""
[ -f release.env ] && current=$(sed -n 's/^TAG=//p' release.env)

compose() {
  docker compose --env-file .env --env-file release.next "$@"
}

printf 'TAG=%s\n' "$tag" > release.next
compose pull web api
# --wait returns once every service with a health check is healthy, and fails if one is not.
if ! compose up -d --wait --wait-timeout 180; then
  echo "Release $tag did not become healthy." >&2
  compose ps >&2
  rm -f release.next
  if [ -n "$current" ] && [ "$current" != "$tag" ]; then
    echo "Restoring $current." >&2
    docker compose --env-file .env --env-file release.env up -d --wait --wait-timeout 180 || true
  fi
  exit 1
fi

if [ -n "$current" ] && [ "$current" != "$tag" ]; then
  printf '%s\n' "$current" > release.previous
fi
mv release.next release.env
docker image prune -f --filter "until=168h" >/dev/null
echo "Live: $tag"
