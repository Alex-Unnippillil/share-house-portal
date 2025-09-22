import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase";

type ManagedBucket = "floorplans" | "receipts" | "docs";

type UploadBody = Blob | File | ArrayBuffer | ArrayBufferView;

type UploadOptions = {
        cacheControl?: string;
        contentType?: string;
        upsert?: boolean;
};

export type ManagedUploadParams = UploadOptions & {
        bucket: ManagedBucket;
        client: SupabaseClient<Database>;
        file: UploadBody;
        householdId: string;
        memberId: string;
        metadata?: Record<string, string>;
        path: string;
};

export type ManagedUpdateParams = ManagedUploadParams;

export function buildManagedMetadata(
        memberId: string,
        householdId: string,
        extra: Record<string, string> = {}
): Record<string, string> {
        if (!memberId) {
                throw new Error("memberId is required to tag storage objects");
        }

        if (!householdId) {
                throw new Error("householdId is required to tag storage objects");
        }

        return {
                ...extra,
                household_id: householdId,
                member_id: memberId,
        };
}

export async function uploadToManagedBucket({
        bucket,
        cacheControl,
        client,
        contentType,
        file,
        householdId,
        memberId,
        metadata,
        path,
        upsert = false,
}: ManagedUploadParams) {
        const mergedMetadata = buildManagedMetadata(memberId, householdId, metadata);

        return client.storage.from(bucket).upload(path, file, {
                cacheControl,
                contentType,
                metadata: mergedMetadata,
                upsert,
        });
}

export async function updateManagedObject(params: ManagedUpdateParams) {
        return uploadToManagedBucket({ ...params, upsert: true });
}
