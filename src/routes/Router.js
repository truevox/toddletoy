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
        
        // Don't call init() immediately - let AppRoutes set up routes first
        // init() will be called manually after routes are registered
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
        
        console.log(`handleRouteChange called with path: "${path}"`);
        console.log(`Available routes:`, Array.from(this.routes.keys()));
        console.log(`Looking for handler for: "${path}"`);
        
        // Find matching route
        const handler = this.routes.get(path);
        
        console.log(`Handler found:`, !!handler);
        
        if (handler) {
            try {
                console.log(`Executing handler for route: ${path}`);
                handler();
            } catch (error) {
                console.error(`Error handling route ${path}:`, error);
                this.handleNotFound();
            }
        } else {
            console.log(`No handler found for path: "${path}"`);
            // Try default route for unknown paths
            if (path !== this.defaultRoute) {
                console.log(`Redirecting to default route: ${this.defaultRoute}`);
                this.replace(this.defaultRoute);
            } else {
                console.log(`Already at default route, calling handleNotFound`);
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