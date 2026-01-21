// "use server";

import { OfflineMutationRetryableError } from "@/lib/offline/errors";

export type TodoActionPayload = {
        title: string;
        completed: boolean;
};

export type TodoActionResult = TodoActionPayload & {
        id: string;
        updatedAt: string;
};

async function simulateNetworkLatency() {
        await new Promise((resolve) => setTimeout(resolve, 40));
}

function generateId() {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
                return crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function createTodo(payload: TodoActionPayload): Promise<TodoActionResult> {
        try {
                await simulateNetworkLatency();
                return {
                        ...payload,
                        id: generateId(),
                        updatedAt: new Date().toISOString(),
                };
        } catch (error) {
                throw new OfflineMutationRetryableError("Failed to create todo", error);
        }
}

export async function updateTodoById(
        id: string,
        payload: TodoActionPayload,
): Promise<TodoActionResult> {
        try {
                await simulateNetworkLatency();
                return {
                        ...payload,
                        id,
                        updatedAt: new Date().toISOString(),
                };
        } catch (error) {
                throw new OfflineMutationRetryableError("Failed to update todo", error);
        }
}

export async function deleteTodoById(id: string) {}
export async function readTodos() {}
