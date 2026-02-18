"use client"

import { HamburgerMenuIcon } from "@radix-ui/react-icons"

import { Button } from "@/components/ui/button"

export default function ToggleSidebar() {
  return (
    <div className="sticky top-3 z-30 flex justify-end lg:hidden">
      <Button
        variant="outline"
        size="sm"
        className="gap-2 rounded-full bg-background/95 shadow-sm backdrop-blur"
        onClick={() => document.getElementById("toggle-sidebar")?.click()}
      >
        <HamburgerMenuIcon />
        Menu
      </Button>
    </div>
  )
}
