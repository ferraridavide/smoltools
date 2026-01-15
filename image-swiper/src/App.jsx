import { useState, useCallback, useRef } from 'react';
import './App.css';
import WelcomeScreen from './components/WelcomeScreen';
import LoadingScreen from './components/LoadingScreen';
import SwipeScreen from './components/SwipeScreen';
import ReviewScreen from './components/ReviewScreen';

// Supported image extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico', '.heic', '.heif', '.avif'];

// Check if File System Access API is supported
const isFileSystemSupported = () => {
  return 'showDirectoryPicker' in window;
};

function App() {
  const [screen, setScreen] = useState('welcome'); // welcome, loading, swipe, review
  const [images, setImages] = useState([]);
  const [decisions, setDecisions] = useState(new Map()); // path -> 'keep' | 'delete'
  const [decisionHistory, setDecisionHistory] = useState([]); // for undo
  const [folderName, setFolderName] = useState('');
  const [scanCount, setScanCount] = useState(0);
  const objectUrlsRef = useRef([]);

  // Recursively scan directory for images
  const scanDirectory = async (dirHandle, path = '') => {
    const foundImages = [];

    for await (const [name, handle] of dirHandle.entries()) {
      const relativePath = path ? `${path}/${name}` : name;

      if (handle.kind === 'file') {
        const extension = name.toLowerCase().substring(name.lastIndexOf('.'));

        if (IMAGE_EXTENSIONS.includes(extension)) {
          try {
            const file = await handle.getFile();
            const objectUrl = URL.createObjectURL(file);
            objectUrlsRef.current.push(objectUrl);

            foundImages.push({
              name,
              path: relativePath,
              relativePath,
              handle,
              file,
              objectUrl,
              size: file.size,
              lastModified: file.lastModified
            });

            setScanCount(prev => prev + 1);
          } catch (err) {
            console.error(`Error reading file ${name}:`, err);
          }
        }
      } else if (handle.kind === 'directory') {
        const subImages = await scanDirectory(handle, relativePath);
        foundImages.push(...subImages);
      }
    }

    return foundImages;
  };

  // Handle folder selection
  const handleSelectFolder = async () => {
    try {
      // Request directory access
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite' // Need write access to delete files
      });

      setFolderName(dirHandle.name);
      setScreen('loading');
      setScanCount(0);

      // Clean up previous object URLs
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];

      // Scan for images
      const foundImages = await scanDirectory(dirHandle);

      // Sort by path
      foundImages.sort((a, b) => a.path.localeCompare(b.path));

      setImages(foundImages);
      setDecisions(new Map());
      setDecisionHistory([]);

      if (foundImages.length > 0) {
        setScreen('swipe');
      } else {
        alert('No images found in the selected folder.');
        setScreen('welcome');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error selecting folder:', err);
        alert('Failed to access folder. Please try again.');
      }
      setScreen('welcome');
    }
  };

  // Handle decision
  const handleDecision = useCallback((path, decision) => {
    setDecisions(prev => {
      const newDecisions = new Map(prev);
      newDecisions.set(path, decision);
      return newDecisions;
    });

    setDecisionHistory(prev => [...prev, { path, decision }]);
  }, []);

  // Handle undo
  const handleUndo = useCallback(() => {
    if (decisionHistory.length === 0) return;

    const lastAction = decisionHistory[decisionHistory.length - 1];

    setDecisions(prev => {
      const newDecisions = new Map(prev);
      newDecisions.delete(lastAction.path);
      return newDecisions;
    });

    setDecisionHistory(prev => prev.slice(0, -1));
  }, [decisionHistory]);

  // Toggle decision in review screen
  const handleToggleDecision = useCallback((path) => {
    setDecisions(prev => {
      const newDecisions = new Map(prev);
      const currentDecision = newDecisions.get(path);

      if (currentDecision === 'delete') {
        newDecisions.set(path, 'keep');
      } else if (currentDecision === 'keep') {
        newDecisions.set(path, 'delete');
      }

      return newDecisions;
    });
  }, []);

  // Handle deletion complete
  const handleDeleteConfirm = useCallback((deletedPaths) => {
    // Remove deleted images from state
    setImages(prev => prev.filter(img => !deletedPaths.includes(img.path)));

    // Remove decisions for deleted images
    setDecisions(prev => {
      const newDecisions = new Map(prev);
      deletedPaths.forEach(path => newDecisions.delete(path));
      return newDecisions;
    });

    // Clear history for deleted images
    setDecisionHistory(prev => prev.filter(action => !deletedPaths.includes(action.path)));

    // Go back to welcome or continue swiping
    const remainingImages = images.filter(img => !deletedPaths.includes(img.path));
    if (remainingImages.length === 0) {
      setScreen('welcome');
    } else {
      setScreen('swipe');
    }
  }, [images]);

  // Handle back to start
  const handleBack = useCallback(() => {
    setScreen('welcome');
  }, []);

  // Handle going to review
  const handleReview = useCallback(() => {
    setScreen('review');
  }, []);

  // Handle continuing swiping from review
  const handleContinueSwiping = useCallback(() => {
    setScreen('swipe');
  }, []);

  return (
    <div className="app">
      {screen === 'welcome' && (
        <WelcomeScreen
          onSelectFolder={handleSelectFolder}
          isSupported={isFileSystemSupported()}
        />
      )}

      {screen === 'loading' && (
        <LoadingScreen count={scanCount} />
      )}

      {screen === 'swipe' && (
        <SwipeScreen
          images={images}
          decisions={decisions}
          onDecision={handleDecision}
          onUndo={handleUndo}
          onReview={handleReview}
          onBack={handleBack}
          folderName={folderName}
        />
      )}

      {screen === 'review' && (
        <ReviewScreen
          images={images}
          decisions={decisions}
          onToggleDecision={handleToggleDecision}
          onBack={() => setScreen('swipe')}
          onDeleteConfirm={handleDeleteConfirm}
          onContinueSwiping={handleContinueSwiping}
        />
      )}
    </div>
  );
}

export default App;
