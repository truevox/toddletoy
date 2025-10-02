import Phaser from 'phaser'
import { AppRoutes } from './routes/routes.js'

// Get app version from build-time environment variable
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

// Store service worker registration globally for update functionality
let swRegistration = null;
let refreshing = false;

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
                swRegistration = registration;

                // Check for updates when service worker updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('SW update found, installing...');

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('New content available, update ready to install');

                            // Update UI to show "Update Now" button
                            const updateBtn = document.getElementById('update-app-btn');
                            const statusMsg = document.getElementById('update-status-msg');

                            if (updateBtn) {
                                updateBtn.textContent = 'Update Now';
                                updateBtn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
                                updateBtn.style.color = 'white';
                            }

                            if (statusMsg) {
                                statusMsg.textContent = 'A new version is ready!';
                                statusMsg.style.color = '#4CAF50';
                            }
                        }
                    });
                });

                // Check for updates periodically (every 60 minutes)
                setInterval(() => {
                    registration.update();
                }, 60 * 60 * 1000);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });

    // Auto-reload when new service worker takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        console.log('New service worker activated, reloading...');
        window.location.reload();
    });
}

// Handle update button clicks
window.addEventListener('app-update-requested', async () => {
    console.log('Update requested by user');

    const updateBtn = document.getElementById('update-app-btn');
    const statusMsg = document.getElementById('update-status-msg');

    if (!swRegistration) {
        console.error('No service worker registration found');
        if (statusMsg) {
            statusMsg.textContent = 'Error: Service worker not registered';
            statusMsg.style.color = '#ff6b6b';
            setTimeout(() => { statusMsg.textContent = ''; }, 3000);
        }
        return;
    }

    // Scenario 1: Update is already waiting, just activate it
    if (swRegistration.waiting) {
        console.log('Update waiting, activating...');
        if (statusMsg) {
            statusMsg.textContent = 'Installing update...';
            statusMsg.style.color = '#FFC107';
        }

        // Tell the waiting service worker to skip waiting and activate
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        // The controllerchange listener will handle the reload
        return;
    }

    // Scenario 2: No update waiting, check for one
    console.log('Checking for updates...');
    if (statusMsg) {
        statusMsg.textContent = 'Checking for updates...';
        statusMsg.style.color = 'rgba(255, 255, 255, 0.8)';
    }

    if (updateBtn) {
        updateBtn.disabled = true;
    }

    try {
        await swRegistration.update();

        // Wait a moment for the update check to complete
        setTimeout(() => {
            // If still no waiting worker, we're up to date
            if (!swRegistration.waiting) {
                console.log('No updates available');
                if (statusMsg) {
                    statusMsg.textContent = 'You are up to date!';
                    statusMsg.style.color = '#4CAF50';
                    setTimeout(() => { statusMsg.textContent = ''; }, 3000);
                }
            }
            // Otherwise, the updatefound event will update the UI

            if (updateBtn) {
                updateBtn.disabled = false;
            }
        }, 1000);

    } catch (error) {
        console.error('Update check failed:', error);
        if (statusMsg) {
            statusMsg.textContent = 'Error: Could not connect to the server.';
            statusMsg.style.color = '#ff6b6b';
            setTimeout(() => { statusMsg.textContent = ''; }, 3000);
        }

        if (updateBtn) {
            updateBtn.disabled = false;
        }
    }
});

// Start the application with routing when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    console.log(`Starting ToddleToy v${APP_VERSION} - Build:`, new Date().toISOString());

    // Initialize routing system
    window.appRoutes = new AppRoutes();

    // Expose for debugging
    window.configManager = window.appRoutes.getConfigManager();

    console.log('✅ Application initialized with routing and configuration system');
});