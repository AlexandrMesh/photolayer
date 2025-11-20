import React, { isValidElement, cloneElement, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, Text } from 'react-native';

import { useTheme } from '../contexts/ThemeContext';

type ButtonProps = {
  label?: string;
  children?: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const PrimaryButton = ({ label, children, onPress, disabled, style }: ButtonProps) => {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 12,
          backgroundColor: disabled ? theme.button : theme.primary,
          opacity: pressed ? 0.85 : 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {children
        ? disabled && isValidElement(children)
          ? // If child supports color prop (icons/text), override it to gray when disabled
            cloneElement(children as React.ReactElement<any>, {
              ...(children as any).props,
              color: 'color' in ((children as any).props || {}) ? theme.textSecondary : (children as any).props?.color,
              style: [
                (children as any).props?.style,
                'color' in ((children as any).props || {}) ? null : { color: theme.textSecondary },
              ],
            })
          : children
        : (
          <Text style={{ color: disabled ? theme.textSecondary : 'white', fontSize: 16, fontWeight: '600' }}>{label}</Text>
        )}
    </Pressable>
  );
};

export default PrimaryButton;
