import React, { useState, useRef, useCallback } from 'react';
import { saveAs } from 'file-saver';
import MapCanvas from './MapCanvas';
import MapControlsPanel, { MapSettings } from './MapControlsPanel';

export default function WorldMap() {
    const [settings, setSettings] = useState<MapSettings>({
        projection: 'geoRobinson',
        oceanColor: '#E8E4DE',
        landColor: '#FFFFFF',
        highlightColor: '#0D6B58',
        labelColor: '#1A1A17',
        borderColor: '#D4D0C8',
        fontFamily: "'Instrument Serif', serif",
        showLabels: true,
        borderWidth: 0.5,
    });

    const [highlightedCountries, setHighlightedCountries] = useState<string[]>([
        'USA', 'Belgium', 'UK', 'Italy', 'Switzerland', 'Denmark', 'China', 'Norway',
        'Canada', 'Australia', 'Luxemburg', 'Morocco', 'Peru', 'Japan', 'Turkey'
    ]);

    const svgRef = useRef<SVGSVGElement>(null);

    const handleSettingsChange = (newSettings: Partial<MapSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    const handleToggleCountry = (countryName: string) => {
        setHighlightedCountries(prev =>
            prev.includes(countryName)
                ? prev.filter(c => c !== countryName)
                : [...prev, countryName]
        );
    };

    const getCleanSVGSource = useCallback(() => {
        if (!svgRef.current) return null;

        // Clone the SVG to avoid modifying the live DOM
        const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;

        // Find the map content group and remove the zoom/pan transform
        const mapContent = svgClone.querySelector('.map-content');
        if (mapContent) {
            mapContent.removeAttribute('transform');
        }

        // Add a background rectangle to capture the ocean color
        // Use the viewBox if available, otherwise fallback to width/height
        const viewBox = svgClone.getAttribute('viewBox');
        let width = '1000';
        let height = '600';
        if (viewBox) {
            const parts = viewBox.split(/\s+/);
            if (parts.length === 4) {
                width = parts[2];
                height = parts[3];
            }
        } else {
            width = svgClone.getAttribute('width') || '100%';
            height = svgClone.getAttribute('height') || '100%';
        }

        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('width', width);
        bgRect.setAttribute('height', height);
        bgRect.setAttribute('fill', settings.oceanColor);

        // Prepend to make it the bottom layer
        svgClone.insertBefore(bgRect, svgClone.firstChild);

        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svgClone);

        if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
            source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
        }

        return '<?xml version="1.0" standalone="no"?>\r\n' + source;
    }, []);

    const exportSVG = useCallback(() => {
        const source = getCleanSVGSource();
        if (!source) return;

        const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
        saveAs(url, 'cartograph_map.svg');
    }, [getCleanSVGSource]);

    const exportPNG = useCallback(() => {
        const source = getCleanSVGSource();
        if (!source || !svgRef.current) return;

        const canvas = document.createElement("canvas");
        const scale = 3; // 3x resolution for high-quality export

        const svgSize = svgRef.current.getBoundingClientRect();
        canvas.width = svgSize.width * scale;
        canvas.height = svgSize.height * scale;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.fillStyle = settings.oceanColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const img = new Image();
        const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            canvas.toBlob((blob) => {
                if (blob) saveAs(blob, 'cartograph_map_3x.png');
            }, "image/png", 1.0);
        };

        img.src = url;
    }, [getCleanSVGSource, settings.oceanColor]);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            overflow: 'hidden',
            background: '#FAFAF8',
            zIndex: 0,
        }}>
            <MapCanvas
                settings={settings}
                highlightedCountries={highlightedCountries}
                onToggleCountry={handleToggleCountry}
                svgRef={svgRef}
            />
            <MapControlsPanel
                settings={settings}
                onSettingsChange={handleSettingsChange}
                highlightedCountries={highlightedCountries}
                setHighlightedCountries={setHighlightedCountries}
                onExportSVG={exportSVG}
                onExportPNG={exportPNG}
            />
        </div>
    );
}
