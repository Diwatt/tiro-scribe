/**
 * expo-device mock
 * 
 * This mock provides a static device information object.
 * Tests should override specific values if they need non-default behavior.
 */

export const expoDeviceMock = {
  osName: 'iOS',
  osVersion: '17.0',
  modelName: 'iPhone14',
  deviceType: 0,
  DeviceType: { PHONE: 0, TABLET: 1, UNKNOWN: 2 },
  supportedCpuArchitectures: ['arm64'],
  totalMemory: 4000000000,
};
