# Pull-to-refresh manual QA

## Goal
Verify that the members dashboard list supports mobile pull-to-refresh gestures, refetches data, and provides haptic feedback.

## Prerequisites
- `pnpm dev` running locally.
- Mobile device or browser device emulator capable of touch events (e.g., Chrome DevTools with "Toggle device toolbar").

## Steps
1. Open the app at `http://localhost:3000/dashboard/members` in a mobile viewport (e.g., iPhone 14 size).
2. Scroll the list to the very top.
3. Drag downward until you feel a short vibration (or see the simulated pull distance in the emulator). The gesture should not interfere with the normal scroll behavior.
4. Release the gesture once the vibration fires.
5. Observe the members table reloading: network tab should show a refreshed request and the list should momentarily show the loading skeleton before rendering the latest data.

## Expected results
- The drag gesture only activates when starting from the top of the list and scrolling downward.
- A haptic vibration occurs once the threshold is crossed on supported devices.
- The list re-renders with fresh data (verified via the network tab or the temporary skeleton state).
- Desktop browsers without touch input do not trigger the pull-to-refresh behavior.
