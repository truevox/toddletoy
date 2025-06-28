# Grid Mode Implementation Plan

## Overview
Grid Mode is a structured layout where objects (aka things) are arranged in a fixed grid pattern, providing a more organized and predictable interface for toddlers. Unlike free-form mode where objects can be placed anywhere, Grid Mode restricts placement to predefined grid positions.

## Core Features

### Grid Layout System
- **Responsive Grid**: Automatically adjusts grid size based on screen dimensions
- **Cell-based Positioning**: Objects snap to grid cells, no free positioning
- **Consistent Spacing**: Equal spacing between all grid items
- **Visual Grid**: Optional grid lines/guides for better visual structure

### Interaction Model
- **No Object Movement**: Objects stay in their assigned grid cells (no dragging)
- **Touch/Click to Voice**: Primary interaction is voicing objects by touching them
- **Grid Navigation**: Keyboard/gamepad navigation moves between grid cells
- **Cell Replacement**: New spawns replace existing objects in selected cells. This happens on the same despawn timer as with the normal mode (which is to say, if it hasn't been interacted with in a configurable amount of time).

### Configuration Integration
- **Grid Mode Toggle**: Add to config screen as a separate interaction mode
- **Grid Size Options**: Configurable grid dimensions (3x3, 4x4, 5x5, 6x6)
- **Auto-Population**: Pre-fill grid with random objects
- **Age-Appropriate Sizing**: Larger cells for younger children

## Implementation Plan

### Phase 1: Core Grid Infrastructure
- [ ] Create `GridManager` class for grid layout calculations
- [ ] Implement responsive grid sizing based on screen dimensions
- [ ] Add grid visualization (optional overlay with cell boundaries)
- [ ] Create grid position mapping (cell coordinates to screen positions)

### Phase 2: Grid Interaction System
- [ ] Modify input handlers to work with grid cells instead of free positions
- [ ] Implement cell selection system (highlight current cell)
- [ ] Add keyboard/gamepad navigation between cells
- [ ] Disable object dragging in grid mode

### Phase 3: Object Management in Grid
- [ ] Update `spawnObjectAt()` to work with grid cells
- [ ] Implement cell replacement logic (remove existing, place new)
- [ ] Add grid-specific object positioning and sizing
- [ ] Ensure proper cleanup when switching modes

### Phase 4: Configuration Integration
- [ ] Add Grid Mode section to ConfigScreen
- [ ] Include grid size options (3x3 to 6x6)
- [ ] Add auto-population toggle
- [ ] Add mode switching (Free-form vs Grid)

### Phase 5: Enhanced Features
- [ ] Grid animation effects (cell highlighting, transitions)
- [ ] Grid-specific particle effects
- [ ] Cell focus indicators for better accessibility
- [ ] Grid-based auto-cleanup (unused cells)

## Technical Specifications

### Grid Manager Class
```javascript
class GridManager {
    constructor(rows, cols, screenWidth, screenHeight) {
        this.rows = rows;
        this.cols = cols;
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        this.cellWidth = 0;
        this.cellHeight = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.calculateGrid();
    }

    calculateGrid() {
        // Calculate cell dimensions and offsets for centered grid
    }

    getCellPosition(row, col) {
        // Return screen coordinates for grid cell
    }

    getGridCell(screenX, screenY) {
        // Return grid coordinates for screen position
    }

    isValidCell(row, col) {
        // Check if cell coordinates are within grid bounds
    }
}
```

### Configuration Options
```javascript
gridMode: {
    enabled: false,           // Enable/disable grid mode
    rows: 4,                 // Grid rows (3-6)
    cols: 4,                 // Grid columns (3-6) 
    showGrid: true,          // Show grid lines
    autoPopulate: false,     // Pre-fill with random objects
    cellPadding: 10         // Padding within each cell
}
```

### Input Handling Modifications
- **Pointer Events**: Map clicks to grid cells instead of exact coordinates
- **Keyboard Navigation**: Arrow keys move between cells, space/enter to activate
- **Gamepad Support**: D-pad/analog stick for cell navigation
- **Touch Gestures**: Swipe to navigate, tap to activate

## User Experience Considerations

### Accessibility
- Clear visual indicators for current cell selection
- High contrast cell boundaries for better visibility
- Audio feedback for cell navigation
- Support for screen readers with cell position announcements

### Age Appropriateness
- **2-3 years**: 3x3 grid with large cells and simple objects
- **3-4 years**: 4x4 grid with more variety
- **4-5 years**: 5x5 or 6x6 grid with complex objects and multiple languages

### Visual Design
- Subtle grid lines that don't distract from content
- Smooth transitions when navigating between cells
- Consistent object sizing within cells
- Optional themes (colorful borders, rounded cells, etc.)

## Testing Strategy

### Unit Tests
- Grid position calculations
- Cell coordinate mapping
- Boundary checking
- Responsive grid sizing

### Integration Tests
- Mode switching (free-form ↔ grid)
- Object placement in grid cells
- Input handling in grid mode
- Configuration persistence

### Browser Tests
- Visual regression testing for grid layout
- Cross-device compatibility
- Touch/keyboard/gamepad navigation
- Performance with different grid sizes

## Migration Strategy

### Backward Compatibility
- Maintain existing free-form mode as default
- Gradual introduction of grid mode as optional feature
- Preserve existing configuration options
- Ensure smooth transitions between modes

### Data Migration
- No breaking changes to existing object data
- Grid configuration as additive enhancement
- Fallback to free-form if grid mode fails

## Future Enhancements

### Advanced Grid Features
- **Categorized Grids**: Dedicate grid areas to specific content types
- **Grid Themes**: Different visual styles for grid appearance
- **Grid Animations**: Smooth object transitions between cells
- **Grid Presets**: Pre-configured grids for different learning objectives

### Educational Features
- **Sequential Learning**: Grid cells reveal content in order
- **Memory Games**: Hide/reveal grid objects for memory training
- **Pattern Recognition**: Highlight patterns within the grid
- **Progressive Difficulty**: Unlock more grid cells as child progresses

### Customization Options
- **Parent/Teacher Mode**: Allow educators to pre-configure grid content
- **Curriculum Integration**: Align grid content with learning objectives
- **Progress Tracking**: Monitor which grid cells are used most
- **Custom Grid Shapes**: Non-rectangular grids for variety

## Success Metrics

### Usability Metrics
- Time to first successful interaction in grid mode
- Frequency of grid mode usage vs free-form
- Error rate in grid navigation
- User retention with grid mode enabled

### Educational Metrics
- Learning objective completion rate
- Content engagement time per grid cell
- Language learning progression with grid structure
- Parent/educator satisfaction with grid mode

### Technical Metrics
- Grid rendering performance across devices
- Memory usage with different grid sizes
- Battery impact on mobile devices
- Accessibility compliance scores

---

**Note**: This plan provides a comprehensive roadmap for implementing Grid Mode while maintaining the existing free-form interaction model. The phased approach ensures minimal disruption to current functionality while adding significant value for structured learning scenarios.