/**
 * auth.js - Authentication functionality for MidWhereAh
 * Handles user authentication, login/logout, and protected routes
 */

class AuthManager {
    constructor() {
        this.auth = firebase.auth();
        this.currentUser = null;
        
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
        
        console.log('AuthManager initialized');
    }
    
    /**
     * Initialize authentication
     */
    init() {
        this.setupAuthObserver();
        this.setupLogout();
        return this;
    }
    
    /**
     * Set up Firebase authentication state observer
     */
    setupAuthObserver() {
        console.log('Setting up auth observer and checking for redirect result');
        
        // First check for any redirect result
        // This must be done before any other auth operations
        this.auth.getRedirectResult().then((result) => {
            if (result.user) {
                console.log('Google sign-in successful via redirect:', result.user.email);
                // Check if user is new
                const isNewUser = result.additionalUserInfo && result.additionalUserInfo.isNewUser;
                
                // Get the ID token and store it in a cookie for server-side auth
                result.user.getIdToken().then((idToken) => {
                    this.setAuthCookie('id_token', idToken);
                });
                
                if (isNewUser) {
                    // Create user document in Firestore
                    return firebase.firestore().collection('users').doc(result.user.uid).set({
                        name: result.user.displayName,
                        email: result.user.email,
                        photoURL: result.user.photoURL,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    }).then(() => {
                        if (typeof showNotification === 'function') {
                            showNotification('Account created successfully!', 'success');
                        }
                        // Force redirect to app (mobile interface)
                        console.log('Redirecting new user to app');
                        setTimeout(() => {
                            window.location.replace('/app');
                        }, 500); // Small delay to ensure notification is shown
                    });
                } else {
                    if (typeof showNotification === 'function') {
                        showNotification('Login successful!', 'success');
                    }
                    // Redirect to app
                    console.log('Redirecting existing user to app');
                    setTimeout(() => {
                        window.location.replace('/app');
                    }, 500); // Small delay to ensure notification is shown
                }
            } else {
                console.log('No redirect result or user already handled');
            }
        }).catch((error) => {
            console.error('Google redirect result error:', error);
            if (error.code && error.message && typeof showNotification === 'function') {
                showNotification('Authentication error: ' + error.message, 'danger');
            }
        });

        // Then set up the auth state observer
        this.auth.onAuthStateChanged((user) => {
            const currentPath = window.location.pathname;
            console.log('Auth state changed. Path:', currentPath, 'User:', user ? user.email : 'none');
        
            if (user) {
                // User is signed in
                console.log('User authenticated:', user.email);
                this.currentUser = user;
                
                // Update UI for authenticated user
                this.updateUIForAuthenticatedUser(user);
            } else {
                // User is signed out
                console.log('User not authenticated');
                this.currentUser = null;
                
                // Update UI for unauthenticated user
                this.updateUIForUnauthenticatedUser();
                
                // Redirect to login if on protected pages
                this.redirectIfProtectedPage();
            }
        });
    }
    
    /**
     * Redirect if on a protected page and not authenticated
     */
    redirectIfProtectedPage() {
        const currentPath = window.location.pathname;
        
        if (this.protectedPaths.some(path => currentPath.startsWith(path))) {
            console.log('Redirecting to login from protected path:', currentPath);
            window.location.href = '/login';
        }
    }
    
    /**
     * Update UI elements for authenticated user
     */
    updateUIForAuthenticatedUser(user) {
        // Show logout link, hide login link
        document.getElementById('logout-nav')?.style.setProperty('display', 'block');
        document.getElementById('login-nav')?.style.setProperty('display', 'none');
        
        // Update user name if element exists
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = user.displayName || user.email.split('@')[0];
        }
        
        // Update profile picture if element exists
        const userProfilePic = document.getElementById('user-profile-pic');
        if (userProfilePic && user.photoURL) {
            userProfilePic.src = user.photoURL;
            userProfilePic.style.display = 'block';
        }
    }
    
    /**
     * Update UI elements for unauthenticated user
     */
    updateUIForUnauthenticatedUser() {
        // Show login link, hide logout link
        document.getElementById('login-nav')?.style.setProperty('display', 'block');
        document.getElementById('logout-nav')?.style.setProperty('display', 'none');
        
        // Clear user name if element exists
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = 'Guest';
        }
        
        // Hide profile picture if element exists
        const userProfilePic = document.getElementById('user-profile-pic');
        if (userProfilePic) {
            userProfilePic.style.display = 'none';
        }
    }
    
    /**
     * Set up logout functionality
     */
    setupLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.signOut();
            });
        }
    }
    
    /**
     * Sign out the current user
     */
    signOut() {
        this.auth.signOut().then(() => {
            // Sign-out successful
            console.log('Logout successful, redirecting to login page');
            // Force redirect to login page
            setTimeout(() => {
                window.location.replace('/login');
            }, 500);
        }).catch((error) => {
            // An error happened
            console.error('Logout error:', error);
        });
    }
    
    /**
     * Sign in with Google
     */
    signInWithGoogle() {
        // Log the current Firebase config (safely)
        const safeConfig = {...window.firebaseConfig};
        if (safeConfig.apiKey) {
            safeConfig.apiKey = safeConfig.apiKey.substring(0, 5) + '...';
        }
        console.log('Firebase config before Google sign-in:', safeConfig);
        
        try {
            // Only use redirect method to avoid popup issues
            const provider = new firebase.auth.GoogleAuthProvider();
            
            // Directly use redirect without checking for previous redirects
            // This prevents the dual-window issue
            this.auth.signInWithRedirect(provider)
                .catch((error) => {
                    console.error("Google sign-in redirect error:", error);
                    console.error("Error code:", error.code);
                    console.error("Error message:", error.message);
                    
                    if (error.code === 'auth/api-key-not-valid') {
                        if (typeof showToast === 'function') {
                            showToast("Invalid API key. Please check your Firebase configuration.", "error");
                        }
                    } else {
                        if (typeof showToast === 'function') {
                            showToast("Error signing in with Google. Please try again.", "error");
                        }
                    }
                });
        } catch (e) {
            console.error("Exception during Google sign-in setup:", e);
            if (typeof showToast === 'function') {
                showToast("Error initializing Google sign-in. Please try again later.", "error");
            }
        }
    }
    
    /**
     * Set authentication cookie
     */
    setAuthCookie(name, value, days = 7) {
        const expires = new Date();
        expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
    }
    
    /**
     * Get the current user
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.currentUser;
    }
}

// Create global instance
window.authManager = new AuthManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize auth manager
    window.authManager.init();
    
    // Set up login buttons
    const loginButtons = document.querySelectorAll('.google-signin-btn');
    loginButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            window.authManager.signInWithGoogle();
        });
    });
});
