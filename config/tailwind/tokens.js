/** @type {const} */
const designTokens = {
  spacing: {
    section: "clamp(1.5rem, 2vw, 2.5rem)",
    "content-gutter": "clamp(1rem, 3vw, 2rem)",
    "card-gap": "1rem",
    "stack-sm": "0.75rem",
    "stack-md": "1rem",
    "stack-lg": "1.5rem",
  },
  colors: {
    brand: {
      50: "#f1f5ff",
      100: "#dce7ff",
      200: "#c0d3ff",
      300: "#95b4ff",
      400: "#6f90ff",
      500: "#4f6bff",
      600: "#3d4deb",
      700: "#343ec8",
      800: "#2d379f",
      900: "#2a337d",
    },
    payment: {
      paid: "#15803d",
      pending: "#c2410c",
      failed: "#b91c1c",
      refunded: "#1d4ed8",
    },
    booking: {
      confirmed: "#0369a1",
      pending: "#b45309",
      conflict: "#b91c1c",
      cancelled: "#4b5563",
    },
    maintenance: {
      open: "#7c3aed",
      inProgress: "#0f766e",
      blocked: "#b91c1c",
      resolved: "#166534",
    },
  },
  typography: {
    "display-xl": ["2.25rem", { lineHeight: "2.75rem", fontWeight: "700" }],
    "display-lg": ["1.875rem", { lineHeight: "2.25rem", fontWeight: "700" }],
    "heading-md": ["1.5rem", { lineHeight: "2rem", fontWeight: "600" }],
    "heading-sm": ["1.25rem", { lineHeight: "1.75rem", fontWeight: "600" }],
    "body-lg": ["1.125rem", { lineHeight: "1.75rem", fontWeight: "400" }],
    "body-md": ["1rem", { lineHeight: "1.5rem", fontWeight: "400" }],
    "body-sm": ["0.875rem", { lineHeight: "1.25rem", fontWeight: "400" }],
    "label-sm": [
      "0.75rem",
      { lineHeight: "1rem", fontWeight: "500", letterSpacing: "0.02em" },
    ],
  },
}

module.exports = {
  designTokens,
}
