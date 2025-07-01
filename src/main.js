import Phaser from 'phaser'
import { AppRoutes } from './routes/routes.js'

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('New content available, please refresh');
                            // Could show a update notification here
                        }
                    });
                });
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Start the application with routing when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    console.log('Starting ToddleToy v0.2.15 with Configuration System - Build:', new Date().toISOString());
    
    // Initialize routing system
    window.appRoutes = new AppRoutes();
    
    // Expose for debugging
    window.configManager = window.appRoutes.getConfigManager();
    
    console.log('✅ Application initialized with routing and configuration system');
});