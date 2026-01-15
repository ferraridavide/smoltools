import './WelcomeScreen.css';

export default function WelcomeScreen({ onSelectFolder, isSupported }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-icon">🖼️</div>
        <h1 className="welcome-title">ImageSwipe</h1>
        <p className="welcome-subtitle">
          Swipe through your images like never before. 
          Choose what to keep and what to delete with a simple gesture or keystroke.
        </p>
        
        <div className="welcome-features">
          <div className="feature-item">
            <span className="feature-icon">📁</span>
            Folder scanning
          </div>
          <div className="feature-item">
            <span className="feature-icon">👆</span>
            Swipe gestures
          </div>
          <div className="feature-item">
            <span className="feature-icon">⌨️</span>
            Keyboard shortcuts
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔒</span>
            Safe deletion
          </div>
        </div>

        {isSupported ? (
          <button 
            className="btn btn-primary select-folder-btn"
            onClick={onSelectFolder}
            id="select-folder-btn"
          >
            <span>📂</span>
            Select Folder
          </button>
        ) : (
          <div className="browser-warning">
            ⚠️ Your browser doesn't support the File System Access API. 
            Please use Chrome, Edge, or another Chromium-based browser.
          </div>
        )}

        <div className="keyboard-hint">
          <div className="keyboard-hint-title">Keyboard Shortcuts</div>
          <div className="keyboard-shortcuts">
            <div className="shortcut">
              <span className="key">←</span>
              <span className="shortcut-label">Delete</span>
            </div>
            <div className="shortcut">
              <span className="key">→</span>
              <span className="shortcut-label">Keep</span>
            </div>
            <div className="shortcut">
              <span className="key">↓</span>
              <span className="shortcut-label">Undo</span>
            </div>
            <div className="shortcut">
              <span className="key">Space</span>
              <span className="shortcut-label">Keep</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
