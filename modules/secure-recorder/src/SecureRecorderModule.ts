import { NativeModulesProxy } from 'expo-modules-core';

export default NativeModulesProxy.SecureRecorder as {
  startRecording(sessionId: string): Promise<string>;
  stopRecording(): Promise<string>;
  getStatus(): Promise<{ isRecording: boolean; sessionId: string | null; filePath: string | null }>;
  hasPermission(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
};
