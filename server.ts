import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import cors from "cors";
import "dotenv/config";

// Initialize Database
const db = new Database("booking_system.db");

// Schema Setup
db.exec(`
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
    slot_id INTEGER PRIMARY KEY AUTOINCREMENT,
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
const slotCount = db.prepare("SELECT count(*) as count FROM time_slots").get() as { count: number };
if (slotCount.count === 0) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split("T")[0];
  
  const insertSlot = db.prepare("INSERT INTO time_slots (date, start_time, end_time, max_capacity) VALUES (?, ?, ?, ?)");
  insertSlot.run(dateStr, "09:00", "11:00", 5);
  insertSlot.run(dateStr, "11:00", "13:00", 5);
  insertSlot.run(dateStr, "14:00", "16:00", 5);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- API Routes ---

  // Login
  app.post("/api/login", (req, res) => {
    const { per_no, email } = req.body;
    try {
      const employee = db.prepare("SELECT * FROM employees WHERE per_no = ? AND email = ?").get(per_no, email) as any;
      if (!employee) {
        return res.status(401).json({ error: "Invalid Credentials" });
      }
      res.json(employee);
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
  app.get("/api/employees", (req, res) => {
    const employees = db.prepare("SELECT * FROM employees").all();
    res.json(employees);
  });

  app.post("/api/employees", (req, res) => {
    const { per_no, gid, first_name, last_name, cost_center, department, email, assigned_date, counter_no } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO employees (per_no, gid, first_name, last_name, cost_center, department, email, assigned_date, counter_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
      stmt.run(per_no, gid, first_name, last_name, cost_center, department, email, assigned_date, counter_no);
      res.status(201).json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/employees/bulk", (req, res) => {
    const employees = req.body; // Expecting array
    const insert = db.prepare("INSERT OR REPLACE INTO employees (per_no, gid, first_name, last_name, cost_center, department, email, assigned_date, counter_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    const transaction = db.transaction((data: any[]) => {
      for (const emp of data) {
        try {
          insert.run(emp.per_no, emp.gid, emp.first_name, emp.last_name, emp.cost_center, emp.department, emp.email, emp.assigned_date, emp.counter_no);
        } catch (e: any) {
          console.error(`Error inserting employee ${emp.per_no}: ${e.message}`);
          throw e; // Rethrow to rollback transaction
        }
      }
    });

    try {
      transaction(employees);
      res.json({ success: true, count: employees.length });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch("/api/employees/:per_no", (req, res) => {
    const { per_no } = req.params;
    const { assigned_date, counter_no } = req.body;
    try {
      const stmt = db.prepare("UPDATE employees SET assigned_date = ?, counter_no = ? WHERE per_no = ?");
      const result = stmt.run(assigned_date, counter_no, per_no);
      if (result.changes === 0) return res.status(404).json({ error: "Employee not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Time Slots
  app.get("/api/slots", (req, res) => {
    const slots = db.prepare("SELECT * FROM time_slots").all();
    res.json(slots);
  });

  app.post("/api/slots", (req, res) => {
    const { date, start_time, end_time, max_capacity } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO time_slots (date, start_time, end_time, max_capacity) VALUES (?, ?, ?, ?)");
      stmt.run(date, start_time, end_time, max_capacity);
      res.status(201).json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch("/api/slots/:slot_id", (req, res) => {
    const { slot_id } = req.params;
    const { max_capacity } = req.body;
    try {
      const stmt = db.prepare("UPDATE time_slots SET max_capacity = ? WHERE slot_id = ?");
      const result = stmt.run(max_capacity, slot_id);
      if (result.changes === 0) return res.status(404).json({ error: "Slot not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Bookings
  app.post("/api/bookings", (req, res) => {
    const { per_no, slot_id } = req.body;
    const transaction = db.transaction(() => {
      // Check if employee exists
      const employee = db.prepare("SELECT * FROM employees WHERE per_no = ?").get(per_no);
      if (!employee) throw new Error("Employee not found");

      // Check slot capacity
      const slot = db.prepare("SELECT * FROM time_slots WHERE slot_id = ?").get(slot_id) as any;
      if (!slot) throw new Error("Slot not found");
      if (slot.curr_bookings >= slot.max_capacity) throw new Error("Slot is full");

      // Strict Rule: One booking per employee
      const existingAny = db.prepare("SELECT * FROM bookings WHERE per_no = ?").get(per_no);
      if (existingAny) throw new Error("Employee already has an active booking. Please cancel it first.");

      // Record booking
      db.prepare("INSERT INTO bookings (per_no, slot_id) VALUES (?, ?)").run(per_no, slot_id);
      db.prepare("UPDATE time_slots SET curr_bookings = curr_bookings + 1 WHERE slot_id = ?").run(slot_id);
    });

    try {
      transaction();
      res.status(201).json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/bookings/cancel", (req, res) => {
    const { per_no, slot_id } = req.body;
    const transaction = db.transaction(() => {
      const existing = db.prepare("SELECT * FROM bookings WHERE per_no = ? AND slot_id = ?").get(per_no, slot_id);
      if (!existing) throw new Error("Booking not found");

      db.prepare("DELETE FROM bookings WHERE per_no = ? AND slot_id = ?").run(per_no, slot_id);
      db.prepare("UPDATE time_slots SET curr_bookings = curr_bookings - 1 WHERE slot_id = ?").run(slot_id);
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/bookings", (req, res) => {
    const bookings = db.prepare(`
      SELECT b.*, e.first_name, e.last_name, s.date, s.start_time, s.end_time 
      FROM bookings b
      JOIN employees e ON b.per_no = e.per_no
      JOIN time_slots s ON b.slot_id = s.slot_id
    `).all();
    res.json(bookings);
  });

  app.delete("/api/employees/:per_no", (req, res) => {
    const { per_no } = req.params;
    try {
      db.prepare("DELETE FROM employees WHERE per_no = ?").run(per_no);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/slots/:slot_id", (req, res) => {
    const { slot_id } = req.params;
    const transaction = db.transaction(() => {
      db.prepare("DELETE FROM bookings WHERE slot_id = ?").run(slot_id);
      db.prepare("DELETE FROM time_slots WHERE slot_id = ?").run(slot_id);
    });
    try {
      transaction();
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
