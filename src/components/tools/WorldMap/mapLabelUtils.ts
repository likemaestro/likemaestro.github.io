import { geoCentroid } from 'd3-geo';
import { forceSimulation, forceX, forceY, forceCollide } from 'd3-force';

// ── Types ──

export interface MapPin {
    id: string;
    name: string;
    lat: number;
    lng: number;
}

export interface LabelPlacement {
    x: number;
    y: number;
    dx: number;
    dy: number;
    ha: string;
}

// ── Country name normalization ──

const COUNTRY_NAME_MAP: Record<string, string[]> = {
    'USA': ['United States of America', 'United States', 'US'],
    'UK': ['United Kingdom', 'Great Britain', 'England'],
    'Russia': ['Russian Federation'],
    'South Korea': ['Korea, Republic of', 'Republic of Korea'],
    'North Korea': ["Korea, Democratic People's Republic of", "Dem. People's Rep. Korea"],
    'Czechia': ['Czech Republic'],
    'UAE': ['United Arab Emirates'],
    'Luxemburg': ['Luxembourg'],
    'Ivory Coast': ["Côte d'Ivoire"],
    'Congo': ['Democratic Republic of the Congo', 'Republic of the Congo'],
    'Tanzania': ['United Republic of Tanzania'],
    'Bolivia': ['Plurinational State of Bolivia'],
    'Venezuela': ['Bolivarian Republic of Venezuela'],
    'Iran': ['Islamic Republic of Iran'],
    'Syria': ['Syrian Arab Republic'],
    'Laos': ["Lao People's Democratic Republic"],
    'Vietnam': ['Viet Nam'],
    'Myanmar': ['Burma'],
    'Macedonia': ['North Macedonia', 'Republic of North Macedonia'],
    'C. African Rep.': ['Central African Republic', 'Central African Rep.'],
    'Bosnia & Herz.': ['Bosnia and Herzegovina', 'Bosnia and Herz.'],
    'Dominican Rep.': ['Dominican Republic'],
};

const DISPLAY_NAME_MAP: Record<string, string> = {};
Object.entries(COUNTRY_NAME_MAP).forEach(([short, variants]) => {
    variants.forEach(v => { DISPLAY_NAME_MAP[v.toLowerCase()] = short; });
    DISPLAY_NAME_MAP[short.toLowerCase()] = short;
});

export function getDisplayName(name: string): string {
    return DISPLAY_NAME_MAP[name.toLowerCase()] || name;
}

// ── Country feature matching ──

export function matchCountryFeature(features: any[], searchName: string): any | null {
    const search = searchName.toLowerCase();

    const direct = features.find(f => f.properties?.name?.toLowerCase() === search);
    if (direct) return direct;

    const aliases = COUNTRY_NAME_MAP[searchName] || [];
    for (const alias of aliases) {
        const match = features.find(f => f.properties?.name?.toLowerCase() === alias.toLowerCase());
        if (match) return match;
    }

    for (const [short, variants] of Object.entries(COUNTRY_NAME_MAP)) {
        if (variants.some(v => v.toLowerCase() === search) || short.toLowerCase() === search) {
            const match = features.find(f =>
                f.properties?.name?.toLowerCase() === short.toLowerCase() ||
                variants.some(v => f.properties?.name?.toLowerCase() === v.toLowerCase())
            );
            if (match) return match;
        }
    }

    // Final fallback: case-insensitive whole-word match to avoid false positives (e.g., 'Mali' matching 'Somalia')
    const wordRegex = new RegExp(`\\b${search}\\b`, 'i');
    return features.find(f => {
        const name = f.properties?.name;
        if (!name) return false;
        return wordRegex.test(name);
    }) || null;
}

// ── Representative point ──

const CENTROID_OVERRIDES: Record<string, [number, number]> = {
    'United States of America': [-98.5, 39.8],
    'Russia': [90, 62],
    'Canada': [-96, 56],
    'France': [2.2, 46.6],
    'Norway': [10, 62],
    'Indonesia': [118, -2],
    'Chile': [-71, -35],
    'New Zealand': [174, -41],
    'Japan': [138, 36],
    'Malaysia': [109, 4],
    'United Kingdom': [-2, 54],
};

export function getRepresentativePoint(feature: any): [number, number] {
    const name = feature.properties?.name;
    if (name && CENTROID_OVERRIDES[name]) return CENTROID_OVERRIDES[name];
    return geoCentroid(feature);
}

// ── Force-directed label placement ──

function estimateLabelWidth(name: string, fontSize: number = 11): number {
    return getDisplayName(name).length * (fontSize * 0.58) + 16;
}

export function smartLabelPositions(
    pins: { name: string; x: number; y: number }[]
): Record<string, LabelPlacement> {
    if (pins.length === 0) return {};

    const LABEL_H = 18; // Reduced height for compact badges
    const OFFSET = 6;   // Much smaller initial offset - labels stay close to pins
    const MAX_DIST = 22; // Very limited distance - labels stay very close to their markers

    // Distribute initial positions radially using golden angle for better spread
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    const nodes = pins.map((pin, i) => {
        const angle = i * goldenAngle;
        const w = estimateLabelWidth(pin.name);
        return {
            name: pin.name,
            x: pin.x + Math.cos(angle) * OFFSET,
            y: pin.y + Math.sin(angle) * OFFSET,
            anchorX: pin.x,
            anchorY: pin.y,
            labelWidth: w,
            labelHeight: LABEL_H,
        };
    });

    // Collision radius calculation based on bounding box - tighter
    const collisionRadius = (node: any) => {
        return Math.sqrt(node.labelWidth * node.labelWidth + node.labelHeight * node.labelHeight) / 2 + 3;
    };

    // Force simulation: very tight constraints to prevent overlap while staying close
    const simulation = forceSimulation(nodes as any)
        .force('x', forceX((d: any) => d.anchorX).strength(0.85))
        .force('y', forceY((d: any) => d.anchorY).strength(0.85))
        .force('collide', forceCollide((d: any) => collisionRadius(d)).strength(1.5).iterations(15))
        .stop();

    // Run 500 ticks for better convergence with no overlap
    for (let i = 0; i < 500; i++) {
        simulation.tick();
    }

    const result: Record<string, LabelPlacement> = {};

    nodes.forEach(node => {
        let dx = (node as any).x - node.anchorX;
        let dy = (node as any).y - node.anchorY;

        // Clamp to max distance - keep very close
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > MAX_DIST) {
            const scale = MAX_DIST / dist;
            dx *= scale;
            dy *= scale;
        }

        // Apply minimal bias - keep label very close to pin
        if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
            dx = dx >= 0 ? 5 : -5;
            dy = -4;
        }

        const ha = dx >= 0 ? 'start' : 'end';
        result[node.name] = { x: node.anchorX, y: node.anchorY, dx, dy, ha };
    });

    return result;
}
