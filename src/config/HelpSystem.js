/**
 * HelpSystem - Provides inline help, tooltips, and onboarding for ToddleToy configuration
 *
 * This module provides:
 * - Help tooltips for all configuration options
 * - First-time user onboarding modal
 * - Quick tips and hints
 * - Links to detailed documentation
 */

export class HelpSystem {
    constructor(container) {
        this.container = container;
        this.isFirstTime = this.checkFirstTimeUser();
        this.helpTopics = this.initializeHelpTopics();
    }

    /**
     * Check if this is the user's first time seeing the config screen
     */
    checkFirstTimeUser() {
        const hasSeenOnboarding = localStorage.getItem('toddletoy-seen-onboarding');
        return !hasSeenOnboarding;
    }

    /**
     * Mark onboarding as seen
     */
    markOnboardingSeen() {
        localStorage.setItem('toddletoy-seen-onboarding', 'true');
        this.isFirstTime = false;
    }

    /**
     * Initialize all help topics with detailed explanations
     */
    initializeHelpTopics() {
        return {
            'install-app': {
                title: '📱 Installing ToddleToy',
                content: `
                    <p><strong>Installing ToddleToy as an app gives you the safest and best experience!</strong></p>
                    <h4>Benefits:</h4>
                    <ul>
                        <li>✅ <strong>Safety:</strong> Prevents accidental exits - no browser buttons to worry about</li>
                        <li>✅ <strong>Offline Play:</strong> Works without internet connection</li>
                        <li>✅ <strong>Faster:</strong> Opens instantly like any other app</li>
                        <li>✅ <strong>Full Screen:</strong> More space for your child to explore</li>
                    </ul>
                    <p><a href="/docs/CONFIG-GUIDE.md#installing-toddletoy-as-an-app" target="_blank">Read full installation guide →</a></p>
                `
            },
            'guided-access': {
                title: '🔒 Keeping Your Child Safe',
                content: `
                    <p><strong>Use your device's built-in safety features to lock ToddleToy in place!</strong></p>
                    <h4>iOS - Guided Access:</h4>
                    <p>Locks your iPhone/iPad to show only ToddleToy. Triple-click side button to start/stop.</p>
                    <h4>Android - Screen Pinning:</h4>
                    <p>Keeps ToddleToy on screen and prevents leaving the app. Use Recent Apps → Pin.</p>
                    <p><a href="/docs/CONFIG-GUIDE.md#guided-access-ios--screen-pinning-android" target="_blank">Read detailed setup instructions →</a></p>
                `
            },
            'content-types': {
                title: '📦 Content Types - What Should Appear?',
                content: `
                    <p><strong>Choose what your child will see and interact with.</strong></p>
                    <h4>Available Content:</h4>
                    <ul>
                        <li><strong>Shapes:</strong> Circles, squares, triangles - great for toddlers (ages 1-3)</li>
                        <li><strong>Small Numbers:</strong> 0-20 range, perfect for counting practice (ages 2-4)</li>
                        <li><strong>Large Numbers:</strong> 21-9999 range, for advanced learners (ages 4+)</li>
                        <li><strong>UPPERCASE Letters:</strong> A-Z, classic alphabet learning (ages 2-4)</li>
                        <li><strong>lowercase letters:</strong> a-z, reading readiness (ages 3-5)</li>
                        <li><strong>Emojis:</strong> Animals, foods, faces - fun and engaging (all ages)</li>
                    </ul>
                    <h4>Weight Sliders:</h4>
                    <p>Higher numbers = appears more often. Set to 100 for maximum frequency, 10 for rare appearances.</p>
                    <p><a href="/docs/CONFIG-GUIDE.md#-content-types-section" target="_blank">Read complete content guide →</a></p>
                `
            },
            'emoji-categories': {
                title: '😊 Emoji Categories',
                content: `
                    <p><strong>Fine-tune which types of emojis appear.</strong></p>
                    <p><em>Note: These only work when "😊 Emojis" is enabled above.</em></p>
                    <h4>Categories:</h4>
                    <ul>
                        <li><strong>🐶 Animals:</strong> Dogs, cats, lions - most popular with toddlers!</li>
                        <li><strong>🍎 Food:</strong> Fruits, vegetables, meals - connects to everyday life</li>
                        <li><strong>🚗 Vehicles:</strong> Cars, trains, planes - great for vehicle enthusiasts</li>
                        <li><strong>😀 Faces:</strong> Happy, sad, surprised - teaches emotions</li>
                        <li><strong>🌳 Nature:</strong> Trees, flowers, weather - outdoor connections</li>
                        <li><strong>🎾 Objects:</strong> Balls, toys, books - familiar items</li>
                    </ul>
                    <p>Use weight sliders to make favorites appear more often!</p>
                    <p><a href="/docs/CONFIG-GUIDE.md#-emoji-categories-section" target="_blank">Read detailed emoji guide →</a></p>
                `
            },
            'languages': {
                title: '🌍 Multi-Language Learning',
                content: `
                    <p><strong>ToddleToy can teach multiple languages at once!</strong></p>
                    <h4>How It Works:</h4>
                    <ul>
                        <li>Drag languages between "Available" and "Enabled" columns</li>
                        <li><strong>Order matters!</strong> First language = primary speech</li>
                        <li>Objects are announced in all enabled languages</li>
                    </ul>
                    <h4>Why Multiple Languages?</h4>
                    <ul>
                        <li>✅ Early language exposure boosts cognitive development</li>
                        <li>✅ Young children learn languages more easily</li>
                        <li>✅ Builds cultural awareness and appreciation</li>
                        <li>✅ Creates lifelong learning advantages</li>
                    </ul>
                    <h4>Recommendations:</h4>
                    <ul>
                        <li><strong>Ages 1-2:</strong> Start with 1-2 languages (home languages)</li>
                        <li><strong>Ages 2-3:</strong> Can handle 2-3 languages comfortably</li>
                        <li><strong>Ages 3-4:</strong> Ready for 3-4 languages with exposure</li>
                        <li><strong>Ages 4+:</strong> Can manage multiple languages with practice</li>
                    </ul>
                    <p><a href="/docs/CONFIG-GUIDE.md#-language-selection" target="_blank">Read complete language guide →</a></p>
                `
            },
            'special-numbers': {
                title: '⚙️ Special Number Displays',
                content: `
                    <p><strong>Show numbers in different ways to teach math concepts!</strong></p>
                    <h4>Available Systems:</h4>
                    <ul>
                        <li><strong>⚙️ Cistercian:</strong> Ancient monastery number system (13th century)</li>
                        <li><strong>❄️ Kaktovik:</strong> Inuit base-20 system from Alaska</li>
                        <li><strong>❤️ Binary Hearts:</strong> Computer binary with hearts (1) and white hearts (0)</li>
                        <li><strong>🍎 Counting:</strong> Visual counting with apples and place-value objects</li>
                    </ul>
                    <h4>Educational Value:</h4>
                    <p>Shows that the same number can be written differently - a foundational math concept!</p>
                    <p><strong>Recommended for ages 4+</strong> who are curious about how numbers work.</p>
                    <p><a href="/docs/CONFIG-GUIDE.md#️-special-number-displays-advanced-section" target="_blank">Read detailed number systems guide →</a></p>
                `
            },
            'auto-cleanup': {
                title: '🧹 Auto-Cleanup Timer',
                content: `
                    <p><strong>Objects automatically disappear if not touched!</strong></p>
                    <h4>How It Works:</h4>
                    <ol>
                        <li>Each object gets its own timer</li>
                        <li>Touching/clicking resets the timer</li>
                        <li>When time expires: fun pop sound + fireworks! 🎆</li>
                    </ol>
                    <h4>Recommended Settings:</h4>
                    <ul>
                        <li><strong>5-10 seconds:</strong> Fast-paced, active play</li>
                        <li><strong>15-30 seconds:</strong> Balanced (recommended)</li>
                        <li><strong>60+ seconds:</strong> Relaxed, contemplative play</li>
                    </ul>
                    <h4>Benefits:</h4>
                    <ul>
                        <li>Prevents screen clutter</li>
                        <li>Teaches cause and effect</li>
                        <li>Encourages interaction and attention</li>
                    </ul>
                    <p><a href="/docs/CONFIG-GUIDE.md#-auto-cleanup-timer" target="_blank">Read complete cleanup guide →</a></p>
                `
            },
            'audio-controls': {
                title: '🔊 Audio & Voice Settings',
                content: `
                    <p><strong>ToddleToy has two separate audio systems:</strong></p>
                    <h4>🎵 Audio Tones (Position Sounds):</h4>
                    <ul>
                        <li>Musical tones based on where objects are positioned</li>
                        <li>Higher on screen = higher pitch</li>
                        <li>Different corners = different waveforms</li>
                        <li>Usually set to 10-30% volume</li>
                    </ul>
                    <h4>🗣️ Speech Voice (Words):</h4>
                    <ul>
                        <li>Spoken words announcing each object</li>
                        <li>Primary learning mechanism</li>
                        <li>Adjustable speed: 0.25x to 2x</li>
                        <li>Usually set to 60-80% volume</li>
                    </ul>
                    <h4>Speed Recommendations:</h4>
                    <ul>
                        <li><strong>Ages 1-2:</strong> 0.5x-0.75x (slower helps hearing)</li>
                        <li><strong>Ages 2-3:</strong> 0.75x-1.0x (standard learning)</li>
                        <li><strong>Ages 3+:</strong> 1.0x (normal speed)</li>
                    </ul>
                    <p><a href="/docs/CONFIG-GUIDE.md#-audio--voice-controls" target="_blank">Read complete audio guide →</a></p>
                `
            },
            'grid-mode': {
                title: '📐 Grid Mode',
                content: `
                    <p><strong>Switch from free-form to structured grid layout!</strong></p>
                    <h4>Normal Mode (Grid Off):</h4>
                    <ul>
                        <li>Objects appear anywhere you click/tap</li>
                        <li>Free exploration and movement</li>
                        <li>Best for touch-screen play</li>
                    </ul>
                    <h4>Grid Mode (Grid On):</h4>
                    <ul>
                        <li>Screen divided into cells (like checkerboard)</li>
                        <li>Objects snap to grid positions</li>
                        <li>Great for keyboard/controller navigation</li>
                        <li>More structured and organized</li>
                    </ul>
                    <h4>Grid Size Recommendations:</h4>
                    <ul>
                        <li><strong>3×3:</strong> Ages 1-2 (large targets)</li>
                        <li><strong>4×4:</strong> Ages 2-3 (recommended)</li>
                        <li><strong>5×5 or 6×6:</strong> Ages 3+ (more objects)</li>
                    </ul>
                    <p><a href="/docs/CONFIG-GUIDE.md#-grid-mode-advanced" target="_blank">Read complete grid mode guide →</a></p>
                `
            }
        };
    }

    /**
     * Show first-time onboarding modal
     */
    showOnboarding() {
        if (!this.isFirstTime) return;

        const modal = this.createModal({
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
                            <li><strong>Help Icons:</strong> Look for <span class="help-icon-demo">ⓘ</span> icons throughout this page for detailed help</li>
                            <li><strong>Complete Guide:</strong> <a href="/docs/CONFIG-GUIDE.md" target="_blank">Read the full configuration guide</a> for detailed explanations</li>
                            <li><strong>Adjust Anytime:</strong> You can always come back to adjust settings at <code>/admin</code></li>
                        </ul>
                    </div>

                    <p class="onboarding-footer">
                        <strong>Ready to get started?</strong> Scroll down to configure ToddleToy, or click "START PLAYING" to try it with default settings!
                    </p>
                </div>
            `,
            className: 'onboarding-modal',
            dismissText: 'Get Started!',
            onDismiss: () => this.markOnboardingSeen()
        });

        document.body.appendChild(modal);
    }

    /**
     * Show help modal for a specific topic
     */
    showHelp(topicId) {
        const topic = this.helpTopics[topicId];
        if (!topic) {
            console.warn(`Help topic not found: ${topicId}`);
            return;
        }

        const modal = this.createModal({
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
    createModal({ title, content, className = '', dismissText = 'Close', onDismiss = null }) {
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
     * Create a help icon button
     */
    createHelpIcon(topicId, inline = false) {
        const button = document.createElement('button');
        button.className = `help-icon-btn ${inline ? 'inline' : ''}`;
        button.innerHTML = 'ⓘ';
        button.setAttribute('aria-label', 'Show help');
        button.setAttribute('title', 'Click for help');
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showHelp(topicId);
        });
        return button;
    }

    /**
     * Add help icons to configuration sections
     */
    addHelpIcons() {
        const helpMappings = [
            { selector: '.parent-guidance-banner .guidance-banner-title', topic: 'install-app' },
            { selector: '.app-pinning-card .card-title', topic: 'guided-access' },
            { selector: '.config-section .section-title', topic: 'content-types', index: 0 },
            { selector: '.emoji-categories-section .section-title', topic: 'emoji-categories' },
            { selector: '.language-section .section-title', topic: 'languages' },
            { selector: '.advanced-options', topic: 'special-numbers', before: true },
            { selector: '.auto-cleanup-section .subsection-title', topic: 'auto-cleanup' },
            { selector: '.audio-controls-section .subsection-title', topic: 'audio-controls' },
            { selector: '.grid-mode-section .subsection-title', topic: 'grid-mode' }
        ];

        helpMappings.forEach(mapping => {
            let elements = this.container.querySelectorAll(mapping.selector);

            if (mapping.index !== undefined) {
                elements = [elements[mapping.index]];
            }

            elements.forEach(element => {
                if (!element) return;

                const helpIcon = this.createHelpIcon(mapping.topic);

                if (mapping.before) {
                    element.insertBefore(helpIcon, element.firstChild);
                } else {
                    element.appendChild(helpIcon);
                }
            });
        });
    }

    /**
     * Add "Need Help?" floating button
     */
    addFloatingHelpButton() {
        const button = document.createElement('button');
        button.className = 'floating-help-btn';
        button.innerHTML = '❓ Need Help?';
        button.setAttribute('aria-label', 'Open help menu');

        button.addEventListener('click', () => {
            this.showHelpMenu();
        });

        this.container.appendChild(button);
    }

    /**
     * Show help menu with all topics
     */
    showHelpMenu() {
        const topicsList = Object.entries(this.helpTopics)
            .map(([id, topic]) => `
                <li class="help-menu-item">
                    <button class="help-menu-link" data-topic="${id}">
                        ${topic.title}
                    </button>
                </li>
            `).join('');

        const modal = this.createModal({
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
                setTimeout(() => this.showHelp(topicId), 100);
            });
        });

        document.body.appendChild(modal);
    }

    /**
     * Add all styles for the help system
     */
    addStyles() {
        const styleId = 'help-system-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Help Icon Button */
            .help-icon-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                margin-left: 8px;
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                color: white;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s ease;
                vertical-align: middle;
            }

            .help-icon-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.1);
            }

            .help-icon-btn.inline {
                width: 20px;
                height: 20px;
                font-size: 12px;
                margin-left: 4px;
            }

            .help-icon-demo {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
                background: rgba(102, 126, 234, 0.3);
                border: 1px solid rgba(102, 126, 234, 0.5);
                border-radius: 50%;
                font-size: 12px;
                font-weight: bold;
            }

            /* Floating Help Button */
            .floating-help-btn {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 25px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                transition: all 0.3s ease;
                z-index: 999;
            }

            .floating-help-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
            }

            /* Modal Overlay */
            .help-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                padding: 20px;
                animation: fadeIn 0.3s ease-out;
                overflow-y: auto;
            }

            .help-modal-overlay.closing {
                animation: fadeOut 0.3s ease-out;
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }

            @keyframes fadeOut {
                from {
                    opacity: 1;
                }
                to {
                    opacity: 0;
                }
            }

            /* Modal Container */
            .help-modal-container {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
                border-radius: 12px;
                max-width: 600px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                animation: slideIn 0.3s ease-out;
                color: white;
            }

            .onboarding-modal .help-modal-container {
                max-width: 700px;
            }

            .help-modal-overlay.closing .help-modal-container {
                animation: slideOut 0.3s ease-out;
            }

            @keyframes slideIn {
                from {
                    transform: translateY(-50px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            @keyframes slideOut {
                from {
                    transform: translateY(0);
                    opacity: 1;
                }
                to {
                    transform: translateY(-50px);
                    opacity: 0;
                }
            }

            /* Modal Header */
            .help-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            }

            .help-modal-title {
                margin: 0;
                font-size: 24px;
                font-weight: bold;
            }

            .help-modal-close {
                background: none;
                border: none;
                color: white;
                font-size: 32px;
                line-height: 1;
                cursor: pointer;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: background 0.2s ease;
            }

            .help-modal-close:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            /* Modal Body */
            .help-modal-body {
                padding: 24px;
                line-height: 1.6;
            }

            .help-modal-body h3,
            .help-modal-body h4 {
                margin-top: 20px;
                margin-bottom: 12px;
                color: white;
            }

            .help-modal-body h3 {
                font-size: 20px;
            }

            .help-modal-body h4 {
                font-size: 18px;
            }

            .help-modal-body p {
                margin: 12px 0;
            }

            .help-modal-body ul,
            .help-modal-body ol {
                margin: 12px 0;
                padding-left: 24px;
            }

            .help-modal-body li {
                margin: 8px 0;
            }

            .help-modal-body a {
                color: #ffd700;
                text-decoration: underline;
            }

            .help-modal-body a:hover {
                color: #ffed4e;
            }

            .help-modal-body code {
                background: rgba(0, 0, 0, 0.3);
                padding: 2px 6px;
                border-radius: 3px;
                font-family: 'Courier New', monospace;
            }

            /* Modal Footer */
            .help-modal-footer {
                padding: 16px 24px;
                border-top: 1px solid rgba(255, 255, 255, 0.2);
                display: flex;
                justify-content: flex-end;
            }

            .help-modal-dismiss {
                padding: 12px 24px;
                background: rgba(255, 255, 255, 0.2);
                border: 2px solid rgba(255, 255, 255, 0.3);
                color: white;
                font-size: 16px;
                font-weight: bold;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .help-modal-dismiss:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: translateY(-2px);
            }

            /* Onboarding Specific Styles */
            .onboarding-intro {
                font-size: 18px;
                margin-bottom: 24px;
            }

            .onboarding-highlights {
                background: rgba(255, 255, 255, 0.1);
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }

            .onboarding-steps {
                list-style: none;
                padding: 0;
                counter-reset: step-counter;
            }

            .onboarding-steps li {
                counter-increment: step-counter;
                margin: 16px 0;
                padding-left: 0;
            }

            .onboarding-steps li strong {
                display: block;
                font-size: 18px;
                margin-bottom: 4px;
            }

            .onboarding-steps li p {
                margin: 4px 0;
                opacity: 0.9;
            }

            .onboarding-tips {
                background: rgba(255, 255, 255, 0.1);
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }

            .onboarding-tips ul {
                list-style: none;
                padding: 0;
            }

            .onboarding-tips li {
                margin: 12px 0;
                padding-left: 24px;
                position: relative;
            }

            .onboarding-tips li::before {
                content: "💡";
                position: absolute;
                left: 0;
            }

            .onboarding-footer {
                font-size: 18px;
                margin-top: 24px;
                text-align: center;
            }

            /* Help Menu Styles */
            .help-menu-content {
                padding: 0;
            }

            .help-menu-intro {
                margin-bottom: 16px;
            }

            .help-menu-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .help-menu-item {
                margin: 0;
                padding: 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .help-menu-item:last-child {
                border-bottom: none;
            }

            .help-menu-link {
                display: block;
                padding: 16px;
                background: none;
                border: none;
                color: white;
                text-align: left;
                font-size: 16px;
                cursor: pointer;
                transition: background 0.2s ease;
                width: 100%;
            }

            .help-menu-link:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .help-menu-link.external {
                color: #ffd700;
                font-weight: bold;
            }

            /* Mobile Responsive */
            @media (max-width: 600px) {
                .help-modal-container {
                    max-width: 100%;
                    border-radius: 0;
                    max-height: 100vh;
                }

                .floating-help-btn {
                    bottom: 10px;
                    right: 10px;
                    padding: 10px 16px;
                    font-size: 14px;
                }

                .help-modal-title {
                    font-size: 20px;
                }

                .onboarding-intro {
                    font-size: 16px;
                }

                .onboarding-steps li strong {
                    font-size: 16px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Initialize the help system
     */
    initialize() {
        this.addStyles();
        this.addHelpIcons();
        this.addFloatingHelpButton();

        // Show onboarding for first-time users
        if (this.isFirstTime) {
            // Delay slightly to ensure config screen is fully rendered
            setTimeout(() => this.showOnboarding(), 500);
        }
    }
}
