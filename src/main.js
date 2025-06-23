import Phaser from 'phaser'
import { ToddlerToyGame } from './game.js'

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

// Start the game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    console.log('Starting Toddler Toy Game v3 with full keyboard support');
    new ToddlerToyGame();
});