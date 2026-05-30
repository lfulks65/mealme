/**
 * OnboardingModal — animated onboarding flow for SynapsisUI
 *
 * Multi-step onboarding modal with animated transitions,
 * progress indicator, and skip/next/done actions.
 */
import { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  type ViewStyle,
  type TextStyle,
  Modal as RNModal,
  type ModalProps as RNModalProps,
  Dimensions,
} from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

export interface OnboardingStep {
  /** Step title */
  title: string;
  /** Step description */
  description: string;
  /** Optional image URI */
  imageUri?: string;
}

export interface OnboardingModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Steps to display */
  steps: OnboardingStep[];
  /** Called when onboarding completes or is skipped */
  onComplete: () => void;
  /** Called when user skips */
  onSkip?: () => void;
  /** Modal animation type */
  animationType?: RNModalProps['animationType'];
  /** Container style */
  style?: ViewStyle;
}

export function OnboardingModal({
  visible,
  steps,
  onComplete,
  onSkip,
  animationType = 'slide',
  style,
}: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const isLastStep = currentStep === steps.length - 1;
  const step = steps[currentStep];

  const handleNext = useCallback(() => {
    if (isLastStep) {
      setCurrentStep(0);
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  }, [isLastStep, onComplete]);

  const handleSkip = useCallback(() => {
    setCurrentStep(0);
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  }, [onSkip, onComplete]);

  return (
    <RNModal visible={visible} animationType={animationType} transparent={false}>
      <View
        style={[
          {
            flex: 1,
            backgroundColor: '#ffffff',
            paddingHorizontal: 24,
            paddingTop: 60,
            paddingBottom: 40,
            justifyContent: 'space-between',
          },
          style,
        ]}
      >
        {/* Skip button */}
        <View style={{ alignItems: 'flex-end' }}>
          <Pressable onPress={handleSkip}>
            <Text style={{ color: '#6b7280', fontSize: 15, fontWeight: '500' } as TextStyle}>
              Skip
            </Text>
          </Pressable>
        </View>

        {/* Content */}
        <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          {step?.imageUri && (
            <View
              style={{
                width: SCREEN_W * 0.6,
                height: SCREEN_W * 0.6,
                borderRadius: 16,
                backgroundColor: '#f3f4f6',
                marginBottom: 32,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#9ca3af', fontSize: 14 }}>Illustration</Text>
            </View>
          )}
          <Text
            style={{
              fontSize: 24,
              fontWeight: '700',
              color: '#111827',
              textAlign: 'center',
              marginBottom: 12,
            } as TextStyle}
          >
            {step?.title}
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: '#6b7280',
              textAlign: 'center',
              lineHeight: 24,
            } as TextStyle}
          >
            {step?.description}
          </Text>
        </View>

        {/* Progress + Action */}
        <View>
          {/* Progress dots */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 24 }}>
            {steps.map((_, index) => (
              <View
                key={`step-${index}`}
                style={{
                  width: index === currentStep ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  marginHorizontal: 4,
                  backgroundColor: index === currentStep ? '#2563eb' : '#d1d5db',
                }}
              />
            ))}
          </View>

          {/* Action button */}
          <Pressable
            onPress={handleNext}
            style={{
              backgroundColor: '#2563eb',
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
              {isLastStep ? 'Get Started' : 'Next'}
            </Text>
          </Pressable>
        </View>
      </View>
    </RNModal>
  );
}

export default OnboardingModal;
