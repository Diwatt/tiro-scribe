// Quick test to verify mapToDataObject removal
const fs = require('fs');
const path = require('path');

// Check if mapToDataObject appears in Column.ts
const columnPath = path.join(__dirname, 'src/Database/Decorator/Column.ts');
const columnContent = fs.readFileSync(columnPath, 'utf8');
if (columnContent.includes('mapToDataObject')) {
  console.error('ERROR: mapToDataObject still found in Column.ts');
  process.exit(1);
}

// Check if getDataObjectMapping appears in EntityMetadata.ts
const metadataPath = path.join(__dirname, 'src/Database/Decorator/EntityMetadata.ts');
const metadataContent = fs.readFileSync(metadataPath, 'utf8');
if (metadataContent.includes('getDataObjectMapping')) {
  console.error('ERROR: getDataObjectMapping still found in EntityMetadata.ts');
  process.exit(1);
}

// Check if DownloadQueue.ts still has mapToDataObject
const downloadQueuePath = path.join(__dirname, 'src/Entity/DownloadQueue.ts');
const downloadQueueContent = fs.readFileSync(downloadQueuePath, 'utf8');
if (downloadQueueContent.includes('mapToDataObject')) {
  console.error('ERROR: mapToDataObject still found in DownloadQueue.ts');
  process.exit(1);
}

console.log('SUCCESS: All mapToDataObject references removed');
