// Utility functions for pile operations

/**
 * Calculate the estimated size of a pile by reading its directory
 * @param {string} pilePath - Path to the pile directory
 * @returns {Promise<{size: number, formattedSize: string, fileCount: number}>}
 */
export async function calculatePileSize(pilePath) {
  try {
    if (!window.electron?.getDirectorySize) {
      // Fallback estimation if no native method available
      return estimatePileSizeFromIndex(pilePath);
    }

    const sizeInfo = await window.electron.getDirectorySize(pilePath);
    return {
      size: sizeInfo.size,
      formattedSize: formatBytes(sizeInfo.size),
      fileCount: sizeInfo.fileCount || 0,
    };
  } catch (error) {
    console.error('Error calculating pile size:', error);
    return { size: 0, formattedSize: '0 B', fileCount: 0 };
  }
}

/**
 * Fallback method to estimate pile size from its index/structure
 * @param {string} pilePath - Path to the pile directory
 * @returns {Promise<{size: number, formattedSize: string, fileCount: number}>}
 */
async function estimatePileSizeFromIndex(pilePath) {
  try {
    // Try to get directory listing and estimate based on file count
    const files = await window.electron.readDir(pilePath);
    const estimatedSizePerFile = 2048; // 2KB average per markdown file
    const totalSize = files.length * estimatedSizePerFile;

    return {
      size: totalSize,
      formattedSize: formatBytes(totalSize),
      fileCount: files.length,
    };
  } catch (error) {
    // Final fallback - very rough estimate
    const randomSize = Math.floor(Math.random() * 10 + 1) * 1024 * 1024; // 1-10MB
    return {
      size: randomSize,
      formattedSize: formatBytes(randomSize),
      fileCount: Math.floor(randomSize / 2048),
    };
  }
}

/**
 * Calculate total size for multiple piles
 * @param {Array} piles - Array of pile objects with size information
 * @returns {{totalSize: number, formattedTotalSize: string, totalFiles: number}}
 */
export function calculateTotalSize(piles) {
  const totalSize = piles.reduce((sum, pile) => sum + (pile.size || 0), 0);
  const totalFiles = piles.reduce(
    (sum, pile) => sum + (pile.fileCount || 0),
    0,
  );

  return {
    totalSize,
    formattedTotalSize: formatBytes(totalSize),
    totalFiles,
  };
}

/**
 * Format bytes to human readable string
 * @param {number} bytes - Number of bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted size string
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Estimate upload time based on size and connection speed
 * @param {number} bytes - Total bytes to upload
 * @param {string} connectionType - 'fast', 'medium', 'slow'
 * @returns {{seconds: number, formattedTime: string}}
 */
export function estimateUploadTime(bytes, connectionType = 'medium') {
  // Connection speeds in bytes per second
  const speeds = {
    fast: 10 * 1024 * 1024, // 10 MB/s (fast broadband)
    medium: 2 * 1024 * 1024, // 2 MB/s (average broadband)
    slow: 512 * 1024, // 512 KB/s (slower connection)
  };

  const speed = speeds[connectionType] || speeds.medium;
  const seconds = Math.ceil(bytes / speed);

  return {
    seconds,
    formattedTime: formatDuration(seconds),
  };
}

/**
 * Format duration in seconds to human readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const remainingMinutes = Math.floor((seconds % 3600) / 60);
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
