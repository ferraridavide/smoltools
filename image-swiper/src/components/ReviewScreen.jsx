import { useState } from 'react';
import './ReviewScreen.css';

export default function ReviewScreen({
    images,
    decisions,
    onToggleDecision,
    onBack,
    onDeleteConfirm,
    onContinueSwiping
}) {
    const [activeTab, setActiveTab] = useState('delete');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });

    // Filter images by decision
    const keepImages = images.filter(img => decisions.get(img.path) === 'keep');
    const deleteImages = images.filter(img => decisions.get(img.path) === 'delete');
    const undecidedImages = images.filter(img => !decisions.has(img.path));

    const displayImages = activeTab === 'delete' ? deleteImages :
        activeTab === 'keep' ? keepImages : undecidedImages;

    const handleDelete = async () => {
        setShowConfirmModal(false);
        setIsDeleting(true);
        setDeleteProgress({ current: 0, total: deleteImages.length });

        try {
            for (let i = 0; i < deleteImages.length; i++) {
                const img = deleteImages[i];
                setDeleteProgress({ current: i + 1, total: deleteImages.length });

                try {
                    // Delete the file using the file handle
                    await img.handle.remove();
                } catch (err) {
                    console.error(`Failed to delete ${img.name}:`, err);
                }
            }

            // Notify parent that deletion is complete
            onDeleteConfirm(deleteImages.map(img => img.path));
        } catch (err) {
            console.error('Deletion failed:', err);
        }

        setIsDeleting(false);
    };

    return (
        <div className="review-screen">
            {/* Header */}
            <header className="review-header">
                <h1 className="review-title">Review Selection</h1>

                <div className="review-tabs">
                    <button
                        className={`review-tab delete-tab ${activeTab === 'delete' ? 'active' : ''}`}
                        onClick={() => setActiveTab('delete')}
                    >
                        🗑️ Delete
                        <span className="tab-count">{deleteImages.length}</span>
                    </button>
                    <button
                        className={`review-tab keep-tab ${activeTab === 'keep' ? 'active' : ''}`}
                        onClick={() => setActiveTab('keep')}
                    >
                        ✓ Keep
                        <span className="tab-count">{keepImages.length}</span>
                    </button>
                    {undecidedImages.length > 0 && (
                        <button
                            className={`review-tab ${activeTab === 'undecided' ? 'active' : ''}`}
                            onClick={() => setActiveTab('undecided')}
                        >
                            ? Undecided
                            <span className="tab-count">{undecidedImages.length}</span>
                        </button>
                    )}
                </div>

                <div className="review-actions">
                    <button className="btn btn-ghost" onClick={onBack} id="review-back-btn">
                        ← Back
                    </button>
                </div>
            </header>

            {/* Grid */}
            <div className="review-grid">
                {displayImages.length > 0 ? (
                    <div className="image-grid">
                        {displayImages.map(img => (
                            <div key={img.path} className="image-card">
                                <img src={img.objectUrl} alt={img.name} loading="lazy" />

                                <div className="image-card-overlay">
                                    <div className="image-card-name">{img.name}</div>
                                </div>

                                <div className="image-card-badge">
                                    {decisions.get(img.path) === 'keep' && (
                                        <span className="badge badge-keep">Keep</span>
                                    )}
                                    {decisions.get(img.path) === 'delete' && (
                                        <span className="badge badge-delete">Delete</span>
                                    )}
                                </div>

                                <div className="image-card-action">
                                    <button
                                        className="toggle-btn"
                                        onClick={() => onToggleDecision(img.path)}
                                        title={decisions.get(img.path) === 'delete' ? 'Change to Keep' : 'Change to Delete'}
                                    >
                                        {decisions.get(img.path) === 'delete' ? '✓' : '✗'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="review-empty">
                        <div className="review-empty-icon">📭</div>
                        <div className="review-empty-text">
                            {activeTab === 'delete' && "No images marked for deletion"}
                            {activeTab === 'keep' && "No images marked to keep"}
                            {activeTab === 'undecided' && "All images have been decided"}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="review-footer">
                <div className="footer-info">
                    {deleteImages.length > 0 && (
                        <div className="warning-text">
                            ⚠️ {deleteImages.length} image{deleteImages.length !== 1 ? 's' : ''} will be permanently deleted
                        </div>
                    )}
                </div>

                <div className="footer-actions">
                    {undecidedImages.length > 0 && (
                        <button className="btn btn-ghost" onClick={onContinueSwiping}>
                            Continue Swiping ({undecidedImages.length} left)
                        </button>
                    )}

                    <button
                        className="btn btn-delete delete-final-btn"
                        onClick={() => setShowConfirmModal(true)}
                        disabled={deleteImages.length === 0}
                        id="confirm-delete-btn"
                    >
                        🗑️ Delete {deleteImages.length} Image{deleteImages.length !== 1 ? 's' : ''}
                    </button>
                </div>
            </footer>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-icon">⚠️</div>
                        <h2 className="modal-title">Confirm Deletion</h2>
                        <p className="modal-text">
                            You are about to permanently delete <strong>{deleteImages.length}</strong> image{deleteImages.length !== 1 ? 's' : ''}.
                        </p>
                        <div className="modal-warning">
                            ⚠️ This action cannot be undone. The files will be permanently removed from your computer.
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setShowConfirmModal(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-delete" onClick={handleDelete} id="final-delete-btn">
                                Delete Forever
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Deleting Overlay */}
            {isDeleting && (
                <div className="deleting-overlay">
                    <div className="deleting-spinner"></div>
                    <div className="deleting-text">Deleting files...</div>
                    <div className="deleting-progress">
                        {deleteProgress.current} of {deleteProgress.total}
                    </div>
                </div>
            )}
        </div>
    );
}
