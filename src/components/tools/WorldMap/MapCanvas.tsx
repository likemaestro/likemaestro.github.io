import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import { geoPath, geoGraticule10 } from 'd3-geo';
import * as geoProjections from 'd3-geo-projection';
import * as topojson from 'topojson-client';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { MapSettings } from './MapControlsPanel';
import { matchCountryFeature, getRepresentativePoint, smartLabelPositions, getDisplayName } from './mapLabelUtils';

interface MapCanvasProps {
    settings: MapSettings;
    highlightedCountries: string[];
    onToggleCountry: (countryName: string) => void;
    svgRef: React.RefObject<SVGSVGElement | null>;
}

// ── Contrast & Glassmorphism helpers ──

function getContrastColor(hexColor: string): string {
    const hex = hexColor.replace('#', '');
    if (hex.length < 6) return '#1A1A17';
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    return luminance > 0.4 ? '#1A1A17' : '#FFFFFF';
}

function getBadgeBg(hexColor: string): string {
    const hex = hexColor.replace('#', '');
    if (hex.length < 6) return 'rgba(255,255,255,0.92)';
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    // Stronger glassmorphism: high opacity, subtle blur, visible border
    return brightness > 128 ? 'rgba(255,255,255,0.92)' : 'rgba(15,15,15,0.88)';
}

// ── Draggable Label Badge ──

interface LabelBadgeProps {
    pin: { id: string; name: string; x: number; y: number };
    dx: number;
    dy: number;
    ha: string;
    isPinned: boolean;
    textColor: string;
    badgeBg: string;
    fontFamily: string;
    onDragEnd: (name: string, dx: number, dy: number) => void;
    onReset: (name: string) => void;
}

function LabelBadge({ pin, dx, dy, ha, isPinned, textColor, badgeBg, fontFamily, onDragEnd, onReset }: LabelBadgeProps) {
    const [dragging, setDragging] = useState(false);
    const [currentDx, setCurrentDx] = useState(dx);
    const [currentDy, setCurrentDy] = useState(dy);
    const [hovered, setHovered] = useState(false);
    const dragStart = useRef<{ mx: number; my: number; dx: number; dy: number } | null>(null);

    // Synchronize with auto-placement if not manually pinned
    useEffect(() => {
        if (!isPinned) {
            setCurrentDx(dx);
            setCurrentDy(dy);
        }
    }, [dx, dy, isPinned]);

    const displayName = getDisplayName(pin.name);
    const charWidth = 5.8;
    const badgeW = displayName.length * charWidth + 12;
    const badgeH = 16; // Compact height

    const labelX = pin.x + currentDx;
    const labelY = pin.y + currentDy;
    const badgeX = ha === 'start' ? labelX - 3 : labelX - badgeW + 3;
    const badgeY = labelY - badgeH / 2;

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        e.stopPropagation();
        e.preventDefault();
        (e.target as Element).setPointerCapture(e.pointerId);
        setDragging(true);
        dragStart.current = { mx: e.clientX, my: e.clientY, dx: currentDx, dy: currentDy };
    }, [currentDx, currentDy]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!dragging || !dragStart.current) return;
        e.preventDefault();
        const svg = (e.target as Element).closest('svg');
        if (!svg) return;
        const ctm = (svg as SVGSVGElement).getScreenCTM();
        if (!ctm) return;
        const scale = ctm.a;
        const mdx = (e.clientX - dragStart.current.mx) / scale;
        const mdy = (e.clientY - dragStart.current.my) / scale;
        setCurrentDx(dragStart.current.dx + mdx);
        setCurrentDy(dragStart.current.dy + mdy);
    }, [dragging]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (!dragging) return;
        (e.target as Element).releasePointerCapture(e.pointerId);
        setDragging(false);
        onDragEnd(pin.name, currentDx, currentDy);
    }, [dragging, currentDx, currentDy, pin.name, onDragEnd]);

    return (
        <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => { if (!dragging) setHovered(false); }}
        >
            <line
                x1={pin.x} y1={pin.y}
                x2={labelX} y2={labelY}
                stroke={textColor} strokeWidth={0.8} opacity={0.25}
            />
            <circle cx={pin.x} cy={pin.y} r={2.2} fill={textColor} opacity={0.5} />

            <g
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                style={{ cursor: dragging ? 'grabbing' : 'grab' }}
            >
                {/* Real Glassmorphism Badge via foreignObject - compact and prominent */}
                <foreignObject x={badgeX - 1} y={badgeY - 1} width={badgeW + 2} height={badgeH + 2}>
                    <div style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: badgeBg,
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        borderRadius: '5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `0.7px solid ${textColor}55`,
                        boxShadow: `0 2px 8px ${textColor}15, 0 0 20px ${textColor}08`,
                        boxSizing: 'border-box',
                        overflow: 'hidden'
                    }}>
                        <span style={{
                            color: textColor,
                            fontSize: '8.5px',
                            fontWeight: 650,
                            fontFamily,
                            letterSpacing: '0.04em',
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                            textAlign: 'center',
                            lineHeight: 1
                        }}>
                            {displayName}
                        </span>
                    </div>
                </foreignObject>
            </g>

            {isPinned && hovered && (
                <g
                    onClick={(e) => { e.stopPropagation(); onReset(pin.name); }}
                    style={{ cursor: 'pointer' }}
                    transform={`translate(${badgeX + badgeW - 2}, ${badgeY - 2})`}
                >
                    <circle r={7.5} fill={badgeBg} stroke={textColor} strokeWidth={0.4} strokeOpacity={0.3} style={{ backdropFilter: 'blur(6px)' }} />
                    <foreignObject x={-4} y={-4} width={8} height={8}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: textColor, opacity: 0.8 }}>
                            <RotateCcw size={8} strokeWidth={2.5} />
                        </div>
                    </foreignObject>
                </g>
            )}
        </motion.g>
    );
}

// ── Main Component ──

export default function MapCanvas({ settings, highlightedCountries, onToggleCountry, svgRef }: MapCanvasProps) {
    const [worldData, setWorldData] = useState<GeoJSON.FeatureCollection | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 1600, height: 900 });
    const [labelOverrides, setLabelOverrides] = useState<Record<string, { dx: number; dy: number }>>({});

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const observer = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            if (width > 0 && height > 0) setDimensions({ width, height });
        });
        observer.observe(container);
        const rect = container.getBoundingClientRect();
        if (rect.width > 0) setDimensions({ width: rect.width, height: rect.height });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
            .then(res => res.json())
            .then(data => {
                const countries = topojson.feature(data, data.objects.countries) as unknown as GeoJSON.FeatureCollection;
                setWorldData(countries);
            })
            .catch(err => console.error("Failed loading map data", err));
    }, []);

    const projection = useMemo(() => {
        const projFunc = (geoProjections as any)[settings.projection] || geoProjections.geoRobinson;
        const proj = projFunc();
        if (worldData) {
            proj.fitSize([dimensions.width, dimensions.height], worldData);
        } else {
            proj.scale(175).translate([dimensions.width / 2, dimensions.height / 2]);
        }
        return proj;
    }, [settings.projection, worldData, dimensions]);

    const pathGenerator = useMemo(() => geoPath().projection(projection), [projection]);

    useEffect(() => {
        const svg = select(svgRef.current);
        const g = svg.select('.map-content');
        const zoomBehavior = zoom<SVGSVGElement, unknown>()
            .scaleExtent([1, 12])
            .on('zoom', (event) => { g.attr('transform', event.transform); });
        svg.call(zoomBehavior);
        svg.transition().duration(750)
            .call(zoomBehavior.transform, zoomIdentity);
    }, [projection, svgRef]);

    const projectedPins = useMemo(() => {
        if (!worldData) return [];
        const pins: { id: string; name: string; x: number; y: number }[] = [];
        highlightedCountries.forEach(hc => {
            const match = matchCountryFeature(worldData.features as any, hc);
            if (match) {
                const centroid = getRepresentativePoint(match);
                const coords = projection(centroid);
                if (coords) {
                    pins.push({
                        id: `country-${match.properties?.name || hc}`,
                        name: match.properties?.name || hc,
                        x: coords[0], y: coords[1],
                    });
                }
            }
        });
        return pins;
    }, [worldData, projection, highlightedCountries]);

    const labelPlacements = useMemo(() => {
        if (projectedPins.length === 0) return null;
        return smartLabelPositions(projectedPins);
    }, [projectedPins]);

    const textOnOcean = useMemo(() => getContrastColor(settings.oceanColor), [settings.oceanColor]);
    const badgeBgColor = useMemo(() => getBadgeBg(settings.oceanColor), [settings.oceanColor]);
    const graticuleColor = useMemo(() => {
        const hex = settings.oceanColor.replace('#', '');
        if (hex.length < 6) return 'rgba(0,0,0,0.04)';
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128 ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)';
    }, [settings.oceanColor]);

    const handleLabelDragEnd = useCallback((name: string, dx: number, dy: number) => {
        setLabelOverrides(prev => ({ ...prev, [name]: { dx, dy } }));
    }, []);

    const handleLabelReset = useCallback((name: string) => {
        setLabelOverrides(prev => {
            const next = { ...prev };
            delete next[name];
            return next;
        });
    }, []);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', cursor: 'grab' }}>
            <svg
                ref={svgRef}
                viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                width={dimensions.width}
                height={dimensions.height}
                style={{ width: '100%', height: '100%', backgroundColor: settings.oceanColor, display: 'block' }}
            >
                <g className="map-content">
                    {/* Graticule Grid */}
                    <path
                        d={pathGenerator(geoGraticule10()) || ''}
                        fill="none" stroke={graticuleColor} strokeWidth="0.5"
                    />

                    {/* Country Polygons */}
                    {worldData && worldData.features.map((feature: any) => {
                        const isHighlight = highlightedCountries.some(hc =>
                            matchCountryFeature([feature], hc)
                        );
                        return (
                            <motion.path
                                key={feature.id}
                                d={pathGenerator(feature) || ''}
                                initial={false}
                                animate={{
                                    fill: isHighlight ? settings.highlightColor : settings.landColor,
                                    stroke: settings.borderColor,
                                    strokeWidth: settings.borderWidth,
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (feature.properties?.name) onToggleCountry(feature.properties.name);
                                }}
                                transition={{ duration: 0.08 }}
                                className="outline-none cursor-pointer"
                                style={{ vectorEffect: 'non-scaling-stroke' }}
                            />
                        );
                    })}

                    {/* Label Badge Layer */}
                    {settings.showLabels && labelPlacements && (
                        <g className="labels-layer">
                            {projectedPins.map(pin => {
                                const autoPlacement = labelPlacements[pin.name];
                                if (!autoPlacement) return null;

                                const override = labelOverrides[pin.name];
                                const dx = override ? override.dx : autoPlacement.dx;
                                const dy = override ? override.dy : autoPlacement.dy;
                                const ha = dx >= 0 ? 'start' : 'end';

                                return (
                                    <LabelBadge
                                        key={`label-${pin.id}`}
                                        pin={pin}
                                        dx={dx}
                                        dy={dy}
                                        ha={ha}
                                        isPinned={!!override}
                                        textColor={textOnOcean}
                                        badgeBg={badgeBgColor}
                                        fontFamily={settings.fontFamily}
                                        onDragEnd={handleLabelDragEnd}
                                        onReset={handleLabelReset}
                                    />
                                );
                            })}
                        </g>
                    )}
                </g>
            </svg>
        </div>
    );
}
