/**
 * OptimizationResultDisplay - A reusable component for displaying optimization results
 * Standardizes the display of travel times, fairness metrics, and related information
 */

function OptimizationResultDisplay(containerId, options = {}) {
    // Default configuration
    this.config = {
        // Color scheme
        colors: {
            good: '#4CAF50',    // Green
            medium: '#FFC107',  // Amber
            poor: '#F44336',    // Red
            text: '#333333',    // Dark gray
            lightText: '#757575', // Light gray
            background: '#FFFFFF', // White
            ...(options.colors || {})
        },
        
        // Animation settings
        animation: {
            duration: 300,
            easing: 'ease-in-out',
            ...(options.animation || {})
        },
        
        // Text labels
        labels: {
            averageTime: 'Average Time',
            maxTime: 'Max Time',
            fairness: 'Fairness Score',
            venuesFound: 'Venues Found',
            ...(options.labels || {})
        }
    };
    
    // DOM elements
    this.container = document.getElementById(containerId);
    if (!this.container) {
        console.error(`Container with ID "${containerId}" not found`);
        return;
    }
    
    // Initialize the component
    this.init();
}

/**
 * Initialize the component
 */
OptimizationResultDisplay.prototype.init = function() {
    // Clear the container
    this.container.innerHTML = '';
    
    // Add base structure
    this.container.innerHTML = `
        <div class="optimization-result-container">
            <div class="optimization-stats">
                <div class="stat-item" id="avg-time-stat">
                    <div class="stat-value">--</div>
                    <div class="stat-label">${this.config.labels.averageTime}</div>
                </div>
                <div class="stat-item" id="max-time-stat">
                    <div class="stat-value">--</div>
                    <div class="stat-label">${this.config.labels.maxTime}</div>
                </div>
                <div class="stat-item" id="fairness-stat">
                    <div class="stat-value">--</div>
                    <div class="stat-label">${this.config.labels.fairness}</div>
                </div>
                <div class="stat-item" id="venues-stat">
                    <div class="stat-value">--</div>
                    <div class="stat-label">${this.config.labels.venuesFound}</div>
                </div>
            </div>
            <div class="time-visualization" id="time-visualization">
                <!-- Time bars will be added here -->
            </div>
        </div>
    `;
    
    // Cache DOM elements
    this.dom = {
        avgTimeStat: this.container.querySelector('#avg-time-stat .stat-value'),
        maxTimeStat: this.container.querySelector('#max-time-stat .stat-value'),
        fairnessStat: this.container.querySelector('#fairness-stat .stat-value'),
        venuesStat: this.container.querySelector('#venues-stat .stat-value'),
        timeViz: document.getElementById('time-visualization')
    };
    
    // Apply styles
    this.applyStyles();
};

/**
 * Update the display with new optimization results
 * @param {Object} result - The optimization result object
 * @param {Array} result.times - Array of travel times in minutes
 * @param {Array} result.venues - Array of venues found
 * @param {number} result.fairness - Fairness score (0-1)
 * @param {Object} [options] - Display options
 */
OptimizationResultDisplay.prototype.update = function(result, options = {}) {
    if (!result) return;
    
    const times = result.times || [];
    const venues = result.venues || [];
    const fairness = typeof result.fairness === 'number' ? result.fairness : 0;
    
    // Calculate statistics
    const avgTime = times.length > 0 
        ? times.reduce((sum, time) => sum + time, 0) / times.length 
        : 0;
    const maxTime = times.length > 0 
        ? Math.max(...times) 
        : 0;
    
    // Update stats
    this.updateStat('avg-time', this.formatTime(avgTime), this.getTimeColor(avgTime));
    this.updateStat('max-time', this.formatTime(maxTime), this.getTimeColor(maxTime));
    this.updateStat('fairness', `${Math.round(fairness * 100)}%`, this.getFairnessColor(fairness));
    this.updateStat('venues', venues.length.toString(), this.config.colors.text);
    
    // Update time visualization
    this.updateTimeVisualization(times, options.animate);
};

/**
 * Update a single stat display
 * @private
 */
OptimizationResultDisplay.prototype.updateStat = function(statId, value, color) {
    const element = this.container.querySelector(`#${statId}-stat .stat-value`);
    if (!element) return;
    
    element.textContent = value;
    element.style.color = color;
};

/**
 * Update the time visualization with travel time bars
 * @private
 */
OptimizationResultDisplay.prototype.updateTimeVisualization = function(times, animate = true) {
    if (!this.dom.timeViz) return;
    
    // Clear existing bars
    this.dom.timeViz.innerHTML = '';
    
    if (times.length === 0) {
        this.dom.timeViz.innerHTML = '<div class="no-data">No travel time data available</div>';
        return;
    }
    
    const maxTime = Math.max(...times, 1); // Avoid division by zero
    
    times.forEach((time, index) => {
        const height = Math.min(100, (time / maxTime) * 100);
        const color = this.getTimeColor(time);
        
        const bar = document.createElement('div');
        bar.className = 'time-bar' + (animate ? ' animate' : '');
        bar.style.height = '0';
        bar.style.backgroundColor = color;
        bar.title = `${this.formatTime(time)} travel time`;
        
        // Add a small label for each bar
        const label = document.createElement('div');
        label.className = 'time-label';
        label.textContent = `${index + 1}`;
        bar.appendChild(label);
        
        this.dom.timeViz.appendChild(bar);
        
        // Animate the height
        if (animate) {
            requestAnimationFrame(() => {
                bar.style.height = `${height}%`;
            });
        } else {
            bar.style.height = `${height}%`;
        }
    });
};

/**
 * Format time in minutes to a user-friendly string
 * @private
 */
OptimizationResultDisplay.prototype.formatTime = function(minutes) {
    if (minutes < 1) {
        return '<1m';
    } else if (minutes < 60) {
        return `${Math.round(minutes)}m`;
    } else {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
    }
};

/**
 * Get color based on time value
 * @private
 */
OptimizationResultDisplay.prototype.getTimeColor = function(minutes) {
    if (minutes < 10) return this.config.colors.good;
    if (minutes < 30) return this.config.colors.medium;
    return this.config.colors.poor;
};

/**
 * Get color based on fairness score
 * @private
 */
OptimizationResultDisplay.prototype.getFairnessColor = function(fairness) {
    if (fairness > 0.8) return this.config.colors.good;
    if (fairness > 0.5) return this.config.colors.medium;
    return this.config.colors.poor;
};

/**
 * Apply styles to the component
 * @private
 */
OptimizationResultDisplay.prototype.applyStyles = function() {
    if (this.container.querySelector('.optimization-styles')) return;
    
    const style = document.createElement('style');
    style.className = 'optimization-styles';
    style.textContent = `
        .optimization-result-container {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: ${this.config.colors.text};
            background: ${this.config.colors.background};
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 16px;
            max-width: 100%;
            box-sizing: border-box;
        }
        
        .optimization-stats {
            display: flex;
            justify-content: space-between;
            margin-bottom: 16px;
            flex-wrap: wrap;
            gap: 12px;
        }
        
        .stat-item {
            text-align: center;
            flex: 1;
            min-width: 70px;
        }
        
        .stat-value {
            font-size: 1.2em;
            font-weight: 600;
            margin-bottom: 4px;
            transition: color 0.3s ${this.config.animation.easing};
        }
        
        .stat-label {
            font-size: 0.8em;
            color: ${this.config.colors.lightText};
        }
        
        .time-visualization {
            display: flex;
            height: 100px;
            align-items: flex-end;
            gap: 8px;
            padding: 8px 0;
            overflow-x: auto;
        }
        
        .time-bar {
            flex: 1;
            min-width: 24px;
            background: #e0e0e0;
            border-radius: 4px 4px 0 0;
            position: relative;
            transition: height ${this.config.animation.duration}ms ${this.config.animation.easing};
        }
        
        .time-bar.animate {
            transition: height ${this.config.animation.duration}ms ${this.config.animation.easing};
        }
        
        .time-label {
            position: absolute;
            top: -20px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 0.7em;
            color: ${this.config.colors.lightText};
        }
        
        .no-data {
            text-align: center;
            color: ${this.config.colors.lightText};
            width: 100%;
            align-self: center;
        }
        
        @media (max-width: 480px) {
            .optimization-stats {
                gap: 8px;
            }
            
            .stat-item {
                min-width: 60px;
            }
            
            .stat-value {
                font-size: 1em;
            }
            
            .stat-label {
                font-size: 0.7em;
            }
        }
    `;
    
    this.container.appendChild(style);
};

// Export as a module if supported
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OptimizationResultDisplay;
}

// Register as a global if window is available
if (typeof window !== 'undefined') {
    window.OptimizationResultDisplay = OptimizationResultDisplay;
}
