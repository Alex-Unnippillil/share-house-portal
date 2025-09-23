# Share House Portal Brand Voice & Copy Review Guide

## Purpose
This guide defines how Share House Portal communicates with tenants, roommates, and property stakeholders. It aligns design, product, and marketing teams around a shared voice, outlines the approval workflow for copy updates, and documents reviewer responsibilities so that every release maintains a consistent, inclusive experience.

## Brand Voice Principles
- **Tone:** Friendly, practical, and respectful. Speak like a considerate roommate who knows the building rules. Avoid sarcasm and jargon; offer clarity and empathy.
- **Personality:** Community-minded, proactive, and trustworthy. Celebrate collaboration and make it easy for residents to resolve tasks together.
- **Style:** Use active voice and concise sentences. Prefer second person ("you") when addressing tenants and first person plural ("we") for platform commitments. Keep headlines under 60 characters.
- **Vocabulary:** Use consistent terminology for product surfaces (e.g., "Amenity booking," "Overnight guest," "Payment receipt"). Reference Supabase or Stripe-specific nouns only when necessary for transparency.
- **Accessibility:** Follow inclusive language standards, avoid gendered terms, and provide context for icons or status indicators.

## Copy Review Workflow & Approval Steps
1. **Drafting:** Product designers or engineers draft copy in Figma, Notion, or directly in code while referencing the tone principles above.
2. **Self-Check:** Authors run through the Content QA checklist (spelling, accessibility, localized strings, feature flags) before requesting review.
3. **Request Review:** Tag the designated reviewers (see below) in the PR description and share any supporting context (screenshots, feature doc links).
4. **Apply Label:** When a PR contains user-facing copy updates, add the `copy-review` label. The automated Copy Review Check workflow will block merges until the label is present.
5. **Approval:** Copy changes require ✅ from the assigned Copy Editor **and** the feature-area Product Manager. Record approvals in the PR conversation.
6. **Handoff:** Once approvals are complete, confirm screenshots or Storybook links match the approved copy before merging.

## Reviewer Roles & Responsibilities
- **Copy Editor (Primary Owner):** Ensures tone adherence, grammar, and accessibility. Approves or requests revisions on all copy touchpoints.
- **Product Manager (Feature Area):** Confirms copy reflects feature scope, policies, and Supabase/Stripe integration requirements. Owns risk sign-off.
- **Legal or Compliance Reviewer (As-Needed):** Reviews payments, privacy, or policy-related language. Required when messaging affects billing, lease terms, or personal data.
- **Localization Partner (As-Needed):** Validates internationalization requirements and tracks strings in the translation backlog.

## Pull Request Expectations
- Reference this guide in the PR description for any copy change.
- Use the "Copy Changes" section in the PR template to document reviewer assignments and sign-off status.
- Ensure the `copy-review` label remains on the PR until approvals are recorded. Removing the label will cause the workflow check to fail.

## Training & Rollout Plan
1. **Kickoff Workshop (Week 1):** 45-minute session walking through the brand voice, workflow steps, and Action check. Record and share the session.
2. **Team Clinics (Weeks 2-3):** Schedule 30-minute deep dives with each squad (Payments, Amenities, Messaging) to practice rewriting sample copy and using the PR template.
3. **Office Hours (Ongoing):** Copy Editor holds weekly 20-minute drop-in slots for questions or pre-review feedback.
4. **Workflow Adoption Metrics:** Track percentage of copy PRs carrying the `copy-review` label and approval latency in GitHub Insights.

## Keeping Guidelines Updated
- Review this document at the start of every quarter. The Copy Editor owns updates; Product and Legal partners co-review within five business days.
- Capture lessons learned from usability testing or support feedback in an "Updates" section appended to the doc.
- Announce meaningful changes in the #product-updates Slack channel and refresh the training recording as needed.

