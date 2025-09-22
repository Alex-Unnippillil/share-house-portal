import React, { memo } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";

import {
  SidebarProvider,
  useSidebarOpen,
  useSidebarToggle,
} from "@/lib/hooks/use-sidebar";

const toggleRenderSpy = vi.fn();
const indicatorRenderSpy = vi.fn();

const ToggleButton = memo(function ToggleButton() {
  const toggleSidebar = useSidebarToggle();
  toggleRenderSpy();

  return (
    <button type="button" onClick={toggleSidebar}>
      Toggle sidebar
    </button>
  );
});

const Indicator = memo(function Indicator() {
  const isOpen = useSidebarOpen();
  indicatorRenderSpy(isOpen);

  return <span>{isOpen ? "open" : "closed"}</span>;
});

describe("sidebar state context", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.localStorage.removeItem("sidebar");
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps action-only consumers from rerendering on state updates", () => {
    const { getByRole, getByText } = render(
      <SidebarProvider>
        <ToggleButton />
        <Indicator />
      </SidebarProvider>
    );

    expect(getByText("closed")).toBeTruthy();
    const initialToggleRenders = toggleRenderSpy.mock.calls.length;
    const initialIndicatorRenders = indicatorRenderSpy.mock.calls.length;
    expect(initialToggleRenders).toBeGreaterThan(0);
    expect(initialIndicatorRenders).toBeGreaterThan(0);

    fireEvent.click(getByRole("button", { name: /toggle sidebar/i }));

    expect(getByText("open")).toBeTruthy();
    expect(toggleRenderSpy).toHaveBeenCalledTimes(initialToggleRenders);
    expect(indicatorRenderSpy).toHaveBeenCalledTimes(
      initialIndicatorRenders + 1
    );
  });
});
