/**
 * HapticButton — native-feel button with haptic feedback for BNA UI
 *
 * Provides a button that triggers haptic feedback on press
 * with scale animation for a native feel.
 */
import { type ReactNode, useCallback, useRef } from 'react';
import {
  Animated,
  Pressable,
  type ViewStyle,
  type TextStyle,
  type ColorValue,
  Text,
  View,
  Platform,
} from 'react-native';

export interface HapticButtonProps {
  /** Button label */
  title: string;
  /** Press handler */
  onPress: () => void;
  /** Variant style */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Disabled state */
  disabled?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Left icon */
  leftIcon?: ReactNode;
  /** Right icon */
  rightIcon?: ReactNode;
  /** Container style */
  style?: ViewStyle;
}

const VARIANT_STYLES: Record<
  string,
  { bg: ColorValue; border: ColorValue; text: ColorValue }
> = {
  primary: { bg: '#2563eb', border: '#2563eb', text: '#ffffff' },
  secondary: { bg: '#6366f1', border: '#6366f1', text: '#ffffff' },
  outline: { bg: 'transparent', border: '#2563eb', text: '#2563eb' },
  ghost: { bg: 'transparent', border: 'transparent', text: '#2563eb' },
};

const SIZE_STYLES: Record<string, { py: number; px: number; fontSize: number; borderRadius: number }> = {
  sm: { py: 8, px: 12, fontSize: 13, borderRadius: 8 },
  md: { py: 12, px: 20, fontSize: 15, borderRadius: 10 },
  lg: { py: 16, px: 28, fontSize: 17, borderRadius: 12 },
};

export function HapticButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
}: HapticButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const vs = VARIANT_STYLES[variant];
  const ss = SIZE_STYLES[size];

  const triggerHaptic = useCallback(() => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        const Haptics = require('expo-haptics');
        Haptics?.selectionAsync?.();
      } catch {
        // expo-haptics not available, skip
      }
    }
  }, []);

  const handlePressIn = useCallback(() => {
    triggerHaptic();
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 8,
      tension: 300,
    }).start();
  }, [scaleAnim, triggerHaptic]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 300,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    if (!disabled) {
      onPress();
    }
  }, [disabled, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: ss.py,
            paddingHorizontal: ss.px,
            backgroundColor: vs.bg as string,
            borderWidth: variant === 'outline' ? 1.5 : 0,
            borderColor: vs.border as string,
            borderRadius: ss.borderRadius,
            opacity: disabled ? 0.5 : 1,
            width: fullWidth ? '100%' : undefined,
          },
          { transform: [{ scale: scaleAnim }] },
          style,
        ]}
      >
        {leftIcon && <View style={{ marginRight: 8 }}>{leftIcon}</View>}
        <Text
          style={{
            fontSize: ss.fontSize,
            fontWeight: '600',
            color: vs.text as string,
          } as TextStyle}
        >
          {title}
        </Text>
        {rightIcon && <View style={{ marginLeft: 8 }}>{rightIcon}</View>}
      </Animated.View>
    </Pressable>
  );
}

export default HapticButton;
