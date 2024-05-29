import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import './Editor.css';


export default function Editor(props) {
    const myRef = useRef(null);
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const overlayRef = useRef(null);

    const image = useRef(new Image());
    const canvas = document.createElement('canvas');


    const ctxRef = useRef(canvas.getContext('2d'));


    const [gradient, setGradient] = useState(null);
    const [samples, setSamples] = useState(50);

    const samplesRef = useRef(samples);

    useEffect(() => {
        samplesRef.current = samples;
    }, [samples]);

    const points = useRef(null);
    const selected = useRef(null);

    const line = d3.line().curve(d3.curveCatmullRom);

    function update() {
        svgRef.current.select("path").attr("d", line);
        const circle = svgRef.current.selectAll("g").data(points.current, d => d);

        circle.enter().append("g")
            .call(g => g.append("circle")
                .attr("r", 30)
                .attr("fill", "none"))
            .call(g => g.append("circle")
                .attr("r", 0)
                .attr("stroke", "black")
                .attr("stroke-width", 1.5)
                .transition()
                .duration(750)
                .ease(d3.easeElastic)
                .attr("r", 5))
            .merge(circle)
            .attr("transform", d => `translate(${d})`)
            .select("circle:last-child")
            .attr("fill", d => d === selected.current ? "lightblue" : "black");

        circle.exit().remove();

        getGradient();
    }

    function getGradient() {
        if (!overlayRef.current) return;
        if (points.current.length < 2) return;
        const p = samplePath(svgRef.current.select("path").node(), samplesRef.current);

        const samplePoints = svgRef.current.selectAll(".sample-point")
            .data(p, (d, i) => i);

        samplePoints.enter().append("circle")
            .attr('pointer-events', 'none')
            .attr("class", "sample-point")
            .attr("r", 3)
            .attr("fill", "red")
            .merge(samplePoints)
            .attr("cx", d => d[0])
            .attr("cy", d => d[1]);

        samplePoints.exit().remove();

        const pxMap = p.map((v, i) => {
            const x = mapRange(v[0], 0, overlayRef.current.offsetWidth, 0, image.current.width);
            const y = mapRange(v[1], 0, overlayRef.current.offsetHeight, 0, image.current.height);

            const pixelData = ctxRef.current.getImageData(x, y, 1, 1).data;
            const r = pixelData[0];
            const g = pixelData[1];
            const b = pixelData[2];
            return [r, g, b];
        });

        setGradient(createLinearGradient(pxMap));
    }

    function dragstarted({ subject }) {
        selected.current = subject;
        update();
    }

    function dragged(event) {
        event.subject[0] = Math.max(0, Math.min(overlayRef.current.clientWidth, event.x));
        event.subject[1] = Math.max(0, Math.min(overlayRef.current.clientHeight, event.y));
        update();
    }

    function keydown(event) {
        if (!selected.current) return;

        switch (event.key) {
            case "Backspace":
            case "Delete": {
                event.preventDefault();
                const i = points.current.indexOf(selected);
                points.current.splice(i, 1);
                selected.current = points.current.length ? points[i > 0 ? i - 1 : 0] : null;
                update();
                break;
            }
        }
    }

    function dragsubject(event) {
        let subject = event.sourceEvent.target.__data__;
        if (!subject) {
            points.current.push(subject = [event.x, event.y]);
            update();
        }
        return subject;
    }

    function setupCurve() {
        if (svgRef.current) return;
        points.current = d3.range(1, 5).map(i => [i * overlayRef.current.clientWidth / 7, 50 + Math.random() * (500 - 100)])
        selected.current = points.current[0];
        svgRef.current = d3.create('svg').attr('tabindex', 1)
            .style('position', 'absolute')
            .style('width', '100%')
            .style('height', '100%')
            .attr('pointer-events', 'all')
            .call(d3.drag()
                .subject(dragsubject)
                .on("start", dragstarted)
                .on("drag", dragged));

        svgRef.current.append("path")
            .datum(points.current)
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-width", 1.5)
            .call(update);

        d3.select(window)
            .on("keydown", keydown);

        overlayRef.current.append(svgRef.current.node());
    }

    
    useEffect(() => {
        const reader = new FileReader();
        reader.onload = (e) => {
            myRef.current.src = e.target.result;
            image.current.onload = () => {
                canvas.width = image.current.width;
                canvas.height = image.current.height;
                ctxRef.current.drawImage(image.current, 0, 0);
            };
            image.current.src = e.target.result;
            setOverlaySize();
            setupCurve();
        };

        reader.readAsDataURL(props.file);
    }, []);




    useEffect(() => {
        const resizeObserver = new ResizeObserver(entries => {
            setOverlaySize();
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    function setOverlaySize() {
        const displayedSize = resizeToFit(containerRef.current);
        overlayRef.current.style.width = `${displayedSize[0]}px`;
        overlayRef.current.style.height = `${displayedSize[1]}px`;
    }

    function samplePath(path, numSamples) {
        var length = path.getTotalLength();
        var samples = [];

        for (var i = 0; i < numSamples; i++) {
            var point = path.getPointAtLength((i / (numSamples - 1)) * length);
            samples.push([point.x, point.y]);
        }
        return samples;
    }

    function mapRange(value, inMin, inMax, outMin, outMax) {
        return Math.floor(((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin);
    }

    function createLinearGradient(rgbArray, direction = 'to right') {
        const colorStops = rgbArray.map(rgb => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
        const gradientString = `linear-gradient(${direction}, ${colorStops.join(', ')})`;
        return gradientString;
    }

    function resizeToFit(el) {
        const containerWidth = el.clientWidth;
        const containerHeight = el.clientHeight;

        const containerAspectRatio = containerWidth / containerHeight;
        const imageAspectRatio = image.current.width / image.current.height;

        let displayedWidth, displayedHeight;

        if (containerAspectRatio > imageAspectRatio) {
            displayedHeight = containerHeight;
            displayedWidth = image.current.width * (containerHeight / image.current.height);
        } else {
            displayedWidth = containerWidth;
            displayedHeight = image.current.height * (containerWidth / image.current.width);
        }
        return [displayedWidth, displayedHeight];
    }

    function handleSamplesChange(event) {
        setSamples(event.target.value);
        samplesRef.current = event.target.value;
        update();
    }

    function copyGradient() {
        navigator.clipboard.writeText(gradient);
    }

    function copyRGBArray() {
        const pxMap = samplePath(svgRef.current.select("path").node(), samplesRef.current).map((v, i) => {
            const x = mapRange(v[0], 0, overlayRef.current.offsetWidth, 0, image.current.width);
            const y = mapRange(v[1], 0, overlayRef.current.offsetHeight, 0, image.current.height);

            const pixelData = ctxRef.current.getImageData(x, y, 1, 1).data;
            const r = pixelData[0];
            const g = pixelData[1];
            const b = pixelData[2];
            return [r, g, b];
        });

        navigator.clipboard.writeText(JSON.stringify(pxMap));
    }

    return (
        <div className='editor'>
            <div className='imgContainer' ref={containerRef}>
                <img className='imgPreview' ref={myRef}>

                </img>
                <div className='overlay' ref={overlayRef}></div>
            </div>
            <div className='barContainer'>
                <fieldset className='gradient'>
                    <legend>Gradient</legend>
                    <div style={{ background: gradient, height: "100%" }}></div>
                </fieldset>
                <fieldset>
                    <legend>Controls</legend>
                    <div className='controls'>
                        <label># of samples:</label>
                        <input type="number" min="2" value={samples} onChange={handleSamplesChange} />
                        <button onClick={copyGradient}>Copy as CSS linear-gradient</button>
                        <button onClick={copyRGBArray}>Copy as array of RGB values</button>
                    </div>
                </fieldset>
            </div>
        </div>);
}