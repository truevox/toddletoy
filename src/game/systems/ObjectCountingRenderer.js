/**
 * ObjectCountingRenderer - Smart dynamic stacking for place value visualization
 * Handles intelligent layout of counting objects (apples, bags, boxes, trucks)
 */
export class ObjectCountingRenderer {
    constructor(scene) {
        this.scene = scene;
        
        // Place value emoji mapping
        this.placeValueEmojis = {
            ones: '🍎',      // Apple = 1s place
            tens: '🛍️',      // Shopping Bag = 10s place  
            hundreds: '📦',  // Box = 100s place
            thousands: '🚛'  // Truck = 1000s place
        };
        
        // Sizing and spacing configuration
        this.emojiSize = 32;
        this.spacing = {
            horizontal: 40,  // Space between place value columns
            vertical: 36     // Space between stacked items
        };
    }

    renderObjectCountingNumeral(number, x, y) {
        if (number < 0 || number > 9999) {
            console.warn('Object counting supports numbers 0-9999 only');
            return [];
        }

        // Decompose number into place values
        const placeValues = this.decomposePlaceValues(number);
        
        // Calculate total width needed for all columns
        const layout = this.calculateColumnLayout(placeValues, x);
        const components = [];

        layout.columns.forEach(column => {
            const columnComponents = this.renderPlaceValueColumn(
                column.place,
                column.count,
                column.centerX,
                y
            );
            components.push(...columnComponents);
        });

        return components;
    }

    decomposePlaceValues(number) {
        return {
            thousands: Math.floor(number / 1000),
            hundreds: Math.floor((number % 1000) / 100),
            tens: Math.floor((number % 100) / 10),
            ones: number % 10
        };
    }

    calculateTotalWidth(placeValues) {
        let totalWidth = 0;
        const places = ['thousands', 'hundreds', 'tens', 'ones'];
        let hasContent = false;
        
        places.forEach((place, index) => {
            const count = placeValues[place];
            if (count > 0) {
                if (hasContent) {
                    totalWidth += this.spacing.horizontal;
                }
                totalWidth += this.getColumnWidth(place, count);
                hasContent = true;
            }
        });
        
        return totalWidth;
    }

    calculateColumnLayout(placeValues, centerX) {
        const totalWidth = this.calculateTotalWidth(placeValues);
        const startX = centerX - (totalWidth / 2);
        const activePlaces = ['thousands', 'hundreds', 'tens', 'ones']
            .filter(place => placeValues[place] > 0);
        const columns = [];
        let currentX = startX;

        activePlaces.forEach((place, index) => {
            const count = placeValues[place];
            const columnWidth = this.getColumnWidth(place, count);
            const columnCenterX = currentX + (columnWidth / 2);

            columns.push({
                place,
                count,
                centerX: columnCenterX,
                width: columnWidth
            });

            currentX += columnWidth;
            if (index < activePlaces.length - 1) {
                currentX += this.spacing.horizontal;
            }
        });

        return {
            totalWidth,
            startX,
            columns
        };
    }

    getColumnWidth(place, count) {
        if (place === 'ones') {
            // Use smart stacking layout for ones (apples)
            const layout = this.calculateOptimalStackingLayout(count);
            return layout.columns * this.emojiSize;
        } else {
            // Single column for higher place values
            return this.emojiSize;
        }
    }

    renderPlaceValueColumn(place, count, x, y) {
        const emoji = this.placeValueEmojis[place];
        const components = [];
        
        if (place === 'ones') {
            // Use smart stacking for apples with interactivity
            const stackedComponents = this.renderStackedApples(count, x, y);
            
            // Make apples interactive for educational counting
            this.makeApplesInteractive(stackedComponents, count);
            
            components.push(...stackedComponents);
        } else {
            // Simple vertical stack for higher place values
            const stackComponents = this.renderSimpleVerticalStack(emoji, count, x, y);
            components.push(...stackComponents);
        }
        
        return components;
    }

    renderStackedApples(count, centerX, centerY) {
        const layout = this.calculateOptimalStackingLayout(count);
        const components = [];
        
        // Calculate starting position for centered layout
        const totalWidth = layout.columns * this.emojiSize;
        const totalHeight = layout.rows * this.spacing.vertical;
        const startX = centerX - (totalWidth / 2) + (this.emojiSize / 2);
        const startY = centerY - (totalHeight / 2) + (this.emojiSize / 2);
        
        let appleIndex = 0;
        
        // Fill the grid pattern
        for (let row = 0; row < layout.rows && appleIndex < count; row++) {
            for (let col = 0; col < layout.columns && appleIndex < count; col++) {
                const x = startX + (col * this.emojiSize);
                const y = startY + (row * this.spacing.vertical);
                
                const apple = this.scene.add.text(x, y, '🍎', {
                    fontSize: `${this.emojiSize}px`,
                    fontFamily: 'Arial, "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif'
                }).setOrigin(0.5, 0.5);
                
                components.push(apple);
                appleIndex++;
            }
        }
        
        console.log(`🍎 Rendered ${count} apples in ${layout.rows}x${layout.columns} grid`);
        return components;
    }

    calculateOptimalStackingLayout(count) {
        if (count <= 0) return { rows: 0, columns: 0 };
        
        // Educational best practices based on research:
        // 1-5: Single horizontal row (supports subitizing)
        // 6-10: Ten-frame (2x5 grid - proven educational tool)
        // 11+: Multiple ten-frames or "squarish" grid algorithm
        
        if (count <= 5) {
            // Single row for easy counting and subitizing
            return { rows: 1, columns: count };
        }
        
        if (count <= 10) {
            // Ten-frame: 2 rows of 5 (educational best practice)
            return { rows: 2, columns: 5 };
        }
        
        if (count <= 20) {
            // Two ten-frames stacked vertically
            return { rows: 4, columns: 5 };
        }
        
        // For larger numbers: Use "squarish" grid algorithm
        // This creates visually stable layouts that avoid being too tall or wide
        const sqrt = Math.sqrt(count);
        let columns = Math.ceil(sqrt);
        let rows = Math.ceil(count / columns);
        
        // Adjust to prefer slightly wider than tall (more stable appearance)
        // and stay within reasonable screen bounds
        const screenWidth = this.scene.scale.width || 800;
        const maxColumns = Math.floor(screenWidth * 0.2 / this.emojiSize); // Max 20% of screen width
        
        if (columns > maxColumns) {
            columns = maxColumns;
            rows = Math.ceil(count / columns);
        }
        
        // Fine-tune for better visual balance
        // Prefer arrangements that look stable and organized
        if (rows > columns * 1.5) {
            // Too tall - redistribute
            columns = Math.min(maxColumns, Math.ceil(Math.sqrt(count * 1.3)));
            rows = Math.ceil(count / columns);
        }
        
        console.log(`📐 Optimal layout for ${count} apples: ${rows}x${columns} (sqrt-based algorithm)`);
        return { rows, columns, aspectRatio: rows / columns };
    }

    renderSimpleVerticalStack(emoji, count, x, y) {
        const components = [];
        const startY = y - ((count - 1) * this.spacing.vertical / 2);
        
        for (let i = 0; i < count; i++) {
            const itemY = startY + (i * this.spacing.vertical);
            
            const item = this.scene.add.text(x, itemY, emoji, {
                fontSize: `${this.emojiSize}px`,
                fontFamily: 'Arial, "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif'
            }).setOrigin(0.5, 0.5);
            
            components.push(item);
        }
        
        return components;
    }

    // Test different layouts for development/debugging
    getLayoutExamples() {
        const examples = [];
        const testCounts = [1, 3, 5, 6, 8, 10, 12, 15, 20, 24, 30, 40, 50];
        
        testCounts.forEach(count => {
            const layout = this.calculateOptimalStackingLayout(count);
            let educationalNote = '';
            
            if (count <= 5) educationalNote = 'Subitizing - instant recognition';
            else if (count <= 10) educationalNote = 'Ten-frame - foundational math tool';
            else if (count <= 20) educationalNote = 'Double ten-frame - building on fundamentals';
            else educationalNote = 'Squarish grid - visual stability';
            
            examples.push({
                count,
                layout: `${layout.rows}x${layout.columns}`,
                aspectRatio: layout.aspectRatio?.toFixed(2) || (layout.rows / layout.columns).toFixed(2),
                educationalApproach: educationalNote
            });
        });
        
        return examples;
    }
    
    // Add interactive touch handling for educational counting
    makeApplesInteractive(appleComponents, totalCount) {
        appleComponents.forEach((apple, index) => {
            apple.setInteractive();
            apple.on('pointerdown', () => {
                // Highlight the touched apple
                apple.setTint(0xffff00); // Yellow highlight
                
                // Voice feedback for counting
                const currentNumber = index + 1;
                if (this.scene.speechManager) {
                    this.scene.speechManager.speakText({
                        data: { en: currentNumber.toString() }
                    }, 'en');
                }
                
                // Play a pleasant counting sound
                this.playCountingSound(currentNumber, totalCount);
                
                // Remove highlight after a short delay
                this.scene.time.delayedCall(300, () => {
                    apple.clearTint();
                });
            });
        });
    }
    
    playCountingSound(currentNumber, totalCount) {
        // Create a pleasant counting tone that gets higher with each number
        if (this.scene.audioManager && this.scene.audioManager.audioContext) {
            try {
                const oscillator = this.scene.audioManager.audioContext.createOscillator();
                const gainNode = this.scene.audioManager.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.scene.audioManager.audioContext.destination);
                
                // Frequency increases with number (musical progression)
                const baseFreq = 400;
                const frequency = baseFreq + (currentNumber * 50);
                oscillator.frequency.value = frequency;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.1, this.scene.audioManager.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, this.scene.audioManager.audioContext.currentTime + 0.2);
                
                oscillator.start();
                oscillator.stop(this.scene.audioManager.audioContext.currentTime + 0.2);
            } catch (error) {
                console.warn('Could not play counting sound:', error);
            }
        }
    }

    /**
     * Calculate the total vertical height of object counting display for a given number
     * Returns the maximum height needed to accommodate all place value columns
     */
    calculateTotalHeight(number) {
        if (number === 0 || number < 0) return 0;
        if (number > 9999) {
            console.warn('Object counting supports numbers 0-9999 only');
            return 0;
        }

        const placeValues = this.decomposePlaceValues(number);
        return this.getMaxColumnHeight(placeValues);
    }

    /**
     * Calculate total height with padding buffer for visual spacing
     * Adds padding above and below the object counting display
     */
    calculateTotalHeightWithPadding(number) {
        const baseHeight = this.calculateTotalHeight(number);
        if (baseHeight === 0) return 0;

        // Add 20px padding above and 20px below = 40px total
        const paddingTop = 20;
        const paddingBottom = 20;
        return baseHeight + paddingTop + paddingBottom;
    }

    /**
     * Find the maximum height among all place value columns
     * This determines the overall vertical extent of the object counting display
     */
    getMaxColumnHeight(placeValues) {
        let maxHeight = 0;
        const places = ['thousands', 'hundreds', 'tens', 'ones'];

        places.forEach(place => {
            const count = placeValues[place];
            if (count > 0) {
                const columnHeight = this.calculateColumnHeight(place, count);
                if (columnHeight > maxHeight) {
                    maxHeight = columnHeight;
                }
            }
        });

        return maxHeight;
    }

    /**
     * Calculate the height of a single place value column
     */
    calculateColumnHeight(place, count) {
        if (count === 0) return 0;

        if (place === 'ones') {
            // Apples use smart stacking layout
            const layout = this.calculateOptimalStackingLayout(count);
            if (layout.rows === 1) {
                // Single row: just the emoji size
                return this.emojiSize;
            } else {
                // Multiple rows: rows * vertical spacing
                return layout.rows * this.spacing.vertical;
            }
        } else {
            // Higher place values use simple vertical stacking
            if (count === 1) {
                // Single item: just the emoji size
                return this.emojiSize;
            } else {
                // Multiple items: count * vertical spacing
                return count * this.spacing.vertical;
            }
        }
    }

    destroy() {
        // Clean up any resources if needed
    }
}
