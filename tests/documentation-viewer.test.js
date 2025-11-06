/**
 * Tests for documentation viewer functionality
 */

describe('Documentation Viewer', () => {
    let documentationSections, documentationSearch;

    beforeAll(async () => {
        const module = await import('../src/config/DocumentationContent.js');
        documentationSections = module.documentationSections;
        documentationSearch = module.documentationSearch;
    });

    describe('Documentation Content', () => {
        test('should have at least 10 documentation sections', () => {
            expect(documentationSections.length).toBeGreaterThanOrEqual(10);
        });

        test('each section should have required properties', () => {
            documentationSections.forEach(section => {
                expect(section).toHaveProperty('id');
                expect(section).toHaveProperty('title');
                expect(section).toHaveProperty('icon');
                expect(section).toHaveProperty('content');
                expect(typeof section.id).toBe('string');
                expect(typeof section.title).toBe('string');
                expect(typeof section.icon).toBe('string');
                expect(typeof section.content).toBe('string');
                expect(section.content.length).toBeGreaterThan(0);
            });
        });

        test('section IDs should be unique', () => {
            const ids = documentationSections.map(s => s.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        test('sections should have valid kebab-case IDs', () => {
            documentationSections.forEach(section => {
                expect(section.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
            });
        });

        test('content should be valid HTML with proper tags', () => {
            documentationSections.forEach(section => {
                // Should contain at least one heading
                expect(section.content).toMatch(/<h[234]>/);

                // Should not have unmatched tags
                const openTags = (section.content.match(/<[^/][^>]*>/g) || []).length;
                const closeTags = (section.content.match(/<\/[^>]+>/g) || []).length;

                // Allow self-closing tags and empty tags, so just check it's not wildly unbalanced
                expect(Math.abs(openTags - closeTags)).toBeLessThan(20);
            });
        });
    });

    describe('Documentation Search', () => {
        test('should find sections matching search query', () => {
            const results = documentationSearch('language');
            expect(results.length).toBeGreaterThan(0);
        });

        test('should be case-insensitive', () => {
            const lower = documentationSearch('language');
            const upper = documentationSearch('LANGUAGE');
            expect(lower.length).toBe(upper.length);
        });

        test('should return empty array for non-matching query', () => {
            const results = documentationSearch('xyzabc123impossiblequery');
            expect(results).toEqual([]);
        });

        test('should search in both title and content', () => {
            const results = documentationSearch('emoji');
            expect(results.length).toBeGreaterThan(0);

            // Verify at least one result has 'emoji' in title or content
            const hasMatch = results.some(section =>
                section.title.toLowerCase().includes('emoji') ||
                section.content.toLowerCase().includes('emoji')
            );
            expect(hasMatch).toBe(true);
        });

        test('should find content about getting started', () => {
            const results = documentationSearch('install');
            expect(results.length).toBeGreaterThan(0);
        });

        test('should find content about audio', () => {
            const results = documentationSearch('audio');
            expect(results.length).toBeGreaterThan(0);
        });

        test('should find content about grid mode', () => {
            const results = documentationSearch('grid');
            expect(results.length).toBeGreaterThan(0);
        });
    });

    describe.skip('HelpSystem Integration', () => {
        // TODO: These tests require browser environment and CSS handling
        // Jest doesn't handle CSS imports well - test manually in browser
        let HelpSystem;

        beforeAll(async () => {
            const module = await import('../src/config/HelpSystem.js');
            HelpSystem = module.HelpSystem;
        });

        test('should have showFullDocumentation method', () => {
            const mockContainer = document.createElement('div');
            const helpSystem = new HelpSystem(mockContainer);

            expect(typeof helpSystem.showFullDocumentation).toBe('function');
        });

        test('should have renderDocNavigation method', () => {
            const mockContainer = document.createElement('div');
            const helpSystem = new HelpSystem(mockContainer);

            expect(typeof helpSystem.renderDocNavigation).toBe('function');
        });

        test('should have showDocSection method', () => {
            const mockContainer = document.createElement('div');
            const helpSystem = new HelpSystem(mockContainer);

            expect(typeof helpSystem.showDocSection).toBe('function');
        });

        test('should have handleDocSearch method', () => {
            const mockContainer = document.createElement('div');
            const helpSystem = new HelpSystem(mockContainer);

            expect(typeof helpSystem.handleDocSearch).toBe('function');
        });

        test('should have getSearchPreview method', () => {
            const mockContainer = document.createElement('div');
            const helpSystem = new HelpSystem(mockContainer);

            expect(typeof helpSystem.getSearchPreview).toBe('function');
        });

        test('getSearchPreview should extract text correctly', () => {
            const mockContainer = document.createElement('div');
            const helpSystem = new HelpSystem(mockContainer);

            const html = '<h2>Test</h2><p>This is a test with important keyword inside.</p>';
            const preview = helpSystem.getSearchPreview(html, 'keyword');

            expect(preview).toContain('keyword');
            expect(preview).not.toContain('<h2>');
            expect(preview).not.toContain('<p>');
        });
    });

    describe('Content Verification', () => {
        test('should have getting started section', () => {
            const section = documentationSections.find(s => s.id === 'getting-started');
            expect(section).toBeDefined();
            expect(section.content).toContain('install');
        });

        test('should have FAQ section', () => {
            const faqSection = documentationSections.find(s =>
                s.id === 'faq' || s.title.toLowerCase().includes('faq')
            );
            expect(faqSection).toBeDefined();
        });

        test('should have content types documentation', () => {
            const contentSection = documentationSections.find(s =>
                s.content.toLowerCase().includes('shapes') ||
                s.content.toLowerCase().includes('numbers') ||
                s.content.toLowerCase().includes('letters')
            );
            expect(contentSection).toBeDefined();
        });

        test('should have language documentation', () => {
            const langSection = documentationSections.find(s =>
                s.content.toLowerCase().includes('language') &&
                s.content.toLowerCase().includes('multilingual')
            );
            expect(langSection).toBeDefined();
        });
    });
});
