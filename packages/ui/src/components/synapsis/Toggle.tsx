/**
 * Toggle — animated toggle/switch for SynapsisUI
 *
 * A cross-platform toggle with smooth animation,
 * built on React Native Animated for native feel.
 */
import { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  type ViewStyle,
  type ColorValue,
} from 'react-native';

export interface ToggleProps {
  /** Whether the toggle is on */
  value: boolean;
  /** Called when toggle value changes */
  onValueChange: (value: boolean) => void;
  /** Track color when on */
  activeColor?: ColorValue;
  /** Track color when off */
  inactiveColor?: ColorValue;
  /** Thumb color */
  thumbColor?: ColorValue;
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Container style */
  style?: ViewStyle;
}

const SIZES = {
  sm: { width: 40, height: 22, thumb: 16, translate: 18 },
  md: { width: 52, height: 28, thumb: 22, translate: 24 },
  lg: { width: 64, height: 34, thumb: 28, translate: 30 },
} as const;

export function Toggle({
  value,
  onValueChange,
  activeColor = '#2563eb',
  inactiveColor = '#d1d5db',
  thumbColor = '#ffffff',
  disabled = false,
  size = 'md',
  style,
}: ToggleProps) {
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;
  const s = SIZES[size];

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: value ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 40,
    }).start();
  }, [value, animatedValue]);

  const handlePress = useCallback(() => {
    if (!disabled) {
      onValueChange(!value);
    }
  }, [disabled, value, onValueChange]);

  const thumbTranslateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, s.translate],
  });

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [inactiveColor as string, activeColor as string],
  });

  return (
    <Pressable onPress={handlePress} disabled={disabled} style={style}>
      <Animated.View
        style={{
          width: s.width,
          height: s.height,
          borderRadius: s.height / 2,
          backgroundColor,
          padding: 2,
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Animated.View
          style={{
            width: s.thumb,
            height: s.thumb,
            borderRadius: s.thumb / 2,
            backgroundColor: thumbColor,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            elevation: 2,
            transform: [{ translateX: thumbTranslateX }],
          }}
        />
      </Animated.View>
    </Pressable>
  );
}

export default Toggle;
