import { workflowSteps } from "../landing-content"
import { LANDING_SECTION_IDS } from "../landing-ids"
import { LandingSection, SectionHeading } from "../section-primitives"

export function WorkflowSection() {
  return (
    <LandingSection id={LANDING_SECTION_IDS.workflow} headingId="workflow-heading" contentClassName="py-20 sm:py-24">
      <SectionHeading
        id="workflow-heading"
        title="How households move into Roomsily"
        description="Guided onboarding and contextual tips remove the friction from getting every roommate connected."
      />
      <ol className="relative mt-12 grid gap-6 md:grid-cols-4">
        {workflowSteps.map((item, index) => (
          <li
            key={item.step}
            className="relative flex h-full flex-col gap-4 rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {item.step}
            </span>
            <h3 className="text-heading-sm text-foreground">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.description}</p>
            {index < workflowSteps.length - 1 ? (
              <span
                className="absolute right-[-18px] top-1/2 hidden h-px w-10 -translate-y-1/2 bg-border md:block"
                aria-hidden="true"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </LandingSection>
  )
}
