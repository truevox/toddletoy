import GridManager from './GridManager.js'

/**
 * GridModeController - Grid mode lifecycle, overlay and per-cell spawning.
 * State lives on scene.gridMode; calls go back through the scene so spies intercept.
 */
export class GridModeController {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Initialize Grid Mode based on configuration
     */
    initializeGridMode() {
        const config = this.scene.configManager.getConfig();
        if (config.gridMode && config.gridMode.enabled) {
            console.log('📐 Grid Mode enabled in configuration, initializing...');
            this.scene.enableGridMode();
        } else {
            console.log('📐 Grid Mode disabled (free-form mode active)');
        }
    }

    /**
     * Enable Grid Mode - switch from free-form to structured grid layout
     */
    enableGridMode() {
        const config = this.scene.configManager.getConfig();
        const gridConfig = config.gridMode;

        if (!gridConfig) {
            console.warn('📐 Grid Mode configuration not found');
            return;
        }

        console.log('📐 Enabling Grid Mode...', gridConfig);

        // Create GridManager instance with screen dimensions
        this.scene.gridMode.gridManager = new GridManager(
            gridConfig.rows,
            gridConfig.cols,
            this.scene.sys.game.config.width,
            this.scene.sys.game.config.height,
            gridConfig.cellPadding
        );

        // Enable grid mode
        this.scene.gridMode.enabled = true;

        // Create grid overlay if configured
        if (gridConfig.showGrid) {
            this.scene.createGridOverlay();
        }

        // Disable object dragging in grid mode
        this.scene.objects.forEach(obj => {
            if (obj.input) {
                obj.input.draggable = false;
            }
        });

        // Auto-populate grid if configured
        if (gridConfig.autoPopulate) {
            this.scene.populateGrid();
        }

        console.log('✅ Grid Mode enabled successfully');
    }

    /**
     * Disable Grid Mode - switch from grid to free-form layout
     */
    disableGridMode() {
        console.log('📐 Disabling Grid Mode...');

        if (!this.scene.gridMode.enabled) {
            console.log('📐 Grid Mode already disabled');
            return;
        }

        // Clear grid overlay
        if (this.scene.gridMode.gridOverlay) {
            this.scene.gridMode.gridOverlay.destroy();
            this.scene.gridMode.gridOverlay = null;
        }

        // Clear all cell highlights
        this.scene.gridMode.cellHighlights.forEach((highlight) => {
            if (highlight && highlight.destroy) {
                highlight.destroy();
            }
        });
        this.scene.gridMode.cellHighlights.clear();

        // Clear occupied cells map
        this.scene.gridMode.occupiedCells.clear();

        // Re-enable object dragging in free-form mode
        this.scene.objects.forEach(obj => {
            if (obj.input) {
                obj.input.draggable = true;
            }
        });

        // Disable grid mode
        this.scene.gridMode.enabled = false;
        this.scene.gridMode.gridManager = null;

        console.log('✅ Grid Mode disabled, free-form mode active');
    }

    /**
     * Create visual grid overlay with lines
     */
    createGridOverlay() {
        if (!this.scene.gridMode.gridManager) {
            console.warn('📐 Cannot create grid overlay: GridManager not initialized');
            return;
        }

        const gridManager = this.scene.gridMode.gridManager;

        // Create graphics object for grid lines
        if (!this.scene.gridMode.gridOverlay) {
            this.scene.gridMode.gridOverlay = this.scene.add.graphics();
        }

        // Clear existing graphics
        this.scene.gridMode.gridOverlay.clear();

        // Set line style (semi-transparent white lines)
        this.scene.gridMode.gridOverlay.lineStyle(1, 0xffffff, 0.2);

        // Draw vertical lines
        for (let col = 0; col <= gridManager.cols; col++) {
            const x = gridManager.offsetX + (col * (gridManager.cellWidth + gridManager.cellPadding));
            this.scene.gridMode.gridOverlay.lineBetween(
                x,
                gridManager.offsetY,
                x,
                gridManager.offsetY + gridManager.actualGridHeight
            );
        }

        // Draw horizontal lines
        for (let row = 0; row <= gridManager.rows; row++) {
            const y = gridManager.offsetY + (row * (gridManager.cellHeight + gridManager.cellPadding));
            this.scene.gridMode.gridOverlay.lineBetween(
                gridManager.offsetX,
                y,
                gridManager.offsetX + gridManager.actualGridWidth,
                y
            );
        }

        console.log('📐 Grid overlay created');
    }

    /**
     * Populate grid with random objects
     */
    populateGrid() {
        if (!this.scene.gridMode.gridManager) {
            console.warn('📐 Cannot populate grid: GridManager not initialized');
            return;
        }

        const gridManager = this.scene.gridMode.gridManager;
        console.log(`📐 Populating ${gridManager.rows}x${gridManager.cols} grid...`);

        // Spawn object in each grid cell
        for (let row = 0; row < gridManager.rows; row++) {
            for (let col = 0; col < gridManager.cols; col++) {
                const position = gridManager.getCellPosition(row, col);
                if (position) {
                    // Use existing spawnObjectAt method but mark for grid
                    this.scene.spawnObjectInGridCell(row, col, 'random');
                }
            }
        }

        console.log('✅ Grid populated');
    }

    /**
     * Spawn object in specific grid cell
     */
    async spawnObjectInGridCell(row, col, type = 'random') {
        if (!this.scene.gridMode.gridManager) {
            console.warn('📐 Cannot spawn in grid cell: GridManager not initialized');
            return null;
        }

        const gridManager = this.scene.gridMode.gridManager;

        // Validate cell coordinates
        if (!gridManager.isValidCell(row, col)) {
            console.warn(`📐 Invalid grid cell: ${row},${col}`);
            return null;
        }

        // Get cell center position
        const position = gridManager.getCellPosition(row, col);
        if (!position) {
            console.warn(`📐 Could not get position for cell: ${row},${col}`);
            return null;
        }

        // Check if cell is already occupied
        const cellKey = `${row},${col}`;
        const existingObject = this.scene.gridMode.occupiedCells.get(cellKey);
        if (existingObject) {
            // Remove existing object first (with particle effects, but no auto-respawn since we're about to spawn)
            await this.scene.removeObjectFromGridCell(row, col, false); // false = don't auto-respawn
        }

        // Spawn object at cell center using existing spawn logic
        const obj = await this.scene.spawnObjectAt(position.x, position.y, type);

        if (obj) {
            // Mark object with grid cell info
            obj.gridCell = { row, col };

            // Disable dragging for grid objects
            if (obj.input) {
                obj.input.draggable = false;
            }

            // CRITICAL: Set lastTouchedTime to prevent immediate auto-cleanup
            obj.lastTouchedTime = Date.now();

            // Track in occupied cells map
            this.scene.gridMode.occupiedCells.set(cellKey, obj);

        }

        return obj;
    }

    /**
     * Remove object from specific grid cell
     */
    async removeObjectFromGridCell(row, col, autoRespawn = true) {
        const cellKey = `${row},${col}`;
        const obj = this.scene.gridMode.occupiedCells.get(cellKey);

        if (obj) {

            // Add fun particle effects before removal
            if (obj.x !== undefined && obj.y !== undefined) {
                this.scene.particleManager.createSpawnBurst(obj.x, obj.y);
                // Add a small pop sound effect
                this.scene.audioManager.generateContinuousTone(obj.x, obj.y, obj.id, 100); // Short 100ms tone
            }

            // Clear from occupied cells BEFORE removing (prevents double-respawn)
            this.scene.gridMode.occupiedCells.delete(cellKey);

            // Remove the object (without triggering respawn from removeObject)
            this.scene.removeObject(obj);

            // Auto-respawn a new object in this cell if in grid mode
            if (autoRespawn && this.scene.gridMode.enabled && this.scene.gridMode.gridManager) {
                // Small delay for visual effect
                await new Promise(resolve => setTimeout(resolve, 300));
                await this.scene.spawnObjectInGridCell(row, col, 'random');
            }
        }
    }
}
