/**
 * Simple client-side router for the toddler toy application
 * Handles navigation between configuration and game screens
 */
export class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.defaultRoute = '/';
        
        // Listen for browser back/forward navigation
        window.addEventListener('popstate', (event) => {
            this.handleRouteChange(window.location.pathname);
        });
        
        // Handle initial load
        this.init();
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
        this.currentRoute = path;
        
        // Find matching route
        const handler = this.routes.get(path);
        
        if (handler) {
            try {
                handler();
            } catch (error) {
                console.error(`Error handling route ${path}:`, error);
                this.handleNotFound();
            }
        } else {
            // Try default route for unknown paths
            if (path !== this.defaultRoute) {
                this.replace(this.defaultRoute);
            } else {
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
     * Check if currently on a specific route
     */
    isCurrentRoute(path) {
        return this.currentRoute === path;
    }
}