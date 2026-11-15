
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// USE THE SAME CREDENTIALS AS YOUR OTHER PAGES
const SUPABASE_URL = "https://aaowvybuurdnhjaugjqr.supabase.co";
const SUPABASE_KEY = "sb_publishable_IC5Lui65jLhlNu5kDeVqHQ_LRO5828U";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM ELEMENTS
const searchInput = document.getElementById("notesSearch");
const yearFilter = document.getElementById("notesYear");
const semesterFilter = document.getElementById("notesSemester");
const subjectFilter = document.getElementById("notesSubject");
const typeFilter = document.getElementById("notesType");

const searchForm = document.getElementById("notesSearchForm");
const resourceGrid = document.getElementById("notesResourceGrid");
const resultCount = document.getElementById("notesResultCount");
const emptyState = document.getElementById("notesEmptyState");

let allResources = [];

// ESCAPE HTML
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// VALIDATE URL
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

// NORMALIZE YEAR
function normalizeYear(value) {
    const year = String(value || "").toLowerCase().trim();

    if (["fe", "first year", "first"].includes(year)) return "FE";
    if (["se", "second year", "second"].includes(year)) return "SE";
    if (["te", "third year", "third"].includes(year)) return "TE";
    if (["be", "final year", "fourth year", "final"].includes(year)) return "BE";

    return year.toUpperCase();
}

// LOAD NOTES FROM SUPABASE
async function loadResources() {

    emptyState.style.display = "none";
    resultCount.textContent = "Loading...";

    const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("verified", true)
        .order("id", { ascending: false });

    console.log("Notes data:", data);
    console.log("Notes error:", error);

    if (error) {
        console.error(error);

        resultCount.textContent = "Unable to load resources";

        emptyState.style.display = "block";
        emptyState.querySelector("h3").textContent =
            "Unable to load study materials";

        emptyState.querySelector("p").textContent =
            "Please check your Supabase connection and table permissions.";

        return;
    }

    // KEEP ONLY NOTE / STUDY MATERIAL TYPES
    console.log("All rows received:", data);

allResources = data || [];

console.log("Resources after filtering:", allResources);

    populateFilters();
    applyFilters();
}

// POPULATE FILTERS
function populateFilters() {

    const subjects = [
        ...new Set(
            allResources
                .map(resource => resource.subject)
                .filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b));

    const types = [
        ...new Set(
            allResources
                .map(resource => resource.resource_type)
                .filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b));

    subjectFilter.innerHTML =
        '<option value="">All subjects</option>';

    typeFilter.innerHTML =
        '<option value="">All types</option>';

    subjects.forEach(subject => {
        const option = document.createElement("option");
        option.value = subject;
        option.textContent = subject;
        subjectFilter.appendChild(option);
    });

    types.forEach(type => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        typeFilter.appendChild(option);
    });
}

// APPLY FILTERS
function applyFilters() {

    const search = searchInput.value.toLowerCase().trim();
    const selectedYear = yearFilter.value;
    const selectedSemester = semesterFilter.value;
    const selectedSubject = subjectFilter.value;
    const selectedType = typeFilter.value;

    const filtered = allResources.filter(resource => {

        const searchableText = [
            resource.title,
            resource.subject,
            resource.year,
            resource.semester,
            resource.unit,
            resource.resource_type,
            resource.source
        ].join(" ").toLowerCase();

        const matchesSearch = searchableText.includes(search);

        const matchesYear =
            !selectedYear ||
            normalizeYear(resource.year) === selectedYear;

        const matchesSemester =
            !selectedSemester ||
            String(resource.semester || "") === selectedSemester;

        const matchesSubject =
            !selectedSubject ||
            resource.subject === selectedSubject;

        const matchesType =
            !selectedType ||
            resource.resource_type === selectedType;

        return (
            matchesSearch &&
            matchesYear &&
            matchesSemester &&
            matchesSubject &&
            matchesType
        );
    });

    renderResources(filtered);
}

// DISPLAY RESOURCE CARDS
function renderResources(resources) {

    resourceGrid.innerHTML = "";

    resultCount.textContent =
        `${resources.length} resources`;

    emptyState.style.display =
        resources.length === 0 ? "block" : "none";

    if (resources.length === 0) return;

    resources.forEach(resource => {

        const url = safeURL(resource.url);

        if (!url) return;

        const card = document.createElement("article");
        card.className = "exam-resource-card";

        const title = escapeHTML(resource.title);
        const subject = escapeHTML(resource.subject || "Subject not specified");
        const type = escapeHTML(resource.resource_type || "Study Material");
        const year = escapeHTML(resource.year || "");
        const semester = escapeHTML(resource.semester || "");
        const unit = escapeHTML(resource.unit || "");
        const source = escapeHTML(resource.source || "SPPU");

        card.innerHTML = `
            <div class="exam-resource-top">
                <div class="exam-resource-icon">▤</div>
                <span class="exam-resource-badge">${type}</span>
            </div>

            <h3>${title}</h3>

            <p>${subject}</p>

            <div class="exam-resource-meta">
                ${year ? `<span>${year}</span>` : ""}
                ${semester ? `<span>Semester ${semester}</span>` : ""}
                ${unit ? `<span>Unit ${unit}</span>` : ""}
            </div>

            <div class="exam-resource-footer">
                <span>${source}</span>

                <a
                    href="${escapeHTML(url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="exam-resource-link"
                >
                    View / Download ↗
                </a>
            </div>
        `;

        resourceGrid.appendChild(card);
    });
}

// SEARCH AND FILTER EVENTS
searchForm.addEventListener("submit", event => {
    event.preventDefault();
    applyFilters();
});

searchInput.addEventListener("input", applyFilters);
yearFilter.addEventListener("change", applyFilters);
semesterFilter.addEventListener("change", applyFilters);
subjectFilter.addEventListener("change", applyFilters);
typeFilter.addEventListener("change", applyFilters);

// RESET
searchForm.addEventListener("reset", () => {
    setTimeout(applyFilters, 0);
});

// START
loadResources();
