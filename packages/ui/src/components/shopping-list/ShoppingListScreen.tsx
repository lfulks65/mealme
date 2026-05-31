/**
 * ShoppingListScreen — categorized shopping list view.
 *
 * Features:
 *   - Collapsible sections grouped by category (produce, dairy, meat, etc.)
 *   - Check-off toggles per item (using SynapsisUI Toggle)
 *   - Swipe-to-delete (using BNA SwipeableRow)
 *   - Quantity editing via inline controls
 *   - Shows which recipe each item came from
 *   - FAB to add custom item
 *   - Header with list name + meal plan reference
 */
import { useCallback, useMemo, useState } from 'react';
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
import { BottomSheet } from '../bna/BottomSheet';
import { useShoppingList, CATEGORY_META, type CategorizedItems } from './useShoppingList';
import type { ShoppingItemCategory, ShoppingListItemRow } from '@mealme/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ShoppingListScreenProps {
  /** Shopping list ID to display */
  listId: string;
  /** Optional override for list name in header */
  listName?: string;
  /** Optional meal plan reference text */
  mealPlanRef?: string;
  /** Called when user taps a recipe source */
  onRecipePress?: (recipeId: string) => void;
  /** Container style */
  style?: ViewStyle;
}

// ─── Category Section ───────────────────────────────────────────────────────

interface CategorySectionProps {
  category: CategorizedItems;
  onToggleItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRecipePress?: (recipeId: string) => void;
}

function CategorySection({
  category,
  onToggleItem,
  onDeleteItem,
  onUpdateQuantity,
  onRecipePress,
}: CategorySectionProps) {
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
    <View style={styles.categorySection}>
      {/* Section Header */}
      <Pressable onPress={toggleCollapse} style={styles.categoryHeader}>
        <View style={styles.categoryHeaderLeft}>
          <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
            <Text style={styles.chevron}>▼</Text>
          </Animated.View>
          <Text style={styles.categoryEmoji}>{category.emoji}</Text>
          <Text style={styles.categoryLabel}>{category.label}</Text>
        </View>
        <Text style={styles.categoryCount}>
          {checkedCount}/{totalCount}
        </Text>
      </Pressable>

      {/* Items */}
      {!collapsed &&
        category.items.map((item) => (
          <ShoppingItemRow
            key={item.id}
            item={item}
            onToggle={onToggleItem}
            onDelete={onDeleteItem}
            onUpdateQuantity={onUpdateQuantity}
            onRecipePress={onRecipePress}
          />
        ))}
    </View>
  );
}

// ─── Shopping Item Row ──────────────────────────────────────────────────────

interface ShoppingItemRowProps {
  item: ShoppingListItemRow;
  onToggle: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRecipePress?: (recipeId: string) => void;
}

function ShoppingItemRow({
  item,
  onToggle,
  onDelete,
  onUpdateQuantity,
  onRecipePress,
}: ShoppingItemRowProps) {
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
      <View style={[styles.itemRow, item.checked && styles.itemRowChecked]}>
        {/* Toggle */}
        <Toggle
          value={item.checked}
          onValueChange={() => onToggle(item.id)}
          size="sm"
          activeColor="#22c55e"
        />

        {/* Item info */}
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, item.checked && styles.itemNameChecked]} numberOfLines={1}>
            {item.ingredient_name}
          </Text>

          {/* Quantity */}
          <View style={styles.quantityRow}>
            {editingQty ? (
              <TextInput
                style={styles.qtyInput}
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
                <Text style={styles.quantityText}>
                  {item.quantity} {item.unit}
                </Text>
              </Pressable>
            )}

            {/* Quantity adjustment buttons */}
            {!editingQty && (
              <View style={styles.qtyButtons}>
                <Pressable
                  onPress={() => onUpdateQuantity(item.id, Math.max(0.25, item.quantity - 1))}
                  style={styles.qtyButton}
                >
                  <Text style={styles.qtyButtonText}>−</Text>
                </Pressable>
                <Pressable
                  onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  style={styles.qtyButton}
                >
                  <Text style={styles.qtyButtonText}>+</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Recipe source */}
          {item.recipe_source && (
            <Pressable onPress={handleRecipePress}>
              <Text style={styles.recipeSource} numberOfLines={1}>
                📖 {item.recipe_source}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </SwipeableRow>
  );
}

// ─── Add Item Modal ─────────────────────────────────────────────────────────

interface AddItemModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, quantity: number, unit: string, category?: ShoppingItemCategory) => void;
}

function AddItemModal({ visible, onClose, onAdd }: AddItemModalProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('piece');
  const [category, setCategory] = useState<ShoppingItemCategory>('other');

  const handleAdd = useCallback(() => {
    const qty = parseFloat(quantity);
    if (name.trim() && !isNaN(qty) && qty > 0) {
      onAdd(name.trim(), qty, unit, category);
      setName('');
      setQuantity('1');
      setUnit('piece');
      setCategory('other');
      onClose();
    }
  }, [name, quantity, unit, category, onAdd, onClose]);

  const categories: ShoppingItemCategory[] = [
    'produce',
    'dairy',
    'meat',
    'bakery',
    'frozen',
    'pantry',
    'other',
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} snapPoint={0.6}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Add Custom Item</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Item Name</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Organic Avocados"
            autoFocus
          />
        </View>

        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.inputLabel}>Quantity</Text>
            <TextInput
              style={styles.textInput}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Unit</Text>
            <TextInput
              style={styles.textInput}
              value={unit}
              onChangeText={setUnit}
              placeholder="piece, lb, cup..."
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Category</Text>
          <View style={styles.categoryPicker}>
            {categories.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[styles.categoryChip, category === cat && styles.categoryChipSelected]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    category === cat && styles.categoryChipTextSelected,
                  ]}
                >
                  {CATEGORY_META[cat].emoji} {CATEGORY_META[cat].label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <HapticButton
          title="Add Item"
          onPress={handleAdd}
          fullWidth
          disabled={!name.trim()}
          style={{ marginTop: 16 }}
        />
      </View>
    </BottomSheet>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export function ShoppingListScreen({
  listId,
  listName,
  mealPlanRef,
  onRecipePress,
  style,
}: ShoppingListScreenProps) {
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
    addCustomItem,
    refresh,
  } = useShoppingList(listId);

  const [addModalVisible, setAddModalVisible] = useState(false);

  const displayName = listName ?? list?.name ?? 'Shopping List';

  // FAB animation
  const fabScale = useState(new Animated.Value(1))[0];
  const handleFabPressIn = useCallback(() => {
    Animated.spring(fabScale, {
      toValue: 0.9,
      useNativeDriver: true,
      friction: 8,
      tension: 300,
    }).start();
  }, [fabScale]);
  const handleFabPressOut = useCallback(() => {
    Animated.spring(fabScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 300,
    }).start();
  }, [fabScale]);

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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{displayName}</Text>
        {mealPlanRef && <Text style={styles.headerSubtitle}>📋 {mealPlanRef}</Text>}
        <View style={styles.progressRow}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {checkedCount}/{totalCount} items ({progressPercent}%)
          </Text>
        </View>
      </View>

      {/* Categorized List */}
      <FlatList
        data={categorizedItems}
        keyExtractor={(section) => section.category}
        renderItem={({ item: section }) => (
          <CategorySection
            category={section}
            onToggleItem={toggleItem}
            onDeleteItem={deleteItem}
            onUpdateQuantity={updateQuantity}
            onRecipePress={onRecipePress}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🛒</Text>
            <Text style={styles.emptyText}>No items yet</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first item</Text>
          </View>
        }
      />

      {/* FAB */}
      <Pressable
        onPress={() => setAddModalVisible(true)}
        onPressIn={handleFabPressIn}
        onPressOut={handleFabPressOut}
        style={styles.fabPosition}
      >
        <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
          <Text style={styles.fabText}>+</Text>
        </Animated.View>
      </Pressable>

      {/* Add Item Modal */}
      <AddItemModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onAdd={addCustomItem}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  categoryChip: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryChipSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#6b7280',
  } as TextStyle,
  categoryChipTextSelected: {
    color: '#2563eb',
    fontWeight: '500',
  } as TextStyle,
  categoryCount: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  } as TextStyle,
  categoryEmoji: {
    fontSize: 18,
    marginRight: 8,
  } as TextStyle,
  categoryHeader: {
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  } as TextStyle,
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categorySection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    overflow: 'hidden',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  chevron: {
    fontSize: 12,
    color: '#9ca3af',
    marginRight: 6,
  } as TextStyle,
  container: {
    backgroundColor: '#f9fafb',
    flex: 1,
  },
  emptyEmoji: {
    fontSize: 48,
  } as TextStyle,
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  } as TextStyle,
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
  } as TextStyle,
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  fab: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 28,
    elevation: 8,
    height: 56,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    width: 56,
  },
  fabPosition: {
    bottom: 24,
    position: 'absolute',
    right: 20,
  },
  fabText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#ffffff',
    marginTop: -2,
  } as TextStyle,
  header: {
    backgroundColor: '#ffffff',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  } as TextStyle,
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  } as TextStyle,
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  } as TextStyle,
  inputRow: {
    flexDirection: 'row',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  } as TextStyle,
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  } as TextStyle,
  itemRow: {
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderBottomColor: '#f3f4f6',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  itemRowChecked: {
    backgroundColor: '#f0fdf4',
  },
  listContent: {
    paddingBottom: 100,
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 16,
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  } as TextStyle,
  progressBarBg: {
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    flex: 1,
    height: 8,
    marginRight: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    backgroundColor: '#22c55e',
    borderRadius: 4,
    height: '100%',
  },
  progressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 10,
  },
  progressText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  } as TextStyle,
  qtyButton: {
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 13,
    height: 26,
    justifyContent: 'center',
    marginLeft: 4,
    width: 26,
  },
  qtyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  } as TextStyle,
  qtyButtons: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  qtyInput: {
    fontSize: 13,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 60,
  } as TextStyle,
  quantityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 4,
  },
  quantityText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '400',
  } as TextStyle,
  recipeSource: {
    fontSize: 12,
    color: '#2563eb',
    marginTop: 4,
    fontWeight: '400',
  } as TextStyle,
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#ffffff',
  } as TextStyle,
});

export default ShoppingListScreen;
