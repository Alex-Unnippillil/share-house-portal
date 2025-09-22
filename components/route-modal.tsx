"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface RouteModalProps {
  children: ReactNode;
  className?: string;
  returnTo?: string;
  open?: boolean;
}

function canGoBack() {
  if (typeof window === "undefined") {
    return false;
  }

  const historyState = window.history.state as { idx?: number } | null;
  if (historyState && typeof historyState.idx === "number") {
    return historyState.idx > 0;
  }

  return window.history.length > 1;
}

export function RouteModal({
  children,
  className,
  returnTo,
  open = true,
}: RouteModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [shouldRender, setShouldRender] = useState(open);

  useEffect(() => {
    setShouldRender(open);
  }, [open]);

  const handleClose = useCallback(() => {
    if (canGoBack()) {
      router.back();
    } else {
      router.push(returnTo ?? pathname.split("/").slice(0, -1).join("/") || "/");
    }
  }, [pathname, returnTo, router]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent
        className={cn(
          "max-h-[90vh] overflow-hidden border-none p-0 sm:max-w-4xl",
          className,
        )}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          handleClose();
        }}
        onPointerDownOutside={(event) => {
          event.preventDefault();
          handleClose();
        }}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
