
/*
 * SPPU Resource Hub — Video Library
 *
 * Reuse your existing Supabase project URL and publishable/anon key.
 * Never put a service_role key in browser JavaScript.
 */

const SUPABASE_URL = "https://aaowvybuurdnhjaugjqr.supabase.co";
const SUPABASE_KEY = "sb_publishable_IC5Lui65jLhlNu5kDeVqHQ_LRO5828U";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const elements = {
    search: document.getElementById("lecture-search"),
    clearSearch: document.getElementById("clear-search"),
    year: document.getElementById("year-filter"),
    semester: document.getElementById("semester-filter"),
    subject: document.getElementById("subject-filter"),
    unit: document.getElementById("unit-filter"),
    sort: document.getElementById("sort-filter"),
    reset: document.getElementById("reset-filters"),
    count: document.getElementById("resource-count"),
    status: document.getElementById("status-message"),
    grid: document.getElementById("video-grid"),
    dialog: document.getElementById("video-dialog"),
    dialogTitle: document.getElementById("dialog-title"),
    player: document.getElementById("player-container"),
    playerNote: document.getElementById("player-note"),
    closeDialog: document.getElementById("close-dialog")
};

let allLectures = [];

function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
}

function textValue(value, fallback = "") {
    const result = String(value ?? "").trim();
    return result || fallback;
}

function setStatus(message) {
    elements.status.textContent = message;
}

function clearStatus() {
    elements.status.textContent = "";
}

/*
 * Supports common labels such as "Video", "Video Lecture",
 * and "Video Lectures". Adjust this if your DB uses another label.
 */
function isVideoResource(resourceType) {
    return normalize(resourceType).includes("video");
}

function uniqueValues(field) {
    return [...new Set(
        allLectures
            .map(item => textValue(item[field]))
            .filter(Boolean)
    )].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
    );
}

function fillSelect(select, values, defaultLabel) {
    select.replaceChildren();

    const firstOption = document.createElement("option");
    firstOption.value = "";
    firstOption.textContent = defaultLabel;
    select.appendChild(firstOption);

    values.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });
}

function setupFilters() {
    fillSelect(elements.year, uniqueValues("year"), "All years");
    fillSelect(
        elements.semester,
        uniqueValues("semester"),
        "All semesters"
    );
    fillSelect(
        elements.subject,
        uniqueValues("subject"),
        "All subjects"
    );
    fillSelect(elements.unit, uniqueValues("unit"), "All units");
}

function getYouTubeId(url) {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();

        if (host === "youtu.be" || host.endsWith(".youtu.be")) {
            return parsed.pathname.split("/").filter(Boolean)[0] || null;
        }

        if (
            host === "youtube.com" ||
            host.endsWith(".youtube.com") ||
            host === "youtube-nocookie.com" ||
            host.endsWith(".youtube-nocookie.com")
        ) {
            if (parsed.pathname === "/watch") {
                return parsed.searchParams.get("v");
            }

            const parts = parsed.pathname.split("/").filter(Boolean);

            if (["embed", "shorts", "live"].includes(parts[0])) {
                return parts[1] || null;
            }
        }
    } catch {
        return null;
    }

    return null;
}

function getVideoEmbed(url) {
    try {
        const parsed = new URL(url);

        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
            return null;
        }

        const youtubeId = getYouTubeId(url);

        if (youtubeId && /^[\w-]{6,}$/.test(youtubeId)) {
            return {
                url: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
                provider: "YouTube"
            };
        }

        const host = parsed.hostname.toLowerCase();
        const isVimeo =
            host === "vimeo.com" ||
            host.endsWith(".vimeo.com");

        if (isVimeo) {
            const match = parsed.pathname.match(/\/(\d+)(?:\/|$)/);

            if (match) {
                return {
                    url: `https://player.vimeo.com/video/${match[1]}`,
                    provider: "Vimeo"
                };
            }
        }
    } catch {
        return null;
    }

    return null;
}

function getYouTubeThumbnail(url) {
    const id = getYouTubeId(url);

    if (!id || !/^[\w-]{6,}$/.test(id)) {
        return null;
    }

    return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

function createTag(text) {
    const tag = document.createElement("span");
    tag.textContent = text;
    return tag;
}

function openLecture(lecture) {
    const url = textValue(lecture.url);

    // Only allow normal web links from the database.
    let parsed;

    try {
        parsed = new URL(url);
    } catch {
        setStatus("This lecture does not have a valid video URL.");
        return;
    }

    if (!["https:", "http:"].includes(parsed.protocol)) {
        setStatus("This lecture URL is not supported.");
        return;
    }

    elements.dialogTitle.textContent = textValue(
        lecture.title,
        "Video lecture"
    );

    elements.player.replaceChildren();
    elements.playerNote.textContent = "";

    const embed = getVideoEmbed(url);

    if (embed) {
        const iframe = document.createElement("iframe");
        iframe.src = embed.url;
        iframe.title = textValue(lecture.title, "Video lecture");
        iframe.allow =
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = "strict-origin-when-cross-origin";

        elements.player.appendChild(iframe);
        elements.playerNote.textContent =
            `Embedded from ${embed.provider}. If playback is blocked, open the original video link instead.`;
    } else {
        const message = document.createElement("p");
        message.textContent =
            "This provider cannot be embedded automatically. Open the original video in a new tab.";
        message.style.cssText =
            "color:white;padding:24px;text-align:center;line-height:1.7;";

        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Open original video";
        link.style.cssText =
            "display:block;color:white;text-align:center;padding:0 20px 24px;";

        elements.player.append(message, link);
        elements.playerNote.textContent =
            "Some providers block embedded playback or require their own player.";
    }

    if (!elements.dialog.open) {
        elements.dialog.showModal();
    }
}

function createLectureCard(lecture) {
    const card = document.createElement("article");
    card.className = "video-card";

    const thumbnail = document.createElement("button");
    thumbnail.type = "button";
    thumbnail.className = "video-thumbnail";
    thumbnail.setAttribute(
        "aria-label",
        `Play ${textValue(lecture.title, "video lecture")}`
    );

    const thumbnailUrl = getYouTubeThumbnail(lecture.url);

    if (thumbnailUrl) {
        const image = document.createElement("img");
        image.src = thumbnailUrl;
        image.alt = "";
        image.loading = "lazy";
        image.referrerPolicy = "no-referrer";

        image.addEventListener("error", () => {
            image.remove();
        });

        thumbnail.appendChild(image);
    } else {
        const placeholder = document.createElement("span");
        placeholder.className = "thumbnail-placeholder";
        placeholder.textContent = "▷";
        thumbnail.appendChild(placeholder);
    }

    const play = document.createElement("span");
    play.className = "play-button";
    play.textContent = "▶";
    play.setAttribute("aria-hidden", "true");
    thumbnail.appendChild(play);

    thumbnail.addEventListener("click", () => openLecture(lecture));

    const content = document.createElement("div");
    content.className = "video-card-content";

    const meta = document.createElement("div");
    meta.className = "video-meta";

    if (textValue(lecture.year)) {
        meta.appendChild(createTag(`Year ${lecture.year}`));
    }

    if (textValue(lecture.semester)) {
        meta.appendChild(createTag(`Semester ${lecture.semester}`));
    }

    if (textValue(lecture.unit)) {
        meta.appendChild(createTag(`Unit ${lecture.unit}`));
    }

    const title = document.createElement("h3");
    title.textContent = textValue(lecture.title, "Untitled lecture");

    const subject = document.createElement("p");
    subject.className = "video-subject";
    subject.textContent = [
        textValue(lecture.subject, "Subject not specified"),
        textValue(lecture.source)
    ].filter(Boolean).join(" · ");

    const watch = document.createElement("button");
    watch.type = "button";
    watch.className = "watch-button";
    watch.textContent = "▶  Watch Lecture";
    watch.addEventListener("click", () => openLecture(lecture));

    content.append(meta, title, subject, watch);
    card.append(thumbnail, content);

    return card;
}

function renderLectures() {
    const query = normalize(elements.search.value);
    const selectedYear = elements.year.value;
    const selectedSemester = elements.semester.value;
    const selectedSubject = elements.subject.value;
    const selectedUnit = elements.unit.value;

    let filtered = allLectures.filter(lecture => {
        const searchable = [
            lecture.title,
            lecture.subject,
            lecture.unit,
            lecture.source,
            lecture.year,
            lecture.semester
        ].map(normalize).join(" ");

        return (
            (!query || searchable.includes(query)) &&
            (!selectedYear || String(lecture.year ?? "") === selectedYear) &&
            (!selectedSemester ||
                String(lecture.semester ?? "") === selectedSemester) &&
            (!selectedSubject || lecture.subject === selectedSubject) &&
            (!selectedUnit || String(lecture.unit ?? "") === selectedUnit)
        );
    });

    if (elements.sort.value === "subject") {
        filtered.sort((a, b) =>
            textValue(a.subject).localeCompare(textValue(b.subject))
        );
    } else {
        filtered.sort((a, b) =>
            textValue(a.title).localeCompare(textValue(b.title))
        );
    }

    elements.grid.replaceChildren();
    elements.count.textContent =
        `${filtered.length} lecture${filtered.length === 1 ? "" : "s"}`;

    if (filtered.length === 0) {
        setStatus(
            allLectures.length === 0
                ? "No verified video lectures are available yet."
                : "No lectures match these filters. Try changing your search or resetting the filters."
        );
        return;
    }

    clearStatus();

    const fragment = document.createDocumentFragment();

    filtered.forEach(lecture => {
        fragment.appendChild(createLectureCard(lecture));
    });

    elements.grid.appendChild(fragment);
}

async function loadLectures() {
    if (
        SUPABASE_URL.includes("YOUR_EXISTING") ||
        SUPABASE_KEY.includes("YOUR_EXISTING")
    ) {
        elements.count.textContent = "Setup required";
        setStatus(
            "Add your existing Supabase project URL and publishable key in video-lectures.js to load real resources."
        );
        return;
    }

    setStatus("Loading verified video lectures…");

    try {
        const { data, error } = await supabaseClient
            .from("resources")
            .select(
                "id, title, subject, year, semester, unit, resource_type, source, url, verified"
            )
            .eq("verified", true);

        if (error) {
            throw error;
        }

        // Filter by the actual resource type in the returned database rows.
        allLectures = (data || []).filter(item =>
            isVideoResource(item.resource_type) &&
            textValue(item.title) &&
            textValue(item.url)
        );

        setupFilters();
        renderLectures();
    } catch (error) {
        console.error("Unable to load video lectures:", error);
        elements.count.textContent = "Unavailable";
        setStatus(
            "Unable to load lectures. Check your Supabase URL, publishable key, resources table, and public read policy."
        );
    }
}

[
    elements.search,
    elements.year,
    elements.semester,
    elements.subject,
    elements.unit,
    elements.sort
].forEach(element => {
    element.addEventListener("input", renderLectures);
    element.addEventListener("change", renderLectures);
});

elements.clearSearch.addEventListener("click", () => {
    elements.search.value = "";
    renderLectures();
    elements.search.focus();
});

elements.reset.addEventListener("click", () => {
    elements.search.value = "";
    elements.year.value = "";
    elements.semester.value = "";
    elements.subject.value = "";
    elements.unit.value = "";
    elements.sort.value = "title";
    renderLectures();
});

function closePlayer() {
    elements.player.replaceChildren();
    if (elements.dialog.open) {
        elements.dialog.close();
    }
}

elements.closeDialog.addEventListener("click", closePlayer);

elements.dialog.addEventListener("close", () => {
    elements.player.replaceChildren();
});

elements.dialog.addEventListener("click", event => {
    if (event.target === elements.dialog) {
        closePlayer();
    }
});

loadLectures();
