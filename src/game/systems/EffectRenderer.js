/**
 * EffectRenderer - Handles specialized visual effects rendering
 * Manages cleanup effects, spawn bursts, and fallback graphics
 */
export class EffectRenderer {
    constructor(scene) {
        this.scene = scene;
    }

    createSpawnBurst(x, y) {
        try {
            // Create a burst effect using simple graphics since we don't have texture assets
            const graphics = this.scene.add.graphics();
            
            // Create colorful burst circles
            const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf9ca24, 0xf0932b, 0xeb4d4b, 0x6c5ce7];
            
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const distance = 30 + Math.random() * 20;
                const particleX = x + Math.cos(angle) * distance;
                const particleY = y + Math.sin(angle) * distance;
                
                const color = colors[Math.floor(Math.random() * colors.length)];
                graphics.fillStyle(color);
                graphics.fillCircle(particleX, particleY, 3 + Math.random() * 3);
            }

            // Fade out the burst effect
            this.scene.tweens.add({
                targets: graphics,
                alpha: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    graphics.destroy();
                }
            });

        } catch (error) {
            console.warn('Error creating spawn burst:', error);
        }
    }

    createCleanupParticleEffect(x, y) {
        try {
            // Create festive cleanup burst with celebration colors
            const graphics = this.scene.add.graphics();
            
            // Create colorful celebration circles
            const colors = [0xFFD700, 0xFF69B4, 0x00CED1, 0xFF6347, 0x32CD32, 0x9370DB];
            
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const distance = 25 + Math.random() * 15;
                const particleX = x + Math.cos(angle) * distance;
                const particleY = y + Math.sin(angle) * distance;
                
                const color = colors[Math.floor(Math.random() * colors.length)];
                graphics.fillStyle(color);
                graphics.fillCircle(particleX, particleY, 4 + Math.random() * 2);
            }

            // Fade out with slight expand
            this.scene.tweens.add({
                targets: graphics,
                alpha: 0,
                scaleX: 1.5,
                scaleY: 1.5,
                duration: 800,
                ease: 'Power2',
                onComplete: () => {
                    graphics.destroy();
                }
            });

        } catch (error) {
            console.warn('Error creating cleanup particle effect:', error);
        }
    }

    createFallbackEffect(x, y, objId, particleEmitters) {
        // Simple fallback effect using graphics
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(0xffffff);
        graphics.fillCircle(x, y, 20);
        
        // Fade out effect
        this.scene.tweens.add({
            targets: graphics,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 300,
            onComplete: () => {
                graphics.destroy();
                particleEmitters.delete(objId);
            }
        });

        particleEmitters.set(objId, graphics);
        return graphics;
    }

    createFallbackTrail(object) {
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(0xff6b6b);
        graphics.fillCircle(object.x, object.y, 3);
        
        this.scene.tweens.add({
            targets: graphics,
            alpha: 0,
            duration: 200,
            onComplete: () => graphics.destroy()
        });
    }

    destroy() {
        // No cleanup needed for this utility class
    }
}