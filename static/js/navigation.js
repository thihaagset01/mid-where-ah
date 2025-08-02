/**
 * Navigation Manager - Prevents duplicate initializations
 */
class NavigationManager {
    constructor() {
        this.currentPath = window.location.pathname;
        this.initialized = false;
        this.navItems = [];
        
        // Prevent multiple instances
        if (window.navigationManager) {
            return window.navigationManager;
        }
        window.navigationManager = this;
    }

    init() {
        // Prevent duplicate initialization
        if (this.initialized) {
            return;
        }

        this.currentPath = window.location.pathname;
        this.setupNavigation();
        this.initialized = true;
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        if (navItems.length === 0) return;

        // Clear existing listeners to prevent duplicates
        this.navItems.forEach(item => {
            item.removeEventListener('click', this.handleNavClick);
        });

        this.navItems = Array.from(navItems);
        this.navItems.forEach(item => {
            item.addEventListener('click', this.handleNavClick.bind(this));
        });

        this.updateActiveState();
    }

    handleNavClick(event) {
        const navItem = event.currentTarget;
        const page = navItem.getAttribute('data-page');
        
        // Update active state immediately for better UX
        this.setActiveNavItem(navItem);
        
        // Navigate based on page
        switch(page) {
            case 'home':
                window.location.href = '/app';
                break;
            case 'groups':
                window.location.href = '/mobile/groups';
                break;
            case 'profile':
                window.location.href = '/mobile/profile';
                break;
            case 'create':
                this.handleCreateClick();
                break;
            default:
                break;
        }
    }

    handleCreateClick() {
        const dropdown = document.getElementById('dropdown-menu');
        if (dropdown) {
            dropdown.classList.toggle('hidden');
        }
    }

    setActiveNavItem(activeItem) {
        this.navItems.forEach(item => {
            item.classList.remove('active');
        });
        activeItem.classList.add('active');
    }

    updateActiveState() {
        const path = window.location.pathname;
        let activePage = 'home'; // default

        if (path.includes('/groups')) activePage = 'groups';
        else if (path.includes('/profile')) activePage = 'profile';
        else if (path === '/app') activePage = 'home';

        const activeNavItem = document.querySelector(`[data-page="${activePage}"]`);
        if (activeNavItem) {
            this.setActiveNavItem(activeNavItem);
        }
    }
}

// SINGLE initialization point
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize once
    if (!window.navigationManager) {
        const navManager = new NavigationManager();
        navManager.init();
    }
});