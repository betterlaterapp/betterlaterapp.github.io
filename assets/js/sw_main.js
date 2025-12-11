// Auto-detect development mode
const DEV_MODE = window.location.hostname === 'localhost' 
                 || window.location.hostname === '127.0.0.1'
                 || window.location.protocol === 'file:';

//make sure service worker exists
if('serviceWorker' in navigator){
    window.addEventListener('load', function(){
        if (DEV_MODE) {
            // Development mode: Unregister all service workers to prevent caching
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                    registration.unregister();
                    console.log('Service Worker unregistered for development mode');
                }
            });
        } else {
            // Production mode: Register service worker for offline support
            navigator.serviceWorker
                .register('sw_cached_pages.js')
                .then(function(registered){
                    console.log('Service worker registered: ' + registered);
                })
                .catch(function(err){
                    console.log('Service worker error: ' + err);
                })
        }
    })
}

// Global function to manually refresh the service worker
// Can be called from UI button or console
window.refreshServiceWorker = function() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            if (registrations.length === 0) {
                console.log('No service worker to refresh');
                alert('No service worker is currently registered.');
                return;
            }
            
            // Unregister all service workers
            Promise.all(registrations.map(reg => reg.unregister()))
                .then(function() {
                    console.log('Service workers unregistered');
                    
                    // Re-register the service worker
                    return navigator.serviceWorker.register('sw_cached_pages.js');
                })
                .then(function(registration) {
                    console.log('Service worker re-registered:', registration);
                    
                    // Force update
                    return registration.update();
                })
                .then(function() {
                    console.log('Service worker updated');
                    alert('Service worker refreshed! Reload the page to use the updated version.');
                })
                .catch(function(err) {
                    console.error('Error refreshing service worker:', err);
                    alert('Error refreshing service worker. Check console for details.');
                });
        });
    } else {
        alert('Service workers are not supported in this browser.');
    }
};

