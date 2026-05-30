/**
 * @mealme/ui
 *
 * Shared component library for the MealMe platform.
 * Built on gluestack-ui v2 + NativeWind (Tailwind CSS for React Native).
 *
 * Three component libraries are unified under a single import:
 *
 *   1. **Gluestack** — production-grade UI primitives (Button, Input, Card, etc.)
 *   2. **Synapsis** — animated components (Carousel, ProductCard, OnboardingModal, Toggle)
 *   3. **BNA** — native-feel components (BottomSheet, Toast, HapticButton, NativeCard, SwipeableRow)
 *
 * Usage:
 *   import { Button, Carousel, BottomSheet, UIProvider } from '@mealme/ui';
 */

// ─── Provider ────────────────────────────────────────────────────────────────
export { UIProvider } from './provider';
export type { UIProviderProps } from './provider';

// ─── Gluestack Config ────────────────────────────────────────────────────────
export { gluestackConfig } from './gluestack.config';

// ─── Gluestack UI v2 Components ──────────────────────────────────────────────

// Button
export {
  Button,
  ButtonText,
  ButtonIcon,
  ButtonSpinner,
  ButtonGroup,
} from './components/gluestack/Button';

// Input
export {
  Input,
  InputField,
  InputIcon,
  InputSlot,
} from './components/gluestack/Input';

// Card
export { Card } from './components/gluestack/Card';

// FormControl
export {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlHelper,
  FormControlHelperText,
  FormControlError,
  FormControlErrorText,
  FormControlErrorIcon,
} from './components/gluestack/FormControl';

// Select
export {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectItem,
  SelectScrollView,
} from './components/gluestack/Select';

// Modal
export {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from './components/gluestack/Modal';

// Avatar
export {
  Avatar,
  AvatarBadge,
  AvatarFallbackText,
  AvatarImage,
} from './components/gluestack/Avatar';

// Badge
export {
  Badge,
  BadgeText,
  BadgeIcon,
} from './components/gluestack/Badge';

// Tabs
export {
  Tabs,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
  TabTitle,
  TabIcon,
} from './components/gluestack/Tabs';

// Navigation
export {
  Link,
  LinkText,
  Pressable,
  Divider,
} from './components/gluestack/Navigation';

// ─── SynapsisUI Animated Components ──────────────────────────────────────────

export { Carousel } from './components/synapsis/Carousel';
export type { CarouselProps } from './components/synapsis/Carousel';

export { ProductCard } from './components/synapsis/ProductCard';
export type { ProductCardProps } from './components/synapsis/ProductCard';

export { OnboardingModal } from './components/synapsis/OnboardingModal';
export type { OnboardingModalProps, OnboardingStep } from './components/synapsis/OnboardingModal';

export { Toggle } from './components/synapsis/Toggle';
export type { ToggleProps } from './components/synapsis/Toggle';

// ─── BNA UI Native-Feel Components ──────────────────────────────────────────

export { BottomSheet } from './components/bna/BottomSheet';
export type { BottomSheetProps } from './components/bna/BottomSheet';

export { ToastProvider, useToast } from './components/bna/Toast';
export type { ToastProviderProps, ToastConfig, ToastVariant } from './components/bna/Toast';

export { HapticButton } from './components/bna/HapticButton';
export type { HapticButtonProps } from './components/bna/HapticButton';

export { NativeCard } from './components/bna/NativeCard';
export type { NativeCardProps } from './components/bna/NativeCard';

export { SwipeableRow } from './components/bna/SwipeableRow';
export type { SwipeableRowProps, SwipeAction } from './components/bna/SwipeableRow';
