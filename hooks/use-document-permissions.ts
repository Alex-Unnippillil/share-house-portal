'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase-browser';
import { DocumentWithLease } from '@/types/documents';

export interface UserPermissions {
  isTenant: boolean;
  isRoommate: boolean;
  isPropertyManager: boolean;
  isAdmin: boolean;
  canUploadDocuments: boolean;
  canCreateSigningRequests: boolean;
  canViewDocument: (document: DocumentWithLease) => boolean;
  canSignDocument: (document: DocumentWithLease) => boolean;
  canEditDocument: (document: DocumentWithLease) => boolean;
}

export function useDocumentPermissions(): UserPermissions {
  const [permissions, setPermissions] = useState<UserPermissions>({
    isTenant: false,
    isRoommate: false,
    isPropertyManager: false,
    isAdmin: false,
    canUploadDocuments: false,
    canCreateSigningRequests: false,
    canViewDocument: () => false,
    canSignDocument: () => false,
    canEditDocument: () => false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const supabase = createClient() as any;
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setPermissions({
            isTenant: false,
            isRoommate: false,
            isPropertyManager: false,
            isAdmin: false,
            canUploadDocuments: false,
            canCreateSigningRequests: false,
            canViewDocument: () => false,
            canSignDocument: () => false,
            canEditDocument: () => false,
          });
          return;
        }

        // Get user profile with role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const role = profile?.role || 'user';
        const isPropertyManager = role === 'property_manager';
        const isAdmin = role === 'admin';
        const isTenant = role === 'tenant';
        const isRoommate = role === 'roommate';

        const userPermissions: UserPermissions = {
          isTenant,
          isRoommate,
          isPropertyManager,
          isAdmin,
          canUploadDocuments: isPropertyManager || isAdmin,
          canCreateSigningRequests: isPropertyManager || isAdmin,

          canViewDocument: (document: DocumentWithLease) => {
            // Property managers and admins can view all documents
            if (isPropertyManager || isAdmin) return true;

            // Users can view documents they're associated with
            if (document.tenant_id === user.id) return true;

            // For leases, check if user is a tenant on the lease
            if (document.lease?.tenant_ids?.includes(user.id)) return true;

            return false;
          },

          canSignDocument: (document: DocumentWithLease) => {
            // Check if document requires signature and has pending signatures for this user
            if (!document.requires_signature) return false;

            return document.signatures?.some(
              sig => sig.signer_id === user.id && sig.status === 'pending'
            ) || false;
          },

          canEditDocument: (document: DocumentWithLease) => {
            // Only property managers and admins can edit documents
            return isPropertyManager || isAdmin;
          },
        };

        setPermissions(userPermissions);
      } catch (error) {
        console.error('Error checking document permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, []);

  return permissions;
}
