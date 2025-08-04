class ExplorePage {
    constructor() {
        this.eventsContainer = document.getElementById('events-container');
        this.loadingIndicator = this.createLoadingIndicator();
        this.init();
    }

    async init() {
        // Show loading state
        this.showLoading();
        
        try {
            // Try to load events with cache-first approach
            const events = await this.fetchEvents();
            this.renderEvents(events);
            
            // Then refresh in the background
            this.refreshEvents();
        } catch (error) {
            console.error('Error loading events:', error);
            this.showError('Failed to load events. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async fetchEvents() {
        // Use EventService if available, otherwise return mock data
        if (typeof EventService !== 'undefined') {
            try {
                return await EventService.fetchEvents();
            } catch (error) {
                console.warn('EventService failed, using mock data:', error);
                return this.getMockEvents();
            }
        } else {
            console.warn('EventService not available, using mock data');
            return this.getMockEvents();
        }
    }

    async refreshEvents() {
        try {
            // Force refresh from server
            const events = await this.fetchEvents(true); // Force refresh
            
            // Only update if events have changed
            if (this.eventsContainer) {
                this.renderEvents(events);
            }
        } catch (error) {
            console.warn('Background refresh failed:', error);
            // Don't show error to user for background refresh
        }
    }

    getMockEvents() {
        // Return some mock events for testing
        return [
            {
                id: '1',
                title: 'Singapore Jazz Festival',
                description: 'Experience the best jazz musicians from around the world in this spectacular festival.',
                date: new Date().toISOString().split('T')[0],
                startTime: new Date().toISOString(),
                url: '#',
                imageUrl: 'https://source.unsplash.com/600x400/?jazz,music'
            },
            {
                id: '2',
                title: 'Food & Wine Expo',
                description: 'Discover amazing culinary experiences and fine wines from local and international vendors.',
                date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
                startTime: new Date(Date.now() + 86400000).toISOString(),
                url: '#',
                imageUrl: 'https://source.unsplash.com/600x400/?food,wine'
            },
            {
                id: '3',
                title: 'Tech Startup Conference',
                description: 'Network with entrepreneurs and learn about the latest technology trends and innovations.',
                date: new Date(Date.now() + 172800000).toISOString().split('T')[0], // Day after tomorrow
                startTime: new Date(Date.now() + 172800000).toISOString(),
                url: '#',
                imageUrl: 'https://source.unsplash.com/600x400/?technology,conference'
            }
        ];
    }

    renderEvents(events) {
        if (!this.eventsContainer) return;
        
        if (!events || events.length === 0) {
            this.eventsContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-calendar-times fa-3x mb-3 text-muted"></i>
                    <h4>No events found</h4>
                    <p class="text-muted">Check back later for upcoming events</p>
                </div>
            `;
            return;
        }

        // Sort events by date (newest first)
        const sortedEvents = [...events].sort((a, b) => 
            new Date(b.startTime) - new Date(a.startTime)
        );

        // Generate event cards HTML
        const eventsHtml = sortedEvents.map(event => this.createEventCard(event)).join('');
        this.eventsContainer.innerHTML = eventsHtml;
        
        // Add event listeners to cards
        this.attachEventListeners();
    }

    createEventCard(event) {
        // Format the date if it exists
        const formatDate = (dateString) => {
            if (!dateString) return 'Date not specified';
            return dateString;
        };

        // Get a category for the event based on title and description
        const getEventCategory = (title = '', description = '') => {
            const text = `${title} ${description}`.toLowerCase();
            
            if (text.includes('concert') || text.includes('music') || text.includes('jazz') || text.includes('orchestra') || text.includes('band')) {
                return 'music';
            } else if (text.includes('food') || text.includes('dining') || text.includes('restaurant') || text.includes('culinary')) {
                return 'food';
            } else if (text.includes('sport') || text.includes('game') || text.includes('marathon') || text.includes('tournament')) {
                return 'sports';
            } else if (text.includes('art') || text.includes('gallery') || text.includes('exhibition') || text.includes('museum')) {
                return 'art';
            } else if (text.includes('tech') || text.includes('digital') || text.includes('startup') || text.includes('conference')) {
                return 'tech';
            } else if (text.includes('festival') || text.includes('celebration') || text.includes('carnival')) {
                return 'festival';
            } else {
                return 'event';
            }
        };

        // Get a relevant image for the event
        const getEventImage = (event) => {
            // 1. Try to extract image from description
            const extractImageFromDescription = (description) => {
                if (!description) return null;
                const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
                return imgMatch ? imgMatch[1] : null;
            };

            // 2. Try to get image from event data if available
            if (event.imageUrl) return event.imageUrl;
            
            // 3. Extract from description
            const imgFromDescription = extractImageFromDescription(event.description);
            if (imgFromDescription) return imgFromDescription;
            
            // 4. Use category-based Unsplash images
            const category = getEventCategory(event.title, event.description);
            const unsplashCategories = {
                music: 'https://source.unsplash.com/random/600x400/?concert,music,performance',
                food: 'https://source.unsplash.com/random/600x400/?food,restaurant,dining',
                sports: 'https://source.unsplash.com/random/600x400/?sports,stadium,game',
                art: 'https://source.unsplash.com/random/600x400/?art,gallery,exhibition',
                tech: 'https://source.unsplash.com/random/600x400/?technology,computer,startup',
                festival: 'https://source.unsplash.com/random/600x400/?festival,celebration',
                event: 'https://source.unsplash.com/random/600x400/?event,people,gathering'
            };
            
            return unsplashCategories[category] || unsplashCategories.event;
        };

        // Get a short description (first 150 chars) without HTML tags
        const getShortDescription = (description) => {
            if (!description) return 'No description available';
            // Remove HTML tags and limit length
            const plainText = description.replace(/<[^>]*>/g, '');
            return plainText.length > 150 ? `${plainText.substring(0, 147)}...` : plainText;
        };

        // Get the best available image
        const imageUrl = getEventImage(event);
        
        // Create a clean URL for the event link
        const eventUrl = event.url || '#';
        const title = event.title || 'Untitled Event';
        const date = formatDate(event.date);
        const description = getShortDescription(event.description);
        const category = getEventCategory(title, description);

        return `
            <div class="event-card" data-event-id="${event.id || ''}" data-category="${category}">
                <div class="event-image" style="background-image: url('${imageUrl}');">
                    <div class="event-date-badge">
                        <span>${date}</span>
                    </div>
                    <div class="event-category-badge">
                        <i class="fas ${{
                            music: 'fa-music',
                            food: 'fa-utensils',
                            sports: 'fa-futbol',
                            art: 'fa-palette',
                            tech: 'fa-laptop-code',
                            festival: 'fa-glass-cheers'
                        }[category] || 'fa-calendar-day'}"></i>
                    </div>
                </div>
                <div class="event-details">
                    <h3>${title}</h3>
                    <p class="event-description">${description}</p>
                    <div class="event-footer">
                        <a href="${eventUrl}" target="_blank" class="preload-link btn btn-sm btn-outline-primary">
                            View Details <i class="fas fa-external-link-alt ms-1"></i>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Add click handlers for event cards
        document.querySelectorAll('.event-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't navigate if clicking on a button or link inside the card
                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') {
                    return;
                }
                
                const eventId = card.getAttribute('data-event-id');
                if (eventId) {
                    window.location.href = `/event/${eventId}`;
                }
            });
        });
    }

    showLoading() {
        if (this.eventsContainer) {
            this.eventsContainer.innerHTML = '';
            this.eventsContainer.appendChild(this.loadingIndicator);
        }
    }

    hideLoading() {
        if (this.loadingIndicator.parentNode) {
            this.loadingIndicator.parentNode.removeChild(this.loadingIndicator);
        }
    }

    showError(message) {
        if (this.eventsContainer) {
            this.eventsContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-exclamation-triangle fa-3x mb-3 text-danger"></i>
                    <h4>Error Loading Events</h4>
                    <p class="text-muted">${message}</p>
                    <button class="btn btn-primary mt-2" onclick="window.location.reload()">
                        <i class="fas fa-sync-alt me-2"></i>Try Again
                    </button>
                </div>
            `;
        }
    }

    createLoadingIndicator() {
        const div = document.createElement('div');
        div.className = 'col-12 text-center py-5';
        div.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 text-muted">Loading events...</p>
        `;
        return div;
    }
}

// Make ExplorePage globally available
window.ExplorePage = ExplorePage;

// Initialize the explore page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ExplorePage();
});