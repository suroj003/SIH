require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;

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

        const [result] = await pool.query(
            `INSERT INTO projects (project_name, description, department, district, state, target_date, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [project_name, description, department, district, state, target_date, status || "planned"]
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

app.patch("/api/cases/:id/status", async (req, res) => {
    try {
        const { status } = req.body;

        await pool.query(
            "UPDATE acquisition_cases SET status = ? WHERE case_id = ?",
            [status, req.params.id]
        );

        res.json({ success: true, message: "Status updated" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
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

app.post("/api/compensation", async (req, res) => {
    try {
        const { case_id, assessed_amount, approved_amount, paid_amount, payment_status } = req.body;

        const [result] = await pool.query(
            `INSERT INTO compensation (case_id, assessed_amount, approved_amount, paid_amount, payment_status)
             VALUES (?, ?, ?, ?, ?)`,
            [case_id, assessed_amount || 0, approved_amount || 0, paid_amount || 0, payment_status || "pending"]
        );

        res.json({ success: true, compensation_id: result.insertId });
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
        const { grievance_number, case_id, citizen_id, category, subject, description } = req.body;

        const [result] = await pool.query(
            `INSERT INTO grievances (grievance_number, case_id, citizen_id, category, subject, description)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [grievance_number, case_id, citizen_id, category, subject, description]
        );

        res.json({ success: true, grievance_id: result.insertId });
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

        const [result] = await pool.query(
            `INSERT INTO documents (case_id, uploaded_by, document_type, file_name, file_url)
             VALUES (?, ?, ?, ?, ?)`,
            [case_id, uploaded_by, document_type, file_name, file_url]
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
            "SELECT user_id, username, name, email, phone, role, district FROM users ORDER BY created_at DESC"
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
        const password_hash = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            `INSERT INTO users (username, name, email, password_hash, phone, role, district)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [username, name, email, password_hash, phone, role || "citizen", district]
        );

        res.json({ success: true, user_id: result.insertId });
    } catch (error) {
        console.error(error);
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

// ---------------- START ----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});