/** @type {const} */
const designTokens = {
  spacing: {
    section: "clamp(1.5rem, 2vw, 2.5rem)",
    "content-gutter": "clamp(1rem, 3vw, 2rem)",
    "dashboard-x": "1rem",
    "dashboard-x-sm": "1.5rem",
    "dashboard-x-lg": "2.5rem",
    "dashboard-y": "1.5rem",
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
      paid: {
        DEFAULT: "#15803d",
        background: "#dcfce7",
        border: "#86efac",
        foreground: "#166534",
      },
      pending: {
        DEFAULT: "#c2410c",
        background: "#ffedd5",
        border: "#fdba74",
        foreground: "#9a3412",
      },
      failed: {
        DEFAULT: "#b91c1c",
        background: "#fee2e2",
        border: "#fca5a5",
        foreground: "#991b1b",
      },
      refunded: {
        DEFAULT: "#1d4ed8",
        background: "#dbeafe",
        border: "#93c5fd",
        foreground: "#1e40af",
      },
    },
    booking: {
      confirmed: {
        DEFAULT: "#0369a1",
        background: "#e0f2fe",
        border: "#7dd3fc",
        foreground: "#0c4a6e",
      },
      pending: {
        DEFAULT: "#b45309",
        background: "#fef3c7",
        border: "#fcd34d",
        foreground: "#92400e",
      },
      conflict: {
        DEFAULT: "#b91c1c",
        background: "#fee2e2",
        border: "#fca5a5",
        foreground: "#991b1b",
      },
      cancelled: {
        DEFAULT: "#4b5563",
        background: "#e5e7eb",
        border: "#cbd5e1",
        foreground: "#374151",
      },
    },
    maintenance: {
      open: {
        DEFAULT: "#7c3aed",
        background: "#ede9fe",
        border: "#c4b5fd",
        foreground: "#5b21b6",
      },
      inProgress: {
        DEFAULT: "#0f766e",
        background: "#ccfbf1",
        border: "#5eead4",
        foreground: "#115e59",
      },
      blocked: {
        DEFAULT: "#b91c1c",
        background: "#fee2e2",
        border: "#fca5a5",
        foreground: "#991b1b",
      },
      resolved: {
        DEFAULT: "#166534",
        background: "#dcfce7",
        border: "#86efac",
        foreground: "#14532d",
      },
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
