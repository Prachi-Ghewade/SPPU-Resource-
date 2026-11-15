
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Use your existing Supabase project URL and publishable/anon key.
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_KEY = "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


// ------------------------------------
// 1. GET HTML ELEMENTS
// ------------------------------------

const $ = (id) => document.getElementById(id);

const searchInput = $("examSearch");
const yearFilter = $("examYear");
const semesterFilter = $("examSemester");
const subjectFilter = $("examSubject");
const typeFilter = $("typeFilter");

const searchForm = $("examSearchForm");
const resetButton = $("examReset");

const resourceGrid = $("examResourceGrid");
const resultsCount = $("examResultCount");
const emptyState = $("examEmptyState");

let resources = [];


// ------------------------------------
// 2. HELPER FUNCTIONS
// ------------------------------------

function text(value) {
    return String(value ?? "").trim();
}

function normalize(value) {
    return text(value).toLowerCase().replace(/\s+/g, " ");
}

function normalizeYear(value) {
    const year = normalize(value);

    if (/^(fe|first|1st|1)(\s|$)/.test(year) ||
        year.includes("first year")) return "FE";

    if (/^(se|second|2nd|2)(\s|$)/.test(year) ||
        year.includes("second year")) return "SE";

    if (/^(te|third|3rd|3)(\s|$)/.test(year) ||
        year.includes("third year")) return "TE";

    if (/^(be|fourth|4th|4)(\s|$)/.test(year) ||
        year.includes("fourth year") ||
        year.includes("final year")) return "BE";

    return year.toUpperCase();
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

function populateSubjects() {
    const previousValue = subjectFilter.value;

    subjectFilter.replaceChildren();

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "All subjects";

    subjectFilter.append(defaultOption);

    const subjects = [
        ...new Set(resources.map(r => text(r.subject)).filter(Boolean))
    ].sort((a, b) => a.localeCompare(b));

    subjects.forEach(subject => {
        const option = document.createElement("option");

        option.value = subject;
        option.textContent = subject;

        subjectFilter.append(option);
    });

    if (subjects.includes(previousValue)) {
        subjectFilter.value = previousValue;
    }
}


// ------------------------------------
// 4. CREATE RESOURCE CARD
// ------------------------------------

function createElement(tag, className, content) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (content !== undefined) {
        element.textContent = content;
    }

    return element;
}

function createCard(resource) {
    const card = createElement("article", "exam-resource-card");

    const top = createElement("div", "exam-card-top");

    const type = normalize(resource.resource_type);

    let iconSymbol = "▧";

    if (type === "revision sheet") {
        iconSymbol = "▤";
    } else if (type === "question bank") {
        iconSymbol = "☷";
    } else if (type === "quiz") {
        iconSymbol = "✓";
    }

    const icon = createElement(
        "div",
        "exam-resource-icon",
        iconSymbol
    );

    const heading = document.createElement("div");

    heading.append(
        createElement(
            "span",
            "exam-resource-type",
            text(resource.resource_type) || "Resource"
        ),
        createElement(
            "h3",
            "",
            text(resource.title) || "Untitled resource"
        )
    );

    top.append(icon, heading);
    card.append(top);

    card.append(
        createElement(
            "p",
            "exam-resource-subject",
            text(resource.subject) || "Subject not specified"
        )
    );

    const metadata = createElement("div", "exam-resource-meta");

    [
        text(resource.year),
        resource.semester ? `Semester ${resource.semester}` : "",
        text(resource.unit)
    ].filter(Boolean).forEach(value => {
        metadata.append(createElement("span", "", value));
    });

    card.append(metadata);

    if (text(resource.description)) {
        card.append(
            createElement(
                "p",
                "exam-resource-description",
                text(resource.description)
            )
        );
    }

    if (text(resource.source)) {
        card.append(
            createElement(
                "div",
                "exam-resource-source",
                `Source: ${text(resource.source)}`
            )
        );
    }

    const safeUrl = getSafeUrl(text(resource.url));

    if (safeUrl) {
        const link = createElement(
            "a",
            "exam-resource-link",
            "View / Download PDF ↗"
        );

        link.href = safeUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        card.append(link);
    } else {
        card.append(
            createElement(
                "div",
                "exam-resource-source",
                "No valid resource link is available."
            )
        );
    }

    return card;
}


// ------------------------------------
// 5. APPLY SEARCH AND FILTERS
// ------------------------------------

function applyFilters() {
    const query = normalize(searchInput.value);

    const selectedYear = yearFilter.value;
    const selectedSemester = semesterFilter.value;
    const selectedSubject = subjectFilter.value;
    const selectedType = typeFilter.value;

    const filtered = resources.filter(resource => {

        const searchableText = normalize([
            resource.title,
            resource.subject,
            resource.description,
            resource.source,
            resource.resource_type,
            resource.year,
            resource.unit,
            resource.semester
        ].join(" "));

        return (
            (!query || searchableText.includes(query)) &&

            (!selectedYear ||
                normalizeYear(resource.year) === selectedYear) &&

            (!selectedSemester ||
                text(resource.semester) === selectedSemester) &&

            (!selectedSubject ||
                text(resource.subject) === selectedSubject) &&

            (!selectedType ||
                text(resource.resource_type) === selectedType)
        );
    });

    resourceGrid.replaceChildren();

    resultsCount.textContent =
        `${filtered.length} resource${filtered.length === 1 ? "" : "s"}`;

    emptyState.hidden = filtered.length !== 0;

    filtered.forEach(resource => {
        resourceGrid.append(createCard(resource));
    });
}


// ------------------------------------
// 6. LOAD RESOURCES FROM SUPABASE
// ------------------------------------

async function loadResources() {
    resourceGrid.replaceChildren();

    resourceGrid.append(
        createElement(
            "p",
            "exam-message",
            "Loading verified resources..."
        )
    );

    resultsCount.textContent = "Loading...";
    emptyState.hidden = true;

    try {
        const { data, error } = await supabase
            .from("exam_preparation")
            .select("*")
            .eq("verified", true)
            .order("id", { ascending: false });

        if (error) {
            throw error;
        }

        resources = data || [];

        populateSubjects();
        applyFilters();

    } catch (error) {
        console.error("Unable to load resources:", error);

        resourceGrid.replaceChildren();

        resultsCount.textContent = "Resources unavailable";

        resourceGrid.append(
            createElement(
                "p",
                "exam-message",
                `Unable to load resources: ${error.message}`
            )
        );

        emptyState.hidden = true;
    }
}


// ------------------------------------
// 7. SEARCH AND FILTER EVENTS
// ------------------------------------

searchInput.addEventListener("input", applyFilters);

[
    yearFilter,
    semesterFilter,
    subjectFilter,
    typeFilter
].forEach(filter => {
    filter.addEventListener("change", applyFilters);
});

searchForm.addEventListener("submit", event => {
    event.preventDefault();
    applyFilters();
});

resetButton.addEventListener("click", () => {
    setTimeout(() => {
        searchForm.reset();
        applyFilters();
    }, 0);
});


// ------------------------------------
// 8. START
// ------------------------------------

loadResources();
