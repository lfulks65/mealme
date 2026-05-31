import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';

// ── SynapsisUI ProductCard ────────────────────────────────────────────────────
// A reusable card component for displaying recipe items in a grid.

export interface ProductCardProps {
  /** Unique identifier */
  id: string;
  /** Display title */
  title: string;
  /** Subtitle or description */
  subtitle?: string;
  /** Image URL */
  imageUrl?: string | null;
  /** Optional badge text (e.g. "Quick", "Vegan") */
  badge?: string;
  /** Metadata line (e.g. "30 min · 450 cal") */
  metadata?: string;
  /** Tap handler */
  onPress?: (id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  title,
  subtitle,
  imageUrl,
  badge,
  metadata,
  onPress,
}) => {
  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress?.(id)}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>🍽️</Text>
          </View>
        )}
        {badge ? (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {metadata ? (
          <Text style={styles.metadata} numberOfLines={1}>
            {metadata}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    backgroundColor: '#FF6B35',
    borderRadius: 6,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    position: 'absolute',
    top: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 2,
    flex: 1,
    margin: 4,
    maxWidth: '50%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  content: {
    padding: 10,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  imageContainer: {
    height: 140,
    position: 'relative',
  },
  imagePlaceholder: {
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  metadata: {
    color: '#999999',
    fontSize: 11,
    marginTop: 4,
  },
  placeholderText: {
    fontSize: 32,
  },
  subtitle: {
    color: '#666666',
    fontSize: 12,
    marginTop: 2,
  },
  title: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
});
