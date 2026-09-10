require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
    res.send("LandSetu API is running");
});

const JWT_SECRET = process.env.JWT_SECRET;

// =====================================================
// STATUS / TYPE MAPS  (frontend label <-> DB enum value)
// =====================================================

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

// Accepts either the frontend label ("Under Review") or the
// raw enum value ("under_review") already. Returns the enum
// value, or null if it doesn't match anything in the map.
function resolveEnum(map, input) {
    if (!input) return null;
    const key = String(input).trim().toLowerCase();
    if (Object.values(map).includes(key)) return key; // already an enum value
    return map[key] || null;
}

function generateCode(prefix) {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

// ---------------- LOGIN ----------------
app.post("/api/auth/login", async (req, res) => {
    try {
        const { username, password } = req.body;

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
            username: user.username,
            name: user.name,
            role: user.role
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ---------------- DASHBOARD ----------------
app.get("/api/dashboard/stats", async (req, res) => {
    try {
        const [[land]] = await pool.query("SELECT COUNT(*) AS total FROM land");
        const [[cases]] = await pool.query("SELECT COUNT(*) AS total FROM acquisition_cases");
        const [[grievances]] = await pool.query("SELECT COUNT(*) AS total FROM grievances WHERE status = 'open'");

        res.json({ success: true, totalLand: land.total, totalCases: cases.total, openGrievances: grievances.total });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ---------------- PROJECTS ----------------
app.get("/api/projects", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM projects ORDER BY created_at DESC");
        res.json({ success: true, projects: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post("/api/projects", async (req, res) => {
    try {
        const { project_name, description, department, district, state, target_date, status } = req.body;

        if (!project_name || !district || !state) {
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
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ---------------- LAND ----------------
app.get("/api/lands", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM land ORDER BY created_at DESC");
        res.json({ success: true, lands: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post("/api/lands", async (req, res) => {
    try {
        const {
            owner_id, project_id, survey_number, area_acres,
            village, district, state, land_type, status,
            latitude, longitude
        } = req.body;

        if (!owner_id || !survey_number || !area_acres || !village || !district || !state) {
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
        console.error(error);
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ success: false, message: "Land record already exists for this survey number/village/district" });
        }
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ---------------- CASES ----------------
app.get("/api/cases", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM acquisition_cases ORDER BY created_at DESC");
        res.json({ success: true, cases: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get("/api/cases/:id", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM acquisition_cases WHERE case_id = ?",
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Case not found" });
        }

        res.json({ success: true, case: rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post("/api/cases", async (req, res) => {
    try {
        const { land_id, project_id, officer_id, application_date, expected_completion_date, remarks, status } = req.body;

        if (!land_id || !project_id || !application_date) {
            return res.status(400).json({ success: false, message: "land_id, project_id and application_date are required" });
        }

        const resolvedStatus = status ? resolveEnum(CASE_STATUS_MAP, status) : "application_submitted";
        if (status && !resolvedStatus) {
            return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
        }

        const case_number = generateCode("ACQ");

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
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// PATCH status + write to case_status_history
//
// NOTE: `changed_by` is currently trusted from the request body because
// there's no auth middleware verifying the JWT on this route yet. Once
// that's added, replace `changed_by` below with `req.user.user_id` and
// stop accepting it from the client.
app.patch("/api/cases/:id/status", async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { status, changed_by, remarks } = req.body;

        if (!changed_by) {
            return res.status(400).json({ success: false, message: "changed_by is required until auth middleware is wired in" });
        }

        const resolvedStatus = resolveEnum(CASE_STATUS_MAP, status);
        if (!resolvedStatus) {
            return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
        }

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
        await connection.rollback();
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    } finally {
        connection.release();
    }
});

// ---------------- COMPENSATION ----------------
app.get("/api/compensation/:caseId", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM compensation WHERE case_id = ?",
            [req.params.caseId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Not found" });
        }

        res.json({ success: true, compensation: rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// case_id is UNIQUE in the schema, so this upserts: a second call for the
// same case updates the existing row (e.g. approved -> paid) rather than
// throwing a duplicate-key error.
app.post("/api/compensation", async (req, res) => {
    try {
        const { case_id, assessed_amount, approved_amount, paid_amount, payment_reference, payment_date, payment_status, remarks } = req.body;

        if (!case_id) {
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
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ---------------- GRIEVANCES ----------------
app.get("/api/grievances", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM grievances ORDER BY created_at DESC");
        res.json({ success: true, grievances: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post("/api/grievances", async (req, res) => {
    try {
        const { case_id, citizen_id, category, subject, description } = req.body;

        if (!case_id || !citizen_id || !category || !subject || !description) {
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
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ---------------- DOCUMENTS ----------------
app.get("/api/documents/:caseId", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM documents WHERE case_id = ?",
            [req.params.caseId]
        );

        res.json({ success: true, documents: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post("/api/documents", async (req, res) => {
    try {
        const { case_id, uploaded_by, document_type, file_name, file_url } = req.body;

        if (!case_id || !uploaded_by || !document_type || !file_name) {
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
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ---------------- USERS ----------------
app.get("/api/users", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT user_id, username, name, email, phone, role, district, account_status FROM users ORDER BY created_at DESC"
        );
        res.json({ success: true, users: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post("/api/users", async (req, res) => {
    try {
        const { username, name, email, password, phone, role, district } = req.body;

        if (!username || !name || !email || !password) {
            return res.status(400).json({ success: false, message: "username, name, email and password are required" });
        }

        const resolvedRole = role ? resolveEnum({ citizen: "citizen", officer: "officer", admin: "admin" }, role) : "citizen";
        if (role && !resolvedRole) {
            return res.status(400).json({ success: false, message: `Invalid role: ${role}` });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            `INSERT INTO users (username, name, email, password_hash, phone, role, district)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [username, name, email, password_hash, phone || null, resolvedRole || "citizen", district || null]
        );

        res.json({ success: true, user_id: result.insertId });
    } catch (error) {
        console.error(error);
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ success: false, message: "Username or email already exists" });
        }
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ---------------- NOTIFICATIONS ----------------
app.get("/api/notifications", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM notifications ORDER BY created_at DESC");
        res.json({ success: true, notifications: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post("/api/notifications", async (req, res) => {
    try {
        const { user_id, title, message } = req.body;

        if (!user_id || !title || !message) {
            return res.status(400).json({ success: false, message: "user_id, title and message are required" });
        }

        const [result] = await pool.query(
            `INSERT INTO notifications (user_id, title, message)
             VALUES (?, ?, ?)`,
            [user_id, title, message]
        );

        res.json({ success: true, notification_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ---------------- START ----------------
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