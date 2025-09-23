"use client";

import { useCallback } from "react";

import { useToast } from "@/components/ui/use-toast";
import { useOfflineMutation } from "@/hooks/use-offline-mutation";
import { OfflineMutationRetryableError } from "@/lib/offline/errors";
import type { OfflineQueueEvent } from "@/lib/offline/mutate-offline";
import { createTodo, updateTodoById } from "@/app/dashboard/todo/actions";

export const TODO_CREATE_MUTATION_KEY = "todo:create";
export const TODO_UPDATE_MUTATION_KEY = "todo:update";

export interface TodoMutationInput {
  title: string;
  completed: boolean;
}

export interface TodoCreatePayload {
  todo: TodoMutationInput;
}

export interface TodoUpdatePayload {
  id: string;
  todo: TodoMutationInput;
}

export interface TodoRecord extends TodoMutationInput {
  id: string;
  updatedAt?: string;
}

function isLikelyNetworkError(error: unknown) {
  if (!error) {
    return false;
  }

  if (error instanceof OfflineMutationRetryableError) {
    return true;
  }

  if (error instanceof TypeError && typeof error.message === "string") {
    return error.message.toLowerCase().includes("fetch");
  }

  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = typeof record.message === "string" ? record.message.toLowerCase() : "";
    if (message.includes("network") || message.includes("fetch")) {
      return true;
    }
  }

  return false;
}

export function useTodoMutations() {
  const { toast } = useToast();

  const createHandler = useCallback(async ({ todo }: TodoCreatePayload) => {
    const result = await createTodo(todo);
    return result;
  }, []);

  const updateHandler = useCallback(async ({ id, todo }: TodoUpdatePayload) => {
    const result = await updateTodoById(id, todo);
    return result;
  }, []);

  const handleCreateEvent = useCallback(
    (event: OfflineQueueEvent) => {
      if (event.type === "synced") {
        toast({
          title: "Queued chore added",
          description: "We synced your todo with the dashboard.",
        });
      } else if (event.type === "failed") {
        toast({
          title: "Todo sync failed",
          description: "We'll retry updating your todo shortly.",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const handleUpdateEvent = useCallback(
    (event: OfflineQueueEvent) => {
      if (event.type === "synced") {
        toast({
          title: "Queued update applied",
          description: "Your todo changes synced when you reconnected.",
        });
      } else if (event.type === "failed") {
        toast({
          title: "Todo update failed",
          description: "We'll retry saving your changes soon.",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const createMutation = useOfflineMutation<TodoCreatePayload, TodoRecord>({
    key: TODO_CREATE_MUTATION_KEY,
    handler: createHandler,
    shouldQueueOnError: (error) => isLikelyNetworkError(error),
    onEvent: handleCreateEvent,
  });

  const updateMutation = useOfflineMutation<TodoUpdatePayload, TodoRecord>({
    key: TODO_UPDATE_MUTATION_KEY,
    handler: updateHandler,
    shouldQueueOnError: (error) => isLikelyNetworkError(error),
    onEvent: handleUpdateEvent,
  });

  return {
    createMutation,
    updateMutation,
  };
}
