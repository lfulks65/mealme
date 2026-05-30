/**
 * SwipeableRow — native-feel swipeable row for BNA UI
 *
 * A row that reveals action buttons when swiped left,
 * commonly used for delete/archive actions in lists.
 */
import { type ReactNode, useCallback, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  type ViewStyle,
  type TextStyle,
  View,
  Text,
} from 'react-native';

export interface SwipeAction {
  /** Action label */
  label: string;
  /** Background color */
  color: string;
  /** Text color */
  textColor?: string;
  /** Press handler */
  onPress: () => void;
}

export interface SwipeableRowProps {
  /** Row content */
  children: ReactNode;
  /** Actions revealed on left swipe (rightmost action is closest to content) */
  leftActions?: SwipeAction[];
  /** Actions revealed on right swipe */
  rightActions?: SwipeAction[];
  /** Swipe threshold to auto-reveal (px) */
  actionWidth?: number;
  /** Container style */
  style?: ViewStyle;
}

export function SwipeableRow({
  children,
  leftActions = [],
  rightActions = [],
  actionWidth = 80,
  style,
}: SwipeableRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isSwiping = useRef(false);

  const maxLeft = leftActions.length * actionWidth;
  const maxRight = rightActions.length * actionWidth;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderMove: (_, gestureState) => {
        isSwiping.current = true;
        let value = gestureState.dx;
        // Clamp to max swipe distances
        if (value > 0 && maxLeft > 0) value = Math.min(value, maxLeft);
        if (value < 0 && maxRight > 0) value = Math.max(value, -maxRight);
        if ((value > 0 && maxLeft === 0) || (value < 0 && maxRight === 0)) value = 0;
        translateX.setValue(value);
      },
      onPanResponderRelease: (_, gestureState) => {
        let toValue = 0;
        if (gestureState.dx > actionWidth / 2 && maxLeft > 0) {
          toValue = maxLeft;
        } else if (gestureState.dx < -actionWidth / 2 && maxRight > 0) {
          toValue = -maxRight;
        }
        Animated.spring(translateX, {
          toValue,
          useNativeDriver: true,
          friction: 8,
          tension: 50,
        }).start();
      },
    })
  ).current;

  const resetPosition = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 50,
    }).start();
  }, [translateX]);

  const handleActionPress = useCallback(
    (action: SwipeAction) => {
      resetPosition();
      action.onPress();
    },
    [resetPosition]
  );

  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      {/* Right actions (revealed on left swipe) */}
      {rightActions.length > 0 && (
        <View
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            flexDirection: 'row',
          }}
        >
          {rightActions.map((action, index) => (
            <Pressable
              key={`right-${index}`}
              onPress={() => handleActionPress(action)}
              style={{
                width: actionWidth,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: action.color,
              }}
            >
              <Text style={{ color: action.textColor ?? '#fff', fontWeight: '600', fontSize: 13 } as TextStyle}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Left actions (revealed on right swipe) */}
      {leftActions.length > 0 && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            flexDirection: 'row',
          }}
        >
          {leftActions.map((action, index) => (
            <Pressable
              key={`left-${index}`}
              onPress={() => handleActionPress(action)}
              style={{
                width: actionWidth,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: action.color,
              }}
            >
              <Text style={{ color: action.textColor ?? '#fff', fontWeight: '600', fontSize: 13 } as TextStyle}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Content */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX }] }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

export default SwipeableRow;
