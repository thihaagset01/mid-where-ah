// Event Map Manager for handling event-specific map functionality
class EventMapManager {
    constructor() {
        this.eventData = null;
        this.groupMembers = [];
        this.memberLocations = [];
        this.map = null;
        this.markers = [];
        this.midpointMarker = null;
        
        this.init();
    }

    async init() {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('eventId');
        
        if (eventId) {
            await this.loadEventData(urlParams);
            this.setupEventMapInterface();
        }
        
        // Initialize the map
        await this.initializeMap();
        
        if (eventId) {
            await this.loadMemberLocations();
        }
    }

    async loadEventData(urlParams) {
        this.eventData = {
            eventId: urlParams.get('eventId'),
            eventName: urlParams.get('eventName'),
            eventDate: urlParams.get('eventDate'),
            eventTime: urlParams.get('eventTime'),
            groupId: urlParams.get('groupId')
        };

        const membersParam = urlParams.get('members');
        if (membersParam) {
            try {
                this.groupMembers = JSON.parse(membersParam);
            } catch (error) {
                console.error('Error parsing members data:', error);
                this.groupMembers = [];
            }
        }
    }

    setupEventMapInterface() {
        // Update page title and event info
        const eventInfoContainer = document.getElementById('event-info-container');
        if (eventInfoContainer) {
            eventInfoContainer.innerHTML = `
                <div class="event-info-header">
                    <h3>${this.eventData.eventName}</h3>
                    <div class="event-meta">
                        <span><i class="fas fa-calendar"></i> ${this.eventData.eventDate}</span>
                        <span><i class="fas fa-clock"></i> ${this.eventData.eventTime}</span>
                        <span><i class="fas fa-users"></i> ${this.groupMembers.length} members</span>
                    </div>
                </div>
            `;
        }

        // Update back button to go to group chat
        const backBtn = document.querySelector('.back-btn');
        if (backBtn) {
            backBtn.href = `/mobile/group_chat?groupId=${this.eventData.groupId}`;
        }

        // Add event-specific controls
        this.addEventControls();
    }

    addEventControls() {
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'event-map-controls';
        controlsContainer.innerHTML = `
            <div class="control-buttons">
                <button id="refresh-locations" class="control-btn">
                    <i class="fas fa-sync-alt"></i> Refresh Locations
                </button>
                <button id="calculate-midpoint" class="control-btn primary">
                    <i class="fas fa-location-arrow"></i> Find Meeting Point
                </button>
                <button id="find-venues" class="control-btn">
                    <i class="fas fa-search"></i> Find Venues
                </button>
            </div>
        `;

        // Insert after the header
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.parentNode.insertBefore(controlsContainer, mapElement);
        }

        // Add event listeners
        this.setupControlEventListeners();
    }

    setupControlEventListeners() {
        document.getElementById('refresh-locations')?.addEventListener('click', () => {
            this.loadMemberLocations();
        });

        document.getElementById('calculate-midpoint')?.addEventListener('click', () => {
            this.calculateAndDisplayMidpoint();
        });

        document.getElementById('find-venues')?.addEventListener('click', () => {
            this.findNearbyVenues();
        });
    }

    async initializeMap() {
        // Default center on Singapore
        const singapore = { lat: 1.3521, lng: 103.8198 };
        
        this.map = new google.maps.Map(document.getElementById("map"), {
            center: singapore,
            zoom: 12,
            mapTypeControl: false,
            fullscreenControl: false,
            streetViewControl: false,
            styles: [
                {
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{ visibility: "off" }]
                }
            ]
        });

        // Initialize services
        this.placesService = new google.maps.places.PlacesService(this.map);
        this.geocoder = new google.maps.Geocoder();
    }

    async loadMemberLocations() {
        if (!this.groupMembers.length) return;

        const db = firebase.firestore();
        const locations = [];

        // Show loading state
        this.showLoadingState('Loading member locations...');

        try {
            // Load locations for each group member
            for (const member of this.groupMembers) {
                try {
                    // Try to get user's saved location from their profile
                    const userDoc = await db.collection('users').doc(member.userId).get();
                    
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        if (userData.defaultLocation && userData.defaultLocation.coordinates) {
                            locations.push({
                                userId: member.userId,
                                name: member.name,
                                address: userData.defaultLocation.address,
                                position: {
                                    lat: userData.defaultLocation.coordinates.latitude,
                                    lng: userData.defaultLocation.coordinates.longitude
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.warn(`Could not load location for ${member.name}:`, error);
                }
            }

            this.memberLocations = locations;
            this.displayMemberLocations();
            
            if (locations.length > 1) {
                this.calculateAndDisplayMidpoint();
            }

        } catch (error) {
            console.error('Error loading member locations:', error);
            this.showErrorMessage('Failed to load member locations');
        } finally {
            this.hideLoadingState();
        }
    }

    displayMemberLocations() {
        // Clear existing markers
        this.clearMarkers();

        if (!this.memberLocations.length) {
            this.showInfoMessage('No member locations available. Members need to set their default locations in their profiles.');
            return;
        }

        // Add markers for each member location
        this.memberLocations.forEach((location, index) => {
            const marker = new google.maps.Marker({
                position: location.position,
                map: this.map,
                title: `${location.name} - ${location.address}`,
                icon: {
                    url: `https://maps.google.com/mapfiles/ms/icons/${this.getMarkerColor(index)}-dot.png`
                }
            });

            // Add info window
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div class="marker-info">
                        <h4>${location.name}</h4>
                        <p>${location.address}</p>
                    </div>
                `
            });

            marker.addListener('click', () => {
                infoWindow.open(this.map, marker);
            });

            this.markers.push(marker);
        });

        // Fit map to show all markers
        if (this.memberLocations.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            this.memberLocations.forEach(location => {
                bounds.extend(location.position);
            });
            this.map.fitBounds(bounds);
        }
    }

    getMarkerColor(index) {
        const colors = ['blue', 'red', 'green', 'yellow', 'purple', 'orange'];
        return colors[index % colors.length];
    }

    calculateAndDisplayMidpoint() {
        if (this.memberLocations.length < 2) {
            this.showInfoMessage('Need at least 2 member locations to calculate midpoint');
            return;
        }

        // Calculate geometric midpoint
        const positions = this.memberLocations.map(loc => loc.position);
        const midpoint = this.calculateGeometricMidpoint(positions);

        // Remove existing midpoint marker
        if (this.midpointMarker) {
            this.midpointMarker.setMap(null);
        }

        // Add midpoint marker
        this.midpointMarker = new google.maps.Marker({
            position: midpoint,
            map: this.map,
            title: 'Meeting Point',
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#4CAF50',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
                scale: 15
            },
            animation: google.maps.Animation.BOUNCE
        });

        // Stop animation after 2 seconds
        setTimeout(() => {
            if (this.midpointMarker) {
                this.midpointMarker.setAnimation(null);
            }
        }, 2000);

        // Center map on midpoint
        this.map.panTo(midpoint);
        this.map.setZoom(14);

        this.showSuccessMessage('Meeting point calculated!');
    }

    calculateGeometricMidpoint(positions) {
        let totalLat = 0;
        let totalLng = 0;

        positions.forEach(pos => {
            totalLat += pos.lat;
            totalLng += pos.lng;
        });

        return {
            lat: totalLat / positions.length,
            lng: totalLng / positions.length
        };
    }

    async findNearbyVenues() {
        if (!this.midpointMarker) {
            this.showInfoMessage('Please calculate the meeting point first');
            return;
        }

        const midpointPosition = this.midpointMarker.getPosition();
        
        const request = {
            location: midpointPosition,
            radius: 1000, // 1km radius
            type: ['restaurant', 'cafe', 'food']
        };

        this.placesService.nearbySearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                this.displayVenueResults(results.slice(0, 10)); // Show top 10 results
            } else {
                this.showErrorMessage('Failed to find nearby venues');
            }
        });
    }

    displayVenueResults(venues) {
        // Clear existing venue markers
        this.clearVenueMarkers();

        venues.forEach(venue => {
            const marker = new google.maps.Marker({
                position: venue.geometry.location,
                map: this.map,
                title: venue.name,
                icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/restaurant.png'
                }
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div class="venue-info">
                        <h4>${venue.name}</h4>
                        <p>Rating: ${venue.rating || 'N/A'} ⭐</p>
                        <p>${venue.vicinity}</p>
                    </div>
                `
            });

            marker.addListener('click', () => {
                infoWindow.open(this.map, marker);
            });

            this.markers.push(marker);
        });

        this.showSuccessMessage(`Found ${venues.length} nearby venues`);
    }

    clearMarkers() {
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];
    }

    clearVenueMarkers() {
        // Only clear venue markers, keep member location markers
        this.markers = this.markers.filter(marker => {
            const icon = marker.getIcon();
            if (icon && icon.url && icon.url.includes('restaurant')) {
                marker.setMap(null);
                return false;
            }
            return true;
        });
    }

    showLoadingState(message) {
        this.showMessage(message, 'loading');
    }

    hideLoadingState() {
        const existingMessage = document.querySelector('.map-message.loading');
        if (existingMessage) {
            existingMessage.remove();
        }
    }

    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }

    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }

    showInfoMessage(message) {
        this.showMessage(message, 'info');
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.map-message');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = `map-message ${type}`;
        messageDiv.innerHTML = `
            <div class="message-content">
                <i class="fas fa-${this.getMessageIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(messageDiv);

        // Auto-remove success and info messages
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 4000);
        }
    }

    getMessageIcon(type) {
        const icons = {
            loading: 'spinner fa-spin',
            success: 'check-circle',
            error: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the view_map page with event parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('eventId')) {
        window.eventMapManager = new EventMapManager();
    }
});

// CSS for the event map interface
const eventMapStyles = `
<style>
.event-info-header {
    background: white;
    padding: 16px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin: 16px;
    position: relative;
    z-index: 1000;
}

.event-info-header h3 {
    margin: 0 0 12px 0;
    color: #333;
    font-size: 18px;
}

.event-meta {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    font-size: 14px;
    color: #666;
}

.event-meta span {
    display: flex;
    align-items: center;
    gap: 6px;
}

.event-map-controls {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    padding: 12px;
}

.control-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
}

.control-btn {
    padding: 12px 16px;
    border: none;
    border-radius: 8px;
    background: #f8f9fa;
    color: #333;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 120px;
    justify-content: center;
}

.control-btn:hover {
    background: #e9ecef;
    transform: translateY(-1px);
}

.control-btn.primary {
    background: #007bff;
    color: white;
}

.control-btn.primary:hover {
    background: #0056b3;
}

.control-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

.map-message {
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 16px 20px;
    max-width: 90%;
    min-width: 300px;
}

.map-message.loading {
    background: #e3f2fd;
    border-left: 4px solid #2196F3;
}

.map-message.success {
    background: #e8f5e8;
    border-left: 4px solid #4CAF50;
}

.map-message.error {
    background: #ffebee;
    border-left: 4px solid #f44336;
}

.map-message.info {
    background: #fff3e0;
    border-left: 4px solid #ff9800;
}

.message-content {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
}

.message-content i {
    font-size: 16px;
}

.map-message.loading .message-content i {
    color: #2196F3;
}

.map-message.success .message-content i {
    color: #4CAF50;
}

.map-message.error .message-content i {
    color: #f44336;
}

.map-message.info .message-content i {
    color: #ff9800;
}

.marker-info, .venue-info {
    padding: 8px;
    max-width: 200px;
}

.marker-info h4, .venue-info h4 {
    margin: 0 0 8px 0;
    font-size: 16px;
    color: #333;
}

.marker-info p, .venue-info p {
    margin: 4px 0;
    font-size: 14px;
    color: #666;
}

/* Mobile responsive adjustments */
@media (max-width: 768px) {
    .event-info-header {
        margin: 8px;
        padding: 12px;
    }
    
    .event-meta {
        gap: 12px;
        font-size: 12px;
    }
    
    .control-buttons {
        flex-direction: column;
        gap: 6px;
    }
    
    .control-btn {
        padding: 10px 14px;
        font-size: 13px;
        min-width: 140px;
    }
    
    .event-map-controls {
        bottom: 10px;
        left: 10px;
        right: 10px;
        transform: none;
        max-width: none;
    }
    
    .map-message {
        top: 70px;
        left: 10px;
        right: 10px;
        transform: none;
        max-width: none;
        min-width: auto;
    }
}
</style>
`;

// Inject the CSS
document.head.insertAdjacentHTML('beforeend', eventMapStyles);