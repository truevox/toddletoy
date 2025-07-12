
class GridManager {
    constructor(rows, cols, screenWidth, screenHeight, cellPadding = 0) {
        this.rows = rows;
        this.cols = cols;
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        this.cellPadding = cellPadding;
        this.updateDimensions(screenWidth, screenHeight);
    }

    updateDimensions(screenWidth, screenHeight) {
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;

        // Calculate total space taken by padding between cells
        const totalPaddingX = this.cellPadding * (this.cols - 1);
        const totalPaddingY = this.cellPadding * (this.rows - 1);

        // Calculate available space for cells themselves
        const availableWidthForCells = this.screenWidth - totalPaddingX;
        const availableHeightForCells = this.screenHeight - totalPaddingY;

        // Calculate individual cell dimensions
        this.cellWidth = availableWidthForCells / this.cols;
        this.cellHeight = availableHeightForCells / this.rows;

        // Ensure cell dimensions are not negative
        if (this.cellWidth < 0) this.cellWidth = 0;
        if (this.cellHeight < 0) this.cellHeight = 0;

        // Calculate actual grid dimensions (cells + inner padding)
        this.actualGridWidth = (this.cols * this.cellWidth) + totalPaddingX;
        this.actualGridHeight = (this.rows * this.cellHeight) + totalPaddingY;

        // Calculate offsets to center the grid
        this.offsetX = (this.screenWidth - this.actualGridWidth) / 2;
        this.offsetY = (this.screenHeight - this.actualGridHeight) / 2;
    }

    getCellPosition(row, col) {
        if (!this.isValidCell(row, col)) {
            return null;
        }

        // Calculate the top-left corner of the cell, including the initial offset and padding
        const cellX = this.offsetX + (col * (this.cellWidth + this.cellPadding));
        const cellY = this.offsetY + (row * (this.cellHeight + this.cellPadding));

        // Return the center of the cell
        return { x: cellX + (this.cellWidth / 2), y: cellY + (this.cellHeight / 2) };
    }

    getGridCell(x, y) {
        // Adjust coordinates relative to the grid's top-left corner
        const relativeX = x - this.offsetX;
        const relativeY = y - this.offsetY;

        // Check if coordinates are within the grid's actual drawn area
        if (relativeX < 0 || relativeX > this.actualGridWidth ||
            relativeY < 0 || relativeY > this.actualGridHeight) {
            return null;
        }

        // Calculate row and column, accounting for cell dimensions and padding
        let col = Math.floor(relativeX / (this.cellWidth + this.cellPadding));
        let row = Math.floor(relativeY / (this.cellHeight + this.cellPadding));

        // Final check for validity after calculations
        if (!this.isValidCell(row, col)) {
            return null;
        }

        return { row, col };
    }

    isValidCell(row, col) {
        // Ensure row and col are integers before checking bounds
        if (!Number.isInteger(row) || !Number.isInteger(col)) {
            return false;
        }
        return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
    }
}

export default GridManager;
