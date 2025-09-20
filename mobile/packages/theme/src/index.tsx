import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type ColorScale = Record<string, string>;

type SpacingScale = Record<string, number>;

type TypographyScale = {
  fontFamily: string;
  sizes: Record<string, number>;
  lineHeights: Record<string, number>;
};

type RadiusScale = Record<string, number>;

export interface ThemeTokens {
  colors: ColorScale;
  spacing: SpacingScale;
  typography: TypographyScale;
  radii: RadiusScale;
}

export type ThemeMode = "light" | "dark";

export interface ThemeConfig {
  light: ThemeTokens;
  dark?: ThemeTokens;
}

export interface ThemeContextValue {
  theme: ThemeTokens;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const defaultTheme: ThemeTokens = {
  colors: {
    background: "#ffffff",
    surface: "#f5f5f5",
    text: "#111827",
    muted: "#6b7280",
    primary: "#2563eb",
    secondary: "#7c3aed",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
  },
  spacing: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    fontFamily: "System",
    sizes: {
      caption: 12,
      body: 16,
      title: 20,
      headline: 24,
    },
    lineHeights: {
      caption: 16,
      body: 22,
      title: 28,
      headline: 32,
    },
  },
  radii: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 16,
    pill: 999,
  },
};

const defaultDarkTheme: ThemeTokens = {
  ...defaultTheme,
  colors: {
    background: "#0f172a",
    surface: "#1e293b",
    text: "#f8fafc",
    muted: "#94a3b8",
    primary: "#60a5fa",
    secondary: "#a855f7",
    success: "#34d399",
    warning: "#fbbf24",
    danger: "#f87171",
  },
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: React.ReactNode;
  initialMode?: ThemeMode;
  theme?: Partial<ThemeConfig>;
}

const mergeTheme = (base: ThemeTokens, overrides?: Partial<ThemeTokens>): ThemeTokens => {
  if (!overrides) {
    return base;
  }

  return {
    colors: { ...base.colors, ...overrides.colors },
    spacing: { ...base.spacing, ...overrides.spacing },
    typography: {
      fontFamily: overrides.typography?.fontFamily ?? base.typography.fontFamily,
      sizes: { ...base.typography.sizes, ...overrides.typography?.sizes },
      lineHeights: { ...base.typography.lineHeights, ...overrides.typography?.lineHeights },
    },
    radii: { ...base.radii, ...overrides.radii },
  };
};

const resolveThemeConfig = (config?: Partial<ThemeConfig>): ThemeConfig => {
  return {
    light: mergeTheme(defaultTheme, config?.light),
    dark: config?.dark ? mergeTheme(defaultDarkTheme, config.dark) : mergeTheme(defaultDarkTheme, config?.light),
  };
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialMode = "light",
  theme: customTheme,
}) => {
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  const resolvedTheme = useMemo(() => resolveThemeConfig(customTheme), [customTheme]);

  const theme = useMemo(() => {
    return mode === "dark" && resolvedTheme.dark ? resolvedTheme.dark : resolvedTheme.light;
  }, [mode, resolvedTheme]);

  const updateMode = useCallback((nextMode: ThemeMode) => {
    setMode(nextMode);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      mode,
      setMode: updateMode,
      toggleMode,
    }),
    [mode, theme, toggleMode, updateMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeTokens => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context.theme;
};

export const useThemeController = (): Pick<ThemeContextValue, "mode" | "setMode" | "toggleMode"> => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useThemeController must be used within a ThemeProvider");
  }

  return {
    mode: context.mode,
    setMode: context.setMode,
    toggleMode: context.toggleMode,
  };
};

export const createTheme = (tokens: Partial<ThemeTokens>): ThemeTokens => mergeTheme(defaultTheme, tokens);

export { defaultTheme };
