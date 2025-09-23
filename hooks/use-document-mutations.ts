'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { uploadDocumentAction } from '@/app/documents/actions'
import type { Document, DocumentWithLease } from '@/types/documents'
import {
  finalizeOptimisticUpdate,
  rollbackOptimisticUpdate,
  startOptimisticUpdate,
} from '@/lib/optimistic'
import type { OptimisticContext } from '@/lib/optimistic'

interface UploadVariables {
  formData: FormData
  optimisticDocument: DocumentWithLease
}

interface UploadContext {
  optimisticDocument: DocumentWithLease
  optimisticContext: OptimisticContext<DocumentWithLease[]>
}

export interface UploadDocumentCallbacks {
  onOptimistic?(document: DocumentWithLease): void
  onRollback?(error: unknown): void
  onConfirmed?(document: DocumentWithLease): void
}

function toDocumentWithLease(document: Document): DocumentWithLease {
  return {
    ...document,
    metadata: document.metadata ?? {},
    lease: (document as DocumentWithLease).lease,
    signatures: (document as DocumentWithLease).signatures ?? [],
  }
}

export function useUploadDocumentMutation(callbacks?: UploadDocumentCallbacks) {
  const queryClient = useQueryClient()

  return useMutation<DocumentWithLease, Error, UploadVariables, UploadContext>({
    mutationFn: async ({ formData }) => {
      const result = await uploadDocumentAction(formData)

      if (!result.success || !result.data) {
        throw new Error(result.error ?? 'Failed to upload document')
      }

      return toDocumentWithLease(result.data)
    },
    onMutate: (variables) => {
      const optimisticContext = startOptimisticUpdate<DocumentWithLease[]>({
        queryClient,
        filters: { queryKey: ['documents'] },
        operation: 'upload-document',
        updateFn: (current = []) => {
          const withoutDuplicate = current.filter(
            (doc) => doc.id !== variables.optimisticDocument.id,
          )
          return [variables.optimisticDocument, ...withoutDuplicate]
        },
      })

      callbacks?.onOptimistic?.(variables.optimisticDocument)

      return {
        optimisticDocument: variables.optimisticDocument,
        optimisticContext,
      }
    },
    onError: (error, _variables, context) => {
      rollbackOptimisticUpdate(queryClient, context?.optimisticContext, error)
      callbacks?.onRollback?.(error)
    },
    onSuccess: (document, _variables, context) => {
      finalizeOptimisticUpdate<DocumentWithLease[]>({
        queryClient,
        context: context?.optimisticContext,
        reconcileFn: (current) => {
          if (!current) {
            return current
          }

          const placeholderId = context?.optimisticDocument.id
          const hasPlaceholder = current.some((doc) => doc.id === placeholderId)
          const reconciled = current.map((doc) =>
            doc.id === placeholderId ? document : doc,
          )

          if (!hasPlaceholder) {
            return [document, ...current]
          }

          return reconciled
        },
      })

      callbacks?.onConfirmed?.(document)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}
