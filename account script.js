const STORAGE_KEYS = {
  resources: "studentPortalResources",
  saved: "studentPortalSaved",
  profile: "studentPortalProfile"
};

const starterResources = [
  { id: 1, title: "HTML Basics Notes", category: "HTML", description: "Learn HTML page structure, common tags, links and forms.", url: "https://developer.mozilla.org/en-US/docs/Web/HTML" },
  { id: 2, title: "CSS Styling Guide", category: "CSS", description: "Understand selectors, colors, spacing, Flexbox and responsive layouts.", url: "https://developer.mozilla.org/en-US/docs/Web/CSS" },
  { id: 3, title: "JavaScript Fundamentals", category: "JavaScript", description: "Practice variables, functions, conditions, arrays and DOM events.", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript" },
  { id: 4, title: "Python for Beginners", category: "Python", description: "Start with Python syntax, data types, loops and functions.", url: "https://docs.python.org/3/tutorial/" },
  { id: 5, title: "SQL Quick Reference", category: "SQL", description: "Review SELECT, WHERE, JOIN, GROUP BY and aggregate functions.", url: "https://www.w3schools.com/sql/" }
];

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

let resources = readStorage(STORAGE_KEYS.resources, starterResources);
let savedIds = readStorage(STORAGE_KEYS.saved, []);
let profile = readStorage(STORAGE_KEYS.profile, null);

const $ = (id) => document.getElementById(id);
const resourceList = $("resourceList");
const savedList = $("savedList");
const adminResourceTable = $("adminResourceTable");

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}
function safeURL(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
function persist() {
  writeStorage(STORAGE_KEYS.resources, resources);
  writeStorage(STORAGE_KEYS.saved, savedIds);
  updateDashboard();
}
function makeResourceCard(resource, savedMode = false) {
  const saved = savedIds.includes(resource.id);
  const link = safeURL(resource.url);
  return `
    <article class="resource-card">
      <span class="category">${escapeHTML(resource.category)}</span>
      <h3>${escapeHTML(resource.title)}</h3>
      <p>${escapeHTML(resource.description)}</p>
      ${link ? `<a href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer">Open resource ↗</a>` : ""}
      <div class="actions">
        ${savedMode
          ? `<button class="secondary" data-remove-saved="${resource.id}">Remove saved</button>`
          : `<button data-save="${resource.id}" ${saved ? 'disabled aria-disabled="true"' : ""}>${saved ? "Saved ✓" : "Save resource"}</button>`}
      </div>
    </article>`;
}
function renderResources() {
  const query = $("searchInput").value.trim().toLowerCase();
  const category = $("categoryFilter").value;
  const filtered = resources.filter((r) => {
    const matchesText = `${r.title} ${r.description} ${r.category}`.toLowerCase().includes(query);
    return matchesText && (category === "All" || r.category === category);
  });
  resourceList.innerHTML = filtered.length
    ? filtered.map((r) => makeResourceCard(r)).join("")
    : "<p class='muted'>No resources match your search.</p>";

  const savedResources = resources.filter((r) => savedIds.includes(r.id));
  savedList.innerHTML = savedResources.length
    ? savedResources.map((r) => makeResourceCard(r, true)).join("")
    : "<p class='muted'>No saved resources yet. Save a resource to see it here.</p>";
  $("resourceCount").textContent = `${filtered.length} resource${filtered.length === 1 ? "" : "s"}`;
  $("savedCount").textContent = `${savedResources.length} saved`;
  renderAdminTable();
}
function renderAccount() {
  if (profile) {
    $("accountStatus").textContent = `Signed in as ${profile.name}. (Demo only)`;
    $("profileBox").classList.remove("hidden");
    $("profileBox").innerHTML = `<strong>Student profile</strong><br>Name: ${escapeHTML(profile.name)}<br>Email: ${escapeHTML(profile.email)}`;
    $("studentName").value = profile.name;
    $("studentEmail").value = profile.email;
  } else {
    $("accountStatus").textContent = "You are signed out.";
    $("profileBox").classList.add("hidden");
    $("profileBox").textContent = "";
  }
}
function renderAdminTable() {
  adminResourceTable.innerHTML = resources.map((r) => `
    <tr>
      <td>${escapeHTML(r.title)}</td>
      <td>${escapeHTML(r.category)}</td>
      <td>${escapeHTML(r.description)}</td>
      <td><div class="actions">
        <button data-edit="${r.id}">Edit</button>
        <button class="secondary" data-delete="${r.id}">Delete</button>
      </div></td>
    </tr>`).join("");
  if (!resources.length) adminResourceTable.innerHTML = "<tr><td colspan='4'>No resources available.</td></tr>";
}
function updateDashboard() {
  $("totalResources").textContent = resources.length;
  $("totalSaved").textContent = savedIds.length;
  $("resourceCount").textContent = `${resources.length} resources`;
}
function clearResourceForm() {
  $("resourceForm").reset();
  $("resourceId").value = "";
  $("formTitle").textContent = "Add a Resource";
  $("saveResourceBtn").textContent = "Add Resource";
}
function showView(viewId) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("hidden", view.id !== viewId));
  document.querySelectorAll(".nav-btn").forEach((button) => button.classList.toggle("active", button.dataset.view === viewId));
}

$("accountForm").addEventListener("submit", (event) => {
  event.preventDefault();
  profile = { name: $("studentName").value.trim(), email: $("studentEmail").value.trim() };
  writeStorage(STORAGE_KEYS.profile, profile);
  renderAccount();
});
$("logoutBtn").addEventListener("click", () => {
  profile = null;
  localStorage.removeItem(STORAGE_KEYS.profile);
  renderAccount();
});
$("searchInput").addEventListener("input", renderResources);
$("categoryFilter").addEventListener("change", renderResources);

resourceList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-save]");
  if (!button) return;
  if (!profile) {
    $("accountStatus").textContent = "Please create/sign in to a demo student account before saving resources.";
    $("studentName").focus();
    return;
  }
  const id = Number(button.dataset.save);
  if (!savedIds.includes(id)) savedIds.push(id);
  persist();
  renderResources();
});
savedList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-saved]");
  if (!button) return;
  savedIds = savedIds.filter((id) => id !== Number(button.dataset.removeSaved));
  persist();
  renderResources();
});
document.querySelectorAll(".nav-btn").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

$("resourceForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const idValue = $("resourceId").value;
  const resource = {
    id: idValue ? Number(idValue) : Date.now(),
    title: $("resourceTitle").value.trim(),
    category: $("resourceCategory").value,
    description: $("resourceDescription").value.trim(),
    url: $("resourceUrl").value.trim()
  };
  if (idValue) {
    resources = resources.map((item) => item.id === resource.id ? resource : item);
  } else {
    resources.unshift(resource);
  }
  persist();
  renderResources();
  clearResourceForm();
});
$("cancelEditBtn").addEventListener("click", clearResourceForm);
adminResourceTable.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (editButton) {
    const resource = resources.find((item) => item.id === Number(editButton.dataset.edit));
    if (!resource) return;
    $("resourceId").value = resource.id;
    $("resourceTitle").value = resource.title;
    $("resourceCategory").value = resource.category;
    $("resourceDescription").value = resource.description;
    $("resourceUrl").value = resource.url;
    $("formTitle").textContent = "Edit Resource";
    $("saveResourceBtn").textContent = "Update Resource";
    $("resourceForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (deleteButton) {
    const id = Number(deleteButton.dataset.delete);
    const resource = resources.find((item) => item.id === id);
    if (!resource || !confirm(`Delete "${resource.title}"?`)) return;
    resources = resources.filter((item) => item.id !== id);
    savedIds = savedIds.filter((savedId) => savedId !== id);
    persist();
    renderResources();
    clearResourceForm();
  }
});

persist();
renderAccount();
renderResources();
