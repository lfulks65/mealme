/**
 * IngredientList — scrollable list of recipe ingredients with check-off support
 *
 * Displays each ingredient with a checkbox, quantity/unit, optional
 * preparation note, and optional marker. Supports swipe-to-delete when
 * editable. Uses FlatList for efficient rendering.
 */
import { useCallback, useMemo } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  type ListRenderItemInfo,
} from 'react-native';
import type { RecipeIngredient } from '@mealme/shared';
import { formatQuantity } from '@mealme/shared';
import { SwipeableRow, type SwipeAction } from '../bna/SwipeableRow';

// ── Public Props ────────────────────────────────────────────────────────────

export interface IngredientListProps {
  /** List of recipe ingredients */
  ingredients: RecipeIngredient[];
  /** IDs of currently checked-off ingredients */
  checkedIds?: Set<string>;
  /** Callback when an ingredient is checked/unchecked */
  onToggleCheck?: (id: string) => void;
  /** Show preparation notes like "diced", "minced" — defaults to true */
  showPreparation?: boolean;
  /** Mark optional ingredients with "(optional)" — defaults to true */
  showOptional?: boolean;
  /** Show swipe-to-delete action — defaults to false */
  editable?: boolean;
  /** Callback when an ingredient is deleted (only called when editable) */
  onDelete?: (id: string) => void;
  /** Container style override */
  style?: ViewStyle;
}

// ── Component ───────────────────────────────────────────────────────────────

export function IngredientList({
  ingredients,
  checkedIds = new Set(),
  onToggleCheck,
  showPreparation = true,
  showOptional = true,
  editable = false,
  onDelete,
  style,
}: IngredientListProps) {
  const keyExtractor = useCallback((item: RecipeIngredient) => item.id, []);

  const renderItem = useCallback(
    (info: ListRenderItemInfo<RecipeIngredient>) => {
      const ingredient = info.item;
      const isChecked = checkedIds.has(ingredient.id);
      const quantityStr = formatQuantity(ingredient.quantity, ingredient.unit);

      const rowContent = (
        <Pressable
          onPress={onToggleCheck ? () => onToggleCheck(ingredient.id) : undefined}
          style={[styles.row, isChecked && styles.rowChecked]}
          accessibilityRole={onToggleCheck ? 'checkbox' : undefined}
          accessibilityState={onToggleCheck ? { checked: isChecked } : undefined}
        >
          {/* Checkbox */}
          <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
            {isChecked && <Text style={styles.checkmark}>✓</Text>}
          </View>

          {/* Text content */}
          <View style={styles.textContainer}>
            <Text
              style={[styles.ingredientName, isChecked && styles.strikethrough]}
              numberOfLines={2}
            >
              {ingredient.name}
              {showOptional && ingredient.optional ? (
                <Text style={styles.optionalTag}> (optional)</Text>
              ) : null}
            </Text>
            <Text style={[styles.quantity, isChecked && styles.strikethrough]}>{quantityStr}</Text>
            {showPreparation && ingredient.preparation ? (
              <Text style={styles.preparation}>{ingredient.preparation}</Text>
            ) : null}
          </View>
        </Pressable>
      );

      if (editable && onDelete) {
        const deleteAction: SwipeAction = {
          label: 'Delete',
          color: '#ef4444',
          textColor: '#ffffff',
          onPress: () => onDelete(ingredient.id),
        };

        return <SwipeableRow rightActions={[deleteAction]}>{rowContent}</SwipeableRow>;
      }

      return rowContent;
    },
    [checkedIds, onToggleCheck, showOptional, showPreparation, editable, onDelete],
  );

  const contentContainerStyle = useMemo(() => [styles.listContent, style], [style]);

  return (
    <FlatList
      data={ingredients}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={contentContainerStyle}
      scrollEnabled={true}
      showsVerticalScrollIndicator={false}
    />
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  checkbox: {
    alignItems: 'center',
    borderColor: '#d1d5db',
    borderRadius: 6,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
    width: 22,
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  ingredientName: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  listContent: {
    paddingHorizontal: 4,
  },
  optionalTag: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '400',
  },
  preparation: {
    color: '#9ca3af',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  quantity: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 1,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    minHeight: 48,
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  rowChecked: {
    opacity: 0.7,
  },
  strikethrough: {
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  textContainer: {
    flex: 1,
  },
});

export default IngredientList;
