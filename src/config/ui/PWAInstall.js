/**
 * ConfigScreen PWA install handling and admin notifications.
 * Functions take the owning ConfigScreen instance as first argument and call
 * back through it (screen.method) so instance-level spies still intercept.
 */

/**
 * Show PWA installation prompt for admin users
 */
export function showPWAInstallPrompt(screen) {
    // Check if already installed or if browser supports PWA installation
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;

    if (isStandalone) {
        // Already installed as PWA
        screen.createNotification('✅ PWA Installed', 'ToddleToy is already installed as a Progressive Web App!', 'success');
        return;
    }

    // Check if installation is supported
    if ('serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window) {
        screen.createNotification(
            '📱 Install as App',
            'Install ToddleToy as a PWA to use offline! Look for the "Install" button in your browser or use the browser menu to "Install App".',
            'info'
        );
    } else {
        screen.createNotification(
            '💡 Use Offline',
            'ToddleToy works offline! Add it to your home screen for quick access. On mobile: use "Add to Home Screen" in your browser menu.',
            'info'
        );
    }
}

/**
 * Create a notification banner
 */
export function createNotification(screen, title, message, type = 'info') {
    // Remove any existing notifications
    const existingNotifications = screen.container.querySelectorAll('.admin-notification');
    existingNotifications.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `admin-notification admin-notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <h3 class="notification-title">${title}</h3>
            <p class="notification-message">${message}</p>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;

    // Insert after the header
    const header = screen.container.querySelector('.config-header');
    header.parentNode.insertBefore(notification, header.nextSibling);

    // Auto-hide after 10 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 10000);
}

/**
 * Handle PWA installation when user clicks install button
 */
export async function handlePWAInstall(screen) {
    if (!screen.deferredPrompt) {
        console.log('No deferred prompt available');
        return;
    }

    const installBtn = screen.container.querySelector('#install-pwa-btn');
    if (installBtn) {
        installBtn.disabled = true;
        installBtn.textContent = 'Installing...';
    }

    try {
        // Show the install prompt
        await screen.deferredPrompt.prompt();

        // Wait for the user to respond
        const { outcome } = await screen.deferredPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);

        if (outcome === 'accepted') {
            console.log('PWA installation accepted');
            screen.createNotification(
                '🎉 Installation Successful!',
                'ToddleToy has been installed! You can now find it with your other apps.',
                'success'
            );

            // Refresh the guidance section to show installed state
            setTimeout(() => {
                const main = screen.container.querySelector('.config-main');
                if (main) {
                    const newGuidance = screen.createParentGuidanceSection();
                    const oldGuidance = main.querySelector('.parent-guidance-banner');
                    if (oldGuidance) {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = newGuidance;
                        oldGuidance.replaceWith(tempDiv.firstElementChild);
                    }
                }
            }, 1000);
        } else {
            console.log('PWA installation declined');
            if (installBtn) {
                installBtn.disabled = false;
                installBtn.innerHTML = '<span class="button-icon">📱</span> Install ToddleToy Now';
            }
        }

        // Clear the deferred prompt
        screen.deferredPrompt = null;

    } catch (error) {
        console.error('Error during PWA installation:', error);
        if (installBtn) {
            installBtn.disabled = false;
            installBtn.innerHTML = '<span class="button-icon">📱</span> Install ToddleToy Now';
        }
    }
}

/**
 * Update install button visibility based on deferred prompt availability
 */
export function updateInstallButtonVisibility(screen) {
    const main = screen.container.querySelector('.config-main');
    if (main) {
        const newGuidance = screen.createParentGuidanceSection();
        const oldGuidance = main.querySelector('.parent-guidance-banner');
        if (oldGuidance) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newGuidance;
            oldGuidance.replaceWith(tempDiv.firstElementChild);

            // Re-attach event listener for install button
            const installBtn = screen.container.querySelector('#install-pwa-btn');
            if (installBtn) {
                installBtn.addEventListener('click', () => screen.handlePWAInstall());
            }
        }
    }
}
