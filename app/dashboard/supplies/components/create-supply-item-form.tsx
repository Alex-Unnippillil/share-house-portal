"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createSupplyItem } from "../actions";
import {
        SUPPLY_ACTION_INITIAL_STATE,
        SUPPLY_SPLIT_OPTIONS,
        type SupplyActionState,
        type SupplyDefaultSplit,
} from "@/types/supplies";

function FieldError({ message }: { message?: string }) {
        if (!message) {
                return null;
        }

        return <p className="text-sm text-red-600">{message}</p>;
}

function SubmitButton() {
        const { pending } = useFormStatus();
        return (
                <Button type="submit" disabled={pending}>
                        {pending ? "Saving…" : "Add item"}
                </Button>
        );
}

export default function CreateSupplyItemForm() {
        const formRef = React.useRef<HTMLFormElement>(null);
        const [defaultSplit, setDefaultSplit] = React.useState<SupplyDefaultSplit>("equal");
        const [isActive, setIsActive] = React.useState(true);
        const [state, formAction] = useFormState<SupplyActionState, FormData>(
                createSupplyItem,
                SUPPLY_ACTION_INITIAL_STATE
        );

        React.useEffect(() => {
                if (state.status === "success") {
                        formRef.current?.reset();
                        setDefaultSplit("equal");
                        setIsActive(true);
                }
        }, [state.status]);

        return (
                <Card>
                        <CardHeader>
                                <CardTitle>Add a catalog item</CardTitle>
                                <CardDescription>
                                        Capture the baseline details for a shared supply so future orders inherit the
                                        right defaults.
                                </CardDescription>
                        </CardHeader>
                        <CardContent>
                                <form ref={formRef} action={formAction} className="space-y-6">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="space-y-2">
                                                        <Label htmlFor="supply-name">Name</Label>
                                                        <Input
                                                                id="supply-name"
                                                                name="name"
                                                                placeholder="Paper towels"
                                                                required
                                                                autoComplete="off"
                                                        />
                                                        <FieldError message={state.fieldErrors?.name} />
                                                </div>
                                                <div className="space-y-2">
                                                        <Label htmlFor="supply-category">Category</Label>
                                                        <Input
                                                                id="supply-category"
                                                                name="category"
                                                                placeholder="Cleaning"
                                                                required
                                                                autoComplete="off"
                                                        />
                                                        <FieldError message={state.fieldErrors?.category} />
                                                </div>
                                        </div>

                                        <div className="space-y-2">
                                                <Label htmlFor="supply-description">Description (optional)</Label>
                                                <Textarea
                                                        id="supply-description"
                                                        name="description"
                                                        placeholder="Brand preference, restock cadence, storage notes…"
                                                        rows={3}
                                                />
                                                <FieldError message={state.fieldErrors?.description} />
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-3">
                                                <div className="space-y-2">
                                                        <Label htmlFor="supply-unit">Unit</Label>
                                                        <Input
                                                                id="supply-unit"
                                                                name="unit"
                                                                placeholder="roll"
                                                                required
                                                                autoComplete="off"
                                                        />
                                                        <FieldError message={state.fieldErrors?.unit} />
                                                </div>
                                                <div className="space-y-2">
                                                        <Label htmlFor="supply-default-quantity">Default quantity</Label>
                                                        <Input
                                                                id="supply-default-quantity"
                                                                name="default_quantity"
                                                                type="number"
                                                                min={1}
                                                                defaultValue={1}
                                                                required
                                                        />
                                                        <FieldError message={state.fieldErrors?.default_quantity} />
                                                </div>
                                                <div className="space-y-2">
                                                        <Label htmlFor="supply-default-split">Default split</Label>
                                                        <Select
                                                                value={defaultSplit}
                                                                onValueChange={(value) =>
                                                                        setDefaultSplit(value as SupplyDefaultSplit)
                                                                }
                                                        >
                                                                <SelectTrigger id="supply-default-split">
                                                                        <SelectValue placeholder="Choose split" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                        {SUPPLY_SPLIT_OPTIONS.map((option) => (
                                                                                <SelectItem key={option.value} value={option.value}>
                                                                                        <div className="flex flex-col text-left">
                                                                                                <span>{option.label}</span>
                                                                                                <span className="text-xs text-muted-foreground">
                                                                                                        {option.description}
                                                                                                </span>
                                                                                        </div>
                                                                                </SelectItem>
                                                                        ))}
                                                                </SelectContent>
                                                        </Select>
                                                        <input type="hidden" name="default_split" value={defaultSplit} />
                                                        <FieldError message={state.fieldErrors?.default_split} />
                                                </div>
                                        </div>

                                        <div className="flex flex-col gap-4 rounded-md border border-dashed border-muted-foreground/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                        <Label htmlFor="supply-is-active" className="text-sm font-medium">
                                                                Active in catalog
                                                        </Label>
                                                        <p className="text-sm text-muted-foreground">
                                                                Inactive items stay saved but are hidden from roommate ordering flows.
                                                        </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                        <Switch
                                                                id="supply-is-active"
                                                                checked={isActive}
                                                                onCheckedChange={setIsActive}
                                                        />
                                                        <span className="text-sm text-muted-foreground">
                                                                {isActive ? "Visible" : "Hidden"}
                                                        </span>
                                                </div>
                                        </div>
                                        <input type="hidden" name="is_active" value={String(isActive)} />

                                        {state.message ? (
                                                <p
                                                        className={cn(
                                                                "text-sm",
                                                                state.status === "error"
                                                                        ? "text-red-600"
                                                                        : "text-emerald-600"
                                                        )}
                                                >
                                                        {state.message}
                                                </p>
                                        ) : null}

                                        <div className="flex justify-end">
                                                <SubmitButton />
                                        </div>
                                </form>
                        </CardContent>
                </Card>
        );
}
