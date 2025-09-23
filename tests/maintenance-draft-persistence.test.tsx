// @vitest-environment jsdom

import React, { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { useForm, type UseFormReturn } from "react-hook-form";

import {
  useDraftPersistence,
  type DraftPersistencePayload,
  type UseDraftPersistenceOptions,
  type UseDraftPersistenceResult,
} from "@/hooks/use-draft-persistence";

const STORAGE_KEY = "maintenance-request-draft";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

interface TestFormValues {
  title: string;
  description: string;
  priority: "low" | "normal" | "high" | "urgent";
  category: string;
  location: string;
}

interface HarnessContext {
  form: UseFormReturn<TestFormValues>;
  manager: UseDraftPersistenceResult<TestFormValues>;
  unmount: () => void;
}

type DraftHarnessOptions = Partial<
  Omit<UseDraftPersistenceOptions<TestFormValues>, "form" | "storageKey">
>;

async function renderDraftHarness(options: DraftHarnessOptions = {}): Promise<HarnessContext> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  let resolveReady: ((value: HarnessContext) => void) | null = null;
  const ready = new Promise<HarnessContext>((resolve) => {
    resolveReady = resolve;
  });

  function TestHarness() {
    const form = useForm<TestFormValues>({
      defaultValues: {
        title: "",
        description: "",
        priority: "normal",
        category: "",
        location: "",
      },
    });

    const manager = useDraftPersistence<TestFormValues>({
      form,
      storageKey: STORAGE_KEY,
      ...options,
    });

    useEffect(() => {
      if (!resolveReady) return;

      resolveReady({
        form,
        manager,
        unmount: () => {
          act(() => {
            root.unmount();
            container.remove();
          });
        },
      });
    }, [form, manager]);

    return null;
  }

  await act(async () => {
    root.render(<TestHarness />);
  });

  return ready;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("useDraftPersistence", () => {
  it("hydrates the form from a saved draft on mount", async () => {
    const savedDraft: DraftPersistencePayload<TestFormValues> = {
      values: {
        title: "Leaky faucet",
        description: "Water has been dripping nonstop for two days.",
        priority: "high",
        category: "Plumbing",
        location: "Kitchen",
      },
      updatedAt: Date.now(),
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDraft));

    const { form, unmount } = await renderDraftHarness();

    expect(form.getValues()).toMatchObject(savedDraft.values);

    unmount();
  });

  it("flushes changes so no more than ten seconds of input is lost", async () => {
    vi.useFakeTimers();
    let now = 0;
    vi.spyOn(Date, "now").mockImplementation(() => now);

    const persisted: DraftPersistencePayload<TestFormValues>[] = [];
    const persistDraft = vi.fn(async (payload: DraftPersistencePayload<TestFormValues>) => {
      persisted.push(payload);
    });

    const { form, unmount } = await renderDraftHarness({ persistDraft });

    for (let iteration = 0; iteration < 6; iteration += 1) {
      await act(async () => {
        form.setValue("description", `Update ${iteration}`, { shouldDirty: true });
      });

      now += 2000;
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });
    }

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const storedDraft = window.localStorage.getItem(STORAGE_KEY);
    expect(storedDraft).not.toBeNull();

    const parsedDraft = JSON.parse(storedDraft!) as DraftPersistencePayload<TestFormValues>;
    expect(now - parsedDraft.updatedAt).toBeLessThanOrEqual(10_000);

    expect(persistDraft).toHaveBeenCalled();
    expect(persisted.length).toBeGreaterThan(0);
    const lastPersist = persisted[persisted.length - 1];
    expect(now - lastPersist.updatedAt).toBeLessThanOrEqual(10_000);

    unmount();
  });
});
