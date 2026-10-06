export async function onRequest(context) {
    const url = new URL(context.request.url);

    const body = await context.request.json().catch(() => ({}));

    const query = body.query || "gorillaz";

    const maxResults = Math.min(
        parseInt(body["max-results"] || 25, 10),
        25
    );

    let endpoint;
    let channelUploads = false;
    let playlist = false;

    
        endpoint = "https://yeptube.pages.dev/api/v1/search?q=" + encodeURIComponent(query);

    try {
        const response = await fetch(endpoint, {
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            return new Response(
                JSON.stringify({
                    error: "Invidious request failed",
                    status: response.status
                }),
                {
                    status: 502,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*"
                    }
                }
            );
        }

        const data = await response.json();

        let source;

        if (channelUploads) {
            source =
                data.latestVideos ||
                data.videos ||
                [];

        } else if (playlist) {
            source =
                data.videos ||
                [];

        } else {
            source = data;
        }

        if (!Array.isArray(source)) {
            source = [];
        }

        const videos = source
            .filter(item =>
                item &&
                (
                    item.type === "video" ||
                    item.videoId ||
                    item.id
                )
            )
            .slice(0, maxResults);

        const contents = videos.map(video => {
            const videoId =
                video.videoId ||
                video.id ||
                "";

            const title =
                typeof video.title === "string"
                    ? video.title
                    : "";

            const author =
                typeof video.author === "string"
                    ? video.author
                    : "";

            let views = video.viewCount;

            if (
                views === undefined ||
                views === null
            ) {
                views = video.views;
            }

            if (typeof views === "string") {
                views = parseInt(
                    views.replace(/,/g, ""),
                    10
                );
            }

            if (!Number.isFinite(views)) {
                views = 0;
            }

            let published =
                video.publishedText;

            if (!published) {
                published =
                    video.publishedTimeText;
            }

            if (!published) {
                published = "";
            }

            const thumbnail =
                video.videoThumbnails?.find(
                    thumbnail =>
                        thumbnail.quality === "medium" ||
                        thumbnail.quality === "high"
                ) ||
                video.videoThumbnails?.[0];

            const thumbnailUrl =
                thumbnail?.url ||
                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

            const channelThumbnail =
                channelUploads
                    ? (
                        data.authorThumbnails?.find(
                            thumbnail =>
                                thumbnail.width >= 88
                        ) ||
                        data.authorThumbnails?.[0]
                    )
                    : playlist
                        ? (
                            data.authorThumbnails?.find(
                                thumbnail =>
                                    thumbnail.width >= 88
                            ) ||
                            data.authorThumbnails?.[0]
                        )
                        : null;

            return {
                videoRenderer: {
                    videoId: videoId,

                    thumbnail: {
                        thumbnails: [
                            {
                                url: thumbnailUrl,
                                width:
                                    thumbnail?.width ||
                                    480,
                                height:
                                    thumbnail?.height ||
                                    360
                            }
                        ]
                    },

                    channelThumbnail: {
                        thumbnails: [
                            {
                                url:
                                    channelThumbnail?.url ||
                                    "https://file.garden/aUYIWVAKvQxCBY-_/database/images/profilepuckett.png",
                                width: 88,
                                height: 88
                            }
                        ]
                    },

                    shortBylineText: {
                        runs: [
                            {
                                text: author
                            }
                        ]
                    },

                    publishedTimeText:
                        published,

                    viewCountText:
                        views.toLocaleString(
                            "en-US"
                        ) + " views",

                    title: {
                        runs: [
                            {
                                text: title
                            }
                        ]
                    }
                }
            };
        });

        return new Response(
            JSON.stringify({
                estimatedResults: data.length,
                contents: {
                    sectionListRenderer: {
                        contents: [
                            {
                                itemSectionRenderer: {
                                    contents
                                }
                            }
                        ]
                    }
                }
            }),
            {
                headers: {
                    "Content-Type":
                        "application/json",

                    "Access-Control-Allow-Origin":
                        "*",

                    "Cache-Control":
                        "no-store"
                }
            }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({
                error: error.message
            }),
            {
                status: 500,
                headers: {
                    "Content-Type":
                        "application/json",

                    "Access-Control-Allow-Origin":
                        "*"
                }
            }
        );
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        status: 204,

        headers: {
            "Access-Control-Allow-Origin":
                "*",

            "Access-Control-Allow-Methods":
                "GET, POST, OPTIONS",

            "Access-Control-Allow-Headers": "*"
        }
    });
}
