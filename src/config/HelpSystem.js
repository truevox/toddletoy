/**
 * HelpSystem - Provides inline help, tooltips, and onboarding for ToddleToy configuration
 *
 * This module provides:
 * - Help tooltips for all configuration options
 * - First-time user onboarding modal
 * - Quick tips and hints
 * - Links to detailed documentation
 */

// Import CSS styles (Vite will handle this)
import './HelpSystem.css';
import './DocumentationStyles.css';
import { initializeHelpTopics } from './help/HelpTopics.js';
import { showOnboarding, showHelp, createModal, showHelpMenu } from './help/HelpModals.js';
import { createHelpIcon, addHelpIcons, addFloatingHelpButton } from './help/HelpIcons.js';
import { showFullDocumentation, renderDocNavigation, showDocSection, handleDocSearch, getSearchPreview } from './help/DocViewer.js';

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
        return initializeHelpTopics(this);
    }

    /**
     * Show first-time onboarding modal
     */
    showOnboarding() {
        return showOnboarding(this);
    }

    /**
     * Show help modal for a specific topic
     */
    showHelp(topicId) {
        return showHelp(this, topicId);
    }

    /**
     * Create a modal element
     */
    createModal(options) {
        return createModal(this, options);
    }

    /**
     * Create a help icon button
     */
    createHelpIcon(topicId, inline = false) {
        return createHelpIcon(this, topicId, inline);
    }

    /**
     * Add help icons to configuration sections
     * Uses data-help-anchor attributes for robust, decoupled selection
     */
    addHelpIcons() {
        return addHelpIcons(this);
    }

    /**
     * Add "Need Help?" floating button
     */
    addFloatingHelpButton() {
        return addFloatingHelpButton(this);
    }

    /**
     * Show help menu with all topics
     */
    showHelpMenu() {
        return showHelpMenu(this);
    }

    /**
     * Initialize the help system
     * Note: ConfigScreen should call showOnboardingIfNeeded() after full initialization
     * CSS is loaded via module import at the top of this file
     */
    initialize() {
        this.addHelpIcons();
        this.addFloatingHelpButton();
    }

    /**
     * Show onboarding if this is the first time user is seeing the config screen
     * Should be called by ConfigScreen after all UI is fully rendered
     */
    showOnboardingIfNeeded() {
        if (this.isFirstTime) {
            this.showOnboarding();
        }
    }

    /**
     * Show full documentation viewer modal
     */
    showFullDocumentation() {
        return showFullDocumentation(this);
    }

    /**
     * Render documentation navigation sidebar
     */
    renderDocNavigation(sections) {
        return renderDocNavigation(this, sections);
    }

    /**
     * Show specific documentation section
     */
    showDocSection(sectionId, sections) {
        return showDocSection(this, sectionId, sections);
    }

    /**
     * Handle documentation search
     */
    handleDocSearch(query, sections, searchFn) {
        return handleDocSearch(this, query, sections, searchFn);
    }

    /**
     * Get search preview excerpt
     */
    getSearchPreview(content, query) {
        return getSearchPreview(this, content, query);
    }
}
