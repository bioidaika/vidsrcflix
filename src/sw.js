self.addEventListener("fetch", (event) => {
    console.log("Request from iframe:", event.request.url);

    // Log only video requests (e.g., M3U8, MP4, TS files)
    if (event.request.url.includes(".m3u8") || event.request.url.includes(".mp4") || event.request.url.includes(".ts")) {
        fetch(event.request).then(response => {
            console.log("🔗 Video URL Found:", event.request.url);
        });
    }
});
