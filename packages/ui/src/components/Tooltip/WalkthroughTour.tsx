/**
 * WalkthroughTour — Multi-step onboarding/feature walkthrough system.
 * Orchestrates step navigation, callbacks, and platform-specific animations.
 *
 * Phase 1: Simple step-by-step tooltips with next/prev buttons
 * Phase 2: Add react-native-copilot for SVG spotlight on native
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { WalkthroughConfig } from './types';
import { useTooltipContext } from './TooltipProvider';
import { getTooltipTheme } from './theme';

interface WalkthroughTourProps {
  config: WalkthroughConfig;
  isActive: boolean;
  onComplete?: () => void;
}

/**
 * WalkthroughTour — Manages multi-step tours with navigation and callbacks.
 *
 * Usage:
 *   <WalkthroughTour
 *     config={{
 *       steps: [
 *         { id: '1', content: 'Welcome to Airs Dashboard' },
 *         { id: '2', content: 'Your score earned today', target: scoreRef },
 *       ],
 *       onComplete: () => setOnboardingDone(true),
 *     }}
 *     isActive={!hasSeenOnboarding}
 *   />
 */
export function WalkthroughTour({
  config,
  isActive,
  onComplete,
}: WalkthroughTourProps): React.JSX.Element | null {
  const { isDark } = useTooltipContext();
  const theme = getTooltipTheme(isDark);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = config.steps[currentStepIndex];
  const isLastStep = currentStepIndex === config.steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  const handleComplete = useCallback((): void => {
    setCurrentStepIndex(0);
    if (config.onComplete) {
      config.onComplete();
    }
    if (onComplete) {
      onComplete();
    }
  }, [config.onComplete, onComplete]);

  const handleNext = useCallback((): void => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [isLastStep, currentStepIndex, handleComplete]);

  const handlePrev = useCallback((): void => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [isFirstStep]);

  const handleSkip = useCallback((): void => {
    if (config.onSkip) {
      config.onSkip();
    }
    handleComplete();
  }, [config.onSkip, handleComplete]);

  if (!isActive || !currentStep) {
    return null;
  }

  // TODO: Phase 1 — render simple modal/popover with step content
  // TODO: Phase 2 — integrate react-native-copilot for SVG spotlight

  return (
    <View
      style={[
        styles.stepContainer,
        { backgroundColor: theme.bgColor, borderColor: theme.borderColor },
      ]}
    >
      <Text style={[styles.stepContent, { color: theme.textColor }]}>{currentStep.content}</Text>

      <View style={styles.buttonRow}>
        {isFirstStep === false && (
          <TouchableOpacity
            style={[styles.button, { borderColor: theme.accentColor }]}
            onPress={handlePrev}
          >
            <Text style={[styles.buttonText, { color: theme.accentColor }]}>Previous</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, { borderColor: theme.accentColor }]}
          onPress={handleSkip}
        >
          <Text style={[styles.buttonText, { color: theme.accentColor }]}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.accentColor }]}
          onPress={handleNext}
        >
          <Text style={[styles.buttonText, { color: theme.bgColor }]}>
            {isLastStep ? 'Finish' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.stepCounter, { color: theme.textColor }]}>
        Step {currentStepIndex + 1} of {config.steps.length}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stepContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 16,
  },
  stepContent: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepCounter: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.7,
  },
});
