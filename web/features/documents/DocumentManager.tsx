'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Table from '@/components/ui/Table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import type {
  DocumentAuditEntry,
  DocumentCategory,
  DocumentPermissionUpdate,
  DocumentRecord,
  DocumentReport,
  DocumentVisibility,
} from './types'
import { formatBytes, validateFileBeforeUpload, visibilityLabel } from './utils'
import type { DocumentReportFilters } from './reporting'
import { buildDocumentReport, documentReportToCsv } from './reporting'

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024
const DEFAULT_ALLOWED_TYPES = [
  'application/pdf',
  'image/',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

export type DocumentManagerProps = {
  currentUser: {
    id: string
    role: string
    email?: string | null
    name?: string | null
  }
}

type ReportConfigState = {
  categoryIds: string[]
  visibility: DocumentVisibility[]
  startDate: string
  endDate: string
}

const INITIAL_REPORT_STATE: ReportConfigState = {
  categoryIds: [],
  visibility: [],
  startDate: '',
  endDate: '',
}

function uniqueList(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

export function DocumentManager({ currentUser }: DocumentManagerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const dropRef = useRef<HTMLDivElement | null>(null)
  const { toast } = useToast()

  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [newDocumentVisibility, setNewDocumentVisibility] = useState<DocumentVisibility>('shared')
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [activeDocument, setActiveDocument] = useState<DocumentRecord | null>(null)
  const [pendingRoles, setPendingRoles] = useState('')
  const [pendingUsers, setPendingUsers] = useState('')
  const [pendingVisibility, setPendingVisibility] = useState<DocumentVisibility>('private')
  const [isSavingPermissions, setIsSavingPermissions] = useState(false)
  const [auditTrail, setAuditTrail] = useState<DocumentAuditEntry[]>([])
  const [isAuditLoading, setIsAuditLoading] = useState(false)
  const [reportState, setReportState] = useState<ReportConfigState>(INITIAL_REPORT_STATE)
  const [reportPreview, setReportPreview] = useState<DocumentReport | null>(null)
  const [isReportLoading, setIsReportLoading] = useState(false)

  const isAdmin = currentUser.role.toLowerCase() === 'admin'

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch('/api/documents', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to load documents')
      }

      const payload: {
        documents: DocumentRecord[]
        categories: DocumentCategory[]
      } = await response.json()

      setCategories(payload.categories)
      setDocuments(payload.documents)

      if (!selectedCategoryId && payload.categories.length > 0) {
        setSelectedCategoryId(payload.categories[0].id)
        setNewDocumentVisibility(payload.categories[0].visibility)
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Unable to load documents',
        description: (error as Error).message,
      })
    }
  }, [selectedCategoryId, toast])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  useEffect(() => {
    if (!selectedCategoryId) {
      return
    }

    const category = categories.find((item) => item.id === selectedCategoryId)
    if (category) {
      setNewDocumentVisibility(category.visibility)
    }
  }, [categories, selectedCategoryId])

  useEffect(() => {
    if (!permissionsDialogOpen || !activeDocument) {
      return
    }

    const controller = new AbortController()

    async function loadAuditTrail() {
      try {
        setIsAuditLoading(true)
        const response = await fetch(`/api/documents/${activeDocument.id}/audit`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error('Unable to fetch audit trail')
        }
        const payload: { entries: DocumentAuditEntry[] } = await response.json()
        setAuditTrail(payload.entries)
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return
        }
        toast({
          variant: 'destructive',
          title: 'Audit log unavailable',
          description: (error as Error).message,
        })
      } finally {
        setIsAuditLoading(false)
      }
    }

    loadAuditTrail()

    return () => controller.abort()
  }, [permissionsDialogOpen, activeDocument, toast])

  const filteredDocuments = useMemo(() => {
    if (!selectedCategoryId) {
      return documents
    }
    return documents.filter((document) => document.categoryId === selectedCategoryId)
  }, [documents, selectedCategoryId])

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!selectedCategoryId) {
        toast({
          variant: 'destructive',
          title: 'Select a category first',
          description: 'Choose a document category before uploading files.',
        })
        return
      }

      setIsUploading(true)
      setUploadError(null)

      try {
        for (const file of Array.from(files)) {
          const validation = validateFileBeforeUpload(file, {
            maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
            allowedMimeTypes: DEFAULT_ALLOWED_TYPES,
          })

          if (!validation.valid) {
            toast({
              variant: 'destructive',
              title: `Cannot upload ${file.name}`,
              description: validation.reason,
            })
            continue
          }

          const signResponse = await fetch('/api/documents/sign-upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type,
              categoryId: selectedCategoryId,
            }),
          })

          if (!signResponse.ok) {
            throw new Error(`Unable to create upload request for ${file.name}`)
          }

          const signPayload: { uploadUrl: string; path: string } = await signResponse.json()

          const uploadResponse = await fetch(signPayload.uploadUrl, {
            method: 'PUT',
            body: file,
          })

          if (!uploadResponse.ok) {
            throw new Error(`Upload failed for ${file.name}`)
          }

          const metadataResponse = await fetch('/api/documents', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: file.name,
              storagePath: signPayload.path,
              size: file.size,
              categoryId: selectedCategoryId,
              visibility: newDocumentVisibility,
              allowedRoles: categories.find((category) => category.id === selectedCategoryId)?.allowedRoles ?? [],
              allowedUsers: [],
            }),
          })

          if (!metadataResponse.ok) {
            throw new Error(`Unable to register ${file.name}`)
          }

          const created: { document: DocumentRecord } = await metadataResponse.json()
          setDocuments((existing) => {
            const index = existing.findIndex((doc) => doc.id === created.document.id)
            if (index >= 0) {
              const updated = [...existing]
              updated[index] = created.document
              return updated
            }
            return [created.document, ...existing]
          })
        }

        toast({
          title: 'Upload complete',
          description: 'Your document uploads finished successfully.',
        })
      } catch (error) {
        const message = (error as Error).message
        setUploadError(message)
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: message,
        })
      } finally {
        setIsUploading(false)
      }
    },
    [categories, newDocumentVisibility, selectedCategoryId, toast],
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      setIsDragOver(false)

      if (event.dataTransfer?.files?.length) {
        void handleFiles(event.dataTransfer.files)
      }
    },
    [handleFiles],
  )

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return
    }
    setIsDragOver(false)
  }, [])

  const onFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.files?.length) {
        void handleFiles(event.target.files)
        event.target.value = ''
      }
    },
    [handleFiles],
  )

  const onSelectCategory = useCallback(
    (value: string) => {
      setSelectedCategoryId(value)
      const category = categories.find((item) => item.id === value)
      if (category) {
        setNewDocumentVisibility(category.visibility)
      }
    },
    [categories],
  )

  const openPermissionsDialog = useCallback((document: DocumentRecord) => {
    setActiveDocument(document)
    setPendingRoles(document.allowedRoles.join(', '))
    setPendingUsers(document.allowedUsers.join(', '))
    setPendingVisibility(document.visibility)
    setPermissionsDialogOpen(true)
  }, [])

  const closePermissionsDialog = useCallback(() => {
    setPermissionsDialogOpen(false)
    setActiveDocument(null)
    setPendingRoles('')
    setPendingUsers('')
    setPendingVisibility('private')
    setAuditTrail([])
  }, [])

  const savePermissions = useCallback(async () => {
    if (!activeDocument) {
      return
    }

    setIsSavingPermissions(true)

    try {
      const payload: DocumentPermissionUpdate = {
        visibility: pendingVisibility,
        allowedRoles: uniqueList(
          pendingRoles
            .split(',')
            .map((role) => role.trim())
            .filter(Boolean),
        ),
        allowedUsers: uniqueList(
          pendingUsers
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean),
        ),
      }

      const response = await fetch(`/api/documents/${activeDocument.id}/permissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Unable to update permissions')
      }

      const updated: { document: DocumentRecord } = await response.json()
      setDocuments((existing) => existing.map((doc) => (doc.id === updated.document.id ? updated.document : doc)))
      setActiveDocument(updated.document)
      toast({
        title: 'Permissions updated',
        description: `${updated.document.name} permissions were saved successfully`,
      })
      setPermissionsDialogOpen(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Unable to update permissions',
        description: (error as Error).message,
      })
    } finally {
      setIsSavingPermissions(false)
    }
  }, [activeDocument, pendingRoles, pendingUsers, pendingVisibility, toast])

  const updateReportState = useCallback(
    (updater: (state: ReportConfigState) => ReportConfigState) => {
      setReportState((previous) => updater(previous))
    },
    [],
  )

  const toggleCategoryFilter = useCallback(
    (categoryId: string) => {
      updateReportState((previous) => {
        const set = new Set(previous.categoryIds)
        if (set.has(categoryId)) {
          set.delete(categoryId)
        } else {
          set.add(categoryId)
        }
        return { ...previous, categoryIds: Array.from(set) }
      })
    },
    [updateReportState],
  )

  const toggleVisibilityFilter = useCallback(
    (visibility: DocumentVisibility) => {
      updateReportState((previous) => {
        const set = new Set(previous.visibility)
        if (set.has(visibility)) {
          set.delete(visibility)
        } else {
          set.add(visibility)
        }
        return { ...previous, visibility: Array.from(set) as DocumentVisibility[] }
      })
    },
    [updateReportState],
  )

  const updateDateFilter = useCallback(
    (field: 'startDate' | 'endDate', value: string) => {
      updateReportState((previous) => ({ ...previous, [field]: value }))
    },
    [updateReportState],
  )

  const requestReport = useCallback(
    async (format: 'json' | 'csv') => {
      const filters: DocumentReportFilters = {
        categoryIds: reportState.categoryIds.length ? reportState.categoryIds : undefined,
        visibility: reportState.visibility.length ? reportState.visibility : undefined,
        startDate: reportState.startDate ? new Date(reportState.startDate) : undefined,
        endDate: reportState.endDate ? new Date(reportState.endDate) : undefined,
      }

      const params = new URLSearchParams()
      if (filters.categoryIds) {
        filters.categoryIds.forEach((id) => params.append('category', id))
      }
      if (filters.visibility) {
        filters.visibility.forEach((value) => params.append('visibility', value))
      }
      if (filters.startDate) {
        params.set('start', filters.startDate.toISOString())
      }
      if (filters.endDate) {
        params.set('end', filters.endDate.toISOString())
      }
      params.set('format', format)

      setIsReportLoading(true)

      try {
        const response = await fetch(`/api/documents/reports?${params.toString()}`, {
          method: 'GET',
          headers: {
            Accept: format === 'csv' ? 'text/csv' : 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Unable to build report')
        }

        if (format === 'csv') {
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `documents-report-${Date.now()}.csv`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
          toast({ title: 'Report downloaded', description: 'Your CSV export is ready.' })
        } else {
          const payload: { report: DocumentReport } = await response.json()
          setReportPreview(payload.report)
          toast({ title: 'Report ready', description: 'Preview updated with the latest data.' })
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Unable to generate report',
          description: (error as Error).message,
        })
      } finally {
        setIsReportLoading(false)
      }
    },
    [reportState, toast],
  )

  const localReportPreview = useMemo(() => {
    const filters: DocumentReportFilters = {
      categoryIds: reportState.categoryIds.length ? reportState.categoryIds : undefined,
      visibility: reportState.visibility.length ? reportState.visibility : undefined,
      startDate: reportState.startDate ? new Date(reportState.startDate) : undefined,
      endDate: reportState.endDate ? new Date(reportState.endDate) : undefined,
    }
    return buildDocumentReport(documents, filters)
  }, [documents, reportState])

  return (
    <div className="space-y-8">
      <Card className="p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">Upload documents</h2>
            <p className="text-sm text-muted-foreground">
              Drag files here or use the picker. Files are uploaded with signed S3 URLs and stored per category.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="w-full sm:w-60">
              <Label htmlFor="document-category">Category</Label>
              <Select value={selectedCategoryId} onValueChange={onSelectCategory}>
                <SelectTrigger id="document-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-60">
              <Label htmlFor="document-visibility">Visibility</Label>
              <Select value={newDocumentVisibility} onValueChange={(value: DocumentVisibility) => setNewDocumentVisibility(value)}>
                <SelectTrigger id="document-visibility">
                  <SelectValue placeholder="Visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="shared">Shared</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="document-picker" className="sr-only">
                Document picker
              </Label>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || !selectedCategoryId}
              >
                Choose files
              </Button>
              <input
                ref={fileInputRef}
                id="document-picker"
                type="file"
                multiple
                className="hidden"
                onChange={onFileInputChange}
              />
            </div>
          </div>

          <div
            ref={dropRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              'flex min-h-[160px] items-center justify-center rounded-md border-2 border-dashed p-6 transition',
              isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/20',
            )}
          >
            <div className="text-center">
              <p className="font-medium">Drop files to upload</p>
              <p className="text-sm text-muted-foreground">
                Files up to {formatBytes(MAX_FILE_SIZE_BYTES)}. Supported types: PDF, images, documents, text.
              </p>
              {isUploading && <p className="mt-2 text-sm text-muted-foreground">Uploading in progress…</p>}
            </div>
          </div>

          {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Documents</h2>
            <p className="text-sm text-muted-foreground">
              Manage uploaded content by category, update permissions, and review the audit trail.
            </p>
          </div>
          <Button variant="outline" onClick={() => fetchDashboard()} disabled={isUploading}>
            Refresh
          </Button>
        </div>

        {filteredDocuments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents found for the selected category.</p>
        ) : (
          <Table headers={['Document', 'Category', 'Visibility', 'Size', 'Actions']}>
            <div className="mx-2 rounded-sm bg-white dark:bg-inherit">
              {filteredDocuments.map((document) => (
                <div
                  key={document.id}
                  className="grid grid-cols-5 gap-3 rounded-sm p-3 align-middle text-sm"
                >
                  <div>
                    <p className="font-medium">{document.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {new Date(document.createdAt).toLocaleString()} by{' '}
                      {document.uploadedByName || document.uploadedByEmail || document.uploadedBy}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Badge variant="secondary" className="w-fit">
                      {document.categoryName ?? 'Uncategorised'}
                    </Badge>
                  </div>
                  <div>
                    <Badge className="w-fit" variant={document.visibility === 'public' ? 'default' : 'outline'}>
                      {visibilityLabel(document.visibility)}
                    </Badge>
                  </div>
                  <div className="font-medium">{formatBytes(document.size)}</div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openPermissionsDialog(document)}>
                      Manage permissions
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openPermissionsDialog(document)}>
                      Audit log
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Table>
        )}
      </Card>

      {isAdmin && (
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Reports &amp; exports</h2>
            <p className="text-sm text-muted-foreground">
              Configure filters and export a CSV report or review the generated insights for administrators.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Categories</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const selected = reportState.categoryIds.includes(category.id)
                    return (
                      <button
                        type="button"
                        key={category.id}
                        onClick={() => toggleCategoryFilter(category.id)}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs transition',
                          selected ? 'border-primary bg-primary/10 text-primary' : 'border-muted-foreground/20',
                        )}
                      >
                        {category.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold">Visibility</h3>
                <div className="mt-2 flex flex-wrap gap-3">
                  {(['private', 'shared', 'public'] satisfies DocumentVisibility[]).map((value) => {
                    const selected = reportState.visibility.includes(value)
                    return (
                      <label key={value} className="flex items-center gap-2 text-sm">
                        <Switch checked={selected} onCheckedChange={() => toggleVisibilityFilter(value)} />
                        {visibilityLabel(value)}
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="report-start">Start date</Label>
                  <Input
                    id="report-start"
                    type="date"
                    value={reportState.startDate}
                    onChange={(event) => updateDateFilter('startDate', event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="report-end">End date</Label>
                  <Input
                    id="report-end"
                    type="date"
                    value={reportState.endDate}
                    onChange={(event) => updateDateFilter('endDate', event.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button disabled={isReportLoading} onClick={() => requestReport('json')}>
                  Preview report
                </Button>
                <Button
                  variant="outline"
                  disabled={isReportLoading}
                  onClick={() => requestReport('csv')}
                >
                  Export CSV
                </Button>
              </div>
            </div>

            <div className="rounded-md border bg-muted/30 p-4 text-sm">
              <h3 className="mb-2 text-sm font-semibold">Report preview</h3>
              <p className="text-sm text-muted-foreground">
                Preview updates in real-time as you adjust filters. Use the export option to download a CSV snapshot.
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Total documents</p>
                  <p className="text-lg font-semibold">{localReportPreview.totalCount}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Total storage</p>
                  <p className="text-lg font-semibold">{formatBytes(localReportPreview.totalSize)}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(localReportPreview.totalsByVisibility).map(([key, value]) => (
                    <div key={key} className="rounded border bg-background/70 p-3">
                      <p className="text-xs uppercase text-muted-foreground">{visibilityLabel(key as DocumentVisibility)}</p>
                      <p className="text-sm font-semibold">{value.count} files</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(value.size)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {reportPreview && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold">Last exported snapshot</h4>
                  <p className="text-xs text-muted-foreground">
                    {reportPreview.totalCount} files totalling {formatBytes(reportPreview.totalSize)}
                  </p>
                  <pre className="mt-2 max-h-48 overflow-auto rounded bg-background/80 p-2 text-xs">
                    {documentReportToCsv(reportPreview)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      <Dialog open={permissionsDialogOpen} onOpenChange={(open) => (open ? setPermissionsDialogOpen(true) : closePermissionsDialog())}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Document permissions</DialogTitle>
            <DialogDescription>
              Configure access rules and review the audit history for the selected document.
            </DialogDescription>
          </DialogHeader>

          {activeDocument ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-semibold">{activeDocument.name}</p>
                <p className="text-xs text-muted-foreground">
                  Uploaded {new Date(activeDocument.createdAt).toLocaleString()} by{' '}
                  {activeDocument.uploadedByName || activeDocument.uploadedByEmail || activeDocument.uploadedBy}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="permission-visibility">Visibility</Label>
                  <Select value={pendingVisibility} onValueChange={(value: DocumentVisibility) => setPendingVisibility(value)}>
                    <SelectTrigger id="permission-visibility">
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="shared">Shared</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="permission-roles">Allowed roles (comma separated)</Label>
                  <Input
                    id="permission-roles"
                    value={pendingRoles}
                    onChange={(event) => setPendingRoles(event.target.value)}
                    placeholder="admin, manager"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="permission-users">Allowed user IDs (comma separated)</Label>
                  <Input
                    id="permission-users"
                    value={pendingUsers}
                    onChange={(event) => setPendingUsers(event.target.value)}
                    placeholder="uuid-1, uuid-2"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">Audit history</p>
                {isAuditLoading ? (
                  <p className="text-xs text-muted-foreground">Loading audit entries…</p>
                ) : auditTrail.length > 0 ? (
                  <div className="max-h-60 space-y-3 overflow-y-auto pr-2">
                    {auditTrail.map((entry) => (
                      <div key={entry.id} className="rounded-md border bg-muted/30 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">{entry.action.replace(/_/g, ' ')}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {entry.actorName || entry.actorEmail || entry.actorId}
                        </p>
                        {entry.context && (
                          <pre className="mt-2 max-h-24 overflow-auto rounded bg-background/80 p-2 text-xs">
                            {JSON.stringify(entry.context, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No audit entries recorded for this document.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select a document to manage its permissions.</p>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closePermissionsDialog}>
              Cancel
            </Button>
            <Button onClick={() => void savePermissions()} disabled={isSavingPermissions}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DocumentManager
