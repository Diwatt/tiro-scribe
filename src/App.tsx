/**
 * Main application component
 */

import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { AppNavigator } from './Navigation/AppNavigator';
import { AppTheme } from './theme/AppTheme';
import {
  BiocodeService,
  AnonymizerService,
  AudioProcessingService,
} from './Service';
import { ONNX_MODEL_PATHS } from './Util/Constant';

// TODO: Import native modules when available
// import WhisperRN from 'whisper.rn';
// import SherpaOnnx from 'sherpa-onnx-react-native';
// import OnnxRuntime from 'onnxruntime-react-native';

export default function App() {
  const [servicesInitialized, setServicesInitialized] = useState(false);

  useEffect(() => {
    async function initializeServices() {
      try {
        // Initialize services with native modules
        // TODO: Uncomment when native modules are installed
        /*
        const whisperRN = new WhisperRN();
        const sherpaOnnx = new SherpaOnnx();
        const onnxRuntime = new OnnxRuntime();

        const biocodeService = new BiocodeService();
        await biocodeService.initialize(sherpaOnnx);

        const anonymizerService = new AnonymizerService();
        await anonymizerService.initialize(
          onnxRuntime,
          ONNX_MODEL_PATHS.BERT_NER
        );

        const audioProcessingService = new AudioProcessingService(
          biocodeService,
          anonymizerService
        );
        await audioProcessingService.initialize(whisperRN);

        // Store services in context or global state
        // setServices({ biocodeService, anonymizerService, audioProcessingService });
        */

        setServicesInitialized(true);
      } catch (error) {
        console.error('Failed to initialize services:', error);
      }
    }

    initializeServices();
  }, []);

  if (!servicesInitialized) {
    // TODO: Show loading screen
    return null;
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={AppTheme}>
        <AppNavigator />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
