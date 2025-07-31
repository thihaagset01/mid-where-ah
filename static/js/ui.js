/**
 * ui.js - UI components and interactions for MidWhereAh
 * Handles notifications, modals, and other UI elements
 */

class UIManager {
    constructor() {
        // Notification settings
        this.notificationSettings = {
            duration: 3000,
            position: 'top-center',
            maxNotifications: 3
        };
        
        // Active notifications
        this.activeNotifications = [];
        
        console.log('UIManager initialized');
    }
    
    /**
     * Initialize UI manager
     */
    init() {
        // Set up any global UI elements
        this.setupUI();
        
        return this;
    }
    
    /**
     * Set up global UI elements
     */
    setupUI() {
        // Create notification container if it doesn't exist
        this.ensureNotificationContainer();
        
        // Set up any global event listeners
        this.setupGlobalEventListeners();
    }
    
    /**
     * Ensure notification container exists
     */
    ensureNotificationContainer() {
        if (!document.getElementById('notification-container')) {
            const container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 9999;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                width: 100%;
                max-width: 500px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
    }
    
    /**
     * Set up global event listeners
     */
    setupGlobalEventListeners() {
        // Close modals on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }
    
    /**
     * Show a notification
     * @param {string} message - The message to display
     * @param {string} type - The type of notification (success, error, warning, info)
     * @param {number} duration - Duration in ms to show the notification
     */
    showNotification(message, type = 'info', duration = this.notificationSettings.duration) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            max-width: 90%;
            text-align: center;
            font-size: 14px;
            backdrop-filter: blur(10px);
            pointer-events: auto;
            opacity: 0;
            transform: translateY(-20px);
            transition: opacity 0.3s ease, transform 0.3s ease;
        `;
        
        // Add message
        notification.textContent = message;
        
        // Add to container
        const container = document.getElementById('notification-container');
        container.appendChild(notification);
        
        // Manage active notifications
        this.activeNotifications.push(notification);
        
        // Remove oldest notification if too many
        if (this.activeNotifications.length > this.notificationSettings.maxNotifications) {
            const oldest = this.activeNotifications.shift();
            this.removeNotification(oldest);
        }
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);
        
        // Set timeout to remove
        setTimeout(() => {
            this.removeNotification(notification);
        }, duration);
        
        return notification;
    }
    
    /**
     * Remove a notification
     * @param {HTMLElement} notification - The notification element to remove
     */
    removeNotification(notification) {
        if (!notification || !notification.parentNode) return;
        
        // Animate out
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        
        // Remove after animation
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            
            // Remove from active notifications
            const index = this.activeNotifications.indexOf(notification);
            if (index !== -1) {
                this.activeNotifications.splice(index, 1);
            }
        }, 300);
    }
    
    /**
     * Get color for notification type
     * @param {string} type - The type of notification
     * @returns {string} - The color for the notification
     */
    getNotificationColor(type) {
        switch (type) {
            case 'success':
                return 'rgba(72, 187, 120, 0.95)';
            case 'error':
            case 'danger':
                return 'rgba(244, 67, 54, 0.95)';
            case 'warning':
                return 'rgba(255, 152, 0, 0.95)';
            case 'info':
            default:
                return 'rgba(33, 150, 243, 0.95)';
        }
    }
    
    /**
     * Show a toast notification (alias for showNotification)
     */
    showToast(message, type = 'info', duration = this.notificationSettings.duration) {
        return this.showNotification(message, type, duration);
    }
    
    /**
     * Show error notification (alias for showNotification with type=error)
     */
    showErrorNotification(message, duration = this.notificationSettings.duration) {
        return this.showNotification(message, 'error', duration);
    }
    
    /**
     * Open a modal
     * @param {string} modalId - The ID of the modal to open
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        // Add active class
        modal.classList.add('active');
        
        // Add modal-open class to body to prevent scrolling
        document.body.classList.add('modal-open');
        
        // Dispatch event
        const event = new CustomEvent('modal:open', {
            detail: { modalId }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * Close a modal
     * @param {string} modalId - The ID of the modal to close
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        // Remove active class
        modal.classList.remove('active');
        
        // Remove modal-open class from body if no other modals are open
        const activeModals = document.querySelectorAll('.modal.active');
        if (activeModals.length === 0) {
            document.body.classList.remove('modal-open');
        }
        
        // Dispatch event
        const event = new CustomEvent('modal:close', {
            detail: { modalId }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * Close all open modals
     */
    closeAllModals() {
        const activeModals = document.querySelectorAll('.modal.active');
        activeModals.forEach(modal => {
            this.closeModal(modal.id);
        });
    }
    
    /**
     * Toggle a modal
     * @param {string} modalId - The ID of the modal to toggle
     */
    toggleModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        if (modal.classList.contains('active')) {
            this.closeModal(modalId);
        } else {
            this.openModal(modalId);
        }
    }
}

// Create global instance
window.uiManager = new UIManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI manager
    window.uiManager.init();
    
    // Add global functions for backward compatibility
    window.showNotification = (message, type, duration) => {
        return window.uiManager.showNotification(message, type, duration);
    };
    
    window.showToast = (message, type, duration) => {
        return window.uiManager.showToast(message, type, duration);
    };
    
    window.showErrorNotification = (message, duration) => {
        return window.uiManager.showErrorNotification(message, duration);
    };
});
