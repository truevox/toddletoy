/**
 * PlayingTips - Tips for Playing Together section
 *
 * Displays guidance for parents about supervised play and safety features.
 * No configuration state - purely informational.
 */

export class PlayingTips {
    /**
     * Render the playing tips section HTML
     * @returns {string} HTML string for the section
     */
    render() {
        return `
            <section class="playing-tips-section">
                <h2 class="tips-title">👨‍👩‍👧 Tips for Playing Together</h2>
                <div class="tips-content">
                    <p class="tips-text">
                        <strong>ToddleToy works best when a grown up plays along!</strong>
                        Encourage your child to explore, ask questions, and discover new words together.
                        <strong>ToddleToy is not a babysitter!</strong> Employing it as one may leave your child hungry and overtired, at best.
                    </p>
                    <p class="tips-note">
                        💡 <strong>Tip:</strong> For the safest experience, see the "Getting Started" section above
                        to install ToddleToy as an app and learn how to set up and use child safety features such as
                        App Pinning and Guided Access.
                    </p>
                </div>
                <button class="start-button" id="start-playing-btn-top">
                    ▶️ START PLAYING
                </button>
            </section>
        `;
    }

    /**
     * Attach event listeners for this section
     * Note: Start playing button is handled by the ConfigScreen orchestrator
     */
    attachEventListeners() {
        // The start button listener is attached by ConfigScreen
        // This section has no internal configuration state
    }

    /**
     * Load configuration (no-op for this section)
     */
    loadConfig() {
        // This section has no configuration state
    }

    /**
     * Get configuration data (no-op for this section)
     * @returns {Object} Empty object (no config data)
     */
    getConfigData() {
        // This section has no configuration state
        return {};
    }
}
