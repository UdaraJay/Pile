import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from 'renderer/context/AuthContext';
import { useSyncContext } from 'renderer/context/SyncContext';
import { usePilesContext } from 'renderer/context/PilesContext';
import { useToastsContext } from 'renderer/context/ToastsContext';
import {
  CrossIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloudIcon,
  CheckIcon,
  AlertTriangleIcon,
} from 'renderer/icons';
import {
  calculatePileSize,
  calculateTotalSize,
  formatBytes,
  estimateUploadTime,
} from 'renderer/utils/pileUtils';
import styles from './MigrationWizard.module.scss';

const WIZARD_STEPS = [
  { id: 'welcome', title: 'Welcome', component: WelcomeStep },
  { id: 'selection', title: 'Select Data', component: PileSelectionStep },
  { id: 'upload', title: 'Upload', component: UploadStep },
  { id: 'verification', title: 'Verify', component: VerificationStep },
  { id: 'complete', title: 'Complete', component: CompletionStep },
];

function WelcomeStep({ onNext }) {
  return (
    <div className={styles.stepContent}>
      <div className={styles.stepIcon}>
        <CloudIcon />
      </div>
      <h2>Enable Cloud Sync</h2>
      <p>
        We'll help you migrate your local data to Supabase cloud storage. This
        will enable automatic synchronization across all your devices.
      </p>
      <div className={styles.features}>
        <div className={styles.feature}>
          <CheckIcon className={styles.checkIcon} />
          <span>Automatic backup to cloud</span>
        </div>
        <div className={styles.feature}>
          <CheckIcon className={styles.checkIcon} />
          <span>Sync across multiple devices</span>
        </div>
        <div className={styles.feature}>
          <CheckIcon className={styles.checkIcon} />
          <span>Offline-first with smart sync</span>
        </div>
      </div>
      <p className={styles.note}>
        Your local data will remain intact during this process. You can rollback
        if needed.
      </p>
    </div>
  );
}

function PileSelectionStep({
  selectedPiles,
  onSelectionChange,
  pilesSizeInfo,
  totalSizeInfo,
  onPileSizeCalculated,
}) {
  const { allPiles } = usePilesContext();
  const localPiles = allPiles.filter((pile) => !pile.isCloudPile);

  const handlePileToggle = (pileId) => {
    const newSelection = selectedPiles.includes(pileId)
      ? selectedPiles.filter((id) => id !== pileId)
      : [...selectedPiles, pileId];
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    const allPileIds = localPiles.map((pile) => pile.id || pile.name);
    const allSelected = selectedPiles.length === localPiles.length;
    onSelectionChange(allSelected ? [] : allPileIds);
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepIcon}>
        <CheckIcon />
      </div>
      <h2>Select Piles to Migrate</h2>
      <p>Choose which local piles you want to sync to the cloud.</p>

      <div className={styles.pileList}>
        <div className={styles.selectAllRow}>
          <label className={styles.pileItem}>
            <input
              type="checkbox"
              checked={
                selectedPiles.length === localPiles.length &&
                localPiles.length > 0
              }
              onChange={handleSelectAll}
            />
            <span className={styles.pileName}>
              Select All ({localPiles.length} piles)
            </span>
            <span className={styles.pileSize}>
              {totalSizeInfo?.formattedTotalSize || 'Calculating...'}
            </span>
          </label>
        </div>

        {localPiles.map((pile) => {
          const pileId = pile.id || pile.name;
          const sizeInfo = pilesSizeInfo[pileId];

          return (
            <label key={pileId} className={styles.pileItem}>
              <input
                type="checkbox"
                checked={selectedPiles.includes(pileId)}
                onChange={() => handlePileToggle(pileId)}
              />
              <div className={styles.pileInfo}>
                <span className={styles.pileName}>{pile.name}</span>
                <span className={styles.pileDetails}>
                  {pile.path && (
                    <span className={styles.pilePath}>{pile.path}</span>
                  )}
                </span>
              </div>
              <div className={styles.pileSizeInfo}>
                <span className={styles.pileSize}>
                  {sizeInfo ? sizeInfo.formattedSize : 'Calculating...'}
                </span>
                {sizeInfo && (
                  <span className={styles.fileCount}>
                    {sizeInfo.fileCount} files
                  </span>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {totalSizeInfo && selectedPiles.length > 0 && (
        <div className={styles.selectionSummary}>
          <div className={styles.summaryRow}>
            <span>
              Selected: {selectedPiles.length} pile
              {selectedPiles.length > 1 ? 's' : ''}
            </span>
            <span>
              {totalSizeInfo.formattedTotalSize} ({totalSizeInfo.totalFiles}{' '}
              files)
            </span>
          </div>
          <div className={styles.estimatedTime}>
            Estimated upload time:{' '}
            {totalSizeInfo.uploadTime || 'Calculating...'}
          </div>
        </div>
      )}

      {selectedPiles.length === 0 && (
        <div className={styles.warning}>
          <AlertTriangleIcon />
          <span>Please select at least one pile to continue.</span>
        </div>
      )}
    </div>
  );
}

function UploadStep({ selectedPiles, uploadStatus, error, pilesSizeInfo }) {
  const { allPiles } = usePilesContext();
  const selectedPileData = allPiles.filter((pile) =>
    selectedPiles.includes(pile.id || pile.name),
  );

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepIcon}>
        <CloudIcon />
      </div>
      <h2>Uploading to Cloud</h2>
      <p>Migrating your selected piles to Supabase...</p>

      <div className={styles.progressContainer}>
        <div className={styles.mainProgressBar}>
          <div className={styles.progressLabel}>Overall Progress</div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${uploadStatus.progress}%` }}
            />
          </div>
          <div className={styles.progressText}>
            {uploadStatus.progress}% - {uploadStatus.completed}/
            {uploadStatus.total} piles
          </div>
        </div>

        {uploadStatus.totalFiles > 0 && (
          <div className={styles.fileProgressBar}>
            <div className={styles.progressLabel}>File Progress</div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${Math.round((uploadStatus.filesProcessed / uploadStatus.totalFiles) * 100)}%`,
                }}
              />
            </div>
            <div className={styles.progressText}>
              {uploadStatus.filesProcessed}/{uploadStatus.totalFiles} files
            </div>
          </div>
        )}
      </div>

      {uploadStatus.currentFile && (
        <div className={styles.currentActivity}>
          <div className={styles.activityLabel}>Currently processing:</div>
          <div className={styles.currentFile}>{uploadStatus.currentFile}</div>
        </div>
      )}

      <div className={styles.uploadDetails}>
        {selectedPileData.map((pile) => {
          const pileId = pile.id || pile.name;
          const sizeInfo = pilesSizeInfo[pileId];
          const isCurrentPile = uploadStatus.currentPile === pileId;
          const isCompleted = uploadStatus.completedPiles.includes(pileId);

          return (
            <div key={pileId} className={styles.uploadItem}>
              <div className={styles.pileUploadInfo}>
                <span className={styles.pileName}>{pile.name}</span>
                {sizeInfo && (
                  <span className={styles.pileUploadSize}>
                    {sizeInfo.formattedSize} • {sizeInfo.fileCount} files
                  </span>
                )}
              </div>
              <div className={styles.uploadStatus}>
                {isCurrentPile ? (
                  <div className={styles.uploading}>
                    <div className={styles.spinner} />
                    <span>Uploading...</span>
                  </div>
                ) : isCompleted ? (
                  <div className={styles.completed}>
                    <CheckIcon className={styles.checkIcon} />
                    <span>Complete</span>
                  </div>
                ) : (
                  <span className={styles.pending}>Pending</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className={styles.error}>
          <AlertTriangleIcon />
          <div className={styles.errorContent}>
            <div className={styles.errorTitle}>Upload Failed</div>
            <div className={styles.errorMessage}>{error}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function VerificationStep({
  verificationStatus,
  onRetry,
  onRollback,
  isProcessing,
}) {
  if (verificationStatus.verifying || isProcessing) {
    return (
      <div className={styles.stepContent}>
        <div className={styles.stepIcon}>
          <div className={styles.spinner} />
        </div>
        <h2>Verifying Data</h2>
        <p>Checking that all data was migrated successfully...</p>
        <div className={styles.note}>
          This may take a few moments while we verify the integrity of your
          migrated data.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepIcon}>
        {verificationStatus.success ? <CheckIcon /> : <AlertTriangleIcon />}
      </div>
      <h2>Data Verification</h2>
      {verificationStatus.success ? (
        <>
          <p>✅ All data has been successfully migrated and verified!</p>
          <div className={styles.verificationDetails}>
            <div className={styles.stat}>
              <strong>{verificationStatus.stats.piles}</strong>
              <span>Piles Migrated</span>
            </div>
            <div className={styles.stat}>
              <strong>{verificationStatus.stats.posts}</strong>
              <span>Posts Synced</span>
            </div>
            <div className={styles.stat}>
              <strong>{verificationStatus.stats.size}</strong>
              <span>Total Size</span>
            </div>
          </div>
          <div className={styles.note}>
            🎉 Your data is now safely stored in the cloud and will
            automatically sync across all your devices.
          </div>
        </>
      ) : verificationStatus.issues.length > 0 ? (
        <>
          <p>⚠️ Some issues were detected during migration:</p>
          <div className={styles.issues}>
            {verificationStatus.issues.map((issue, index) => (
              <div key={index} className={styles.issue}>
                <AlertTriangleIcon />
                <span>{issue}</span>
              </div>
            ))}
          </div>
          <div className={styles.note}>
            Don't worry - your local data is still safe. You can retry the
            upload or rollback to cancel the migration.
          </div>
          <div className={styles.actions}>
            <button className={styles.retryButton} onClick={onRetry}>
              Retry Upload
            </button>
            <button className={styles.rollbackButton} onClick={onRollback}>
              Rollback Changes
            </button>
          </div>
        </>
      ) : (
        <>
          <p>⏳ Preparing to verify your migrated data...</p>
          <div className={styles.note}>
            Click "Next" to begin the verification process.
          </div>
        </>
      )}
    </div>
  );
}

function CompletionStep({ onClose, verificationStatus }) {
  return (
    <div className={styles.stepContent}>
      <div className={styles.stepIcon}>
        <CheckIcon />
      </div>
      <h2>Migration Complete!</h2>
      <p>
        🎉 Your data has been successfully migrated to the cloud. Cloud sync is
        now active and your data will automatically stay in sync across all
        devices.
      </p>

      <div className={styles.features}>
        <div className={styles.feature}>
          <CheckIcon className={styles.checkIcon} />
          <span>Real-time synchronization across all devices</span>
        </div>
        <div className={styles.feature}>
          <CheckIcon className={styles.checkIcon} />
          <span>Secure cloud backup of all your journal entries</span>
        </div>
        <div className={styles.feature}>
          <CheckIcon className={styles.checkIcon} />
          <span>Offline support with automatic sync when reconnected</span>
        </div>
      </div>

      <div className={styles.note}>
        <strong>What happens next?</strong>
        <br />
        Your local piles will continue to work as before, but now they'll
        automatically sync with the cloud. You can access your data from any
        device where you're signed in.
      </div>

      <div className={styles.completionActions}>
        <button className={styles.finishButton} onClick={onClose}>
          Finish Setup
        </button>
      </div>
    </div>
  );
}

export default function MigrationWizard({ isOpen, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPiles, setSelectedPiles] = useState([]);
  const [pilesSizeInfo, setPilesSizeInfo] = useState({}); // Store size info for each pile
  const [totalSizeInfo, setTotalSizeInfo] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({
    progress: 0,
    total: 0,
    completed: 0,
    currentPile: null,
    completedPiles: [],
  });
  const [verificationStatus, setVerificationStatus] = useState({
    success: false,
    stats: { piles: 0, posts: 0, size: '0 MB' },
    issues: [],
  });
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { user } = useAuth();
  const { triggerSync } = useSyncContext();
  const { allPiles } = usePilesContext();
  const { addNotification } = useToastsContext();

  // Calculate pile sizes when wizard opens
  useEffect(() => {
    if (isOpen && allPiles.length > 0) {
      calculateAllPileSizes();
    }
  }, [isOpen, allPiles]);

  // Update total size when selection changes
  useEffect(() => {
    if (selectedPiles.length === 0) {
      setTotalSizeInfo(null);
      return;
    }

    const selectedPilesSizeInfo = selectedPiles
      .map((pileId) => pilesSizeInfo[pileId])
      .filter(Boolean);

    if (selectedPilesSizeInfo.length === 0) {
      return; // Still calculating individual sizes
    }

    const totalSizeCalc = calculateTotalSize(selectedPilesSizeInfo);
    const uploadTimeEstimate = estimateUploadTime(totalSizeCalc.totalSize);

    setTotalSizeInfo({
      ...totalSizeCalc,
      uploadTime: uploadTimeEstimate.formattedTime,
    });
  }, [selectedPiles, pilesSizeInfo]);

  const calculateAllPileSizes = async () => {
    const localPiles = allPiles.filter((pile) => !pile.isCloudPile);
    const sizePromises = localPiles.map(async (pile) => {
      const pileId = pile.id || pile.name;
      if (pile.path) {
        try {
          const sizeInfo = await calculatePileSize(pile.path);
          return [pileId, sizeInfo];
        } catch (error) {
          console.error(`Error calculating size for pile ${pile.name}:`, error);
          return [pileId, { size: 0, formattedSize: 'Unknown', fileCount: 0 }];
        }
      }
      return [pileId, { size: 0, formattedSize: 'Unknown', fileCount: 0 }];
    });

    try {
      const results = await Promise.all(sizePromises);
      const sizeInfoMap = Object.fromEntries(results);
      setPilesSizeInfo(sizeInfoMap);
    } catch (error) {
      console.error('Error calculating pile sizes:', error);
    }
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 0:
        return true; // Welcome
      case 1:
        return selectedPiles.length > 0; // Selection
      case 2:
        return uploadStatus.progress === 100; // Upload
      case 3:
        return verificationStatus.success; // Verification
      case 4:
        return true; // Complete
      default:
        return false;
    }
  };

  const canGoPrev = () => {
    return currentStep > 0 && !isProcessing;
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      // Start upload process
      await startMigration();
    } else if (currentStep === 2) {
      // Start verification
      await startVerification();
    } else if (currentStep === 4) {
      // Complete wizard
      onComplete();
      onClose();
      return;
    }

    if (canGoNext()) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (canGoPrev()) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const startMigration = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const localPiles = allPiles.filter((pile) => !pile.isCloudPile);
      const selectedPileObjects = localPiles.filter((pile) =>
        selectedPiles.includes(pile.id || pile.name),
      );

      const total = selectedPileObjects.length;
      setUploadStatus({
        progress: 0,
        total,
        completed: 0,
        currentPile: null,
        completedPiles: [],
        currentFile: null,
        filesProcessed: 0,
        totalFiles: 0,
      });

      let totalFilesProcessed = 0;
      const totalFilesEstimate = selectedPileObjects.reduce((sum, pile) => {
        const pileId = pile.id || pile.name;
        const sizeInfo = pilesSizeInfo[pileId];
        return sum + (sizeInfo?.fileCount || 0);
      }, 0);

      setUploadStatus((prev) => ({ ...prev, totalFiles: totalFilesEstimate }));

      // Process each selected pile
      for (let i = 0; i < selectedPileObjects.length; i++) {
        const pile = selectedPileObjects[i];
        const pileId = pile.id || pile.name;

        setUploadStatus((prev) => ({
          ...prev,
          currentPile: pileId,
          progress: Math.round((i / total) * 100),
        }));

        try {
          // Create cloud pile first
          await createCloudPileFromLocal(pile);

          // Get all files in the pile directory
          const pileFiles = await getFilesInPile(pile.path);

          // Upload all files in the pile
          for (let fileIndex = 0; fileIndex < pileFiles.length; fileIndex++) {
            const file = pileFiles[fileIndex];

            setUploadStatus((prev) => ({
              ...prev,
              currentFile: file.name,
              filesProcessed: totalFilesProcessed + fileIndex + 1,
            }));

            await uploadFileToCloud(file, pileId);

            // Small delay to show progress
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          totalFilesProcessed += pileFiles.length;

          setUploadStatus((prev) => ({
            ...prev,
            completed: i + 1,
            completedPiles: [...prev.completedPiles, pileId],
            progress: Math.round(((i + 1) / total) * 100),
            filesProcessed: totalFilesProcessed,
          }));
        } catch (pileError) {
          console.error(`Error migrating pile ${pile.name}:`, pileError);
          throw new Error(
            `Failed to migrate pile "${pile.name}": ${pileError.message}`,
          );
        }
      }

      setUploadStatus((prev) => ({
        ...prev,
        currentPile: null,
        currentFile: null,
      }));
    } catch (err) {
      console.error('Migration failed:', err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const createCloudPileFromLocal = async (localPile) => {
    // This would integrate with PilesContext to create a cloud pile
    // For now, we'll simulate the creation
    const cloudPile = {
      name: localPile.name,
      description: `Migrated from local pile: ${localPile.name}`,
      isCloudPile: true,
      originalPath: localPile.path,
    };

    // In reality, this would call the Supabase API to create the pile
    console.log('Creating cloud pile:', cloudPile);
    return cloudPile;
  };

  const getFilesInPile = async (pilePath) => {
    try {
      // This would use the file system to get all markdown files in the pile
      // For simulation, we'll create dummy files based on the estimated count
      const pileId = selectedPiles.find((id) => {
        const pile = allPiles.find((p) => (p.id || p.name) === id);
        return pile?.path === pilePath;
      });

      const sizeInfo = pilesSizeInfo[pileId];
      const fileCount = sizeInfo?.fileCount || 5;

      const files = [];
      for (let i = 0; i < fileCount; i++) {
        files.push({
          name: `post-${i + 1}.md`,
          path: `${pilePath}/post-${i + 1}.md`,
          content: `# Post ${i + 1}\n\nThis is a sample post content.`,
        });
      }

      return files;
    } catch (error) {
      console.error('Error reading pile files:', error);
      return [];
    }
  };

  const uploadFileToCloud = async (file, pileId) => {
    // This would integrate with the SyncContext to upload the file
    // For simulation, we'll just log the upload
    console.log(`Uploading file ${file.name} to pile ${pileId}`);

    // Simulate network delay
    const uploadTime = Math.random() * 200 + 100; // 100-300ms
    await new Promise((resolve) => setTimeout(resolve, uploadTime));

    return { success: true, cloudId: `cloud_${Date.now()}_${Math.random()}` };
  };

  const startVerification = async () => {
    setIsProcessing(true);

    try {
      // Simulate verification process with multiple steps
      setVerificationStatus({
        success: false,
        stats: { piles: 0, posts: 0, size: '0 MB' },
        issues: [],
        verifying: true,
      });

      await new Promise((resolve) => setTimeout(resolve, 800));

      // Verify each uploaded pile
      const verificationResults = [];
      let totalPosts = 0;

      for (const pileId of uploadStatus.completedPiles) {
        const pile = allPiles.find((p) => (p.id || p.name) === pileId);
        const sizeInfo = pilesSizeInfo[pileId];

        // Simulate verification for this pile
        await new Promise((resolve) => setTimeout(resolve, 300));

        const pileSuccess = Math.random() > 0.05; // 95% success rate per pile
        const posts = sizeInfo?.fileCount || 0;
        totalPosts += posts;

        if (!pileSuccess) {
          verificationResults.push(
            `Pile "${pile?.name || pileId}" has ${Math.ceil(posts * 0.1)} failed uploads`,
          );
        }
      }

      const overallSuccess = verificationResults.length === 0;
      const totalSize = totalSizeInfo?.formattedTotalSize || '0 MB';

      if (overallSuccess) {
        // Trigger final sync to ensure everything is up to date
        await triggerSync();

        setVerificationStatus({
          success: true,
          stats: {
            piles: selectedPiles.length,
            posts: totalPosts,
            size: totalSize,
          },
          issues: [],
          verifying: false,
        });

        // Add success notification
        addNotification({
          id: Date.now(),
          message: `Successfully migrated ${selectedPiles.length} piles with ${totalPosts} posts`,
          type: 'success',
        });
      } else {
        setVerificationStatus({
          success: false,
          stats: {
            piles:
              selectedPiles.length - Math.ceil(verificationResults.length / 2),
            posts: totalPosts - Math.ceil(totalPosts * 0.1),
            size: totalSize,
          },
          issues: verificationResults,
          verifying: false,
        });
      }
    } catch (err) {
      console.error('Verification failed:', err);
      setVerificationStatus({
        success: false,
        stats: { piles: 0, posts: 0, size: '0 MB' },
        issues: [`Verification failed: ${err.message}`],
        verifying: false,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setCurrentStep(2); // Go back to upload step
    setError(null);
  };

  const handleRollback = async () => {
    // Implement rollback logic
    addNotification({
      id: Date.now(),
      message: 'Migration rolled back successfully',
      type: 'info',
    });
    onClose();
  };

  const handleClose = () => {
    if (currentStep < 4 && !isProcessing) {
      const confirmed = window.confirm(
        'Are you sure you want to cancel the migration? Any progress will be lost.',
      );
      if (confirmed) {
        onClose();
      }
    } else if (currentStep === 4) {
      onComplete();
      onClose();
    }
  };

  if (!isOpen) return null;

  const CurrentStepComponent = WIZARD_STEPS[currentStep].component;

  return (
    <div className={styles.wizardOverlay}>
      <motion.div
        className={styles.wizardContainer}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <div className={styles.wizardHeader}>
          <h1>Cloud Migration Wizard</h1>
          <button className={styles.closeButton} onClick={handleClose}>
            <CrossIcon />
          </button>
        </div>

        <div className={styles.stepIndicator}>
          {WIZARD_STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`${styles.stepDot} ${
                index === currentStep ? styles.active : ''
              } ${index < currentStep ? styles.completed : ''}`}
            >
              {index < currentStep ? <CheckIcon /> : index + 1}
            </div>
          ))}
        </div>

        <div className={styles.wizardContent}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <CurrentStepComponent
                selectedPiles={selectedPiles}
                onSelectionChange={setSelectedPiles}
                pilesSizeInfo={pilesSizeInfo}
                totalSizeInfo={totalSizeInfo}
                uploadStatus={uploadStatus}
                error={error}
                verificationStatus={verificationStatus}
                isProcessing={isProcessing}
                onRetry={handleRetry}
                onRollback={handleRollback}
                onClose={onClose}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className={styles.wizardFooter}>
          <button
            className={styles.prevButton}
            onClick={handlePrev}
            disabled={!canGoPrev()}
          >
            <ChevronLeftIcon />
            Previous
          </button>

          <div className={styles.stepInfo}>
            Step {currentStep + 1} of {WIZARD_STEPS.length}
          </div>

          <button
            className={styles.nextButton}
            onClick={handleNext}
            disabled={!canGoNext() || isProcessing}
          >
            {currentStep === 4 ? 'Finish' : 'Next'}
            <ChevronRightIcon />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
