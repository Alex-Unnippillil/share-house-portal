#!/usr/bin/env bash
set -euo pipefail

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required to run the Supabase CLI" >&2
  exit 1
fi

: "${SUPABASE_ACCESS_TOKEN:?Set SUPABASE_ACCESS_TOKEN with a personal access token that can manage the staging project.}"
: "${SUPABASE_STAGING_PROJECT_REF:?Set SUPABASE_STAGING_PROJECT_REF with the Supabase project ref for staging.}"

BRANCH_NAME=${STAGING_GREEN_BRANCH:-staging-green}
REGION_FLAG=${STAGING_GREEN_REGION:-}
SIZE_FLAG=${STAGING_GREEN_SIZE:-}
PERSISTENT_FLAG=${STAGING_GREEN_PERSISTENT:-true}
CLONE_DATA=${STAGING_GREEN_CLONE_DATA:-true}

export SUPABASE_ACCESS_TOKEN

echo "Checking if Supabase branch '${BRANCH_NAME}' already exists..." >&2
if npx --yes supabase branches get "${BRANCH_NAME}" --project-ref "${SUPABASE_STAGING_PROJECT_REF}" >/dev/null 2>&1; then
  echo "Branch '${BRANCH_NAME}' already exists for project ${SUPABASE_STAGING_PROJECT_REF}." >&2
  exit 0
fi

echo "Creating staging green Supabase branch '${BRANCH_NAME}'..." >&2
CREATE_ARGS=(branches create "${BRANCH_NAME}" --project-ref "${SUPABASE_STAGING_PROJECT_REF}")

if [[ "${PERSISTENT_FLAG}" == "true" ]]; then
  CREATE_ARGS+=(--persistent)
fi

if [[ "${CLONE_DATA}" == "true" ]]; then
  CREATE_ARGS+=(--with-data)
fi

if [[ -n "${REGION_FLAG}" ]]; then
  CREATE_ARGS+=(--region "${REGION_FLAG}")
fi

if [[ -n "${SIZE_FLAG}" ]]; then
  CREATE_ARGS+=(--size "${SIZE_FLAG}")
fi

npx --yes supabase "${CREATE_ARGS[@]}"

echo "Supabase branch '${BRANCH_NAME}' has been created. Use the generated database URL as STAGING_GREEN_DATABASE_URL for cutover rehearsals." >&2
