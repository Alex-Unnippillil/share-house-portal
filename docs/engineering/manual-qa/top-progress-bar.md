# Manual QA - Route Progress Bar

## Goal
Verify that the top progress bar appears during client-side route transitions and hides once navigation completes in both light and dark themes.

## Prerequisites
- Development server running via `pnpm dev`.
- Browser with devtools available.

## Steps
1. Open the app at `http://localhost:3000`.
2. Toggle between light and dark modes using the theme switcher (if available) or system preference to observe the bar color adapting to the active theme.
3. Click a navigation link that triggers a client-side route change (e.g., between dashboard sections).
4. Confirm a slim bar animates across the top of the viewport immediately after clicking the link.
5. Wait for the new page content to finish loading.
6. Ensure the bar completes the animation and disappears once the transition is done.
7. Repeat step 3 using the browser back/forward buttons to verify the bar appears for history-based navigations as well.

## Expected Results
- Progress bar color respects the current theme tokens.
- Bar becomes visible within ~200ms of initiating navigation.
- Bar smoothly reaches 100% width and then fades out after content loads.
- Bar does not remain stuck on screen when navigation completes.
