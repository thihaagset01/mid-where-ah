/**
 * navigation.js - Navigation functionality for MidWhereAh
 * Handles responsive navigation for both mobile and desktop interfaces
 */

class NavigationManager {
    constructor() {
        // Store the raw pathname
        this.rawPath = window.location.pathname;
        // Ensure currentPage is always a string
        this.currentPage = this.rawPath || '/';
        this.isMobile = window.innerWidth < 768;
        
        console.log('NavigationManager created with path:', this.rawPath);
        
        // Navigation items configuration with route patterns
        this.navItems = [
            { id: 'home', icon: 'fa-home', label: 'Home', path: '/app', pathPattern: /^\/app(\/|$)/ },
            { id: 'compass', icon: 'fa-compass', label: 'Explore', path: '/mobile/explore', pathPattern: /^\/mobile\/explore(\/|$)/ },
            { id: 'create', icon: 'fa-plus', label: 'Create', path: '#', isAction: true },
            { id: 'groups', icon: 'fa-users', label: 'Groups', path: '/mobile/groups', pathPattern: /^\/mobile\/groups(\/|$)/ },
            { id: 'profile', icon: 'fa-user', label: 'Profile', path: '/mobile/profile', pathPattern: /^\/mobile\/profile(\/|$)/ }
        ];
        
        // Bind methods to preserve 'this' context
        this.handleResize = this.handleResize.bind(this);
        this.closeCreateModal = this.closeCreateModal.bind(this);
        this.handleNavClick = this.handleNavClick.bind(this);
    }
    
    /**
     * Initialize navigation manager
     */
    init() {
        console.log('Initializing navigation for path:', this.currentPage);
        
        // Update current page to ensure active highlighting works
        this.currentPage = window.location.pathname || '/';
        console.log('Current page set to:', this.currentPage);
        
        // Set up resize handler
        window.addEventListener('resize', this.handleResize);
        
        // Setup navigation event listeners
        this.setupNavigationListeners();
        
        // Set active page
        this.updateActiveNavigation();
        
        return this;
    }
    
    /**
     * Setup navigation event listeners for existing HTML elements
     */
    setupNavigationListeners() {
        // Get all nav items from the existing HTML
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(navItem => {
            const pageId = navItem.getAttribute('data-page');
            
            // Remove existing event listeners to prevent duplicates
            navItem.removeEventListener('click', this.handleNavClick);
            
            // Add click event listener
            navItem.addEventListener('click', (e) => this.handleNavClick(e, pageId));
        });
        
        console.log(`Set up listeners for ${navItems.length} navigation items`);
    }
    
    /**
     * Handle navigation item clicks
     */
    handleNavClick(event, pageId) {
        event.preventDefault();
        event.stopPropagation();
        
        console.log(`Navigation clicked: ${pageId}`);
        
        // Find the navigation item configuration
        const navItem = this.navItems.find(item => item.id === pageId);
        
        if (!navItem) {
            console.warn(`No navigation configuration found for: ${pageId}`);
            return;
        }
        
        // Handle special create action
        if (navItem.isAction) {
            this.handleCreateAction(event);
        } else {
            // Navigate to the page
            console.log(`Navigating to: ${navItem.path}`);
            window.location.href = navItem.path;
        }
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth < 768;
        
        // If the device type changed, update navigation
        if (wasMobile !== this.isMobile) {
            this.updateActiveNavigation();
        }
    }
    
    /**
     * Handle create button action
     */
    handleCreateAction(event) {
        if (event) {
            event.stopPropagation();
        }
        
        console.log('Create button clicked');
        
        // Get the dropdown menu and popup elements
        const dropdownMenu = document.getElementById('dropdown-menu');
        const createPopup = document.querySelector('.nav-create-popup');
        
        // Use the popup if it exists, otherwise fallback to dropdown
        const popup = createPopup || dropdownMenu;
        
        if (!popup) {
            console.warn('No create popup found');
            return;
        }
        
        console.log('Toggling create popup visibility');
        
        // Toggle visibility
        const isHidden = popup.classList.contains('hidden');
        
        if (isHidden) {
            // Show popup
            popup.classList.remove('hidden');
            
            // Add click-outside-to-close handler
            setTimeout(() => {
                document.addEventListener('click', this.closeCreateModal);
            }, 10);
            
            // Setup popup item clicks if they exist
            this.setupCreatePopupListeners(popup);
        } else {
            // Hide popup
            popup.classList.add('hidden');
            document.removeEventListener('click', this.closeCreateModal);
        }
    }
    
    /**
     * Setup create popup item listeners
     */
    setupCreatePopupListeners(popup) {
        // Handle popup icons
        const popupIcons = popup.querySelectorAll('.pop-icon');
        
        popupIcons.forEach((icon, index) => {
            icon.removeEventListener('click', this.handlePopupIconClick);
            icon.addEventListener('click', (e) => this.handlePopupIconClick(e, index));
        });
        
        // Handle dropdown items if they exist
        const dropdownItems = popup.querySelectorAll('.dropdown-item');
        dropdownItems.forEach(item => {
            item.removeEventListener('click', this.handleDropdownItemClick);
            item.addEventListener('click', (e) => this.handleDropdownItemClick(e));
        });
    }
    
    /**
     * Handle popup icon clicks
     */
    handlePopupIconClick(event, index) {
        event.preventDefault();
        event.stopPropagation();
        
        console.log(`Popup icon ${index} clicked`);
        
        // Define actions for each popup icon
        const actions = [
            () => window.location.href = '/create-group',     // User icon
            () => window.location.href = '/create-meetup',    // Calendar icon  
            () => window.location.href = '/explore'           // Compass icon
        ];
        
        if (actions[index]) {
            actions[index]();
        }
        
        // Close the popup
        const popup = document.querySelector('.nav-create-popup') || document.getElementById('dropdown-menu');
        if (popup) {
            popup.classList.add('hidden');
        }
    }
    
    /**
     * Handle dropdown item clicks
     */
    handleDropdownItemClick(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const text = event.target.textContent.trim();
        console.log(`Dropdown item clicked: ${text}`);
        
        // Handle based on text content
        if (text.includes('Group')) {
            window.location.href = '/create-group';
        } else if (text.includes('Meetup')) {
            window.location.href = '/create-meetup';
        }
        
        // Close the popup
        const popup = document.querySelector('.nav-create-popup') || document.getElementById('dropdown-menu');
        if (popup) {
            popup.classList.add('hidden');
        }
    }
    
    /**
     * Close create modal
     */
    closeCreateModal(event) {
        const popup = document.querySelector('.nav-create-popup') || document.getElementById('dropdown-menu');
        const createButton = document.querySelector('.nav-item[data-page="create"]');
        
        if (!popup) return;
        
        // If clicking outside the popup and not on the create button
        if (!popup.contains(event.target) && 
            event.target !== createButton && 
            !createButton.contains(event.target)) {
            
            popup.classList.add('hidden');
            document.removeEventListener('click', this.closeCreateModal);
        }
    }
    
    /**
     * Check if a path matches the current page
     */
    isCurrentPage(path, pathPattern) {
        // If we have a regex pattern, use it for matching
        if (pathPattern) {
            return pathPattern.test(this.currentPage);
        }
        // Otherwise do exact match
        return this.currentPage === path;
    }
    
    /**
     * Update active navigation highlighting
     */
    updateActiveNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(navItem => {
            const pageId = navItem.getAttribute('data-page');
            const navConfig = this.navItems.find(item => item.id === pageId);
            
            if (navConfig) {
                if (this.isCurrentPage(navConfig.path, navConfig.pathPattern)) {
                    navItem.classList.add('active');
                } else {
                    navItem.classList.remove('active');
                }
            }
        });
        
        console.log('Updated active navigation state');
    }
    
    /**
     * Set active navigation item manually
     */
    setActivePage(pageId) {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(navItem => {
            if (navItem.getAttribute('data-page') === pageId) {
                navItem.classList.add('active');
            } else {
                navItem.classList.remove('active');
            }
        });
        
        console.log(`Manually set ${pageId} as active`);
    }
    
    /**
     * Navigate to a page
     */
    navigateTo(path) {
        console.log(`Navigating to: ${path}`);
        window.location.href = path;
    }
}

// Initialize immediately and on DOM ready
let isInitialized = false;

function initializeNavigation() {
    // Prevent multiple initializations
    if (isInitialized) {
        console.log('Navigation already initialized, skipping...');
        return;
    }
    
    console.log('Initializing navigation manager...');
    
    // Create or reinitialize global instance
    if (window.navigationManager) {
        // Cleanup existing instance
        window.removeEventListener('resize', window.navigationManager.handleResize);
        document.removeEventListener('click', window.navigationManager.closeCreateModal);
    }
    
    // Create new instance
    window.navigationManager = new NavigationManager();
    
    // Initialize navigation manager
    window.navigationManager.init();
    
    isInitialized = true;
    console.log('Navigation manager ready');
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM fully loaded, initializing navigation...');
        initializeNavigation();
    });
} else {
    // DOM is already loaded
    console.log('DOM already loaded, initializing navigation immediately...');
    initializeNavigation();
}

// Handle browser back/forward and page show events
const handleNavigation = function() {
    console.log('Navigation event detected, reinitializing navigation...');
    // Reset the initialization flag when navigating
    isInitialized = false;
    // Small delay to ensure DOM is ready
    setTimeout(initializeNavigation, 100);
};

// Use a single event listener for navigation events
window.addEventListener('pageshow', handleNavigation);
window.addEventListener('popstate', handleNavigation);

// Export for testing if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NavigationManager, initializeNavigation };
}