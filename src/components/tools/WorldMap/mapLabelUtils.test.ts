import { matchCountryFeature, normalizeCountryName, CountryProperties } from './mapLabelUtils';
import { Feature } from 'geojson';

describe('MapLabelUtils - Country Matching', () => {

    const mockFeatures: Feature<any, CountryProperties>[] = [
        { type: 'Feature', geometry: {} as any, properties: { name: 'United States of America' } },
        { type: 'Feature', geometry: {} as any, properties: { name: 'United Kingdom' } },
        { type: 'Feature', geometry: {} as any, properties: { name: 'Türkiye' } },
        { type: 'Feature', geometry: {} as any, properties: { name: 'Luxembourg' } },
        { type: 'Feature', geometry: {} as any, properties: { name: 'Japan' } },
    ];

    test('Normalizes specific country aliases to standard GeoJSON names', () => {
        expect(normalizeCountryName('USA')).toBe('United States of America');
        expect(normalizeCountryName('UK')).toBe('United Kingdom');
        expect(normalizeCountryName('Luxemburg')).toBe('Luxembourg');
        expect(normalizeCountryName('France')).toBe('France'); // Unchanged
    });

    test('Matches exact specific strings to GeoJSON features natively', () => {
        const match = matchCountryFeature(mockFeatures, 'Japan');
        expect(match?.properties.name).toBe('Japan');
    });

    test('Matches via normalized aliases (e.g. USA -> United States...)', () => {
        const match = matchCountryFeature(mockFeatures, 'USA');
        expect(match?.properties.name).toBe('United States of America');
    });

    test('Gracefully handles Turkey naming variations (Türkiye/Turkiye)', () => {
        const match = matchCountryFeature(mockFeatures, 'Turkey');
        expect(match?.properties.name).toBe('Türkiye');
    });

    test('Falls back to Contains match if exact match fails', () => {
        // If user passed `United States` without `of America` and we didn't normalize it,
        // it should still find it via "Contains".
        const match = matchCountryFeature(mockFeatures, 'United States');
        expect(match?.properties.name).toBe('United States of America');
    });

    test('Returns undefined for non-existent countries', () => {
        const match = matchCountryFeature(mockFeatures, 'Atlantis');
        expect(match).toBeUndefined();
    });

});
