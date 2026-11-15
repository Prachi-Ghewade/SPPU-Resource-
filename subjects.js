
/* =====================================
   SPPU RESOURCE HUB - SUBJECTS
   Supabase Integration
===================================== */

import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


/* =====================================
   SUPABASE CONFIGURATION
===================================== */

const SUPABASE_URL = "https://aaowvybuurdnhjaugjqr.supabase.co";
const SUPABASE_KEY = "sb_publishable_IC5Lui65jLhlNu5kDeVqHQ_LRO5828U";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


/* =====================================
   DOM ELEMENTS
===================================== */

const searchForm = document.getElementById("subjectSearchForm");

const searchInput = document.getElementById("subjectSearch");

const yearFilter = document.getElementById("engineeringYear");

const semesterFilter = document.getElementById("semester");

const subjectGrid = document.getElementById("subjectGrid");

const subjectCount = document.getElementById("subjectCount");

const loadingState = document.getElementById("subjectLoading");

const emptyState = document.getElementById("subjectEmptyState");

const errorState = document.getElementById("subjectError");

const errorMessage = document.getElementById("subjectErrorMessage");


/* =====================================
   DATA
===================================== */

let allSubjects = [];


/* =====================================
   FETCH SUBJECTS FROM SUPABASE
===================================== */

async function loadSubjects() {

    loadingState.hidden = false;
    emptyState.hidden = true;
    errorState.hidden = true;
    subjectGrid.innerHTML = "";

    const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("verified", true)
        .order("engineering_year", { ascending: true })
        .order("semester", { ascending: true });

    loadingState.hidden = true;

    if (error) {

        console.error("Supabase error:", error);

        errorMessage.textContent = error.message;

        errorState.hidden = false;

        subjectCount.textContent = "0 subjects";

        return;
    }

    allSubjects = data || [];

    console.log("Subjects loaded:", allSubjects);

    applyFilters();
}


/* =====================================
   FILTER SUBJECTS
===================================== */

function applyFilters() {

    const searchValue = searchInput.value
        .trim()
        .toLowerCase();

    const selectedYear = yearFilter.value;

    const selectedSemester = semesterFilter.value;

    const filteredSubjects = allSubjects.filter(subject => {

        const matchesSearch =
            subject.subject_name.toLowerCase().includes(searchValue) ||
            subject.subject_code.toLowerCase().includes(searchValue);

        const matchesYear =
            !selectedYear ||
            subject.engineering_year === selectedYear;

        const matchesSemester =
            !selectedSemester ||
            String(subject.semester) === selectedSemester;

        return (
            matchesSearch &&
            matchesYear &&
            matchesSemester
        );

    });

    renderSubjects(filteredSubjects);
}


/* =====================================
   DISPLAY SUBJECT CARDS
===================================== */

function renderSubjects(subjects) {

    subjectGrid.innerHTML = "";

    subjectCount.textContent =
        `${subjects.length} ${subjects.length === 1 ? "subject" : "subjects"}`;

    emptyState.hidden = subjects.length !== 0;

    subjects.forEach(subject => {

        const card = document.createElement("article");

        card.className = "subject-card";

        const description = escapeHTML(
            subject.description || "Explore the complete syllabus for this subject."
        );

        const syllabus = Array.isArray(subject.syllabus)
            ? subject.syllabus
            : [];

        const syllabusHTML = syllabus.length
            ? syllabus.map((unit, index) => {

                const unitNumber = escapeHTML(
                    String(unit.unit ?? index + 1)
                );

                const unitTitle = escapeHTML(
                    unit.title || `Unit ${index + 1}`
                );

                const topics = Array.isArray(unit.topics)
                    ? unit.topics
                    : [];

                const topicsHTML = topics.length
                    ? `<ul>
                        ${topics.map(topic =>
                            `<li>${escapeHTML(String(topic))}</li>`
                        ).join("")}
                       </ul>`
                    : "<p>No topics added yet.</p>";

                return `
                    <div class="syllabus-unit">
                        <h4>Unit ${unitNumber}: ${unitTitle}</h4>
                        ${topicsHTML}
                    </div>
                `;

            }).join("")
            : "<p>No syllabus has been added yet.</p>";

        card.innerHTML = `

            <div class="subject-card-icon">▤</div>

            <h3>${escapeHTML(subject.subject_name)}</h3>

            <p class="subject-card-description">
                ${description}
            </p>

            <div class="subject-card-meta">

                <span>${escapeHTML(subject.subject_code)}</span>

                <span>${escapeHTML(subject.engineering_year)}</span>

                <span>Semester ${escapeHTML(String(subject.semester))}</span>

            </div>

            <button
                type="button"
                class="subject-card-button"
                aria-expanded="false"
            >
                View complete syllabus →
            </button>

            <div class="syllabus-details">

                ${syllabusHTML}

            </div>

        `;

        const syllabusButton = card.querySelector(
            ".subject-card-button"
        );

        const syllabusDetails = card.querySelector(
            ".syllabus-details"
        );

        syllabusButton.addEventListener("click", () => {

            const isOpen = syllabusDetails.classList.toggle("open");

            syllabusButton.setAttribute(
                "aria-expanded",
                String(isOpen)
            );

            syllabusButton.textContent = isOpen
                ? "Hide syllabus ↑"
                : "View complete syllabus →";

        });

        subjectGrid.appendChild(card);

    });

}


/* =====================================
   HTML ESCAPING
===================================== */

function escapeHTML(value) {

    return String(value).replace(/[&<>"']/g, character => {

        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];

    });

}


/* =====================================
   SEARCH AND FILTER EVENTS
===================================== */

searchForm.addEventListener("submit", event => {

    event.preventDefault();

    applyFilters();

});


searchInput.addEventListener("input", applyFilters);

yearFilter.addEventListener("change", applyFilters);

semesterFilter.addEventListener("change", applyFilters);


searchForm.addEventListener("reset", () => {

    setTimeout(() => {
        applyFilters();
    }, 0);

});


/* =====================================
   INITIALIZE PAGE
===================================== */

loadSubjects();
