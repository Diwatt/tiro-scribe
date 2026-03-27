/**
 * expo-file-system mock
 * 
 * Provides lightweight file system functions. Tests that need richer behavior
 * should import the factory helpers from this folder and set up per-test.
 */

export const expoFileSystemMock = {
  documentDirectory: '/documents/',
  cacheDirectory: '/cache/',
  getInfoAsync: jest.fn(async () => ({ exists: true, uri: '/path', size: 1024 })),
  readAsStringAsync: jest.fn(async () => ''),
  writeAsStringAsync: jest.fn(async () => {}),
  deleteAsync: jest.fn(async () => {}),
  makeDirectoryAsync: jest.fn(async () => {}),
  copyAsync: jest.fn(async () => {}),
};
