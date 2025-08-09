/**
 * Refactor Helper
 * Provides utilities to help refactor code to use the new UI components
 */

class RefactorHelper {
    constructor() {
        // Common patterns to identify marker and button creation
        this.patterns = {
            // Google Maps Marker creation
            markerCreation: [
                // new google.maps.Marker({ ... })
                /new\s+google\.maps\.Marker\(\s*\{[\s\S]*?\}\s*\)/g,
                // map.addMarker({ ... })
                /map\.addMarker\(\s*\{[\s\S]*?\}\s*\)/g
            ],
            
            // Button creation
            buttonCreation: [
                // document.createElement('button')
                /document\.createElement\(['"]button['"]\)/g,
                // <button> in template literals
                /<button[\s\S]*?<\/button>/g
            ],
            
            // Direct DOM manipulation for buttons
            domButtonManipulation: [
                /element\.innerHTML\s*\+=?\s*['"].*?<button[\s\S]*?<\/button>/g,
                /element\.insertAdjacentHTML\s*\(\s*['"](?:beforeend|afterbegin|before|after)['"]\s*,\s*['"]<button[\s\S]*?<\/button>/g
            ]
        };
        
        // Replacement patterns
        this.replacements = {
            // Replace marker creation with markerStyleService.createEnhancedMarker
            marker: (match) => {
                // This is a simplified example - in practice, you'd parse the options object
                // and generate the appropriate createEnhancedMarker call
                return `markerStyleService.createEnhancedMarker(map, position, 'venue', ${extractOptions(match)})`;
                
                function extractOptions(markerCode) {
                    // This is a placeholder - in a real implementation, you'd parse the marker options
                    // and convert them to the format expected by createEnhancedMarker
                    return '{}';
                }
            },
            
            // Replace button creation with uiService.createButton
            button: (match) => {
                // This is a simplified example - in practice, you'd parse the button HTML/options
                // and generate the appropriate createButton call
                return `uiService.createButton({
                    label: 'Button',
                    variant: 'primary',
                    onClick: () => { /* click handler */ }
                })`;
            }
        };
    }
    
    /**
     * Scan a file for potential refactoring opportunities
     * @param {string} filePath - Path to the file to scan
     * @returns {Object} Report of potential refactoring opportunities
     */
    async scanFile(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
            }
            
            const content = await response.text();
            return this.analyzeContent(content, filePath);
            
        } catch (error) {
            console.error(`Error scanning file ${filePath}:`, error);
            return {
                file: filePath,
                error: error.message,
                markers: [],
                buttons: []
            };
        }
    }
    
    /**
     * Analyze file content for refactoring opportunities
     * @param {string} content - File content to analyze
     * @param {string} filePath - Path to the file (for reporting)
     * @returns {Object} Analysis results
     */
    analyzeContent(content, filePath) {
        const result = {
            file: filePath,
            markers: [],
            buttons: [],
            domManipulations: []
        };
        
        // Check for marker creation patterns
        this.patterns.markerCreation.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                result.markers.push({
                    match: match[0],
                    index: match.index,
                    line: this.getLineNumber(content, match.index)
                });
            }
        });
        
        // Check for button creation patterns
        this.patterns.buttonCreation.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                result.buttons.push({
                    match: match[0],
                    index: match.index,
                    line: this.getLineNumber(content, match.index)
                });
            }
        });
        
        // Check for DOM manipulation patterns
        this.patterns.domButtonManipulation.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                result.domManipulations.push({
                    match: match[0],
                    index: match.index,
                    line: this.getLineNumber(content, match.index)
                });
            }
        });
        
        return result;
    }
    
    /**
     * Get the line number for a given index in the content
     * @private
     */
    getLineNumber(content, index) {
        return content.substring(0, index).split('\n').length;
    }
    
    /**
     * Generate a report of refactoring opportunities
     * @param {Array} files - Array of file paths to scan
     * @returns {Promise<Array>} Array of analysis results
     */
    async generateReport(files) {
        const results = [];
        
        for (const file of files) {
            try {
                const result = await this.scanFile(file);
                results.push(result);
            } catch (error) {
                console.error(`Error processing file ${file}:`, error);
                results.push({
                    file,
                    error: error.message,
                    markers: [],
                    buttons: []
                });
            }
        }
        
        return results;
    }
}

// Create and export singleton instance
const refactorHelper = new RefactorHelper();

export default refactorHelper;
