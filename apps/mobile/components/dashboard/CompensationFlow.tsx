import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal } from 'react-native';
import { createTypographyStyles, } from '../theme/typography';
import { Leaf, ChevronDown, CreditCard, Check, X } from 'lucide-react-native';
import { Project } from './types';

interface CompensationFlowProps {
  projects: Project[];
  onCompensate: (projectId: string, amount: number) => void;
}

type Step = 1 | 2 | 3 | 4;

export default function CompensationFlow({ projects, onCompensate }: CompensationFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [amount, setAmount] = useState('');
  const [projectPickerVisible, setProjectPickerVisible] = useState(false);
  const [success, setSuccess] = useState(false);

  const steps = ['Choose Project', 'Set Amount', 'Pay', 'Certificate'];

  const handleCompensate = () => {
    if (!selectedProject || !amount) return;
    setCurrentStep(3);
    // Simulate payment
    setTimeout(() => {
      onCompensate(selectedProject.id, parseFloat(amount));
      setCurrentStep(4);
      setSuccess(true);
    }, 1500);
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSelectedProject(null);
    setAmount('');
    setSuccess(false);
  };

  return (
    <View style={styles.section}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconWrapper}>
            <Leaf size={18} color="#1ccba1" />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Carbon Compensation</Text>
            <Text style={styles.cardSubtitle}>Simple, impactful, certified</Text>
          </View>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          {steps.map((step, index) => {
            const stepNum = (index + 1) as Step;
            const isActive = stepNum === currentStep;
            const isCompleted = stepNum < currentStep;
            return (
              <React.Fragment key={step}>
                <View style={styles.stepItem}>
                  <View style={[
                    styles.stepDot,
                    isCompleted ? styles.stepDotCompleted : isActive ? styles.stepDotActive : styles.stepDotInactive,
                  ]}>
                    {isCompleted ? (
                      <Check size={10} color="#050510" />
                    ) : (
                      <Text style={[styles.stepDotText, isActive ? styles.stepDotTextActive : styles.stepDotTextInactive]}>
                        {stepNum}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.stepLabel, isActive ? styles.stepLabelActive : styles.stepLabelInactive]}>
                    {step}
                  </Text>
                </View>
                {index < steps.length - 1 && (
                  <View style={[styles.stepLine, isCompleted ? styles.stepLineCompleted : styles.stepLineInactive]} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Step Content */}
        {currentStep === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepContentTitle}>Select a Project</Text>
            <TouchableOpacity
              style={styles.projectSelector}
              onPress={() => setProjectPickerVisible(true)}
              activeOpacity={0.8}
            >
              {selectedProject ? (
                <View style={styles.selectedProject}>
                  <View style={styles.projectIconSmall}>
                    <Leaf size={12} color="#1ccba1" />
                  </View>
                  <View>
                    <Text style={styles.selectedProjectName}>{selectedProject.name}</Text>
                    <Text style={styles.selectedProjectCategory}>{selectedProject.category}</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.selectorPlaceholder}>Choose a climate project...</Text>
              )}
              <ChevronDown size={16} color="rgba(232,232,255,0.4)" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextButton, !selectedProject && styles.nextButtonDisabled]}
              onPress={() => selectedProject && setCurrentStep(2)}
              activeOpacity={0.8}
            >
              <Text style={[styles.nextButtonText, !selectedProject && styles.nextButtonTextDisabled]}>
                Continue →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {currentStep === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepContentTitle}>Set Compensation Amount</Text>
            <View style={styles.amountInputWrapper}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="rgba(232,232,255,0.2)"
              />
              <Text style={styles.currencyLabel}>USD</Text>
            </View>
            <View style={styles.quickAmounts}>
              {['10', '25', '50', '100'].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={[styles.quickAmount, amount === preset && styles.quickAmountActive]}
                  onPress={() => setAmount(preset)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quickAmountText, amount === preset && styles.quickAmountTextActive]}>
                    ${preset}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.rowButtons}>
              <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep(1)} activeOpacity={0.8}>
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.compensateButton, !amount && styles.nextButtonDisabled]}
                onPress={handleCompensate}
                activeOpacity={0.8}
              >
                <CreditCard size={14} color="#050510" />
                <Text style={styles.compensateButtonText}>Compensate Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {currentStep === 3 && (
          <View style={styles.stepContent}>
            <View style={styles.processingContainer}>
              <View style={styles.processingIcon}>
                <CreditCard size={24} color="#1ccba1" />
              </View>
              <Text style={styles.processingTitle}>Processing Payment...</Text>
              <Text style={styles.processingDesc}>Connecting to payment provider</Text>
            </View>
          </View>
        )}

        {currentStep === 4 && (
          <View style={styles.stepContent}>
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Check size={28} color="#050510" />
              </View>
              <Text style={styles.successTitle}>Compensation Complete!</Text>
              <Text style={styles.successDesc}>
                You've offset {selectedProject?.name} for ${amount} USD. Your SBT certificate has been issued.
              </Text>
              <TouchableOpacity style={styles.viewCertButton} activeOpacity={0.8}>
                <Text style={styles.viewCertButtonText}>View Certificate</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.8}>
                <Text style={styles.resetButtonText}>Compensate Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Project Picker Modal */}
      <Modal visible={projectPickerVisible} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Choose Project</Text>
              <TouchableOpacity onPress={() => setProjectPickerVisible(false)}>
                <X size={20} color="rgba(232,232,255,0.6)" />
              </TouchableOpacity>
            </View>
            {projects.map((project) => (
              <TouchableOpacity
                key={project.id}
                style={[styles.projectOption, selectedProject?.id === project.id && styles.projectOptionSelected]}
                onPress={() => {
                  setSelectedProject(project);
                  setProjectPickerVisible(false);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.projectOptionIcon}>
                  <Leaf size={14} color="#1ccba1" />
                </View>
                <View style={styles.projectOptionText}>
                  <Text style={styles.projectOptionName}>{project.name}</Text>
                  <Text style={styles.projectOptionDesc}>{project.description}</Text>
                </View>
                {selectedProject?.id === project.id && (
                  <Check size={16} color="#1ccba1" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = createTypographyStyles({
  section: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: 'rgba(28,203,161,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(28,203,161,0.18)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#00001e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(28,203,161,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    color: '#e8e8ff',
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: 'rgba(232,232,255,0.45)',
    fontSize: 12,
    marginTop: 2,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotCompleted: {
    backgroundColor: '#1ccba1',
  },
  stepDotActive: {
    backgroundColor: '#1ccba1',
    shadowColor: '#1ccba1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  stepDotInactive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  stepDotText: {
    fontSize: 10,
    fontWeight: '700',
  },
  stepDotTextActive: {
    color: '#050510',
  },
  stepDotTextInactive: {
    color: 'rgba(232,232,255,0.3)',
  },
  stepLabel: {
    fontSize: 9,
    textAlign: 'center',
    maxWidth: 50,
  },
  stepLabelActive: {
    color: '#1ccba1',
    fontWeight: '600',
  },
  stepLabelInactive: {
    color: 'rgba(232,232,255,0.3)',
  },
  stepLine: {
    flex: 1,
    height: 1,
    marginBottom: 14,
    marginHorizontal: 4,
  },
  stepLineCompleted: {
    backgroundColor: '#1ccba1',
  },
  stepLineInactive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  stepContent: {
    gap: 12,
  },
  stepContentTitle: {
    color: '#e8e8ff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  projectSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
  },
  selectedProject: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  projectIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(28,203,161,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedProjectName: {
    color: '#e8e8ff',
    fontSize: 13,
    fontWeight: '600',
  },
  selectedProjectCategory: {
    color: '#1ccba1',
    fontSize: 10,
    marginTop: 1,
  },
  selectorPlaceholder: {
    color: 'rgba(232,232,255,0.3)',
    fontSize: 13,
  },
  nextButton: {
    backgroundColor: '#1ccba1',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: 'rgba(28,203,161,0.2)',
  },
  nextButtonText: {
    color: '#050510',
    fontSize: 14,
    fontWeight: '700',
  },
  nextButtonTextDisabled: {
    color: 'rgba(5,5,16,0.5)',
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(28,203,161,0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  currencySymbol: {
    color: '#1ccba1',
    fontSize: 20,
    fontWeight: '700',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    color: '#e8e8ff',
    fontSize: 24,
    fontWeight: '700',
    paddingVertical: 10,
  },
  currencyLabel: {
    color: 'rgba(232,232,255,0.4)',
    fontSize: 13,
    fontWeight: '600',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAmount: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickAmountActive: {
    backgroundColor: 'rgba(28,203,161,0.15)',
    borderColor: 'rgba(28,203,161,0.35)',
  },
  quickAmountText: {
    color: 'rgba(232,232,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
  },
  quickAmountTextActive: {
    color: '#1ccba1',
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  backButton: {
    flex: 0,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'rgba(232,232,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  compensateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1ccba1',
    paddingVertical: 12,
    borderRadius: 12,
  },
  compensateButtonText: {
    color: '#050510',
    fontSize: 14,
    fontWeight: '700',
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  processingIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(28,203,161,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingTitle: {
    color: '#e8e8ff',
    fontSize: 16,
    fontWeight: '700',
  },
  processingDesc: {
    color: 'rgba(232,232,255,0.45)',
    fontSize: 13,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1ccba1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1ccba1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 6,
  },
  successTitle: {
    color: '#e8e8ff',
    fontSize: 17,
    fontWeight: '700',
  },
  successDesc: {
    color: 'rgba(232,232,255,0.55)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  viewCertButton: {
    backgroundColor: '#1ccba1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  viewCertButtonText: {
    color: '#050510',
    fontSize: 14,
    fontWeight: '700',
  },
  resetButton: {
    paddingVertical: 8,
  },
  resetButtonText: {
    color: 'rgba(232,232,255,0.45)',
    fontSize: 13,
  },
  // Picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5,5,16,0.85)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#0d0d1f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
    paddingBottom: 40,
    gap: 8,
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerTitle: {
    color: '#e8e8ff',
    fontSize: 16,
    fontWeight: '700',
  },
  projectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
  },
  projectOptionSelected: {
    borderColor: 'rgba(28,203,161,0.3)',
    backgroundColor: 'rgba(28,203,161,0.06)',
  },
  projectOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(28,203,161,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectOptionText: {
    flex: 1,
  },
  projectOptionName: {
    color: '#e8e8ff',
    fontSize: 14,
    fontWeight: '600',
  },
  projectOptionDesc: {
    color: 'rgba(232,232,255,0.4)',
    fontSize: 11,
    marginTop: 2,
  },
});
