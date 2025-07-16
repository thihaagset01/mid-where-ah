// Mobile-first JavaScript functionality for MidWhereAh
// Enhanced Social Fairness Algorithm - Prioritizing Travel Time Equity

// Enhanced Social Fairness Midpoint Algorithm (Travel Time Equity Focus)

window.userTransportModes = {
    'location-1': 'TRANSIT', // Default to transit
    'location-2': 'TRANSIT'
};

class EnhancedSocialMidpointCalculator {
    constructor() {
        this.maxIterations = 50;
        this.convergenceThreshold = 50;
        this.initialRadius = 1500;
        this.radiusIncrementFactor = 1.4;
        this.maxSearchRadius = 5000;
        this.minVenuesRequired = 5;
        
        // These will be adjusted based on distance
        this.baseMaxTravelTimeMinutes = 60;
        this.maxTravelTimeMinutes = 60; // Will be updated in calculateSocialMidpoint
        
        this.maxAcceptableTimeDifference = 10;
        this.equityWeight = 0.9;
        this.totalTimeWeight = 0.1;
        
        this.socialPlaceTypes = [
            'restaurant', 'cafe', 'shopping_mall', 'food', 
            'establishment', 'store', 'meal_takeaway', 'bakery'
        ];
    }

    adjustParametersForDistance(startingLocations) {
        const distance = this.calculateDistance(
            { lat: startingLocations[0].lat(), lng: startingLocations[0].lng() },
            { lat: startingLocations[1].lat(), lng: startingLocations[1].lng() }
        );
        
        const distanceKm = distance / 1000;
        
        if (distanceKm > 30) {
            this.maxTravelTimeMinutes = 90;
            this.maxAcceptableTimeDifference = 20; // Scale with distance!
            console.log(`🌏 Extreme distance (${distanceKm.toFixed(1)}km): Allowing up to 90min travel, 20min range`);
        } else if (distanceKm > 15) {
            this.maxTravelTimeMinutes = 75;
            this.maxAcceptableTimeDifference = 15; // Scale with distance!
            console.log(`📏 Long distance (${distanceKm.toFixed(1)}km): Allowing up to 75min travel, 15min range`);
        } else {
            this.maxTravelTimeMinutes = this.baseMaxTravelTimeMinutes;
            this.maxAcceptableTimeDifference = 10; // Normal distance
            console.log(`📍 Normal distance (${distanceKm.toFixed(1)}km): Allowing up to 60min travel, 10min range`);
        }
    }

    async calculateSocialMidpoint(startingLocations) {
        console.log('🎯 Starting Enhanced Social Fairness Algorithm (Equity Focus)...');
        console.log(`📍 Analyzing ${startingLocations.length} starting locations`);
        
        // NEW: Adjust parameters based on distance
        this.adjustParametersForDistance(startingLocations);
        
        let currentSearchCenter = this.calculateGeometricMidpoint(startingLocations);
        let searchRadius = this.initialRadius;
        let bestMidpoint = null;
        let bestScore = Infinity;
        let radiusCircle = null;
        let iteration = 0;
        
        while (iteration < this.maxIterations && searchRadius <= this.maxSearchRadius) {
            iteration++;
            console.log(`🔍 Iteration ${iteration}: Searching ${searchRadius}m radius around current center`);
            
            radiusCircle = this.showRadiusCircle(currentSearchCenter, searchRadius, radiusCircle);
            
            const socialVenues = await this.findSocialVenues(currentSearchCenter, searchRadius);
            
            if (socialVenues.length < this.minVenuesRequired) {
                console.log(`❌ Only ${socialVenues.length} venues found, need ${this.minVenuesRequired}. Expanding search...`);
                searchRadius *= this.radiusIncrementFactor;
                continue;
            }
            
            console.log(`✅ Found ${socialVenues.length} venues to analyze`);
            
            const venueAnalysis = await this.analyzeVenueTravelEquity(socialVenues, startingLocations);
            
            if (venueAnalysis.length === 0) {
                console.log(`❌ No accessible venues found. Expanding search...`);
                searchRadius *= this.radiusIncrementFactor;
                continue;
            }
            
            const currentBestVenue = this.findMostEquitableVenue(venueAnalysis);
            
            if (currentBestVenue && currentBestVenue.equityScore < bestScore) {
                bestScore = currentBestVenue.equityScore;
                bestMidpoint = currentBestVenue.location;
                
                console.log(`⭐ New best venue: ${currentBestVenue.name}`);
                console.log(`   Max travel time: ${currentBestVenue.maxTravelTime.toFixed(1)}min`);
                console.log(`   Avg travel time: ${currentBestVenue.avgTravelTime.toFixed(1)}min`);
                console.log(`   Time variance: ${currentBestVenue.timeVariance.toFixed(1)}min²`);
                console.log(`   Equity score: ${currentBestVenue.equityScore.toFixed(2)}`);
                
                // NEW: Check if routes to this venue pass through a common MRT station
                const commonMRTStation = await this.findCommonMRTStation(startingLocations, currentBestVenue.location);
                if (commonMRTStation) {
                    console.log(`🚇 Routes pass through common MRT: ${commonMRTStation.name}`);
                    console.log(`🔄 Checking venues around MRT station for comparison...`);
                    
                    // Search for venues around MRT station
                    const mrtVenues = await this.findSocialVenues({
                        lat: commonMRTStation.location.lat,
                        lng: commonMRTStation.location.lng
                    }, this.initialRadius);
                    
                    if (mrtVenues.length >= this.minVenuesRequired) {
                        const mrtAnalysis = await this.analyzeVenueTravelEquity(mrtVenues, startingLocations);
                        
                        if (mrtAnalysis.length > 0) {
                            const bestMRTVenue = this.findMostEquitableVenue(mrtAnalysis);
                            
                            console.log(`🏆 Best venue near ${commonMRTStation.name}: ${bestMRTVenue.name} (equity: ${bestMRTVenue.equityScore.toFixed(2)})`);
                            console.log(`⚖️ Comparing: Original venue equity=${currentBestVenue.equityScore.toFixed(2)} vs MRT area equity=${bestMRTVenue.equityScore.toFixed(2)}`);
                            
                            // Only switch to MRT area if it's actually better
                            if (bestMRTVenue.equityScore < currentBestVenue.equityScore) {
                                console.log(`✅ MRT area has better venue! Switching to ${bestMRTVenue.name}`);
                                bestScore = bestMRTVenue.equityScore;
                                bestMidpoint = bestMRTVenue.location;
                                currentSearchCenter = {
                                    lat: bestMRTVenue.location.lat,
                                    lng: bestMRTVenue.location.lng
                                };
                            } else {
                                console.log(`✅ Original venue is better! Staying with ${currentBestVenue.name}`);
                                // Continue with original venue-based search
                                currentSearchCenter = {
                                    lat: currentBestVenue.location.lat,
                                    lng: currentBestVenue.location.lng
                                };
                            }
                        } else {
                            console.log(`❌ No good venues found around MRT, staying with original venue`);
                            currentSearchCenter = {
                                lat: currentBestVenue.location.lat,
                                lng: currentBestVenue.location.lng
                            };
                        }
                    } else {
                        console.log(`❌ Not enough venues around MRT (${mrtVenues.length}), staying with original venue`);
                        currentSearchCenter = {
                            lat: currentBestVenue.location.lat,
                            lng: currentBestVenue.location.lng
                        };
                    }
                    
                    searchRadius = Math.max(400, searchRadius * 0.6);
                    console.log(`🎯 Focusing search around chosen venue, radius now ${searchRadius}m`);
                } else {
                    // No common MRT found, continue with normal venue-based search
                    currentSearchCenter = {
                        lat: currentBestVenue.location.lat,
                        lng: currentBestVenue.location.lng
                    };
                    searchRadius = Math.max(400, searchRadius * 0.6);
                    console.log(`🎯 Focusing search around best venue, radius now ${searchRadius}m`);
                }
            } else {
                searchRadius *= this.radiusIncrementFactor;
                console.log(`🔄 No improvement found, expanding to ${searchRadius}m`);
            }
            
            if (bestMidpoint && currentBestVenue && 
                currentBestVenue.timeVariance < 4.0 && 
                currentBestVenue.timeRange <= this.maxAcceptableTimeDifference) {
                console.log(`🏆 Excellent equity found (variance < 4min², range ≤ ${this.maxAcceptableTimeDifference}min), stopping early!`);
                break;
            }
        }
        
        setTimeout(() => {
            if (radiusCircle) radiusCircle.setMap(null);
        }, 3000);
        
        if (bestMidpoint) {
            console.log(`✅ Algorithm complete! Best location found with equity score: ${bestScore.toFixed(2)}`);
            console.log(`🎯 Final coordinates: lat=${bestMidpoint.lat}, lng=${bestMidpoint.lng}`);
            const finalResult = new google.maps.LatLng(bestMidpoint.lat, bestMidpoint.lng);
            console.log(`🎯 Returning LatLng object:`, finalResult.toString());
            return finalResult;
        } else {
            console.log(`⚠️ No suitable location found, falling back to geometric midpoint`);
            console.log(`🎯 Fallback coordinates: lat=${currentSearchCenter.lat}, lng=${currentSearchCenter.lng}`);
            const fallbackResult = new google.maps.LatLng(currentSearchCenter.lat, currentSearchCenter.lng);
            console.log(`🎯 Returning fallback LatLng object:`, fallbackResult.toString());
            return fallbackResult;
        }
    }

    async findCommonMRTStation(startingLocations, venueLocation) {
        if (startingLocations.length !== 2) return null;
        
        console.log('🚇 Checking if routes to venue pass through common transit stops...');
        
        try {
            const directionsService = new google.maps.DirectionsService();
            const routes = [];
            
            // Get transit routes from each starting location to the venue
            for (let i = 0; i < startingLocations.length; i++) {
                try {
                    const route = await new Promise((resolve, reject) => {
                        directionsService.route({
                            origin: startingLocations[i],
                            destination: venueLocation,
                            travelMode: google.maps.TravelMode.TRANSIT,
                            transitOptions: {
                                modes: [google.maps.TransitMode.RAIL, google.maps.TransitMode.BUS], // Added BUS
                                routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS
                            }
                        }, function(result, status) {
                            if (status === google.maps.DirectionsStatus.OK) {
                                resolve(result);
                            } else {
                                reject(new Error(`Route ${i + 1} failed: ${status}`));
                            }
                        });
                    });
                    routes.push(route);
                } catch (error) {
                    console.log(`   Route ${i + 1} failed: ${error.message}`);
                    return null; // If any route fails, can't find common station
                }
            }
            
            // Extract all transit stops (MRT, LRT, and major bus interchanges) from each route
            const allStationsInRoutes = routes.map(route => {
                const stations = [];
                route.routes[0].legs[0].steps.forEach(step => {
                    if (step.travel_mode === 'TRANSIT' && step.transit) {
                        const transitLine = step.transit.line;
                        const vehicleType = transitLine?.vehicle?.type;
                        
                        // Include MRT/LRT stations and major bus interchanges
                        const isMajorTransitStop = 
                            vehicleType === 'HEAVY_RAIL' ||  // MRT
                            vehicleType === 'METRO_RAIL' ||  // LRT  
                            (vehicleType === 'BUS' && (
                                step.transit.departure_stop?.name?.toLowerCase().includes('interchange') ||
                                step.transit.departure_stop?.name?.toLowerCase().includes('terminal') ||
                                step.transit.arrival_stop?.name?.toLowerCase().includes('interchange') ||
                                step.transit.arrival_stop?.name?.toLowerCase().includes('terminal')
                            ));
                        
                        if (isMajorTransitStop) {
                            // Add both departure and arrival stops
                            if (step.transit.departure_stop) {
                                stations.push({
                                    name: step.transit.departure_stop.name,
                                    location: {
                                        lat: step.transit.departure_stop.location.lat(),
                                        lng: step.transit.departure_stop.location.lng()
                                    },
                                    type: vehicleType
                                });
                            }
                            if (step.transit.arrival_stop) {
                                stations.push({
                                    name: step.transit.arrival_stop.name,
                                    location: {
                                        lat: step.transit.arrival_stop.location.lat(),
                                        lng: step.transit.arrival_stop.location.lng()
                                    },
                                    type: vehicleType
                                });
                            }
                        }
                    }
                });
                return stations;
            });
            
            console.log(`   Route 1 transit stops: ${allStationsInRoutes[0].map(s => `${s.name} (${s.type})`).join(', ')}`);
            console.log(`   Route 2 transit stops: ${allStationsInRoutes[1].map(s => `${s.name} (${s.type})`).join(', ')}`);
            
            // Find common transit stops (prioritize MRT/LRT over bus interchanges)
            const commonStations = allStationsInRoutes[0].filter(station1 => 
                allStationsInRoutes[1].some(station2 => 
                    station1.name === station2.name
                )
            );
            
            if (commonStations.length > 0) {
                // Prioritize MRT/LRT stations over bus interchanges
                const mrtStations = commonStations.filter(s => s.type === 'HEAVY_RAIL' || s.type === 'METRO_RAIL');
                const busInterchanges = commonStations.filter(s => s.type === 'BUS');
                
                const bestStation = mrtStations.length > 0 ? mrtStations[0] : busInterchanges[0];
                console.log(`   ✅ Found common transit stop: ${bestStation.name} (${bestStation.type})`);
                return bestStation;
            } else {
                console.log('   No common major transit stops found on routes');
                return null;
            }
            
        } catch (error) {
            console.log(`   Common MRT check failed: ${error.message}`);
            return null;
        }
    }

    async findTransitLineMidpoint(startingLocations) {
        if (startingLocations.length !== 2) return null;
        
        console.log('🚇 Checking for MRT stations on direct transit route...');
        
        try {
            const directionsService = new google.maps.DirectionsService();
            
            console.log('   Getting transit directions...');
            const transitRoute = await new Promise((resolve, reject) => {
                directionsService.route({
                    origin: startingLocations[0],
                    destination: startingLocations[1],
                    travelMode: google.maps.TravelMode.TRANSIT,
                    transitOptions: {
                        modes: [google.maps.TransitMode.RAIL],
                        routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS
                    }
                }, function(result, status) {
                    console.log(`   Transit directions status: ${status}`);
                    if (status === google.maps.DirectionsStatus.OK) {
                        resolve(result);
                    } else {
                        reject(new Error(`Transit route failed: ${status}`));
                    }
                });
            });
            
            const route = transitRoute.routes[0];
            const leg = route.legs[0];
            console.log(`   Route found with ${leg.steps.length} steps`);
            
            const transitSteps = leg.steps.filter(step => step.travel_mode === 'TRANSIT');
            console.log(`   Found ${transitSteps.length} transit steps`);
            
            if (transitSteps.length === 0) {
                console.log('   No transit steps found, trying different approach...');
                // Fallback: search for MRT stations along the geometric midpoint
                return await this.findMRTNearGeometricMidpoint(startingLocations);
            }
            
            // Log transit step details for debugging
            transitSteps.forEach((step, i) => {
                const transit = step.transit;
                if (transit) {
                    console.log(`   Transit step ${i + 1}: ${transit.line?.name || transit.line?.short_name || 'Unknown line'}`);
                    console.log(`     From: ${transit.departure_stop?.name || 'Unknown'}`);
                    console.log(`     To: ${transit.arrival_stop?.name || 'Unknown'}`);
                }
            });
            
            // If we have transit steps, try to find midpoint station
            if (transitSteps.length >= 1) {
                const firstTransitStep = transitSteps[0];
                const transitDetails = firstTransitStep.transit;
                
                if (transitDetails && transitDetails.departure_stop && transitDetails.arrival_stop) {
                    console.log(`   Analyzing transit line: ${transitDetails.line?.name || transitDetails.line?.short_name}`);
                    
                    // Calculate midpoint between start and end stations
                    const startStation = transitDetails.departure_stop;
                    const endStation = transitDetails.arrival_stop;
                    
                    const routeMidpoint = this.calculateGeometricMidpoint([
                        startStation.location,
                        endStation.location
                    ]);
                    
                    console.log(`   Route midpoint: ${routeMidpoint.lat}, ${routeMidpoint.lng}`);
                    
                    // Search for MRT stations near this midpoint
                    const nearbyStations = await this.findNearbyMRTStations(routeMidpoint, 3000); // Increased radius
                    
                    if (nearbyStations.length > 0) {
                        const bestStation = nearbyStations[0];
                        console.log(`   🏆 Optimal transit station found: ${bestStation.name}`);
                        return new google.maps.LatLng(
                            bestStation.geometry.location.lat(),
                            bestStation.geometry.location.lng()
                        );
                    } else {
                        console.log('   No MRT stations found near route midpoint');
                    }
                }
            }
            
            console.log('   Falling back to geometric midpoint approach...');
            return await this.findMRTNearGeometricMidpoint(startingLocations);
            
        } catch (error) {
            console.log(`   Transit analysis failed: ${error.message}`);
            console.log('   Trying fallback MRT search...');
            return await this.findMRTNearGeometricMidpoint(startingLocations);
        }
    }

    async findMRTNearGeometricMidpoint(startingLocations) {
        console.log('   🔄 Fallback: Searching for MRT stations near geometric midpoint...');
        
        const geometricMidpoint = this.calculateGeometricMidpoint(startingLocations);
        console.log(`   Geometric midpoint: ${geometricMidpoint.lat}, ${geometricMidpoint.lng}`);
        
        const nearbyStations = await this.findNearbyMRTStations(geometricMidpoint, 5000); // Large radius
        
        if (nearbyStations.length > 0) {
            const bestStation = nearbyStations[0];
            console.log(`   🏆 Found nearby MRT station: ${bestStation.name}`);
            return new google.maps.LatLng(
                bestStation.geometry.location.lat(),
                bestStation.geometry.location.lng()
            );
        }
        
        console.log('   No MRT stations found near geometric midpoint either');
        return null;
    }

    async findNearbyMRTStations(center, radius) {
        const self = this;
        return new Promise((resolve) => {
            if (!window.placesService) {
                console.log('   Places service not available');
                resolve([]);
                return;
            }
    
            console.log(`   Searching for MRT stations within ${radius}m...`);
            
            window.placesService.nearbySearch({
                location: new google.maps.LatLng(center.lat, center.lng),
                radius: radius,
                types: ['subway_station', 'transit_station'],
                keyword: 'MRT station Singapore'
            }, function(results, status) {
                console.log(`   Places API status: ${status}`);
                console.log(`   Raw results count: ${results ? results.length : 0}`);
                
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    // Enhanced Singapore MRT station detection
                    const stations = results.filter(place => {
                        const name = place.name.toLowerCase();
                        const types = place.types.join(' ').toLowerCase();
                        
                        // Singapore-specific MRT station patterns
                        const isMRTStation = 
                            // Explicit MRT mentions
                            name.includes('mrt') || 
                            name.includes('station') ||
                            name.includes('interchange') ||
                            
                            // Google Places types
                            types.includes('subway_station') ||
                            types.includes('transit_station') ||
                            
                            // Major interchange stations (even without MRT in name)
                            ['dhoby ghaut', 'raffles place', 'city hall', 'bugis', 'outram park', 
                             'paya lebar', 'jurong east', 'bishan', 'tampines', 'ang mo kio',
                             'serangoon', 'marina bay', 'bayfront', 'promenade', 'esplanade'].some(station => 
                                name.includes(station.replace(' ', '')) || name.includes(station)
                            ) ||
                            
                            // Line-specific patterns (for stations that don't say "MRT")
                            name.match(/\b(ns|ew|cc|ne|dt|te|ce|cp)\d+\b/i) || // Station codes
                            
                            // Common Singapore station naming patterns
                            name.match(/\w+\s+(mrt|station)/) ||
                            
                            // Shopping malls that are MRT stations
                            ['vivocity', 'marina square', 'citylink', 'raffles city'].some(mall => 
                                name.includes(mall.replace(' ', ''))
                            );
                        
                        // Exclude false positives
                        const isFalsePositive = 
                            name.includes('bus') && !name.includes('mrt') ||
                            name.includes('taxi') ||
                            name.includes('parking') ||
                            name.includes('hotel') ||
                            name.includes('restaurant') ||
                            name.includes('mall') && !name.includes('mrt') && !name.includes('station');
                        
                        if (isMRTStation && !isFalsePositive) {
                            console.log(`     ✅ Accepted: ${place.name}`);
                            return true;
                        } else {
                            console.log(`     ❌ Rejected: ${place.name} (${isFalsePositive ? 'false positive' : 'not MRT station'})`);
                            return false;
                        }
                    });
                    
                    // Enhanced sorting: prioritize interchange stations, then by distance
                    stations.sort((a, b) => {
                        const aName = a.name.toLowerCase();
                        const bName = b.name.toLowerCase();
                        
                        // Major interchanges get priority
                        const majorInterchanges = [
                            'dhoby ghaut', 'raffles place', 'city hall', 'bugis', 'outram park',
                            'paya lebar', 'jurong east', 'bishan', 'serangoon', 'bayfront'
                        ];
                        
                        const aIsInterchange = majorInterchanges.some(station => aName.includes(station.replace(' ', ''))) ||
                                              aName.includes('interchange');
                        const bIsInterchange = majorInterchanges.some(station => bName.includes(station.replace(' ', ''))) ||
                                              bName.includes('interchange');
                        
                        if (aIsInterchange && !bIsInterchange) return -1;
                        if (!aIsInterchange && bIsInterchange) return 1;
                        
                        // If both or neither are interchanges, sort by distance
                        const distA = self.calculateDistance(center, {
                            lat: a.geometry.location.lat(),
                            lng: a.geometry.location.lng()
                        });
                        const distB = self.calculateDistance(center, {
                            lat: b.geometry.location.lat(),
                            lng: b.geometry.location.lng()
                        });
                        return distA - distB;
                    });
                    
                    console.log(`   Found ${stations.length} MRT stations after enhanced filtering`);
                    if (stations.length > 0) {
                        console.log(`   Priority stations: ${stations.slice(0, 3).map(s => s.name).join(', ')}`);
                    }
                    resolve(stations);
                } else {
                    console.log(`   MRT station search failed: ${status}`);
                    resolve([]);
                }
            });
        });
    }
    
    showRadiusCircle(center, radius, existingCircle) {
        if (existingCircle) existingCircle.setMap(null);
        
        const circle = new google.maps.Circle({
            strokeColor: '#8B5DB8',
            strokeOpacity: 0.6,
            strokeWeight: 2,
            fillColor: '#8B5DB8',
            fillOpacity: 0.1,
            map: window.midwhereahMap,
            center: new google.maps.LatLng(center.lat, center.lng),
            radius: radius
        });
        
        return circle;
    }

    calculateGeometricMidpoint(locations) {
        let totalLat = 0, totalLng = 0;
        locations.forEach(location => {
            totalLat += typeof location.lat === 'function' ? location.lat() : location.lat;
            totalLng += typeof location.lng === 'function' ? location.lng() : location.lng;
        });
        return { 
            lat: totalLat / locations.length, 
            lng: totalLng / locations.length 
        };
    }

    async findSocialVenues(center, radius) {
        return new Promise((resolve) => {
            if (!window.placesService) {
                resolve([]);
                return;
            }

            window.placesService.nearbySearch({
                location: new google.maps.LatLng(center.lat, center.lng),
                radius: radius,
                types: this.socialPlaceTypes,
                openNow: true
            }, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    const filtered = results.filter(place => {
                        if (!place.rating || place.rating < 3.8) return false;
                        if (!place.user_ratings_total || place.user_ratings_total < 5) return false;
                        
                        const name = place.name.toLowerCase();
                        const excludeKeywords = [
                            // Private/Exclusive venues
                            'private', 'club', 'country club', 'golf', 'yacht',
                            'members only', 'exclusive', 'condo', 'condominium',
                            
                            // Singapore club abbreviations (CRITICAL!)
                            'sicc', 'tcc', 'rcc', 'acc', 'scc', 'sgcc',
                            'rc ', ' rc', 'cc ', ' cc',
                            
                            // Inappropriate/Inaccessible places
                            'reservoir', 'cemetery', 'hospital', 'clinic', 'hotel room',
                            'medical', 'dental', 'pharmacy', 'bank', 'atm',
                            
                            // Singapore-specific exclusions
                            'sentosa cove', 'country club', 'golf club', 'polo club',
                            'raffles country', 'singapore island', 'tanglin club',
                            'american club', 'singapore cricket', 'orchid country',
                            'warren golf', 'sembawang country', 'laguna national',
                            
                            // Golf-related terms (but not marina - too many false positives)
                            'look out', 'lookout', 'clubhouse', 'pro shop',
                            'tee box', 'driving range', 'putting green'
                        ];
                        
                        // More precise marina filtering - only exclude actual marinas, not places named after Marina area
                        const isActualMarina = name.includes('marina') && (
                            name.includes('yacht') || 
                            name.includes('boat') || 
                            name.includes('sailing') ||
                            place.types.some(type => type.includes('marina'))
                        );
                        
                        if (isActualMarina) {
                            console.log(`❌ Excluded: ${place.name} (actual marina/yacht facility)`);
                            return false;
                        }
                        
                        if (excludeKeywords.some(keyword => name.includes(keyword))) {
                            console.log(`❌ Excluded: ${place.name} (contains: ${excludeKeywords.find(k => name.includes(k))})`);
                            return false;
                        }
                        
                        const excludeTypes = [
                            'country_club', 'golf_course', 'private_club', 'yacht_club',
                            'health', 'hospital', 'pharmacy', 'bank', 'atm',
                            'real_estate_agency', 'insurance_agency', 'lawyer'
                        ];
                        if (place.types && place.types.some(type => excludeTypes.includes(type))) {
                            console.log(`❌ Excluded: ${place.name} (type: ${place.types.find(t => excludeTypes.includes(t))})`);
                            return false;
                        }
                        
                        const goodTypes = [
                            'restaurant', 'cafe', 'shopping_mall', 'food', 'establishment', 
                            'store', 'bakery', 'bar', 'movie_theater', 'park', 
                            'tourist_attraction', 'museum', 'library', 'subway_station',
                            'point_of_interest', 'meal_takeaway'
                        ];
                        const hasGoodType = place.types.some(type => goodTypes.includes(type));
                        
                        if (!hasGoodType) {
                            console.log(`❌ Excluded: ${place.name} (no good types: ${place.types.join(', ')})`);
                            return false;
                        }
                        
                        return true;
                    });
                    
                    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                    const topVenues = filtered.slice(0, 15);
                    
                    console.log(`   Filtered to ${topVenues.length} high-quality venues`);
                    resolve(topVenues);
                } else {
                    console.warn(`   Places search failed: ${status}`);
                    resolve([]);
                }
            });
        });

        
    }

    // 2. Rebalance the equity scoring weights
    calculateEquityScore(travelTimes, avgTime, mixedMode, timeRange) {
        const timeVariance = this.calculateVariance(travelTimes);
        
        // Normalize values to prevent one metric from dominating
        const normalizedVariance = timeVariance / 100; // Typical variance 0-100
        const normalizedRange = timeRange / 60; // Typical range 0-60min  
        const normalizedAvgTime = avgTime / this.maxTravelTimeMinutes; // 0-1 scale
        
        // More balanced weights
        let equityScore = (normalizedVariance * 0.5) + 
                        (normalizedRange * 0.3) + 
                        (normalizedAvgTime * 0.4); // Favor efficient locations
        
        // Mixed mode penalty (but less harsh)
        if (mixedMode && timeRange > this.maxAcceptableTimeDifference * 0.8) {
            const mixedModePenalty = Math.pow(timeRange / this.maxAcceptableTimeDifference, 1.2) * 0.2;
            equityScore += mixedModePenalty;
            console.log(`   ⚠️ Mixed mode penalty: +${mixedModePenalty.toFixed(2)}`);
        }
        
        return equityScore;
    }

    // 3. Update the analysis method to use new scoring
    async analyzeVenueTravelEquity(venues, startingLocations) {
        console.log(`📊 Analyzing travel equity for ${venues.length} venues...`);
        const directionsService = new google.maps.DirectionsService();
        const analysis = [];

        for (let i = 0; i < venues.length; i++) {
            const venue = venues[i];
            
            const modeResult = await this.findPerUserTransportMode(
                directionsService, 
                startingLocations, 
                venue.geometry.location,
                venue.name
            );
            
            if (!modeResult) {
                console.log(`❌ ${venue.name}: Cannot reach with selected transport modes`);
                continue;
            }
            
            const { travelTimes, transportModes, mixedMode } = modeResult;
            
            const maxTime = Math.max(...travelTimes);
            const minTime = Math.min(...travelTimes);
            const avgTime = travelTimes.reduce((a, b) => a + b, 0) / travelTimes.length;
            const timeVariance = this.calculateVariance(travelTimes);
            const timeRange = maxTime - minTime;
            
            // Use the new balanced scoring system
            const equityScore = this.calculateEquityScore(travelTimes, avgTime, mixedMode, timeRange);
            
            analysis.push({
                name: venue.name,
                location: {
                    lat: venue.geometry.location.lat(),
                    lng: venue.geometry.location.lng()
                },
                travelTimes: travelTimes,
                maxTravelTime: maxTime,
                minTravelTime: minTime,
                avgTravelTime: avgTime,
                timeVariance: timeVariance,
                timeRange: timeRange,
                equityScore: equityScore,
                rating: venue.rating,
                types: venue.types,
                venue: venue,
                transportModes: transportModes,
                mixedMode: mixedMode
            });
        }

        analysis.sort((a, b) => a.equityScore - b.equityScore);
        
        console.log(`   ✅ Successfully analyzed ${analysis.length} venues`);
        
        analysis.slice(0, 3).forEach((venue, idx) => {
            const modeText = venue.mixedMode ? 
                `${venue.transportModes[0]}/${venue.transportModes[1]}` : 
                venue.transportModes[0];
            console.log(`   ${idx + 1}. ${venue.name} [${modeText}]: equity=${venue.equityScore.toFixed(2)}, variance=${venue.timeVariance.toFixed(1)}min², range=${venue.timeRange.toFixed(1)}min, avg=${venue.avgTravelTime.toFixed(1)}min`);
        });
        
        return analysis;
    }

    // NEW METHOD: Find a transport mode that works for everyone
    async findPerUserTransportMode(directionsService, startingLocations, destination, venueName) {
        console.log(`🚌 Calculating travel times using each person's preferred transport mode for ${venueName}...`);
        
        const userModes = [
            window.userTransportModes['location-1'] || 'TRANSIT',
            window.userTransportModes['location-2'] || 'TRANSIT'
        ];
        
        console.log(`   Person 1 prefers: ${userModes[0]}`);
        console.log(`   Person 2 prefers: ${userModes[1]}`);
        
        const travelTimes = [];
        const actualModes = [];
        
        // Calculate travel time for each person using their preferred mode
        for (let personIdx = 0; personIdx < startingLocations.length; personIdx++) {
            const preferredMode = userModes[personIdx];
            const googleMapsMode = this.convertToGoogleMapsMode(preferredMode);
            
            try {
                const time = await this.getTravelTime(
                    directionsService,
                    startingLocations[personIdx],
                    destination,
                    googleMapsMode
                );
                
                if (!time) {
                    console.log(`     ❌ Person ${personIdx + 1}: ${preferredMode} route failed`);
                    return null;
                }
                
                // Apply mode-specific multipliers and limits
                const modeConfig = this.getTransportModeConfig(preferredMode);
                const adjustedTime = time * modeConfig.multiplier;
                
                if (adjustedTime > modeConfig.maxTime) {
                    console.log(`     ❌ Person ${personIdx + 1}: ${preferredMode} ${adjustedTime.toFixed(1)}min > ${modeConfig.maxTime}min limit`);
                    return null;
                }
                
                console.log(`     ✅ Person ${personIdx + 1}: ${preferredMode} ${adjustedTime.toFixed(1)}min`);
                travelTimes.push(adjustedTime);
                actualModes.push(preferredMode);
                
            } catch (error) {
                console.log(`     ❌ Person ${personIdx + 1}: ${preferredMode} error - ${error.message}`);
                return null;
            }
        }
        
        const maxTime = Math.max(...travelTimes);
        const minTime = Math.min(...travelTimes);
        const range = maxTime - minTime;
        
        console.log(`   ✅ Mixed modes work! Person 1: ${actualModes[0]} ${travelTimes[0].toFixed(1)}min, Person 2: ${actualModes[1]} ${travelTimes[1].toFixed(1)}min (range: ${range.toFixed(1)}min)`);
        
        return {
            travelTimes: travelTimes,
            transportModes: actualModes, // Array of modes used
            mixedMode: actualModes[0] !== actualModes[1]
        };
    }


    async getTravelTime(directionsService, origin, destination, travelMode) {
        return new Promise((resolve, reject) => {
            const request = {
                origin: origin,
                destination: destination,
                travelMode: travelMode
            };
            
            if (travelMode === google.maps.TravelMode.TRANSIT) {
                request.transitOptions = {
                    modes: [google.maps.TransitMode.BUS, google.maps.TransitMode.RAIL],
                    routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS
                };
            }
            
            directionsService.route(request, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                    const durationMinutes = result.routes[0].legs[0].duration.value / 60;
                    resolve(durationMinutes);
                } else {
                    reject(new Error(`Directions failed: ${status}`));
                }
            });
        });
    }

    findParetoOptimalVenues(analysis) {
        console.log('🎯 Finding Pareto optimal venues (mathematically fair solutions)...');
        
        if (analysis.length === 0) return [];
        
        // Create points for Pareto analysis: [person1_time, person2_time, venue_data]
        const points = analysis.map(venue => ({
            person1Time: venue.travelTimes[0],
            person2Time: venue.travelTimes[1],
            venue: venue
        }));
        
        // Find Pareto front: points where no other point dominates
        const paretoFront = [];
        
        for (let i = 0; i < points.length; i++) {
            const currentPoint = points[i];
            let isDominated = false;
            
            // Check if any other point dominates this one
            for (let j = 0; j < points.length; j++) {
                if (i === j) continue;
                
                const otherPoint = points[j];
                
                // Point A dominates point B if A is better in all objectives
                const dominatesInTime1 = otherPoint.person1Time <= currentPoint.person1Time;
                const dominatesInTime2 = otherPoint.person2Time <= currentPoint.person2Time;
                const strictlyBetterInOne = otherPoint.person1Time < currentPoint.person1Time || 
                                           otherPoint.person2Time < currentPoint.person2Time;
                
                if (dominatesInTime1 && dominatesInTime2 && strictlyBetterInOne) {
                    isDominated = true;
                    console.log(`   ${currentPoint.venue.name} dominated by ${otherPoint.venue.name}`);
                    break;
                }
            }
            
            if (!isDominated) {
                paretoFront.push(currentPoint);
            }
        }
        
        console.log(`   🏆 Found ${paretoFront.length} Pareto optimal venues from ${analysis.length} candidates`);
        
        // Sort Pareto front by "closeness to ideal" (equal travel times + minimal total time)
        paretoFront.sort((a, b) => {
            const idealDistance_a = Math.sqrt(
                Math.pow(a.person1Time - a.person2Time, 2) + // Fairness: prefer equal times
                Math.pow((a.person1Time + a.person2Time) / 2 - 30, 2) // Efficiency: prefer ~30min total
            );
            
            const idealDistance_b = Math.sqrt(
                Math.pow(b.person1Time - b.person2Time, 2) + 
                Math.pow((b.person1Time + b.person2Time) / 2 - 30, 2)
            );
            
            return idealDistance_a - idealDistance_b;
        });
        
        // Log the Pareto front for debugging
        console.log('   📊 Pareto optimal solutions:');
        paretoFront.slice(0, 5).forEach((point, idx) => {
            const venue = point.venue;
            const fairnessGap = Math.abs(point.person1Time - point.person2Time);
            console.log(`   ${idx + 1}. ${venue.name}: [${point.person1Time.toFixed(1)}min, ${point.person2Time.toFixed(1)}min] gap=${fairnessGap.toFixed(1)}min`);
        });
        
        return paretoFront.map(point => point.venue);
    }
    
    /**
     * Enhanced version of findMostEquitableVenue using Pareto optimization
     */
    findMostEquitableVenue(analysis) {
        if (analysis.length === 0) return null;
        
        const paretoOptimal = this.findParetoOptimalVenues(analysis);
        
        if (paretoOptimal.length === 0) {
            console.warn('No Pareto optimal venues found, falling back to best single venue');
            return analysis[0];
        }
        
        const best = paretoOptimal[0];
        
        console.log(`🎯 Selected Pareto optimal venue: ${best.name}`);
        console.log(`   Travel times: [${best.travelTimes.map(t => t.toFixed(1)).join(', ')}] minutes`);
        console.log(`   Fairness gap: ${Math.abs(best.travelTimes[0] - best.travelTimes[1]).toFixed(1)} minutes`);
        console.log(`   Average time: ${best.avgTravelTime.toFixed(1)} minutes`);
        
        // 🔥 NEW: Store the algorithm's calculated times globally
        window.algorithmCalculatedTimes = {
            venue: best,
            travelTimes: best.travelTimes,
            transportModes: best.transportModes,
            mixedMode: best.mixedMode
        };
        
        return best;
    }

    calculateVariance(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
        return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    }

    calculateDistance(p1, p2) {
        const R = 6371000;
        const lat1Rad = p1.lat * Math.PI / 180;
        const lat2Rad = p2.lat * Math.PI / 180;
        const deltaLat = (p2.lat - p1.lat) * Math.PI / 180;
        const deltaLng = (p2.lng - p1.lng) * Math.PI / 180;

        const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
        return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * R;
    }
    convertToGoogleMapsMode(uiMode) {
        switch (uiMode) {
            case 'TRANSIT': return google.maps.TravelMode.TRANSIT;
            case 'DRIVING': return google.maps.TravelMode.DRIVING;
            case 'WALKING': return google.maps.TravelMode.WALKING;
            default: return google.maps.TravelMode.TRANSIT;
        }
    }
    
    getTransportModeConfig(mode) {
        const baseConfigs = {
            'TRANSIT': { multiplier: 1.0, maxTime: this.maxTravelTimeMinutes },
            'WALKING': { multiplier: 1.0, maxTime: 45 }, // Walking has shorter limit
            'DRIVING': { multiplier: 1.3, maxTime: this.maxTravelTimeMinutes } // Driving penalty for traffic
        };
        
        return baseConfigs[mode] || baseConfigs['TRANSIT'];
    }

}

// Replace the existing calculateSocialMidpoint function
async function calculateSocialMidpoint(locations) {
    const calculator = new EnhancedSocialMidpointCalculator();
    const result = await calculator.calculateSocialMidpoint(locations);
    return result;
}

// Initialize map with Singapore as default center
async function initMap() {
    console.log('initMap called');

    const singapore = { lat: 1.3521, lng: 103.8198 };

    try {
        const mapContainer = document.getElementById("map");
        if (!mapContainer) {
            console.error("Map container not found!");
            return;
        }
        
        console.log('Map container found:', mapContainer);
        console.log('Map container dimensions:', mapContainer.offsetWidth, mapContainer.offsetHeight);
        
        if (mapContainer.offsetWidth === 0 || mapContainer.offsetHeight === 0) {
            console.log('Fixing map container dimensions');
            mapContainer.style.width = '100vw';
            mapContainer.style.height = '100vh';
        }
        
        const { Map } = await google.maps.importLibrary("maps");
        const { PlaceAutocompleteElement } = await google.maps.importLibrary("places");
        
        window.PlaceAutocompleteElement = PlaceAutocompleteElement;
        
        const map = new Map(mapContainer, {
            center: singapore,
            zoom: 10,
            mapTypeControl: false,
            fullscreenControl: false,
            streetViewControl: false,
            zoomControl: false
        });
        
        window.midwhereahMap = map;
        
        window.dispatchEvent(new Event('resize'));
        
        await initLocationAutocomplete();
        
        setupMapMarkers();
        
        window.placesService = new google.maps.places.PlacesService(map);
        
        console.log("Google Maps initialized successfully");
    } catch (error) {
        console.error("Error initializing Google Maps:", error);
    }
}

// Initialize Google Places Autocomplete for location inputs
async function initLocationAutocomplete() {
    const locationInputs = document.querySelectorAll('.location-input');

    try {
        if (window.PlaceAutocompleteElement) {
            console.log('Using PlaceAutocompleteElement API');
            await initWithPlaceAutocompleteElement(locationInputs);
        } else {
            console.log('Loading Places API...');
            const { Autocomplete } = await google.maps.importLibrary("places");
            window.Autocomplete = Autocomplete;
            console.log('Falling back to legacy Autocomplete API');
            initWithLegacyAutocomplete(locationInputs);
        }
    } catch (error) {
        console.error('Error initializing location autocomplete:', error);
    }
}

async function initWithPlaceAutocompleteElement(locationInputs) {
    try {
        locationInputs.forEach(input => {
            const wrapper = document.createElement('div');
            wrapper.className = 'place-autocomplete-wrapper';
            
            const parent = input.parentNode;
            parent.insertBefore(wrapper, input);
            parent.removeChild(input);
            
            const autocompleteElement = new window.PlaceAutocompleteElement({
                inputElement: input,
                componentRestrictions: { country: "sg" },
                types: ["address"]
            });
            
            wrapper.appendChild(input);
            
            input.autocompleteElement = autocompleteElement;
            
            autocompleteElement.addEventListener('place_changed', function() {
                try {
                    const place = autocompleteElement.getPlace();
                    if (!place || !place.geometry) {
                        console.warn("No details available for selected place");
                        return;
                    }
                    
                    addLocationMarker(place.geometry.location, input.id);
                    checkBothLocationsAndShowButton();
                } catch (error) {
                    console.error('Error handling place selection:', error);
                }
            });
        });
    } catch (error) {
        console.error('Error initializing PlaceAutocompleteElement:', error);
    }
}

function initWithLegacyAutocomplete(locationInputs) {
    try {
        locationInputs.forEach(input => {
            const autocomplete = new window.Autocomplete(input, {
                componentRestrictions: { country: "sg" },
                fields: ["address_components", "geometry", "name"],
                types: ["address"]
            });
            
            input.autocomplete = autocomplete;
            
            autocomplete.addListener('place_changed', function() {
                const place = autocomplete.getPlace();
                if (!place.geometry) {
                    window.alert("No details available for: '" + place.name + "'");
                    return;
                }
                
                addLocationMarker(place.geometry.location, input.id);
                checkBothLocationsAndShowButton();
            });
        });
    } catch (error) {
        console.error('Error initializing legacy Autocomplete:', error);
    }
}

function setupMapMarkers() {
    window.locationMarkers = {};
    window.midpointMarker = null;

    if (window.google && window.google.maps) {
        window.geocoder = new google.maps.Geocoder();
    }
}

function addLocationMarker(location, inputId) {
    if (window.locationMarkers && window.locationMarkers[inputId]) {
        window.locationMarkers[inputId].setMap(null);
    }

    const marker = new google.maps.Marker({
        position: location,
        map: window.midwhereahMap,
        title: document.getElementById(inputId) ? document.getElementById(inputId).value : 'Location',
        animation: google.maps.Animation.DROP
    });

    window.locationMarkers[inputId] = marker;

    if (window.midwhereahMap) {
        window.midwhereahMap.panTo(location);
    }

    setTimeout(() => {
        calculateMidpointFromMarkers();
    }, 100);
}

function checkBothLocationsAndShowButton() {
    const location1 = document.getElementById('location-1');
    const location2 = document.getElementById('location-2');
    const findCentralBtn = document.getElementById('find-central-btn');

    if (!location1 || !location2 || !findCentralBtn) return;

    const hasValue1 = location1.value.trim() !== '';
    const hasValue2 = location2.value.trim() !== '';

    if (hasValue1 && hasValue2) {
        findCentralBtn.classList.add('active');
        console.log('Both locations filled, showing button');
        
        window.calculatedMidpoint = null;
        
        if (window.midpointMarker) {
            window.midpointMarker.setVisible(false);
        }
        
        geocodeAndCreateMarkers();
    } else {
        findCentralBtn.classList.remove('active');
        window.calculatedMidpoint = null;
        
        if (!hasValue1 && window.locationMarkers['location-1']) {
            window.locationMarkers['location-1'].setMap(null);
            delete window.locationMarkers['location-1'];
        }
        if (!hasValue2 && window.locationMarkers['location-2']) {
            window.locationMarkers['location-2'].setMap(null);
            delete window.locationMarkers['location-2'];
        }
        
        if (window.midpointMarker) {
            window.midpointMarker.setVisible(false);
        }
    }
}

function geocodeAndCreateMarkers() {
    const location1 = document.getElementById('location-1');
    const location2 = document.getElementById('location-2');

    if (!location1.value.trim() || !location2.value.trim()) return;

    if (!window.geocoder && window.google && window.google.maps) {
        window.geocoder = new google.maps.Geocoder();
    }

    if (!window.geocoder) {
        console.warn('Geocoder not available yet');
        return;
    }

    if (window.geocodingTimeout1) {
        clearTimeout(window.geocodingTimeout1);
    }
    if (window.geocodingTimeout2) {
        clearTimeout(window.geocodingTimeout2);
    }

    let geocodedCount = 0;
    const totalNeeded = 2;

    const geocodeLocation1 = () => {
        if (!location1.value.trim()) return;
        
        window.geocoder.geocode({ 
            address: location1.value.trim() + ', Singapore',
            componentRestrictions: { country: 'SG' }
        }, function(results, status) {
            if (status === 'OK' && results[0]) {
                if (location1.value.trim() !== '') {
                    addLocationMarker(results[0].geometry.location, 'location-1');
                    geocodedCount++;
                    if (geocodedCount === totalNeeded) {
                        calculateMidpointFromMarkers();
                    }
                }
            } else {
                console.warn('Geocoding failed for location 1:', status);
            }
        });
    };

    const geocodeLocation2 = () => {
        if (!location2.value.trim()) return;
        
        window.geocoder.geocode({ 
            address: location2.value.trim() + ', Singapore',
            componentRestrictions: { country: 'SG' }
        }, function(results, status) {
            if (status === 'OK' && results[0]) {
                if (location2.value.trim() !== '') {
                    addLocationMarker(results[0].geometry.location, 'location-2');
                    geocodedCount++;
                    if (geocodedCount === totalNeeded) {
                        calculateMidpointFromMarkers();
                    }
                }
            } else {
                console.warn('Geocoding failed for location 2:', status);
            }
        });
    };

    window.geocodingTimeout1 = setTimeout(geocodeLocation1, 1000);
    window.geocodingTimeout2 = setTimeout(geocodeLocation2, 1000);
}

function calculateMidpointFromMarkers() {
    const marker1 = window.locationMarkers && window.locationMarkers['location-1'];
    const marker2 = window.locationMarkers && window.locationMarkers['location-2'];

    if (marker1 && marker2) {
        const locations = [marker1.getPosition(), marker2.getPosition()];
        
        window.calculatedMidpoint = calculateMidpoint(locations);
        console.log('Geometric midpoint calculated:', window.calculatedMidpoint);
    }
}

function calculateMidpoint(locations) {
    if (!locations || locations.length < 2) {
        console.warn('calculateMidpoint: Need at least 2 locations');
        return null;
    }

    let totalLat = 0;
    let totalLng = 0;

    locations.forEach(location => {
        if (typeof location.lat === 'function') {
            totalLat += location.lat();
            totalLng += location.lng();
        } else {
            totalLat += location.lat;
            totalLng += location.lng;
        }
    });

    const avgLat = totalLat / locations.length;
    const avgLng = totalLng / locations.length;

    return new google.maps.LatLng(avgLat, avgLng);
}

function setupMobileMenu() {
    console.log('Mobile menu disabled - no hamburger menu');
}

function setupLocationInputs() {
    const locationInputs = document.querySelectorAll('.location-input');
    locationInputs.forEach(input => {
        initializeAutocompleteForInput(input);
    });

    function initializeAutocompleteForInput(input) {
        try {
            if (google.maps.places && google.maps.places.Autocomplete) {
                const autocomplete = new google.maps.places.Autocomplete(input, {
                    componentRestrictions: { country: "sg" },
                    fields: ["address_components", "geometry", "name"],
                    types: ["address"]
                });
                
                input.autocomplete = autocomplete;
                
                autocomplete.addListener('place_changed', function() {
                    const place = autocomplete.getPlace();
                    if (!place.geometry) {
                        console.warn("No details available for: '" + place.name + "'");
                        return;
                    }
                    
                    addLocationMarker(place.geometry.location, input.id);
                    checkBothLocationsAndShowButton();
                });
            } else {
                console.warn('Google Maps Places API not available yet. Will retry initialization later.');
                setTimeout(() => {
                    if (google.maps.places && google.maps.places.Autocomplete) {
                        initializeAutocompleteForInput(input);
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('Error initializing autocomplete:', error);
        }
    }
}

function setupBottomNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(navItem => navItem.classList.remove('active'));
            
            this.classList.add('active');
            
            const page = this.getAttribute('data-page');
            
            switch(page) {
                case 'home':
                    break;
                case 'groups':
                    window.location.href = '/groups';
                    break;
                case 'profile':
                    window.location.href = '/profile';
                    break;
                case 'compass':
                    break;
                case 'create':
                    showCreateGroupModal();
                    break;
            }
        });
    });
}

function showCreateGroupModal() {
    alert('Create new group feature coming soon!');
}

function setupUserInfo() {
    if (firebase.auth) {
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                const userAvatar = document.querySelector('.user-avatar');
                const userName = document.querySelector('.user-details h3');
                
                if (user.displayName && userName) {
                    userName.textContent = user.displayName;
                    
                    if (userAvatar) {
                        const initials = user.displayName
                            .split(' ')
                            .map(name => name[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase();
                        
                        userAvatar.textContent = initials;
                    }
                }
            }
        });
    }
}

function setupVenueCard() {
    const venueCard = document.getElementById('venue-card');
    if (venueCard) {
        venueCard.style.display = 'none';
    }

    console.log('Venue cards disabled');
}

function setupFindCentralButton() {
    const findCentralBtn = document.getElementById('find-central-btn');
    if (!findCentralBtn) return;

    findCentralBtn.addEventListener('click', async function() {
        console.log('🔥 Find central button clicked - Starting Enhanced Social Fairness Algorithm!');
        
        const marker1 = window.locationMarkers && window.locationMarkers['location-1'];
        const marker2 = window.locationMarkers && window.locationMarkers['location-2'];
        
        if (!marker1 || !marker2) {
            console.warn('Missing markers for midpoint calculation');
            return;
        }
        
        if (window.midpointMarker) {
            window.midpointMarker.setMap(null);
        }
        
        const originalButtonContent = findCentralBtn.innerHTML;
        findCentralBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        findCentralBtn.style.pointerEvents = 'none';
        
        try {
            const locations = [marker1.getPosition(), marker2.getPosition()];
            
            console.log('🎯 Running Enhanced Social Fairness Algorithm (Travel Time Equity Focus)...');
            const socialMidpoint = await calculateSocialMidpoint(locations);
            window.calculatedMidpoint = socialMidpoint;
            console.log('✅ Social optimal location found:', socialMidpoint);
            console.log('🔍 DEBUG: socialMidpoint coordinates:', socialMidpoint.lat(), socialMidpoint.lng());
            
        } catch (error) {
            console.warn('Enhanced algorithm failed, using geometric midpoint:', error);
            if (!window.calculatedMidpoint) {
                window.calculatedMidpoint = calculateMidpoint([marker1.getPosition(), marker2.getPosition()]);
            }
        }
        
        findCentralBtn.innerHTML = originalButtonContent;
        findCentralBtn.style.pointerEvents = 'auto';
        
        if (!window.calculatedMidpoint) {
            console.warn('No midpoint calculated');
            return;
        }
        
        window.midpointMarker = new google.maps.Marker({
            position: window.calculatedMidpoint,
            map: window.midwhereahMap,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#4CAF50',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
                scale: 15
            },
            title: 'Optimal Meeting Spot (Fair Travel Times)',
            animation: google.maps.Animation.BOUNCE
        });
        
        setTimeout(() => {
            if (window.midpointMarker) {
                window.midpointMarker.setAnimation(null);
            }
        }, 2000);
        
        window.midwhereahMap.panTo(window.calculatedMidpoint);
        window.midwhereahMap.setZoom(16);
        
        showRoutes();
        
        findCentralBtn.classList.add('used');
        findCentralBtn.innerHTML = '<i class="fas fa-check"></i>';
        
        setTimeout(() => {
            findCentralBtn.classList.remove('active', 'used');
        }, 3000);
    });
}

function showRoutes() {
    const location1Marker = window.locationMarkers['location-1'];
    const location2Marker = window.locationMarkers['location-2'];
    const midpoint = window.calculatedMidpoint;

    if (!midpoint || !location1Marker || !location2Marker) return;

    // Clear existing routes
    if (window.routeRenderers) {
        window.routeRenderers.forEach(renderer => renderer.setMap(null));
    }
    window.routeRenderers = [];

    const directionsService = new google.maps.DirectionsService();
    const colors = ['#2196F3', '#FF9800'];
    const markers = [location1Marker, location2Marker];

    // 🔥 NEW: Use algorithm's calculated data if available
    if (window.algorithmCalculatedTimes) {
        const algoData = window.algorithmCalculatedTimes;
        console.log(`🎯 Displaying routes with algorithm's calculated times:`);
        console.log(`   Person 1 (${algoData.transportModes[0]}): ${algoData.travelTimes[0].toFixed(1)}min`);
        console.log(`   Person 2 (${algoData.transportModes[1]}): ${algoData.travelTimes[1].toFixed(1)}min`);
        console.log(`   Gap: ${Math.abs(algoData.travelTimes[0] - algoData.travelTimes[1]).toFixed(1)}min`);
        
        // Display routes but show algorithm's times in console/UI
        showRoutesWithAlgorithmTimes(markers, midpoint, directionsService, colors, algoData);
    } else {
        // Fallback to old behavior if no algorithm data
        console.log(`🚗 Showing routes: Standard calculation (no algorithm data available)`);
        showRoutesLegacy(markers, midpoint, directionsService, colors);
    }
}

function showRoutesWithAlgorithmTimes(markers, midpoint, directionsService, colors, algoData) {
    markers.forEach((marker, index) => {
        const algorithmMode = algoData.transportModes[index];
        const algorithmTime = algoData.travelTimes[index];
        
        const googleMapsMode = algorithmMode === 'TRANSIT' ? google.maps.TravelMode.TRANSIT :
                              algorithmMode === 'DRIVING' ? google.maps.TravelMode.DRIVING :
                              google.maps.TravelMode.WALKING;
        
        const request = {
            origin: marker.getPosition(),
            destination: midpoint,
            travelMode: googleMapsMode
        };

        if (googleMapsMode === google.maps.TravelMode.TRANSIT) {
            request.transitOptions = {
                modes: [google.maps.TransitMode.BUS, google.maps.TransitMode.RAIL],
                routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS
            };
        }
        
        directionsService.route(request, function(result, status) {
            if (status === google.maps.DirectionsStatus.OK) {
                const routeRenderer = new google.maps.DirectionsRenderer({
                    suppressMarkers: true,
                    polylineOptions: {
                        strokeColor: colors[index],
                        strokeOpacity: 0.8,
                        strokeWeight: 5
                    },
                    map: window.midwhereahMap
                });
                
                routeRenderer.setDirections(result);
                window.routeRenderers.push(routeRenderer);
                
                const actualDuration = result.routes[0].legs[0].duration.text;
                const actualMinutes = result.routes[0].legs[0].duration.value / 60;
                
                console.log(`Route ${index + 1} (${algorithmMode}):`);
                console.log(`   Algorithm calculated: ${algorithmTime.toFixed(1)}min`);
                console.log(`   Google Maps says: ${actualDuration} (${actualMinutes.toFixed(1)}min)`);
                console.log(`   Difference: ${Math.abs(algorithmTime - actualMinutes).toFixed(1)}min`);
                
                // 🔥 NEW: Show the ALGORITHM'S time to user, not Google's recalculation
                console.log(`   📊 Displaying algorithm time: ${algorithmTime.toFixed(0)}min`);
            } else {
                console.warn(`Route calculation failed for location ${index + 1}:`, status);
            }
        });
    });
}


// STEP 2: Setup transport mode selection (add to your DOMContentLoaded section)
function setupTransportModeSelection() {
    const transportButtons = document.querySelectorAll('.transport-btn');
    
    transportButtons.forEach(button => {
        button.addEventListener('click', function() {
            const mode = this.getAttribute('data-mode');
            const person = this.getAttribute('data-person');
            const locationId = `location-${person}`;
            
            // Update active state for this person's buttons
            const personButtons = document.querySelectorAll(`[data-person="${person}"]`);
            personButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Store preference
            window.userTransportModes[locationId] = mode;
            
            console.log(`🚗 Person ${person} selected: ${mode}`);
            
            // Recalculate if both locations are set
            setTimeout(() => {
                checkBothLocationsAndShowButton();
            }, 100);
        });
    });
}



document.addEventListener('DOMContentLoaded', function() {
    setupMobileMenu();
    setupLocationInputs();
    setupBottomNavigation();
    setupUserInfo();
    setupVenueCard();
    setupFindCentralButton();
    setupTransportModeSelection();
    
    const location1 = document.getElementById('location-1');
    const location2 = document.getElementById('location-2');

    if (location1) {
        location1.addEventListener('input', function() {
            if (window.inputTimeout1) {
                clearTimeout(window.inputTimeout1);
            }
            window.inputTimeout1 = setTimeout(() => {
                checkBothLocationsAndShowButton();
            }, 300);
        });
        
        location1.addEventListener('paste', function() {
            setTimeout(() => {
                checkBothLocationsAndShowButton();
            }, 100);
        });
    }

    if (location2) {
        location2.addEventListener('input', function() {
            if (window.inputTimeout2) {
                clearTimeout(window.inputTimeout2);
            }
            window.inputTimeout2 = setTimeout(() => {
                checkBothLocationsAndShowButton();
            }, 300);
        });
        
        location2.addEventListener('paste', function() {
            setTimeout(() => {
                checkBothLocationsAndShowButton();
            }, 100);
        });
    }

    setTimeout(checkBothLocationsAndShowButton, 500);
});