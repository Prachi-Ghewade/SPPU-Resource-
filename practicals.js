
/*
 * SPPU Resource Hub — Practicals & Programming Lab
 * Uses the existing Supabase resources table.
 */

const SUPABASE_URL = "YOUR_EXISTING_SUPABASE_URL";
const SUPABASE_KEY = "YOUR_EXISTING_SUPABASE_PUBLISHABLE_KEY";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const el = {
    search: document.getElementById("lab-search"),
    clear: document.getElementById("clear-search"),
    year: document.getElementById("year-filter"),
    semester: document.getElementById("semester-filter"),
    subject: document.getElementById("subject-filter"),
    unit: document.getElementById("unit-filter"),
    type: document.getElementById("type-filter"),
    sort: document.getElementById("sort-filter"),
    reset: document.getElementById("reset-filters"),
    count: document.getElementById("resource-count"),
    status: document.getElementById("status-message"),
    grid: document.getElementById("lab-grid")
};

let allResources = [];

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

/*
 * Recognize common practical and lab resource type labels.
 * If your database uses different labels, update this function.
 */
function isLabResource(type) {
    const label = normalize(type);

    return (
        label.includes("practical") ||
        label.includes("lab") ||
        label.includes("programming") ||
        label.includes("source code") ||
        label.includes("experiment")
    );
}

function uniqueValues(field) {
    return [...new Set(
        allResources
            .map(item => valueText(item[field]))
            .filter(Boolean)
    )].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
    );
}

function fillSelect(select, values, defaultLabel) {
    select.replaceChildren();

    const first = document.createElement("option");
    first.value = "";
    first.textContent = defaultLabel;
    select.appendChild(first);

    values.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });
}

function setupFilters() {
    fillSelect(el.year, uniqueValues("year"), "All years");
    fillSelect(el.semester, uniqueValues("semester"), "All semesters");
    fillSelect(el.subject, uniqueValues("subject"), "All subjects");
    fillSelect(el.unit, uniqueValues("unit"), "All units");
    fillSelect(el.type, uniqueValues("resource_type"), "All lab resources");
}

function createTag(text) {
    const tag = document.createElement("span");
    tag.textContent = text;
    return tag;
}

function getResourceIcon(type) {
    const label = normalize(type);

    if (label.includes("code") || label.includes("programming")) return "</>";
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
    icon.setAttribute("aria-hidden", "true");
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

    if (valueText(resource.year)) {
        tags.appendChild(createTag(`Year ${resource.year}`));
    }

    if (valueText(resource.semester)) {
        tags.appendChild(createTag(`Semester ${resource.semester}`));
    }

    if (valueText(resource.unit)) {
        tags.appendChild(createTag(`Unit ${resource.unit}`));
    }

    const footer = document.createElement("div");
    footer.className = "lab-card-footer";

    const link = document.createElement("a");
    link.className = "lab-open-link";
    link.textContent = "Open Resource ↗";
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    // Validate URLs before adding a clickable link.
    try {
        const parsed = new URL(resource.url);

        if (!["https:", "http:"].includes(parsed.protocol)) {
            throw new Error("Unsupported URL protocol");
        }

        link.href = parsed.href;
    } catch {
        link.removeAttribute("href");
        link.textContent = "Invalid resource link";
        link.setAttribute("aria-disabled", "true");
        link.style.opacity = "0.6";
        link.style.cursor = "not-allowed";
    }

    footer.appendChild(link);
    card.append(top, title, subject, tags, footer);

    return card;
}

function renderResources() {
    const query = normalize(el.search.value);
    const year = el.year.value;
    const semester = el.semester.value;
    const subject = el.subject.value;
    const unit = el.unit.value;
    const type = el.type.value;

    let results = allResources.filter(resource => {
        const searchable = [
            resource.title,
            resource.subject,
            resource.unit,
            resource.resource_type,
            resource.source,
            resource.year,
            resource.semester
        ].map(normalize).join(" ");

        return (
            (!query || searchable.includes(query)) &&
            (!year || String(resource.year ?? "") === year) &&
            (!semester || String(resource.semester ?? "") === semester) &&
            (!subject || resource.subject === subject) &&
            (!unit || String(resource.unit ?? "") === unit) &&
            (!type || resource.resource_type === type)
        );
    });

    results.sort((a, b) => {
        if (el.sort.value === "subject") {
            return valueText(a.subject).localeCompare(valueText(b.subject));
        }

        if (el.sort.value === "type") {
            return valueText(a.resource_type).localeCompare(
                valueText(b.resource_type)
            );
        }

        return valueText(a.title).localeCompare(valueText(b.title));
    });

    el.grid.replaceChildren();
    el.count.textContent =
        `${results.length} resource${results.length === 1 ? "" : "s"}`;

    if (results.length === 0) {
        setStatus(
            allResources.length === 0
                ? "No verified practical or lab resources are available yet."
                : "No resources match your search. Try changing the filters or resetting them."
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

async function loadResources() {
    if (
        SUPABASE_URL.includes("YOUR_EXISTING") ||
        SUPABASE_KEY.includes("YOUR_EXISTING")
    ) {
        el.count.textContent = "Setup required";
        setStatus(
            "Add your existing Supabase project URL and publishable key in practicals.js to load real resources."
        );
        return;
    }

    setStatus("Loading verified lab resources…");

    try {
        const { data, error } = await supabaseClient
            .from("resources")
            .select(
                "id, title, subject, year, semester, unit, resource_type, source, url, verified"
            )
            .eq("verified", true);

        if (error) throw error;

        allResources = (data || []).filter(resource =>
            isLabResource(resource.resource_type) &&
            valueText(resource.title) &&
            valueText(resource.url)
        );

        setupFilters();
        renderResources();
    } catch (error) {
        console.error("Unable to load lab resources:", error);
        el.count.textContent = "Unavailable";
        setStatus(
            "Could not load resources. Check your Supabase settings, resources table, and read policy."
        );
    }
}

[
    el.search,
    el.year,
    el.semester,
    el.subject,
    el.unit,
    el.type,
    el.sort
].forEach(control => {
    control.addEventListener("input", renderResources);
    control.addEventListener("change", renderResources);
});

el.clear.addEventListener("click", () => {
    el.search.value = "";
    renderResources();
    el.search.focus();
});

el.reset.addEventListener("click", () => {
    el.search.value = "";
    el.year.value = "";
    el.semester.value = "";
    el.subject.value = "";
    el.unit.value = "";
    el.type.value = "";
    el.sort.value = "title";

    renderResources();
});

loadResources();
