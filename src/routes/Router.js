/**
 * Simple client-side router for the toddler toy application
 * Handles navigation between configuration and game screens
 */
export class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.defaultRoute = '/';
        this.previousRoute = null;
        this.allowDirectToyAccess = false; // Track if toy access is allowed
        
        // Check if this is a refresh from toy route
        this.isRefreshFromToy = this.detectRefreshFromToy();
        
        // Listen for browser back/forward navigation
        window.addEventListener('popstate', (event) => {
            this.handleRouteChange(window.location.pathname);
        });
        
        // Don't call init() immediately - let AppRoutes set up routes first
        // init() will be called manually after routes are registered
    }

    /**
     * Detect if this is a refresh from the toy route
     */
    detectRefreshFromToy() {
        const currentPath = window.location.pathname;
        
        // Check if we're on toy route AND there's saved game state (indicates user was playing)
        if (currentPath === '/toy') {
            const hasGameState = localStorage.getItem('toddleToyGameState') !== null;
            const hasConfig = localStorage.getItem('toddleToyConfig') !== null;
            
            // If we have both game state and config, user was likely on toy route before refresh
            if (hasGameState && hasConfig) {
                console.log('🔍 Refresh from toy detected: found game state and config');
                return true;
            }
        }
        
        return false;
    }

    /**
     * Register a route with its handler function
     */
    addRoute(path, handler) {
        this.routes.set(path, handler);
    }

    /**
     * Initialize router and handle current URL
     */
    init() {
        const currentPath = window.location.pathname || this.defaultRoute;
        this.handleRouteChange(currentPath);
    }

    /**
     * Navigate to a specific path
     */
    navigate(path) {
        if (path !== this.currentRoute) {
            window.history.pushState({}, '', path);
            this.handleRouteChange(path);
        }
    }

    /**
     * Replace current route without adding to history
     */
    replace(path) {
        window.history.replaceState({}, '', path);
        this.handleRouteChange(path);
    }

    /**
     * Handle route changes
     */
    handleRouteChange(path) {
        this.previousRoute = this.currentRoute;
        this.currentRoute = path;
        
        // Handle toy access logic
        if (path === '/toy') {
            // If this is a refresh from toy route, preserve access
            if (this.isRefreshFromToy) {
                console.log('🔄 Detected refresh from toy route, preserving access');
                this.allowDirectToyAccess = true;
                this.isRefreshFromToy = false; // Reset flag after use
            }
            // Don't reset toy access when staying on toy route
        } else {
            // Reset toy access when leaving toy route
            this.resetToyAccess();
        }
        
        // Handling route change
        console.log(`Looking for handler for: "${path}"`);
        
        // Find matching route
        const handler = this.routes.get(path);
        
        console.log(`Handler found:`, !!handler);
        
        if (handler) {
            try {
                // Executing route handler
                handler();
            } catch (error) {
                console.error(`Error handling route ${path}:`, error);
                this.handleNotFound();
            }
        } else {
            console.log(`No handler found for path: "${path}"`);
            // Try default route for unknown paths
            if (path !== this.defaultRoute) {
                // Redirecting to default route
                this.replace(this.defaultRoute);
            } else {
                // Already at default route
                this.handleNotFound();
            }
        }
    }

    /**
     * Handle 404 / not found cases
     */
    handleNotFound() {
        console.warn(`Route not found: ${this.currentRoute}, redirecting to default`);
        if (this.currentRoute !== this.defaultRoute) {
            this.replace(this.defaultRoute);
        }
    }

    /**
     * Get current route
     */
    getCurrentRoute() {
        return this.currentRoute;
    }

    /**
     * Allow direct access to toy (called when user goes through config)
     */
    allowToyAccess() {
        this.allowDirectToyAccess = true;
    }

    /**
     * Check if toy access is allowed
     */
    isToyAccessAllowed() {
        return this.allowDirectToyAccess;
    }

    /**
     * Reset toy access (for security)
     */
    resetToyAccess() {
        this.allowDirectToyAccess = false;
    }

    /**
     * Check if currently on a specific route
     */
    isCurrentRoute(path) {
        return this.currentRoute === path;
    }
}