import React, { ReactNode } from "react"

export default function Table({
  children,
  headers,
}: {
  children: ReactNode
  headers: string[]
}) {
  return (
    <div className="glass-surface glass-border w-full overflow-y-auto rounded-md">
      <div className="w-[900px] space-y-5 rounded-md bg-background/70 py-5 lg:w-full">
        <div className="grid grid-cols-5 border-b border-border/70 px-5 py-2 pb-5">
          {headers.map((header, index) => {
            return (
              <h1
                key={index}
                className="text-sm font-medium text-muted-foreground"
              >
                {header}
              </h1>
            )
          })}
        </div>

        {children}
      </div>
    </div>
  )
}
