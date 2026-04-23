-- PostgreSQL Script to Initialize Tables for AUMOVIO Counter Booking System

-- 1. Create Employees Table
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

-- 2. Create Time Slots Table
CREATE TABLE IF NOT EXISTS time_slots (
    slot_id SERIAL PRIMARY KEY,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    max_capacity INTEGER NOT NULL,
    curr_bookings INTEGER DEFAULT 0
);

-- 3. Create Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    per_no TEXT,
    slot_id INTEGER,
    PRIMARY KEY (per_no, slot_id),
    FOREIGN KEY (per_no) REFERENCES employees(per_no) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES time_slots(slot_id) ON DELETE CASCADE
);

-- 4. (Optional) Seed Initial Time Slots
-- This part adds a few sample slots if you want to test immediately.
-- Date is set to a placeholder; update as needed.
INSERT INTO time_slots (date, start_time, end_time, max_capacity) 
SELECT '2026-04-24', '09:00', '11:00', 5
WHERE NOT EXISTS (SELECT 1 FROM time_slots);

INSERT INTO time_slots (date, start_time, end_time, max_capacity) 
SELECT '2026-04-24', '11:00', '13:00', 5
WHERE NOT EXISTS (SELECT 1 FROM time_slots WHERE start_time = '11:00');

INSERT INTO time_slots (date, start_time, end_time, max_capacity) 
SELECT '2026-04-24', '14:00', '16:00', 5
WHERE NOT EXISTS (SELECT 1 FROM time_slots WHERE start_time = '14:00');
