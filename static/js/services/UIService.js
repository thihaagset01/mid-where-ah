/**
 * UIService - Provides consistent UI components and interactions
 * Handles shared UI elements like buttons, cards, and other reusable components
 */

class UIService {
    constructor() {
        // Initialize any required services
        this.markerStyleService = window.markerStyleService || new (require('./MarkerStyleService').default)();
        
        console.log('UIService initialized');
    }

    /**
     * Create a consistent button element
     * @param {Object} options - Button configuration
     * @param {string} options.label - Button text
     * @param {string} [options.variant='primary'] - Button style variant (primary, secondary, outline, text)
     * @param {string} [options.size='medium'] - Button size (small, medium, large)
     * @param {string} [options.icon] - Optional icon class (e.g., 'fa-search')
     * @param {Function} [options.onClick] - Click handler
     * @param {boolean} [options.disabled=false] - Whether the button is disabled
     * @param {string} [options.className] - Additional CSS classes
     * @returns {HTMLButtonElement} The created button element
     */
    createButton({
        label,
        variant = 'primary',
        size = 'medium',
        icon = null,
        onClick = null,
        disabled = false,
        className = ''
    } = {}) {
        const button = document.createElement('button');
        
        // Base classes
        const baseClasses = ['btn', `btn-${variant}`, `btn-${size}`];
        if (className) {
            baseClasses.push(className);
        }
        
        button.className = baseClasses.join(' ');
        button.disabled = disabled;
        
        // Add icon if provided
        if (icon) {
            const iconEl = document.createElement('i');
            iconEl.className = icon;
            button.appendChild(icon);
            button.appendChild(document.createTextNode(' ')); // Add space between icon and text
        }
        
        // Add label
        button.appendChild(document.createTextNode(label));
        
        // Add click handler
        if (onClick && typeof onClick === 'function') {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                onClick(e);
            });
        }
        
        return button;
    }

    /**
     * Create a venue card element
     * @param {Object} venue - Venue data
     * @param {Function} onSelect - Handler for select action
     * @param {Function} onDirections - Handler for directions action
     * @returns {HTMLElement} The created card element
     */
    createVenueCard(venue, onSelect, onDirections) {
        const { name, vicinity, rating, user_ratings_total, price_level } = venue;
        const card = document.createElement('div');
        card.className = 'venue-card';
        
        const ratingStars = this.markerStyleService.getRatingStars(rating);
        const priceLevel = price_level ? '$'.repeat(price_level) : 'N/A';
        
        card.innerHTML = `
            <div class="venue-card-body">
                <h4 class="venue-name">${name || 'Unnamed Venue'}</h4>
                <p class="venue-address">${vicinity || 'Address not available'}</p>
                <div class="venue-meta">
                    <span class="venue-rating">${ratingStars} (${user_ratings_total || 0})</span>
                    <span class="venue-price">${priceLevel}</span>
                </div>
            </div>
            <div class="venue-card-actions">
                <!-- Buttons will be added programmatically -->
            </div>
        `;
        
        // Create and add action buttons
        const actionsContainer = card.querySelector('.venue-card-actions');
        
        // Select button
        const selectBtn = this.createButton({
            label: 'Select',
            variant: 'primary',
            size: 'small',
            icon: 'fas fa-check',
            onClick: (e) => {
                e.stopPropagation();
                if (onSelect) onSelect(venue);
            }
        });
        
        // Directions button
        const directionsBtn = this.createButton({
            label: 'Directions',
            variant: 'outline-secondary',
            size: 'small',
            icon: 'fas fa-directions',
            onClick: (e) => {
                e.stopPropagation();
                if (onDirections) onDirections(venue);
            }
        });
        
        actionsContainer.appendChild(selectBtn);
        actionsContainer.appendChild(directionsBtn);
        
        // Add click handler to the whole card
        card.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                if (onSelect) onSelect(venue);
            }
        });
        
        return card;
    }
    
    /**
     * Create a loading spinner
     * @param {string} [size='medium'] - Size of the spinner (small, medium, large)
     * @returns {HTMLElement} The loading spinner element
     */
    createLoadingSpinner(size = 'medium') {
        const spinner = document.createElement('div');
        spinner.className = `spinner-border spinner-border-${size} text-primary`;
        spinner.role = 'status';
        
        const srOnly = document.createElement('span');
        srOnly.className = 'sr-only';
        srOnly.textContent = 'Loading...';
        
        spinner.appendChild(srOnly);
        return spinner;
    }
}

// Create global instance
window.uiService = new UIService();

export default UIService;
