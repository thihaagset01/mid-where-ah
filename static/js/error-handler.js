// MidWhereAh - Error Handler Utility

// Error types
const ErrorTypes = {
    NETWORK: 'network',
    AUTH: 'auth',
    PERMISSION: 'permission',
    NOT_FOUND: 'not_found',
    VALIDATION: 'validation',
    API: 'api',
    UNKNOWN: 'unknown'
};

// Error handler class
class ErrorHandler {
    constructor() {
        this.errorListeners = [];
    }

    // Handle error
    handleError(error, context = {}) {
        console.error(`Error in ${context.component || 'unknown component'}:`, error);
        
        // Determine error type
        const errorType = this.determineErrorType(error);
        
        // Create error object
        const errorObj = {
            type: errorType,
            message: this.getErrorMessage(error, errorType),
            originalError: error,
            context: context,
            timestamp: new Date()
        };
        
        // Notify listeners
        this.notifyListeners(errorObj);
        
        // Show user notification
        this.showErrorNotification(errorObj);
        
        // Log to analytics (future implementation)
        // this.logToAnalytics(errorObj);
        
        return errorObj;
    }
    
    // Determine error type based on error object
    determineErrorType(error) {
        // Network errors
        if (error.name === 'NetworkError' || 
            error.message?.includes('network') || 
            error.code === 'failed-precondition' ||
            !navigator.onLine) {
            return ErrorTypes.NETWORK;
        }
        
        // Firebase auth errors
        if (error.code?.startsWith('auth/')) {
            return ErrorTypes.AUTH;
        }
        
        // Firebase permission errors
        if (error.code === 'permission-denied') {
            return ErrorTypes.PERMISSION;
        }
        
        // Not found errors
        if (error.code === 'not-found' || error.status === 404) {
            return ErrorTypes.NOT_FOUND;
        }
        
        // Validation errors
        if (error.name === 'ValidationError' || 
            error.message?.toLowerCase().includes('invalid') ||
            error.code === 'invalid-argument') {
            return ErrorTypes.VALIDATION;
        }
        
        // API errors (Google Maps, Places, etc.)
        if (error.code?.startsWith('PLACES_') || 
            error.code?.startsWith('MAPS_') ||
            error.status === 'REQUEST_DENIED') {
            return ErrorTypes.API;
        }
        
        // Default to unknown
        return ErrorTypes.UNKNOWN;
    }
    
    // Get user-friendly error message
    getErrorMessage(error, errorType) {
        // Use provided message if available
        if (error.userMessage) {
            return error.userMessage;
        }
        
        // Generate message based on error type
        switch (errorType) {
            case ErrorTypes.NETWORK:
                return 'Network connection issue. Please check your internet connection and try again.';
                
            case ErrorTypes.AUTH:
                if (error.code === 'auth/wrong-password') {
                    return 'Incorrect password. Please try again.';
                } else if (error.code === 'auth/user-not-found') {
                    return 'No account found with this email address.';
                } else if (error.code === 'auth/too-many-requests') {
                    return 'Too many failed login attempts. Please try again later.';
                } else if (error.code === 'auth/email-already-in-use') {
                    return 'An account already exists with this email address.';
                }
                return 'Authentication error. Please sign in again.';
                
            case ErrorTypes.PERMISSION:
                return 'You don\'t have permission to perform this action.';
                
            case ErrorTypes.NOT_FOUND:
                return 'The requested resource was not found.';
                
            case ErrorTypes.VALIDATION:
                return 'Please check your input and try again.';
                
            case ErrorTypes.API:
                if (error.status === 'ZERO_RESULTS') {
                    return 'No results found. Try adjusting your search criteria.';
                } else if (error.status === 'OVER_QUERY_LIMIT') {
                    return 'API usage limit exceeded. Please try again later.';
                } else if (error.status === 'REQUEST_DENIED') {
                    return 'API request was denied. Please check your API key.';
                }
                return 'Error connecting to external service. Please try again later.';
                
            default:
                return error.message || 'An unexpected error occurred. Please try again.';
        }
    }
    
    // Add error listener
    addListener(callback) {
        if (typeof callback === 'function') {
            this.errorListeners.push(callback);
        }
    }
    
    // Remove error listener
    removeListener(callback) {
        this.errorListeners = this.errorListeners.filter(listener => listener !== callback);
    }
    
    // Notify all listeners
    notifyListeners(errorObj) {
        this.errorListeners.forEach(listener => {
            try {
                listener(errorObj);
            } catch (e) {
                console.error('Error in error listener:', e);
            }
        });
    }
    
    // Show error notification to user
    showErrorNotification(errorObj) {
        // Use existing notification system if available
        if (typeof showNotification === 'function') {
            showNotification(errorObj.message, 'danger');
            return;
        }
        
        // Fallback to toast if available
        const toast = document.getElementById('notification-toast');
        const toastMessage = document.getElementById('notification-message');
        
        if (toast && toastMessage) {
            // Set message
            toastMessage.textContent = errorObj.message;
            
            // Remove existing color classes
            toast.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info');
            
            // Add danger class
            toast.classList.add('bg-danger');
            
            // Show toast
            const bsToast = new bootstrap.Toast(toast);
            bsToast.show();
            return;
        }
        
        // Last resort: alert
        alert(errorObj.message);
    }
    
    // Retry a failed operation
    retry(operation, maxRetries = 3, delay = 1000) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            
            const attempt = () => {
                attempts++;
                
                Promise.resolve(operation())
                    .then(resolve)
                    .catch(error => {
                        if (attempts >= maxRetries) {
                            // Max retries reached, handle the error
                            this.handleError(error, { 
                                component: 'retry',
                                attempts: attempts
                            });
                            reject(error);
                            return;
                        }
                        
                        // Wait and try again
                        setTimeout(attempt, delay * attempts);
                    });
            };
            
            attempt();
        });
    }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Helper function to wrap async functions with error handling
function withErrorHandling(asyncFn, context = {}) {
    return async function(...args) {
        try {
            return await asyncFn(...args);
        } catch (error) {
            errorHandler.handleError(error, context);
            throw error; // Re-throw to allow caller to handle if needed
        }
    };
}

// Export error handler
window.errorHandler = errorHandler;
window.withErrorHandling = withErrorHandling;
window.ErrorTypes = ErrorTypes;
