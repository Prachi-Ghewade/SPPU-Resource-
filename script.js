
import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Use your existing Supabase project credentials.
const SUPABASE_URL = "https://aaowvybuurdnhjaugjqr.supabase.co";
const SUPABASE_KEY = "sb_publishable_IC5Lui65jLhlNu5kDeVqHQ_LRO5828U";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const totalResources = document.getElementById("totalResources");
const videoCount = document.getElementById("videoCount");
const notesCount = document.getElementById("notesCount");
const practicalCount = document.getElementById("practicalCount");
const recentResources = document.getElementById("recentResources");
const databaseMessage = document.getElementById("databaseMessage");

function getType(resource) {
    return String(resource.resource_type || "").toLowerCase();
}

function isVideo(resource) {
    const type = getType(resource);
    return type.includes("video") || type.includes("lecture");
}

function isPractical(resource) {
    const type = getType(resource);
    return (
        type.includes("practical") ||
        type.includes("programming") ||
        type.includes("lab") ||
        type.includes("experiment")
    );
}

function isStudyMaterial(resource) {
    const type = getType(resource);

    return (
        type.includes("note") ||
        type.includes("study material") ||
        type.includes("study_material")
    );
}

function getResourceIcon(resource) {
    if (isVideo(resource)) return "▷";
    if (isPractical(resource)) return "⌘";
    if (getType(resource).includes("question")) return "▤";
    return "▧";
}

function getSafeUrl(value) {
    if (!value) return null;

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

function updateCounts(resources) {
    totalResources.textContent = resources.length;
    videoCount.textContent = resources.filter(isVideo).length;
    notesCount.textContent = resources.filter(isStudyMaterial).length;
    practicalCount.textContent = resources.filter(isPractical).length;
}

function createRecentResource(resource) {
    const item = document.createElement("article");
    item.className = "recent-item";

    const icon = document.createElement("div");
    icon.className = "recent-icon";
    icon.textContent = getResourceIcon(resource);

    const details = document.createElement("div");
    details.className = "recent-details";

    const title = document.createElement("h3");
    title.textContent = resource.title || "Untitled resource";

    const metadata = document.createElement("p");

    const parts = [
        resource.subject,
        resource.year,
        resource.semester ? `Semester ${resource.semester}` : null,
        resource.unit,
        resource.resource_type
    ].filter(Boolean);

    metadata.textContent = parts.join(" · ") || "Study resource";

    details.append(title, metadata);
    item.append(icon, details);

    const safeUrl = getSafeUrl(resource.url);

    if (safeUrl) {
        const link = document.createElement("a");
        link.className = "recent-action";
        link.href = safeUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Open ↗";
        item.append(link);
    }

    return item;
}

async function loadDashboard() {
    recentResources.replaceChildren();

    const loading = document.createElement("div");
    loading.className = "loading-state";
    loading.textContent = "Loading resources...";
    recentResources.append(loading);

    databaseMessage.textContent = "";

    try {
        // Table name matches the capital R shown in your screenshot.
        const { data, error } = await supabase
            .from("Resources")
            .select("*")
            .eq("verified", true)
            .order("id", { ascending: false })
            .limit(1000);

        if (error) throw error;

        const resources = data || [];

        updateCounts(resources);
        recentResources.replaceChildren();

        if (resources.length === 0) {
            const empty = document.createElement("div");
            empty.className = "loading-state";
            empty.textContent =
                "No verified resources are available yet. Check back when resources have been approved.";
            recentResources.append(empty);
            return;
        }

        // Show the five latest records returned by the database.
        resources.slice(0, 5).forEach(resource => {
            recentResources.append(createRecentResource(resource));
        });

    } catch (error) {
        console.error("Supabase dashboard error:", error);

        totalResources.textContent = "—";
        videoCount.textContent = "—";
        notesCount.textContent = "—";
        practicalCount.textContent = "—";

        recentResources.replaceChildren();

        const message = document.createElement("div");
        message.className = "loading-state";
        message.textContent =
            "Unable to load resources. Check your Supabase connection and table permissions.";

        recentResources.append(message);
        databaseMessage.textContent =
            "Database error: " + (error.message || "Unknown error");
    }
}

loadDashboard();
