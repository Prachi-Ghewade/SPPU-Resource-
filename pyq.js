
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "YOUR_EXISTING_SUPABASE_URL";
const SUPABASE_KEY = "YOUR_EXISTING_SUPABASE_PUBLISHABLE_KEY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ELEMENTS
const searchInput = document.getElementById("examSearch");
const yearFilter = document.getElementById("pyqYear");
const semesterFilter = document.getElementById("pyqSemester");
const subjectFilter = document.getElementById("pyqSubject");

const searchForm = document.getElementById("examSearchForm");
const resourceGrid = document.getElementById("examResourceGrid");
const resultCount = document.getElementById("examResultCount");
const emptyState = document.getElementById("examEmptyState");

let allResources = [];

// SAFE HTML
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

// NORMALIZE ENGINEERING YEAR
function normalizeYear(value) {
    const year = String(value || "").toLowerCase().trim();

    if (["fe", "first year", "first"].includes(year)) return "FE";
    if (["se", "second year", "second"].includes(year)) return "SE";
    if (["te", "third year", "third"].includes(year)) return "TE";
    if (["be", "final year", "fourth year", "final"].includes(year)) return "BE";

    return year.toUpperCase();
}

// LOAD PYQ DATA
async function loadResources() {

    emptyState.style.display = "none";
    resultCount.textContent = "Loading...";

    const { data, error } = await supabase
        .from("exam_preparation")
        .select("*")
        .eq("verified", true);

    console.log("PYQ data:", data);
    console.log("PYQ error:", error);

    if (error) {
        console.error(error);

        resourceGrid.innerHTML = "";
        resultCount.textContent = "Unable to load resources";

        emptyState.style.display = "block";
        emptyState.querySelector("h3").textContent =
            "Unable to load question papers";

        emptyState.querySelector("p").textContent =
            "Please check your Supabase connection.";

        return;
    }

    // ONLY PYQ RESOURCES
    allResources = (data || []).filter(resource => {
        const type = String(resource.resource_type || "")
            .toLowerCase()
            .trim();

        return [
            "pyq",
            "previous year paper",
            "previous year papers"
        ].includes(type);
    });

    populateSubjects();
    applyFilters();
}

// POPULATE SUBJECT FILTER
function populateSubjects() {

    const subjects = [
        ...new Set(
            allResources
                .map(resource => resource.subject)
                .filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b));

    subjectFilter.innerHTML =
        '<option value="">All subjects</option>';

    subjects.forEach(subject => {
        const option = document.createElement("option");
        option.value = subject;
        option.textContent = subject;
        subjectFilter.appendChild(option);
    });
}

// FILTER RESOURCES
function applyFilters() {

    const search = searchInput.value.toLowerCase().trim();
    const selectedYear = yearFilter.value;
    const selectedSemester = semesterFilter.value;
    const selectedSubject = subjectFilter.value;

    const filtered = allResources.filter(resource => {

        const searchableText = [
            resource.title,
            resource.subject,
            resource.year,
            resource.semester,
            resource.description,
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

        return (
            matchesSearch &&
            matchesYear &&
            matchesSemester &&
            matchesSubject
        );
    });

    renderResources(filtered);
}

// DISPLAY CARDS
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
        const year = escapeHTML(resource.year || "");
        const semester = escapeHTML(resource.semester || "");
        const description = escapeHTML(
            resource.description || "Previous year question paper."
        );
        const source = escapeHTML(resource.source || "SPPU");

        card.innerHTML = `
            <div class="exam-resource-top">
                <div class="exam-resource-icon">▤</div>
                <span class="exam-resource-badge">Question Paper</span>
            </div>

            <h3>${title}</h3>

            <p>${subject}</p>

            <div class="exam-resource-meta">
                ${year ? `<span>${year}</span>` : ""}
                ${semester ? `<span>Semester ${semester}</span>` : ""}
            </div>

            <p>${description}</p>

            <div class="exam-resource-footer">
                <span>${source}</span>

                <a
                    href="${escapeHTML(url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="exam-resource-link"
                >
                    View / Download PDF ↗
                </a>
            </div>
        `;

        resourceGrid.appendChild(card);
    });
}

// EVENTS
searchForm.addEventListener("submit", event => {
    event.preventDefault();
    applyFilters();
});

searchInput.addEventListener("input", applyFilters);
yearFilter.addEventListener("change", applyFilters);
semesterFilter.addEventListener("change", applyFilters);
subjectFilter.addEventListener("change", applyFilters);

searchForm.addEventListener("reset", () => {
    setTimeout(applyFilters, 0);
});

// START
loadResources();
