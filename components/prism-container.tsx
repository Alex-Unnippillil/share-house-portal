"use client"

import Image from "next/image"

export default function PrismContainer() {
  return (
    <div className="relative flex w-full items-center justify-center">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-primary/10 bg-background/80 shadow-2xl shadow-primary/10">
        <Image
          src="/share-house-hero.svg"
          alt="Preview of the Share House Portal showing rent balances, amenity calendar, and visitor check-ins"
          width={960}
          height={720}
          className="size-full object-cover"
          priority
        />
        <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-background/90 to-transparent p-6 text-sm">
          <p className="font-semibold text-foreground">Live unit snapshot</p>
          <div className="flex flex-wrap gap-4 text-muted-foreground">
            <div>
              <span className="block text-xs uppercase tracking-wide">Rent collected</span>
              <span className="text-base font-medium text-foreground">$6,420 / $6,550</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wide">Amenity bookings today</span>
              <span className="text-base font-medium text-foreground">12 confirmed</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wide">Guests cleared</span>
              <span className="text-base font-medium text-foreground">3 approvals</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
