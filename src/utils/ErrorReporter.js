/**
 * ErrorReporter - Centralized error logging with version tracking
 *
 * Includes version information in all error reports for easier debugging
 */

import packageJson from '../../package.json';

export class ErrorReporter {
    /**
     * Report an error with context and version information
     * @param {Error} error - The error object
     * @param {Object} context - Additional context about where/when the error occurred
     * @returns {Object} The error report
     */
    static report(error, context = {}) {
        const errorReport = {
            version: packageJson.version,
            timestamp: new Date().toISOString(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            context
        };

        console.error('🚨 Error Report:', errorReport);

        // Future: Send to analytics/error tracking service
        // if (window.gtag) {
        //     window.gtag('event', 'exception', {
        //         description: error.message,
        //         fatal: false,
        //         version: packageJson.version
        //     });
        // }

        return errorReport;
    }

    /**
     * Report a warning (non-critical issue)
     * @param {string} message - Warning message
     * @param {Object} context - Additional context
     */
    static warn(message, context = {}) {
        const warningReport = {
            version: packageJson.version,
            timestamp: new Date().toISOString(),
            level: 'warning',
            message,
            context
        };

        console.warn('⚠️ Warning:', warningReport);

        return warningReport;
    }

    /**
     * Get current version for display
     * @returns {string} Current version
     */
    static getVersion() {
        return packageJson.version;
    }
}
