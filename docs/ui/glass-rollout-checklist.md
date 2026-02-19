# Glass UI Rollout QA Checklist

Use this checklist before approving visual updates that touch glassmorphism styling, shared layout chrome, or dashboard surfaces.

## Target routes (exact)

- Marketing home: `/`
- Dashboard root: `/dashboard`
- Overlay-heavy screen: `/documents` (upload/document viewer/signature dialogs)
- Table-heavy screen: `/dashboard/members`

## Viewport checklist

### Desktop — 1280px

- [ ] Primary navigation labels are clear and scannable at a glance.
- [ ] Top-level nav hierarchy is still obvious when glass effects are enabled.
- [ ] Card headings, metadata, and body copy meet readability expectations on glass backgrounds.
- [ ] Elevated panels maintain contrast over layered backgrounds (no washed-out text).

### Tablet — 900px

- [ ] Dashboard/navigation Sheet opens and closes smoothly from expected trigger points.
- [ ] Sheet content preserves spacing rhythm and does not clip within viewport height.
- [ ] Panel polish remains consistent (radius, border, blur, shadow) across major cards.
- [ ] No overlap/regression between sticky headers, Sheets, and page content.

### Mobile — 390px

- [ ] Tap targets for nav items, icon buttons, and row actions are comfortably usable.
- [ ] Critical actions do not rely on hover-only affordances.
- [ ] Dialog/sheet close controls remain reachable with one-handed interaction.
- [ ] Dense surfaces (cards/tables converted to stacked layouts) remain readable without zoom.

## Theming and accessibility checks

### Dark mode scan

- [ ] Review the target routes in dark mode for hard-coded gray values that break contrast.
- [ ] Check for undefined or mistyped utility classes producing missing styles.
- [ ] Verify semantic color tokens are applied consistently to borders, text, and panel fills.

### Reduced motion

- [ ] Enable reduced motion and confirm core UI remains understandable without transforms.
- [ ] Ensure key interactions (open/close, focus changes, state transitions) do not depend on animation.
- [ ] Confirm motion-reduced states still communicate hierarchy and active context.

## Snapshot update policy

Only update Playwright snapshots when a visual change is intentional and reviewed. If a snapshot diff is unexpected, treat it as a potential regression and investigate before accepting.
