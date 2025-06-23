import Phaser from 'phaser'
import { ToddlerToyGame } from './game.js'

// Start the game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    new ToddlerToyGame();
});