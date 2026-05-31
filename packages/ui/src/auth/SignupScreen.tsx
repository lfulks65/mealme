import { useState, useMemo } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Box } from '@gluestack-ui/themed';
import {
  FormControl,
  FormControlLabel,
  FormControlError,
  FormControlErrorText,
} from '@gluestack-ui/themed';
import { Input, InputField, InputSlot, InputIcon } from '@gluestack-ui/themed';
import { Button, ButtonText, ButtonSpinner } from '@gluestack-ui/themed';
import { Text } from '@gluestack-ui/themed';
import { VStack } from '@gluestack-ui/themed';
import { HStack } from '@gluestack-ui/themed';
import { Divider } from '@gluestack-ui/themed';
import { EyeIcon, EyeOffIcon } from '@gluestack-ui/themed';
import { useAuth } from './AuthContext';

// ---------------------------------------------------------------------------
// Password strength calculation
// ---------------------------------------------------------------------------

type PasswordStrength = 'weak' | 'medium' | 'strong';

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return 'weak';

  const hasNumber = /\d/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>_\-[\]\\/~`+=;']/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasMixedCase = hasUpper && hasLower;

  if (password.length >= 8 && hasNumber && hasSymbol && hasMixedCase) {
    return 'strong';
  }
  if (password.length >= 8 && (hasNumber || hasSymbol)) {
    return 'medium';
  }
  return 'weak';
}

const STRENGTH_CONFIG: Record<
  PasswordStrength,
  { label: string; color: string; flexValue: number }
> = {
  weak: { label: 'Weak', color: '$error500', flexValue: 1 },
  medium: { label: 'Medium', color: '$warning500', flexValue: 2 },
  strong: { label: 'Strong', color: '$success500', flexValue: 3 },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface SignupScreenProps {
  onNavigateToLogin: () => void;
  onSignupSuccess?: () => void;
}

export function SignupScreen({ onNavigateToLogin, onSignupSuccess }: SignupScreenProps) {
  const { signUp, signInWithGoogle, signInWithApple, isLoading, error, resetPasswordState } =
    useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const strengthConfig = STRENGTH_CONFIG[passwordStrength];

  const validate = (): boolean => {
    let valid = true;
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');

    if (!name.trim()) {
      setNameError('Name is required');
      valid = false;
    } else if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      valid = false;
    }

    if (!email.trim()) {
      setEmailError('Email is required');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email');
      valid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      valid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      valid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      valid = false;
    }

    return valid;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    try {
      await signUp(name.trim(), email.trim(), password);
      onSignupSuccess?.();
    } catch {
      // Error is set in context from React Query mutation
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      onSignupSuccess?.();
    } catch {
      // Error is set in context from React Query mutation
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
      onSignupSuccess?.();
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
              Create Account
            </Text>
            <Text size="sm" color="$textLight500">
              Sign up to start planning your meals
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

          {/* Name Field */}
          <FormControl isInvalid={!!nameError}>
            <FormControlLabel>
              <Text size="sm" fontWeight="$medium" color="$textLight900">
                Full Name
              </Text>
            </FormControlLabel>
            <Input variant="outline" size="md">
              <InputField
                placeholder="Enter your name"
                value={name}
                onChangeText={(text: string) => {
                  setName(text);
                  setNameError('');
                  resetPasswordState();
                }}
                autoCapitalize="words"
                editable={!isLoading}
                aria-label="Full Name"
              />
            </Input>
            {nameError && (
              <FormControlError>
                <FormControlErrorText>{nameError}</FormControlErrorText>
              </FormControlError>
            )}
          </FormControl>

          {/* Email Field */}
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

          {/* Password Field */}
          <FormControl isInvalid={!!passwordError}>
            <FormControlLabel>
              <Text size="sm" fontWeight="$medium" color="$textLight900">
                Password
              </Text>
            </FormControlLabel>
            <Input variant="outline" size="md">
              <InputField
                placeholder="Create a password"
                value={password}
                onChangeText={(text: string) => {
                  setPassword(text);
                  setPasswordError('');
                  resetPasswordState();
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isLoading}
                aria-label="Password"
              />
              <InputSlot pr="$3" onPress={() => setShowPassword(!showPassword)}>
                <InputIcon as={showPassword ? EyeOffIcon : EyeIcon} color="$textLight400" />
              </InputSlot>
            </Input>
            {passwordError && (
              <FormControlError>
                <FormControlErrorText>{passwordError}</FormControlErrorText>
              </FormControlError>
            )}
          </FormControl>

          {/* Password Strength Indicator */}
          {password.length > 0 && (
            <VStack space="xs">
              <HStack space="sm" alignItems="center">
                <HStack style={styles.strengthBarBackground}>
                  <Box
                    bg={strengthConfig.color}
                    flex={strengthConfig.flexValue}
                    style={styles.strengthBarFill}
                  />
                </HStack>
                <Text size="xs" color={strengthConfig.color} fontWeight="$medium">
                  {strengthConfig.label}
                </Text>
              </HStack>
            </VStack>
          )}

          {/* Confirm Password Field */}
          <FormControl isInvalid={!!confirmPasswordError}>
            <FormControlLabel>
              <Text size="sm" fontWeight="$medium" color="$textLight900">
                Confirm Password
              </Text>
            </FormControlLabel>
            <Input variant="outline" size="md">
              <InputField
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={(text: string) => {
                  setConfirmPassword(text);
                  setConfirmPasswordError('');
                  resetPasswordState();
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!isLoading}
                aria-label="Confirm Password"
              />
              <InputSlot pr="$3" onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <InputIcon as={showConfirmPassword ? EyeOffIcon : EyeIcon} color="$textLight400" />
              </InputSlot>
            </Input>
            {confirmPasswordError && (
              <FormControlError>
                <FormControlErrorText>{confirmPasswordError}</FormControlErrorText>
              </FormControlError>
            )}
          </FormControl>

          {/* Sign Up Button */}
          <Button
            size="lg"
            variant="solid"
            action="primary"
            onPress={handleSignUp}
            isDisabled={isLoading}
            style={styles.primaryButton}
          >
            {isLoading && <ButtonSpinner mr="$2" />}
            <ButtonText size="md" fontWeight="$semibold">
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </ButtonText>
          </Button>

          {/* Divider */}
          <HStack space="sm" alignItems="center">
            <Divider flex={1} />
            <Text size="sm" color="$textLight400">
              or
            </Text>
            <Divider flex={1} />
          </HStack>

          {/* Social Buttons */}
          <VStack space="md">
            <Button
              size="lg"
              variant="outline"
              onPress={handleGoogleSignIn}
              isDisabled={isLoading}
              style={styles.socialButton}
            >
              <ButtonText size="md" color="$textLight900">
                Continue with Google
              </ButtonText>
            </Button>

            {Platform.OS === 'ios' && (
              <Button
                size="lg"
                variant="outline"
                onPress={handleAppleSignIn}
                isDisabled={isLoading}
                style={styles.socialButton}
              >
                <ButtonText size="md" color="$textLight900">
                  Continue with Apple
                </ButtonText>
              </Button>
            )}
          </VStack>

          {/* Login Link */}
          <HStack justifyContent="center" space="xs" mt="$4">
            <Text size="sm" color="$textLight500">
              Already have an account?
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  socialButton: {
    width: '100%',
  },
  strengthBarBackground: {
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    flex: 1,
    height: 4,
    overflow: 'hidden',
  },
  strengthBarFill: {
    borderRadius: 4,
    height: 4,
  },
});
