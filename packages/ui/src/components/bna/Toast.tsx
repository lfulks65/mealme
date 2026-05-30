/**
 * Toast — native-feel toast notification for BNA UI
 *
 * Provides imperative toast API with auto-dismiss,
 * swipe-to-dismiss, and variant styling.
 */
import React, { useCallback, useContext, useRef, useState } from 'react';
import {
  Animated,
  type ColorValue,
  type ViewStyle,
  type TextStyle,
  View,
  Text,
  Pressable,
} from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastConfig {
  /** Message text */
  message: string;
  /** Optional title */
  title?: string;
  /** Variant style */
  variant?: ToastVariant;
  /** Duration in ms (0 = manual dismiss) */
  duration?: number;
}

interface ToastItem extends ToastConfig {
  id: number;
}

// ─── Variant colors ─────────────────────────────────────────────────────────

const VARIANT_COLORS: Record<ToastVariant, { bg: ColorValue; border: ColorValue; text: ColorValue }> = {
  info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
  success: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
  warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
  error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
};

// ─── Toast Item Component ────────────────────────────────────────────────────

function ToastItemView({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const variant = item.variant ?? 'info';
  const colors = VARIANT_COLORS[variant];

  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      useNativeDriver: true,
      duration: 250,
    }).start();

    if (item.duration && item.duration > 0) {
      const timer = setTimeout(() => onDismiss(item.id), item.duration);
      return () => clearTimeout(timer);
    }
  }, [item, onDismiss, opacity]);

  const handleDismiss = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      useNativeDriver: true,
      duration: 200,
    }).start(() => onDismiss(item.id));
  }, [item.id, onDismiss, opacity]);

  return (
    <Animated.View style={{ opacity, marginBottom: 8 }}>
      <Pressable
        onPress={handleDismiss}
        style={{
          backgroundColor: colors.bg as string,
          borderLeftWidth: 4,
          borderLeftColor: colors.border as string,
          borderRadius: 8,
          padding: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        {item.title && (
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text as string } as TextStyle}>
            {item.title}
          </Text>
        )}
        <Text style={{ fontSize: 13, color: colors.text as string, marginTop: item.title ? 2 : 0 } as TextStyle}>
          {item.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Toast Context ───────────────────────────────────────────────────────────

interface ToastContextValue {
  show: (config: ToastConfig) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

// ─── Toast Provider ──────────────────────────────────────────────────────────

export interface ToastProviderProps {
  children: React.ReactNode;
  /** Maximum toasts visible at once */
  maxToasts?: number;
  /** Container style */
  style?: ViewStyle;
}

export function ToastProvider({ children, maxToasts = 5, style }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const show = useCallback(
    (config: ToastConfig) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev.slice(-(maxToasts - 1)), { ...config, id }]);
    },
    [maxToasts]
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <View
        style={[
          {
            position: 'absolute',
            top: 60,
            left: 16,
            right: 16,
            zIndex: 9999,
          },
          style,
        ]}
        pointerEvents="box-none"
      >
        {toasts.map((t) => (
          <ToastItemView key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

// ─── useToast hook ───────────────────────────────────────────────────────────

export function useToast(): { show: (config: ToastConfig) => void } {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>');
  }
  return ctx;
}

export default ToastProvider;
