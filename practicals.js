
/*
 * SPPU Resource Hub — Practicals & Programming Lab
 * Uses the practicals_programming Supabase table.
 */

const SUPABASE_URL = "YOUR_EXISTING_SUPABASE_URL";
const SUPABASE_KEY = "YOUR_EXISTING_SUPABASE_PUBLISHABLE_KEY";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ------------------------------------
// 1. GET HTML ELEMENTS
// ------------------------------------

const el = {
    search: document.getElementById("lab-search"),
    clear: document.getElementById("clear-search"),
    subject: document.getElementById("subject-filter"),
    sort: document.getElementById("sort-filter"),
    reset: document.getElementById("reset-filters"),
    count: document.getElementById("resource-count"),
    status: document.getElementById("status-message"),
    grid: document.getElementById("lab-grid")
};

let allResources = [];

// ------------------------------------
// 2. HELPER FUNCTIONS
// ------------------------------------

function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
}

function valueText(value, fallback = "") {
    const text = String(value ?? "").trim();
    return text || fallback;
}

function setStatus(message) {
    el.status.textContent = message;
}

function clearStatus() {
    el.status.textContent = "";
}

function getSafeUrl(value) {
    try {
        const url = new URL(value);

        if (url.protocol === "https:" || url.protocol === "http:") {
            return url.href;
        }
    } catch {
        return null;
    }

    return null;
}

// ------------------------------------
// 3. POPULATE SUBJECT FILTER
// ------------------------------------

function setupSubjectFilter() {
    const previousValue = el.subject.value;

    el.subject.replaceChildren();

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "All subjects";

    el.subject.appendChild(defaultOption);

    const subjects = [
        ...new Set(
            allResources
                .map(resource => valueText(resource.subject))
                .filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b));

    subjects.forEach(subject => {
        const option = document.createElement("option");

        option.value = subject;
        option.textContent = subject;

        el.subject.appendChild(option);
    });

    if (subjects.includes(previousValue)) {
        el.subject.value = previousValue;
    }
}

// ------------------------------------
// 4. CREATE RESOURCE CARD
// ------------------------------------

function createTag(text) {
    const tag = document.createElement("span");
    tag.textContent = text;
    return tag;
}

function getResourceIcon(type) {
    const label = normalize(type);

    if (label.includes("code") || label.includes("programming")) {
        return "</>";
    }

    if (label.includes("practical")) return "▤";
    if (label.includes("experiment")) return "⚗";
    if (label.includes("lab")) return "⌘";

    return "▧";
}

function createResourceCard(resource) {
    const card = document.createElement("article");
    card.className = "lab-card";

    const top = document.createElement("div");
    top.className = "lab-card-top";

    const icon = document.createElement("div");
    icon.className = "lab-type-icon";
    icon.textContent = getResourceIcon(resource.resource_type);

    const type = document.createElement("span");
    type.className = "lab-type-label";
    type.textContent = valueText(resource.resource_type, "Lab resource");

    top.append(icon, type);

    const title = document.createElement("h3");
    title.textContent = valueText(resource.title, "Untitled resource");

    const subject = document.createElement("p");
    subject.className = "lab-card-subject";
    subject.textContent = valueText(resource.subject, "Subject not specified");

    const tags = document.createElement("div");
    tags.className = "lab-tags";

    if (valueText(resource.programming_language)) {
        tags.appendChild(
            createTag(resource.programming_language)
        );
    }

    const description = document.createElement("p");
    description.className = "lab-card-description";
    description.textContent = valueText(resource.description);

    const footer = document.createElement("div");
    footer.className = "lab-card-footer";

    const link = document.createElement("a");
    link.className = "lab-open-link";
    link.textContent = "Open Resource ↗";

    const safeUrl = getSafeUrl(resource.url);

    if (safeUrl) {
        link.href = safeUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
    } else {
        link.textContent = "Invalid resource link";
        link.setAttribute("aria-disabled", "true");
    }

    footer.appendChild(link);

    card.append(top, title, subject);

    if (description.textContent) {
        card.appendChild(description);
    }

    if (tags.children.length > 0) {
        card.appendChild(tags);
    }

    card.appendChild(footer);

    return card;
}

// ------------------------------------
// 5. SEARCH, FILTER AND SORT
// ------------------------------------

function renderResources() {
    const query = normalize(el.search.value);
    const selectedSubject = el.subject.value;

    let results = allResources.filter(resource => {

        const searchableText = [
            resource.title,
            resource.subject,
            resource.description,
            resource.programming_language,
            resource.resource_type,
            resource.source
        ].map(normalize).join(" ");

        return (
            (!query || searchableText.includes(query)) &&
            (!selectedSubject || resource.subject === selectedSubject)
        );
    });

    results.sort((a, b) => {
        if (el.sort.value === "subject") {
            return valueText(a.subject).localeCompare(
                valueText(b.subject)
            );
        }

        return valueText(a.title).localeCompare(
            valueText(b.title)
        );
    });

    el.grid.replaceChildren();

    el.count.textContent =
        `${results.length} resource${results.length === 1 ? "" : "s"}`;

    if (results.length === 0) {
        setStatus(
            allResources.length === 0
                ? "No verified practical resources are available yet."
                : "No resources match your search. Try another keyword or reset the filters."
        );

        return;
    }

    clearStatus();

    const fragment = document.createDocumentFragment();

    results.forEach(resource => {
        fragment.appendChild(createResourceCard(resource));
    });

    el.grid.appendChild(fragment);
}

// ------------------------------------
// 6. LOAD RESOURCES FROM SUPABASE
// ------------------------------------

async function loadResources() {
    setStatus("Loading verified lab resources...");

    try {
        const { data, error } = await supabaseClient
            .from("practicals_programming")
            .select("*")
            .eq("verified", true)
            .order("id", { ascending: false });

        if (error) throw error;

        allResources = (data || []).filter(resource =>
            valueText(resource.title) &&
            valueText(resource.url)
        );

        setupSubjectFilter();
        renderResources();

    } catch (error) {
        console.error("Unable to load practical resources:", error);

        el.count.textContent = "Unavailable";

        setStatus(
            "Could not load resources. Check your Supabase table, project settings and read policy."
        );
    }
}

// ------------------------------------
// 7. EVENT LISTENERS
// ------------------------------------

el.search.addEventListener("input", renderResources);

el.subject.addEventListener("change", renderResources);

el.sort.addEventListener("change", renderResources);

el.clear.addEventListener("click", () => {
    el.search.value = "";
    renderResources();
    el.search.focus();
});

el.reset.addEventListener("click", () => {
    el.search.value = "";
    el.subject.value = "";
    el.sort.value = "title";

    renderResources();
});

// ------------------------------------
// 8. START
// ------------------------------------

loadResources();
