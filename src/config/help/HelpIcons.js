/**
 * HelpSystem help icon and floating button injection.
 * Functions take the owning HelpSystem instance as first argument and call
 * back through it (help.method) so instance-level spies still intercept.
 */

/**
 * Create a help icon button
 */
export function createHelpIcon(help, topicId, inline = false) {
    const button = document.createElement('button');
    button.className = `help-icon-btn ${inline ? 'inline' : ''}`;
    button.innerHTML = 'ⓘ';
    button.setAttribute('aria-label', 'Show help');
    button.setAttribute('title', 'Click for help');
    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        help.showHelp(topicId);
    });
    return button;
}

/**
 * Add help icons to configuration sections
 * Uses data-help-anchor attributes for robust, decoupled selection
 */
export function addHelpIcons(help) {
    if (!help.container) {
        console.error('HelpSystem: container not found, cannot add help icons');
        return;
    }

    const helpTopics = [
        'install-app',
        'guided-access',
        'content-types',
        'emoji-categories',
        'languages',
        'special-numbers',
        'auto-cleanup',
        'audio-controls',
        'grid-mode'
    ];

    let successCount = 0;
    helpTopics.forEach(topic => {
        const element = help.container.querySelector(`[data-help-anchor="${topic}"]`);

        if (!element) {
            console.warn(`HelpSystem: Help anchor not found for topic: ${topic}`);
            return;
        }

        const helpIcon = help.createHelpIcon(topic);
        element.appendChild(helpIcon);
        successCount++;
    });

    console.log(`HelpSystem: Successfully attached ${successCount}/${helpTopics.length} help icons`);
}

/**
 * Add "Need Help?" floating button
 */
export function addFloatingHelpButton(help) {
    const button = document.createElement('button');
    button.className = 'floating-help-btn';
    button.innerHTML = '❓ Need Help?';
    button.setAttribute('aria-label', 'Open help menu');

    button.addEventListener('click', () => {
        help.showHelpMenu();
    });

    help.container.appendChild(button);
}
