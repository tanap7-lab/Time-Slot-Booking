import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Calendar,
  Clock,
  LayoutDashboard,
  Plus,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Hash,
  Mail,
  Loader2,
  ChevronRight,
  Upload,
  Save,
  Edit2,
  X,
  PlusCircle,
  FileSpreadsheet,
  Trash2,
  Eye,
  UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import { Employee, TimeSlot, Booking } from "./types";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "employees", label: "Employees", icon: Users },
  { id: "slots", label: "Time Slots", icon: Clock },
  { id: "bookings", label: "Bookings", icon: Calendar },
] as const;

type TabId = (typeof TABS)[number]["id"];

// --- UTILITIES ---
const generateICS = (startTime: string, endTime: string, date: string, counterNumber: number, location: string) => {
  const formatDate = (dateStr: string, timeStr: string) => {
    // dateStr: YYYY-MM-DD
    // timeStr: HH:MM
    const cleanDate = dateStr.replace(/-/g, "");
    const cleanTime = timeStr.replace(/:/g, "") + "00";
    return `${cleanDate}T${cleanTime}`;
  };

  const startUtc = formatDate(date, startTime);
  const endUtc = formatDate(date, endTime);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aumovio//Reservation System//EN",
    "BEGIN:VEVENT",
    `SUMMARY:Counter Reservation: ${counterNumber}`,
    `DESCRIPTION:Your reservation at ${counterNumber} is confirmed.`,
    `LOCATION:${location}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
};

const AumovioLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 45 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M37.9459 18.2822C36.5538 16.1482 34.8357 15.2887 33.0883 15.2887C26.2464 15.2887 14.9616 30.6712 3.79534 30.6712C1.60355 30.6712 0.833466 30.0785 0.833466 28.8633C0.833466 28.3298 0.981559 27.9148 1.27775 27.4406L16.5906 3.25529C17.3904 1.98082 18.3085 1.32877 19.3156 1.32877C20.4411 1.32877 21.3593 2.15865 22.0109 3.72951L29.3563 21.4536C31.4 26.344 34.5101 30.6712 38.9231 30.6712H42.6552C43.8399 30.6712 44.5212 29.7524 44.5212 28.8633C44.5212 28.5965 44.4618 28.3298 44.3138 28.0927L37.9459 18.2822Z" fill="#FF4208" />
  </svg>
);

export default function App() {
  const [view, setView] = useState<"login" | "admin" | "employee">("login");
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Login form
  const [loginCreds, setLoginCreds] = useState({ per_no: "", email: "" });
  const [adminCreds, setAdminCreds] = useState({ id: "", password: "" });
  const [loginError, setLoginError] = useState<string | null>(null);

  // Edit states
  const [editingEmp, setEditingEmp] = useState<string | null>(null);
  const [empEditData, setEmpEditData] = useState<{ assigned_date: string; counter_no: number } | null>(null);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [slotEditData, setSlotEditData] = useState<{ max_capacity: number } | null>(null);

  // Form states
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({});
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [newSlot, setNewSlot] = useState({ date: "", start_time: "", end_time: "", max_capacity: 5 });
  const [importDateFormat, setImportDateFormat] = useState<"UK" | "US">("UK");
  const [empFilters, setEmpFilters] = useState({
    per_no: "",
    name: "",
    department: "",
    counter_no: "",
    email: ""
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: "", onConfirm: () => { } });

  const confirmAction = (message: string, onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, message, onConfirm });
  };

  const renderConfirmModal = () => {
    if (!confirmDialog.isOpen) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}></div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 relative z-10 border border-slate-100"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-brand-dark">Confirm Action</h3>
          </div>
          <p className="text-brand-muted mb-8 text-sm">{confirmDialog.message}</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
              className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
              }}
              className="px-6 py-2.5 rounded-xl font-bold bg-red-600 text-white shadow-md shadow-red-600/20 hover:bg-red-700 transition-colors"
            >
              Proceed
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, slotRes, bookRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/slots"),
        fetch("/api/bookings")
      ]);

      const [empData, slotData, bookData] = await Promise.all([
        empRes.json(),
        slotRes.json(),
        bookRes.json()
      ]);

      setEmployees(empData);
      setSlots(slotData);
      setBookings(bookData);
    } catch (err) {
      setError("Failed to fetch data. Please ensure the server is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginCreds),
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
        setView("employee");
      } else {
        setLoginError("Invalid Credentials");
      }
    } catch (err) {
      setLoginError("Server error. Try again.");
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adminCreds),
      });
      if (res.ok) {
        setIsAdminLoggedIn(true);
        setView("admin");
      } else {
        setLoginError("Invalid Admin Credentials");
      }
    } catch (err) {
      setLoginError("Server error. Try again.");
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAdminLoggedIn(false);
    setView("login");
    setLoginCreds({ per_no: "", email: "" });
    setAdminCreds({ id: "", password: "" });
  };

  const handleCancelBooking = async (slot_id: number) => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ per_no: currentUser.per_no, slot_id }),
      });
      if (res.ok) {
        fetchData();
        alert("Booking cancelled. Please remember to remove the event from your personal calendar if you previously added it.");
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      alert("Error canceling booking");
    }
  };

  const handleAdminCancel = (per_no: string, slot_id: number) => {
    confirmAction("Are you sure you want to remove this reservation? This will free up space in the time slot.", async () => {
      try {
        const res = await fetch("/api/bookings/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ per_no, slot_id }),
        });
        if (res.ok) {
          fetchData();
        } else {
          const data = await res.json();
          alert(data.error || "Failed to cancel allocation");
        }
      } catch (err) {
        alert("Error canceling booking");
      }
    });
  };

  const handleDeleteEmployee = (per_no: string) => {
    confirmAction("Delete this personnel record permanently?", async () => {
      try {
        const res = await fetch(`/api/employees/${per_no}`, { method: "DELETE" });
        if (res.ok) {
          fetchData();
          setEditingEmp(null);
        } else {
          const data = await res.json();
          alert(data.error);
        }
      } catch (err) {
        alert("Error deleting employee");
      }
    });
  };

  const handleDeleteSlot = (slot_id: number) => {
    confirmAction("Delete this time slot? This can only be done if there are no active reservations.", async () => {
      try {
        const res = await fetch(`/api/slots/${slot_id}`, { method: "DELETE" });
        if (res.ok) {
          fetchData();
          setSelectedSlot(null);
        } else {
          const data = await res.json();
          alert(data.error);
        }
      } catch (err) {
        alert("Error deleting slot");
      }
    });
  };

  const handleEmployeeBooking = async (slot_id: number) => {
    if (!currentUser) return;
    const slot = slots.find(s => s.slot_id === slot_id);
    if (!slot) return;

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ per_no: currentUser.per_no, slot_id }),
      });
      if (res.ok) {
        fetchData();

        // Generate and download ICS
        const icsContent = generateICS(
          slot.start_time,
          slot.end_time,
          currentUser.assigned_date,
          currentUser.counter_no,
          "AUMOVIO Module Area"
        );

        const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "counter-reservation.ics");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        alert("Booking confirmed! Your calendar file has been downloaded.");
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      alert("Error making booking");
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const employeeData = {
      ...newEmployee,
      per_no: String(newEmployee.per_no || "").trim(),
      email: String(newEmployee.email || "").trim(),
    };
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employeeData),
      });
      if (res.ok) {
        setNewEmployee({});
        fetchData();
        setActiveTab("employees");
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      alert("Error creating employee");
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !selectedEmployee) return;

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ per_no: selectedEmployee, slot_id: selectedSlot }),
      });
      if (res.ok) {
        setSelectedSlot(null);
        setSelectedEmployee("");
        fetchData();
        setActiveTab("bookings");
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      alert("Error making booking");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const wb = XLSX.read(buffer, { type: "array", cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        console.log("Parsed Excel Raw Data:", data);

        // Map Excel headers to DB fields
        const mappedData = data.map(row => {
          // Robust date parsing from Excel
          let assignedDate = "";
          const rawDate = row["Date"] || row["Assigned Date"] || row["DATE"] || "";

          if (rawDate instanceof Date) {
            assignedDate = rawDate.toISOString().split("T")[0];
          } else if (typeof rawDate === "string" && rawDate.trim() !== "") {
            // Check if it's the 08/05/2026 format (UK or US)
            if (rawDate.includes("/")) {
              const parts = rawDate.split("/");
              if (parts.length === 3) {
                let day, month, year;
                if (importDateFormat === "UK") {
                  // DD/MM/YYYY
                  day = parts[0].padStart(2, "0");
                  month = parts[1].padStart(2, "0");
                } else {
                  // MM/DD/YYYY
                  month = parts[0].padStart(2, "0");
                  day = parts[1].padStart(2, "0");
                }
                year = parts[2];
                // Ensure 4-digit year
                if (year.length === 2) year = "20" + year;
                assignedDate = `${year}-${month}-${day}`;
              }
            } else {
              // Handle "8th May 2026" or "5th May 2026"
              // Remove ordinal suffixes (st, nd, rd, th) to make it standard-readable
              const cleanDateStr = rawDate.replace(/(\d+)(st|nd|rd|th)/, "$1");
              const d = new Date(cleanDateStr);
              if (!isNaN(d.getTime())) {
                assignedDate = d.toISOString().split("T")[0];
              } else {
                assignedDate = rawDate; // Fallback to raw string if it fails
              }
            }
          }

          // Handle "Counter 4" -> 4
          const rawCounter = row["Counter Number"] || row["Counter"] || row["COUNTER"] || "";
          let counterNo = 0;
          if (typeof rawCounter === "string") {
            const match = rawCounter.match(/\d+/);
            if (match) counterNo = parseInt(match[0]);
          } else if (typeof rawCounter === "number") {
            counterNo = rawCounter;
          }

          return {
            per_no: String(row["Personnel Number"] || row["P-NO"] || row["Personnel No"] || row["Personnel-Number"] || "").trim(),
            gid: String(row["GID"] || row["G-ID"] || "").trim(),
            first_name: String(row["First Name"] || row["FIRST NAME"] || ""),
            last_name: String(row["Last Name"] || row["LAST NAME"] || ""),
            cost_center: String(row["Cost Center"] || row["COST CENTER"] || row["Cost Cente"] || ""),
            department: String(row["Department"] || row["DEPARTMENT"] || row["Departmen"] || ""),
            email: String(row["Email Address"] || row["Email"] || row["EMAIL"] || ""),
            assigned_date: assignedDate,
            counter_no: counterNo
          };
        }).filter(emp => emp.per_no && emp.per_no !== "undefined" && emp.per_no !== "");

        if (mappedData.length === 0) {
          alert("No valid employee data found in Excel. Check if headers match: 'Personnel Number', 'GID', 'First Name', 'Last Name', etc.");
          return;
        }

        setLoading(true);
        const res = await fetch("/api/employees/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mappedData),
        });

        if (res.ok) {
          alert(`Successfully imported ${mappedData.length} personnel records.`);
          fetchData();
        } else {
          const err = await res.json();
          alert("Import failed: " + err.error);
        }
      } catch (err) {
        console.error("Excel processing error:", err);
        alert("Error parsing Excel file. Ensure it is a valid .xlsx or .xls file.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpdateEmployee = async (per_no: string) => {
    if (!empEditData) return;
    try {
      const res = await fetch(`/api/employees/${per_no}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(empEditData),
      });
      if (res.ok) {
        setEditingEmp(null);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      alert("Error updating employee");
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSlot),
      });
      if (res.ok) {
        setNewSlot({ date: "", start_time: "", end_time: "", max_capacity: 5 });
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      alert("Error creating slot");
    }
  };

  const handleUpdateSlotCapacity = async (slot_id: number) => {
    if (!slotEditData) return;
    try {
      const res = await fetch(`/api/slots/${slot_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slotEditData),
      });
      if (res.ok) {
        setEditingSlot(null);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      alert("Error updating slot");
    }
  };

  if (loading && employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900 font-sans">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <p className="text-sm font-medium tracking-tight animate-pulse">Initializing System...</p>
      </div>
    );
  }

  // --- LOGIN VIEW ---
  if (view === "login") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 p-12 border border-slate-100"
        >
          <div className="text-center mb-10">
            <div className="flex items-center justify-center mb-6">
              <AumovioLogo className="w-16 h-12 drop-shadow-xl" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-brand-dark mb-2">AUMOVIO Portal</h2>
            <p className="text-sm text-brand-muted font-medium">Identify yourself to manage your booking</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest ml-1">Personnel Number</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                <input
                  required
                  placeholder="P-001"
                  className="w-full bg-brand-bg border-none rounded-xl pl-12 pr-4 py-4 text-sm font-semibold focus:ring-2 focus:ring-brand-primary transition-all"
                  value={loginCreds.per_no}
                  onChange={e => setLoginCreds({ ...loginCreds, per_no: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                <input
                  required
                  type="email"
                  placeholder="name@company.com"
                  className="w-full bg-brand-bg border-none rounded-xl pl-12 pr-4 py-4 text-sm font-semibold focus:ring-2 focus:ring-brand-primary transition-all"
                  value={loginCreds.email}
                  onChange={e => setLoginCreds({ ...loginCreds, email: e.target.value })}
                />
              </div>
            </div>

            {loginError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100"
              >
                <AlertCircle className="w-4 h-4" />
                {loginError}
              </motion.div>
            )}

            <button
              type="submit"
              className="w-full bg-brand-dark text-white rounded-xl py-5 font-bold hover:bg-brand-primary transition-all transform active:scale-[0.98] shadow-xl shadow-slate-200/50"
            >
              Access Account
            </button>
          </form>

          <button
            onClick={() => setView("admin")}
            className="w-full mt-8 text-[10px] font-bold text-brand-muted uppercase tracking-widest hover:text-brand-primary transition-colors"
          >
            Administrator Login
          </button>
        </motion.div>
      </div>
    );
  }

  // --- EMPLOYEE VIEW ---
  if (view === "employee" && currentUser) {
    const userBooking = bookings.find(b => b.per_no === currentUser.per_no);
    const availableSlots = slots.filter(s => s.date === currentUser.assigned_date);

    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        {renderConfirmModal()}
        <header className="bg-white border-b border-slate-100 px-10 py-6 sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <AumovioLogo className="w-10 h-8" />
            <div>
              <h2 className="text-xl font-bold text-brand-dark leading-none">Welcome, {currentUser.first_name}</h2>
              <p className="text-[10px] text-brand-muted font-bold uppercase tracking-widest mt-1">AUMOVIO / {currentUser.per_no}</p>
            </div>
          </div>
          <button onClick={logout} className="p-2 text-brand-muted hover:text-brand-primary transition-colors">
            <X className="w-6 h-6" />
          </button>
        </header>

        <main className="max-w-4xl mx-auto p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div>
                <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-1">Assigned Date</p>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-brand-primary" />
                  <span className="text-xl font-bold text-brand-dark">{currentUser.assigned_date}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-50">
                <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-1">Counter Cluster</p>
                <div className="flex items-center gap-3">
                  <Hash className="w-5 h-5 text-brand-primary" />
                  <span className="text-xl font-bold text-brand-dark">Module #{currentUser.counter_no}</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-300 font-medium">* Fields above are read-only and managed by administration.</p>
            </div>

            <div className="bg-brand-dark rounded-2xl p-8 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 transform group-hover:scale-110 transition-transform duration-500">
                <CheckCircle2 className="w-24 h-24" />
              </div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-brand-primary uppercase mb-4">Current Reservation</p>
              {userBooking ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-3xl font-bold text-white">{userBooking.start_time} - {userBooking.end_time}</h3>
                    <p className="text-sm text-slate-400 font-medium">Slot ID: {userBooking.slot_id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        confirmAction("Are you sure you want to cancel your current booking? This action cannot be undone.", () => {
                          handleCancelBooking(userBooking.slot_id);
                        });
                      }}
                      className="bg-white text-brand-dark px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-brand-primary hover:text-white transition-all underline decoration-brand-primary underline-offset-4 decoration-2"
                    >
                      Cancel Booking
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col justify-center">
                  <p className="text-lg font-light text-slate-400 mb-6">You haven't reserved a time slot for your assigned date yet.</p>
                  <div className="flex items-center gap-2 text-brand-primary">
                    <Plus className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-widest">Select a slot below</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-2xl font-bold flex items-center gap-3">
              Available Slots <span className="text-brand-primary font-bold bg-brand-bg px-3 py-1 rounded-full text-sm">{currentUser.assigned_date}</span>
            </h3>

            <div className="grid grid-cols-1 gap-4">
              {availableSlots.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center">
                  <p className="text-sm text-brand-muted font-medium">No slots have been configured for your assigned date yet.</p>
                </div>
              ) : (
                availableSlots.map(slot => {
                  const isFull = slot.curr_bookings >= slot.max_capacity;
                  const isBookedByMe = userBooking?.slot_id === slot.slot_id;

                  return (
                    <div
                      key={slot.slot_id}
                      className={`bg-white p-8 rounded-2xl border-2 transition-all flex items-center justify-between ${isBookedByMe ? "border-brand-primary shadow-md" : "border-slate-100"
                        } ${isFull && !isBookedByMe ? "opacity-60 grayscale" : ""}`}
                    >
                      <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${isBookedByMe ? "bg-brand-primary text-white" : "bg-brand-bg text-brand-muted"}`}>
                          <Clock className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-brand-dark">{slot.start_time} - {slot.end_time}</p>
                          <div className="flex items-center gap-8">
                            <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest flex items-center gap-2">
                              <span className="w-4 h-[1px] bg-brand-primary" />
                              Available Slots
                            </p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isFull ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                              {isFull ? "CAPACITY REACHED" : `${slot.max_capacity - slot.curr_bookings} SPOTS LEFT`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isBookedByMe ? (
                        <div className="bg-emerald-50 text-emerald-600 p-3 rounded-full">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                      ) : (
                        <button
                          disabled={isFull || !!userBooking}
                          onClick={() => handleEmployeeBooking(slot.slot_id)}
                          className={`px-8 py-3 rounded-xl text-xs font-bold transition-all ${isFull ? "bg-slate-100 text-brand-muted cursor-not-allowed" :
                              userBooking ? "bg-slate-50 text-slate-300 cursor-not-allowed" :
                                "bg-brand-dark text-white hover:bg-brand-primary shadow-lg shadow-brand-primary/10"
                            }`}
                        >
                          {isFull ? "Slot Full" : userBooking ? "Reserved" : "Reserve Slot"}
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </main>

        <footer className="mt-20 py-10 text-center border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">AUMOVIO Management System v2.0</p>
        </footer>
      </div>
    )
  }

  // --- ADMIN VIEW ---
  if (view === "admin" && !isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center p-6 font-sans">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-12 border border-white/10"
        >
          <div className="text-center mb-10">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-brand-dark p-4 rounded-2xl">
                <AumovioLogo className="w-12 h-10" />
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-brand-dark mb-2">Admin Terminal</h2>
            <p className="text-sm text-brand-muted font-medium">Authorized Personnel Access Only</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest ml-1">Admin Identifier</label>
              <div className="relative">
                <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                <input
                  required
                  placeholder="ID-ADMIN"
                  className="w-full bg-brand-bg border-none rounded-xl pl-12 pr-4 py-4 text-sm font-semibold focus:ring-2 focus:ring-brand-primary transition-all"
                  value={adminCreds.id}
                  onChange={e => setAdminCreds({ ...adminCreds, id: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest ml-1">Security Key</label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-brand-bg border-none rounded-xl pl-12 pr-4 py-4 text-sm font-semibold focus:ring-2 focus:ring-brand-primary transition-all"
                  value={adminCreds.password}
                  onChange={e => setAdminCreds({ ...adminCreds, password: e.target.value })}
                />
              </div>
            </div>

            {loginError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100"
              >
                <AlertCircle className="w-4 h-4" />
                {loginError}
              </motion.div>
            )}

            <button
              type="submit"
              className="w-full bg-brand-dark text-white rounded-xl py-5 font-bold hover:bg-brand-primary transition-all transform active:scale-[0.98] shadow-xl shadow-slate-200/50"
            >
              Initialize Command
            </button>
          </form>

          <button
            onClick={() => setView("login")}
            className="w-full mt-8 text-[10px] font-bold text-brand-muted uppercase tracking-widest hover:text-brand-dark transition-colors"
          >
            Back to Personnel Portal
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white text-slate-900 font-sans overflow-hidden">
      {renderConfirmModal()}
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-100 flex flex-col bg-white shrink-0">
        <div className="p-8 flex items-center justify-between border-b border-slate-50">
          <div className="flex items-center gap-3">
            <AumovioLogo className="w-8 h-6" />
            <h1 className="font-bold text-lg tracking-tight text-brand-dark">AUMOVIO</h1>
          </div>
          <button onClick={logout} className="p-1 text-brand-muted hover:text-brand-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${activeTab === tab.id
                  ? "bg-brand-bg text-brand-primary border-r-2 border-brand-primary rounded-r-none"
                  : "text-brand-muted hover:bg-slate-50 hover:text-brand-dark"
                }`}
            >
              <tab.icon className={`w-5 h-5 transition-transform duration-200 ${activeTab === tab.id ? "scale-110" : "group-hover:scale-110"}`} />
              <span className="text-sm font-semibold">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-slate-50">
          <div className="bg-brand-bg p-4 rounded-xl">
            <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-1">System Status</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-brand-muted">Online</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-brand-bg/50">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-10 py-6">
          <div className="space-y-0.5">
            <h2 className="text-2xl font-bold tracking-tight text-brand-dark capitalize">
              {activeTab} Overview
            </h2>
            <p className="text-[10px] font-bold text-brand-muted font-mono tracking-widest uppercase">
              // LOG_PATH: {activeTab.toUpperCase()}
            </p>
          </div>
        </header>

        <div className="p-10 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                <div className="col-span-3 mb-4">
                  <h3 className="text-lg font-bold text-brand-dark flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-brand-primary" />
                    Key Performance Indicators
                  </h3>
                </div>

                {[
                  { label: "Total Personnel", value: employees.length, icon: Users, color: "orange" },
                  { label: "Available Slots", value: slots.filter(s => s.curr_bookings < s.max_capacity).length, icon: Clock, color: "emerald" },
                  { label: "Active Bookings", value: bookings.length, icon: Calendar, color: "indigo" },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
                    <div className={`w-12 h-12 ${stat.color === 'orange' ? 'bg-brand-bg' : `bg-${stat.color}-50`} rounded-xl flex items-center justify-center`}>
                      <stat.icon className={`w-6 h-6 ${stat.color === 'orange' ? 'text-brand-primary' : `text-${stat.color}-600`}`} />
                    </div>
                    <div>
                      <p className="text-4xl font-bold tracking-tighter text-brand-dark mb-1">{stat.value}</p>
                      <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === "employees" && (
              <motion.div
                key="employees"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Employee Registration Form */}
                <div className="bg-white p-10 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-brand-dark">
                      <Plus className="w-6 h-6 text-brand-primary" />
                      Register New Personnel
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          onClick={() => setImportDateFormat("UK")}
                          className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${importDateFormat === "UK" ? "bg-white text-brand-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                            }`}
                        >
                          UK (DD/MM)
                        </button>
                        <button
                          onClick={() => setImportDateFormat("US")}
                          className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${importDateFormat === "US" ? "bg-white text-brand-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                            }`}
                        >
                          US (MM/DD)
                        </button>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".xlsx, .xls"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-bg text-brand-primary rounded-xl text-xs font-bold hover:brightness-95 transition-all border border-brand-primary/10"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Import Excel
                      </button>
                    </div>
                  </div>
                  <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest ml-1">Personnel Number</label>
                      <input
                        required
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary transition-all"
                        placeholder="P-001"
                        value={newEmployee.per_no || ""}
                        onChange={e => setNewEmployee({ ...newEmployee, per_no: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest ml-1">GID Identifier</label>
                      <input
                        required
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary transition-all font-mono"
                        placeholder="GID-123"
                        value={newEmployee.gid || ""}
                        onChange={e => setNewEmployee({ ...newEmployee, gid: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest ml-1">First Name</label>
                      <input
                        required
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary transition-all"
                        placeholder="John"
                        value={newEmployee.first_name || ""}
                        onChange={e => setNewEmployee({ ...newEmployee, first_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest ml-1">Last Name</label>
                      <input
                        required
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary transition-all"
                        placeholder="Doe"
                        value={newEmployee.last_name || ""}
                        onChange={e => setNewEmployee({ ...newEmployee, last_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest ml-1">Department</label>
                      <input
                        required
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary transition-all"
                        placeholder="Human Resources"
                        value={newEmployee.department || ""}
                        onChange={e => setNewEmployee({ ...newEmployee, department: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest ml-1">Cost Center</label>
                      <input
                        required
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary transition-all"
                        placeholder="CC-900"
                        value={newEmployee.cost_center || ""}
                        onChange={e => setNewEmployee({ ...newEmployee, cost_center: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest ml-1">Email Address</label>
                      <input
                        required
                        type="email"
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary transition-all"
                        placeholder="john.doe@aumovio.com"
                        value={newEmployee.email || ""}
                        onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest ml-1">Assigned Counter</label>
                      <input
                        required
                        type="number"
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary transition-all"
                        placeholder="1"
                        value={newEmployee.counter_no || ""}
                        onChange={e => setNewEmployee({ ...newEmployee, counter_no: parseInt(e.target.value) })}
                      />
                    </div>
                    <button
                      type="submit"
                      className="md:col-span-3 flex items-center justify-center gap-2 bg-brand-dark text-white rounded-xl py-4 font-bold hover:bg-brand-primary transition-all transform active:scale-[0.98] shadow-lg shadow-brand-primary/10"
                    >
                      <Plus className="w-5 h-5" />
                      Add to Personnel Database
                    </button>
                  </form>
                </div>

                {/* Directory Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 px-10 py-4 border-b border-slate-100">
                    <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Active Directory</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-50">
                          <th className="px-10 py-5">
                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">P-NO</span>
                              <input
                                className="text-[10px] bg-slate-50 border border-slate-100 rounded px-2 py-1 font-mono focus:ring-1 focus:ring-brand-primary outline-none w-24"
                                placeholder="..."
                                value={empFilters.per_no}
                                onChange={e => setEmpFilters({ ...empFilters, per_no: e.target.value })}
                              />
                            </div>
                          </th>
                          <th className="px-6 py-5">
                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Name</span>
                              <input
                                className="text-[10px] bg-slate-50 border border-slate-100 rounded px-2 py-1 font-sans focus:ring-1 focus:ring-brand-primary outline-none w-32"
                                placeholder="..."
                                value={empFilters.name}
                                onChange={e => setEmpFilters({ ...empFilters, name: e.target.value })}
                              />
                            </div>
                          </th>
                          <th className="px-6 py-5">
                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Department</span>
                              <input
                                className="text-[10px] bg-slate-50 border border-slate-100 rounded px-2 py-1 font-sans focus:ring-1 focus:ring-brand-primary outline-none w-32"
                                placeholder="..."
                                value={empFilters.department}
                                onChange={e => setEmpFilters({ ...empFilters, department: e.target.value })}
                              />
                            </div>
                          </th>
                          <th className="px-6 py-5">
                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Counter</span>
                              <input
                                className="text-[10px] bg-slate-50 border border-slate-100 rounded px-2 py-1 font-mono focus:ring-1 focus:ring-brand-primary outline-none w-16"
                                placeholder="..."
                                value={empFilters.counter_no}
                                onChange={e => setEmpFilters({ ...empFilters, counter_no: e.target.value })}
                              />
                            </div>
                          </th>
                          <th className="px-10 py-5">
                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Email</span>
                              <input
                                className="text-[10px] bg-slate-50 border border-slate-100 rounded px-2 py-1 font-sans focus:ring-1 focus:ring-brand-primary outline-none w-40"
                                placeholder="..."
                                value={empFilters.email}
                                onChange={e => setEmpFilters({ ...empFilters, email: e.target.value })}
                              />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.filter(emp => {
                          const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
                          return (
                            emp.per_no.toLowerCase().includes(empFilters.per_no.toLowerCase()) &&
                            fullName.includes(empFilters.name.toLowerCase()) &&
                            emp.department.toLowerCase().includes(empFilters.department.toLowerCase()) &&
                            emp.counter_no.toString().includes(empFilters.counter_no) &&
                            emp.email.toLowerCase().includes(empFilters.email.toLowerCase())
                          );
                        }).map((emp) => (
                          <tr key={emp.per_no} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-default group/row">
                            <td className="px-10 py-5 text-sm font-mono font-bold text-brand-dark">{emp.per_no}</td>
                            <td className="px-6 py-5">
                              <p className="text-sm font-bold text-brand-dark">{emp.first_name} {emp.last_name}</p>
                              <p className="text-[10px] text-brand-muted font-mono">{emp.gid}</p>
                            </td>
                            <td className="px-6 py-5">
                              <span className="inline-flex items-center px-2 py-1 bg-brand-bg text-brand-primary rounded text-[10px] font-bold uppercase border border-brand-primary/10">
                                {emp.department}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              {editingEmp === emp.per_no ? (
                                <input
                                  type="number"
                                  className="w-16 bg-white border border-slate-200 rounded px-2 py-1 text-[10px] font-bold"
                                  value={empEditData?.counter_no}
                                  onChange={e => setEmpEditData({ ...empEditData!, counter_no: parseInt(e.target.value) })}
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-brand-bg text-brand-primary rounded-full flex items-center justify-center text-[10px] font-bold border border-brand-primary/10">
                                    {emp.counter_no}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="px-10 py-5">
                              <div className="flex items-center justify-between w-full">
                                <div className="flex flex-col">
                                  <span className="text-sm text-slate-500">{emp.email}</span>
                                  {editingEmp === emp.per_no ? (
                                    <input
                                      type="date"
                                      className="mt-1 text-[10px] bg-white border border-slate-200 rounded px-2 py-0.5"
                                      value={empEditData?.assigned_date}
                                      onChange={e => setEmpEditData({ ...empEditData!, assigned_date: e.target.value })}
                                    />
                                  ) : (
                                    <span className="text-[10px] text-brand-muted font-mono">{emp.assigned_date}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                  {editingEmp === emp.per_no ? (
                                    <>
                                      <button onClick={() => handleUpdateEmployee(emp.per_no)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                        <Save className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => setEditingEmp(null)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                        <X className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleDeleteEmployee(emp.per_no)}
                                        className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                        title="Delete Personnel"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingEmp(emp.per_no);
                                          setEmpEditData({ assigned_date: emp.assigned_date, counter_no: emp.counter_no });
                                        }}
                                        className="p-1 text-brand-muted hover:text-brand-primary hover:bg-brand-bg rounded"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "slots" && (
              <motion.div
                key="slots"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                {/* Available Slots List & Creation */}
                <div className="space-y-6">
                  <div className="bg-white p-10 rounded-2xl border border-slate-100 shadow-sm mb-6">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-brand-dark">
                      <PlusCircle className="w-5 h-5 text-emerald-600" />
                      Configure New Slot
                    </h3>
                    <form onSubmit={handleCreateSlot} className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest ml-1 leading-none">Operation Date</label>
                        <input
                          required
                          type="date"
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary transition-all shadow-inner"
                          value={newSlot.date}
                          onChange={e => setNewSlot({ ...newSlot, date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest ml-1 leading-none">Start Time</label>
                        <input
                          required
                          type="time"
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary transition-all shadow-inner"
                          value={newSlot.start_time}
                          onChange={e => setNewSlot({ ...newSlot, start_time: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest ml-1 leading-none">End Time</label>
                        <input
                          required
                          type="time"
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary transition-all shadow-inner"
                          value={newSlot.end_time}
                          onChange={e => setNewSlot({ ...newSlot, end_time: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest ml-1 leading-none">Max Capacity</label>
                        <input
                          required
                          type="number"
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary transition-all shadow-inner"
                          value={newSlot.max_capacity}
                          onChange={e => setNewSlot({ ...newSlot, max_capacity: parseInt(e.target.value) })}
                        />
                      </div>
                      <button
                        type="submit"
                        className="col-span-2 mt-2 bg-brand-dark text-white rounded-xl py-4 font-bold hover:bg-brand-primary transition-all transform active:scale-[0.98] shadow-lg shadow-brand-primary/10"
                      >
                        Create Slot
                      </button>
                    </form>
                  </div>

                  <div className="space-y-4">
                    {slots.map((slot) => (
                      <div
                        key={slot.slot_id}
                        onClick={() => setSelectedSlot(slot.slot_id)}
                        className={`bg-white p-6 rounded-2xl border-2 transition-all cursor-pointer group flex items-center justify-between ${selectedSlot === slot.slot_id ? "border-brand-primary shadow-md" : "border-slate-100 hover:border-slate-200"
                          }`}
                      >
                        <div className="flex items-center gap-6">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${selectedSlot === slot.slot_id ? "bg-brand-primary text-white" : "bg-brand-bg text-brand-muted"
                            }`}>
                            <Clock className="w-8 h-8" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-brand-dark">{slot.start_time} - {slot.end_time}</p>
                            <div className="flex items-center gap-4">
                              <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">{slot.date}</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${slot.curr_bookings >= slot.max_capacity ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                                {slot.curr_bookings} / {slot.max_capacity} FILLED
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {slot.curr_bookings === 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSlot(slot.slot_id);
                              }}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-slate-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              title="Delete Slot"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${selectedSlot === slot.slot_id ? "translate-x-1 text-brand-primary" : "text-slate-300 group-hover:translate-x-1"
                            }`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Slot Details / Booking Interface */}
                <div className="space-y-6">
                  {selectedSlot ? (
                    <div className="bg-white p-10 rounded-2xl border border-slate-100 shadow-sm border-t-4 border-t-brand-primary">
                      <h3 className="text-xl font-bold text-brand-dark mb-1 flex items-center gap-2">
                        <UserCheck className="w-6 h-6 text-brand-primary" />
                        Slot Allocation Manager
                      </h3>
                      <p className="text-xs font-medium text-brand-muted mb-8 tracking-widest uppercase">IDENTIFIER: //SLOT_{selectedSlot}</p>

                      <form onSubmit={(e) => {
                        e.preventDefault();
                        handleBooking(e);
                      }} className="space-y-8">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest ml-1">Qualified Target</label>
                            <select
                              required
                              className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-semibold focus:ring-2 focus:ring-brand-primary transition-all shadow-inner"
                              value={selectedEmployee}
                              onChange={e => setSelectedEmployee(e.target.value)}
                            >
                              <option value="">Lookup Registry...</option>
                              {employees.map(emp => (
                                <option key={emp.per_no} value={emp.per_no}>
                                  {emp.per_no} - {emp.first_name} {emp.last_name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="submit"
                            className="w-full bg-brand-dark text-white rounded-xl py-5 font-bold hover:bg-brand-primary transition-all transform active:scale-95 shadow-xl shadow-brand-primary/10"
                          >
                            Confirm Allocation
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedSlot(null)}
                            className="w-full bg-white text-[10px] font-bold text-brand-muted rounded-xl py-3 border border-slate-200 hover:text-brand-dark hover:bg-slate-50 hover:border-slate-300 transition-all uppercase tracking-widest shadow-sm"
                          >
                            Deselect Slot
                          </button>
                        </div>
                      </form>

                      {/* Participant List for Selected Slot */}
                      <div className="mt-12 pt-8 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-xs font-bold text-brand-muted uppercase tracking-widest flex items-center gap-2">
                            <Users className="w-3 h-3 text-brand-primary" />
                            Current Allocations
                          </h4>
                          <span className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-brand-dark font-bold">
                            {bookings.filter(b => b.slot_id === selectedSlot).length} RECORDS
                          </span>
                        </div>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                          {bookings.filter(b => b.slot_id === selectedSlot).length === 0 ? (
                            <div className="py-12 border-2 border-dashed border-slate-100 rounded-xl text-center">
                              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest tracking-loose">Registry Empty</p>
                            </div>
                          ) : (
                            bookings.filter(b => b.slot_id === selectedSlot).map((b, idx) => (
                              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-50 transition-all hover:bg-slate-50 group/item">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-100 shadow-sm text-brand-primary group-hover/item:scale-110 transition-transform">
                                    <UserCheck className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-brand-dark tracking-tight">{b.first_name} {b.last_name}</p>
                                    <p className="text-[10px] font-mono text-brand-muted tracking-tight leading-none">{b.per_no}</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAdminCancel(b.per_no || "", b.slot_id);
                                  }}
                                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all relative z-20 border border-transparent hover:border-red-100 active:scale-95"
                                  title="Remove from Slot"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full min-h-[400px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-10 text-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-300 mb-4 shadow-sm border border-slate-100">
                        <Eye className="w-8 h-8" />
                      </div>
                      <h4 className="text-sm font-bold text-brand-dark mb-1">Observation Mode</h4>
                      <p className="text-xs text-brand-muted max-w-[200px]">Select a time slot from the directory to review and manage personnel allocations.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "bookings" && (
              <motion.div
                key="bookings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 gap-4"
              >
                <div className="bg-white p-10 rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
                  <h3 className="text-xl font-bold mb-8 flex items-center gap-2 text-brand-dark">
                    <Calendar className="w-6 h-6 text-brand-primary" />
                    Active Reservations
                  </h3>
                  <div className="space-y-4">
                    {bookings.length === 0 ? (
                      <div className="py-20 text-center">
                        <p className="text-sm font-bold text-brand-muted uppercase tracking-widest">No reservations found in system logs.</p>
                      </div>
                    ) : (
                      bookings.map((booking, i) => (
                        <div key={i} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-2xl border border-slate-50 group hover:border-slate-200 transition-all cursor-default">
                          <div className="flex items-center gap-6">
                            <div className="flex flex-col items-center justify-center w-20 h-20 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:scale-105 transition-transform duration-300">
                              <p className="text-[10px] font-bold text-brand-muted uppercase">{booking.date?.split("-")[1]}</p>
                              <p className="text-3xl font-bold tracking-tighter text-brand-dark">{booking.date?.split("-")[2]}</p>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold bg-brand-bg text-brand-primary px-2 py-0.5 rounded">SLOT-{booking.slot_id}</span>
                                <h4 className="text-lg font-bold text-brand-dark">{booking.first_name} {booking.last_name}</h4>
                              </div>
                              <div className="flex items-center gap-4 text-xs font-medium text-brand-muted">
                                <span className="flex items-center gap-1"><Hash className="w-3 h-3 text-slate-300" /> {booking.per_no}</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-300" /> {booking.start_time} - {booking.end_time}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-brand-muted">
                            <div className="hidden md:flex flex-col items-end mr-4">
                              <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Auth Timestamp</p>
                              <p className="text-[10px] font-mono text-brand-muted">{new Date().toLocaleTimeString()}</p>
                            </div>
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-emerald-500 border border-slate-100 shadow-sm mr-2">
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdminCancel(booking.per_no || "", booking.slot_id);
                              }}
                              className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-600 border border-red-100 shadow-sm hover:bg-red-600 hover:text-white transition-all relative z-20 active:scale-95"
                              title="Delete Allocation"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
