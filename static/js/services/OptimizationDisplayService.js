/**
 * OptimizationDisplayService - Handles display logic for optimization results
 * Provides consistent visualization of travel times, fairness metrics, and optimization results
 */

class OptimizationDisplayService {
    constructor() {
        // Color scheme for visualization
        this.colorScheme = {
            good: '#4CAF50',    // Green
            medium: '#FFC107',  // Amber
            poor: '#F44336',    // Red
            text: '#333333',    // Dark gray
            lightText: '#757575', // Light gray
            background: '#FFFFFF' // White
        };
        
        console.log('OptimizationDisplayService initialized');
    }

    /**
     * Format travel time for display
     * @param {number} minutes - Travel time in minutes
     * @returns {string} Formatted time string
     */
    formatTravelTime(minutes) {
        if (minutes < 1) return 'Less than 1 min';
        if (minutes < 60) return `${Math.round(minutes)} min`;
        
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    /**
     * Calculate fairness percentage based on time range
     * @param {Array} times - Array of travel times in minutes
     * @returns {number} Fairness percentage (0-1)
     */
    calculateFairness(times) {
        if (!times || times.length === 0) return 0;
        
        const maxTime = Math.max(...times);
        const minTime = Math.min(...times);
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        
        // Calculate fairness based on standard deviation
        const squaredDiffs = times.map(t => Math.pow(t - avgTime, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / times.length;
        const stdDev = Math.sqrt(variance);
        
        // Convert to 0-1 scale where 1 is perfectly fair (all times equal)
        // Using exponential decay to emphasize differences in fairness
        return Math.exp(-stdDev / avgTime);
    }

    /**
     * Get color based on fairness percentage
     * @param {number} fairness - Fairness percentage (0-1)
     * @returns {string} Color code
     */
    getFairnessColor(fairness) {
        if (fairness > 0.9) return this.colorScheme.good;
        if (fairness > 0.7) return this.colorScheme.medium;
        return this.colorScheme.poor;
    }

    /**
     * Generate HTML for travel time display
     * @param {Object} result - Optimization result from MeetingPointOptimizer
     * @returns {string} HTML string
     */
    generateTravelTimeHTML(result) {
        if (!result || !result.times || result.times.length === 0) {
            return '<div class="no-times">No travel time data available</div>';
        }

        const fairness = this.calculateFairness(result.times);
        const fairnessColor = this.getFairnessColor(fairness);
        const avgTime = result.times.reduce((a, b) => a + b, 0) / result.times.length;
        const maxTime = Math.max(...result.times);
        const minTime = Math.min(...result.times);
        const timeRange = maxTime - minTime;

        // Sort times for display
        const sortedTimes = [...result.times].sort((a, b) => a - b);

        // Generate time bars
        const timeBars = sortedTimes.map((time, index) => {
            const width = (time / maxTime) * 100;
            const timeFormatted = this.formatTravelTime(time);
            
            return `
                <div class="time-bar-container">
                    <div class="time-bar-label">Person ${index + 1}:</div>
                    <div class="time-bar">
                        <div class="time-bar-fill" style="width: ${width}%; background: ${this.getTimeBarColor(time, minTime, maxTime)}">
                            <span class="time-value">${timeFormatted}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="optimization-results">
                <div class="fairness-display" style="--fairness-color: ${fairnessColor}">
                    <div class="fairness-label">Fairness:</div>
                    <div class="fairness-value">${Math.round(fairness * 100)}%</div>
                    <div class="fairness-details">
                        <span>Avg: ${this.formatTravelTime(avgTime)}</span>
                        <span>Range: ${this.formatTravelTime(timeRange)}</span>
                    </div>
                </div>
                <div class="time-bars">
                    ${timeBars}
                </div>
            </div>
        `;
    }

    /**
     * Get color for time bar based on time value
     * @private
     */
    getTimeBarColor(time, minTime, maxTime) {
        const range = maxTime - minTime;
        if (range === 0) return this.colorScheme.good;
        
        const ratio = (time - minTime) / range;
        
        // Interpolate between green and red
        if (ratio < 0.3) return this.colorScheme.good;
        if (ratio < 0.7) return this.colorScheme.medium;
        return this.colorScheme.poor;
    }

    /**
     * Attach CSS styles for the optimization display
     * @param {HTMLElement} container - Container element to attach styles to
     */
    attachStyles(container) {
        if (container.querySelector('.optimization-styles')) return;
        
        const style = document.createElement('style');
        style.className = 'optimization-styles';
        style.textContent = `
            .optimization-results {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: ${this.colorScheme.text};
                padding: 12px;
                background: ${this.colorScheme.background};
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                margin: 8px 0;
            }
            
            .fairness-display {
                display: flex;
                align-items: center;
                margin-bottom: 12px;
                padding: 8px;
                background: rgba(var(--fairness-rgb), 0.1);
                border-radius: 6px;
                color: var(--fairness-color);
                font-weight: 500;
            }
            
            .fairness-label {
                margin-right: 8px;
            }
            
            .fairness-value {
                font-size: 1.2em;
                font-weight: bold;
                margin-right: 12px;
            }
            
            .fairness-details {
                margin-left: auto;
                display: flex;
                gap: 8px;
                font-size: 0.9em;
                color: ${this.colorScheme.lightText};
            }
            
            .time-bars {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            
            .time-bar-container {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .time-bar-label {
                width: 80px;
                font-size: 0.9em;
                color: ${this.colorScheme.lightText};
            }
            
            .time-bar {
                flex: 1;
                height: 24px;
                background: #f0f0f0;
                border-radius: 12px;
                overflow: hidden;
            }
            
            .time-bar-fill {
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: flex-end;
                padding: 0 8px;
                color: white;
                font-size: 0.8em;
                font-weight: 500;
                min-width: 60px;
                transition: width 0.3s ease;
            }
            
            .time-value {
                text-shadow: 0 1px 2px rgba(0,0,0,0.3);
            }
            
            .no-times {
                padding: 12px;
                text-align: center;
                color: ${this.colorScheme.lightText};
                font-style: italic;
            }
        `;
        
        // Convert hex color to RGB for CSS variables
        const hexToRgb = (hex) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `${r}, ${g}, ${b}`;
        };
        
        // Set CSS variables for the fairness color
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            :root {
                --fairness-rgb: ${hexToRgb(this.getFairnessColor(1))};
                --fairness-color: ${this.getFairnessColor(1)};
            }
        `;
        document.head.appendChild(styleElement);
        
        container.appendChild(style);
    }
}

// Create global instance
window.optimizationDisplayService = new OptimizationDisplayService();

export default OptimizationDisplayService;
