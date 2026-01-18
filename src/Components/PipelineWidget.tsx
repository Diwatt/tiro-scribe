import React, {useState} from 'react';
import {View, StyleSheet, TouchableOpacity, Animated} from 'react-native';
import {
    Text,
    Surface,
    useTheme,
    ProgressBar,
    ActivityIndicator,
} from 'react-native-paper';
import {
    Mic,
    BrainCircuit,
    FileText,
    ShieldCheck,
    Database,
    ChevronDown,
    ChevronUp,
    CheckCircle,
} from 'lucide-react-native';
import {PipelineStage} from '@/Model/Type';

interface PipelineStep {
    stage: PipelineStage;
    label: string;
    icon: React.ComponentType<{size: number; color: string}>;
    completed: boolean;
    active: boolean;
}

interface PipelineWidgetProps {
    currentItem?: {
        encounterUuid: string;
        subjectBiocode: string;
        pipelineStage: PipelineStage;
        progressPercent: number;
    };
    onExpand?: () => void;
}

const PIPELINE_STEPS: PipelineStep[] = [
    {
        stage: PipelineStage.RECORDING,
        label: 'Recording',
        icon: Mic,
        completed: false,
        active: false,
    },
    {
        stage: PipelineStage.RECOGNITION,
        label: 'Voice Recognition',
        icon: BrainCircuit,
        completed: false,
        active: false,
    },
    {
        stage: PipelineStage.FORMATTING,
        label: 'Formatting',
        icon: FileText,
        completed: false,
        active: false,
    },
    {
        stage: PipelineStage.ANONYMIZING,
        label: 'Anonymizing',
        icon: ShieldCheck,
        completed: false,
        active: false,
    },
    {
        stage: PipelineStage.SECURING,
        label: 'Securing',
        icon: Database,
        completed: false,
        active: false,
    },
];

function getStepIndex(stage: PipelineStage): number {
    const index = PIPELINE_STEPS.findIndex((step) => step.stage === stage);
    return index >= 0 ? index : 0;
}

export const PipelineWidget = ({
    currentItem,
    onExpand,
}: PipelineWidgetProps): React.JSX.Element | null => {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(false);

    if (!currentItem) {
        return null;
    }

    const currentStepIndex = getStepIndex(currentItem.pipelineStage);
    const steps = PIPELINE_STEPS.map((step, index) => ({
        ...step,
        completed: index < currentStepIndex,
        active: index === currentStepIndex,
    }));

    const handleToggle = () => {
        setExpanded(!expanded);
        onExpand?.();
    };

    return (
        <Surface
            style={[
                styles.container,
                {backgroundColor: theme.colors.surface},
                expanded && styles.containerExpanded,
            ]}
            elevation={2}>
            <TouchableOpacity
                onPress={handleToggle}
                activeOpacity={0.7}
                style={styles.touchable}>
                {/* Compact State */}
                {!expanded && (
                    <View style={styles.compactContent}>
                        <View style={styles.compactLeft}>
                            <View
                                style={[
                                    styles.compactIconContainer,
                                    {
                                        backgroundColor:
                                            theme.colors.primaryContainer,
                                    },
                                ]}>
                                {React.createElement(steps[currentStepIndex].icon, {
                                    size: 20,
                                    color: theme.colors.onPrimaryContainer,
                                })}
                            </View>
                            <View style={styles.compactTextContainer}>
                                <Text
                                    variant="titleSmall"
                                    style={[
                                        styles.compactSubject,
                                        {color: theme.colors.onSurface},
                                    ]}>
                                    Processing {currentItem.subjectBiocode}
                                </Text>
                                <Text
                                    variant="bodySmall"
                                    style={[
                                        styles.compactStep,
                                        {color: theme.colors.onSurfaceVariant},
                                    ]}>
                                    Step {currentStepIndex + 1}/5 ({steps[currentStepIndex].label})
                                </Text>
                            </View>
                        </View>
                        <View style={styles.compactRight}>
                            <ChevronDown
                                size={20}
                                color={theme.colors.onSurfaceVariant}
                            />
                        </View>
                    </View>
                )}

                {/* Expanded State */}
                {expanded && (
                    <View style={styles.expandedContent}>
                        <View style={styles.expandedHeader}>
                            <Text
                                variant="titleMedium"
                                style={[
                                    styles.expandedTitle,
                                    {color: theme.colors.onSurface},
                                ]}>
                                Processing Pipeline
                            </Text>
                            <TouchableOpacity onPress={handleToggle}>
                                <ChevronUp
                                    size={20}
                                    color={theme.colors.onSurfaceVariant}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.timelineContainer}>
                            {steps.map((step, index) => {
                                const IconComponent = step.icon;
                                const isCompleted = step.completed;
                                const isActive = step.active;
                                const isUpcoming = !isCompleted && !isActive;

                                return (
                                    <View key={step.stage} style={styles.timelineItem}>
                                        {/* Timeline Line */}
                                        {index < steps.length - 1 && (
                                            <View
                                                style={[
                                                    styles.timelineLine,
                                                    {
                                                        backgroundColor:
                                                            isCompleted
                                                                ? theme.colors.primary
                                                                : theme.colors.outlineVariant,
                                                    },
                                                ]}
                                            />
                                        )}

                                        {/* Step Icon */}
                                        <View
                                            style={[
                                                styles.stepIconContainer,
                                                isCompleted && {
                                                    backgroundColor:
                                                        theme.colors.primary,
                                                },
                                                isActive && {
                                                    backgroundColor:
                                                        theme.colors.primaryContainer,
                                                },
                                                isUpcoming && {
                                                    backgroundColor:
                                                        theme.colors.surfaceVariant,
                                                },
                                            ]}>
                                            {isCompleted ? (
                                                <CheckCircle
                                                    size={24}
                                                    color={
                                                        theme.colors.onPrimary
                                                    }
                                                />
                                            ) : isActive ? (
                                                <ActivityIndicator
                                                    size="small"
                                                    color={
                                                        theme.colors.primary
                                                    }
                                                />
                                            ) : (
                                                <IconComponent
                                                    size={20}
                                                    color={
                                                        theme.colors.onSurfaceVariant
                                                    }
                                                />
                                            )}
                                        </View>

                                        {/* Step Label */}
                                        <View style={styles.stepLabelContainer}>
                                            <Text
                                                variant="bodyMedium"
                                                style={[
                                                    styles.stepLabel,
                                                    isCompleted && {
                                                        color:
                                                            theme.colors.primary,
                                                        fontWeight: '600',
                                                    },
                                                    isActive && {
                                                        color:
                                                            theme.colors.primary,
                                                        fontWeight: '600',
                                                    },
                                                    isUpcoming && {
                                                        color:
                                                            theme.colors.onSurfaceVariant,
                                                    },
                                                ]}>
                                                {step.label}
                                            </Text>
                                            {isActive && (
                                                <ProgressBar
                                                    progress={
                                                        currentItem.progressPercent /
                                                        100
                                                    }
                                                    color={theme.colors.primary}
                                                    style={styles.progressBar}
                                                />
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        </Surface>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
    },
    containerExpanded: {
        borderRadius: 16,
    },
    touchable: {
        width: '100%',
    },
    compactContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    compactLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    compactIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    compactTextContainer: {
        flex: 1,
    },
    compactSubject: {
        fontWeight: '600',
        marginBottom: 2,
    },
    compactStep: {
        opacity: 0.7,
    },
    compactRight: {
        marginLeft: 8,
    },
    expandedContent: {
        padding: 20,
    },
    expandedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    expandedTitle: {
        fontWeight: '700',
    },
    timelineContainer: {
        position: 'relative',
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
        position: 'relative',
    },
    timelineLine: {
        position: 'absolute',
        left: 20,
        top: 44,
        width: 2,
        height: 36,
        zIndex: 0,
    },
    stepIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        zIndex: 1,
    },
    stepLabelContainer: {
        flex: 1,
        paddingTop: 8,
    },
    stepLabel: {
        marginBottom: 4,
    },
    progressBar: {
        height: 4,
        borderRadius: 2,
        marginTop: 8,
    },
});
