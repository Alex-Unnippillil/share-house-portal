import React, { useMemo } from "react";
import { Pressable, PressableProps, Text, TextProps, View, ViewProps } from "react-native";
import { ThemeTokens, useTheme } from "@mobile/theme";

export type StyleObject = Record<string, unknown>;
type StylePropInput = StyleObject | readonly StyleObject[] | undefined;

const flattenStyle = (style?: StylePropInput): StyleObject => {
  if (!style) {
    return {};
  }

  if (Array.isArray(style)) {
    return style.reduce<StyleObject>((acc, current) => {
      if (!current) {
        return acc;
      }

      return { ...acc, ...flattenStyle(current as StylePropInput) };
    }, {});
  }

  return { ...style };
};

const mergeStyle = (base: StyleObject, style?: StylePropInput): StyleObject => {
  if (!style) {
    return base;
  }

  const overrides = flattenStyle(style);
  return { ...base, ...overrides };
};

export type NamedColor = keyof ThemeTokens["colors"];
export type NamedSpacing = keyof ThemeTokens["spacing"];

export interface ThemedTextProps extends Omit<TextProps, "style"> {
  variant?: keyof ThemeTokens["typography"]["sizes"];
  color?: NamedColor;
  weight?: "regular" | "medium" | "bold";
  align?: "auto" | "left" | "center" | "right" | "justify";
  style?: StylePropInput;
}

export const ThemedText: React.FC<ThemedTextProps> = ({
  variant = "body",
  color = "text",
  weight = "regular",
  align = "auto",
  style,
  children,
  ...textProps
}) => {
  const theme = useTheme();

  const textStyle = useMemo<StyleObject>(() => {
    const fontSize = theme.typography.sizes[variant] ?? theme.typography.sizes.body;
    const lineHeight = theme.typography.lineHeights[variant] ?? theme.typography.lineHeights.body;

    const baseStyle: StyleObject = {
      fontFamily: theme.typography.fontFamily,
      fontSize,
      lineHeight,
      color: theme.colors[color] ?? theme.colors.text,
      textAlign: align === "auto" ? undefined : align,
      fontWeight: weight === "bold" ? "700" : weight === "medium" ? "500" : "400",
    };

    return mergeStyle(baseStyle, style);
  }, [align, color, style, theme, variant, weight]);

  return (
    <Text {...textProps} style={textStyle as TextProps["style"]}>
      {children}
    </Text>
  );
};

export interface ThemedViewProps extends Omit<ViewProps, "style"> {
  backgroundColor?: NamedColor;
  padding?: NamedSpacing | NamedSpacing[];
  radius?: keyof ThemeTokens["radii"];
  style?: StylePropInput;
}

export const ThemedView: React.FC<ThemedViewProps> = ({
  backgroundColor = "background",
  padding,
  radius = "md",
  style,
  children,
  ...viewProps
}) => {
  const theme = useTheme();

  const computedStyle = useMemo<StyleObject>(() => {
    const spacingValues = Array.isArray(padding) ? padding : padding ? [padding] : [];
    const paddingStyle = spacingValues.reduce((acc, key, index) => {
      const value = theme.spacing[key] ?? 0;
      switch (index) {
        case 0:
          acc.paddingTop = value;
          break;
        case 1:
          acc.paddingRight = value;
          break;
        case 2:
          acc.paddingBottom = value;
          break;
        case 3:
          acc.paddingLeft = value;
          break;
        default:
          break;
      }
      return acc;
    }, {} as Record<string, number>);

    const base: StyleObject = {
      backgroundColor: theme.colors[backgroundColor] ?? theme.colors.background,
      borderRadius: theme.radii[radius] ?? theme.radii.md,
      ...paddingStyle,
    };

    return mergeStyle(base, style);
  }, [backgroundColor, padding, radius, style, theme]);

  return (
    <View {...viewProps} style={computedStyle as ViewProps["style"]}>
      {children}
    </View>
  );
};

export interface ButtonProps extends Omit<PressableProps, "style"> {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  style?: StylePropInput;
  textStyle?: StylePropInput;
}

const resolvePadding = (theme: ThemeTokens): StyleObject => ({
  paddingVertical: theme.spacing.sm,
  paddingHorizontal: theme.spacing.md,
});

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  loading = false,
  disabled,
  style,
  textStyle,
  children,
  ...pressableProps
}) => {
  const theme = useTheme();

  const buttonStyle = useMemo<StyleObject>(() => {
    const palette = {
      primary: {
        background: theme.colors.primary,
        color: theme.colors.background,
        borderColor: theme.colors.primary,
      },
      secondary: {
        background: theme.colors.secondary,
        color: theme.colors.background,
        borderColor: theme.colors.secondary,
      },
      ghost: {
        background: "transparent",
        color: theme.colors.text,
        borderColor: theme.colors.border ?? theme.colors.muted,
      },
    } as const;

    const selected = palette[variant];

    const base: StyleObject = {
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.radii.md,
      borderWidth: variant === "ghost" ? 1 : 0,
      opacity: disabled || loading ? 0.6 : 1,
      backgroundColor: selected.background,
      borderColor: selected.borderColor,
      ...resolvePadding(theme),
    };

    return mergeStyle(base, style);
  }, [disabled, loading, style, theme, variant]);

  const labelStyle = useMemo<StyleObject>(() => {
    const palette = {
      primary: theme.colors.background,
      secondary: theme.colors.background,
      ghost: theme.colors.text,
    } as const;

    const base: StyleObject = {
      color: palette[variant],
      fontSize: theme.typography.sizes.body,
      fontWeight: "600",
    };

    return mergeStyle(base, textStyle);
  }, [textStyle, theme, variant]);

  return (
    <Pressable
      accessibilityRole="button"
      {...pressableProps}
      disabled={disabled || loading}
      style={buttonStyle as PressableProps["style"]}
    >
      <Text style={labelStyle as TextProps["style"]}>{loading ? "Loading…" : children}</Text>
    </Pressable>
  );
};

export interface SpacerProps {
  size?: NamedSpacing;
  horizontal?: boolean;
}

export const Spacer: React.FC<SpacerProps> = ({ size = "md", horizontal = false }) => {
  const theme = useTheme();
  const length = theme.spacing[size] ?? 0;

  const style = useMemo<StyleObject>(() => {
    return horizontal
      ? { width: length, height: 1 }
      : { height: length, width: 1 };
  }, [horizontal, length]);

  return <View style={style as ViewProps["style"]} />;
};

export const useComponentStyles = <T,>(factory: (theme: ThemeTokens) => T): T => {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
};
