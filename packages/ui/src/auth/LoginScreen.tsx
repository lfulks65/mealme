import { useState } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Box } from '@gluestack-ui/themed';
import { FormControl, FormControlLabel, FormControlError, FormControlErrorText } from '@gluestack-ui/themed';
import { Input, InputField } from '@gluestack-ui/themed';
import { Button, ButtonText, ButtonSpinner } from '@gluestack-ui/themed';
import { Text } from '@gluestack-ui/themed';
import { VStack } from '@gluestack-ui/themed';
import { HStack } from '@gluestack-ui/themed';
import { Divider } from '@gluestack-ui/themed';
import { useAuth } from './AuthContext';

export interface LoginScreenProps {
  onNavigateToSignup: () => void;
  onNavigateToForgotPassword: () => void;
  onLoginSuccess?: () => void;
}

export function LoginScreen({
  onNavigateToSignup,
  onNavigateToForgotPassword,
  onLoginSuccess,
}: LoginScreenProps) {
  const { signIn, signInWithGoogle, signInWithApple, isLoading, error, resetPasswordState } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validate = (): boolean => {
    let valid = true;
    setEmailError('');
    setPasswordError('');

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
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      valid = false;
    }

    return valid;
  };

  const handleSignIn = async () => {
    if (!validate()) return;
    try {
      await signIn(email, password);
      onLoginSuccess?.();
    } catch {
      // Error is set in context
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      onLoginSuccess?.();
    } catch {
      // Error is set in context
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
      onLoginSuccess?.();
    } catch {
      // Error is set in context
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <VStack space="xl" style={styles.formContainer}>
          {/* Header */}
          <VStack space="xs" style={styles.header}>
            <Text size="2xl" fontWeight="$bold" color="$textLight900">
              Welcome Back
            </Text>
            <Text size="sm" color="$textLight500">
              Sign in to continue to MealMe
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
                placeholder="Enter your password"
                value={password}
                onChangeText={(text: string) => {
                  setPassword(text);
                  setPasswordError('');
                  resetPasswordState();
                }}
                secureTextEntry
                autoCapitalize="none"
                editable={!isLoading}
                aria-label="Password"
              />
            </Input>
            {passwordError && (
              <FormControlError>
                <FormControlErrorText>{passwordError}</FormControlErrorText>
              </FormControlError>
            )}
          </FormControl>

          {/* Forgot Password Link */}
          <HStack justifyContent="flex-end">
            <Button variant="link" size="sm" onPress={onNavigateToForgotPassword}>
              <ButtonText color="$primary500" size="sm">
                Forgot Password?
              </ButtonText>
            </Button>
          </HStack>

          {/* Sign In Button */}
          <Button
            size="lg"
            variant="solid"
            action="primary"
            onPress={handleSignIn}
            isDisabled={isLoading}
            style={styles.primaryButton}
          >
            {isLoading && <ButtonSpinner mr="$2" />}
            <ButtonText size="md" fontWeight="$semibold">
              {isLoading ? 'Signing In...' : 'Sign In'}
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

          {/* Sign Up Link */}
          <HStack justifyContent="center" space="xs" mt="$4">
            <Text size="sm" color="$textLight500">
              Don't have an account?
            </Text>
            <Button variant="link" size="sm" onPress={onNavigateToSignup}>
              <ButtonText size="sm" color="$primary500" fontWeight="$semibold">
                Sign Up
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
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  formContainer: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 8,
  },
  primaryButton: {
    width: '100%',
  },
  socialButton: {
    width: '100%',
  },
});
