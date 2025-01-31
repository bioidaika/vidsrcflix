self.addEventListener("fetch", (event) => {
    console.log("Intercepted Request URL:", event.request.url);
    
    // Check if the request is an iframe resource (can add filtering logic here)
    if (event.request.url.includes("iframe")) {
        console.log("Intercepted iframe request:", event.request.url);
    }
    
    event.respondWith(fetch(event.request));
});
