import { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import './Editor.css';

export default function Editor({ file, onReset }) {
    const imgRef = useRef(null);
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const overlayRef = useRef(null);

    const image = useRef(new Image());
    const canvas = useRef(document.createElement('canvas'));
    const ctxRef = useRef(canvas.current.getContext('2d'));

    const [gradient, setGradient] = useState(null);
    const [samples, setSamples] = useState(50);
    const [showSamplePoints, setShowSamplePoints] = useState(true);
    const [copiedType, setCopiedType] = useState(null);

    const samplesRef = useRef(samples);
    const points = useRef([]);
    const selected = useRef(null);

    const line = useRef(d3.line().curve(d3.curveCatmullRom));

    // Sync samples ref
    useEffect(() => {
        samplesRef.current = samples;
    }, [samples]);

    // Sample path and get colors
    const getGradient = useCallback(() => {
        if (!overlayRef.current || !svgRef.current) return;
        if (points.current.length < 2) {
            setGradient(null);
            return;
        }

        const pathEl = svgRef.current.select("path").node();
        if (!pathEl) return;

        const sampledPoints = samplePath(pathEl, samplesRef.current);

        // Update sample point visualization
        const samplePointsSelection = svgRef.current.selectAll(".sample-point")
            .data(showSamplePoints ? sampledPoints : [], (d, i) => i);

        samplePointsSelection.enter()
            .append("circle")
            .attr('pointer-events', 'none')
            .attr("class", "sample-point")
            .attr("r", 3)
            .attr("fill", (d) => {
                const [r, g, b] = getPixelColor(d[0], d[1]);
                return `rgb(${r}, ${g}, ${b})`;
            })
            .attr("stroke", "white")
            .attr("stroke-width", 1)
            .merge(samplePointsSelection)
            .attr("cx", d => d[0])
            .attr("cy", d => d[1])
            .attr("fill", (d) => {
                const [r, g, b] = getPixelColor(d[0], d[1]);
                return `rgb(${r}, ${g}, ${b})`;
            });

        samplePointsSelection.exit().remove();

        // Generate gradient
        const colors = sampledPoints.map(([x, y]) => getPixelColor(x, y));
        setGradient(createLinearGradient(colors));
    }, [showSamplePoints]);

    // Get pixel color at overlay coordinates
    const getPixelColor = (overlayX, overlayY) => {
        if (!overlayRef.current || !image.current.width) return [128, 128, 128];

        const x = mapRange(overlayX, 0, overlayRef.current.offsetWidth, 0, image.current.width);
        const y = mapRange(overlayY, 0, overlayRef.current.offsetHeight, 0, image.current.height);

        try {
            const pixelData = ctxRef.current.getImageData(x, y, 1, 1).data;
            return [pixelData[0], pixelData[1], pixelData[2]];
        } catch {
            return [128, 128, 128];
        }
    };

    // Update visualization
    const update = useCallback(() => {
        if (!svgRef.current) return;

        // Update path
        svgRef.current.select("path")
            .attr("d", line.current(points.current));

        // Update control points
        const circles = svgRef.current.selectAll("g.control-point")
            .data(points.current, d => d);

        const enter = circles.enter()
            .append("g")
            .attr("class", "control-point");

        // Outer circle (hit area)
        enter.append("circle")
            .attr("r", 30)
            .attr("fill", "none");

        // Inner circle (visible)
        enter.append("circle")
            .attr("r", 0)
            .attr("stroke-width", 2)
            .transition()
            .duration(500)
            .ease(d3.easeElastic)
            .attr("r", 8);

        enter.merge(circles)
            .attr("transform", d => `translate(${d})`)
            .select("circle:last-child")
            .attr("fill", d => d === selected.current ? "#6366f1" : "white")
            .attr("stroke", d => d === selected.current ? "#818cf8" : "rgba(0,0,0,0.3)");

        circles.exit().remove();

        getGradient();
    }, [getGradient]);

    // Drag handlers
    const dragstarted = useCallback(({ subject }) => {
        selected.current = subject;
        update();
    }, [update]);

    const dragged = useCallback((event) => {
        if (!overlayRef.current) return;
        event.subject[0] = Math.max(0, Math.min(overlayRef.current.clientWidth, event.x));
        event.subject[1] = Math.max(0, Math.min(overlayRef.current.clientHeight, event.y));
        update();
    }, [update]);

    const dragsubject = useCallback((event) => {
        let subject = event.sourceEvent.target.__data__;
        if (!subject) {
            subject = [event.x, event.y];
            points.current.push(subject);
            update();
        }
        return subject;
    }, [update]);

    // Keyboard handler
    const handleKeyDown = useCallback((event) => {
        if (!selected.current) return;

        if (event.key === "Backspace" || event.key === "Delete") {
            event.preventDefault();
            const i = points.current.indexOf(selected.current);
            if (i > -1) {
                points.current.splice(i, 1);
                selected.current = points.current.length
                    ? points.current[Math.max(0, i - 1)]
                    : null;
                update();
            }
        }
    }, [update]);

    // Initialize SVG
    const setupCurve = useCallback(() => {
        if (svgRef.current || !overlayRef.current) return;

        // Create initial points
        const width = overlayRef.current.clientWidth;
        const height = overlayRef.current.clientHeight;

        points.current = [
            [width * 0.2, height * 0.5],
            [width * 0.4, height * 0.3],
            [width * 0.6, height * 0.7],
            [width * 0.8, height * 0.5],
        ];
        selected.current = points.current[0];

        // Create SVG
        svgRef.current = d3.create('svg')
            .attr('tabindex', 1)
            .style('position', 'absolute')
            .style('width', '100%')
            .style('height', '100%')
            .style('top', '0')
            .style('left', '0')
            .attr('pointer-events', 'all')
            .call(d3.drag()
                .subject(dragsubject)
                .on("start", dragstarted)
                .on("drag", dragged));

        svgRef.current.append("path")
            .datum(points.current)
            .attr("fill", "none");

        overlayRef.current.appendChild(svgRef.current.node());
        update();
    }, [dragsubject, dragstarted, dragged, update]);

    // Load image
    useEffect(() => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const dataUrl = e.target.result;

            imgRef.current.onload = () => {
                // Sync overlay size after image loads
                if (imgRef.current && overlayRef.current) {
                    overlayRef.current.style.width = `${imgRef.current.offsetWidth}px`;
                    overlayRef.current.style.height = `${imgRef.current.offsetHeight}px`;
                    setupCurve();
                }
            };
            imgRef.current.src = dataUrl;

            // Load image into canvas for pixel sampling
            image.current.onload = () => {
                canvas.current.width = image.current.width;
                canvas.current.height = image.current.height;
                ctxRef.current.drawImage(image.current, 0, 0);
            };
            image.current.src = dataUrl;
        };

        reader.readAsDataURL(file);
    }, [file, setupCurve]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (imgRef.current && overlayRef.current) {
                overlayRef.current.style.width = `${imgRef.current.offsetWidth}px`;
                overlayRef.current.style.height = `${imgRef.current.offsetHeight}px`;
            }
        };

        const resizeObserver = new ResizeObserver(handleResize);

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => resizeObserver.disconnect();
    }, []);

    // Keyboard event listener
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Update gradient when samples or showSamplePoints changes
    useEffect(() => {
        getGradient();
    }, [samples, showSamplePoints, getGradient]);

    // Utility functions
    function samplePath(pathEl, numSamples) {
        const length = pathEl.getTotalLength();
        const samples = [];

        for (let i = 0; i < numSamples; i++) {
            const point = pathEl.getPointAtLength((i / (numSamples - 1)) * length);
            samples.push([point.x, point.y]);
        }
        return samples;
    }

    function mapRange(value, inMin, inMax, outMin, outMax) {
        return Math.floor(((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin);
    }

    function createLinearGradient(rgbArray, direction = 'to right') {
        const colorStops = rgbArray.map(rgb => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
        return `linear-gradient(${direction}, ${colorStops.join(', ')})`;
    }

    // Copy handlers
    const copyGradient = async () => {
        if (!gradient) return;
        await navigator.clipboard.writeText(gradient);
        setCopiedType('css');
        setTimeout(() => setCopiedType(null), 2000);
    };

    const copyRGBArray = async () => {
        if (!svgRef.current || points.current.length < 2) return;

        const pathEl = svgRef.current.select("path").node();
        const sampledPoints = samplePath(pathEl, samplesRef.current);
        const colors = sampledPoints.map(([x, y]) => getPixelColor(x, y));

        await navigator.clipboard.writeText(JSON.stringify(colors));
        setCopiedType('rgb');
        setTimeout(() => setCopiedType(null), 2000);
    };

    const clearPoints = () => {
        points.current = [];
        selected.current = null;
        update();
    };

    return (
        <div className="editor">
            {/* Toolbar */}
            <div className="editor-toolbar">
                <button className="toolbar-btn" onClick={onReset}>
                    <span>←</span>
                    <span>New Image</span>
                </button>
                <div className="toolbar-separator" />
                <button
                    className={`toolbar-btn ${showSamplePoints ? 'active' : ''}`}
                    onClick={() => setShowSamplePoints(!showSamplePoints)}
                >
                    <span>●</span>
                    <span>Sample Points</span>
                </button>
                <button className="toolbar-btn" onClick={clearPoints}>
                    <span>✕</span>
                    <span>Clear Path</span>
                </button>
            </div>

            {/* Canvas Area */}
            <div className="editor-canvas" ref={containerRef}>
                <div className="editor-img-container">
                    <img className="editor-img" ref={imgRef} alt="Source" />
                    <div className="editor-overlay" ref={overlayRef} />
                </div>
            </div>

            {/* Controls */}
            <div className="editor-controls">
                <div className="control-group gradient-preview">
                    <label className="control-label">Gradient Preview</label>
                    <div className="gradient-bar">
                        <div
                            className="gradient-bar-inner"
                            style={{ background: gradient || 'transparent' }}
                        />
                    </div>
                </div>

                <div className="control-group">
                    <label className="control-label">Samples</label>
                    <div className="samples-control">
                        <input
                            type="range"
                            className="samples-slider"
                            min="2"
                            max="100"
                            value={samples}
                            onChange={(e) => setSamples(Number(e.target.value))}
                        />
                        <input
                            type="number"
                            className="samples-value"
                            min="2"
                            max="100"
                            value={samples}
                            onChange={(e) => setSamples(Math.max(2, Math.min(100, Number(e.target.value))))}
                        />
                    </div>
                </div>

                <div className="control-group">
                    <label className="control-label">Export</label>
                    <div className="export-buttons">
                        <button
                            className={`export-btn ${copiedType === 'css' ? 'copied' : ''}`}
                            onClick={copyGradient}
                            disabled={!gradient}
                        >
                            <span className="export-btn-icon">
                                {copiedType === 'css' ? '✓' : '📋'}
                            </span>
                            <span>{copiedType === 'css' ? 'Copied!' : 'CSS Gradient'}</span>
                        </button>
                        <button
                            className={`export-btn ${copiedType === 'rgb' ? 'copied' : ''}`}
                            onClick={copyRGBArray}
                            disabled={points.current.length < 2}
                        >
                            <span className="export-btn-icon">
                                {copiedType === 'rgb' ? '✓' : '📋'}
                            </span>
                            <span>{copiedType === 'rgb' ? 'Copied!' : 'RGB Array'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Help */}
            <div className="editor-help">
                <span className="help-item">
                    <span className="help-key">Click</span> to add point
                </span>
                <span className="help-item">
                    <span className="help-key">Drag</span> to move
                </span>
                <span className="help-item">
                    <span className="help-key">Delete</span> to remove
                </span>
            </div>
        </div>
    );
}