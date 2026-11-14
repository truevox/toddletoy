/**
 * HelpSystem modal rendering (onboarding, topic help, help menu).
 * Functions take the owning HelpSystem instance as first argument and call
 * back through it (help.method) so instance-level spies still intercept.
 */

/**
 * Show first-time onboarding modal
 */
export function showOnboarding(help) {
    if (!help.isFirstTime) return;

    const modal = help.createModal({
        title: '👋 Welcome to ToddleToy!',
        content: `
            <div class="onboarding-content">
                <p class="onboarding-intro">
                    <strong>ToddleToy is an interactive learning toy for toddlers!</strong>
                    This configuration screen lets you customize the perfect learning experience for your child.
                </p>

                <div class="onboarding-highlights">
                    <h3>🎯 Quick Start Guide</h3>
                    <ol class="onboarding-steps">
                        <li>
                            <strong>📱 Install the App</strong> (recommended!)
                            <p>Install ToddleToy as an app for the safest experience. Look for the "Install" section at the top.</p>
                        </li>
                        <li>
                            <strong>📦 Choose Content Types</strong>
                            <p>Select what your child will see: shapes, numbers, letters, or emojis. Start with 2-3 types.</p>
                        </li>
                        <li>
                            <strong>🌍 Select Languages</strong>
                            <p>Choose 1-2 languages to start. You can add more later!</p>
                        </li>
                        <li>
                            <strong>▶️ Start Playing!</strong>
                            <p>Click the "START PLAYING" button and explore together with your child.</p>
                        </li>
                    </ol>
                </div>

                <div class="onboarding-tips">
                    <h3>💡 Important Tips</h3>
                    <ul>
                        <li><strong>Play Together:</strong> ToddleToy works best when a grown-up plays along!</li>
                        <li><strong>Help Icons:</strong> Look for <span class="help-icon-demo">ⓘ</span> icons throughout help page for detailed help</li>
                        <li><strong>Complete Guide:</strong> <a href="/docs/CONFIG-GUIDE.md" target="_blank">Read the full configuration guide</a> for detailed explanations</li>
                        <li><strong>Adjust Anytime:</strong> You can always come back to adjust settings at <code>/admin</code>. While playing, press and hold the small top-right corner button for 2 seconds to exit back to the toy selector.</li>
                    </ul>
                </div>

                <p class="onboarding-footer">
                    <strong>Ready to get started?</strong> Scroll down to configure ToddleToy, or click "START PLAYING" to try it with default settings!
                </p>
            </div>
        `,
        className: 'onboarding-modal',
        dismissText: 'Get Started!',
        onDismiss: () => help.markOnboardingSeen()
    });

    document.body.appendChild(modal);
}

/**
 * Show help modal for a specific topic
 */
export function showHelp(help, topicId) {
    const topic = help.helpTopics[topicId];
    if (!topic) {
        console.warn(`Help topic not found: ${topicId}`);
        return;
    }

    const modal = help.createModal({
        title: topic.title,
        content: topic.content,
        className: 'help-modal',
        dismissText: 'Got it!'
    });

    document.body.appendChild(modal);
}

/**
 * Create a modal element
 */
export function createModal(help, { title, content, className = '', dismissText = 'Close', onDismiss = null }) {
    const modal = document.createElement('div');
    modal.className = `help-modal-overlay ${className}`;

    modal.innerHTML = `
        <div class="help-modal-container">
            <div class="help-modal-header">
                <h2 class="help-modal-title">${title}</h2>
                <button class="help-modal-close" aria-label="Close">&times;</button>
            </div>
            <div class="help-modal-body">
                ${content}
            </div>
            <div class="help-modal-footer">
                <button class="help-modal-dismiss">${dismissText}</button>
            </div>
        </div>
    `;

    // Add event listeners
    const closeBtn = modal.querySelector('.help-modal-close');
    const dismissBtn = modal.querySelector('.help-modal-dismiss');
    const overlay = modal;

    const closeModal = () => {
        modal.classList.add('closing');
        setTimeout(() => {
            modal.remove();
            if (onDismiss) onDismiss();
        }, 300);
    };

    closeBtn.addEventListener('click', closeModal);
    dismissBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // Escape key closes modal
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    return modal;
}

/**
 * Show help menu with all topics
 */
export function showHelpMenu(help) {
    const topicsList = Object.entries(help.helpTopics)
        .map(([id, topic]) => `
            <li class="help-menu-item">
                <button class="help-menu-link" data-topic="${id}">
                    ${topic.title}
                </button>
            </li>
        `).join('');

    const modal = help.createModal({
        title: '❓ Help Topics',
        content: `
            <div class="help-menu-content">
                <p class="help-menu-intro">
                    Choose a topic to learn more:
                </p>
                <ul class="help-menu-list">
                    ${topicsList}
                    <li class="help-menu-item">
                        <a href="/docs/CONFIG-GUIDE.md" target="_blank" class="help-menu-link external">
                            📚 Complete Configuration Guide
                        </a>
                    </li>
                </ul>
            </div>
        `,
        className: 'help-menu-modal',
        dismissText: 'Close'
    });

    // Add click handlers for topic links
    modal.querySelectorAll('[data-topic]').forEach(link => {
        link.addEventListener('click', (e) => {
            const topicId = e.target.dataset.topic;
            modal.remove();
            setTimeout(() => help.showHelp(topicId), 100);
        });
    });

    document.body.appendChild(modal);
}
