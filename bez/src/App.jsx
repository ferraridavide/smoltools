import { useState } from 'react'
import './App.css'
import Drop from './Drop.jsx'
import Editor from './Editor.jsx'

function App() {
  const [file, setFile] = useState(null);

  const handleReset = () => {
    setFile(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">
          <span className="app-logo-icon">🎨</span>
          <span className="app-logo-text">Bez</span>
        </div>
        <span className="app-subtitle">Gradient Extractor</span>
      </header>
      <main className="app-content">
        {!file && <Drop setFile={setFile} />}
        {file && <Editor file={file} onReset={handleReset} />}
      </main>
    </div>
  )
}

export default App
