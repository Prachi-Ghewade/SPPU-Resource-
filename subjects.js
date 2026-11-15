
/*
 * SPPU Resource Hub
 * Subjects & Syllabus Page
 */

// =====================================
// SUPABASE CONNECTION
// =====================================

import { createClient } from
    "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "YOUR_EXISTING_SUPABASE_URL";

const SUPABASE_KEY = "YOUR_EXISTING_SUPABASE_PUBLISHABLE_KEY";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// =====================================
// DATABASE SETTINGS
// =====================================

// Change to true after creating your Supabase tables.
const DATABASE_CONNECTED = false;


// Expected future tables:
// subjects
// syllabus_units


// =====================================
// DOM ELEMENTS
// =====================================

const searchInput =
    document.getElementById("subjectSearch");

const yearFilter =
    document.getElementById("engineeringYear");

const semesterFilter =
    document.getElementById("semester");

const searchForm =
    document.getElementById("subjectSearchForm");

const subjectGrid =
    document.getElementById("subjectGrid");

const subjectCount =
    document.getElementById("subjectCount");

const emptyState =
    document.getElementById("subjectEmptyState");

const errorState =
    document.getElementById("subjectError");

const errorMessage =
    document.getElementById("subjectErrorMessage");


// =====================================
// DATA STORAGE
// =====================================

let allSubjects = [];


// =====================================
// HTML ESCAPING
// =====================================

function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);

}


// =====================================
// NORMALIZE YEAR
// =====================================

function normalizeYear(value) {

    const year = String(value || "")
        .toLowerCase()
        .trim();

    if (["fe", "first year", "first"].includes(year))
        return "FE";

    if (["se", "second year", "second"].includes(year))
        return "SE";

    if (["te", "third year", "third"].includes(year))
        return "TE";

    if (["be", "final year", "fourth year", "final"].includes(year))
        return "BE";

    return year.toUpperCase();

}


// =====================================
// LOAD SUBJECTS FROM SUPABASE
// =====================================

async function loadSubjects() {

    subjectGrid.innerHTML = "";

    errorState.style.display = "none";

    if (!DATABASE_CONNECTED) {

        subjectCount.textContent = "0 subjects";

        emptyState.style.display = "block";

        return;

    }

    emptyState.style.display = "none";

    subjectCount.textContent = "Loading...";


    const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("id", { ascending: true });


    console.log("Subjects data:", data);
    console.log("Subjects error:", error);


    if (error) {

        console.error("Supabase error:", error);

        subjectCount.textContent = "0 subjects";

        errorMessage.textContent = error.message;

        errorState.style.display = "block";

        return;

    }


    allSubjects = data || [];

    applyFilters();

}


// =====================================
// APPLY FILTERS
// =====================================

function applyFilters() {

    const search =
        searchInput.value.toLowerCase().trim();

    const selectedYear =
        yearFilter.value;

    const selectedSemester =
        semesterFilter.value;


    const filteredSubjects = allSubjects.filter(subject => {

        const subjectName =
            String(subject.subject_name || "").toLowerCase();

        const subjectCode =
            String(subject.subject_code || "").toLowerCase();

        const matchesSearch =
            subjectName.includes(search) ||
            subjectCode.includes(search);

        const matchesYear =
            !selectedYear ||
            normalizeYear(subject.year) === selectedYear;

        const matchesSemester =
            !selectedSemester ||
            String(subject.semester || "") === selectedSemester;


        return (
            matchesSearch &&
            matchesYear &&
            matchesSemester
        );

    });


    renderSubjects(filteredSubjects);

}


// =====================================
// RENDER SUBJECT CARDS
// =====================================

function renderSubjects(subjects) {

    subjectGrid.innerHTML = "";

    subjectCount.textContent =
        `${subjects.length} subjects`;

    emptyState.style.display =
        subjects.length === 0 ? "block" : "none";


    subjects.forEach(subject => {

        const card = document.createElement("article");

        card.className = "subject-card";


        const name =
            escapeHTML(subject.subject_name);

        const code =
            escapeHTML(subject.subject_code || "Code not available");

        const year =
            escapeHTML(subject.year || "");

        const semester =
            escapeHTML(subject.semester || "");

        const description =
            escapeHTML(subject.description || "Explore the complete subject syllabus.");


        card.innerHTML = `

            <div class="subject-card-icon">
                ▤
            </div>

            <h3>${name}</h3>

            <p>${description}</p>

            <div class="subject-card-meta">

                <span>${code}</span>

                ${year ? `<span>${year}</span>` : ""}

                ${semester ? `<span>Semester ${semester}</span>` : ""}

            </div>

            <button
                type="button"
                class="subject-card-link"
                data-subject-id="${escapeHTML(subject.id)}"
            >
                Explore syllabus →
            </button>

            <div class="subject-syllabus-details"
                 id="syllabus-${escapeHTML(subject.id)}"
                 hidden>
            </div>

        `;


        subjectGrid.appendChild(card);

    });

}


// =====================================
// LOAD SUBJECT SYLLABUS
// =====================================

async function loadSyllabus(subjectId) {

    const syllabusContainer =
        document.getElementById(`syllabus-${subjectId}`);

    if (!syllabusContainer) return;


    // Database will be connected later.
    if (!DATABASE_CONNECTED) {

        syllabusContainer.hidden = false;

        syllabusContainer.textContent =
            "Syllabus details will be available after database connection.";

        return;

    }


    syllabusContainer.hidden = false;

    syllabusContainer.textContent = "Loading syllabus...";


    const { data, error } = await supabase
        .from("syllabus_units")
        .select("*")
        .eq("subject_id", subjectId)
        .order("unit_number", { ascending: true });


    if (error) {

        console.error("Syllabus error:", error);

        syllabusContainer.textContent =
            "Unable to load syllabus.";

        return;

    }


    if (!data || data.length === 0) {

        syllabusContainer.textContent =
            "No syllabus units have been added yet.";

        return;

    }


    syllabusContainer.innerHTML = data.map(unit => `

        <div class="syllabus-unit">

            <strong>
                Unit ${escapeHTML(unit.unit_number)}:
                ${escapeHTML(unit.unit_title)}
            </strong>

            <p>${escapeHTML(unit.topics || "")}</p>

        </div>

    `).join("");

}


// =====================================
// SYLLABUS BUTTON EVENT
// =====================================

subjectGrid.addEventListener("click", event => {

    const button = event.target.closest(
        ".subject-card-link"
    );

    if (!button) return;

    const subjectId = button.dataset.subjectId;

    loadSyllabus(subjectId);

});


// =====================================
// SEARCH AND FILTER EVENTS
// =====================================

searchInput.addEventListener("input", applyFilters);

yearFilter.addEventListener("change", applyFilters);

semesterFilter.addEventListener("change", applyFilters);


searchForm.addEventListener("submit", event => {

    event.preventDefault();

    applyFilters();

});


searchForm.addEventListener("reset", () => {

    setTimeout(applyFilters, 0);

});


// =====================================
// INITIALIZE PAGE
// =====================================

loadSubjects();
