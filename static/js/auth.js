/**
 * auth.js - Authentication functionality for MidWhereAh
 * Fixed version with better logout handling
 */

import { CacheManager } from './utils/cacheManager.js';

class AuthManager {
    constructor() {
        // Prevent multiple instances
        if (window.authManager) {
            return window.authManager;
        }
        
        this.auth = null;
        this.currentUser = null;
        this.initialized = false;
        this.authObserverSet = false;
        this.cacheManager = CacheManager; // Store reference to CacheManager
        
        // Define protected paths globally for consistency
        this.protectedPaths = [
            '/map',
            '/app',
            '/mobile_interface',
            '/venues',
            '/profile',
            '/groups',
            '/group/',
            '/swipe/'
        ];
        
        // Set global reference IMMEDIATELY
        window.authManager = this;
        this.initializeFirebase();
    }
    
    // Initialize Firebase Auth
    async initializeFirebase() {
        try {
            // Wait for Firebase to be available
            if (typeof firebase === 'undefined' || !firebase.apps.length) {
                await new Promise(resolve => {
                    const checkFirebase = setInterval(() => {
                        if (typeof firebase !== 'undefined' && firebase.apps.length) {
                            clearInterval(checkFirebase);
                            this.setupFirebase();
                            resolve();
                        }
                    }, 100);
                });
            } else {
                this.setupFirebase();
            }
        } catch (error) {
            console.error('Error initializing Firebase:', error);
        }
    }
    
    // Setup Firebase services
    setupFirebase() {
        try {
            this.auth = firebase.auth();
            this.initialized = true;
            
            // Initialize auth observer ONLY ONCE
            if (!this.authObserverSet) {
                this.setupAuthObserver();
                this.setupLogout();
            }
        } catch (error) {
            console.error('Error setting up Firebase Auth:', error);
        }
    }
    
    /**
     * Set up Firebase authentication state observer - SINGLE INSTANCE
     */
    setupAuthObserver() {
        if (this.authObserverSet) {
            return; // Already set up
        }

        if (!this.auth) {
            // Retry in 500ms if auth not ready
            setTimeout(() => this.setupAuthObserver(), 500);
            return;
        }
        
        this.authObserverSet = true;
        
        // SINGLE auth state observer
        this.auth.onAuthStateChanged(user => {
            const currentPath = window.location.pathname;
            
            if (user) {
                this.currentUser = user;
                this.handleAuthenticatedUser(user, currentPath);
            } else {
                this.currentUser = null;
                this.handleUnauthenticatedUser(currentPath);
            }
        });
        
        // Check for redirect result ONCE
        this.checkRedirectResult();
    }
    
    handleAuthenticatedUser(user, currentPath) {
        // Only log once per user session
        if (!this.userLogged) {
            this.userLogged = true;
        }
        
        // Handle protected routes
        if (currentPath === '/login' || currentPath === '/auth/login') {
            window.location.replace('/app');
        }
    }
    
    handleUnauthenticatedUser(currentPath) {
        this.userLogged = false;
        
        // Check if current path requires authentication
        const isProtected = this.protectedPaths.some(protectedPath => 
            currentPath.startsWith(protectedPath)
        );
        
        if (isProtected && currentPath !== '/login') {
            window.location.replace('/auth/login');
        }
    }
    
    checkRedirectResult() {
        if (this.redirectChecked) return;
        this.redirectChecked = true;
        
        this.auth.getRedirectResult()
            .then((result) => {
                if (result.user) {
                    // User signed in from redirect
                    window.location.replace('/app');
                }
            })
            .catch((error) => {
                if (error.code !== 'auth/popup-closed-by-user') {
                    console.error('Redirect sign-in error:', error);
                }
            });
    }
    
    /**
     * Set up logout functionality - IMPROVED VERSION
     */
    setupLogout() {
        // Use event delegation for better compatibility
        document.addEventListener('click', (e) => {
            // Check if clicked element or its parent is the logout button
            if (e.target.id === 'logout-btn' || 
                e.target.closest('#logout-btn') || 
                e.target.classList.contains('logout-btn')) {
                e.preventDefault();
                this.handleLogout();
            }
        });
        
        // Also set up direct listener for specific logout button
        const setupDirectListener = () => {
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn && !logoutBtn.hasAttribute('data-logout-setup')) {
                logoutBtn.setAttribute('data-logout-setup', 'true');
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleLogout();
                });
            }
        };
        
        // Try immediately and also after DOM updates
        setupDirectListener();
        setTimeout(setupDirectListener, 1000);
    }
    
    /**
     * Sign out user and clear cache
     */
    async handleLogout() {
        try {
            // Clear all caches using CacheManager
            if (this.cacheManager) {
                try {
                    // Clear all cache types
                    await Promise.all([
                        this.cacheManager.clear('EVENTS'),
                        this.cacheManager.clear('PROFILES'),
                        this.cacheManager.clear('GROUPS'),
                        this.cacheManager.clear('USER_DATA')
                    ]);
                    console.log('All caches cleared on logout');
                } catch (cacheError) {
                    console.error('Error clearing caches on logout:', cacheError);
                    // Continue with logout even if cache clearing fails
                }
            } else if (window.CacheManager) {
                // Fallback to global CacheManager if available
                try {
                    await window.CacheManager.clearAll();
                    console.log('All caches cleared on logout (fallback)');
                } catch (cacheError) {
                    console.error('Error clearing caches on logout (fallback):', cacheError);
                }
            }
            
            // Sign out from Firebase
            if (this.auth) {
                await this.auth.signOut();
            } else if (window.firebase && window.firebase.auth) {
                await window.firebase.auth().signOut();
            }
            
            // Clear any remaining local storage items
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('cache_') || key.startsWith('midwhereah_')) {
                    localStorage.removeItem(key);
                }
            });
            
            // Clear session storage
            sessionStorage.clear();
            
            // Redirect to login page
            window.location.href = '/login';
        } catch (error) {
            console.error('Error during logout:', error);
            // Still redirect even if there's an error
            window.location.href = '/login';
        }
    }
    
    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }
}

// SINGLE initialization with better error handling
document.addEventListener('DOMContentLoaded', function() {
    if (!window.authManager) {
        try {
            new AuthManager();
            console.log('AuthManager initialized successfully');
        } catch (error) {
            console.error('Error initializing AuthManager:', error);
        }
    }
});

// Global logout function as fallback
window.logoutUser = async function() {
    if (window.authManager) {
        await window.authManager.handleLogout();
    } else if (typeof firebase !== 'undefined' && firebase.auth) {
        try {
            // Clear caches if possible
            if (window.CacheManager) {
                await window.CacheManager.clearAll();
            }
            await firebase.auth().signOut();
            window.location.href = '/login';
        } catch (error) {
            console.error('Error during global logout:', error);
            window.location.href = '/login';
        }
    } else {
        window.location.href = '/login';
    }
};