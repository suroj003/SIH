require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
    res.send("LandSetu API is running");
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("FATAL: JWT_SECRET is not set in the environment.");
    process.exit(1);
}

// ---- Hardcoded demo users (DB is empty, used as fallback for login) ----
const HARDCODED_USERS = [
    { user_id: 1, username: "citizen", name: "Citizen User", password: "12345", role: "citizen" },
    { user_id: 2, username: "administrator", name: "Administrator", password: "12345", role: "admin" },
    { user_id: 3, username: "landofficer", name: "Land Officer", password: "12345", role: "officer" }
];

function asyncHandler(fn) {
    return (req, res, next) => fn(req, res, next).catch(next);
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ success: false, message: "Missing or invalid Authorization header" });
    }

    jwt.verify(token, JWT_SECRET, (err, payload) => {
        if (err) {
            return res.status(401).json({ success: false, message: "Invalid or expired token" });
        }
        req.user = payload;
        next();
    });
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: "Insufficient permissions" });
        }
        next();
    };
}

const LAND_STATUS_MAP = {
    "pending": "pending",
    "under review": "under_review",
    "verification": "verification",
    "compensation": "compensation",
    "acquired": "acquired"
};

const CASE_STATUS_MAP = {
    "application submitted": "application_submitted",
    "document review": "document_review",
    "land verification": "land_verification",
    "notification issued": "notification_issued",
    "objection period": "objection_period",
    "compensation pending": "compensation_pending",
    "approved": "approved",
    "rejected": "rejected",
    "completed": "completed",
    "disputed": "disputed"
};

const DOCUMENT_TYPE_MAP = {
    "land record": "land_record",
    "identity proof": "identity_proof",
    "bank details": "bank_details",
    "sale deed": "sale_deed",
    "ownership proof": "ownership_proof",
    "valuation report": "valuation_report",
    "notice": "notice",
    "other": "other"
};

function resolveEnum(map, input) {
    if (!input) return null;
    const key = String(input).trim().toLowerCase();
    if (Object.values(map).includes(key)) return key;
    return map[key] || null;
}

function isMissing(value) {
    return value === undefined || value === null || value === "";
}

function generateCode(prefix) {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

app.post("/api/auth/login", asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (isMissing(username) || isMissing(password)) {
        return res.status(400).json({ success: false, message: "username and password are required" });
    }

    // 1. Check hardcoded demo users first (since DB is empty)
    const hardcodedUser = HARDCODED_USERS.find(u => u.username === username);
    if (hardcodedUser) {
        if (hardcodedUser.password !== password) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { user_id: hardcodedUser.user_id, role: hardcodedUser.role },
            JWT_SECRET,
            { expiresIn: "8h" }
        );

        return res.json({
            success: true,
            token,
            user_id: hardcodedUser.user_id,
            username: hardcodedUser.username,
            name: hardcodedUser.name,
            role: hardcodedUser.role
        });
    }

    // 2. Fall back to DB lookup (normal flow, unchanged)
    const [rows] = await pool.query(
        "SELECT user_id, username, name, password_hash, role FROM users WHERE username = ?",
        [username]
    );

    if (rows.length === 0) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
        { user_id: user.user_id, role: user.role },
        JWT_SECRET,
        { expiresIn: "8h" }
    );

    res.json({
        success: true,
        token,
        user_id: user.user_id,
        username: user.username,
        name: user.name,
        role: user.role
    });
}));

app.get("/api/dashboard/stats", authenticateToken, asyncHandler(async (req, res) => {
    const [[land]] = await pool.query("SELECT COUNT(*) AS total FROM land");
    const [[cases]] = await pool.query("SELECT COUNT(*) AS total FROM acquisition_cases");
    const [[grievances]] = await pool.query("SELECT COUNT(*) AS total FROM grievances WHERE status = 'open'");

    res.json({ success: true, totalLand: land.total, totalCases: cases.total, openGrievances: grievances.total });
}));

app.get("/api/projects", authenticateToken, asyncHandler(async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM projects ORDER BY created_at DESC");
    res.json({ success: true, projects: rows });
}));

app.post("/api/projects", authenticateToken, asyncHandler(async (req, res) => {
    const { project_name, description, department, district, state, target_date, status } = req.body;

    if (isMissing(project_name) || isMissing(district) || isMissing(state)) {
        return res.status(400).json({ success: false, message: "project_name, district and state are required" });
    }

    const resolvedStatus = status ? resolveEnum({ planned: "planned", ongoing: "ongoing", completed: "completed" }, status) : "planned";
    if (status && !resolvedStatus) {
        return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
    }

    const [result] = await pool.query(
        `INSERT INTO projects (project_name, description, department, district, state, target_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [project_name, description || null, department || null, district, state, target_date || null, resolvedStatus || "planned"]
    );

    res.json({ success: true, project_id: result.insertId });
}));

app.get("/api/lands", authenticateToken, asyncHandler(async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM land ORDER BY created_at DESC");
    res.json({ success: true, lands: rows });
}));

app.post("/api/lands", authenticateToken, asyncHandler(async (req, res) => {
    const {
        owner_id, project_id, survey_number, area_acres,
        village, district, state, land_type, status,
        latitude, longitude
    } = req.body;

    if (
        isMissing(owner_id) || isMissing(survey_number) || isMissing(area_acres) ||
        isMissing(village) || isMissing(district) || isMissing(state)
    ) {
        return res.status(400).json({
            success: false,
            message: "owner_id, survey_number, area_acres, village, district and state are required"
        });
    }

    const resolvedStatus = status ? resolveEnum(LAND_STATUS_MAP, status) : "pending";
    if (status && !resolvedStatus) {
        return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
    }

    const land_code = generateCode("LD");

    try {
        const [result] = await pool.query(
            `INSERT INTO land
                (land_code, owner_id, project_id, survey_number, area_acres, village, district, state, land_type, status, latitude, longitude)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                land_code, owner_id, project_id || null, survey_number, area_acres,
                village, district, state, land_type || "agricultural",
                resolvedStatus || "pending", latitude || null, longitude || null
            ]
        );

        res.json({ success: true, land_id: result.insertId, land_code });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ success: false, message: "Land record already exists for this survey number/village/district" });
        }
        if (error.code === "ER_NO_REFERENCED_ROW" || error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({ success: false, message: "owner_id or project_id does not reference an existing record" });
        }
        throw error;
    }
}));

app.get("/api/cases", authenticateToken, asyncHandler(async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM acquisition_cases ORDER BY created_at DESC");
    res.json({ success: true, cases: rows });
}));

app.get("/api/cases/:id", authenticateToken, asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
        "SELECT * FROM acquisition_cases WHERE case_id = ?",
        [req.params.id]
    );

    if (rows.length === 0) {
        return res.status(404).json({ success: false, message: "Case not found" });
    }

    res.json({ success: true, case: rows[0] });
}));

app.post("/api/cases", authenticateToken, asyncHandler(async (req, res) => {
    const { land_id, project_id, officer_id, application_date, expected_completion_date, remarks, status } = req.body;

    if (isMissing(land_id) || isMissing(project_id) || isMissing(application_date)) {
        return res.status(400).json({ success: false, message: "land_id, project_id and application_date are required" });
    }

    const resolvedStatus = status ? resolveEnum(CASE_STATUS_MAP, status) : "application_submitted";
    if (status && !resolvedStatus) {
        return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
    }

    const case_number = generateCode("ACQ");

    try {
        const [result] = await pool.query(
            `INSERT INTO acquisition_cases
                (case_number, land_id, project_id, officer_id, status, application_date, expected_completion_date, remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                case_number, land_id, project_id, officer_id || null,
                resolvedStatus || "application_submitted", application_date,
                expected_completion_date || null, remarks || null
            ]
        );

        res.json({ success: true, case_id: result.insertId, case_number });
    } catch (error) {
        if (error.code === "ER_NO_REFERENCED_ROW" || error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({ success: false, message: "land_id, project_id or officer_id does not reference an existing record" });
        }
        throw error;
    }
}));

app.patch("/api/cases/:id/status", authenticateToken, asyncHandler(async (req, res) => {
    const { status, remarks } = req.body;
    const changed_by = req.user.user_id;

    const resolvedStatus = resolveEnum(CASE_STATUS_MAP, status);
    if (!resolvedStatus) {
        return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [[existing]] = await connection.query(
            "SELECT status FROM acquisition_cases WHERE case_id = ? FOR UPDATE",
            [req.params.id]
        );

        if (!existing) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: "Case not found" });
        }

        await connection.query(
            "UPDATE acquisition_cases SET status = ? WHERE case_id = ?",
            [resolvedStatus, req.params.id]
        );

        await connection.query(
            `INSERT INTO case_status_history (case_id, changed_by, old_status, new_status, remarks)
             VALUES (?, ?, ?, ?, ?)`,
            [req.params.id, changed_by, existing.status, resolvedStatus, remarks || null]
        );

        await connection.commit();

        res.json({ success: true, message: "Status updated", old_status: existing.status, new_status: resolvedStatus });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}));

app.get("/api/compensation/:caseId", authenticateToken, asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
        "SELECT * FROM compensation WHERE case_id = ?",
        [req.params.caseId]
    );

    if (rows.length === 0) {
        return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, compensation: rows[0] });
}));

app.post("/api/compensation", authenticateToken, asyncHandler(async (req, res) => {
    const { case_id, assessed_amount, approved_amount, paid_amount, payment_reference, payment_date, payment_status, remarks } = req.body;

    if (isMissing(case_id)) {
        return res.status(400).json({ success: false, message: "case_id is required" });
    }

    const resolvedStatus = payment_status
        ? resolveEnum({ pending: "pending", approved: "approved", processing: "processing", "partially paid": "partially_paid", paid: "paid" }, payment_status)
        : "pending";
    if (payment_status && !resolvedStatus) {
        return res.status(400).json({ success: false, message: `Invalid payment_status: ${payment_status}` });
    }

    const [result] = await pool.query(
        `INSERT INTO compensation
            (case_id, assessed_amount, approved_amount, paid_amount, payment_reference, payment_date, payment_status, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            assessed_amount = VALUES(assessed_amount),
            approved_amount = VALUES(approved_amount),
            paid_amount = VALUES(paid_amount),
            payment_reference = VALUES(payment_reference),
            payment_date = VALUES(payment_date),
            payment_status = VALUES(payment_status),
            remarks = VALUES(remarks)`,
        [
            case_id, assessed_amount || 0, approved_amount || 0, paid_amount || 0,
            payment_reference || null, payment_date || null, resolvedStatus || "pending", remarks || null
        ]
    );

    res.json({ success: true, compensation_id: result.insertId || undefined, updated: result.insertId === 0 });
}));

app.get("/api/grievances", authenticateToken, asyncHandler(async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM grievances ORDER BY created_at DESC");
    res.json({ success: true, grievances: rows });
}));

app.post("/api/grievances", authenticateToken, asyncHandler(async (req, res) => {
    const { case_id, citizen_id, category, subject, description } = req.body;

    if (isMissing(case_id) || isMissing(citizen_id) || isMissing(category) || isMissing(subject) || isMissing(description)) {
        return res.status(400).json({ success: false, message: "case_id, citizen_id, category, subject and description are required" });
    }

    const resolvedCategory = resolveEnum(
        { land: "land", document: "document", acquisition: "acquisition", compensation: "compensation", other: "other" },
        category
    );
    if (!resolvedCategory) {
        return res.status(400).json({ success: false, message: `Invalid category: ${category}` });
    }

    const grievance_number = generateCode("GRV");

    const [result] = await pool.query(
        `INSERT INTO grievances (grievance_number, case_id, citizen_id, category, subject, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [grievance_number, case_id, citizen_id, resolvedCategory, subject, description]
    );

    res.json({ success: true, grievance_id: result.insertId, grievance_number });
}));

app.get("/api/documents/:caseId", authenticateToken, asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
        "SELECT * FROM documents WHERE case_id = ?",
        [req.params.caseId]
    );

    res.json({ success: true, documents: rows });
}));

app.post("/api/documents", authenticateToken, asyncHandler(async (req, res) => {
    const { case_id, uploaded_by, document_type, file_name, file_url } = req.body;

    if (isMissing(case_id) || isMissing(uploaded_by) || isMissing(document_type) || isMissing(file_name)) {
        return res.status(400).json({ success: false, message: "case_id, uploaded_by, document_type and file_name are required" });
    }

    const resolvedType = resolveEnum(DOCUMENT_TYPE_MAP, document_type);
    if (!resolvedType) {
        return res.status(400).json({ success: false, message: `Invalid document_type: ${document_type}` });
    }

    const [result] = await pool.query(
        `INSERT INTO documents (case_id, uploaded_by, document_type, file_name, file_url)
         VALUES (?, ?, ?, ?, ?)`,
        [case_id, uploaded_by, resolvedType, file_name, file_url || null]
    );

    res.json({ success: true, document_id: result.insertId });
}));

app.get("/api/users", authenticateToken, requireRole("admin", "officer"), asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
        "SELECT user_id, username, name, email, phone, role, district, account_status FROM users ORDER BY created_at DESC"
    );
    res.json({ success: true, users: rows });
}));

app.post("/api/users", asyncHandler(async (req, res) => {
    const { username, name, email, password, phone, role, district } = req.body;

    if (isMissing(username) || isMissing(name) || isMissing(email) || isMissing(password)) {
        return res.status(400).json({ success: false, message: "username, name, email and password are required" });
    }

    const resolvedRole = role ? resolveEnum({ citizen: "citizen", officer: "officer", admin: "admin" }, role) : "citizen";
    if (role && !resolvedRole) {
        return res.status(400).json({ success: false, message: `Invalid role: ${role}` });
    }

    const password_hash = await bcrypt.hash(password, 10);

    try {
        const [result] = await pool.query(
            `INSERT INTO users (username, name, email, password_hash, phone, role, district)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [username, name, email, password_hash, phone || null, resolvedRole || "citizen", district || null]
        );

        res.json({ success: true, user_id: result.insertId });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ success: false, message: "Username or email already exists" });
        }
        throw error;
    }
}));

app.get("/api/notifications", authenticateToken, asyncHandler(async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM notifications ORDER BY created_at DESC");
    res.json({ success: true, notifications: rows });
}));

app.post("/api/notifications", authenticateToken, requireRole("admin", "officer"), asyncHandler(async (req, res) => {
    const { user_id, title, message } = req.body;

    if (isMissing(user_id) || isMissing(title) || isMissing(message)) {
        return res.status(400).json({ success: false, message: "user_id, title and message are required" });
    }

    const [result] = await pool.query(
        `INSERT INTO notifications (user_id, title, message)
         VALUES (?, ?, ?)`,
        [user_id, title, message]
    );

    res.json({ success: true, notification_id: result.insertId });
}));

app.use((req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
});

app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
});

const PORT = Number(process.env.PORT || 5000);

const startServer = (port) => {
    const server = app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });

    server.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
            console.warn(`Port ${port} is busy. Trying ${port + 1} instead...`);
            startServer(port + 1);
            return;
        }

        throw error;
    });
};

startServer(PORT);