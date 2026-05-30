/**
 * NativeCard — native-feel card component for BNA UI
 *
 * A cross-platform card with platform-specific shadows,
 * press feedback, and variant styling.
 */
import { type ReactNode, useCallback, useRef } from 'react';
import {
  Animated,
  Pressable,
  type ViewStyle,
  Platform,
} from 'react-native';

export interface NativeCardProps {
  /** Card content */
  children: ReactNode;
  /** Press handler (makes card interactive) */
  onPress?: () => void;
  /** Variant style */
  variant?: 'elevated' | 'outlined' | 'filled' | 'glass';
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Container style */
  style?: ViewStyle;
}

const PADDING_MAP = {
  none: 0,
  sm: 8,
  md: 16,
  lg: 24,
};

const VARIANT_MAP: Record<string, ViewStyle> = {
  elevated: {
    backgroundColor: '#ffffff',
    borderWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      default: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      },
    }),
  },
  outlined: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filled: {
    backgroundColor: '#f9fafb',
    borderWidth: 0,
  },
  glass: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
      default: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        backdropFilter: 'blur(10px)',
      },
    }),
  },
};

export function NativeCard({
  children,
  onPress,
  variant = 'elevated',
  padding = 'md',
  style,
}: NativeCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isInteractive = !!onPress;

  const handlePressIn = useCallback(() => {
    if (isInteractive) {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        friction: 8,
        tension: 300,
      }).start();
    }
  }, [isInteractive, scaleAnim]);

  const handlePressOut = useCallback(() => {
    if (isInteractive) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 300,
      }).start();
    }
  }, [isInteractive, scaleAnim]);

  const content = (
    <Animated.View
      style={[
        {
          borderRadius: 16,
          padding: PADDING_MAP[padding],
          overflow: 'hidden',
        },
        VARIANT_MAP[variant],
        isInteractive ? { transform: [{ scale: scaleAnim }] } : undefined,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );

  if (isInteractive) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

export default NativeCard;
