import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Layers,
  LayoutDashboard,
  Calendar,
  ArrowRightLeft,
  Hammer,
  ClipboardList,
  Users,
  Settings,
  FileBarChart2,
  LogOut,
  Bell,
  Sun,
  Moon,
  Lock,
  Mail,
  User,
  ShieldAlert,
  Shield,
  Menu,
  ChevronDown,
  X,
  Eye,
  EyeOff,
  ArrowDownToLine,
  Printer,
  RefreshCw
} from "lucide-react";
import { api, getAuthToken, setAuthToken, getCurrentUser, setCurrentUser } from "./api";
import {
  Asset,
  Booking,
  Transfer,
  Maintenance,
  AuditCycle,
  User as Employee,
  Department,
  Notification,
  ActivityLog,
  Role,
  AssetStatus,
  AssetCategory
} from "./types";

// Modular Views
import LandingPage from "./components/LandingPage";
import DashboardView from "./components/DashboardView";
import AssetManagerView from "./components/AssetManagerView";
import ResourceBookingView from "./components/ResourceBookingView";
import TransferView from "./components/TransferView";
import MaintenanceView from "./components/MaintenanceView";
import AuditView from "./components/AuditView";
import OrgView from "./components/OrgView";
import EmployeesView from "./components/EmployeesView";
import ReportsView from "./components/ReportsView";
import SettingsView from "./components/SettingsView";
import CommandPalette from "./components/CommandPalette";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  // Session State
  const [currentUser, setCurrentUserLocal] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [authMode, setAuthMode] = useState<"landing" | "login" | "signup">("landing");
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Client-Side Routing State
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  const navigateTo = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Helper function to generate initials-based avatar
  const getInitialsAvatar = (name: string): string => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Redirect on load/path change
  useEffect(() => {
    if (currentUser) {
      if (currentPath === "/" || currentPath === "") {
        if (currentUser.role === Role.Admin || currentUser.role === Role.AssetManager) {
          navigateTo("/admin/dashboard");
        } else {
          navigateTo("/dashboard");
        }
      }
    }
  }, [currentUser, currentPath]);

  // Core Database States
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [audits, setAudits] = useState<AuditCycle[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [initiateAddAsset, setInitiateAddAsset] = useState(false);
  
  // Auth Form State
  const [loginForm, setLoginForm] = useState({ email: "", password: "", rememberMe: false });
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    departmentId: "",
    phone: "",
    employeeId: "",
    jobTitle: "",
    profilePhoto: "",
    acceptTerms: false
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Initialize Session
  useEffect(() => {
    const user = getCurrentUser();
    const token = getAuthToken();
    if (user && token) {
      setCurrentUserLocal(user);
      setAuthMode("login");
      loadAllData();
    }
  }, []);

  // Poll data and notifications every 8s to simulate socket updates
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      refreshNotifications();
      refreshLogs();
    }, 8000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Load All Databases
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [
        allAssets,
        allUsers,
        allDepts,
        allBookings,
        allTransfers,
        allMaintenances,
        allAudits,
        allNotifs,
        allLogs
      ] = await Promise.all([
        api.getAssets(),
        api.getUsers(),
        api.getDepartments(),
        api.getBookings(),
        api.getTransfers(),
        api.getMaintenances(),
        api.getAudits(),
        api.getNotifications(),
        api.getLogs()
      ]);

      setAssets(allAssets);
      setUsers(allUsers);
      setDepartments(allDepts);
      setBookings(allBookings);
      setTransfers(allTransfers);
      setMaintenances(allMaintenances);
      setAudits(allAudits);
      setNotifications(allNotifs);
      setLogs(allLogs);
    } catch (err) {
      console.error("Data Synchronization Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAssets = async () => {
    await loadAllData();
  };

  const refreshBookings = async () => {
    const data = await api.getBookings();
    setBookings(data);
  };

  const refreshTransfers = async () => {
    const data = await api.getTransfers();
    setTransfers(data);
  };

  const refreshMaintenances = async () => {
    const data = await api.getMaintenances();
    setMaintenances(data);
  };

  const refreshAudits = async () => {
    const data = await api.getAudits();
    setAudits(data);
  };

  const refreshUsers = async () => {
    const data = await api.getUsers();
    setUsers(data);
  };

  const refreshDepts = async () => {
    const data = await api.getDepartments();
    setDepartments(data);
  };

  const refreshNotifications = async () => {
    const data = await api.getNotifications();
    setNotifications(data);
  };

  const refreshLogs = async () => {
    const data = await api.getLogs();
    setLogs(data);
  };

  // Auth Actions
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    
    // Validation
    if (!loginForm.email) {
      setAuthError("Enter your work email.");
      return;
    }
    if (!loginForm.password) {
      setAuthError("Enter your password.");
      return;
    }
    
    try {
      // Send only email and password to backend
      const loginData = {
        email: loginForm.email,
        password: loginForm.password
      };
      const response = await api.login(loginData);
      setAuthToken(response.token);
      setCurrentUser(response.user);
      setCurrentUserLocal(response.user);
      setLoginForm({ email: "", password: "", rememberMe: false });
      setAuthSuccess("Login successful. Redirecting to dashboard...");
      setTimeout(() => {
        loadAllData();
        navigateTo("/dashboard");
      }, 1000);
    } catch (err: any) {
      setAuthError(err.message || "Invalid email or password.");
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    
    // Validation
    if (!signupForm.name) {
      setAuthError("Full Name is required.");
      return;
    }
    if (!signupForm.email) {
      setAuthError("Valid email is required.");
      return;
    }
    if (!signupForm.password || signupForm.password.length < 8) {
      setAuthError("Password must be at least 8 characters.");
      return;
    }
    if (signupForm.password !== signupForm.confirmPassword) {
      setAuthError("Passwords must match.");
      return;
    }
    if (!signupForm.departmentId) {
      setAuthError("Department is required.");
      return;
    }
    if (!signupForm.jobTitle) {
      setAuthError("Job Title is required.");
      return;
    }
    if (!signupForm.acceptTerms) {
      setAuthError("You must accept the Terms & Conditions.");
      return;
    }
    
    try {
      // Only send fields that backend expects
      const signupData = {
        name: signupForm.name,
        email: signupForm.email,
        password: signupForm.password,
        departmentId: signupForm.departmentId
      };
      const response = await api.signup(signupData);
      setAuthToken(response.token);
      setCurrentUser(response.user);
      setCurrentUserLocal(response.user);
      setSignupForm({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        departmentId: "",
        phone: "",
        employeeId: "",
        jobTitle: "",
        profilePhoto: "",
        acceptTerms: false
      });
      setAuthSuccess("Account created successfully. Redirecting to dashboard...");
      setTimeout(() => {
        loadAllData();
        navigateTo("/dashboard");
      }, 1000);
    } catch (err: any) {
      setAuthError(err.message || "Email already exists.");
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setCurrentUserLocal(null);
    setAuthMode("landing");
    navigateTo("/");
  };

  const handleUpdateCurrentUser = (updatedUser: Employee) => {
    setCurrentUserLocal(updatedUser);
    setCurrentUser(updatedUser);
    // Also reload lists if user details need to propagate
    refreshUsers();
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await api.readAllNotifications();
      refreshNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  // CSV Exporter for ERP Ledger lists
  const handleExportCSV = (type: "assets" | "bookings" | "maintenances" | "transfers") => {
    let headers: string[] = [];
    let rows: any[] = [];
    let fileName = "";

    if (type === "assets") {
      headers = ["Asset Tag", "Asset Name", "Category", "Cost", "Location", "Warranty", "Status", "Condition"];
      rows = assets.map(a => [a.tag, a.name, a.category, a.purchaseCost, a.location, a.warrantyMonths, a.status, a.condition]);
      fileName = "AssetFlow_Active_Inventory_Ledger.csv";
    } else if (type === "bookings") {
      headers = ["Booking Title", "Resource Name", "Category", "Reserved By", "Start Time", "End Time", "Status"];
      rows = bookings.map(b => [b.title, b.assetName, b.assetCategory, b.userName, b.start, b.end, b.status]);
      fileName = "AssetFlow_Resource_Bookings_Report.csv";
    } else if (type === "transfers") {
      headers = ["Transfer ID", "Asset Tag", "Asset Name", "Requester", "Target Dept", "Target Holder", "Comments", "Status"];
      rows = transfers.map(t => [t.id, t.assetTag || "", t.assetName || "", t.requesterName, t.targetDepartmentName || "", t.targetHolderName || "", t.comments || "", t.status]);
      fileName = "AssetFlow_Departmental_Transfers_Report.csv";
    } else {
      headers = ["Service Ticket", "Category", "Asset ID", "Priority", "Issue Details", "Technician", "Status"];
      rows = maintenances.map(m => [m.id, m.assetName, m.assetTag, m.priority, m.issueDescription, m.technicianName || "None", m.status]);
      fileName = "AssetFlow_Maintenance_Lifecycle_Report.csv";
    }

    const csvContent = [headers.join(","), ...rows.map(r => r.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.click();
  };

  // HTML Print-preview high-fidelity generator
  const handlePrintInventory = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const tableRows = assets.map(a => `
      <tr>
        <td style="padding:8px; border-bottom:1px solid #ddd; font-family:monospace;">${a.tag}</td>
        <td style="padding:8px; border-bottom:1px solid #ddd; font-weight:bold;">${a.name}</td>
        <td style="padding:8px; border-bottom:1px solid #ddd;">${a.category}</td>
        <td style="padding:8px; border-bottom:1px solid #ddd;">${a.location}</td>
        <td style="padding:8px; border-bottom:1px solid #ddd;">${a.status}</td>
        <td style="padding:8px; border-bottom:1px solid #ddd;">${a.condition}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>AssetFlow Corporate Physical Inventory Checklist</title>
          <style>
            body { font-family: 'Inter', sans-serif; color: #333; margin: 40px; }
            h1 { font-family: 'Space Grotesk', sans-serif; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; text-align: left; font-size: 12px; }
            th { background-color: #f1f5f9; padding: 10px; font-family: monospace; }
          </style>
        </head>
        <body>
          <h1>AssetFlow Active Inventory Directory</h1>
          <p>Generated: ${new Date().toLocaleString()} • Authorized Representative: ${currentUser?.name}</p>
          <table>
            <thead>
              <tr>
                <th>TAG CODE</th>
                <th>ASSET NAME</th>
                <th>CATEGORY</th>
                <th>ZONE LOCATION</th>
                <th>STATUS</th>
                <th>CONDITION</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Nav Links setup - filtered based on user role
  const getNavigationItems = () => {
    const baseItems = [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "assets", label: "Assets", icon: Layers },
      { id: "bookings", label: "Bookings", icon: Calendar },
      { id: "transfers", label: "Asset Transfers", icon: ArrowRightLeft },
      { id: "maintenances", label: "Maintenance", icon: Hammer },
      { id: "settings", label: "Settings", icon: Settings }
    ];

    const adminItems = [
      { id: "employees", label: "Employees", icon: User },
      { id: "org", label: "Organization", icon: Users },
      { id: "audits", label: "Audit Logs", icon: ClipboardList },
      { id: "reports", label: "Reports", icon: FileBarChart2 }
    ];

    if (!currentUser) return baseItems;
    
    // Check if user has admin privileges - use string comparison for robustness
    const isAdmin = currentUser.role === "Admin" || 
                    currentUser.role === "AssetManager" || 
                    currentUser.role === "DepartmentHead" ||
                    currentUser.role === Role.Admin || 
                    currentUser.role === Role.AssetManager || 
                    currentUser.role === Role.DepartmentHead;
    
    if (isAdmin) {
      return [...baseItems, ...adminItems];
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems();

  const isDark = theme === "dark";

  // Render Authentication screen if not logged in
  if (!currentUser) {
    if (authMode === "landing") {
      return <LandingPage onNavigateToAuth={(mode) => setAuthMode(mode)} />;
    }

    return (
      <div className="relative min-h-screen bg-slate-950 font-sans text-slate-100 flex items-center justify-center p-4 overflow-hidden">
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none"></div>

        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative glass-panel rounded-3xl border border-slate-800/80 shadow-2xl overflow-hidden w-full max-w-md p-8"
        >
          {/* Brand header */}
          <div className="text-center space-y-2 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mx-auto">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" fillOpacity="0.8"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="font-display font-bold text-2xl tracking-tight text-white">AssetFlow ERP</h2>
            <p className="text-xs text-slate-500">Enterprise Asset Management System</p>
          </div>

          {authError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-5 flex gap-2.5 text-xs text-red-400">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{authError}</p>
            </div>
          )}
          {authSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-5 flex gap-2.5 text-xs text-emerald-400">
              <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{authSuccess}</p>
            </div>
          )}

          {authMode === "login" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-5 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="text-slate-400 block font-medium">Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. employee@company.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 block font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full pl-10 pr-10 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={loginForm.rememberMe}
                    onChange={(e) => setLoginForm({ ...loginForm, rememberMe: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
                  />
                  <span className="text-slate-400">Remember Me</span>
                </label>
                <button
                  type="button"
                  className="text-indigo-400 hover:text-indigo-300 text-xs font-medium cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition cursor-pointer text-sm shadow-lg shadow-indigo-600/15 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Sign In
              </button>

              <div className="text-center pt-4 border-t border-slate-900 text-slate-500">
                New to AssetFlow?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signup");
                    setAuthError(null);
                  }}
                  className="text-indigo-400 hover:underline cursor-pointer font-semibold"
                >
                  Create Account
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignupSubmit} className="space-y-4 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="text-slate-400 block font-medium">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Smith"
                    value={signupForm.name}
                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 block font-medium">Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. employee@company.com"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 block font-medium">Phone Number</label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="e.g. +1 234 567 8900"
                    value={signupForm.phone}
                    onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                    className="w-full pl-4 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 block font-medium">Employee ID <span className="text-slate-600">(optional)</span></label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. EMP-12345"
                    value={signupForm.employeeId}
                    onChange={(e) => setSignupForm({ ...signupForm, employeeId: e.target.value })}
                    className="w-full pl-4 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 block font-medium">Department</label>
                <select
                  required
                  value={signupForm.departmentId}
                  onChange={(e) => setSignupForm({ ...signupForm, departmentId: e.target.value })}
                  className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
                >
                  <option value="">-- Select Department --</option>
                  <option value="dept-eng">Engineering</option>
                  <option value="dept-mkt">Marketing</option>
                  <option value="dept-ops">Operations</option>
                  <option value="dept-fin">Finance</option>
                  <option value="dept-hr">HR</option>
                  <option value="dept-admin">Administration</option>
                  <option value="dept-sales">Sales</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 block font-medium">Job Title</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Software Engineer"
                    value={signupForm.jobTitle}
                    onChange={(e) => setSignupForm({ ...signupForm, jobTitle: e.target.value })}
                    className="w-full pl-4 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 block font-medium">Create Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type={showSignupPassword ? "text" : "password"}
                    required
                    placeholder="Min. 8 characters"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    className="w-full pl-10 pr-10 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 block font-medium">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="Confirm your password"
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                    className="w-full pl-10 pr-10 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 block font-medium">Profile Photo URL <span className="text-slate-600">(optional)</span></label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    value={signupForm.profilePhoto}
                    onChange={(e) => setSignupForm({ ...signupForm, profilePhoto: e.target.value })}
                    className="w-full pl-4 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={signupForm.acceptTerms}
                  onChange={(e) => setSignupForm({ ...signupForm, acceptTerms: e.target.checked })}
                  className="w-4 h-4 mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
                />
                <span className="text-slate-400 text-xs leading-relaxed">
                  I agree to the <button type="button" className="text-indigo-400 hover:underline">Terms & Conditions</button> and <button type="button" className="text-indigo-400 hover:underline">Privacy Policy</button>
                </span>
              </label>

              <button
                type="submit"
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition cursor-pointer text-sm shadow-lg shadow-indigo-600/15 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Create Account
              </button>

              <div className="text-center pt-4 border-t border-slate-900 text-slate-500">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError(null);
                  }}
                  className="text-indigo-400 hover:underline cursor-pointer font-semibold"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    );
  }

  // Active ERP Workspace
  const isPathAdmin = currentPath.startsWith("/admin");
  const isUserAdmin = currentUser && (currentUser.role === Role.Admin || currentUser.role === Role.AssetManager);

  if (isPathAdmin) {
    if (isUserAdmin) {
      return (
        <AdminPanel
          currentUser={currentUser}
          assets={assets}
          users={users}
          departments={departments}
          bookings={bookings}
          transfers={transfers}
          maintenances={maintenances}
          logs={logs}
          notifications={notifications}
          theme={theme}
          onThemeChange={(newTheme) => setTheme(newTheme)}
          onRefreshData={loadAllData}
          onLogout={handleLogout}
          onSwitchToEmployeeView={() => navigateTo("/dashboard")}
        />
      );
    } else {
      // Render 403 Unauthorized Shield View
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans text-white relative overflow-hidden">
          {/* Decorative Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[140px] pointer-events-none"></div>

          <div className="max-w-md space-y-6 relative z-10 p-8 bg-slate-900/80 border border-slate-800/80 rounded-3xl shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-white">403 Restricted Admin Area</h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                This administrative console is restricted to system directors. Your current security profile (<strong>{currentUser.role}</strong>) does not hold access permissions.
              </p>
            </div>
            <button
              onClick={() => navigateTo("/dashboard")}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs transition cursor-pointer shadow-lg shadow-red-600/20 font-sans"
            >
              Return to My Employee Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  return (
    <div className={`min-h-screen font-sans transition-all duration-300 ${
      isDark ? "bg-slate-950 text-slate-100" : "bg-[#F8FAFC] text-slate-900"
    } flex`}>
      
      {/* 1. Collapsible Sidebar Panel */}
      <aside className={`${
        isSidebarOpen ? "w-56" : "w-14"
      } border-r border-slate-200/10 dark:border-slate-900/80 transition-all duration-300 flex flex-col justify-between shrink-0 relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 shadow-2xl z-20 backdrop-blur-xl`}>
        
        {/* Upper Side items */}
        <div>
          <div className="p-3.5 flex items-center justify-between border-b border-slate-800/50 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-blue-600/10">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/40 shrink-0">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" fillOpacity="0.8"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {isSidebarOpen && (
                <motion.span 
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="font-display font-black text-sm text-white tracking-tight truncate"
                >
                  AssetFlow <span className="text-[8px] bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 font-mono px-1.5 py-0.5 rounded-full ml-1 border border-indigo-500/30">v18</span>
                </motion.span>
              )}
            </div>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg cursor-pointer transition backdrop-blur-sm ${!isSidebarOpen && "mx-auto"}`}
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

          <nav className="p-2 space-y-1.5">
            {navigationItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition text-[11px] font-semibold cursor-pointer relative group overflow-hidden ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-blue-600/20 text-indigo-300 border border-indigo-500/30 shadow-lg shadow-indigo-500/10"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent hover:border-white/10"
                  } ${!isSidebarOpen && "justify-center"}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/10 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isActive ? "opacity-100" : ""}`} />
                  <Icon className={`w-4 h-4 shrink-0 transition duration-150 group-hover:scale-110 relative z-10 ${isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-indigo-300"}`} />
                  {isSidebarOpen && <span className="relative z-10">{item.label}</span>}
                  {isActive && isSidebarOpen && (
                    <span className="absolute right-3 w-1.5 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-lg shadow-indigo-500/50 relative z-10" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile details lower drawer */}
        <div className="p-2 border-t border-slate-800/50 space-y-2 bg-gradient-to-t from-slate-900/50 to-transparent">
          {(currentUser.role === Role.Admin || currentUser.role === Role.AssetManager) && (
            <button
              onClick={() => navigateTo("/admin/dashboard")}
              className={`w-full flex items-center gap-2 px-2.5 py-2.5 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-blue-600/20 text-indigo-400 hover:from-indigo-600 hover:to-purple-600 hover:text-white border border-indigo-500/30 rounded-xl transition text-[11px] font-bold cursor-pointer shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/30 ${
                !isSidebarOpen && "justify-center"
              }`}
              title="Access Director Admin Panel"
            >
              <Shield className="w-4 h-4 shrink-0" />
              {isSidebarOpen && <span className="truncate">Admin Console</span>}
            </button>
          )}

          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2 px-2.5 py-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl transition text-[11px] font-semibold cursor-pointer border border-transparent hover:border-rose-500/20 ${
              !isSidebarOpen && "justify-center"
            }`}
          >
            <LogOut className="w-4 h-4 text-slate-400 hover:text-rose-400" />
            {isSidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* 2. Main Content Wrapper */}
      <div className="flex-grow flex flex-col min-w-0">
        
        {/* Top Header Controls bar */}
        <header className={`h-14 border-b px-6 flex items-center justify-between gap-4 transition-colors z-10 ${
          isDark 
            ? "bg-slate-950/40 border-slate-900/80 text-white backdrop-blur-md" 
            : "bg-white/80 border-slate-200/80 text-slate-850 backdrop-blur-md"
        }`}>
          
          {/* Left search & Breadcrumbs */}
          <div className="flex items-center gap-4">
            <CommandPalette
              onNavigateToTab={(tab) => setActiveTab(tab)}
              onViewAssetDetails={(asset) => {
                setActiveTab("assets");
              }}
              theme={theme}
            />

            {/* Breadcrumb path */}
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 font-sans select-none hidden md:flex">
              <span>Workspace</span>
              <span>/</span>
              <span className={`font-bold capitalize ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                {activeTab === "org" 
                  ? "Organization Unit" 
                  : activeTab === "transfers" 
                    ? "Asset Transfers" 
                    : activeTab === "maintenances" 
                      ? "Maintenance Desk" 
                      : activeTab === "audits" 
                        ? "Compliance Audits" 
                        : activeTab}
              </span>
            </div>
          </div>

          {/* Right Header Panel */}
          <div className="flex items-center gap-3.5 relative">

            {/* Sync Refresh Button */}
            <button
              onClick={loadAllData}
              disabled={isLoading}
              className={`p-2.5 rounded-xl transition cursor-pointer border backdrop-blur-sm ${
                isDark 
                  ? "text-slate-400 hover:text-white hover:bg-white/10 border-slate-800/50 hover:border-slate-700/50" 
                  : "text-slate-500 hover:text-[#0F172A] hover:bg-slate-100/50 border-slate-200/50 hover:border-slate-300/50"
              }`}
              title="Synchronize ERP Datastore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading && "animate-spin"}`} />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className={`p-2.5 rounded-xl transition cursor-pointer border backdrop-blur-sm ${
                isDark 
                  ? "text-slate-400 hover:text-white hover:bg-white/10 border-slate-800/50 hover:border-slate-700/50" 
                  : "text-slate-500 hover:text-[#0F172A] hover:bg-slate-100/50 border-slate-200/50 hover:border-slate-300/50"
              }`}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* Realtime Alert Inbox with notification Count Bubble */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationDropdownOpen(!isNotificationDropdownOpen)}
                className={`p-2.5 rounded-xl transition cursor-pointer relative border backdrop-blur-sm ${
                  isDark 
                    ? "text-slate-400 hover:text-white hover:bg-white/10 border-slate-800/50 hover:border-slate-700/50" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 border-slate-200/50 hover:border-slate-300/50"
                }`}
              >
                <Bell className="w-4 h-4" />
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-gradient-to-r from-red-500 to-rose-500 rounded-full animate-ping"></span>
                )}
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-gradient-to-r from-red-500 to-rose-500 rounded-full"></span>
                )}
              </button>

              {/* Notification drop layout */}
              <AnimatePresence>
                {isNotificationDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsNotificationDropdownOpen(false)}></div>
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={`absolute right-0 mt-2 w-80 border rounded-xl shadow-2xl p-4 space-y-3 z-40 text-xs backdrop-blur-xl ${
                        isDark ? "bg-slate-950/95 border-slate-800/80 text-white" : "bg-white/95 border-slate-200/80 text-slate-800"
                      }`}
                    >
                      <div className={`flex justify-between items-center border-b pb-3 ${
                        isDark ? "border-slate-800/60" : "border-slate-200/60"
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">Alert Inbox</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            isDark ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-indigo-100 text-indigo-700 border border-indigo-200"
                          }`}>{notifications.length}</span>
                        </div>
                        <button
                          onClick={handleMarkNotificationsRead}
                          className="text-[10px] text-indigo-500 hover:text-indigo-400 font-semibold cursor-pointer transition"
                        >
                          Mark All Read
                        </button>
                      </div>

                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {notifications.length === 0 ? (
                          <div className="text-center py-8">
                            <Bell className={`w-8 h-8 mx-auto mb-2 ${isDark ? "text-slate-700" : "text-slate-300"}`} />
                            <p className="text-slate-500 text-[11px]">No new notifications</p>
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div key={n.id} className={`p-3 border rounded-xl text-xs transition-all hover:scale-[1.02] cursor-pointer ${
                              !n.isRead 
                                ? isDark 
                                  ? "bg-indigo-500/10 border-indigo-500/30 text-slate-300" 
                                  : "bg-indigo-50 border-indigo-200 text-slate-700"
                                : isDark 
                                  ? "bg-slate-900/60 border-slate-800/40 text-slate-400" 
                                  : "bg-slate-50 border-slate-150 text-slate-600"
                            }`}>
                              <div className="flex items-start justify-between gap-2">
                                <h5 className={`font-semibold text-[11px] ${isDark ? "text-slate-200" : "text-slate-850"}`}>{n.title}</h5>
                                {!n.isRead && <span className="w-2 h-2 bg-indigo-500 rounded-full shrink-0 mt-1"></span>}
                              </div>
                              <p className="text-[10px] leading-relaxed mt-1">{n.message}</p>
                              <p className="text-[9px] text-slate-500 mt-1.5 font-mono">{new Date(n.createdAt).toLocaleDateString('en-IN')}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className={`flex items-center gap-1.5 p-1.5 rounded-xl transition cursor-pointer border backdrop-blur-sm ${
                  isDark 
                    ? "hover:bg-white/10 border-slate-800/50 hover:border-slate-700/50" 
                    : "hover:bg-slate-100/50 border-slate-200/50 hover:border-slate-300/50"
                }`}
              >
                <div className="relative w-8 h-8 shrink-0">
                  <span className={`w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30 text-indigo-600 font-bold text-xs uppercase shadow-lg shadow-indigo-500/20`}>
                    {currentUser.name ? currentUser.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??"}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <AnimatePresence>
                {isProfileDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsProfileDropdownOpen(false)}></div>
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={`absolute right-0 mt-2 w-56 border rounded-xl shadow-xl p-2 z-40 text-xs ${
                        isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-800"
                      }`}
                    >
                      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/60 pb-2 mb-1.5">
                        <p className="font-bold truncate text-slate-900 dark:text-white">{currentUser.name}</p>
                        <p className="text-[10px] text-slate-400 truncate font-mono mt-0.5">{currentUser.email}</p>
                        <span className="inline-block text-[9px] font-mono font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 rounded px-1.5 py-0.2 mt-1">
                          {currentUser.role}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setActiveTab("settings");
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition text-left text-slate-600 dark:text-slate-300 cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-400" />
                        <span>Profile Settings</span>
                      </button>

                      {(currentUser.role === Role.Admin || currentUser.role === Role.AssetManager) && (
                        <button
                          onClick={() => {
                            navigateTo("/admin/dashboard");
                            setIsProfileDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition text-left text-slate-600 dark:text-slate-300 cursor-pointer font-semibold"
                        >
                          <Shield className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Admin Console</span>
                        </button>
                      )}

                      <div className="border-t border-slate-100 dark:border-slate-800/60 my-1"></div>

                      <button
                        onClick={() => {
                          handleLogout();
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/25 text-rose-600 dark:text-rose-400 rounded-lg transition text-left cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

          </div>
        </header>

        {/* 3. Main Workspace Area */}
        <main className="flex-grow p-6 overflow-y-auto">
          {isLoading && assets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-xs font-mono">Synchronizing AssetFlow ERP Datastore...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === "dashboard" && (
                <DashboardView
                  assets={assets}
                  bookings={bookings}
                  transfers={transfers}
                  maintenances={maintenances}
                  logs={logs}
                  notifications={notifications}
                  onMarkAllNotificationsRead={handleMarkNotificationsRead}
                  userRole={currentUser.role}
                  userName={currentUser.name}
                  onNavigateToTab={(tab, action) => {
                    setActiveTab(tab);
                    if (action === "add-asset") {
                      setInitiateAddAsset(true);
                    }
                  }}
                  theme={theme}
                  departments={departments}
                  onRefreshAllData={loadAllData}
                />
              )}

              {activeTab === "assets" && (
                <AssetManagerView
                  assets={assets}
                  users={users}
                  departments={departments}
                  currentUser={currentUser}
                  onRefreshAssets={refreshAssets}
                  theme={theme}
                  defaultRegisterOpen={initiateAddAsset}
                  onRegisterModalClose={() => setInitiateAddAsset(false)}
                />
              )}

              {activeTab === "bookings" && (
                <ResourceBookingView
                  bookings={bookings}
                  assets={assets}
                  currentUser={currentUser}
                  onRefreshBookings={refreshBookings}
                  theme={theme}
                />
              )}

              {activeTab === "transfers" && (
                <TransferView
                  transfers={transfers}
                  assets={assets}
                  departments={departments}
                  users={users}
                  currentUser={currentUser}
                  onRefreshTransfers={refreshTransfers}
                  theme={theme}
                />
              )}

              {activeTab === "maintenances" && (
                <MaintenanceView
                  maintenances={maintenances}
                  assets={assets}
                  currentUser={currentUser}
                  onRefreshMaintenances={refreshMaintenances}
                  theme={theme}
                />
              )}

              {activeTab === "audits" && (
                <AuditView
                  audits={audits}
                  assets={assets}
                  users={users}
                  departments={departments}
                  currentUser={currentUser}
                  onRefreshAudits={refreshAudits}
                  onRefreshAssets={refreshAssets}
                  theme={theme}
                />
              )}

              {activeTab === "org" && (
                <OrgView
                  users={users}
                  departments={departments}
                  currentUser={currentUser}
                  onRefreshUsers={refreshUsers}
                  onRefreshDepartments={refreshDepts}
                  theme={theme}
                  assets={assets}
                />
              )}

              {activeTab === "employees" && (
                <EmployeesView
                  users={users}
                  departments={departments}
                  currentUser={currentUser}
                  onRefreshUsers={refreshUsers}
                  theme={theme}
                />
              )}

              {activeTab === "reports" && (
                <ReportsView
                  assets={assets}
                  bookings={bookings}
                  maintenances={maintenances}
                  transfers={transfers}
                  onExportCSV={handleExportCSV}
                  onPrintInventory={handlePrintInventory}
                  theme={theme}
                  userName={currentUser.name}
                />
              )}

              {activeTab === "settings" && (
                <SettingsView
                  currentUser={currentUser}
                  theme={theme}
                  onThemeChange={(newTheme) => setTheme(newTheme)}
                  onRefreshData={loadAllData}
                  onUpdateUser={handleUpdateCurrentUser}
                />
              )}
            </AnimatePresence>
          )}
        </main>

      </div>
    </div>
  );
}
