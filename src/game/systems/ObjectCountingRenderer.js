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

        // PHYSICAL STACKING: Stack like building blocks from bottom to top
        // Order from BOTTOM to TOP: trucks (thousands), boxes (hundreds), bags (tens), apples (ones)
        // Each layer sits ON TOP of the layer below with slight horizontal offset
        const components = [];

        // Calculate total height to position from bottom up
        const totalHeight = this.calculateTotalHeight(number);
        let currentY = y + (totalHeight / 2); // Start at bottom

        // Stack from BOTTOM to TOP (reverse order: thousands → hundreds → tens → ones)
        const places = ['thousands', 'hundreds', 'tens', 'ones'];
        const offsets = [0, 0.25, 0.5, 0.75]; // Horizontal offset multiplier per layer

        // Render from bottom (thousands) to top (ones)
        places.forEach((place, layerIndex) => {
            const count = placeValues[place];
            if (count > 0) {
                const stackHeight = this.calculatePlaceStackHeight(place, count);

                // Position this layer ABOVE the previous layer
                currentY -= stackHeight;

                // Apply horizontal offset for visual stacking effect
                const offsetX = x + (offsets[layerIndex] * this.emojiSize);

                const placeComponents = this.renderPlaceValueStack(
                    place,
                    count,
                    offsetX,
                    currentY
                );
                components.push(...placeComponents);

                // Add spacing between layers
                currentY -= this.spacing.vertical;
            }
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

    /**
     * Render a vertical stack for a specific place value
     * All items are centered at the given X coordinate
     */
    renderPlaceValueStack(place, count, centerX, startY) {
        const emoji = this.placeValueEmojis[place];
        const components = [];

        if (place === 'ones') {
            // Apples use square grid layout
            const gridLayout = this.calculateSquareGridLayout(count);
            const gridComponents = this.renderGridApples(count, centerX, startY, gridLayout);

            // Make apples interactive for educational counting
            this.makeApplesInteractive(gridComponents, count);

            components.push(...gridComponents);
        } else {
            // Higher place values: simple vertical stack (single column)
            for (let i = 0; i < count; i++) {
                const itemY = startY + (i * this.spacing.vertical);

                const item = this.scene.add.text(centerX, itemY, emoji, {
                    fontSize: `${this.emojiSize}px`,
                    fontFamily: 'Arial, "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif'
                }).setOrigin(0.5, 0.5);

                components.push(item);
            }
        }

        return components;
    }

    /**
     * Calculate the height of a place value stack
     */
    calculatePlaceStackHeight(place, count) {
        if (count === 0) return 0;
        if (count === 1) return this.emojiSize; // Single item: just emoji size

        if (place === 'ones') {
            const gridLayout = this.calculateSquareGridLayout(count);
            return gridLayout.rows * this.spacing.vertical;
        } else {
            // Simple stack: count * vertical spacing
            return count * this.spacing.vertical;
        }
    }

    /**
     * Calculate square grid layout for apples
     * Makes the grid as square as possible
     */
    calculateSquareGridLayout(count) {
        if (count === 0) return { rows: 0, columns: 0 };
        if (count === 1) return { rows: 1, columns: 1 };

        // Find the most square-like arrangement
        const sqrt = Math.sqrt(count);
        const columns = Math.ceil(sqrt);
        const rows = Math.ceil(count / columns);

        return { rows, columns };
    }

    /**
     * Render apples in a square grid pattern
     */
    renderGridApples(count, centerX, centerY, gridLayout) {
        const components = [];

        // Calculate grid dimensions
        const gridWidth = gridLayout.columns * this.emojiSize;
        const gridHeight = gridLayout.rows * this.spacing.vertical;
        const startX = centerX - (gridWidth / 2) + (this.emojiSize / 2);
        const startY = centerY;

        let appleIndex = 0;

        // Fill the grid
        for (let row = 0; row < gridLayout.rows && appleIndex < count; row++) {
            for (let col = 0; col < gridLayout.columns && appleIndex < count; col++) {
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

        console.log(`🍎 Rendered ${count} apples in ${gridLayout.rows}x${gridLayout.columns} square grid`);
        return components;
    }

    renderStackedApples(count, centerX, centerY) {
        // Cap at educationally meaningful maximum (100 apples)
        // Toddlers can't count 1000s of objects - this keeps it useful
        const MAX_APPLES = 100;
        const displayCount = Math.min(count, MAX_APPLES);
        const showOverflow = count > MAX_APPLES;

        const layout = this.calculateOptimalStackingLayout(displayCount);
        const components = [];

        // Calculate starting position for centered layout
        const totalWidth = layout.columns * this.emojiSize;
        const totalHeight = layout.rows * this.spacing.vertical;
        const startX = centerX - (totalWidth / 2) + (this.emojiSize / 2);
        const startY = centerY - (totalHeight / 2) + (this.emojiSize / 2);

        let appleIndex = 0;

        // Fill the grid pattern
        for (let row = 0; row < layout.rows && appleIndex < displayCount; row++) {
            for (let col = 0; col < layout.columns && appleIndex < displayCount; col++) {
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

        // Add overflow indicator for numbers > 100
        if (showOverflow) {
            const overflowY = startY + (layout.rows * this.spacing.vertical) + 10;
            const overflowText = this.scene.add.text(centerX, overflowY, `(${count} total)`, {
                fontSize: `${Math.floor(this.emojiSize * 0.6)}px`,
                fontFamily: 'Arial, sans-serif',
                color: '#666666'
            }).setOrigin(0.5, 0);

            components.push(overflowText);
            console.log(`🍎 Rendered ${displayCount}/${count} apples (capped at ${MAX_APPLES}) in ${layout.rows}x${layout.columns} grid`);
        } else {
            console.log(`🍎 Rendered ${count} apples in ${layout.rows}x${layout.columns} grid`);
        }

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
        const maxColumns = Math.floor(screenWidth * 0.5 / this.emojiSize); // Max 50% of screen width
        
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
     * Now calculates the TOTAL stacked height of all place values vertically
     */
    calculateTotalHeight(number) {
        if (number === 0 || number < 0) return 0;
        if (number > 9999) {
            console.warn('Object counting supports numbers 0-9999 only');
            return 0;
        }

        const placeValues = this.decomposePlaceValues(number);

        // Sum up all place value heights (they stack vertically now)
        let totalHeight = 0;
        const places = ['thousands', 'hundreds', 'tens', 'ones'];
        let addedPlaces = 0;

        places.forEach(place => {
            const count = placeValues[place];
            if (count > 0) {
                totalHeight += this.calculatePlaceStackHeight(place, count);
                addedPlaces++;
            }
        });

        // Add spacing between place values
        if (addedPlaces > 1) {
            totalHeight += (addedPlaces - 1) * this.spacing.vertical;
        }

        return totalHeight;
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
     * DEPRECATED: This method is kept for backward compatibility with tests
     * Now returns the same as calculateTotalHeight since we stack vertically
     */
    getMaxColumnHeight(placeValues) {
        // Calculate total stacked height
        let totalHeight = 0;
        const places = ['thousands', 'hundreds', 'tens', 'ones'];
        let addedPlaces = 0;

        places.forEach(place => {
            const count = placeValues[place];
            if (count > 0) {
                totalHeight += this.calculatePlaceStackHeight(place, count);
                addedPlaces++;
            }
        });

        // Add spacing between place values
        if (addedPlaces > 1) {
            totalHeight += (addedPlaces - 1) * this.spacing.vertical;
        }

        return totalHeight;
    }

    /**
     * DEPRECATED: This method is kept for backward compatibility with tests
     * Now just calls calculatePlaceStackHeight
     */
    calculateColumnHeight(place, count) {
        return this.calculatePlaceStackHeight(place, count);
    }

    destroy() {
        // Clean up any resources if needed
    }
}
