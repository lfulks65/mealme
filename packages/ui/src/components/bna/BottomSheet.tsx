/**
 * BottomSheet — native-feel bottom sheet for BNA UI
 *
 * A draggable bottom sheet with snap points, backdrop,
 * and smooth open/close animations.
 */
import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Modal as RNModal,
  PanResponder,
  Pressable,
  type ViewStyle,
  View,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface BottomSheetProps {
  /** Whether the sheet is visible */
  visible: boolean;
  /** Called when the sheet should close */
  onClose: () => void;
  /** Snap point as fraction of screen height (0–1) */
  snapPoint?: number;
  /** Whether to show the drag handle */
  showHandle?: boolean;
  /** Whether to show backdrop */
  showBackdrop?: boolean;
  /** Backdrop opacity (0–1) */
  backdropOpacity?: number;
  /** Content */
  children: ReactNode;
  /** Container style */
  style?: ViewStyle;
}

export function BottomSheet({
  visible,
  onClose,
  snapPoint = 0.5,
  showHandle = true,
  showBackdrop = true,
  backdropOpacity = 0.4,
  children,
  style,
}: BottomSheetProps) {
  const sheetHeight = SCREEN_HEIGHT * snapPoint;
  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const backdropOpacityAnim = useRef(new Animated.Value(0)).current;

  const openSheet = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 50,
      }),
      Animated.timing(backdropOpacityAnim, {
        toValue: backdropOpacity,
        useNativeDriver: true,
        duration: 250,
      }),
    ]).start();
  }, [translateY, backdropOpacityAnim, backdropOpacity]);

  const closeSheet = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: sheetHeight,
        useNativeDriver: true,
        friction: 8,
        tension: 50,
      }),
      Animated.timing(backdropOpacityAnim, {
        toValue: 0,
        useNativeDriver: true,
        duration: 200,
      }),
    ]).start(() => onClose());
  }, [translateY, backdropOpacityAnim, sheetHeight, onClose]);

  useEffect(() => {
    if (visible) {
      openSheet();
    }
  }, [visible, openSheet]);

  // Handle back button on Android
  useEffect(() => {
    if (!visible) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      closeSheet();
      return true;
    });
    return () => handler.remove();
  }, [visible, closeSheet]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > sheetHeight * 0.3) {
          closeSheet();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <RNModal transparent visible={visible} animationType="none">
      <View style={{ flex: 1 }}>
        {/* Backdrop */}
        {showBackdrop && (
          <Pressable
            onPress={closeSheet}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <Animated.View
              style={{
                flex: 1,
                backgroundColor: '#000',
                opacity: backdropOpacityAnim,
              }}
            />
          </Pressable>
        )}

        {/* Sheet */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: sheetHeight,
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 16,
            },
            { transform: [{ translateY }] },
            style,
          ]}
        >
          {/* Drag handle */}
          {showHandle && (
            <View
              style={{
                width: 36,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: '#d1d5db',
                alignSelf: 'center',
                marginTop: 8,
                marginBottom: 4,
              }}
            />
          )}
          {children}
        </Animated.View>
      </View>
    </RNModal>
  );
}

export default BottomSheet;
