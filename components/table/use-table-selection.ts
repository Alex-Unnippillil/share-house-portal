'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export interface UseTableSelectionOptions<T> {
  items: T[];
  getId: (item: T) => string;
  isItemSelectable?: (item: T) => boolean;
}

export interface TableSelectionController {
  selectedIds: string[];
  toggleItem: (id: string) => void;
  toggleAll: () => void;
  isSelected: (id: string) => boolean;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  clearSelection: () => void;
  selectableCount: number;
}

export function useTableSelection<T>({
  items,
  getId,
  isItemSelectable,
}: UseTableSelectionOptions<T>): TableSelectionController {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectableItems = useMemo(() => {
    if (!isItemSelectable) {
      return items;
    }

    return items.filter((item) => isItemSelectable(item));
  }, [items, isItemSelectable]);

  const selectableIds = useMemo(() => selectableItems.map((item) => getId(item)), [
    selectableItems,
    getId,
  ]);

  const selectableIdSet = useMemo(() => new Set(selectableIds), [selectableIds]);

  useEffect(() => {
    setSelectedIds((previous) => previous.filter((id) => selectableIdSet.has(id)));
  }, [selectableIdSet]);

  const toggleItem = useCallback(
    (id: string) => {
      if (!selectableIdSet.has(id)) {
        return;
      }

      setSelectedIds((previous) => {
        if (previous.includes(id)) {
          return previous.filter((value) => value !== id);
        }

        return [...previous, id];
      });
    },
    [selectableIdSet],
  );

  const toggleAll = useCallback(() => {
    setSelectedIds((previous) => {
      if (selectableIds.length === 0) {
        return [];
      }

      const hasAllSelected = previous.length === selectableIds.length;
      return hasAllSelected ? [] : selectableIds;
    });
  }, [selectableIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.includes(id),
    [selectedIds],
  );

  const { isAllSelected, isIndeterminate } = useMemo(() => {
    if (selectableIds.length === 0) {
      return { isAllSelected: false, isIndeterminate: false };
    }

    if (selectedIds.length === 0) {
      return { isAllSelected: false, isIndeterminate: false };
    }

    if (selectedIds.length === selectableIds.length) {
      return { isAllSelected: true, isIndeterminate: false };
    }

    return { isAllSelected: false, isIndeterminate: true };
  }, [selectedIds, selectableIds]);

  return {
    selectedIds,
    toggleItem,
    toggleAll,
    isSelected,
    isAllSelected,
    isIndeterminate,
    clearSelection,
    selectableCount: selectableIds.length,
  };
}
