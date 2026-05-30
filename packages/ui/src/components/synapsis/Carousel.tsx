/**
 * Carousel — animated carousel component for SynapsisUI
 *
 * Built on top of @legendapp/motion for smooth cross-platform
 * animations. Supports auto-play, pagination dots, and swipe gestures.
 */
import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
  View,
  Dimensions,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

export interface CarouselProps {
  /** Array of items to render */
  data: Array<unknown>;
  /** Render function for each item */
  renderItem: (info: { item: unknown; index: number }) => ReactElement;
  /** Auto-play interval in ms (0 = disabled) */
  autoPlayInterval?: number;
  /** Show pagination dots */
  showDots?: boolean;
  /** Container style */
  style?: ViewStyle;
  /** Item width ratio (0–1 of screen width) */
  itemWidthRatio?: number;
}

export function Carousel({
  data,
  renderItem,
  autoPlayInterval = 0,
  showDots = true,
  style,
  itemWidthRatio = 1,
}: CarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const itemWidth = SCREEN_WIDTH * itemWidthRatio;

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / itemWidth);
      if (index !== activeIndex) {
        setActiveIndex(index);
      }
    },
    [activeIndex, itemWidth]
  );

  const startAutoPlay = useCallback(() => {
    if (autoPlayInterval > 0 && !autoPlayRef.current) {
      autoPlayRef.current = setInterval(() => {
        setActiveIndex((prev) => {
          const next = (prev + 1) % data.length;
          flatListRef.current?.scrollToIndex({ index: next, animated: true });
          return next;
        });
      }, autoPlayInterval);
    }
  }, [autoPlayInterval, data.length]);

  const stopAutoPlay = useCallback(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoPlay();
    return stopAutoPlay;
  }, [startAutoPlay, stopAutoPlay]);

  return (
    <View style={style}>
      <FlatList
        ref={flatListRef}
        data={data}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(_, index) => `carousel-${index}`}
        getItemLayout={(_, index) => ({
          length: itemWidth,
          offset: itemWidth * index,
          index,
        })}
      />
      {showDots && data.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
          {data.map((_, index) => (
            <View
              key={`dot-${index}`}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                marginHorizontal: 4,
                backgroundColor: index === activeIndex ? '#2563eb' : '#d1d5db',
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export default Carousel;
