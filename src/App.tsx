/**
 * Main application component
 */

import React, {useEffect, useState} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {PaperProvider} from 'react-native-paper';
import {AppNavigator} from './Navigation/AppNavigator';
import {AppTheme} from './theme/AppTheme';
import {Biocode, Anonymizer, AudioProcessing} from './Service';
import {ServicesProvider} from './Context/ServicesContext';

// Import ONNX Runtime for model inference
import * as ort from 'onnxruntime-react-native';

export default function App() {
    const [services, setServices] = useState<{
        biocodeService: Biocode | null;
        anonymizerService: Anonymizer | null;
        audioProcessingService: AudioProcessing | null;
    }>({
        biocodeService: null,
        anonymizerService: null,
        audioProcessingService: null,
    });
    const [servicesInitialized, setServicesInitialized] = useState(false);

    useEffect(() => {
        async function initializeServices() {
            try {
                // Initialize services with ONNX Runtime
                // Models will be downloaded automatically on first run
                
                const {ModelDownloader, MODEL_CONFIGS} = await import('./Util/ModelDownloader');
                
                // Download models if needed
                console.log('Checking for required models...');
                const speakerModelPath = await ModelDownloader.ensureModelDownloaded(
                    MODEL_CONFIGS.SPEAKER_RECOGNITION,
                    (progress) => {
                        console.log(`Downloading speaker model: ${(progress * 100).toFixed(1)}%`);
                    },
                );
                
                // Initialize Biocode service with speaker recognition model
                const biocodeService = new Biocode();
                await biocodeService.initialize(speakerModelPath);

                // Initialize Anonymizer service with BERT-NER model
                // TODO: Download and initialize BERT-NER model when ready
                const anonymizerService = new Anonymizer();
                // const bertModelPath = await ModelDownloader.ensureModelDownloaded(MODEL_CONFIGS.BERT_NER);
                // await anonymizerService.initialize(bertModelPath);

                // Initialize Audio Processing service
                const audioProcessingService = new AudioProcessing(
                    biocodeService,
                    anonymizerService,
                );
                // TODO: Add transcription model when available
                // await audioProcessingService.initialize(transcriptionModelPath);

                // Store services in state
                setServices({
                    biocodeService,
                    anonymizerService,
                    audioProcessingService,
                });
                
                console.log('Services initialized successfully');
                setServicesInitialized(true);
            } catch (error) {
                console.error('Failed to initialize services:', error);
                setServicesInitialized(true); // Still show UI even if services fail
            }
        }

        initializeServices();
    }, []);

    return (
        <SafeAreaProvider>
            <PaperProvider theme={AppTheme}>
                <ServicesProvider services={services}>
                    {servicesInitialized ? (
                        <AppNavigator />
                    ) : (
                        // TODO: Show loading screen with model download progress
                        null
                    )}
                </ServicesProvider>
            </PaperProvider>
        </SafeAreaProvider>
    );
}
