#!/usr/bin/env bash
#
# Scripted bucket provisioning for Share House Portal storage.
#
# Usage:
#   ./supabase/scripts/create-storage-buckets.sh
#
# Requires:
#   - Supabase CLI installed and authenticated against the target project.
#   - SUPABASE_ACCESS_TOKEN exported or `supabase login` session available.
#
# The script is idempotent. If a bucket already exists the CLI will return an
# error which is suppressed so the workflow can continue.

set -euo pipefail

create_bucket() {
  local bucket_name="$1"
  shift
  if supabase storage list-buckets --output=json | grep -q "\"${bucket_name}\""; then
    echo "Bucket '${bucket_name}' already exists. Skipping create command."
    return 0
  fi

  echo "Creating bucket '${bucket_name}'"
  supabase storage create-bucket "${bucket_name}" "$@"
}

# Floorplans bucket holds annotated SVG/PDF layouts that should never be public.
create_bucket "floorplans" --public=false --file-size-limit=5242880 --allowed-mime-types="image/svg+xml,image/png,application/pdf"

# Receipts bucket stores payment confirmations and sensitive billing artifacts.
create_bucket "receipts" --public=false --file-size-limit=10485760 --allowed-mime-types="application/pdf,image/png,image/jpeg"

# Docs bucket captures general lease attachments and shared paperwork.
create_bucket "docs" --public=false --file-size-limit=10485760 --allowed-mime-types="application/pdf,image/png,image/jpeg,text/plain"
