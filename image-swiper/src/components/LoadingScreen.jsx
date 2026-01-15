import './LoadingScreen.css';

export default function LoadingScreen({ count }) {
    return (
        <div className="loading-screen">
            <div className="loading-spinner"></div>
            <h2 className="loading-title">Scanning folder...</h2>
            <p className="loading-subtitle">Looking for image files</p>
            {count > 0 && (
                <div className="loading-count">
                    <div className="loading-count-number">{count}</div>
                    <div className="loading-count-label">images found</div>
                </div>
            )}
        </div>
    );
}
