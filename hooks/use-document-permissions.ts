"use client"

import { useMemo } from "react"

import { useCurrentUser } from "@/hooks/use-current-user"
import { useUserProfile } from "@/hooks/use-user-profile"
import { DocumentWithLease } from "@/types/documents"

export interface UserPermissions {
  isTenant: boolean
  isRoommate: boolean
  isPropertyManager: boolean
  isAdmin: boolean
  canUploadDocuments: boolean
  canCreateSigningRequests: boolean
  canViewDocument: (document: DocumentWithLease) => boolean
  canSignDocument: (document: DocumentWithLease) => boolean
  canEditDocument: (document: DocumentWithLease) => boolean
}

const ANONYMOUS_PERMISSIONS: UserPermissions = {
  isTenant: false,
  isRoommate: false,
  isPropertyManager: false,
  isAdmin: false,
  canUploadDocuments: false,
  canCreateSigningRequests: false,
  canViewDocument: () => false,
  canSignDocument: () => false,
  canEditDocument: () => false,
}

export function useDocumentPermissions(): UserPermissions {
  const { data: user } = useCurrentUser()
  const { data: profile } = useUserProfile()

  return useMemo<UserPermissions>(() => {
    const userId = user?.id
    const role = profile?.role

    if (!userId || !role) {
      return ANONYMOUS_PERMISSIONS
    }

    const isPropertyManager = role === "property_manager"
    const isAdmin = role === "admin"
    const isTenant = role === "tenant"
    const isRoommate = role === "roommate"

    const canUploadDocuments = isPropertyManager || isAdmin
    const canCreateSigningRequests = isPropertyManager || isAdmin

    const canViewDocument = (document: DocumentWithLease) => {
      if (isPropertyManager || isAdmin) return true
      if (document.tenant_id === userId) return true
      if (document.lease?.tenant_ids?.includes(userId)) return true
      return false
    }

    const canSignDocument = (document: DocumentWithLease) => {
      if (!document.requires_signature) return false

      return (
        document.signatures?.some(
          (signature) => signature.signer_id === userId && signature.status === "pending"
        ) ?? false
      )
    }

    const canEditDocument = (document: DocumentWithLease) => {
      void document
      return isPropertyManager || isAdmin
    }

    return {
      isTenant,
      isRoommate,
      isPropertyManager,
      isAdmin,
      canUploadDocuments,
      canCreateSigningRequests,
      canViewDocument,
      canSignDocument,
      canEditDocument,
    }
  }, [profile?.role, user?.id])
}
