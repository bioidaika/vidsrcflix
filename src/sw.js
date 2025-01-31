self.addEventListener("fetch", (event) => {
    console.log("Request from iframe:", event.request.url);
    fetch(event.request).then(response => {
        console.log("Response", response);
    });
});
