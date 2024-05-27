import { useState, useRef } from 'react'
import clsx from 'clsx';
import './Drop.css'

export default function Drop(props) {
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const handleFiles = (selectedFiles) => {
        const file = selectedFiles[0];
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        props.setFile(selectedFiles[0]);
    };

    const handleDragOver = (e) => {
        setIsDragOver(true);
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragOut = (e) => {
        setIsDragOver(false);
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        setIsDragOver(false);
        e.preventDefault();
        e.stopPropagation();
        const droppedFiles = Array.from(e.dataTransfer.files);
        handleFiles(droppedFiles);
    };

    const handleClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        handleFiles(selectedFiles);
    };

    return (
        <>
            <div className={clsx('inputDropZone', { 'drag-over': isDragOver })}
            onDragOver={handleDragOver}
            onDragLeave={handleDragOut}
            onDrop={handleDrop}
            onClick={handleClick}>Drag and drop an image or click</div>
            <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
        </>
    )
}