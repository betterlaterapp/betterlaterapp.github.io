// Auto-detect development mode
const DEV_MODE = false;
// const DEV_MODE = window.location.hostname === 'localhost' 
//                  || window.location.hostname === '127.0.0.1'
//                  || window.location.protocol === 'file:';

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

