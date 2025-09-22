"use client";

import { useMemo, useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, ShoppingCart, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";

import CreateForm from "./CreateForm";
import { logPurchase, removeToBuyItem } from "../actions";
import {
  PRIORITY_LABELS,
  PRIORITY_LEVELS,
  PRIORITY_RANK,
  type PriorityLevel,
} from "../constants";

type SupplyItem = {
  id: string;
  name: string;
};

type ToBuyItem = {
  id: string;
  priority: PriorityLevel;
  fulfilled_at: string | null;
  created_at: string;
  supply_item: SupplyItem | null;
};

type FilterValue = "all" | PriorityLevel;

type ToBuyListProps = {
  items: ToBuyItem[];
  supplyItems: SupplyItem[];
};

const FILTER_OPTIONS: FilterValue[] = ["all", ...PRIORITY_LEVELS];

export default function ToBuyList({ items, supplyItems }: ToBuyListProps) {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [isPending, startTransition] = useTransition();

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const rankDifference = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      if (rankDifference !== 0) {
        return rankDifference;
      }

      const aFulfilled = Boolean(a.fulfilled_at);
      const bFulfilled = Boolean(b.fulfilled_at);
      if (aFulfilled !== bFulfilled) {
        return Number(aFulfilled) - Number(bFulfilled);
      }

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    if (filter === "all") {
      return sortedItems;
    }

    return sortedItems.filter((item) => item.priority === filter);
  }, [sortedItems, filter]);

  const outstandingItems = filteredItems.filter((item) => !item.fulfilled_at);
  const fulfilledItems = filteredItems.filter((item) => item.fulfilled_at);

  const handleRemove = (id: string) => {
    startTransition(async () => {
      try {
        await removeToBuyItem(id);
        toast({ title: "Item removed" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "We couldn't remove that item right now.";
        toast({
          variant: "destructive",
          title: "Removal failed",
          description: message,
        });
      }
    });
  };

  const handleLogPurchase = (id: string) => {
    startTransition(async () => {
      try {
        await logPurchase(id);
        toast({ title: "Purchase logged" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "We couldn't log that purchase right now.";
        toast({
          variant: "destructive",
          title: "Action failed",
          description: message,
        });
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <ShoppingCart className="size-5" />
            Add to shopping list
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CreateForm existingItems={supplyItems} />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Household shopping list</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((option) => (
              <Button
                key={option}
                variant={filter === option ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(option)}
                disabled={isPending}
              >
                {option === "all" ? "All" : PRIORITY_LABELS[option]}
              </Button>
            ))}
          </div>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">
              Needs purchasing
            </h3>
            {outstandingItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You&rsquo;re all stocked up! Add an item on the left when something runs low.
              </p>
            ) : (
              <ul className="space-y-3">
                {outstandingItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-medium">
                          {item.supply_item?.name ?? "Unnamed item"}
                        </span>
                        <Badge>{PRIORITY_LABELS[item.priority]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Added {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLogPurchase(item.id)}
                        disabled={isPending}
                      >
                        Log purchase
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove item"
                        onClick={() => handleRemove(item.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Separator />

          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground">
              <CheckCircle2 className="size-4" /> Fulfilled
            </h3>
            {fulfilledItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent purchases logged yet.</p>
            ) : (
              <ul className="space-y-3">
                {fulfilledItems.map((item) => (
                  <li key={item.id} className="rounded-md border bg-muted/40 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {item.supply_item?.name ?? "Unnamed item"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Purchased {formatDistanceToNow(new Date(item.fulfilled_at ?? item.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <Badge variant="secondary">{PRIORITY_LABELS[item.priority]}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
