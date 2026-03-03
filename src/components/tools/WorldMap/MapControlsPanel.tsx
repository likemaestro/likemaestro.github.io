import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, ChevronDown, X, Plus, Globe, Type, Palette, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { HexColorPicker } from 'react-colorful';

export type ProjectionType = 'geoMercator' | 'geoRobinson' | 'geoWinkel3' | 'geoPatterson' | 'geoEquirectangular';

export interface MapSettings {
    projection: ProjectionType;
    oceanColor: string;
    landColor: string;
    highlightColor: string;
    labelColor: string;
    borderColor: string;
    fontFamily: string;
    showLabels: boolean;
    borderWidth: number;
}

interface MapControlsPanelProps {
    settings: MapSettings;
    onSettingsChange: (newSettings: Partial<MapSettings>) => void;
    highlightedCountries: string[];
    setHighlightedCountries: (countries: string[]) => void;
    onExportSVG: () => void;
    onExportPNG: () => void;
}

const PROJECTIONS = [
    { value: 'geoRobinson', label: 'Robinson' },
    { value: 'geoMercator', label: 'Mercator' },
    { value: 'geoWinkel3', label: 'Winkel Tripel' },
    { value: 'geoPatterson', label: 'Patterson' },
    { value: 'geoEquirectangular', label: 'Equirectangular' },
];

const FONTS = [
    { value: "'Instrument Serif', serif", label: "Instrument Serif" },
    { value: "'Playfair Display', serif", label: "Playfair Display" },
    { value: "'DM Sans', sans-serif", label: "DM Sans" },
    { value: "'Manrope', sans-serif", label: "Manrope" },
];

const COLOR_FIELDS = [
    { key: 'oceanColor', label: 'Ocean' },
    { key: 'landColor', label: 'Land' },
    { key: 'highlightColor', label: 'Highlight' },
    { key: 'labelColor', label: 'Labels' },
    { key: 'borderColor', label: 'Borders' },
];

// ── Color Picker Popover ──

const ColorSwatch: React.FC<{
    color: string;
    onChange: (color: string) => void;
    label: string;
}> = ({ color, onChange, label }) => {
    const [open, setOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', position: 'relative' }}>
            <button
                onClick={() => setOpen(!open)}
                style={{
                    width: 28, height: 28,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: color,
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
                    transition: 'box-shadow 0.15s',
                    outline: 'none',
                }}
            />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', flex: 1 }}>{label}</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.02em', fontFamily: 'monospace' }}>
                {color.toUpperCase()}
            </span>

            <AnimatePresence>
                {open && (
                    <motion.div
                        ref={popoverRef}
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        transition={{ duration: 0.12 }}
                        style={{
                            position: 'absolute',
                            right: 0,
                            top: 40,
                            zIndex: 100,
                            background: '#fff',
                            borderRadius: 14,
                            padding: 14,
                            boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
                            border: '1px solid var(--border)',
                        }}
                    >
                        <HexColorPicker color={color} onChange={onChange} style={{ width: 200, height: 160 }} />
                        <input
                            type="text"
                            value={color}
                            onChange={e => {
                                const val = e.target.value;
                                if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) onChange(val);
                            }}
                            style={{
                                width: '100%',
                                marginTop: 10,
                                padding: '7px 10px',
                                fontSize: 12,
                                fontFamily: 'monospace',
                                fontWeight: 500,
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                outline: 'none',
                                textAlign: 'center',
                                color: 'var(--text-primary)',
                                background: 'var(--bg)',
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ── Reusable sub-components ──

const SectionLabel: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 12 }}>
        <span style={{ color: 'var(--text-muted)', display: 'flex' }}>{icon}</span>
        <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase' as const, color: 'var(--text-muted)',
            fontFamily: "'DM Sans', sans-serif",
        }}>{children}</span>
    </div>
);

const Divider = () => <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />;

// ── Main Component ──

const MapControlsPanel: React.FC<MapControlsPanelProps> = ({
    settings, onSettingsChange,
    highlightedCountries, setHighlightedCountries,
    onExportSVG, onExportPNG
}) => {
    const [newCountry, setNewCountry] = useState('');
    const [collapsed, setCollapsed] = useState(false);

    const handleAddCountry = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newCountry.trim();
        if (trimmed && !highlightedCountries.includes(trimmed)) {
            setHighlightedCountries([...highlightedCountries, trimmed]);
            setNewCountry('');
        }
    };

    const handleRemoveCountry = (country: string) => {
        setHighlightedCountries(highlightedCountries.filter(c => c !== country));
    };

    const panelVars: React.CSSProperties = {
        '--bg': '#FAFAF8',
        '--surface': '#FFFFFF',
        '--border': '#E8E4DC',
        '--text-primary': '#1A1A17',
        '--text-secondary': '#6B6860',
        '--text-muted': '#A8A49C',
        '--accent': '#0D6B58',
        '--accent-light': '#E6F2EF',
        fontFamily: "'DM Sans', sans-serif",
    } as React.CSSProperties;

    if (collapsed) {
        return (
            <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setCollapsed(false)}
                style={{
                    position: 'absolute', top: 20, right: 20,
                    width: 48, height: 48, borderRadius: 12,
                    background: '#fff', border: '1px solid #E8E4DC',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', zIndex: 50,
                }}
            >
                <Globe style={{ width: 20, height: 20, color: '#6B6860' }} />
            </motion.button>
        );
    }

    return (
        <motion.aside
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 30, stiffness: 200 }}
            style={{
                ...panelVars,
                position: 'absolute', top: 16, right: 16, bottom: 16,
                width: 340, background: 'var(--surface)', borderRadius: 16,
                border: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
                overflow: 'hidden', zIndex: 50,
                boxShadow: '0 8px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
            }}
        >
            {/* Header */}
            <div style={{
                padding: '20px 24px 16px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', borderBottom: '1px solid var(--border)',
            }}>
                <div>
                    <h2 style={{
                        fontSize: 22, fontWeight: 400, color: 'var(--text-primary)',
                        fontFamily: "'Instrument Serif', serif", lineHeight: 1.2, margin: 0,
                    }}>Cartograph</h2>
                    <p style={{
                        fontSize: 11, fontWeight: 500, color: 'var(--text-muted)',
                        letterSpacing: '0.06em', textTransform: 'uppercase' as const, margin: '4px 0 0',
                    }}>Map Studio</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={onExportPNG} title="Export PNG" style={{
                        width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)',
                        background: 'var(--surface)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                        <Download style={{ width: 15, height: 15, color: 'var(--text-secondary)' }} />
                    </button>
                    <button onClick={() => setCollapsed(true)} title="Collapse" style={{
                        width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)',
                        background: 'var(--surface)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                        <X style={{ width: 15, height: 15, color: 'var(--text-secondary)' }} />
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

                {/* Countries */}
                <SectionLabel icon={<Tag style={{ width: 14, height: 14 }} />}>Countries</SectionLabel>
                <form onSubmit={handleAddCountry} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <input
                        type="text" value={newCountry}
                        onChange={e => setNewCountry(e.target.value)}
                        placeholder="Add country…"
                        style={{
                            flex: 1, padding: '9px 14px', fontSize: 13,
                            fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                            border: '1px solid var(--border)', borderRadius: 10,
                            outline: 'none', background: 'var(--bg)', color: 'var(--text-primary)',
                            transition: 'border-color 0.15s',
                        }}
                        onFocus={e => { e.target.style.borderColor = '#0D6B58'; }}
                        onBlur={e => { e.target.style.borderColor = '#E8E4DC'; }}
                    />
                    <button type="submit" style={{
                        width: 38, height: 38, borderRadius: 10, border: 'none',
                        background: 'var(--accent)', color: '#fff', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                    }}>
                        <Plus style={{ width: 16, height: 16 }} />
                    </button>
                </form>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                    <AnimatePresence>
                        {highlightedCountries.map(c => (
                            <motion.span
                                key={c}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '5px 10px 5px 12px', background: 'var(--accent-light)',
                                    color: 'var(--accent)', borderRadius: 8, fontSize: 12,
                                    fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: 'default',
                                }}
                            >
                                {c}
                                <button onClick={() => handleRemoveCountry(c)} style={{
                                    background: 'none', border: 'none', color: 'var(--accent)',
                                    cursor: 'pointer', padding: 0, lineHeight: 1, opacity: 0.6,
                                    display: 'flex',
                                }}>
                                    <X style={{ width: 12, height: 12 }} />
                                </button>
                            </motion.span>
                        ))}
                    </AnimatePresence>
                    {highlightedCountries.length === 0 && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Click the map or type above
                        </span>
                    )}
                </div>

                <Divider />

                {/* Projection */}
                <SectionLabel icon={<Globe style={{ width: 14, height: 14 }} />}>Projection</SectionLabel>
                <div style={{ position: 'relative' }}>
                    <select
                        value={settings.projection}
                        onChange={e => onSettingsChange({ projection: e.target.value as ProjectionType })}
                        style={{
                            width: '100%', appearance: 'none', padding: '9px 36px 9px 14px',
                            fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                            border: '1px solid var(--border)', borderRadius: 10,
                            background: 'var(--bg)', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none',
                        }}
                    >
                        {PROJECTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    <ChevronDown style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        width: 14, height: 14, color: 'var(--text-muted)', pointerEvents: 'none',
                    }} />
                </div>

                <Divider />

                {/* Typography */}
                <SectionLabel icon={<Type style={{ width: 14, height: 14 }} />}>Typography</SectionLabel>
                <div style={{ position: 'relative' }}>
                    <select
                        value={settings.fontFamily}
                        onChange={e => onSettingsChange({ fontFamily: e.target.value })}
                        style={{
                            width: '100%', appearance: 'none', padding: '9px 36px 9px 14px',
                            fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                            border: '1px solid var(--border)', borderRadius: 10,
                            background: 'var(--bg)', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none',
                        }}
                    >
                        {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                    <ChevronDown style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        width: 14, height: 14, color: 'var(--text-muted)', pointerEvents: 'none',
                    }} />
                </div>

                {/* Show Labels toggle */}
                <div
                    onClick={() => onSettingsChange({ showLabels: !settings.showLabels })}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginTop: 14, cursor: 'pointer', userSelect: 'none',
                    }}
                >
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Show labels</span>
                    <div style={{
                        width: 40, height: 22, borderRadius: 11,
                        background: settings.showLabels ? 'var(--accent)' : '#D4D0C8',
                        transition: 'background 0.2s', position: 'relative',
                    }}>
                        <div style={{
                            width: 16, height: 16, borderRadius: '50%', background: '#fff',
                            position: 'absolute', top: 3,
                            left: settings.showLabels ? 21 : 3,
                            transition: 'left 0.2s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                        }} />
                    </div>
                </div>

                <Divider />

                {/* Colors */}
                <SectionLabel icon={<Palette style={{ width: 14, height: 14 }} />}>Colors</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {COLOR_FIELDS.map(({ key, label }) => (
                        <ColorSwatch
                            key={key}
                            color={settings[key as keyof MapSettings] as string}
                            onChange={val => onSettingsChange({ [key]: val })}
                            label={label}
                        />
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div style={{
                padding: '14px 24px', borderTop: '1px solid var(--border)',
                display: 'flex', gap: 8,
            }}>
                <button onClick={onExportPNG} style={{
                    flex: 1, padding: '10px 0', background: 'var(--text-primary)',
                    color: '#fff', border: 'none', borderRadius: 10, fontSize: 12,
                    fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                    <Download style={{ width: 13, height: 13 }} /> PNG
                </button>
                <button onClick={onExportSVG} style={{
                    flex: 1, padding: '10px 0', background: 'transparent',
                    color: 'var(--text-secondary)', border: '1px solid var(--border)',
                    borderRadius: 10, fontSize: 12, fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                    <Download style={{ width: 13, height: 13 }} /> SVG
                </button>
            </div>
        </motion.aside>
    );
};

export default MapControlsPanel;
