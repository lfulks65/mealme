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
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        ) : null}
        {metadata ? (
          <Text style={styles.metadata} numberOfLines={1}>{metadata}</Text>
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    flex: 1,
    maxWidth: '50%',
    margin: 4,
  },
  imageContainer: {
    position: 'relative',
    height: 140,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 32,
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF6B35',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    padding: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  metadata: {
    fontSize: 11,
    color: '#999999',
    marginTop: 4,
  },
});
