import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'motion/react';
import './SwipeScreen.css';

// Random rotation angles for the "thrown on table" effect
const CARD_ROTATIONS = [-8, 3, -4, 6, -2];
const CARD_OFFSET_Y = 8;
const SCALE_FACTOR = 0.04;

// Card component with Framer Motion drag
function SwipeCard({
    image,
    index,
    canDrag,
    onSwipe,
    rotation = 0,
    totalCards,
    exitDirection = null // 'keep' | 'delete' | null
}) {
    const x = useMotionValue(0);

    // Create a motion value for rotation that we control explicitly
    const cardRotation = useMotionValue(rotation);

    // Track if this card was previously the top card
    const wasTopCard = useRef(false);

    // Drag-based rotation (tilts as you drag)
    const dragRotate = useTransform(x, [-400, 400], [-30, 30]);

    // Calculate swipe indicators opacity
    const keepIndicatorOpacity = useTransform(x, [0, 100], [0, 1]);
    const deleteIndicatorOpacity = useTransform(x, [-100, 0], [1, 0]);

    // Glow effects based on drag direction
    const keepGlow = useTransform(x, [0, 150], [0, 1]);
    const deleteGlow = useTransform(x, [-150, 0], [1, 0]);

    const handleDragEnd = (event, info) => {
        const threshold = 100;
        const velocity = info.velocity.x;
        const offset = info.offset.x;

        // Consider both offset and velocity for a more natural feel
        if (offset > threshold || velocity > 500) {
            onSwipe('keep');
        } else if (offset < -threshold || velocity < -500) {
            onSwipe('delete');
        }
    };

    // Calculate exit animation based on direction
    const getExitAnimation = () => {
        if (exitDirection === 'keep') {
            return { x: 500, rotate: 30, opacity: 0 };
        } else if (exitDirection === 'delete') {
            return { x: -500, rotate: -30, opacity: 0 };
        }
        return { opacity: 0, scale: 0.9 };
    };

    const [isDragging, setIsDragging] = useState(false);

    // When card becomes top card (canDrag), animate rotation to 0
    // When card is in stack, keep its random rotation
    useEffect(() => {
        if (canDrag && !wasTopCard.current) {
            // Card just became the top card - animate to 0
            wasTopCard.current = true;
            // Use Framer Motion's animate function
            import('motion/react').then(({ animate }) => {
                animate(cardRotation, 0, {
                    type: 'spring',
                    stiffness: 200,
                    damping: 20
                });
            });
        } else if (!canDrag) {
            // Card is in the stack - set/keep its random rotation
            wasTopCard.current = false;
            cardRotation.set(rotation);
        }
    }, [canDrag, rotation, cardRotation]);

    return (
        <motion.div
            className="swipe-card"
            style={{
                x: canDrag ? x : 0,
                // Use dragRotate while dragging, cardRotation otherwise
                rotate: isDragging ? dragRotate : cardRotation,
                zIndex: totalCards - index,
                cursor: canDrag ? 'grab' : 'default',
            }}
            initial={{
                y: index * CARD_OFFSET_Y,
                scale: 1 - index * SCALE_FACTOR,
                opacity: 1
            }}
            animate={{
                y: index * CARD_OFFSET_Y,
                scale: 1 - index * SCALE_FACTOR,
                opacity: 1
            }}
            exit={getExitAnimation()}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={(event, info) => {
                setIsDragging(false);
                if (canDrag) handleDragEnd(event, info);
            }}
            whileDrag={{ cursor: 'grabbing', scale: 1.02 }}
            drag={canDrag ? 'x' : false}
            dragElastic={0.7}
            dragConstraints={{ left: 0, right: 0 }}
            transition={{
                type: 'spring',
                stiffness: 350,
                damping: 28
            }}
        >
            {/* Swipe indicators - only on top card */}
            {canDrag && (
                <>
                    <motion.div
                        className="swipe-indicator keep"
                        style={{ opacity: keepIndicatorOpacity }}
                    >
                        Keep ✓
                    </motion.div>
                    <motion.div
                        className="swipe-indicator delete"
                        style={{ opacity: deleteIndicatorOpacity }}
                    >
                        Delete ✗
                    </motion.div>

                    {/* Glow effects */}
                    <motion.div
                        className="swipe-glow keep-glow"
                        style={{ opacity: keepGlow }}
                    />
                    <motion.div
                        className="swipe-glow delete-glow"
                        style={{ opacity: deleteGlow }}
                    />
                </>
            )}

            {/* Image container - pointer-events disabled to prevent image drag */}
            <div className="card-image-container">
                <img
                    src={image.objectUrl}
                    alt={image.name}
                    className="card-image"
                    draggable={false}
                />
                <div className="card-overlay">
                    <div className="card-filename">{image.name}</div>
                    <div className="card-path">{image.relativePath}</div>
                </div>
            </div>
        </motion.div>
    );
}

export default function SwipeScreen({
    images,
    decisions,
    onDecision,
    onUndo,
    onReview,
    onBack,
    folderName
}) {
    // Track exit direction for animation
    const [exitDirection, setExitDirection] = useState(null);
    const exitingPathRef = useRef(null);

    // Get undecided images
    const undecidedImages = images.filter(img => !decisions.has(img.path));
    const currentImage = undecidedImages[0];
    const stackImages = undecidedImages.slice(0, 4); // Show max 4 cards in stack

    // Generate stable rotations for each image based on its path (not position)
    // Each image always has the same rotation, the top card animates to 0
    const getImageRotation = useCallback((imagePath) => {
        const hash = imagePath.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return CARD_ROTATIONS[hash % CARD_ROTATIONS.length];
    }, []);

    // Stats
    const keepCount = Array.from(decisions.values()).filter(d => d === 'keep').length;
    const deleteCount = Array.from(decisions.values()).filter(d => d === 'delete').length;
    const progress = ((images.length - undecidedImages.length) / images.length) * 100;

    // Handle decision with exit animation
    const handleDecision = useCallback((decision) => {
        if (!currentImage) return;

        // Set exit direction for animation
        exitingPathRef.current = currentImage.path;
        setExitDirection(decision);

        // Small delay to let animation start, then commit
        requestAnimationFrame(() => {
            onDecision(currentImage.path, decision);
            // Reset after a short delay
            setTimeout(() => {
                setExitDirection(null);
                exitingPathRef.current = null;
            }, 50);
        });
    }, [currentImage, onDecision]);

    // Handle swipe from card (drag) - direct, no extra animation needed
    const handleSwipe = useCallback((decision) => {
        if (!currentImage) return;
        // For drag, the card is already animating, just commit immediately
        onDecision(currentImage.path, decision);
    }, [currentImage, onDecision]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!currentImage) return;

            switch (e.key) {
                case 'ArrowRight':
                case ' ':
                    e.preventDefault();
                    handleDecision('keep');
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    handleDecision('delete');
                    break;
                case 'ArrowDown':
                case 'z':
                    e.preventDefault();
                    onUndo();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentImage, handleDecision, onUndo]);

    // If all images processed
    if (undecidedImages.length === 0) {
        return (
            <div className="swipe-screen">
                <div className="complete-state">
                    <div className="complete-icon">🎉</div>
                    <h2 className="complete-title">All Done!</h2>
                    <div className="complete-stats">
                        <div className="complete-stat">
                            <div className="complete-stat-number" style={{ color: 'var(--accent-keep)' }}>{keepCount}</div>
                            <div className="complete-stat-label">Keeping</div>
                        </div>
                        <div className="complete-stat">
                            <div className="complete-stat-number" style={{ color: 'var(--accent-delete)' }}>{deleteCount}</div>
                            <div className="complete-stat-label">Deleting</div>
                        </div>
                    </div>
                    <div className="complete-actions">
                        <button className="btn btn-ghost" onClick={onBack}>
                            ← Start Over
                        </button>
                        <button className="btn btn-primary" onClick={onReview}>
                            Review & Delete →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="swipe-screen">
            {/* Header */}
            <header className="swipe-header">
                <div className="header-left">
                    <button className="btn btn-ghost back-btn" onClick={onBack} id="back-btn">
                        ← Back
                    </button>
                    <div className="folder-info">
                        <span className="folder-name">{folderName}</span>
                        <span className="folder-path">{images.length} images</span>
                    </div>
                </div>

                <div className="header-right">
                    <div className="stats-display">
                        <div className="stat-item">
                            <span className="stat-number keep">{keepCount}</span>
                            <span className="stat-label">Keep</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number delete">{deleteCount}</span>
                            <span className="stat-label">Delete</span>
                        </div>
                    </div>

                    {deleteCount > 0 && (
                        <button className="btn btn-ghost review-btn" onClick={onReview} id="review-btn">
                            Review ({deleteCount})
                        </button>
                    )}
                </div>
            </header>

            {/* Progress */}
            <div className="progress-section">
                <div className="progress-info">
                    <span>{images.length - undecidedImages.length} of {images.length}</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            {/* Card Stack */}
            <div className="card-stack">
                <AnimatePresence mode="popLayout">
                    {/* Render cards in reverse order so the first one is on top */}
                    {[...stackImages].reverse().map((img, reverseIndex) => {
                        const index = stackImages.length - 1 - reverseIndex;
                        const canDrag = index === 0;
                        const isExiting = img.path === exitingPathRef.current;

                        return (
                            <SwipeCard
                                key={img.path}
                                image={img}
                                index={index}
                                canDrag={canDrag}
                                onSwipe={handleSwipe}
                                rotation={getImageRotation(img.path)}
                                totalCards={stackImages.length}
                                exitDirection={isExiting ? exitDirection : null}
                            />
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
                <motion.button
                    className="btn btn-delete btn-icon action-btn"
                    onClick={() => handleDecision('delete')}
                    disabled={!currentImage}
                    id="delete-btn"
                    title="Delete (← or Swipe Left)"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                >
                    ✗
                </motion.button>

                <motion.button
                    className="btn btn-icon action-btn undo-btn"
                    onClick={onUndo}
                    disabled={decisions.size === 0}
                    id="undo-btn"
                    title="Undo (↓)"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                >
                    ↩
                </motion.button>

                <motion.button
                    className="btn btn-keep btn-icon action-btn"
                    onClick={() => handleDecision('keep')}
                    disabled={!currentImage}
                    id="keep-btn"
                    title="Keep (→ or Swipe Right)"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                >
                    ✓
                </motion.button>
            </div>
        </div>
    );
}
