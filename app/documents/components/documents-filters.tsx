'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { DocumentListFilters, DocumentStatus, DocumentType } from '@/types/documents';
import { Filter, X } from 'lucide-react';

interface DocumentsFiltersProps {
  onFiltersChange?: (filters: DocumentListFilters) => void;
}

export function DocumentsFilters({ onFiltersChange }: DocumentsFiltersProps) {
  const [filters, setFilters] = useState<DocumentListFilters>({});

  const statusOptions: { value: DocumentStatus; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'pending_signature', label: 'Pending Signature' },
    { value: 'signed', label: 'Signed' },
    { value: 'expired', label: 'Expired' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const typeOptions: { value: DocumentType; label: string }[] = [
    { value: 'lease', label: 'Lease' },
    { value: 'addendum', label: 'Addendum' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'other', label: 'Other' },
  ];

  const updateFilters = (newFilters: DocumentListFilters) => {
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const toggleStatusFilter = (status: DocumentStatus, checked: boolean) => {
    const currentStatuses = filters.status || [];
    const newStatuses = checked
      ? [...currentStatuses, status]
      : currentStatuses.filter(s => s !== status);

    updateFilters({
      ...filters,
      status: newStatuses.length > 0 ? newStatuses : undefined,
    });
  };

  const toggleTypeFilter = (type: DocumentType, checked: boolean) => {
    const currentTypes = filters.type || [];
    const newTypes = checked
      ? [...currentTypes, type]
      : currentTypes.filter(t => t !== type);

    updateFilters({
      ...filters,
      type: newTypes.length > 0 ? newTypes : undefined,
    });
  };

  const clearFilters = () => {
    setFilters({});
    onFiltersChange?.({});
  };

  const activeFilterCount =
    (filters.status?.length || 0) +
    (filters.type?.length || 0) +
    (filters.lease_status?.length || 0) +
    (filters.tenant_id ? 1 : 0) +
    (filters.unit_id ? 1 : 0) +
    (filters.date_from ? 1 : 0) +
    (filters.date_to ? 1 : 0);

  return (
    <div className="flex items-center space-x-2">
      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 size-4" />
            Status
            {filters.status && filters.status.length > 0 && (
              <Badge variant="secondary" className="ml-2 size-4 p-0 text-xs">
                {filters.status.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {statusOptions.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={filters.status?.includes(option.value) || false}
              onCheckedChange={(checked) => toggleStatusFilter(option.value, checked)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Type Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Type
            {filters.type && filters.type.length > 0 && (
              <Badge variant="secondary" className="ml-2 size-4 p-0 text-xs">
                {filters.type.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {typeOptions.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={filters.type?.includes(option.value) || false}
              onCheckedChange={(checked) => toggleTypeFilter(option.value, checked)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="mr-2 size-4" />
          Clear ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
