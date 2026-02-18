import Link from "next/link"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export interface BlueprintMetric {
  label: string
  value: string
  helperText?: string
}

export interface BlueprintCta {
  label: string
  href: string
}

export interface BlueprintSupportModule {
  title: string
  description: string
}

interface PortalPageBlueprintProps {
  title: string
  description: string
  metrics: BlueprintMetric[]
  primaryActionTitle: string
  primaryActionDescription: string
  primaryCta: BlueprintCta
  fallbackCta: BlueprintCta
  supportModules: BlueprintSupportModule[]
}

export function PortalPageBlueprint({
  title,
  description,
  metrics,
  primaryActionTitle,
  primaryActionDescription,
  primaryCta,
  fallbackCta,
  supportModules,
}: PortalPageBlueprintProps) {
  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">
          {description}
        </p>
      </header>

      <Card className="transition-shadow duration-300">
        <CardContent className="grid gap-4 p-6 sm:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {metric.label}
              </p>
              <p className="text-2xl font-semibold">{metric.value}</p>
              {metric.helperText ? (
                <p className="text-xs text-muted-foreground">
                  {metric.helperText}
                </p>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="border-primary/40 bg-primary/5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader>
            <CardTitle>{primaryActionTitle}</CardTitle>
            <CardDescription>{primaryActionDescription}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href={primaryCta.href} className={buttonVariants()}>
              {primaryCta.label}
            </Link>
            <Link
              href={fallbackCta.href}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              {fallbackCta.label}
            </Link>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {supportModules.map((module) => (
            <Card
              key={module.title}
              className="transition-colors hover:bg-muted/30"
            >
              <CardHeader className="space-y-2 pb-4">
                <CardTitle className="text-base">{module.title}</CardTitle>
                <CardDescription className="text-xs">
                  {module.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      <Separator />
    </section>
  )
}
