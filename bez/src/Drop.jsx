import { useState, useRef } from 'react'
import clsx from 'clsx';
import './Drop.css'

export default function Drop({ setFile }) {
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const handleFiles = (selectedFiles) => {
        const file = selectedFiles[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        setFile(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
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
        <div className="drop-container">
            <div
                className={clsx('drop-zone', { 'drag-over': isDragOver })}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <span className="drop-icon">📷</span>
                <div className="drop-text">
                    <h2 className="drop-title">Drop your image here</h2>
                    <p className="drop-subtitle">or click to browse</p>
                </div>
                <div className="drop-hint">
                    <span className="drop-hint-icon">✨</span>
                    <span>PNG, JPG, WebP supported</span>
                </div>
            </div>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
        </div>
    )
}