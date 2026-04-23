import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Pool } from "pg";
import cors from "cors";
import "dotenv/config";

// Initialize Database Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDB() {
  const client = await pool.connect();
  try {
    // Schema Setup
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        per_no TEXT PRIMARY KEY,
        gid TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        cost_center TEXT NOT NULL,
        department TEXT NOT NULL,
        email TEXT NOT NULL,
        assigned_date TEXT NOT NULL,
        counter_no INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS time_slots (
        slot_id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        max_capacity INTEGER NOT NULL,
        curr_bookings INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS bookings (
        per_no TEXT,
        slot_id INTEGER,
        PRIMARY KEY (per_no, slot_id),
        FOREIGN KEY (per_no) REFERENCES employees(per_no),
        FOREIGN KEY (slot_id) REFERENCES time_slots(slot_id)
      );
    `);

    // Seed some time slots if empty
    const { rows } = await client.query("SELECT count(*) as count FROM time_slots");
    if (parseInt(rows[0].count) === 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split("T")[0];
      
      const insertSlotQuery = "INSERT INTO time_slots (date, start_time, end_time, max_capacity) VALUES ($1, $2, $3, $4)";
      await client.query(insertSlotQuery, [dateStr, "09:00", "11:00", 5]);
      await client.query(insertSlotQuery, [dateStr, "11:00", "13:00", 5]);
      await client.query(insertSlotQuery, [dateStr, "14:00", "16:00", 5]);
    }
  } finally {
    client.release();
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  // Wait for DB initialization
  try {
    await initDB();
    console.log("Database initialized successfully.");
  } catch (err) {
    console.error("Database initialization failed:", err);
  }

  // --- API Routes ---

  // Login
  app.post("/api/login", async (req, res) => {
    let { per_no, email } = req.body;
    per_no = String(per_no || "").trim();
    email = String(email || "").trim();
    
    try {
      const { rows } = await pool.query(
        "SELECT * FROM employees WHERE LOWER(TRIM(per_no)) = LOWER($1) AND LOWER(TRIM(email)) = LOWER($2)",
        [per_no, email]
      );
      if (rows.length === 0) {
        return res.status(401).json({ error: "Invalid Credentials" });
      }
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Login
  app.post("/api/admin/login", (req, res) => {
    const { id, password } = req.body;
    const adminId = process.env.AdminID || "admin";
    const adminPassword = process.env.AdminPassword || "password123";

    if (id === adminId && password === adminPassword) {
      res.json({ success: true, role: "admin" });
    } else {
      res.status(401).json({ error: "Invalid Admin Credentials" });
    }
  });

  // Employees
  app.get("/api/employees", async (req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM employees");
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/employees", async (req, res) => {
    const { per_no, gid, first_name, last_name, cost_center, department, email, assigned_date, counter_no } = req.body;
    try {
      await pool.query(
        "INSERT INTO employees (per_no, gid, first_name, last_name, cost_center, department, email, assigned_date, counter_no) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [per_no, gid, first_name, last_name, cost_center, department, email, assigned_date, counter_no]
      );
      res.status(201).json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/employees/bulk", async (req, res) => {
    const employees = req.body; // Expecting array
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const insertQuery = `
        INSERT INTO employees (per_no, gid, first_name, last_name, cost_center, department, email, assigned_date, counter_no) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (per_no) DO UPDATE SET 
          gid = EXCLUDED.gid,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          cost_center = EXCLUDED.cost_center,
          department = EXCLUDED.department,
          email = EXCLUDED.email,
          assigned_date = EXCLUDED.assigned_date,
          counter_no = EXCLUDED.counter_no
      `;

      for (const emp of employees) {
        await client.query(insertQuery, [emp.per_no, emp.gid, emp.first_name, emp.last_name, emp.cost_center, emp.department, emp.email, emp.assigned_date, emp.counter_no]);
      }
      
      await client.query('COMMIT');
      res.json({ success: true, count: employees.length });
    } catch (err: any) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.patch("/api/employees/:per_no", async (req, res) => {
    const { per_no } = req.params;
    const { assigned_date, counter_no } = req.body;
    try {
      const result = await pool.query(
        "UPDATE employees SET assigned_date = $1, counter_no = $2 WHERE per_no = $3",
        [assigned_date, counter_no, per_no]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: "Employee not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Time Slots
  app.get("/api/slots", async (req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM time_slots");
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/slots", async (req, res) => {
    const { date, start_time, end_time, max_capacity } = req.body;
    try {
      await pool.query(
        "INSERT INTO time_slots (date, start_time, end_time, max_capacity) VALUES ($1, $2, $3, $4)",
        [date, start_time, end_time, max_capacity]
      );
      res.status(201).json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch("/api/slots/:slot_id", async (req, res) => {
    const { slot_id } = req.params;
    const { max_capacity } = req.body;
    try {
      const result = await pool.query(
        "UPDATE time_slots SET max_capacity = $1 WHERE slot_id = $2",
        [max_capacity, slot_id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: "Slot not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Bookings
  app.post("/api/bookings", async (req, res) => {
    let { per_no, slot_id } = req.body;
    per_no = String(per_no || "").trim();

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if employee exists
      const empResult = await client.query("SELECT * FROM employees WHERE LOWER(TRIM(per_no)) = LOWER($1)", [per_no]);
      if (empResult.rows.length === 0) throw new Error("Employee not found");
      const dbPerNo = empResult.rows[0].per_no;

      // Check slot capacity
      const slotResult = await client.query("SELECT * FROM time_slots WHERE slot_id = $1", [slot_id]);
      if (slotResult.rows.length === 0) throw new Error("Slot not found");
      const slot = slotResult.rows[0];
      if (slot.curr_bookings >= slot.max_capacity) throw new Error("Slot is full");

      // Strict Rule: One booking per employee
      const existingAny = await client.query("SELECT * FROM bookings WHERE LOWER(TRIM(per_no)) = LOWER($1)", [dbPerNo]);
      if (existingAny.rows.length > 0) throw new Error("Employee already has an active booking. Please cancel it first.");

      // Record booking
      await client.query("INSERT INTO bookings (per_no, slot_id) VALUES ($1, $2)", [dbPerNo, slot_id]);
      await client.query("UPDATE time_slots SET curr_bookings = curr_bookings + 1 WHERE slot_id = $1", [slot_id]);

      await client.query('COMMIT');
      res.status(201).json({ success: true });
    } catch (err: any) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.post("/api/bookings/cancel", async (req, res) => {
    let { per_no, slot_id } = req.body;
    per_no = String(per_no || "").trim();
    console.log(`[CANCEL] Attempting for per_no: ${per_no}, param slot_id: ${slot_id}`);
    
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      
      // Find the booking for this employee
      const existingRes = await client.query("SELECT * FROM bookings WHERE LOWER(TRIM(per_no)) = LOWER($1)", [per_no]);
      
      if (existingRes.rows.length === 0) {
        console.warn(`[CANCEL] No booking found in DB for per_no: ${per_no}`);
        throw new Error("No active booking found for this employee.");
      }
      
      const existing = existingRes.rows[0];
      console.log(`[CANCEL] Found booking for slot_id: ${existing.slot_id}`);

      // Delete the booking
      await client.query("DELETE FROM bookings WHERE LOWER(TRIM(per_no)) = LOWER($1)", [per_no]);
      
      // Update slot occupancy
      await client.query("UPDATE time_slots SET curr_bookings = GREATEST(0, curr_bookings - 1) WHERE slot_id = $1", [existing.slot_id]);

      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error(`[CANCEL] Error: ${err.message}`);
      res.status(400).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.get("/api/bookings", async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT b.*, e.first_name, e.last_name, s.date, s.start_time, s.end_time 
        FROM bookings b
        JOIN employees e ON b.per_no = e.per_no
        JOIN time_slots s ON b.slot_id = s.slot_id
      `);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/employees/:per_no", async (req, res) => {
    const { per_no } = req.params;
    try {
      await pool.query("DELETE FROM employees WHERE per_no = $1", [per_no]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/slots/:slot_id", async (req, res) => {
    const { slot_id } = req.params;
    try {
      const bookingsCountRes = await pool.query("SELECT count(*) as count FROM bookings WHERE slot_id = $1", [slot_id]);
      if (parseInt(bookingsCountRes.rows[0].count) > 0) {
        return res.status(400).json({ error: "Cannot delete slot with existing reservations. Please cancel all bookings first." });
      }
      
      await pool.query("DELETE FROM time_slots WHERE slot_id = $1", [slot_id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Vite Middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
