import { useState, useCallback, useMemo, useEffect } from 'react';
import './App.css';
import RuleEditor from './components/RuleEditor';
import {
  applyRules,
  detectConflicts,
  createDefaultRule,
  getRuleDisplayInfo,
  filterFiles,
} from './utils/renameUtils';

function App() {
  // State
  const [folderHandle, setFolderHandle] = useState(null);
  const [folderPath, setFolderPath] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [rules, setRules] = useState([]);
  const [editingRule, setEditingRule] = useState(null);
  const [isNewRule, setIsNewRule] = useState(false);
  const [filter, setFilter] = useState({ pattern: '', dateFrom: '', dateTo: '', type: 'all' });
  const [undoStack, setUndoStack] = useState([]);
  const [isApplying, setIsApplying] = useState(false);
  const [toasts, setToasts] = useState([]);

  // File System API: Select folder
  const selectFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setFolderHandle(handle);
      setFolderPath(handle.name);
      await loadFiles(handle);
    } catch (err) {
      if (err.name !== 'AbortError') {
        showToast('error', 'Error', 'Could not access the folder. Please try again.');
      }
    }
  };

  // Load files from folder
  const loadFiles = async (handle) => {
    const fileList = [];
    try {
      for await (const entry of handle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          fileList.push({
            name: entry.name,
            handle: entry,
            size: file.size,
            lastModified: file.lastModified,
            type: file.type,
          });
        }
      }
      setFiles(fileList.sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedFiles(new Set(fileList.map((_, i) => i)));
    } catch (err) {
      showToast('error', 'Error', 'Failed to read folder contents.');
    }
  };

  // Refresh files from folder
  const refreshFiles = async () => {
    if (folderHandle) {
      await loadFiles(folderHandle);
      showToast('success', 'Refreshed', 'File list has been updated.');
    }
  };

  // Filter files
  const filteredFiles = useMemo(() => {
    return filterFiles(files, filter);
  }, [files, filter]);

  // Apply rules to get renamed files
  const renamedFiles = useMemo(() => {
    const selectedArray = Array.from(selectedFiles).sort((a, b) => a - b);
    let enumIndex = 0;

    return filteredFiles.map((file, index) => {
      const isSelected = selectedFiles.has(index);
      const newName = isSelected && rules.length > 0
        ? applyRules(file, rules, enumIndex++, folderPath)
        : file.name;
      return newName;
    });
  }, [filteredFiles, rules, selectedFiles, folderPath]);

  // Detect conflicts
  const conflicts = useMemo(() => {
    return detectConflicts(filteredFiles, renamedFiles);
  }, [filteredFiles, renamedFiles]);

  // Count changes
  const changeCount = useMemo(() => {
    return filteredFiles.filter((file, i) =>
      file.name !== renamedFiles[i] && selectedFiles.has(i)
    ).length;
  }, [filteredFiles, renamedFiles, selectedFiles]);

  // Show toast notification
  const showToast = (type, title, message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Rule management
  const addRule = () => {
    setEditingRule(createDefaultRule('searchReplace'));
    setIsNewRule(true);
  };

  const editRule = (index) => {
    setEditingRule({ ...rules[index], _index: index });
    setIsNewRule(false);
  };

  const saveRule = (rule) => {
    if (isNewRule) {
      setRules(prev => [...prev, rule]);
    } else {
      const index = rule._index;
      delete rule._index;
      setRules(prev => prev.map((r, i) => i === index ? rule : r));
    }
    setEditingRule(null);
  };

  const deleteRule = (index) => {
    setRules(prev => prev.filter((_, i) => i !== index));
  };

  const toggleRule = (index) => {
    setRules(prev => prev.map((r, i) =>
      i === index ? { ...r, enabled: !r.enabled } : r
    ));
  };

  const moveRule = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= rules.length) return;
    const newRules = [...rules];
    const [removed] = newRules.splice(fromIndex, 1);
    newRules.splice(toIndex, 0, removed);
    setRules(newRules);
  };

  // Selection management
  const toggleFileSelection = (index) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedFiles(new Set(filteredFiles.map((_, i) => i)));
  };

  const selectNone = () => {
    setSelectedFiles(new Set());
  };

  const invertSelection = () => {
    setSelectedFiles(prev => {
      const next = new Set();
      filteredFiles.forEach((_, i) => {
        if (!prev.has(i)) next.add(i);
      });
      return next;
    });
  };

  // Apply rename
  const applyRename = async () => {
    if (conflicts.size > 0) {
      showToast('error', 'Cannot Apply', 'Please resolve naming conflicts first.');
      return;
    }

    if (changeCount === 0) {
      showToast('warning', 'No Changes', 'There are no files to rename.');
      return;
    }

    setIsApplying(true);
    const undoState = [];

    try {
      for (let i = 0; i < filteredFiles.length; i++) {
        const file = filteredFiles[i];
        const newName = renamedFiles[i];

        if (file.name !== newName && selectedFiles.has(i)) {
          // Store undo information
          undoState.push({
            handle: file.handle,
            oldName: file.name,
            newName: newName,
          });

          // Perform the rename
          await file.handle.move(newName);
        }
      }

      // Save undo state
      setUndoStack(prev => [...prev, undoState]);

      // Refresh file list
      await refreshFiles();

      showToast('success', 'Success', `Renamed ${undoState.length} files.`);
    } catch (err) {
      showToast('error', 'Error', `Failed to rename files: ${err.message}`);
    } finally {
      setIsApplying(false);
    }
  };

  // Undo last operation
  const undoLastOperation = async () => {
    if (undoStack.length === 0) {
      showToast('warning', 'Nothing to Undo', 'No operations to undo.');
      return;
    }

    const lastOperation = undoStack[undoStack.length - 1];
    setIsApplying(true);

    try {
      for (const op of lastOperation) {
        await op.handle.move(op.oldName);
      }

      setUndoStack(prev => prev.slice(0, -1));
      await refreshFiles();

      showToast('success', 'Undone', `Reverted ${lastOperation.length} files.`);
    } catch (err) {
      showToast('error', 'Error', `Failed to undo: ${err.message}`);
    } finally {
      setIsApplying(false);
    }
  };

  // Quick case conversion
  const quickCaseConversion = (caseType) => {
    const existingIndex = rules.findIndex(r => r.type === 'caseConversion');
    if (existingIndex >= 0) {
      setRules(prev => prev.map((r, i) =>
        i === existingIndex ? { ...r, caseType } : r
      ));
    } else {
      setRules(prev => [...prev, createDefaultRule('caseConversion')]);
      setTimeout(() => {
        setRules(prev => {
          const last = prev[prev.length - 1];
          if (last.type === 'caseConversion') {
            return [...prev.slice(0, -1), { ...last, caseType }];
          }
          return prev;
        });
      }, 0);
    }
  };

  // Clear all rules
  const clearRules = () => {
    setRules([]);
    showToast('success', 'Cleared', 'All rules have been removed.');
  };

  // Render folder selection screen
  if (!folderHandle) {
    return (
      <div className="app">
        <div className="folder-selection">
          <div className="folder-icon">📁</div>
          <h2>Power Renamer</h2>
          <p>
            Select a folder to start renaming files. You can use search & replace,
            regular expressions, date variables, numbering, and more.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column', alignItems: 'center' }}>
            <button className="btn btn-primary folder-btn" onClick={selectFolder}>
              📂 Select Folder
            </button>
          </div>
          <div style={{ marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            ⚠️ Requires a browser with File System Access API support (Chrome, Edge)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">✨</div>
            <h1>Power Renamer</h1>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={selectFolder}>
              📂 Change Folder
            </button>
            <button
              className="btn btn-secondary"
              onClick={undoLastOperation}
              disabled={undoStack.length === 0 || isApplying}
            >
              ↩️ Undo ({undoStack.length})
            </button>
          </div>
        </div>
      </header>

      <main className="app-content">
        {/* Folder Path */}
        <div className="folder-path">
          <span className="folder-path-icon">📁</span>
          <span className="folder-path-text">{folderPath}</span>
          <button className="btn btn-ghost btn-sm" onClick={refreshFiles}>
            🔄 Refresh
          </button>
        </div>

        <div className="main-layout">
          {/* Sidebar - Rules */}
          <aside className="sidebar">
            {/* Rename Rules Section */}
            <section className="sidebar-section">
              <div className="section-header">
                <h3>Rename Rules</h3>
                {rules.length > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={clearRules}>
                    Clear
                  </button>
                )}
              </div>
              <div className="section-content">
                <div className="rules-list">
                  {rules.map((rule, index) => {
                    const info = getRuleDisplayInfo(rule);
                    return (
                      <div
                        key={rule.id}
                        className={`rule-item ${!rule.enabled ? 'disabled' : ''}`}
                      >
                        <span className="rule-handle" title="Drag to reorder">⠿</span>
                        <span style={{ fontSize: '1.2rem' }}>{info.icon}</span>
                        <div className="rule-info">
                          <div className="rule-name">{info.name}</div>
                          <div className="rule-description">{info.description}</div>
                        </div>
                        <div className="rule-actions">
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => moveRule(index, index - 1)}
                            disabled={index === 0}
                          >
                            ↑
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => moveRule(index, index + 1)}
                            disabled={index === rules.length - 1}
                          >
                            ↓
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => toggleRule(index)}
                          >
                            {rule.enabled ? '👁️' : '👁️‍🗨️'}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => editRule(index)}
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => deleteRule(index)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button className="add-rule-btn" onClick={addRule}>
                  <span>+</span>
                  <span>Add Rename Rule</span>
                </button>
              </div>
            </section>

            {/* Quick Actions */}
            <section className="sidebar-section">
              <div className="section-header">
                <h3>Quick Case</h3>
              </div>
              <div className="section-content">
                <div className="case-buttons">
                  <button
                    className="btn btn-secondary case-btn"
                    onClick={() => quickCaseConversion('upper')}
                  >
                    UPPER
                  </button>
                  <button
                    className="btn btn-secondary case-btn"
                    onClick={() => quickCaseConversion('lower')}
                  >
                    lower
                  </button>
                  <button
                    className="btn btn-secondary case-btn"
                    onClick={() => quickCaseConversion('title')}
                  >
                    Title
                  </button>
                  <button
                    className="btn btn-secondary case-btn"
                    onClick={() => quickCaseConversion('sentence')}
                  >
                    Sentence
                  </button>
                </div>
              </div>
            </section>

            {/* Filter Section */}
            <section className="sidebar-section">
              <div className="section-header">
                <h3>Filter Files</h3>
              </div>
              <div className="section-content">
                <div className="form-group">
                  <label>Pattern (wildcards: *)</label>
                  <input
                    type="text"
                    value={filter.pattern}
                    onChange={(e) => setFilter(prev => ({ ...prev, pattern: e.target.value }))}
                    placeholder="*.jpg, IMG*, etc."
                  />
                </div>
                <div className="form-group">
                  <label>File Type</label>
                  <select
                    value={filter.type}
                    onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="all">All Files</option>
                    <option value="images">Images</option>
                    <option value="documents">Documents</option>
                    <option value="videos">Videos</option>
                    <option value="audio">Audio</option>
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Modified After</label>
                    <input
                      type="date"
                      value={filter.dateFrom}
                      onChange={(e) => setFilter(prev => ({ ...prev, dateFrom: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Modified Before</label>
                    <input
                      type="date"
                      value={filter.dateTo}
                      onChange={(e) => setFilter(prev => ({ ...prev, dateTo: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Selection */}
            <section className="sidebar-section">
              <div className="section-header">
                <h3>Selection</h3>
              </div>
              <div className="section-content">
                <div className="quick-actions">
                  <button className="btn btn-secondary quick-action-btn" onClick={selectAll}>
                    Select All
                  </button>
                  <button className="btn btn-secondary quick-action-btn" onClick={selectNone}>
                    Select None
                  </button>
                  <button className="btn btn-secondary quick-action-btn" onClick={invertSelection}>
                    Invert
                  </button>
                </div>
              </div>
            </section>
          </aside>

          {/* Main Content - File Preview */}
          <section className="preview-section">
            <div className="preview-header">
              <h2>File Preview</h2>
              <div className="preview-stats">
                <div className="stat-item">
                  <span className="stat-value">{filteredFiles.length}</span>
                  <span className="stat-label">files</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{selectedFiles.size}</span>
                  <span className="stat-label">selected</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value" style={{ color: changeCount > 0 ? 'var(--accent-primary-light)' : 'inherit' }}>
                    {changeCount}
                  </span>
                  <span className="stat-label">changes</span>
                </div>
                {conflicts.size > 0 && (
                  <div className="stat-item">
                    <span className="stat-value" style={{ color: 'var(--accent-danger)' }}>
                      {conflicts.size}
                    </span>
                    <span className="stat-label">conflicts</span>
                  </div>
                )}
              </div>
            </div>

            <div className="file-list-container">
              <div className="file-list-header">
                <div></div>
                <div>Original Name</div>
                <div>New Name</div>
                <div>Status</div>
              </div>
              <div className="file-list">
                {filteredFiles.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <p>No files found in this folder.</p>
                  </div>
                ) : (
                  filteredFiles.map((file, index) => {
                    const newName = renamedFiles[index];
                    const isChanged = file.name !== newName;
                    const isConflict = conflicts.has(index);
                    const isSelected = selectedFiles.has(index);

                    return (
                      <div
                        key={file.name}
                        className={`file-item ${isSelected ? 'selected' : ''} ${isConflict ? 'conflict' : ''}`}
                      >
                        <div className="file-checkbox">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleFileSelection(index)}
                          />
                        </div>
                        <div className="file-name file-name-original">{file.name}</div>
                        <div className={`file-name file-name-new ${isChanged ? 'changed' : ''} ${isConflict ? 'conflict' : ''}`}>
                          {newName}
                        </div>
                        <div className="file-status">
                          {isConflict ? (
                            <span className="status-badge status-conflict">Conflict</span>
                          ) : isChanged ? (
                            <span className="status-badge status-changed">Changed</span>
                          ) : (
                            <span className="status-badge status-unchanged">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Action Bar */}
      {changeCount > 0 && (
        <div className="action-bar">
          <div className="action-bar-info">
            <strong>{changeCount}</strong> files will be renamed
            {conflicts.size > 0 && (
              <span style={{ color: 'var(--accent-danger)', marginLeft: '1rem' }}>
                ⚠️ {conflicts.size} conflicts detected
              </span>
            )}
          </div>
          <button
            className="btn btn-primary btn-lg"
            onClick={applyRename}
            disabled={isApplying || conflicts.size > 0}
          >
            {isApplying ? (
              <>
                <span className="spinner"></span>
                Renaming...
              </>
            ) : (
              '✓ Apply Rename'
            )}
          </button>
        </div>
      )}

      {/* Rule Editor Modal */}
      {editingRule && (
        <RuleEditor
          rule={editingRule}
          onSave={saveRule}
          onCancel={() => setEditingRule(null)}
          isNew={isNewRule}
        />
      )}

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'success' && '✓'}
              {toast.type === 'error' && '✕'}
              {toast.type === 'warning' && '⚠'}
            </span>
            <div className="toast-content">
              <div className="toast-title">{toast.title}</div>
              <div className="toast-message">{toast.message}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
