import React, { useRef } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';

// ── SynapsisUI Carousel ──────────────────────────────────────────────────────
// A horizontal scrolling carousel with section header.

export interface CarouselItem {
  /** Unique key */
  id: string;
  /** Render content — receives the item data */
  element: React.ReactNode;
}

export interface CarouselProps {
  /** Section title displayed above the carousel */
  title: string;
  /** Optional "See All" handler */
  onSeeAll?: () => void;
  /** Items to render horizontally */
  items: CarouselItem[];
  /** Item width (defaults to 160) */
  itemWidth?: number;
  /** Gap between items (defaults to 12) */
  itemGap?: number;
}

export const Carousel: React.FC<CarouselProps> = ({
  title,
  onSeeAll,
  items,
  itemWidth = 160,
  itemGap = 12,
}) => {
  const flatListRef = useRef<FlatList>(null);

  const renderItem = ({ item }: { item: CarouselItem }) => (
    <View style={{ width: itemWidth, marginRight: itemGap }}>{item.element}</View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll} hitSlop={8}>
            <Text style={styles.seeAll}>See All →</Text>
          </Pressable>
        ) : null}
      </View>
      <FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  seeAll: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: '#1A1A1A',
    fontSize: 18,
    fontWeight: '700',
  },
});
