
/*
 * SPPU Resource Hub — Previous Year Question Papers
 * Uses the existing exam_preparation Supabase table.
 */

// YOUR EXISTING SUPABASE CREDENTIALS
const SUPABASE_URL = "YOUR_EXISTING_SUPABASE_URL";
const SUPABASE_KEY = "YOUR_EXISTING_SUPABASE_PUBLISHABLE_KEY";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// DOM ELEMENTS
const searchInput = document.getElementById("pyq-search");
const clearSearch = document.getElementById("clear-search");
const subjectFilter = document.getElementById("subject-filter");
const sortFilter = document.getElementById("sort-filter");
const resetFilters = document.getElementById("reset-filters");

const resourceCount = document.getElementById("resource-count");
const statusMessage = document.getElementById("status-message");
const pyqGrid = document.getElementById("pyq-grid");

let allResources = [];

// ESCAPE HTML TO PREVENT INJECTED MARKUP
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// VALIDATE RESOURCE URL
function safeURL(value) {
    try {
        const url = new URL(value);

        if (url.protocol === "https:" || url.protocol === "http:") {
            return url.href;
        }
    } catch (error) {
        return null;
    }

    return null;
}

// LOAD PYQ RESOURCES FROM SUPABASE
async function loadResources() {

    statusMessage.textContent = "Loading question papers...";

    const { data, error } = await supabaseClient
        .from("exam_preparation")
        .select("*")
        .eq("verified", true)
        .eq("resource_type", "PYQ")
        .order("created_at", { ascending: false });

    console.log("PYQ data:", data);
    console.log("PYQ error:", error);

    if (error) {
        console.error("Supabase error:", error);

        statusMessage.textContent =
            "Unable to load question papers. Please check the connection.";

        resourceCount.textContent = "0 papers";
        return;
    }

    allResources = (data || []).filter(resource =>
        resource.title && resource.url && safeURL(resource.url)
    );

    populateSubjects();
    applyFilters();
}

// POPULATE SUBJECT DROPDOWN
function populateSubjects() {

    const subjects = [
        ...new Set(
            allResources
                .map(resource => resource.subject)
                .filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b));

    subjectFilter.innerHTML =
        '<option value="">All Subjects</option>';

    subjects.forEach(subject => {

        const option = document.createElement("option");

        option.value = subject;
        option.textContent = subject;

        subjectFilter.appendChild(option);
    });
}

// APPLY SEARCH, FILTER AND SORT
function applyFilters() {

    const searchText = searchInput.value.toLowerCase().trim();
    const selectedSubject = subjectFilter.value;
    const sortValue = sortFilter.value;

    let filteredResources = allResources.filter(resource => {

        const searchableText = [
            resource.title,
            resource.subject,
            resource.year,
            resource.unit,
            resource.semester,
            resource.description,
            resource.source
        ].join(" ").toLowerCase();

        const matchesSearch = searchableText.includes(searchText);

        const matchesSubject =
            !selectedSubject || resource.subject === selectedSubject;

        return matchesSearch && matchesSubject;
    });

    // SORT RESOURCES
    if (sortValue === "title") {

        filteredResources.sort((a, b) =>
            a.title.localeCompare(b.title)
        );

    } else if (sortValue === "subject") {

        filteredResources.sort((a, b) =>
            (a.subject || "").localeCompare(b.subject || "")
        );

    } else {

        filteredResources.sort((a, b) =>
            new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );
    }

    renderResources(filteredResources);
}

// DISPLAY RESOURCE CARDS
function renderResources(resources) {

    pyqGrid.innerHTML = "";

    resourceCount.textContent =
        `${resources.length} question paper${resources.length !== 1 ? "s" : ""} found`;

    statusMessage.textContent = "";

    if (resources.length === 0) {

        pyqGrid.innerHTML = `
            <div class="empty-state">
                <h3>No question papers found</h3>
                <p>Try changing your search or selecting another subject.</p>
            </div>
        `;

        return;
    }

    resources.forEach(resource => {

        const card = document.createElement("article");
        card.className = "resource-card";

        const title = escapeHTML(resource.title);
        const subject = escapeHTML(resource.subject || "Subject not specified");
        const year = escapeHTML(resource.year || "Year not specified");
        const semester = escapeHTML(resource.semester || "");
        const unit = escapeHTML(resource.unit || "");
        const description = escapeHTML(
            resource.description || "Previous year question paper."
        );
        const source = escapeHTML(resource.source || "SPPU Resource");

        const url = safeURL(resource.url);

        if (!url) return;

        card.innerHTML = `
            <div class="resource-top">
                <span class="resource-badge">PREVIOUS YEAR PAPER</span>
                <span class="resource-year">${year}</span>
            </div>

            <h3>${title}</h3>

            <p class="resource-subject">${subject}</p>

            <p class="resource-description">
                ${description}
            </p>

            <div class="resource-meta">
                ${semester ? `<span>Semester ${semester}</span>` : ""}
                ${unit ? `<span>Unit ${unit}</span>` : ""}
                <span>Question Paper</span>
            </div>

            <div class="resource-footer">
                <span class="resource-source">${source}</span>

                <a
                    href="${escapeHTML(url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="resource-link"
                >
                    Open Paper ↗
                </a>
            </div>
        `;

        pyqGrid.appendChild(card);
    });
}

// EVENT LISTENERS
searchInput.addEventListener("input", applyFilters);

subjectFilter.addEventListener("change", applyFilters);

sortFilter.addEventListener("change", applyFilters);

clearSearch.addEventListener("click", () => {
    searchInput.value = "";
    applyFilters();
});

resetFilters.addEventListener("click", () => {

    searchInput.value = "";
    subjectFilter.value = "";
    sortFilter.value = "latest";

    applyFilters();
});

// START
loadResources();
