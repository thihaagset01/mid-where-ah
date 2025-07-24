// =============================================================================
// JavaScript: Enhanced Event Creation with Map Integration
// Replace your existing group_chat.js functions with these enhanced versions
// =============================================================================

/**
 * Enhanced Event Manager for your existing chat interface
 */
class EventManager {
    constructor(groupId) {
        this.groupId = groupId;
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.currentEvent = null;
    }

    /**
     * Create and save event to Firestore
     */
    async createEvent(eventData) {
        try {
            const currentUser = this.auth.currentUser;
            if (!currentUser) throw new Error('User not authenticated');

            // Create event document
            const eventDoc = {
                name: eventData.name.trim(),
                description: eventData.description.trim(),
                date: eventData.date,
                time: eventData.time,
                groupId: this.groupId,
                createdBy: currentUser.uid,
                createdByName: currentUser.displayName || currentUser.email.split('@')[0],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'active',
                
                // Attendance tracking
                attendance: {
                    [currentUser.uid]: {
                        name: currentUser.displayName || currentUser.email.split('@')[0],
                        status: 'going', // going, not_going, maybe
                        joinedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }
                },
                
                // Location data will be added when members add their locations
                memberLocations: {},
                calculatedMidpoint: null,
                recommendedVenues: []
            };

            // Save event to Firestore
            const eventRef = await this.db.collection('events').add(eventDoc);
            
            // Add system message to group chat
            await this.addEventMessage(eventRef.id, eventData);
            
            // Update group's last activity
            await this.db.collection('groups').doc(this.groupId).update({
                lastActivity: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.currentEvent = { id: eventRef.id, ...eventDoc };
            
            return {
                success: true,
                eventId: eventRef.id,
                message: 'Event created successfully!'
            };

        } catch (error) {
            console.error('Error creating event:', error);
            throw error;
        }
    }

    /**
     * Update user's attendance for an event
     */
    async updateAttendance(eventId, status) {
        try {
            const currentUser = this.auth.currentUser;
            if (!currentUser) throw new Error('User not authenticated');

            await this.db.collection('events').doc(eventId).update({
                [`attendance.${currentUser.uid}`]: {
                    name: currentUser.displayName || currentUser.email.split('@')[0],
                    status: status, // going, not_going, maybe
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }
            });

            return { success: true };

        } catch (error) {
            console.error('Error updating attendance:', error);
            throw error;
        }
    }

    /**
     * Add member location to event
     */
    async addMemberLocation(eventId, locationData) {
        try {
            const currentUser = this.auth.currentUser;
            if (!currentUser) throw new Error('User not authenticated');

            // Update event with member location
            await this.db.collection('events').doc(eventId).update({
                [`memberLocations.${currentUser.uid}`]: {
                    name: currentUser.displayName || currentUser.email.split('@')[0],
                    address: locationData.address,
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }
            });

            // Recalculate midpoint if we have multiple locations
            await this.recalculateMidpoint(eventId);

            return { success: true };

        } catch (error) {
            console.error('Error adding member location:', error);
            throw error;
        }
    }

    /**
     * Recalculate midpoint when locations are updated
     */
    async recalculateMidpoint(eventId) {
        try {
            const eventDoc = await this.db.collection('events').doc(eventId).get();
            if (!eventDoc.exists) return;

            const eventData = eventDoc.data();
            const locations = Object.values(eventData.memberLocations || {});

            if (locations.length >= 2) {
                // Calculate midpoint
                const midpoint = this.calculateMidpoint(locations);
                
                // Update event with calculated midpoint
                await this.db.collection('events').doc(eventId).update({
                    calculatedMidpoint: midpoint,
                    midpointCalculatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Optionally find nearby venues
                // await this.findNearbyVenues(eventId, midpoint);
            }

        } catch (error) {
            console.error('Error recalculating midpoint:', error);
        }
    }

    /**
     * Calculate midpoint from multiple locations
     */
    calculateMidpoint(locations) {
        let totalLat = 0;
        let totalLng = 0;
        
        locations.forEach(location => {
            totalLat += location.latitude;
            totalLng += location.longitude;
        });
        
        return {
            latitude: totalLat / locations.length,
            longitude: totalLng / locations.length
        };
    }

    /**
     * Add event message to group chat
     */
    async addEventMessage(eventId, eventData) {
        await this.db.collection('groups').doc(this.groupId)
            .collection('messages').add({
                type: 'event',
                eventId: eventId,
                eventName: eventData.name,
                eventDescription: eventData.description,
                eventDate: eventData.date,
                eventTime: eventData.time,
                createdBy: this.auth.currentUser.uid,
                createdByName: this.auth.currentUser.displayName || this.auth.currentUser.email.split('@')[0],
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
    }
}

// =============================================================================
// Enhanced UI Functions (Replace your existing functions)
// =============================================================================

// Global event manager instance
let eventManager;

/**
 * Initialize event manager for the group
 */
function initializeEventManager(groupId) {
    eventManager = new EventManager(groupId);
}

/**
 * Enhanced toolbar function (replace your existing one)
 */
function toolbar() {
    const toggleBtn = document.getElementById("toggleButton");
    const toolbar = document.getElementById("toolbar");

    if (!toggleBtn || !toolbar) return;

    toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toolbar.style.display = toolbar.style.display === "flex" ? "none" : "flex";
    });
    
    // Close toolbar when clicking outside
    document.addEventListener("click", (e) => {
        if (toolbar.style.display === "flex" && 
            !toolbar.contains(e.target) && 
            e.target !== toggleBtn) {
            toolbar.style.display = "none";
        }
    });
}

/**
 * Enhanced event button function (replace your existing one)
 */
function eventbtn() {
    const toolbar = document.getElementById("toolbar");
    const eventbtn = document.getElementById("newevent");
    const eventpop = document.getElementById("eventpop");
    const cancelBtn = document.getElementById("cancel");

    if (!eventbtn || !eventpop || !cancelBtn) return;

    // Show event popup when clicking the event button
    eventbtn.addEventListener("click", (e) => {
        e.stopPropagation();
        eventpop.style.display = "inherit";
        toolbar.style.display = "none";
        
        // Clear previous input values
        document.getElementById("eventname").value = "";
        document.getElementById("eventdescription").value = "";
        document.getElementById("eventdate").value = "";
        document.getElementById("eventtime").value = "";
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById("eventdate").value = today;
    });
    
    // Close event popup when clicking the cancel button
    cancelBtn.addEventListener("click", () => {
        eventpop.style.display = "none";
    });
}

/**
 * Enhanced save event function (replace your existing one)
 */
async function saveevent() {
    const eventname = document.getElementById("eventname").value.trim();
    const eventdescription = document.getElementById("eventdescription").value.trim();
    const eventdate = document.getElementById("eventdate").value;
    const eventtime = document.getElementById("eventtime").value;
    const eventcard = document.getElementById("eventcard");
    const eventpop = document.getElementById("eventpop");
    const eventcardcontainer = document.getElementById("eventcardcontainer");
    const saveBtn = document.getElementById("save");
    
    // Validate input fields
    if (!eventname) {
        alert("Please enter an event name");
        return;
    }
    
    if (!eventdate) {
        alert("Please select a date for the event");
        return;
    }

    if (!eventtime) {
        alert("Please select a time for the event");
        return;
    }

    // Show loading state
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = 'Saving...';

    try {
        // Create event in Firestore
        const result = await eventManager.createEvent({
            name: eventname,
            description: eventdescription,
            date: eventdate,
            time: eventtime
        });

        if (result.success) {
            // Format the date and time for display
            const dateObj = new Date(eventdate);
            const day = dateObj.getDate().toString().padStart(2, '0');
            const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
            const year = dateObj.getFullYear();
            const formattedDate = `${day}/${month}/${year}`;
            
            // Create the enhanced event card HTML
            const cardHTML = `
                <div class="event-card" data-event-id="${result.eventId}">
                    <div class="event-card-header">You started a new meet up!</div>
                    <div class="event-card-header">${eventname}</div>
                    <div class="event-card-date">
                        <div class="event-card-date-icon">
                            <i class="far fa-calendar-alt"></i>
                        </div>
                        <div class="event-card-date-text">TODAY ${formattedDate} ${eventtime}</div>
                    </div>
                    <div class="event-card-description">${eventdescription}</div>
                    <div style="display: flex; gap: 10px; justify-content: center; align-items: center;">
                        <button class="event-card-join" onclick="joinEvent('${result.eventId}', '${eventname}', '${formattedDate}', '${eventtime}', '${eventdescription}')">Join</button>
                        <button class="event-card-nojoin" onclick="declineEvent('${result.eventId}', '${eventname}', '${formattedDate}', '${eventtime}', '${eventdescription}')">No Join</button>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: center; align-items: center;">
                        <button onclick="viewEventMap('${result.eventId}')" class="event-card-join">View Map</button>
                    </div>
                </div>
            `;
            
            // Update the event card and show it
            eventcard.innerHTML = cardHTML;
            eventcard.style.display = "block";
            eventpop.style.display = "none";
            eventcardcontainer.style.display = "flex";
        }

    } catch (error) {
        console.error('Error saving event:', error);
        alert('Error creating event: ' + error.message);
    } finally {
        // Reset button
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

/**
 * Enhanced join event function with Firestore integration
 */
async function joinEvent(eventId, eventname, formattedDate, eventtime, eventdescription) {
    try {
        await eventManager.updateAttendance(eventId, 'going');
        
        const eventcard = document.getElementById("eventcard");
        const cardHTML = `
            <div class="event-card" data-event-id="${eventId}">
                <div class="event-card-header">You have joined ${eventname}!</div>
                <div class="event-card-date">
                    <div class="event-card-date-icon">
                        <i class="far fa-calendar-alt"></i>
                    </div>
                    <div class="event-card-date-text">TODAY ${formattedDate} ${eventtime}</div>
                </div>
                <div class="event-card-description">${eventdescription}</div>
                <div style="display: flex; gap: 10px; justify-content: center; align-items: center;">
                    <button class="event-card-join" onclick="viewAttendance('${eventId}')">View Attendance</button>
                    <button class="event-card-nojoin" onclick="declineEvent('${eventId}', '${eventname}', '${formattedDate}', '${eventtime}', '${eventdescription}')">No Join</button>
                </div>
                <div style="display: flex; gap: 10px; justify-content: center; align-items: center;">
                    <button onclick="viewEventMap('${eventId}')" class="event-card-join">View Map</button>
                </div>
            </div>
        `;
        
        eventcard.innerHTML = cardHTML;
        
    } catch (error) {
        console.error('Error joining event:', error);
        alert('Error joining event');
    }
}

/**
 * Enhanced decline event function
 */
async function declineEvent(eventId, eventname, formattedDate, eventtime, eventdescription) {
    try {
        await eventManager.updateAttendance(eventId, 'not_going');
        
        const eventcard = document.getElementById("eventcard");
        const cardHTML = `
            <div class="event-card" data-event-id="${eventId}">
                <div class="event-card-header">Oh no, you will be missing ${eventname}!</div>
                <div class="event-card-date">
                    <div class="event-card-date-icon">
                        <i class="far fa-calendar-alt"></i>
                    </div>
                    <div class="event-card-date-text">TODAY ${formattedDate} ${eventtime}</div>
                </div>
                <div class="event-card-description">${eventdescription}</div>
                <div style="display: flex; gap: 10px; justify-content: center; align-items: center;">
                    <button class="event-card-join" onclick="viewAttendance('${eventId}')">View Attendance</button>
                    <button class="event-card-join" onclick="joinEvent('${eventId}', '${eventname}', '${formattedDate}', '${eventtime}', '${eventdescription}')">Join</button>
                </div>
                <div style="display: flex; gap: 10px; justify-content: center; align-items: center;">
                    <button onclick="viewEventMap('${eventId}')" class="event-card-join">View Map</button>
                </div>
            </div>
        `;
        
        eventcard.innerHTML = cardHTML;
        
    } catch (error) {
        console.error('Error declining event:', error);
        alert('Error updating attendance');
    }
}

/**
 * View event map - This is where the magic happens!
 */
function viewEventMap(eventId) {
    // Store the event ID in localStorage for the map page
    localStorage.setItem('currentEventId', eventId);
    
    // Redirect to map page with event ID
    window.location.href = `/view_map?eventId=${eventId}`;
}

/**
 * View attendance for an event
 */
async function viewAttendance(eventId) {
    try {
        const eventDoc = await eventManager.db.collection('events').doc(eventId).get();
        if (!eventDoc.exists) {
            alert('Event not found');
            return;
        }

        const eventData = eventDoc.data();
        const attendance = eventData.attendance || {};
        
        // Create attendance modal
        const attendanceHTML = `
            <div class="modal-overlay" id="attendanceModal">
                <div class="attendance-modal">
                    <div class="modal-header">
                        <h3>${eventData.name} - Attendance</h3>
                        <button class="close-btn" onclick="closeAttendanceModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="attendance-list">
                            ${Object.entries(attendance).map(([userId, member]) => `
                                <div class="attendance-item ${member.status}">
                                    <div class="member-info">
                                        <span class="member-name">${member.name}</span>
                                        <span class="status-badge ${member.status}">${formatAttendanceStatus(member.status)}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', attendanceHTML);
        
    } catch (error) {
        console.error('Error viewing attendance:', error);
        alert('Error loading attendance');
    }
}

function formatAttendanceStatus(status) {
    switch(status) {
        case 'going': return 'Going ✓';
        case 'not_going': return 'Not Going ✗';  
        case 'maybe': return 'Maybe ?';
        default: return 'Unknown';
    }
}

function closeAttendanceModal() {
    const modal = document.getElementById('attendanceModal');
    if (modal) {
        modal.remove();
    }
}

// =============================================================================
// Map Integration Functions
// =============================================================================

/**
 * Initialize map page for event location collection
 * Call this on your view_map page
 */
function initializeEventMapPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('eventId') || localStorage.getItem('currentEventId');
    
    if (!eventId) {
        alert('No event specified');
        window.location.href = '/groups';
        return;
    }
    
    // Load event data and show location collection interface
    loadEventForMap(eventId);
}

/**
 * Load event data for map page
 */
async function loadEventForMap(eventId) {
    try {
        const db = firebase.firestore();
        const eventDoc = await db.collection('events').doc(eventId).get();
        
        if (!eventDoc.exists) {
            alert('Event not found');
            window.location.href = '/groups';
            return;
        }
        
        const eventData = eventDoc.data();
        const currentUser = firebase.auth().currentUser;
        
        // Update page title
        document.title = `${eventData.name} - Map`;
        
        // Show event info on map page
        displayEventInfo(eventData);
        
        // Check if user has already added their location
        const userLocation = eventData.memberLocations?.[currentUser.uid];
        
        if (userLocation) {
            // Show existing location and midpoint if available
            displayExistingLocations(eventData);
        } else {
            // Show location input interface
            showLocationInput(eventId);
        }
        
    } catch (error) {
        console.error('Error loading event for map:', error);
        alert('Error loading event');
    }
}

/**
 * Display event information on map page
 */
function displayEventInfo(eventData) {
    const eventInfoHTML = `
        <div class="event-info-card">
            <h2>${eventData.name}</h2>
            <p>${eventData.description}</p>
            <div class="event-meta">
                <span><i class="fas fa-calendar"></i> ${eventData.date}</span>
                <span><i class="fas fa-clock"></i> ${eventData.time}</span>
            </div>
        </div>
    `;
    
    // Add to page (you'll need to have a container for this)
    const container = document.getElementById('event-info-container');
    if (container) {
        container.innerHTML = eventInfoHTML;
    }
}

/**
 * Show location input interface for user to add their location
 */
function showLocationInput(eventId) {
    const locationInputHTML = `
        <div class="location-input-card">
            <h3>Add Your Location</h3>
            <p>Help us find the perfect meetup spot by adding your starting location.</p>
            <div class="location-input-group">
                <input type="text" id="userLocationInput" placeholder="Enter your address or location">
                <button id="useCurrentLocation" class="current-location-btn">
                    <i class="fas fa-crosshairs"></i> Use Current Location
                </button>
            </div>
            <button id="submitLocation" class="submit-location-btn">Add My Location</button>
        </div>
    `;
    
    const container = document.getElementById('location-input-container');
    if (container) {
        container.innerHTML = locationInputHTML;
        
        // Initialize location input functionality
        setupLocationInput(eventId);
    }
}

/**
 * Setup location input functionality with Google Places Autocomplete
 */
function setupLocationInput(eventId) {
    const input = document.getElementById('userLocationInput');
    const submitBtn = document.getElementById('submitLocation');
    const currentLocationBtn = document.getElementById('useCurrentLocation');
    
    // Initialize Google Places Autocomplete
    if (window.google && window.google.maps) {
        const autocomplete = new google.maps.places.Autocomplete(input, {
            componentRestrictions: { country: 'sg' },
            fields: ['address_components', 'geometry', 'name', 'formatted_address']
        });
        
        // Store selected place
        let selectedPlace = null;
        autocomplete.addListener('place_changed', () => {
            selectedPlace = autocomplete.getPlace();
        });
        
        // Handle location submission
        submitBtn.addEventListener('click', async () => {
            if (!selectedPlace || !selectedPlace.geometry) {
                alert('Please select a valid location');
                return;
            }
            
            await submitUserLocation(eventId, {
                address: selectedPlace.formatted_address,
                latitude: selectedPlace.geometry.location.lat(),
                longitude: selectedPlace.geometry.location.lng()
            });
        });
    }
    
    // Handle current location
    currentLocationBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            currentLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting location...';
            
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    // Reverse geocode to get address
                    if (window.google && window.google.maps) {
                        const geocoder = new google.maps.Geocoder();
                        geocoder.geocode({ location: { lat, lng } }, async (results, status) => {
                            if (status === 'OK' && results[0]) {
                                await submitUserLocation(eventId, {
                                    address: results[0].formatted_address,
                                    latitude: lat,
                                    longitude: lng
                                });
                            } else {
                                await submitUserLocation(eventId, {
                                    address: `${lat}, ${lng}`,
                                    latitude: lat,
                                    longitude: lng
                                });
                            }
                        });
                    } else {
                        await submitUserLocation(eventId, {
                            address: `${lat}, ${lng}`,
                            latitude: lat,
                            longitude: lng
                        });
                    }
                },
                (error) => {
                    console.error('Error getting location:', error);
                    alert('Error getting your location. Please enter it manually.');
                    currentLocationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Use Current Location';
                }
            );
        } else {
            alert('Geolocation is not supported by this browser');
        }
    });
}

/**
 * Submit user location to event
 */
async function submitUserLocation(eventId, locationData) {
    try {
        const submitBtn = document.getElementById('submitLocation');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding location...';
        
        await eventManager.addMemberLocation(eventId, locationData);
        
        // Show success and reload to show midpoint
        alert('Location added successfully!');
        window.location.reload();
        
    } catch (error) {
        console.error('Error submitting location:', error);
        alert('Error adding location: ' + error.message);
        
        const submitBtn = document.getElementById('submitLocation');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Add My Location';
    }
}

/**
 * Display existing locations and calculated midpoint
 */
function displayExistingLocations(eventData) {
    const locations = Object.values(eventData.memberLocations || {});
    const midpoint = eventData.calculatedMidpoint;
    
    // Show locations summary
    const summaryHTML = `
        <div class="locations-summary">
            <h3>Event Locations (${locations.length} member${locations.length !== 1 ? 's' : ''})</h3>
            <div class="location-list">
                ${locations.map(location => `
                    <div class="location-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span class="member-name">${location.name}</span>
                        <span class="location-address">${location.address}</span>
                    </div>
                `).join('')}
            </div>
            ${midpoint ? `
                <div class="midpoint-info">
                    <h4><i class="fas fa-bullseye"></i> Calculated Midpoint</h4>
                    <p>We've found the optimal meeting point based on everyone's locations!</p>
                    <button onclick="showVenueRecommendations('${eventData.id || eventData.eventId}')" class="find-venues-btn">
                        <i class="fas fa-search"></i> Find Nearby Venues
                    </button>
                </div>
            ` : '<p class="waiting-text">Waiting for more members to add their locations...</p>'}
        </div>
    `;
    
    const container = document.getElementById('locations-container');
    if (container) {
        container.innerHTML = summaryHTML;
    }
    
    // Initialize map with locations and midpoint
    if (window.initMap && midpoint) {
        // Add locations to map
        locations.forEach(location => {
            // Add marker for each location
            if (window.addMarker) {
                window.addMarker({
                    position: { lat: location.latitude, lng: location.longitude },
                    title: `${location.name}: ${location.address}`,
                    icon: { url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' }
                });
            }
        });
        
        // Add midpoint marker
        if (window.addMarker) {
            window.addMarker({
                position: { lat: midpoint.latitude, lng: midpoint.longitude },
                title: 'Meeting Point',
                icon: { url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' }
            });
        }
        
        // Fit map to show all markers
        if (window.fitMapToMarkers) {
            window.fitMapToMarkers();
        }
    }
}

/**
 * Show venue recommendations near the midpoint
 */
async function showVenueRecommendations(eventId) {
    try {
        // This would integrate with your existing venue recommendation system
        // For now, redirect to venues page with event context
        window.location.href = `/venues?eventId=${eventId}`;
        
    } catch (error) {
        console.error('Error showing venue recommendations:', error);
        alert('Error loading venue recommendations');
    }
}

// =============================================================================
// Initialization for Enhanced Event System
// =============================================================================

// Enhanced DOMContentLoaded listener (replace your existing one)
document.addEventListener('DOMContentLoaded', function () {
    // Get group ID from URL or other source
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get('groupId') || getGroupIdFromPath();
    
    if (groupId) {
        // Initialize event manager for this group
        initializeEventManager(groupId);
    }
    
    // Initialize existing functionality
    toolbar();
    eventbtn();
    
    // Add event listener for save button
    const saveBtn = document.getElementById("save");
    if (saveBtn) {
        saveBtn.removeEventListener("click", saveevent); // Remove old listener
        saveBtn.addEventListener("click", saveevent); // Add new enhanced listener
    }
    
    // Initialize map page if we're on the map page
    if (window.location.pathname === '/view_map') {
        initializeEventMapPage();
    }
});

/**
 * Helper function to get group ID from current path
 */
function getGroupIdFromPath() {
    // Implement based on your URL structure
    // e.g., if URL is /group_chat?groupId=abc123
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('groupId');
}

// Make functions globally available for onclick handlers
window.joinEvent = joinEvent;
window.declineEvent = declineEvent;
window.viewEventMap = viewEventMap;
window.viewAttendance = viewAttendance;
window.closeAttendanceModal = closeAttendanceModal;
window.showVenueRecommendations = showVenueRecommendations;
window.initializeEventMapPage = initializeEventMapPage;