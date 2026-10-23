
import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Use the same existing Supabase project.
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_KEY = "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (id) => document.getElementById(id);

const searchInput = $("searchInput");
const yearFilter = $("yearFilter");
const semesterFilter = $("semesterFilter");
const subjectFilter = $("subjectFilter");
const unitFilter = $("unitFilter");
const typeFilter = $("typeFilter");
const sortFilter = $("sortFilter");
const resourceGrid = $("resourceGrid");
const resultsCount = $("resultsCount");
const emptyState = $("emptyState");
const errorState = $("errorState");
const errorText = $("errorText");

let resources = [];
let activeCategory = "all";

function text(value) {
    return String(value ?? "").trim();
}

function normalize(value) {
    return text(value).toLowerCase().replace(/\s+/g, " ");
}

function normalizeYear(value) {
    const year = normalize(value);

    if (/^(first|1st|1|fe)(\s|$)/.test(year) ||
        year.includes("first year")) return "first";

    if (/^(second|2nd|2|se)(\s|$)/.test(year) ||
        year.includes("second year")) return "second";

    if (/^(third|3rd|3|te)(\s|$)/.test(year) ||
        year.includes("third year")) return "third";

    if (/^(fourth|4th|4|be)(\s|$)/.test(year) ||
        year.includes("fourth year")) return "fourth";

    return "";
}

function getType(resource) {
    return normalize(resource.resource_type);
}

function matchesCategory(resource, category) {
    const type = getType(resource);

    switch (category) {
        case "video":
            return type.includes("video") || type.includes("lecture");

        case "pyq":
            return type.includes("pyq") ||
                type.includes("question paper") ||
                type.includes("previous year") ||
                type.includes("past paper");

        case "notes":
            return type.includes("note") ||
                type.includes("study material") ||
                type.includes("study_material");

        case "practical":
            return type.includes("practical") ||
                type.includes("programming") ||
                type.includes("lab") ||
                type.includes("experiment");

        default:
            return true;
    }
}

function populateSelect(select, values, placeholder) {
    const previousValue = select.value;

    select.replaceChildren();

    const firstOption = document.createElement("option");
    firstOption.value = "";
    firstOption.textContent = placeholder;
    select.append(firstOption);

    const uniqueValues = [...new Set(
        values.map(text).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

    uniqueValues.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.append(option);
    });

    if (uniqueValues.includes(previousValue)) {
        select.value = previousValue;
    }
}

function populateFilters() {
    populateSelect(
        semesterFilter,
        resources.map(r => r.semester),
        "All semesters"
    );

    populateSelect(
        subjectFilter,
        resources.map(r => r.subject),
        "All subjects"
    );

    populateSelect(
        unitFilter,
        resources.map(r => r.unit),
        "All units"
    );

    populateSelect(
        typeFilter,
        resources.map(r => r.resource_type),
        "All types"
    );
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

function createElement(tag, className, content) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (content !== undefined) element.textContent = content;

    return element;
}

function createCard(resource) {
    const card = createElement("article", "exam-resource-card");
    const top = createElement("div", "exam-card-top");

    const icon = createElement(
        "div",
        "exam-resource-icon",
        matchesCategory(resource, "video") ? "▷" :
        matchesCategory(resource, "practical") ? "⌘" :
        matchesCategory(resource, "pyq") ? "▤" : "▧"
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
            "Open resource ↗"
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

function applyFilters() {
    const query = normalize(searchInput.value);
    const selectedYear = yearFilter.value;
    const selectedSemester = semesterFilter.value;
    const selectedSubject = subjectFilter.value;
    const selectedUnit = unitFilter.value;
    const selectedType = typeFilter.value;

    let filtered = resources.filter(resource => {
        const searchableText = normalize([
            resource.title,
            resource.subject,
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
            (!selectedUnit ||
                text(resource.unit) === selectedUnit) &&
            (!selectedType ||
                text(resource.resource_type) === selectedType) &&
            matchesCategory(resource, activeCategory)
        );
    });

    if (sortFilter.value === "title") {
        filtered.sort((a, b) =>
            text(a.title).localeCompare(text(b.title))
        );
    } else {
        filtered.sort((a, b) =>
            Number(b.id || 0) - Number(a.id || 0)
        );
    }

    resourceGrid.replaceChildren();
    emptyState.hidden = filtered.length !== 0;

    resultsCount.textContent =
        `${filtered.length} resource${filtered.length === 1 ? "" : "s"} found`;

    filtered.forEach(resource => {
        resourceGrid.append(createCard(resource));
    });
}

function resetFilters() {
    searchInput.value = "";
    yearFilter.value = "";
    semesterFilter.value = "";
    subjectFilter.value = "";
    unitFilter.value = "";
    typeFilter.value = "";
    sortFilter.value = "newest";

    activeCategory = "all";

    document.querySelectorAll(".exam-category").forEach(button => {
        const active = button.dataset.category === "all";
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });

    applyFilters();
}

async function loadResources() {
    errorState.hidden = true;
    emptyState.hidden = true;
    resourceGrid.hidden = false;
    resourceGrid.replaceChildren();

    resourceGrid.append(
        createElement(
            "div",
            "exam-message",
            "Loading verified resources..."
        )
    );

    resultsCount.textContent = "Loading...";

    try {
        // Capital R matches the table shown in your screenshot.
        const { data, error } = await supabase
            .from("Resources")
            .select("*")
            .eq("verified", true)
            .order("id", { ascending: false })
            .limit(1000);

        if (error) throw error;

        resources = data || [];

        populateFilters();
        applyFilters();

    } catch (error) {
        console.error("Unable to load resources:", error);

        resourceGrid.replaceChildren();
        resourceGrid.hidden = true;
        emptyState.hidden = true;
        errorState.hidden = false;

        resultsCount.textContent = "Resources unavailable";
        errorText.textContent =
            `${error.message || "Could not connect to Supabase."} Check the table name, columns, and read permissions.`;
    }
}

// Live search and filtering
searchInput.addEventListener("input", applyFilters);

[
    yearFilter,
    semesterFilter,
    subjectFilter,
    unitFilter,
    typeFilter,
    sortFilter
].forEach(select => {
    select.addEventListener("change", applyFilters);
});

$("applyFilters").addEventListener("click", applyFilters);

$("clearSearch").addEventListener("click", () => {
    searchInput.value = "";
    applyFilters();
    searchInput.focus();
});

$("resetFilters").addEventListener("click", resetFilters);
$("emptyReset").addEventListener("click", resetFilters);
$("retryButton").addEventListener("click", loadResources);

document.querySelectorAll(".exam-category").forEach(button => {
    button.addEventListener("click", () => {
        activeCategory = button.dataset.category;

        document.querySelectorAll(".exam-category").forEach(item => {
            const active = item === button;
            item.classList.toggle("active", active);
            item.setAttribute("aria-pressed", String(active));
        });

        applyFilters();
    });
});

loadResources();
