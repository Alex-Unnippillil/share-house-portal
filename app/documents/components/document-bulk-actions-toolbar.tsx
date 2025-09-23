'use client';

import { Button } from '@/components/ui/button';

interface DocumentBulkActionsToolbarProps {
  selectedCount: number;
  selectableCount: number;
  onClearSelection: () => void;
  onDelete: () => void;
  onMoveTag: () => void;
  onExport: () => void;
  busyAction: 'delete' | 'update' | 'export' | null;
}

export function DocumentBulkActionsToolbar({
  selectedCount,
  selectableCount,
  onClearSelection,
  onDelete,
  onMoveTag,
  onExport,
  busyAction,
}: DocumentBulkActionsToolbarProps) {
  const selectionLabel = `${selectedCount} ${selectedCount === 1 ? 'document' : 'documents'} selected`;
  const manageableLabel = selectableCount === selectedCount
    ? `You can manage ${selectableCount} ${selectableCount === 1 ? 'document' : 'documents'} in this list.`
    : `Bulk actions apply to ${selectableCount} ${selectableCount === 1 ? 'document you can manage' : 'documents you can manage'}.`;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{selectionLabel}</p>
        <p className="text-xs text-muted-foreground">{manageableLabel}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="justify-start sm:justify-center"
        >
          Clear selection
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={busyAction !== null && busyAction !== 'delete'}
          >
            {busyAction === 'delete' ? 'Deleting…' : 'Delete'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onMoveTag}
            disabled={busyAction === 'update'}
          >
            {busyAction === 'update' ? 'Applying…' : 'Move / Tag'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onExport}
            disabled={busyAction !== null && busyAction !== 'export'}
          >
            {busyAction === 'export' ? 'Exporting…' : 'Export'}
          </Button>
        </div>
      </div>
    </div>
  );
}
