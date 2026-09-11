/* =====================================================
   LANDSETU FRONTEND
   Demo frontend for Land Acquisition Management System
===================================================== */


/* ================= APPLICATION STATE ================= */
let caseData = [];
let projects = [];
let usersData = [];
let grievanceData = [];



/* =====================================================
   LOGIN
===================================================== */

async function login() {

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const errorBox = document.getElementById("loginError");

    if (errorBox) {
        errorBox.textContent = "";
        errorBox.classList.add("hidden");
    }

    try {
        const data = await apiRequest("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password })
        });

        authToken = data.token;
        sessionStorage.setItem("ls_token", authToken);

        state.role = data.role;
        state.user = data.name;
        state.userId = data.user_id;

        document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");

        buildNavigation();
        await loadLands();
        showPage("dashboard");

    } catch (err) {
        const message = err.message || "Login failed. Check your username and password.";
        if (errorBox) {
            errorBox.textContent = message;
            errorBox.classList.remove("hidden");
        } else {
            alert(message);
        }
    }
}

/* =====================================================
   LOGOUT
===================================================== */

function logout() {
    authToken = null;
    sessionStorage.removeItem("ls_token");

    document.getElementById("app").classList.add("hidden");
    document.getElementById("loginScreen").classList.remove("hidden");
}

/* =====================================================
   MOBILE SIDEBAR
===================================================== */

function toggleSidebar() {

    document
        .getElementById("sidebar")
        .classList
        .toggle("open");

}


/* =====================================================
   NAVIGATION
===================================================== */

function buildNavigation() {

    const nav =
        document.getElementById("navigation");


    let items;


    /* CITIZEN */

    if (state.role === "citizen") {

        items = [

            ["dashboard", "▦", "Dashboard"],

            ["land", "⌂", "My Land"],

            ["cases", "◷", "Acquisition Cases"],

            ["compensation", "₹", "Compensation"],

            ["documents", "▤", "Documents"],

            ["grievances", "!", "Grievances"],

            ["map", "⌖", "Land Map"]

        ];

    }


    /* OFFICER */

    else if (state.role === "officer") {

        items = [

            ["dashboard", "▦", "Dashboard"],

            ["cases", "◷", "Assigned Cases"],

            ["land", "⌂", "Land Verification"],

            ["compensation", "₹", "Compensation"],

            ["grievances", "!", "Grievances"],

            ["map", "⌖", "Map"]

        ];

    }


    /* ADMIN */

    else {

        items = [

            ["dashboard", "▦", "Dashboard"],

            ["projects", "▣", "Projects"],

            ["land", "⌂", "Land & Cases"],

            ["users", "♙", "Users"],

            ["analytics", "◈", "Analytics"],

            ["map", "⌖", "Project Map"]

        ];

    }


    nav.innerHTML =
        items.map(item => `

            <button
                class="nav-item
                ${state.page === item[0] ? "active" : ""}"
                onclick="showPage('${item[0]}')"
            >

                <span>${item[1]}</span>

                ${item[2]}

            </button>

        `).join("");


    document
        .getElementById("profileName")
        .textContent = state.user;


    document
        .getElementById("profileRole")
        .textContent =
            state.role.charAt(0).toUpperCase()
            + state.role.slice(1);


    document
        .getElementById("avatar")
        .textContent =
            state.user.charAt(0);

}


/* =====================================================
   PAGE ROUTER
===================================================== */

function showPage(page) {

    state.page = page;


    buildNavigation();


    const titles = {

        dashboard: "Dashboard",

        land: "My Land",

        cases:
            state.role === "officer"
                ? "Assigned Cases"
                : "Acquisition Cases",

        compensation: "Compensation",

        documents: "Documents",

        grievances: "Grievances",

        map: "Land Map",

        projects: "Projects",

        users: "Users",

        analytics: "Analytics",

        settings: "Settings",

        profile: "Profile"

    };


    document
        .getElementById("pageTitle")
        .textContent =
            titles[page] || "Dashboard";


    const content =
        document.getElementById("content");


    const pages = {

        dashboard: dashboardPage,

        land: landPage,

        cases: casesPage,

        compensation: compensationPage,

        documents: documentsPage,

        grievances: grievancesPage,

        map: mapPage,

        projects: projectsPage,

        users: usersPage,

        analytics: analyticsPage,

        settings: settingsPage,

        profile: profilePage

    };


    content.innerHTML =
        (pages[page] || dashboardPage)();

if (page === "dashboard") { initializeDashboardCharts(); }
if (page === "analytics") { initializeAnalyticsChart(); }
if (page === "cases") { loadCases(); }
if (page === "projects") { loadProjects(); }
if (page === "users") { loadUsers(); }
if (page === "grievances") { loadGrievances(); }


    if (window.innerWidth < 760) {

        document
            .getElementById("sidebar")
            .classList
            .remove("open");

    }

}


/* =====================================================
   STAT CARD
===================================================== */

function stat(icon, label, value, change) {

    return `

        <div class="stat-card">

            <div class="stat-top">

                <span class="stat-label">
                    ${label}
                </span>

                <span class="stat-icon">
                    ${icon}
                </span>

            </div>

            <div class="stat-value">
                ${value}
            </div>

            <div class="stat-change">
                ${change}
            </div>

        </div>

    `;

}


/* =====================================================
   DASHBOARD ROUTER
===================================================== */

function dashboardPage() {

    if (state.role === "citizen") {

        return citizenDashboard();

    }


    if (state.role === "officer") {

        return officerDashboard();

    }


    return adminDashboard();

}


/* =====================================================
   CITIZEN DASHBOARD
===================================================== */

function citizenDashboard() {

    return `

        <div class="page-intro">

            <div>

                <h3>
                    Good evening, ${state.user}
                </h3>

                <p>
                    Track your land, acquisition
                    status and compensation.
                </p>

            </div>

            <button
                class="primary-btn"
                onclick="showPage('grievances')"
            >
                + Raise Grievance
            </button>

        </div>


        <div class="stats-grid">

            ${stat(
                "⌂",
                "Total Land",
                "4",
                "All registered parcels"
            )}

            ${stat(
                "◷",
                "Active Cases",
                "2",
                "1 needs attention"
            )}

            ${stat(
                "₹",
                "Compensation",
                "₹8.0L",
                "₹3.8L pending"
            )}

            ${stat(
                "!",
                "Grievances",
                "1",
                "Under review"
            )}

        </div>


        <div class="grid-2">


            <!-- ACQUISITION TIMELINE -->

            <div class="card">

                <div class="card-header">

                    <h3>
                        Acquisition Progress
                    </h3>

                    <span>
                        Case ACQ-2401
                    </span>

                </div>


                <div class="progress-row">

                    <header>

                        <span>
                            Overall progress
                        </span>

                        <strong>
                            72%
                        </strong>

                    </header>

                    <div class="progress">

                        <span
                            style="width:72%"
                        ></span>

                    </div>

                </div>


                <div class="timeline">

                    ${timeline(
                        "Application submitted",
                        "12 Aug 2026",
                        "done"
                    )}

                    ${timeline(
                        "Land verification",
                        "18 Aug 2026",
                        "done"
                    )}

                    ${timeline(
                        "Notification issued",
                        "22 Aug 2026",
                        "done"
                    )}

                    ${timeline(
                        "Objection period",
                        "01 Sep 2026",
                        "done"
                    )}

                    ${timeline(
                        "Compensation assessment",
                        "In progress",
                        "current"
                    )}

                    ${timeline(
                        "Final acquisition",
                        "Pending",
                        ""
                    )}

                </div>

            </div>


            <!-- COMPENSATION -->

            <div class="card">

                <div class="card-header">

                    <h3>
                        Compensation Summary
                    </h3>

                    <span>
                        Updated today
                    </span>

                </div>


                <div class="detail-list">

                    ${detail(
                        "Estimated",
                        "₹12,50,000"
                    )}

                    ${detail(
                        "Approved",
                        "₹11,80,000"
                    )}

                    ${detail(
                        "Paid",
                        "₹8,00,000"
                    )}

                    ${detail(
                        "Pending",
                        "₹3,80,000"
                    )}

                </div>


                <button
                    class="btn"
                    style="margin-top:15px"
                    onclick="showPage('compensation')"
                >

                    View payment details →

                </button>

            </div>

        </div>


        <!-- MAP -->

        <div
            class="card"
            style="margin-top:18px"
        >

            <div class="card-header">

                <h3>
                    My Land Map
                </h3>

                <button
                    class="btn"
                    onclick="showPage('map')"
                >
                    Open full map
                </button>

            </div>

            ${mapMarkup()}

        </div>


        <!-- CASES -->

        <div class="card table-card">

            <div class="card-header">

                <h3>
                    Recent Land Cases
                </h3>

                <button
                    class="link-btn"
                    onclick="showPage('cases')"
                >
                    View all
                </button>

            </div>

            ${caseTable(
                caseData.slice(0,3)
            )}

        </div>

    `;

}


/* =====================================================
   OFFICER DASHBOARD
===================================================== */

function officerDashboard() {

    return `

        <div class="page-intro">

            <div>

                <h3>
                    Officer Control Center
                </h3>

                <p>
                    Review assigned land acquisition
                    cases and pending actions.
                </p>

            </div>

            <button
                class="primary-btn"
                onclick="showPage('cases')"
            >
                View Assigned Cases
            </button>

        </div>


        <div class="stats-grid">

            ${stat(
                "◷",
                "Assigned Cases",
                "48",
                "+6 this week"
            )}

            ${stat(
                "⌂",
                "Verification Pending",
                "12",
                "4 high priority"
            )}

            ${stat(
                "₹",
                "Compensation Pending",
                "8",
                "2 need action"
            )}

            ${stat(
                "!",
                "Open Grievances",
                "6",
                "2 new today"
            )}

        </div>


        <div class="grid-2">


            <div class="card">

                <div class="card-header">

                    <h3>
                        Cases by Status
                    </h3>

                    <span>
                        This month
                    </span>

                </div>

                <div class="chart-wrap">

                    <canvas id="statusChart"></canvas>

                </div>

            </div>


            <div class="card">

                <div class="card-header">

                    <h3>
                        Priority Actions
                    </h3>

                    <span>
                        Today
                    </span>

                </div>


                ${actionRow(
                    "ACQ-2401",
                    "Land verification",
                    "High",
                    "red"
                )}

                ${actionRow(
                    "ACQ-2402",
                    "Compensation review",
                    "Medium",
                    "orange"
                )}

                ${actionRow(
                    "ACQ-2404",
                    "Document review",
                    "Medium",
                    "orange"
                )}

                ${actionRow(
                    "GRV-1088",
                    "Grievance response",
                    "New",
                    "blue"
                )}

            </div>

        </div>


        <div
            class="card"
            style="margin-top:18px"
        >

            <div class="card-header">

                <h3>
                    Assigned Cases
                </h3>

                <button
                    class="link-btn"
                    onclick="showPage('cases')"
                >
                    Open queue
                </button>

            </div>

            ${caseTable(caseData)}

        </div>

    `;

}


/* =====================================================
   ADMIN DASHBOARD
===================================================== */

function adminDashboard() {

    return `

        <div class="page-intro">

            <div>

                <h3>
                    National Land Acquisition Overview
                </h3>

                <p>
                    Monitor projects, land parcels,
                    acquisition progress and compensation.
                </p>

            </div>

            <button
                class="primary-btn"
                onclick="showPage('analytics')"
            >
                View Analytics
            </button>

        </div>


        <div class="stats-grid">

            ${stat(
                "▣",
                "Active Projects",
                "18",
                "+3 this month"
            )}

            ${stat(
                "⌂",
                "Land Parcels",
                "1,284",
                "+8.4%"
            )}

            ${stat(
                "◷",
                "Acquisition Cases",
                "864",
                "642 completed"
            )}

            ${stat(
                "₹",
                "Compensation",
                "₹42.8 Cr",
                "₹31.2 Cr paid"
            )}

        </div>


        <div class="grid-2">


            <div class="card">

                <div class="card-header">

                    <h3>
                        Acquisition Trend
                    </h3>

                    <span>
                        2026
                    </span>

                </div>

                <div class="chart-wrap">

                    <canvas id="trendChart"></canvas>

                </div>

            </div>


            <div class="card">

                <div class="card-header">

                    <h3>
                        Project Progress
                    </h3>

                    <span>
                        Top projects
                    </span>

                </div>


                ${projects.map(project => `

                    <div class="progress-row">

                        <header>

                            <span>
                                ${project.name}
                            </span>

                            <strong>
                                ${project.progress}%
                            </strong>

                        </header>

                        <div class="progress">

                            <span
                                style="
                                    width:${project.progress}%
                                "
                            ></span>

                        </div>

                    </div>

                `).join("")}

            </div>

        </div>


        <div
            class="grid-map"
            style="margin-top:18px"
        >

            <div class="card">

                <div class="card-header">

                    <h3>
                        Project Map
                    </h3>

                    <button
                        class="link-btn"
                        onclick="showPage('map')"
                    >
                        Open map
                    </button>

                </div>

                ${mapMarkup()}

            </div>


            <div class="card">

                <div class="card-header">

                    <h3>
                        Case Status Distribution
                    </h3>

                </div>

                <div class="chart-wrap small">

                    <canvas id="statusChart"></canvas>

                </div>

            </div>

        </div>

    `;

}


/* =====================================================
   TIMELINE
===================================================== */

function timeline(title, date, cls) {

    return `

        <div class="timeline-item ${cls}">

            <div class="timeline-dot"></div>

            <div>

                <strong>
                    ${title}
                </strong>

                <span>
                    ${date}
                </span>

            </div>

        </div>

    `;

}


/* =====================================================
   DETAIL
===================================================== */

function detail(title, value) {

    return `

        <div class="detail-item">

            <small>
                ${title}
            </small>

            <strong>
                ${value}
            </strong>

        </div>

    `;

}


/* =====================================================
   ACTION ROW
===================================================== */

function actionRow(
    id,
    title,
    level,
    color
) {

    return `

        <div
            style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                padding:12px 0;
                border-bottom:
                1px solid #edf1ee
            "
        >

            <div>

                <strong style="font-size:12px">
                    ${id}
                </strong>

                <div
                    style="
                        font-size:11px;
                        color:#6b7a70;
                        margin-top:4px
                    "
                >
                    ${title}
                </div>

            </div>

            <span class="badge ${color}">
                ${level}
            </span>

        </div>

    `;

}


/* =====================================================
   CASE TABLE
===================================================== */

function caseTable(rows) {

    return `

        <div class="table-wrap">

            <table>

                <thead>

                    <tr>

                        <th>Case ID</th>

                        <th>Survey</th>

                        <th>Owner</th>

                        <th>Project</th>

                        <th>Status</th>

                        <th></th>

                    </tr>

                </thead>


                <tbody>

                    ${rows.map(c => `

                        <tr>

                            <td>
                                <strong>
                                    ${c.id}
                                </strong>
                            </td>

                            <td>
                                ${c.survey}
                            </td>

                            <td>
                                ${c.owner}
                            </td>

                            <td>
                                ${c.project}
                            </td>

                            <td>
                                ${statusBadge(c.status)}
                            </td>

                            <td>

                                <button
                                    class="link-btn"
                                    onclick="
                                        openCase('${c.id}')
                                    "
                                >
                                    View
                                </button>

                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;

}


/* =====================================================
   STATUS BADGE
===================================================== */

function statusBadge(status) {

    let color = "gray";


    if (
        status.includes("Completed") ||
        status.includes("Acquired")
    ) {

        color = "green";

    }

    else if (
        status.includes("Compensation")
    ) {

        color = "orange";

    }

    else if (
        status.includes("Verification")
    ) {

        color = "blue";

    }

    else if (
        status.includes("Pending")
    ) {

        color = "red";

    }


    return `

        <span class="badge ${color}">
            ${status}
        </span>

    `;

}


/* =====================================================
   LAND PAGE
===================================================== */

function landPage() {

    return `

        <div class="page-intro">

            <div>

                <h3>
                    ${
                        state.role === "admin"
                        ? "Land & Acquisition Cases"
                        : "My Land Parcels"
                    }
                </h3>

                <p>
                    Search, filter and open detailed
                    land records.
                </p>

            </div>


            <button
                class="primary-btn"
                onclick="openLandForm()"
            >
                + Add Land Record
            </button>

        </div>


        <div
            class="card table-card"
            style="margin-top:0"
        >

            <div class="table-tools">

                <input
                    class="search"
                    id="landSearch"
                    oninput="filterLand()"
                    placeholder="
                    Search survey number,
                    owner, village...
                    "
                >


                <select
                    class="filter"
                    id="landFilter"
                    onchange="filterLand()"
                >

                    <option>
                        All Status
                    </option>

                    <option>
                        Under Review
                    </option>

                    <option>
                        Compensation
                    </option>

                    <option>
                        Acquired
                    </option>

                    <option>
                        Verification
                    </option>

                    <option>
                        Pending
                    </option>

                </select>

            </div>


            <div id="landTable">

                ${landTable(landData)}

            </div>

        </div>

    `;

}


/* =====================================================
   LAND TABLE
===================================================== */

function landTable(rows) {

    return `

        <div class="table-wrap">

            <table>

                <thead>

                    <tr>

                        <th>
                            Survey No.
                        </th>

                        <th>
                            Owner
                        </th>

                        <th>
                            Area
                        </th>

                        <th>
                            Village
                        </th>

                        <th>
                            Project
                        </th>

                        <th>
                            Status
                        </th>

                        <th></th>

                    </tr>

                </thead>


                <tbody>

                    ${rows.map(l => `

                        <tr>

                            <td>
                                <strong>
                                    ${l.survey}
                                </strong>
                            </td>

                            <td>
                                ${l.owner}
                            </td>

                            <td>
                                ${l.area}
                            </td>

                            <td>
                                ${l.village}
                            </td>

                            <td>
                                ${l.project}
                            </td>

                            <td>
                                ${statusBadge(l.status)}
                            </td>

                            <td>

                                <button
                                    class="link-btn"
                                    onclick="
                                        openLand('${l.id}')
                                    "
                                >
                                    Details
                                </button>

                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;

}


/* =====================================================
   FILTER LAND
===================================================== */

function filterLand() {

    const query =
        (
            document
                .getElementById("landSearch")
                .value || ""
        ).toLowerCase();


    const filter =
        document
            .getElementById("landFilter")
            .value;


    const rows =
        landData.filter(land => {

            const matchesSearch =
                !query ||
                Object
                    .values(land)
                    .join(" ")
                    .toLowerCase()
                    .includes(query);


            const matchesFilter =
                filter === "All Status" ||
                land.status === filter;


            return (
                matchesSearch &&
                matchesFilter
            );

        });


    document.getElementById(
        "landTable"
    ).innerHTML =

        rows.length
        ? landTable(rows)
        : `
            <div class="empty">
                No land records found.
            </div>
        `;

}


/* =====================================================
   CASE PAGE
===================================================== */

function casesPage() {

    return `

        <div class="page-intro">

            <div>

                <h3>
                    ${
                        state.role === "officer"
                        ? "Assigned Acquisition Queue"
                        : "Acquisition Cases"
                    }
                </h3>

                <p>
                    Track each case from verification
                    through final acquisition.
                </p>

            </div>


            <button
                class="primary-btn"
                onclick="openCaseForm()"
            >
                + New Case
            </button>

        </div>


        <div
            class="card"
            style="margin-top:0"
        >

            <div class="table-tools">

                <input
                    class="search"
                    id="caseSearch"
                    oninput="filterCases()"
                    placeholder="
                    Search case ID,
                    survey, owner...
                    "
                >


                <select
                    class="filter"
                    id="caseFilter"
                    onchange="filterCases()"
                >

                    <option>
                        All Status
                    </option>

                    <option>
                        Land Verification
                    </option>

                    <option>
                        Compensation Pending
                    </option>

                    <option>
                        Completed
                    </option>

                    <option>
                        Document Review
                    </option>

                </select>

            </div>


            <div id="caseTable">

                ${caseTable(caseData)}

            </div>

        </div>

    `;

}


/* =====================================================
   FILTER CASES
===================================================== */

function filterCases() {

    const query =
        (
            document
                .getElementById("caseSearch")
                .value || ""
        ).toLowerCase();


    const filter =
        document
            .getElementById("caseFilter")
            .value;


    const rows =
        caseData.filter(c => {

            const searchMatch =
                !query ||
                Object
                    .values(c)
                    .join(" ")
                    .toLowerCase()
                    .includes(query);


            const filterMatch =
                filter === "All Status" ||
                c.status === filter;


            return (
                searchMatch &&
                filterMatch
            );

        });


    document.getElementById(
        "caseTable"
    ).innerHTML =

        rows.length
        ? caseTable(rows)
        : `
            <div class="empty">
                No cases found.
            </div>
        `;

}


/* =====================================================
   COMPENSATION
===================================================== */

function compensationPage() {

    return `

        <div class="page-intro">

            <div>

                <h3>
                    Compensation Management
                </h3>

                <p>
                    Track assessed, approved,
                    paid and pending compensation.
                </p>

            </div>


            <button
                class="primary-btn"
                onclick="openCompForm()"
            >
                + Record Payment
            </button>

        </div>


        <div class="stats-grid">

            ${stat(
                "₹",
                "Total Assessed",
                "₹42.8 Cr",
                "Across active projects"
            )}

            ${stat(
                "✓",
                "Approved",
                "₹39.5 Cr",
                "92% of assessed"
            )}

            ${stat(
                "↗",
                "Paid",
                "₹31.2 Cr",
                "73% of assessed"
            )}

            ${stat(
                "◷",
                "Pending",
                "₹8.3 Cr",
                "Needs processing"
            )}

        </div>


        <div class="grid-2">

            <div class="card">

                <div class="card-header">

                    <h3>
                        Payment Progress
                    </h3>

                    <span>
                        Overall
                    </span>

                </div>

                <div class="chart-wrap">

                    <canvas id="compChart"></canvas>

                </div>

            </div>


            <div class="card">

                <div class="card-header">

                    <h3>
                        Latest Assessment
                    </h3>

                </div>


                ${detail(
                    "Case",
                    "ACQ-2402"
                )}

                ${detail(
                    "Approved Amount",
                    "₹11,80,000"
                )}

                ${detail(
                    "Paid",
                    "₹8,00,000"
                )}

                ${detail(
                    "Pending",
                    "₹3,80,000"
                )}

                <button
                    class="btn"
                    style="margin-top:15px"
                    onclick="openCompForm()"
                >
                    View statement
                </button>

            </div>

        </div>


        <div class="card table-card">

            <div class="card-header">

                <h3>
                    Compensation Records
                </h3>

            </div>


            <div class="table-wrap">

                <table>

                    <thead>

                        <tr>

                            <th>Case</th>
                            <th>Owner</th>
                            <th>Assessed</th>
                            <th>Approved</th>
                            <th>Paid</th>
                            <th>Status</th>

                        </tr>

                    </thead>


                    <tbody>

                        ${caseData.map(
                            (c, i) => `

                            <tr>

                                <td>
                                    <strong>
                                        ${c.id}
                                    </strong>
                                </td>

                                <td>
                                    ${c.owner}
                                </td>

                                <td>
                                    ₹${[
                                        1250000,
                                        1180000,
                                        1650000,
                                        920000
                                    ][i].toLocaleString("en-IN")}
                                </td>

                                <td>
                                    ₹${[
                                        1180000,
                                        1120000,
                                        1600000,
                                        900000
                                    ][i].toLocaleString("en-IN")}
                                </td>

                                <td>
                                    ₹${[
                                        800000,
                                        800000,
                                        1600000,
                                        500000
                                    ][i].toLocaleString("en-IN")}
                                </td>

                                <td>

                                    ${statusBadge(
                                        i === 2
                                        ? "Paid"
                                        : "Pending"
                                    )}

                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>

        </div>

    `;

}


/* =====================================================
   DOCUMENTS
===================================================== */

function documentsPage() {

    const documents = [

        [
            "Land Record.pdf",
            "ACQ-2401",
            "12 Aug 2026",
            "Verified",
            "green"
        ],

        [
            "Identity Proof.pdf",
            "ACQ-2401",
            "12 Aug 2026",
            "Verified",
            "green"
        ],

        [
            "Bank Details.pdf",
            "ACQ-2402",
            "28 Aug 2026",
            "Pending",
            "orange"
        ],

        [
            "Sale Deed.pdf",
            "ACQ-2404",
            "04 Sep 2026",
            "Under Review",
            "blue"
        ]

    ];


    return `

        <div class="page-intro">

            <div>

                <h3>
                    Documents
                </h3>

                <p>
                    Upload and monitor verification
                    of acquisition documents.
                </p>

            </div>


            <button
                class="primary-btn"
                onclick="openDocumentForm()"
            >
                + Upload Document
            </button>

        </div>


        <div class="notice">

            Keep original land records,
            identity documents and bank details
            ready for faster verification.

        </div>


        <div class="card">

            <div class="table-wrap">

                <table>

                    <thead>

                        <tr>

                            <th>
                                Document
                            </th>

                            <th>
                                Case
                            </th>

                            <th>
                                Uploaded
                            </th>

                            <th>
                                Verification
                            </th>

                            <th>
                                Action
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        ${documents.map(
                            d => `

                            <tr>

                                <td>
                                    <strong>
                                        ▤ ${d[0]}
                                    </strong>
                                </td>

                                <td>
                                    ${d[1]}
                                </td>

                                <td>
                                    ${d[2]}
                                </td>

                                <td>

                                    <span
                                        class="
                                            badge ${d[4]}
                                        "
                                    >
                                        ${d[3]}
                                    </span>

                                </td>

                                <td>

                                    <button
                                        class="btn"
                                        onclick="
                                            openDocument(
                                                '${d[0]}'
                                            )
                                        "
                                    >
                                        View
                                    </button>

                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>

        </div>

    `;

}


/* =====================================================
   GRIEVANCES
===================================================== */

function grievancesPage() {
    return `
        <div class="page-intro">
            <div>
                <h3>Grievances & Support</h3>
                <p>Raise an issue and track its resolution.</p>
            </div>
            <button class="primary-btn" onclick="openGrievanceForm()">+ Raise Grievance</button>
        </div>

        <div class="card">
            <div class="card-header">
                <h3>Recent Grievances</h3>
                <span>All records</span>
            </div>
            <div id="grievanceList">${grievanceListMarkup(grievanceData)}</div>
        </div>
    `;
}

function grievanceListMarkup(rows) {
    if (!rows.length) {
        return `<div class="empty">No grievances yet.</div>`;
    }
    return rows.map(g => `
        <div style="padding:15px 0;border-bottom:1px solid #edf1ee;display:flex;justify-content:space-between;gap:10px;align-items:center">
            <div>
                <strong style="font-size:12px">${g.grievance_number} · ${g.subject}</strong>
                <div style="font-size:10px;color:#6b7a70;margin-top:5px">Case #${g.case_id}</div>
            </div>
            <div>${statusBadge(humanizeStatus(g.status))}</div>
        </div>
    `).join("");
}
/* =====================================================
   MAP
===================================================== */

function mapPage() {

    return `

        <div class="page-intro">

            <div>

                <h3>
                    Interactive Land Map
                </h3>

                <p>
                    Visualize parcels, projects
                    and acquisition status.
                </p>

            </div>


            <button
                class="btn"
                onclick="
                    alert(
                        'Production version will load real map layers from the backend.'
                    )
                "
            >
                Manage Layers
            </button>

        </div>


        <div class="card">

            <div
                class="map"
                style="height:520px"
            >

                ${mapControls()}

                ${pins()}


                <div
                    class="map-label"
                    style="
                        left:42%;
                        top:31%
                    "
                >
                    NH Expansion
                </div>


                <div
                    class="map-label"
                    style="
                        right:20%;
                        bottom:30%
                    "
                >
                    Ring Road
                </div>


                <div
                    class="map-label"
                    style="
                        left:13%;
                        bottom:19%
                    "
                >
                    Rail Corridor
                </div>

            </div>


            <div class="legend">

                <span>
                    <i class="l-green"></i>
                    Acquired
                </span>

                <span>
                    <i class="l-orange"></i>
                    Compensation
                </span>

                <span>
                    <i class="l-blue"></i>
                    Under Review
                </span>

                <span>
                    <i class="l-red"></i>
                    Pending
                </span>

            </div>

        </div>

    `;

}


/* =====================================================
   MAP MARKUP
===================================================== */

function mapMarkup() {

    return `

        <div class="map">

            ${mapControls()}

            ${pins()}


            <div
                class="map-label"
                style="
                    left:42%;
                    top:31%
                "
            >
                NH Expansion
            </div>


            <div
                class="map-label"
                style="
                    right:14%;
                    bottom:25%
                "
            >
                Ring Road
            </div>

        </div>


        <div class="legend">

            <span>
                <i class="l-green"></i>
                Acquired
            </span>

            <span>
                <i class="l-orange"></i>
                Compensation
            </span>

            <span>
                <i class="l-blue"></i>
                Under Review
            </span>

        </div>

    `;

}


/* =====================================================
   MAP SEARCH
===================================================== */

function mapControls() {

    return `

        <div class="map-controls">

            <input
                placeholder="Search survey no."
                onkeydown="
                    if(event.key === 'Enter')
                    searchMap(this.value)
                "
            >

        </div>

    `;

}


/* =====================================================
   MAP PINS
===================================================== */

function pins() {

    return `

        <button
            class="pin"
            style="
                left:27%;
                top:43%
            "
            onclick="
                openLand('LD-1024')
            "
        ></button>


        <button
            class="pin"
            style="
                left:51%;
                top:52%;
                background:#f59e0b
            "
            onclick="
                openLand('LD-1025')
            "
        ></button>


        <button
            class="pin"
            style="
                left:67%;
                top:35%;
                background:#22c55e
            "
            onclick="
                openLand('LD-1026')
            "
        ></button>


        <button
            class="pin"
            style="
                left:73%;
                top:65%;
                background:#dc2626
            "
            onclick="
                openLand('LD-1028')
            "
        ></button>


        <button
            class="pin"
            style="
                left:39%;
                top:72%;
                background:#2563eb
            "
            onclick="
                openLand('LD-1027')
            "
        ></button>

    `;

}


/* =====================================================
   MAP SEARCH FUNCTION
===================================================== */

function searchMap(query) {

    const land =
        landData.find(
            item =>
                item.survey.toLowerCase()
                === query.toLowerCase()
        );


    if (land) {

        openLand(land.id);

    }

    else {

        alert(
            "No matching survey number found."
        );

    }

}


/* =====================================================
   PROJECTS
===================================================== */

function projectsPage() {
    return `
        <div class="page-intro">
            <div>
                <h3>Projects</h3>
                <p>Monitor acquisition progress project by project.</p>
            </div>
            <button class="primary-btn" onclick="openProjectForm()">+ Add Project</button>
        </div>

        <div class="grid-2">
            <div class="card">
                <div class="card-header"><h3>Project Progress</h3></div>
                <div class="chart-wrap"><canvas id="projectChart"></canvas></div>
            </div>

            <div class="card">
                <div class="card-header"><h3>Project Summary</h3></div>
                <div id="projectList">${projectListMarkup(projects)}</div>
            </div>
        </div>
    `;
}

function projectListMarkup(rows) {
    if (!rows.length) {
        return `<div class="empty">No projects yet. Click "+ Add Project" to create one.</div>`;
    }
    return rows.map(project => `
        <div style="padding:12px 0;border-bottom:1px solid #edf1ee">
            <strong style="font-size:12px">${project.name}</strong>
            <span style="float:right">${project.progress}%</span>
            <div style="font-size:10px;color:#6b7a70;margin-top:5px">${project.district}</div>
        </div>
    `).join("");
}

/* =====================================================
   USERS
===================================================== */

function usersPage() {
    return `
        <div class="page-intro">
            <div>
                <h3>User Management</h3>
                <p>Manage citizens, officers and administrators.</p>
            </div>
            <button class="primary-btn" onclick="openUserForm()">+ Add User</button>
        </div>

        <div class="card">
            <div class="table-tools">
                <input class="search" placeholder="Search users...">
            </div>
            <div id="userTable">${userTableMarkup(usersData)}</div>
        </div>
    `;
}

function userTableMarkup(rows) {
    if (!rows.length) {
        return `<div class="empty">No users found.</div>`;
    }
    return `
        <div class="table-wrap">
            <table>
                <thead>
                    <tr><th>Name</th><th>Role</th><th>District</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                    ${rows.map(user => `
                        <tr>
                            <td><strong>${user.name}</strong></td>
                            <td>${humanizeStatus(user.role)}</td>
                            <td>${user.district || "—"}</td>
                            <td><span class="badge ${user.account_status === 'active' ? 'green' : 'gray'}">${humanizeStatus(user.account_status)}</span></td>
                            <td><button class="link-btn" onclick="alert('User profile opened.')">Manage</button></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}


/* =====================================================
   ANALYTICS
===================================================== */

function analyticsPage() {

    return `

        <div class="page-intro">

            <div>

                <h3>
                    Analytics & Reports
                </h3>

                <p>
                    Understand acquisition performance
                    using visual indicators.
                </p>

            </div>


            <button
                class="primary-btn"
                onclick="
                    alert(
                        'Report generation will connect to backend.'
                    )
                "
            >
                Generate Report
            </button>

        </div>


        <div class="stats-grid">

            ${stat(
                "✓",
                "Completion Rate",
                "74%",
                "+5.2% vs last month"
            )}

            ${stat(
                "◷",
                "Avg. Processing",
                "18 days",
                "-2 days"
            )}

            ${stat(
                "₹",
                "Avg. Compensation",
                "₹4.9L",
                "+3.1%"
            )}

            ${stat(
                "!",
                "Open Grievances",
                "86",
                "-12 this month"
            )}

        </div>


        <div class="grid-2">

            <div class="card">

                <div class="card-header">

                    <h3>
                        Monthly Acquisition Completion
                    </h3>

                </div>


                <div class="chart-wrap">

                    <canvas
                        id="analyticsChart"
                    ></canvas>

                </div>

            </div>


            <div class="card">

                <div class="card-header">

                    <h3>
                        Operational Indicators
                    </h3>

                </div>


                ${indicator(
                    "Land verification",
                    "86%"
                )}

                ${indicator(
                    "Document verification",
                    "79%"
                )}

                ${indicator(
                    "Compensation approval",
                    "72%"
                )}

                ${indicator(
                    "Grievance resolution",
                    "91%"
                )}

            </div>

        </div>

    `;

}


/* =====================================================
   INDICATOR
===================================================== */

function indicator(title, percentage) {

    return `

        <div class="progress-row">

            <header>

                <span>
                    ${title}
                </span>

                <strong>
                    ${percentage}
                </strong>

            </header>


            <div class="progress">

                <span
                    style="
                        width:${parseInt(percentage)}%
                    "
                ></span>

            </div>

        </div>

    `;

}


/* =====================================================
   SETTINGS
===================================================== */

function settingsPage() {

    return `

        <div class="page-intro">

            <div>

                <h3>
                    Settings
                </h3>

                <p>
                    Application settings.
                </p>

            </div>

        </div>


        <div class="card">

            <div class="form-grid">

                ${formField(
                    "Language",
                    "English"
                )}

                ${formField(
                    "Notifications",
                    "Enabled"
                )}

                ${formField(
                    "Map Provider",
                    "Google Maps"
                )}

                ${formField(
                    "Data Refresh",
                    "Real-time API"
                )}

            </div>


            <button
                class="primary-btn"
                style="margin-top:18px"
                onclick="
                    alert(
                        'Settings saved.'
                    )
                "
            >
                Save Settings
            </button>

        </div>

    `;

}


/* =====================================================
   PROFILE
===================================================== */

function profilePage() {

    return `

        <div class="page-intro">

            <div>

                <h3>
                    Profile
                </h3>

                <p>
                    Your account information.
                </p>

            </div>

        </div>


        <div class="card">

            <div class="detail-list">

                ${detail(
                    "Name",
                    state.user
                )}

                ${detail(
                    "Role",
                    state.role
                )}

                ${detail(
                    "Account Status",
                    "Active"
                )}

                ${detail(
                    "Authentication",
                    "JWT / API"
                )}

            </div>


            <button
                class="primary-btn"
                style="margin-top:18px"
                onclick="
                    alert(
                        'Profile update form opened.'
                    )
                "
            >
                Edit Profile
            </button>

        </div>

    `;

}


/* =====================================================
   MODAL FUNCTIONS
===================================================== */

function openModal(html) {

    document
        .getElementById("modalContent")
        .innerHTML = html;


    document
        .getElementById("modal")
        .classList
        .remove("hidden");

}


function closeModal() {

    document
        .getElementById("modal")
        .classList
        .add("hidden");

}


document
    .getElementById("modal")
    .addEventListener(
        "click",
        function(event) {

            if (
                event.target.id === "modal"
            ) {

                closeModal();

            }

        }
    );


/* =====================================================
   OPEN LAND
===================================================== */

function openLand(id) {

    const land =
        landData.find(
            item => item.id === id
        );


    if (!land) return;


    openModal(`

        <h2>
            Land Record · ${land.survey}
        </h2>

        <p>
            Digital land record overview.
        </p>


        <div class="detail-list">

            ${detail(
                "Record ID",
                land.id
            )}

            ${detail(
                "Owner",
                land.owner
            )}

            ${detail(
                "Area",
                land.area
            )}

            ${detail(
                "Village",
                land.village
            )}

            ${detail(
                "Project",
                land.project
            )}

            ${detail(
                "Status",
                land.status
            )}

            ${detail(
                "Latitude",
                "24.8332° N"
            )}

            ${detail(
                "Longitude",
                "92.7789° E"
            )}

        </div>


        <h3
            style="
                margin:22px 0 10px;
                font-size:14px
            "
        >
            Quick Actions
        </h3>


        <button
            class="btn"
            onclick="
                closeModal();
                showPage('documents')
            "
        >
            Documents
        </button>


        <button
            class="btn"
            onclick="
                closeModal();
                showPage('compensation')
            "
        >
            Compensation
        </button>


        <button
            class="btn"
            onclick="
                closeModal();
                showPage('map')
            "
        >
            View on Map
        </button>

    `);

}


/* =====================================================
   OPEN CASE
===================================================== */

function openCase(id) {

    const caseItem =
        caseData.find(
            item => item.id === id
        );


    if (!caseItem) return;


    openModal(`

        <h2>
            ${caseItem.id}
            · Acquisition Case
        </h2>

        <p>
            Detailed case information.
        </p>


        <div class="detail-list">

            ${detail(
                "Survey Number",
                caseItem.survey
            )}

            ${detail(
                "Owner",
                caseItem.owner
            )}

            ${detail(
                "Project",
                caseItem.project
            )}

            ${detail(
                "Current Status",
                caseItem.status
            )}

            ${detail(
                "Created",
                caseItem.date
            )}

            ${detail(
                "Officer",
                "Arun Sharma"
            )}

        </div>


        <h3
            style="
                margin-top:22px;
                font-size:14px
            "
        >
            Acquisition Timeline
        </h3>


        <div class="timeline">

            ${timeline(
                "Application",
                "12 Aug 2026",
                "done"
            )}

            ${timeline(
                "Land verification",
                "18 Aug 2026",
                "done"
            )}

            ${timeline(
                "Notification",
                "22 Aug 2026",
                "done"
            )}

            ${timeline(
                "Compensation",
                "In progress",
                "current"
            )}

            ${timeline(
                "Final acquisition",
                "Pending",
                ""
            )}

        </div>


        <button
            class="primary-btn"
            onclick="
                closeModal();
                alert(
                    'Status update sent to backend.'
                )
            "
        >
            Update Case Status
        </button>

    `);

}


/* =====================================================
   GRIEVANCE DETAILS
===================================================== */

function openGrievance(id) {

    openModal(`

        <h2>
            ${id}
        </h2>

        <p>
            <strong>
                Compensation delay
            </strong>
        </p>


        <div class="detail-list">

            ${detail(
                "Case",
                "ACQ-2402"
            )}

            ${detail(
                "Status",
                "Under Review"
            )}

            ${detail(
                "Assigned Officer",
                "Arun Sharma"
            )}

            ${detail(
                "Submitted",
                "07 Sep 2026"
            )}

        </div>


        <p
            style="margin-top:16px"
        >
            Your grievance has been assigned
            and is currently under review.
            You will receive a notification
            when the officer responds.
        </p>

    `);

}


/* =====================================================
   DOCUMENT VIEW
===================================================== */

function openDocument(name) {

    openModal(`

        <h2>
            ${name}
        </h2>

        <p>
            Document preview placeholder.
            In the production system this
            area will contain a secure
            document viewer.
        </p>


        <button
            class="primary-btn"
            onclick="closeModal()"
        >
            Close
        </button>

    `);

}


/* =====================================================
   FORMS
===================================================== */

function formField(label, value, id) {
    return `
        <div class="form-group">
            <label>${label}</label>
            <input id="${id || ""}" value="${value}">
        </div>
    `;
}


/* =====================================================
   GRIEVANCE FORM
===================================================== */

function openGrievanceForm() {

    openModal(`

        <h2>
            Raise a Grievance
        </h2>

        <p>
            Submit an issue related to land,
            documents, acquisition or compensation.
        </p>


        <div class="form-grid">

            ${formField(
                "Case ID",
                "ACQ-2402"
            )}

            ${formField(
                "Category",
                "Compensation"
            )}


            <div class="form-group full-col">

                <label>
                    Subject
                </label>

                <input
                    placeholder="
                        Enter subject
                    "
                >

            </div>


            <div class="form-group full-col">

                <label>
                    Description
                </label>

                <textarea
                    placeholder="
                        Describe the issue...
                    "
                ></textarea>

            </div>

        </div>


        <button
            class="primary-btn"
            style="margin-top:18px"
            onclick="
                closeModal();
                alert(
                    'Grievance submitted successfully.'
                )
            "
        >
            Submit Grievance
        </button>

    `);

}


/* =====================================================
   DOCUMENT FORM
===================================================== */

function openDocumentForm() {

    openModal(`

        <h2>
            Upload Document
        </h2>

        <p>
            Select document type and file.
        </p>


        <div class="form-grid">

            ${formField(
                "Document Type",
                "Land Record"
            )}

            ${formField(
                "Case ID",
                "ACQ-2401"
            )}


            <div
                class="
                    form-group
                    full-col
                "
            >

                <label>
                    Select File
                </label>

                <input
                    type="file"
                >

            </div>

        </div>


        <button
            class="primary-btn"
            style="margin-top:18px"
            onclick="
                closeModal();
                alert(
                    'Document uploaded successfully.'
                )
            "
        >
            Upload
        </button>

    `);

}


/* =====================================================
   LAND FORM
===================================================== */

function openLandForm() {
    openModal(`
        <h2>Add Land Record</h2>
        <p>Create a new digital land record.</p>

        <div class="form-grid">
            ${formField("Survey Number", "", "f_survey")}
            ${formField("Owner ID (numeric)", state.userId || "", "f_owner")}
            ${formField("Area (acres)", "", "f_area")}
            ${formField("Village", "", "f_village")}
            ${formField("District", "", "f_district")}
            ${formField("State", "", "f_state")}
        </div>

        <div id="landFormError" class="hidden" style="color:#c0392b;margin-top:10px;"></div>

        <button class="primary-btn" style="margin-top:18px" onclick="submitLandForm()">
            Save Land Record
        </button>
    `);
}

async function submitLandForm() {
    const errorBox = document.getElementById("landFormError");
    const payload = {
        survey_number: document.getElementById("f_survey").value.trim(),
        owner_id: Number(document.getElementById("f_owner").value),
        area_acres: Number(document.getElementById("f_area").value),
        village: document.getElementById("f_village").value.trim(),
        district: document.getElementById("f_district").value.trim(),
        state: document.getElementById("f_state").value.trim()
    };

    if (!payload.survey_number || !payload.owner_id || !payload.area_acres || !payload.village || !payload.district || !payload.state) {
        errorBox.textContent = "All fields are required, and Owner ID must reference an existing user.";
        errorBox.classList.remove("hidden");
        return;
    }

    try {
        await apiRequest("/api/lands", { method: "POST", body: JSON.stringify(payload) });
        closeModal();
        await loadLands();
    } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove("hidden");
    }
}
async function loadCases() {
    try {
        const data = await apiRequest("/api/cases");
        caseData = data.cases.map(row => ({
            id: row.case_number,
            case_id: row.case_id,
            survey: `Land #${row.land_id}`,
            owner: "—",
            project: `Project #${row.project_id}`,
            status: humanizeStatus(row.status),
            date: row.application_date
                ? new Date(row.application_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                : "—"
        }));
    } catch (err) {
        console.error("Failed to load cases:", err.message);
        caseData = [];
    }
    const container = document.getElementById("caseTable");
    if (container) container.innerHTML = caseTable(caseData);
}

async function loadProjects() {
    try {
        const data = await apiRequest("/api/projects");
        projects = data.projects.map(row => ({
            id: row.project_id,
            name: row.project_name,
            district: row.district,
            land: 0,
            cases: 0,
            progress: row.status === "completed" ? 100 : row.status === "ongoing" ? 50 : 0
        }));
    } catch (err) {
        console.error("Failed to load projects:", err.message);
        projects = [];
    }
    const list = document.getElementById("projectList");
    if (list) list.innerHTML = projectListMarkup(projects);
    initializeProjectChart();
}

async function loadUsers() {
    try {
        const data = await apiRequest("/api/users");
        usersData = data.users;
    } catch (err) {
        console.error("Failed to load users:", err.message);
        usersData = [];
    }
    const container = document.getElementById("userTable");
    if (container) container.innerHTML = userTableMarkup(usersData);
}

async function loadGrievances() {
    try {
        const data = await apiRequest("/api/grievances");
        grievanceData = data.grievances;
    } catch (err) {
        console.error("Failed to load grievances:", err.message);
        grievanceData = [];
    }
    const container = document.getElementById("grievanceList");
    if (container) container.innerHTML = grievanceListMarkup(grievanceData);
}

/* =====================================================
   CASE FORM
===================================================== */

function openCaseForm() {
    openModal(`
        <h2>Create Acquisition Case</h2>
        <div class="form-grid">
            ${formField("Land ID (numeric)", "", "f_case_land")}
            ${formField("Project ID (numeric)", "", "f_case_project")}
            ${formField("Application Date (YYYY-MM-DD)", "", "f_case_date")}
            ${formField("Status", "application submitted", "f_case_status")}
        </div>
        <div id="caseFormError" class="hidden" style="color:#c0392b;margin-top:10px;"></div>
        <button class="primary-btn" style="margin-top:18px" onclick="submitCaseForm()">Create Case</button>
    `);
}

async function submitCaseForm() {
    const errorBox = document.getElementById("caseFormError");
    const payload = {
        land_id: Number(document.getElementById("f_case_land").value),
        project_id: Number(document.getElementById("f_case_project").value),
        application_date: document.getElementById("f_case_date").value.trim(),
        status: document.getElementById("f_case_status").value.trim() || undefined
    };

    if (!payload.land_id || !payload.project_id || !payload.application_date) {
        errorBox.textContent = "Land ID, Project ID and Application Date are required, and must reference existing records.";
        errorBox.classList.remove("hidden");
        return;
    }

    try {
        await apiRequest("/api/cases", { method: "POST", body: JSON.stringify(payload) });
        closeModal();
        await loadCases();
    } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove("hidden");
    }
}

function openCompForm() {
    openModal(`
        <h2>Compensation Record</h2>
        <div class="form-grid">
            ${formField("Case ID (numeric)", "", "f_comp_case")}
            ${formField("Payment Reference", "", "f_comp_ref")}
            ${formField("Approved Amount", "", "f_comp_amount")}
            ${formField("Payment Date (YYYY-MM-DD)", "", "f_comp_date")}
        </div>
        <div id="compFormError" class="hidden" style="color:#c0392b;margin-top:10px;"></div>
        <button class="primary-btn" style="margin-top:18px" onclick="submitCompForm()">Save Payment</button>
    `);
}

async function submitCompForm() {
    const errorBox = document.getElementById("compFormError");
    const payload = {
        case_id: Number(document.getElementById("f_comp_case").value),
        payment_reference: document.getElementById("f_comp_ref").value.trim() || undefined,
        approved_amount: Number(document.getElementById("f_comp_amount").value) || undefined,
        payment_date: document.getElementById("f_comp_date").value.trim() || undefined
    };

    if (!payload.case_id) {
        errorBox.textContent = "Case ID is required and must reference an existing case.";
        errorBox.classList.remove("hidden");
        return;
    }

    try {
        await apiRequest("/api/compensation", { method: "POST", body: JSON.stringify(payload) });
        closeModal();
        alert("Compensation record saved.");
    } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove("hidden");
    }
}

function openProjectForm() {
    openModal(`
        <h2>Add Project</h2>
        <div class="form-grid">
            ${formField("Project Name", "", "f_proj_name")}
            ${formField("District", "", "f_proj_district")}
            ${formField("State", "", "f_proj_state")}
            ${formField("Target Date (YYYY-MM-DD)", "", "f_proj_date")}
        </div>
        <div id="projectFormError" class="hidden" style="color:#c0392b;margin-top:10px;"></div>
        <button class="primary-btn" style="margin-top:18px" onclick="submitProjectForm()">Create Project</button>
    `);
}

async function submitProjectForm() {
    const errorBox = document.getElementById("projectFormError");
    const payload = {
        project_name: document.getElementById("f_proj_name").value.trim(),
        district: document.getElementById("f_proj_district").value.trim(),
        state: document.getElementById("f_proj_state").value.trim(),
        target_date: document.getElementById("f_proj_date").value.trim() || undefined
    };

    if (!payload.project_name || !payload.district || !payload.state) {
        errorBox.textContent = "Project Name, District and State are required.";
        errorBox.classList.remove("hidden");
        return;
    }

    try {
        await apiRequest("/api/projects", { method: "POST", body: JSON.stringify(payload) });
        closeModal();
        await loadProjects();
    } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove("hidden");
    }
}

function openUserForm() {
    openModal(`
        <h2>Add User</h2>
        <div class="form-grid">
            ${formField("Username", "", "f_user_username")}
            ${formField("Full Name", "", "f_user_name")}
            ${formField("Email", "", "f_user_email")}
            ${formField("Password", "", "f_user_password")}
            ${formField("Role (citizen/officer/admin)", "citizen", "f_user_role")}
            ${formField("District", "", "f_user_district")}
        </div>
        <div id="userFormError" class="hidden" style="color:#c0392b;margin-top:10px;"></div>
        <button class="primary-btn" style="margin-top:18px" onclick="submitUserForm()">Create User</button>
    `);
}

async function submitUserForm() {
    const errorBox = document.getElementById("userFormError");
    const payload = {
        username: document.getElementById("f_user_username").value.trim(),
        name: document.getElementById("f_user_name").value.trim(),
        email: document.getElementById("f_user_email").value.trim(),
        password: document.getElementById("f_user_password").value,
        role: document.getElementById("f_user_role").value.trim() || undefined,
        district: document.getElementById("f_user_district").value.trim() || undefined
    };

    if (!payload.username || !payload.name || !payload.email || !payload.password) {
        errorBox.textContent = "Username, Name, Email and Password are required.";
        errorBox.classList.remove("hidden");
        return;
    }

    try {
        await apiRequest("/api/users", { method: "POST", body: JSON.stringify(payload) });
        closeModal();
        await loadUsers();
    } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove("hidden");
    }
}

function openGrievanceForm() {
    openModal(`
        <h2>Raise a Grievance</h2>
        <p>Submit an issue related to land, documents, acquisition or compensation.</p>
        <div class="form-grid">
            ${formField("Case ID (numeric)", "", "f_griev_case")}
            ${formField("Category (land/document/acquisition/compensation/other)", "compensation", "f_griev_category")}
            <div class="form-group full-col">
                <label>Subject</label>
                <input id="f_griev_subject" placeholder="Enter subject">
            </div>
            <div class="form-group full-col">
                <label>Description</label>
                <textarea id="f_griev_description" placeholder="Describe the issue..."></textarea>
            </div>
        </div>
        <div id="grievanceFormError" class="hidden" style="color:#c0392b;margin-top:10px;"></div>
        <button class="primary-btn" style="margin-top:18px" onclick="submitGrievanceForm()">Submit Grievance</button>
    `);
}

async function submitGrievanceForm() {
    const errorBox = document.getElementById("grievanceFormError");
    const payload = {
        case_id: Number(document.getElementById("f_griev_case").value),
        citizen_id: state.userId,
        category: document.getElementById("f_griev_category").value.trim(),
        subject: document.getElementById("f_griev_subject").value.trim(),
        description: document.getElementById("f_griev_description").value.trim()
    };

    if (!payload.case_id || !payload.category || !payload.subject || !payload.description) {
        errorBox.textContent = "Case ID, Category, Subject and Description are required.";
        errorBox.classList.remove("hidden");
        return;
    }

    try {
        await apiRequest("/api/grievances", { method: "POST", body: JSON.stringify(payload) });
        closeModal();
        await loadGrievances();
    } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove("hidden");
    }
}

function openDocumentForm() {
    openModal(`
        <h2>Upload Document</h2>
        <p>Select document type and enter file details.</p>
        <div class="form-grid">
            ${formField("Document Type", "land record", "f_doc_type")}
            ${formField("Case ID (numeric)", "", "f_doc_case")}
            ${formField("File Name", "", "f_doc_filename")}
        </div>
        <div id="documentFormError" class="hidden" style="color:#c0392b;margin-top:10px;"></div>
        <button class="primary-btn" style="margin-top:18px" onclick="submitDocumentForm()">Upload</button>
    `);
}

async function submitDocumentForm() {
    const errorBox = document.getElementById("documentFormError");
    const payload = {
        case_id: Number(document.getElementById("f_doc_case").value),
        uploaded_by: state.userId,
        document_type: document.getElementById("f_doc_type").value.trim(),
        file_name: document.getElementById("f_doc_filename").value.trim()
    };

    if (!payload.case_id || !payload.document_type || !payload.file_name) {
        errorBox.textContent = "Case ID, Document Type and File Name are required.";
        errorBox.classList.remove("hidden");
        return;
    }

    try {
        await apiRequest("/api/documents", { method: "POST", body: JSON.stringify(payload) });
        closeModal();
        alert("Document uploaded successfully.");
    } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove("hidden");
    }
}


/* =====================================================
   NOTIFICATIONS
===================================================== */

function showNotifications() {

    openModal(`

        <h2>
            Notifications
        </h2>


        <div class="notification-list">

            ${state.notifications.map(
                notification => `

                <div class="notification">

                    🔔
                    ${notification[0]}

                    <small>
                        ${notification[1]}
                    </small>

                </div>

            `).join("")}

        </div>

    `);

}


/* =====================================================
   CHART OPTIONS
===================================================== */

function chartOptions() {

    return {

        responsive: true,

        maintainAspectRatio: false,

        plugins: {

            legend: {

                display: false

            }

        },

        scales: {

            x: {

                grid: {

                    display: false

                },

                ticks: {

                    font: {

                        size: 10

                    }

                }

            },

            y: {

                beginAtZero: true,

                ticks: {

                    font: {

                        size: 10

                    }

                }

            }

        }

    };

}


/* =====================================================
   DASHBOARD CHARTS
===================================================== */

function initializeDashboardCharts() {

    setTimeout(() => {


        /* STATUS CHART */

        const status =
            document
                .getElementById(
                    "statusChart"
                );


        if (status) {

            new Chart(

                status,

                {

                    type: "bar",

                    data: {

                        labels: [

                            "Pending",

                            "Verification",

                            "Compensation",

                            "Completed"

                        ],

                        datasets: [

                            {

                                data: [

                                    25,

                                    40,

                                    30,

                                    68

                                ],

                                borderRadius: 7

                            }

                        ]

                    },

                    options:
                        chartOptions()

                }

            );

        }


        /* TREND CHART */

        const trend =
            document
                .getElementById(
                    "trendChart"
                );


        if (trend) {

            new Chart(

                trend,

                {

                    type: "line",

                    data: {

                        labels: [

                            "Jan",
                            "Feb",
                            "Mar",
                            "Apr",
                            "May",
                            "Jun",
                            "Jul",
                            "Aug",
                            "Sep"

                        ],

                        datasets: [

                            {

                                data: [

                                    42,
                                    55,
                                    61,
                                    70,
                                    83,
                                    96,
                                    112,
                                    128,
                                    142

                                ],

                                tension: .35,

                                fill: false,

                                borderWidth: 3,

                                pointRadius: 3

                            }

                        ]

                    },

                    options:
                        chartOptions()

                }

            );

        }


        /* COMPENSATION */

        const comp =
            document
                .getElementById(
                    "compChart"
                );


        if (comp) {

            new Chart(

                comp,

                {

                    type: "doughnut",

                    data: {

                        labels: [

                            "Paid",

                            "Pending"

                        ],

                        datasets: [

                            {

                                data: [

                                    31.2,

                                    8.3

                                ],

                                borderWidth: 0

                            }

                        ]

                    },

                    options: {

                        responsive: true,

                        maintainAspectRatio:
                            false,

                        plugins: {

                            legend: {

                                position:
                                    "bottom"

                            }

                        }

                    }

                }

            );

        }

    }, 50);

}


/* =====================================================
   ANALYTICS CHART
===================================================== */

function initializeAnalyticsChart() {

    setTimeout(() => {

        const chart =
            document
                .getElementById(
                    "analyticsChart"
                );


        if (!chart) return;


        new Chart(

            chart,

            {

                type: "line",

                data: {

                    labels: [

                        "Apr",
                        "May",
                        "Jun",
                        "Jul",
                        "Aug",
                        "Sep"

                    ],

                    datasets: [

                        {

                            label:
                                "Completed",

                            data: [

                                58,
                                72,
                                84,
                                101,
                                126,
                                142

                            ],

                            tension: .35,

                            borderWidth: 3

                        }

                    ]

                },

                options:
                    chartOptions()

            }

        );

    }, 50);

}


/* =====================================================
   PROJECT CHART
===================================================== */

function initializeProjectChart() {

    setTimeout(() => {

        const chart =
            document
                .getElementById(
                    "projectChart"
                );


        if (!chart) return;


        new Chart(

            chart,

            {

                type: "bar",

                data: {

                    labels:
                        projects.map(
                            p => p.name
                        ),

                    datasets: [

                        {

                            data:
                                projects.map(
                                    p =>
                                        p.progress
                                ),

                            borderRadius: 8

                        }

                    ]

                },

                options: {

                    ...chartOptions(),

                    scales: {

                        x: {

                            grid: {

                                display:
                                    false

                            }

                        },

                        y: {

                            beginAtZero:
                                true,

                            max: 100,

                            ticks: {

                                callback:
                                    value =>
                                        value + "%"

                            }

                        }

                    }

                }

            }

        );

    }, 50);

}


/* =====================================================
   START APPLICATION
===================================================== */

/*
   Login screen is shown first.
   User selects Citizen / Officer / Admin.
*/
      