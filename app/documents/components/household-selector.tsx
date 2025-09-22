'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface HouseholdSelectorProps {
  availableUnits: { id: string; label?: string }[];
  selectedUnit?: string;
  disabled?: boolean;
  className?: string;
}

export function HouseholdSelector({
  availableUnits,
  selectedUnit,
  disabled,
  className,
}: HouseholdSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const options = useMemo(() => {
    const deduped = new Map<string, { id: string; label?: string }>();

    availableUnits.forEach((unit) => {
      if (unit.id) {
        deduped.set(unit.id, unit);
      }
    });

    if (selectedUnit && !deduped.has(selectedUnit)) {
      deduped.set(selectedUnit, { id: selectedUnit, label: selectedUnit });
    }

    return Array.from(deduped.values());
  }, [availableUnits, selectedUnit]);

  if (options.length === 0) {
    return null;
  }

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set('unit', value);
    } else {
      params.delete('unit');
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const currentValue = selectedUnit ?? options[0]?.id ?? '';

  return (
    <div className={className}>
      <Label htmlFor="household-select">Household</Label>
      <Select
        value={currentValue}
        onValueChange={handleChange}
        disabled={disabled || options.length === 0}
      >
        <SelectTrigger id="household-select">
          <SelectValue placeholder="Choose a household" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label ?? option.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
