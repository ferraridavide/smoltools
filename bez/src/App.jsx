import { useState } from 'react'
import './App.css'
import Drop from './Drop.jsx'
import Editor from './Editor.jsx';

function App() {
  const [file, setFile] = useState(null);
  return (
    <>
      {!file && <Drop setFile={setFile} />}
      {file && <Editor file={file}/>}
    </>
  )
}

export default App
