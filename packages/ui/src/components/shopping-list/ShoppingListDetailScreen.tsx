/**
 * ShoppingListDetailScreen — full shopping list view with progress indicator.
 *
 * Features:
 *   - Large circular progress indicator showing % checked off
 *   - Complete item list grouped by category (collapsible sections)
 *   - Check-off toggles per item (using SynapsisUI Toggle)
 *   - Swipe-to-delete (using BNA SwipeableRow)
 *   - Quantity editing via inline controls
 *   - Shows which recipe each item came from
 *   - Header with list name + meal plan reference
 *   - Summary stats (total items, checked, remaining)
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  Animated,
  FlatList,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Toggle } from '../synapsis/Toggle';
import { SwipeableRow, type SwipeAction } from '../bna/SwipeableRow';
import { HapticButton } from '../bna/HapticButton';
import { NativeCard } from '../bna/NativeCard';
import { useShoppingList, type CategorizedItems } from './useShoppingList';
import type { ShoppingListItemRow } from '@mealme/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ShoppingListDetailScreenProps {
  /** Shopping list ID to display */
  listId: string;
  /** Optional override for list name in header */
  listName?: string;
  /** Optional meal plan reference text */
  mealPlanRef?: string;
  /** Called when user taps a recipe source */
  onRecipePress?: (recipeId: string) => void;
  /** Called when user wants to go back */
  onBack?: () => void;
  /** Container style */
  style?: ViewStyle;
}

// ─── Circular Progress ──────────────────────────────────────────────────────

interface CircularProgressProps {
  progress: number; // 0–100
  size?: number;
  strokeWidth?: number;
  fillColor?: string;
}

function CircularProgress({ progress, fillColor = '#22c55e' }: CircularProgressProps) {
  const animatedWidth = useMemo(() => {
    return new Animated.Value(0);
  }, []);

  React.useEffect(() => {
    Animated.spring(animatedWidth, {
      toValue: progress,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
  }, [progress, animatedWidth]);

  const barWidth = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressCircleContainer}>
      {/* Percentage text */}
      <View style={styles.progressCircleInner}>
        <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
        <Text style={styles.progressLabel}>complete</Text>
      </View>

      {/* Progress bar below circle */}
      <View style={styles.linearProgressBg}>
        <Animated.View
          style={[styles.linearProgressFill, { width: barWidth, backgroundColor: fillColor }]}
        />
      </View>
    </View>
  );
}

// ─── Category Section ───────────────────────────────────────────────────────

interface DetailCategorySectionProps {
  category: CategorizedItems;
  onToggleItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRecipePress?: (recipeId: string) => void;
}

function DetailCategorySection({
  category,
  onToggleItem,
  onDeleteItem,
  onUpdateQuantity,
  onRecipePress,
}: DetailCategorySectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const rotateAnim = useState(new Animated.Value(0))[0];

  const toggleCollapse = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsed((prev) => !prev);
    Animated.spring(rotateAnim, {
      toValue: collapsed ? 0 : 1,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, [collapsed, rotateAnim]);

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-90deg'],
  });

  const checkedCount = category.items.filter((i) => i.checked).length;
  const totalCount = category.items.length;

  return (
    <NativeCard variant="outlined" padding="none" style={styles.detailCard}>
      {/* Section Header */}
      <Pressable onPress={toggleCollapse} style={styles.detailCategoryHeader}>
        <View style={styles.detailCategoryHeaderLeft}>
          <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
            <Text style={styles.chevron}>▼</Text>
          </Animated.View>
          <Text style={styles.detailCategoryEmoji}>{category.emoji}</Text>
          <Text style={styles.detailCategoryLabel}>{category.label}</Text>
        </View>
        <View style={styles.detailCategoryRight}>
          <View style={styles.miniProgressBg}>
            <View
              style={[
                styles.miniProgressFill,
                {
                  width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.detailCategoryCount}>
            {checkedCount}/{totalCount}
          </Text>
        </View>
      </Pressable>

      {/* Items */}
      {!collapsed &&
        category.items.map((item) => (
          <DetailItemRow
            key={item.id}
            item={item}
            onToggle={onToggleItem}
            onDelete={onDeleteItem}
            onUpdateQuantity={onUpdateQuantity}
            onRecipePress={onRecipePress}
          />
        ))}
    </NativeCard>
  );
}

// ─── Detail Item Row ────────────────────────────────────────────────────────

interface DetailItemRowProps {
  item: ShoppingListItemRow;
  onToggle: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRecipePress?: (recipeId: string) => void;
}

function DetailItemRow({
  item,
  onToggle,
  onDelete,
  onUpdateQuantity,
  onRecipePress,
}: DetailItemRowProps) {
  const [editingQty, setEditingQty] = useState(false);
  const [qtyText, setQtyText] = useState(String(item.quantity));

  const swipeActions: SwipeAction[] = useMemo(
    () => [
      {
        label: 'Delete',
        color: '#ef4444',
        onPress: () => onDelete(item.id),
      },
    ],
    [item.id, onDelete],
  );

  const handleQtySubmit = useCallback(() => {
    const num = parseFloat(qtyText);
    if (!isNaN(num) && num > 0) {
      onUpdateQuantity(item.id, num);
    } else {
      setQtyText(String(item.quantity));
    }
    setEditingQty(false);
  }, [qtyText, item.id, item.quantity, onUpdateQuantity]);

  const handleRecipePress = useCallback(() => {
    if (item.recipe_id && onRecipePress) {
      onRecipePress(item.recipe_id);
    }
  }, [item.recipe_id, onRecipePress]);

  return (
    <SwipeableRow rightActions={swipeActions}>
      <View style={[styles.detailItemRow, item.checked && styles.detailItemRowChecked]}>
        {/* Toggle */}
        <Toggle
          value={item.checked}
          onValueChange={() => onToggle(item.id)}
          size="sm"
          activeColor="#22c55e"
        />

        {/* Item info */}
        <View style={styles.detailItemInfo}>
          <Text
            style={[styles.detailItemName, item.checked && styles.detailItemNameChecked]}
            numberOfLines={1}
          >
            {item.ingredient_name}
          </Text>

          {/* Quantity */}
          <View style={styles.detailQuantityRow}>
            {editingQty ? (
              <TextInput
                style={styles.detailQtyInput}
                value={qtyText}
                onChangeText={setQtyText}
                onBlur={handleQtySubmit}
                onSubmitEditing={handleQtySubmit}
                keyboardType="decimal-pad"
                autoFocus
                selectTextOnFocus
              />
            ) : (
              <Pressable onPress={() => setEditingQty(true)}>
                <Text style={styles.detailQuantityText}>
                  {item.quantity} {item.unit}
                </Text>
              </Pressable>
            )}

            {!editingQty && (
              <View style={styles.detailQtyButtons}>
                <Pressable
                  onPress={() => onUpdateQuantity(item.id, Math.max(0.25, item.quantity - 1))}
                  style={styles.detailQtyButton}
                >
                  <Text style={styles.detailQtyButtonText}>−</Text>
                </Pressable>
                <Pressable
                  onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  style={styles.detailQtyButton}
                >
                  <Text style={styles.detailQtyButtonText}>+</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Recipe source */}
          {item.recipe_source && (
            <Pressable onPress={handleRecipePress}>
              <Text style={styles.detailRecipeSource} numberOfLines={1}>
                📖 {item.recipe_source}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </SwipeableRow>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export function ShoppingListDetailScreen({
  listId,
  listName,
  mealPlanRef,
  onRecipePress,
  onBack,
  style,
}: ShoppingListDetailScreenProps) {
  const {
    list,
    items,
    loading,
    error,
    categorizedItems,
    progressPercent,
    checkedCount,
    totalCount,
    toggleItem,
    deleteItem,
    updateQuantity,
    refresh,
  } = useShoppingList(listId);

  const displayName = listName ?? list?.name ?? 'Shopping List';
  const remainingCount = totalCount - checkedCount;

  if (loading && items.length === 0) {
    return (
      <View style={[styles.container, styles.centered, style]}>
        <Text style={styles.loadingText}>Loading shopping list…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, style]}>
        <Text style={styles.errorText}>{error}</Text>
        <HapticButton title="Retry" onPress={refresh} variant="outline" size="sm" />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.detailHeader}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
        )}
        <Text style={styles.detailHeaderTitle}>{displayName}</Text>
        {mealPlanRef && <Text style={styles.detailHeaderSubtitle}>📋 {mealPlanRef}</Text>}
      </View>

      {/* Progress Section */}
      <View style={styles.progressSection}>
        <CircularProgress progress={progressPercent} />
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalCount}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#22c55e' }]}>{checkedCount}</Text>
            <Text style={styles.statLabel}>Checked</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#f59e0b' }]}>{remainingCount}</Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>
        </View>
      </View>

      {/* Categorized List */}
      <FlatList
        data={categorizedItems}
        keyExtractor={(section) => section.category}
        renderItem={({ item: section }) => (
          <DetailCategorySection
            category={section}
            onToggleItem={toggleItem}
            onDeleteItem={deleteItem}
            onUpdateQuantity={updateQuantity}
            onRecipePress={onRecipePress}
          />
        )}
        contentContainerStyle={styles.detailListContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🛒</Text>
            <Text style={styles.emptyText}>No items yet</Text>
            <Text style={styles.emptySubtext}>Add items from a meal plan or manually</Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9fafb',
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  } as TextStyle,
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 12,
    textAlign: 'center',
  } as TextStyle,

  // Header
  detailHeader: {
    backgroundColor: '#ffffff',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 15,
    color: '#2563eb',
    fontWeight: '500',
  } as TextStyle,
  detailHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  } as TextStyle,
  detailHeaderSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  } as TextStyle,

  // Progress section
  progressSection: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  progressCircleContainer: {
    alignItems: 'center',
  },
  progressCircleInner: {
    alignItems: 'center',
    marginBottom: 12,
  },
  progressPercent: {
    fontSize: 40,
    fontWeight: '700',
    color: '#111827',
  } as TextStyle,
  progressLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: -4,
  } as TextStyle,
  linearProgressBg: {
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    height: 8,
    marginTop: 8,
    overflow: 'hidden',
    width: '100%',
  },
  linearProgressFill: {
    borderRadius: 4,
    height: '100%',
  },

  // Stats row
  statsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  } as TextStyle,
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  } as TextStyle,
  statDivider: {
    backgroundColor: '#e5e7eb',
    height: 32,
    width: 1,
  },

  // List
  detailListContent: {
    paddingBottom: 24,
    paddingTop: 8,
  },

  // Category section
  detailCard: {
    marginHorizontal: 16,
    marginTop: 8,
    overflow: 'hidden',
  },
  detailCategoryHeader: {
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  detailCategoryHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  chevron: {
    fontSize: 12,
    color: '#9ca3af',
    marginRight: 6,
  } as TextStyle,
  detailCategoryEmoji: {
    fontSize: 18,
    marginRight: 8,
  } as TextStyle,
  detailCategoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  } as TextStyle,
  detailCategoryRight: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  miniProgressBg: {
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    height: 4,
    marginRight: 8,
    overflow: 'hidden',
    width: 40,
  },
  miniProgressFill: {
    backgroundColor: '#22c55e',
    borderRadius: 2,
    height: '100%',
  },
  detailCategoryCount: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  } as TextStyle,

  // Item row
  detailItemRow: {
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderBottomColor: '#f3f4f6',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  detailItemRowChecked: {
    backgroundColor: '#f0fdf4',
  },
  detailItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  detailItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  } as TextStyle,
  detailItemNameChecked: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  } as TextStyle,
  detailQuantityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 4,
  },
  detailQuantityText: {
    fontSize: 13,
    color: '#6b7280',
  } as TextStyle,
  detailQtyInput: {
    fontSize: 13,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 60,
  } as TextStyle,
  detailQtyButtons: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  detailQtyButton: {
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 13,
    height: 26,
    justifyContent: 'center',
    marginLeft: 4,
    width: 26,
  },
  detailQtyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  } as TextStyle,
  detailRecipeSource: {
    fontSize: 12,
    color: '#2563eb',
    marginTop: 4,
  } as TextStyle,

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
  } as TextStyle,
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
  } as TextStyle,
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  } as TextStyle,
});

export default ShoppingListDetailScreen;
