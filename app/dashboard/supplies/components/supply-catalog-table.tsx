"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { useFormState, useFormStatus } from "react-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { deleteSupplyItem, updateSupplyItem } from "../actions";
import {
        SUPPLY_ACTION_INITIAL_STATE,
        SUPPLY_SPLIT_OPTIONS,
        type SupplyActionState,
        type SupplyDefaultSplit,
        type SupplyItem,
} from "@/types/supplies";

function FieldError({ message }: { message?: string }) {
        if (!message) {
                return null;
        }

        return <p className="text-xs text-red-600">{message}</p>;
}

function SaveButton({ children }: { children?: React.ReactNode }) {
        const { pending } = useFormStatus();
        return (
                <Button type="submit" disabled={pending}>
                        {pending ? "Saving…" : children ?? "Save"}
                </Button>
        );
}

function SupplyCatalogRow({ item }: { item: SupplyItem }) {
        const [defaultSplit, setDefaultSplit] = React.useState<SupplyDefaultSplit>(item.default_split);
        const [isActive, setIsActive] = React.useState(item.is_active);
        const [state, formAction] = useFormState<SupplyActionState, FormData>(
                updateSupplyItem,
                SUPPLY_ACTION_INITIAL_STATE
        );

        const updatedLabel = React.useMemo(() => {
                try {
                        return formatDistanceToNow(new Date(item.updated_at), { addSuffix: true });
                } catch (error) {
                        return null;
                }
        }, [item.updated_at]);

        return (
                <form
                        action={formAction}
                        className="grid gap-4 border-t px-4 py-6 text-sm sm:grid-cols-[2fr_1.25fr_1.2fr_1.2fr_1.2fr_1.5fr] sm:items-start"
                >
                        <input type="hidden" name="id" value={item.id} />
                        <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-base font-semibold leading-tight">{item.name}</p>
                                        <Badge variant="secondary" className="capitalize">
                                                {item.category}
                                        </Badge>
                                </div>
                                {item.description ? (
                                        <p className="text-sm text-muted-foreground">{item.description}</p>
                                ) : null}
                                {updatedLabel ? (
                                        <p className="text-xs text-muted-foreground">Updated {updatedLabel}</p>
                                ) : null}
                        </div>
                        <div className="space-y-2">
                                <Label htmlFor={`unit-${item.id}`}>Unit</Label>
                                <Input id={`unit-${item.id}`} name="unit" defaultValue={item.unit} required />
                                <FieldError message={state.fieldErrors?.unit} />
                        </div>
                        <div className="space-y-2">
                                <Label htmlFor={`quantity-${item.id}`}>Default qty</Label>
                                <Input
                                        id={`quantity-${item.id}`}
                                        name="default_quantity"
                                        type="number"
                                        min={1}
                                        defaultValue={item.default_quantity}
                                        required
                                />
                                <FieldError message={state.fieldErrors?.default_quantity} />
                        </div>
                        <div className="space-y-2">
                                <Label htmlFor={`split-${item.id}`}>Split</Label>
                                <Select
                                        value={defaultSplit}
                                        onValueChange={(value) => setDefaultSplit(value as SupplyDefaultSplit)}
                                >
                                        <SelectTrigger id={`split-${item.id}`}>
                                                <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                                {SUPPLY_SPLIT_OPTIONS.map((option) => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                                {option.label}
                                                        </SelectItem>
                                                ))}
                                        </SelectContent>
                                </Select>
                                <input type="hidden" name="default_split" value={defaultSplit} />
                                <FieldError message={state.fieldErrors?.default_split} />
                        </div>
                        <div className="space-y-2">
                                <Label htmlFor={`active-${item.id}`}>Status</Label>
                                <div className="flex items-center gap-3 rounded-md border border-muted-foreground/30 px-3 py-2">
                                        <Switch
                                                id={`active-${item.id}`}
                                                checked={isActive}
                                                onCheckedChange={setIsActive}
                                        />
                                        <span className="text-sm text-muted-foreground">
                                                {isActive ? "Visible" : "Hidden"}
                                        </span>
                                </div>
                                <input type="hidden" name="is_active" value={String(isActive)} />
                        </div>
                        <div className="flex flex-col items-start justify-between gap-3 sm:items-end">
                                {state.message ? (
                                        <p
                                                className={cn(
                                                        "text-xs",
                                                        state.status === "error"
                                                                ? "text-red-600"
                                                                : "text-emerald-600"
                                                )}
                                        >
                                                {state.message}
                                        </p>
                                ) : null}
                                <div className="flex items-center gap-2">
                                        <Button variant="outline" type="submit" formAction={deleteSupplyItem}>
                                                Remove
                                        </Button>
                                        <SaveButton>Save</SaveButton>
                                </div>
                        </div>
                </form>
        );
}

function EmptyState() {
        return (
                <div className="rounded-xl border border-dashed border-muted-foreground/40 p-10 text-center">
                        <p className="font-medium">No catalog items yet</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                                Create a supply item to define default purchase expectations for your property.
                        </p>
                </div>
        );
}

export default function SupplyCatalogTable({ items }: { items: SupplyItem[] }) {
        if (!items.length) {
                return <EmptyState />;
        }

        return (
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <div className="hidden grid-cols-[2fr_1.25fr_1.2fr_1.2fr_1.2fr_1.5fr] gap-4 border-b px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid">
                                <span>Item</span>
                                <span>Unit</span>
                                <span>Quantity</span>
                                <span>Split</span>
                                <span>Status</span>
                                <span className="text-right">Actions</span>
                        </div>
                        <div>
                                {items.map((item) => (
                                        <SupplyCatalogRow key={item.id} item={item} />
                                ))}
                        </div>
                </div>
        );
}
