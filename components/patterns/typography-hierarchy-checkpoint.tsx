import {
  PageDescription,
  PageHeader,
  PageSection,
  PageTitle,
  SectionDescription,
  SectionTitle,
} from "@/components/ui/page-layout"

export function TypographyHierarchyCheckpoint() {
  return (
    <div className="mx-auto max-w-4xl space-y-section rounded-xl border bg-card p-content-gutter">
      <PageHeader withSeparator={false}>
        <PageTitle>Typography hierarchy checkpoint</PageTitle>
        <PageDescription>
          Baseline snapshot used for visual regression checks across semantic
          type tokens.
        </PageDescription>
      </PageHeader>

      <PageSection>
        <SectionTitle>Heading tier</SectionTitle>
        <SectionDescription>
          `text-heading-md` and `text-heading-sm` should preserve clear
          hierarchy relative to body copy.
        </SectionDescription>
      </PageSection>

      <PageSection className="space-y-stack-sm rounded-lg border bg-muted/40 p-4">
        <p className="text-heading-md">Heading medium / text-heading-md</p>
        <p className="text-heading-sm">Heading small / text-heading-sm</p>
        <p className="text-body-lg text-muted-foreground">
          Body large / text-body-lg
        </p>
        <p className="text-body-md text-muted-foreground">
          Body medium / text-body-md
        </p>
        <p className="text-body-sm text-muted-foreground">
          Body small / text-body-sm
        </p>
        <p className="text-label-sm uppercase text-muted-foreground">
          Label small / text-label-sm
        </p>
      </PageSection>
    </div>
  )
}
