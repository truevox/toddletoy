/**
 * HelpSystem full documentation viewer.
 * Functions take the owning HelpSystem instance as first argument and call
 * back through it (help.method) so instance-level spies still intercept.
 */

/**
 * Show full documentation viewer modal
 */
export function showFullDocumentation(help) {
    // Lazy import to keep initial bundle size small
    import('../DocumentationContent.js').then(({ documentationSections, documentationSearch }) => {
        const modal = document.createElement('div');
        modal.className = 'help-modal documentation-modal fullscreen';
        modal.innerHTML = `
            <div class="help-modal-content documentation-content">
                <div class="help-modal-header">
                    <h2>📚 ToddleToy Documentation</h2>
                    <button class="help-modal-close" aria-label="Close documentation">✕</button>
                </div>

                <div class="documentation-search">
                    <input
                        type="text"
                        placeholder="🔍 Search documentation..."
                        class="doc-search-input"
                        aria-label="Search documentation"
                    />
                </div>

                <div class="documentation-layout">
                    <aside class="documentation-nav">
                        <h3>Navigation</h3>
                        <ul class="doc-nav-list">
                            ${help.renderDocNavigation(documentationSections)}
                        </ul>
                    </aside>

                    <main class="documentation-body">
                        <div id="doc-content-area">
                            ${documentationSections[0].content}
                        </div>
                    </main>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.help-modal-close').onclick = () => modal.remove();
        modal.querySelector('.doc-search-input').oninput = (e) =>
            help.handleDocSearch(e.target.value, documentationSections, documentationSearch);

        // Navigation clicks
        modal.querySelectorAll('.doc-nav-item').forEach(item => {
            item.onclick = () => help.showDocSection(item.dataset.sectionId, documentationSections);
        });

        // Close on backdrop click
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        // Highlight first nav item
        const firstNavItem = modal.querySelector('.doc-nav-item');
        if (firstNavItem) firstNavItem.classList.add('active');
    });
}

/**
 * Render documentation navigation sidebar
 */
export function renderDocNavigation(help, sections) {
    return sections.map(section => `
        <li class="doc-nav-item" data-section-id="${section.id}">
            <span class="doc-nav-icon">${section.icon}</span>
            <span class="doc-nav-title">${section.title}</span>
        </li>
    `).join('');
}

/**
 * Show specific documentation section
 */
export function showDocSection(help, sectionId, sections) {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const contentArea = document.getElementById('doc-content-area');
    if (!contentArea) return;

    contentArea.innerHTML = section.content;

    // Update active state in navigation
    document.querySelectorAll('.doc-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.sectionId === sectionId);
    });

    // Scroll content to top
    contentArea.scrollTop = 0;
}

/**
 * Handle documentation search
 */
export function handleDocSearch(help, query, sections, searchFn) {
    const contentArea = document.getElementById('doc-content-area');
    if (!contentArea) return;

    if (!query.trim()) {
        // Show first section if search cleared
        help.showDocSection(sections[0].id, sections);
        return;
    }

    const results = searchFn(query);

    if (results.length === 0) {
        contentArea.innerHTML = `
            <div class="search-no-results">
                <h2>No results found</h2>
                <p>No documentation found for "${query}"</p>
                <p>Try different search terms or browse sections in the sidebar.</p>
            </div>
        `;
        return;
    }

    contentArea.innerHTML = `
        <h2>Search Results for "${query}"</h2>
        <p class="search-results-count">Found ${results.length} section${results.length === 1 ? '' : 's'}</p>
        ${results.map(section => `
            <div class="search-result" data-section-id="${section.id}">
                <h3>${section.icon} ${section.title}</h3>
                <div class="search-result-preview">
                    ${help.getSearchPreview(section.content, query)}
                </div>
                <button class="search-result-view-btn">View full section →</button>
            </div>
        `).join('')}
    `;

    // Make results clickable
    contentArea.querySelectorAll('.search-result').forEach(result => {
        result.onclick = () => help.showDocSection(result.dataset.sectionId, sections);
    });
}

/**
 * Get search preview excerpt
 */
export function getSearchPreview(help, content, query) {
    // Strip HTML tags and get text content
    const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) {
        // Query not found in stripped text, return beginning
        return text.substring(0, 200) + '...';
    }

    // Show context around the match
    const start = Math.max(0, index - 100);
    const end = Math.min(text.length, index + query.length + 100);
    const excerpt = text.substring(start, end);

    return (start > 0 ? '...' : '') + excerpt + (end < text.length ? '...' : '');
}
