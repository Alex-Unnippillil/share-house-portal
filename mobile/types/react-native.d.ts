declare module "react-native" {
  import * as React from "react";

  export type StyleProp<T> = T | Readonly<T> | Array<T | Readonly<T> | undefined> | undefined;

  export interface TextProps {
    children?: React.ReactNode;
    style?: StyleProp<Record<string, unknown>>;
  }

  export interface ViewProps {
    children?: React.ReactNode;
    style?: StyleProp<Record<string, unknown>>;
  }

  export interface PressableProps {
    children?: React.ReactNode;
    style?: StyleProp<Record<string, unknown>>;
    onPress?: () => void;
    disabled?: boolean;
    accessibilityLabel?: string;
    accessibilityRole?: string;
  }

  export interface TextComponent extends React.FC<TextProps> {}
  export interface ViewComponent extends React.FC<ViewProps> {}
  export interface PressableComponent extends React.FC<PressableProps> {}

  export const Text: TextComponent;
  export const View: ViewComponent;
  export const Pressable: PressableComponent;
}
