// Function to display the app version from cache
window.retrieveAppVersion = async function() {

    if ('caches' in window) {
        try {
            const cacheNames = await caches.keys();
            
            //REGEX to find the cache that matches the pattern v*::pages
            const versionCache = cacheNames.find(name => name.match(/^v\d+\.\d+::pages$/));
            
            if (versionCache) {
                // Extract the version number from the cache name
                const versionMatch = versionCache.match(/v(\d+\.\d+)/);
                
                if (versionMatch && versionMatch[1]) {
                    return versionMatch[1];
                } else {
                    return 'Version format not recognized';
                }
            } else {
                return 'No version cache found';
            }
        } catch (error) {
            return `Error: ${error.message}`;
        }
    } else {
        return 'Cache not supported';
    }
};

window.retrieveAvailableVersion = async function() {
    const githubUrl = 'https://raw.githubusercontent.com/betterlaterapp/betterlaterapp.github.io/refs/heads/main/sw_cached_pages.js';
    
    try {
        const response = await fetch(githubUrl);
        
        if (!response.ok) {
            return 'Unable to check';
        }
        
        const fileContent = await response.text();
        
        // Extract version from first line: var version = "v3.18::pages";
        const versionMatch = fileContent.match(/var\s+version\s*=\s*["']v(\d+\.\d+)::pages["']/);
        
        if (versionMatch && versionMatch[1]) {
            return versionMatch[1];
        } else {
            return 'Unable to parse';
        }
    } catch (error) {
        return 'Unable to check';
    }
};