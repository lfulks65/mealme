import { useState } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Box } from '@gluestack-ui/themed';
import {
  FormControl,
  FormControlLabel,
  FormControlError,
  FormControlErrorText,
} from '@gluestack-ui/themed';
import { Input, InputField } from '@gluestack-ui/themed';
import { Button, ButtonText, ButtonSpinner } from '@gluestack-ui/themed';
import { Text } from '@gluestack-ui/themed';
import { VStack } from '@gluestack-ui/themed';
import { HStack } from '@gluestack-ui/themed';
import { useAuth } from './AuthContext';

export interface ForgotPasswordScreenProps {
  onNavigateToLogin: () => void;
}

export function ForgotPasswordScreen({ onNavigateToLogin }: ForgotPasswordScreenProps) {
  const { forgotPassword, isLoading, error, resetPasswordState } = useAuth();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const validate = (): boolean => {
    setEmailError('');

    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email');
      return false;
    }

    return true;
  };

  const handleSendResetLink = async () => {
    if (!validate()) return;
    try {
      await forgotPassword(email.trim());
      setEmailSent(true);
    } catch {
      // Error is set in context from React Query mutation
    }
  };

  const handleResendEmail = async () => {
    try {
      await forgotPassword(email.trim());
    } catch {
      // Error is set in context from React Query mutation
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <VStack space="xl" style={styles.formContainer}>
          {/* Header */}
          <VStack space="xs" style={styles.header}>
            <Text size="2xl" fontWeight="$bold" color="$textLight900">
              Reset Password
            </Text>
            <Text size="sm" color="$textLight500">
              Enter your email and we&apos;ll send you a link to reset your password
            </Text>
          </VStack>

          {/* Error Banner */}
          {error && (
            <Box
              bg="$error50"
              px="$4"
              py="$3"
              borderRadius="$md"
              borderWidth={1}
              borderColor="$error500"
            >
              <Text size="sm" color="$error600">
                {error}
              </Text>
            </Box>
          )}

          {/* Success Message */}
          {emailSent && (
            <Box
              bg="$success50"
              px="$4"
              py="$3"
              borderRadius="$md"
              borderWidth={1}
              borderColor="$success500"
            >
              <Text size="sm" color="$success600">
                Password reset link sent! Check your email inbox.
              </Text>
            </Box>
          )}

          {/* Email Field */}
          {!emailSent && (
            <>
              <FormControl isInvalid={!!emailError}>
                <FormControlLabel>
                  <Text size="sm" fontWeight="$medium" color="$textLight900">
                    Email
                  </Text>
                </FormControlLabel>
                <Input variant="outline" size="md">
                  <InputField
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={(text: string) => {
                      setEmail(text);
                      setEmailError('');
                      resetPasswordState();
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    aria-label="Email"
                  />
                </Input>
                {emailError && (
                  <FormControlError>
                    <FormControlErrorText>{emailError}</FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>

              {/* Send Reset Link Button */}
              <Button
                size="lg"
                variant="solid"
                action="primary"
                onPress={handleSendResetLink}
                isDisabled={isLoading}
                style={styles.primaryButton}
              >
                {isLoading && <ButtonSpinner mr="$2" />}
                <ButtonText size="md" fontWeight="$semibold">
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </ButtonText>
              </Button>
            </>
          )}

          {/* Resend Email Button (shown in success state) */}
          {emailSent && (
            <VStack space="md" alignItems="center">
              <Text size="sm" color="$textLight500" textAlign="center">
                Didn&apos;t receive the email? Check your spam folder or try again.
              </Text>
              <Button
                size="md"
                variant="outline"
                action="primary"
                onPress={handleResendEmail}
                isDisabled={isLoading}
                style={styles.resendButton}
              >
                {isLoading && <ButtonSpinner mr="$2" />}
                <ButtonText size="sm" fontWeight="$semibold" color="$primary500">
                  {isLoading ? 'Resending...' : 'Resend Email'}
                </ButtonText>
              </Button>
            </VStack>
          )}

          {/* Back to Login Link */}
          <HStack justifyContent="center" space="xs" mt="$4">
            <Text size="sm" color="$textLight500">
              Remember your password?
            </Text>
            <Button variant="link" size="sm" onPress={onNavigateToLogin}>
              <ButtonText size="sm" color="$primary500" fontWeight="$semibold">
                Sign In
              </ButtonText>
            </Button>
          </HStack>
        </VStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  formContainer: {
    alignSelf: 'center',
    maxWidth: 400,
    width: '100%',
  },
  header: {
    marginBottom: 8,
  },
  primaryButton: {
    width: '100%',
  },
  resendButton: {
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
});
