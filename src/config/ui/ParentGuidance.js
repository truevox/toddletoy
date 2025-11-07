/**
 * ParentGuidance - Parent Guidance Banner Section
 *
 * Displays PWA installation instructions, bookmark guidance, and app pinning/guided access information.
 * Provides platform-specific instructions for iOS, Android, and desktop.
 *
 * Features:
 * - PWA installation card with automatic/manual install instructions
 * - Bookmark instructions for quick settings access
 * - Guided Access (iOS), Screen Pinning (Android), or Full Screen (desktop) instructions
 * - Platform detection and conditional content
 */

import { PLATFORMS } from '../constants.js';
import { detectPlatform, detectPWAInstalled } from '../../utils/platformUtils.js';

export class ParentGuidance {
    constructor(deferredPrompt = null) {
        this.deferredPrompt = deferredPrompt;
    }

    /**
     * Render the parent guidance section HTML
     * @returns {string} HTML string for the section
     */
    render() {
        const isPWAInstalled = detectPWAInstalled();
        const platform = detectPlatform();

        return `
            <section class="parent-guidance-banner">
                <h2 class="guidance-banner-title" data-help-anchor="install-app">🚀 Getting Started with ToddleToy</h2>
                <p class="guidance-banner-subtitle">Follow these steps for the safest and best play experience</p>

                <div class="guidance-cards">
                    ${this.createInstallCard(isPWAInstalled)}
                    ${this.createBookmarkCard()}
                    ${this.createAppPinningCard(platform)}
                </div>
            </section>
        `;
    }

    /**
     * Create PWA installation card
     * @param {boolean} isPWAInstalled - Whether PWA is already installed
     * @returns {string} HTML string for install card
     */
    createInstallCard(isPWAInstalled) {
        if (isPWAInstalled) {
            return `
                <div class="guidance-card install-card installed">
                    <div class="card-icon">✅</div>
                    <h3 class="card-title">App Installed!</h3>
                    <p class="card-content">
                        Great! ToddleToy is installed as an app. Your child can now play without accidentally
                        leaving the app. For even more safety, check out the "Keep Your Child Safe" section below.
                    </p>
                </div>
            `;
        }

        // Check if we have the install prompt available
        const hasInstallPrompt = this.deferredPrompt !== null;

        return `
            <div class="guidance-card install-card">
                <div class="card-icon">🚀</div>
                <h3 class="card-title">Best Experience: Install as App</h3>
                <p class="card-content">
                    Install ToddleToy like a regular app on your device for the safest experience:
                </p>
                <ul class="card-list">
                    <li>✅ <strong>Prevents accidental exits</strong> - No browser buttons to worry about</li>
                    <li>✅ <strong>Works offline</strong> - Play anywhere, anytime</li>
                    <li>✅ <strong>Faster loading</strong> - Opens instantly like any other app</li>
                    <li>✅ <strong>Full screen play</strong> - More space for your child to explore</li>
                </ul>
                ${hasInstallPrompt ?
                    `<button class="install-app-button" id="install-pwa-btn">
                        <span class="button-icon">📱</span>
                        Install ToddleToy Now
                    </button>` :
                    this.getManualInstallInstructions()
                }
            </div>
        `;
    }

    /**
     * Get manual installation instructions based on platform
     * @returns {string} HTML string for platform-specific install instructions
     */
    getManualInstallInstructions() {
        const platform = detectPlatform();

        if (platform === PLATFORMS.IOS) {
            return `
                <div class="manual-install-instructions">
                    <p><strong>To install on iPhone/iPad:</strong></p>
                    <ol>
                        <li>Tap the Share button <span class="ios-icon">⎙</span></li>
                        <li>Scroll down and tap "Add to Home Screen"</li>
                        <li>Tap "Add" in the top right corner</li>
                    </ol>
                </div>
            `;
        } else if (platform === PLATFORMS.ANDROID) {
            return `
                <div class="manual-install-instructions">
                    <p><strong>To install on Android:</strong></p>
                    <ol>
                        <li>Tap the menu button (⋮) in your browser</li>
                        <li>Tap "Install app" or "Add to Home screen"</li>
                        <li>Tap "Install" to confirm</li>
                    </ol>
                </div>
            `;
        } else {
            return `
                <div class="manual-install-instructions">
                    <p><strong>To install on desktop:</strong></p>
                    <ol>
                        <li>Look for the install icon in your browser's address bar</li>
                        <li>Or use your browser's menu: "Install ToddleToy..." or "Install app"</li>
                        <li>Click "Install" to confirm</li>
                    </ol>
                </div>
            `;
        }
    }

    /**
     * Create bookmark instructions card
     * @returns {string} HTML string for bookmark card
     */
    createBookmarkCard() {
        const platform = detectPlatform();
        let bookmarkInstructions = '';

        if (platform === PLATFORMS.IOS) {
            bookmarkInstructions = 'Tap <span class="ios-icon">⎙</span> Share → "Add Bookmark"';
        } else if (platform === PLATFORMS.ANDROID) {
            bookmarkInstructions = 'Tap ⋮ Menu → "Add bookmark" or ⭐ Star icon';
        } else if (platform === 'mac') {
            bookmarkInstructions = 'Press <kbd>⌘ Cmd</kbd> + <kbd>D</kbd>';
        } else {
            bookmarkInstructions = 'Press <kbd>Ctrl</kbd> + <kbd>D</kbd>';
        }

        return `
            <div class="guidance-card bookmark-card">
                <div class="card-icon">📌</div>
                <h3 class="card-title">Can't Install? Bookmark This Page</h3>
                <p class="card-content">
                    If you're not ready to install right now, save this settings page as a bookmark
                    so you can easily come back and adjust ToddleToy's settings later.
                </p>
                <div class="bookmark-instructions">
                    <strong>Quick shortcut:</strong> ${bookmarkInstructions}
                </div>
                <p class="card-note">
                    💡 Having this page bookmarked means you can quickly get back to settings if
                    your child accidentally leaves the play screen.
                </p>
            </div>
        `;
    }

    /**
     * Create app pinning/guided access card
     * @param {string} platform - Platform identifier (PLATFORMS.IOS, PLATFORMS.ANDROID, etc.)
     * @returns {string} HTML string for app pinning card
     */
    createAppPinningCard(platform) {
        let instructions = '';
        let documentationLink = '';

        if (platform === PLATFORMS.IOS) {
            instructions = `
                <h4>🔒 Enable Guided Access</h4>
                <p>Guided Access locks your iPhone/iPad to a single app and lets you control which features are available:</p>
                <ol>
                    <li>Go to <strong>Settings</strong> → <strong>Accessibility</strong> → <strong>Guided Access</strong></li>
                    <li>Turn on <strong>Guided Access</strong></li>
                    <li>Set a <strong>Passcode</strong> (important: this is how you exit!)</li>
                    <li>Open ToddleToy and <strong>triple-click the side button</strong></li>
                    <li>Tap <strong>Start</strong> to begin Guided Access</li>
                </ol>
                <p class="exit-note">To exit: <strong>Triple-click the side button</strong> and enter your passcode</p>
            `;
            documentationLink = 'https://support.apple.com/en-us/HT202612';
        } else if (platform === PLATFORMS.ANDROID) {
            instructions = `
                <h4>📌 Enable Screen Pinning</h4>
                <p>Screen Pinning keeps ToddleToy in full view and prevents your child from leaving the app:</p>
                <ol>
                    <li>Go to <strong>Settings</strong> → <strong>Security</strong> → <strong>Advanced</strong></li>
                    <li>Turn on <strong>Screen Pinning</strong></li>
                    <li>Enable "Ask for PIN before unpinning" for extra security</li>
                    <li>Open ToddleToy, then tap the <strong>Recent Apps</strong> button (□)</li>
                    <li>Tap the <strong>app icon</strong> at the top and select <strong>Pin</strong></li>
                </ol>
                <p class="exit-note">To exit: <strong>Hold Back + Overview buttons</strong> (or swipe up and hold on gesture navigation)</p>
            `;
            documentationLink = 'https://support.google.com/android/answer/9455138';
        } else {
            instructions = `
                <h4>🖥️ Full Screen Mode</h4>
                <p>Use your browser's full screen mode to maximize play space:</p>
                <ul>
                    <li><strong>Windows:</strong> Press <kbd>F11</kbd> to enter full screen</li>
                    <li><strong>Mac:</strong> Press <kbd>⌘ Cmd</kbd> + <kbd>Ctrl</kbd> + <kbd>F</kbd></li>
                    <li><strong>Chrome:</strong> Click ⋮ menu → "Full screen"</li>
                </ul>
                <p class="card-note">
                    💡 For maximum safety, we recommend installing ToddleToy as an app on a mobile device
                    and using Guided Access (iOS) or Screen Pinning (Android).
                </p>
            `;
            documentationLink = '';
        }

        return `
            <div class="guidance-card app-pinning-card">
                <div class="card-icon">🔒</div>
                <h3 class="card-title" data-help-anchor="guided-access">Keep Your Child Safe in the App</h3>
                <p class="card-content">
                    Use your device's built-in safety features to lock ToddleToy in place, preventing
                    your child from accidentally leaving the app or accessing other apps.
                </p>
                <details class="app-pinning-details">
                    <summary class="details-summary">
                        📖 Show ${platform === PLATFORMS.IOS ? 'Guided Access' : platform === PLATFORMS.ANDROID ? 'Screen Pinning' : 'Full Screen'} Instructions
                    </summary>
                    <div class="details-content">
                        ${instructions}
                        ${documentationLink ?
                            `<a href="${documentationLink}" target="_blank" rel="noopener noreferrer" class="official-docs-link">
                                📚 View Official ${platform === PLATFORMS.IOS ? 'Apple' : 'Google'} Documentation →
                            </a>` : ''
                        }
                    </div>
                </details>
                <p class="card-emphasis">
                    ⭐ <strong>Pro Tip:</strong> This works best when ToddleToy is installed as an app!
                </p>
            </div>
        `;
    }

    /**
     * Update deferred prompt (when beforeinstallprompt event fires)
     * @param {Event} deferredPrompt - BeforeInstallPromptEvent
     */
    updateDeferredPrompt(deferredPrompt) {
        this.deferredPrompt = deferredPrompt;
    }
}
