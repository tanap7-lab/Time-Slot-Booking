<div align="center">
<img width="1200" height="475" alt="AUMOVIO Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AUMOVIO Counter Booking System

A premium, high-fidelity personnel and time-slot management system designed for seamless coordination of counter assignments and reservation windows. This application provides a robust interface for both administrators and employees to manage module access with precision.

## 🌟 Key Features

### For Employees
- **Personalized Dashboard**: Instant view of your assigned date and counter cluster.
- **Smart Reservations**: Dynamic time-slot selection based on real-time availability.
- **Calendar Integration**: One-click generation of `.ics` files to sync with Outlook, Google Calendar, or Apple Calendar.
- **Conflict Prevention**: Intelligent system rules that prevent double-booking and respect capacity limits.

### For Administrators
- **Comprehensive Dashboard**: Real-time analytics on employee count, slot utilization, and active bookings.
- **Excel Intelligence**: Bulk import employees from Excel with an advanced parsing engine that handles multiple date formats and header variations.
- **Slot Management**: Full control over time window creation, duration, and maximum capacity.
- **Operational Oversight**: View and manage all active allocations with the ability to override or cancel bookings if necessary.

## 📖 Key Terminology

- **Counter Cluster**: A designated group of counters (Modules) assigned to a specific set of personnel.
- **Module Access Window**: The specific 2-hour time slot reserved by an employee for their assigned counter.
- **Personnel Number (P-NO)**: The unique identifier for each employee used for secure portal access.

## 🛠️ Technology Stack

- **Frontend**: React 19 (Vite), Tailwind CSS 4, Framer Motion (Animations), Lucide-React (Icons).
- **Backend**: Express.js (Node.js).
- **Database**: PostgreSQL for high-performance, scalable, and robust persistent storage.
- **Data Processing**: SheetJS (`xlsx`) for industrial-grade Excel handling.

## 💻 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher.
- **Package Manager**: npm.

### Installation & Run
1. **Setup Dependencies**:
   ```bash
   npm install
   ```
2. **Environment Configuration**:
   Create a `.env` file in the root directory:
   ```env
   AdminID="admin"
   AdminPassword="password123"
   DATABASE_URL="postgresql://user:password@localhost:5432/booking_system"
   ```
3. **Launch the Portal**:
   ```bash
   npm run dev
   ```
   Access the application at: `http://localhost:3000`

## 🛡️ Security & Roles
- **Employee Access**: Authenticated via a combination of Personnel Number and Email.
- **Admin Terminal**: Protected by secure credentials defined in the environment variables. Default credentials for development are `admin` / `password123`.

---
© 2026 AUMOVIO SE. *Elevating coordination through precision.*
