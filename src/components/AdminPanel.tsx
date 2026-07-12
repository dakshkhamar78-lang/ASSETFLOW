import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Layers,
  LayoutDashboard,
  Calendar as CalendarIcon,
  ArrowRightLeft,
  Hammer,
  ClipboardList,
  Users,
  Settings as SettingsIcon,
  FileBarChart2,
  LogOut,
  Bell,
  Sun,
  Moon,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Activity,
  Building2,
  UserPlus,
  Shield,
  Check,
  X,
  FileDown,
  Printer,
  RefreshCw,
  MoreVertical,
  Globe,
  Briefcase,
  Key,
  ChevronRight,
  Eye,
  Info,
  Laptop,
  Monitor,
  Server,
  Smartphone,
  Car,
  MapPin,
  User,
  Package,
  Layout
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { api } from "../api";
import {
  Asset,
  Booking,
  Transfer,
  Maintenance,
  ActivityLog,
  User as Employee,
  Department,
  Notification,
  Role,
  AssetStatus,
  AssetCategory,
  AssetCondition
} from "../types";

interface AdminPanelProps {
  currentUser: Employee;
  assets: Asset[];
  users: Employee[];
  departments: Department[];
  bookings: Booking[];
  transfers: Transfer[];
  maintenances: Maintenance[];
  logs: ActivityLog[];
  notifications: Notification[];
  theme: "light" | "dark";
  onThemeChange: (t: "light" | "dark") => void;
  onRefreshData: () => Promise<void>;
  onLogout: () => void;
  onSwitchToEmployeeView?: () => void;
}

export default function AdminPanel({
  currentUser,
  assets,
  users,
  departments,
  bookings,
  transfers,
  maintenances,
  logs,
  notifications,
  theme,
  onThemeChange,
  onRefreshData,
  onLogout,
  onSwitchToEmployeeView
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);

  // Search, Filters & Selections
  const [assetSearch, setAssetSearch] = useState("");
  const [assetCategoryFilter, setAssetCategoryFilter] = useState("");
  const [assetStatusFilter, setAssetStatusFilter] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeDeptFilter, setEmployeeDeptFilter] = useState("");

  // System Settings local state (reloaded from backend)
  const [systemSettings, setSystemSettings] = useState({
    companyName: "AssetFlow Solutions Inc.",
    currency: "USD",
    timezone: "UTC-7",
    fiscalYearStart: "January",
    allowSelfAllocation: true,
    requireBookingApproval: true,
    maintenanceAutoRouting: true,
    categories: ["Laptop", "Monitor", "Server", "Mobile", "Vehicle", "MeetingRoom", "Desk", "Other"],
    locations: ["SF Head Office", "NYC Branch", "London Depot", "Tokyo Tech Hub", "Remote"]
  });

  // Modal States
  const [modalType, setModalType] = useState<
    | null
    | "registerAsset"
    | "editAsset"
    | "addEmployee"
    | "editEmployee"
    | "assignAsset"
    | "createDepartment"
    | "resolveMaintenance"
    | "rejectTransfer"
    | "importCsv"
  >(null);

  // Selected Records for Edit
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);

  // Form Field States
  const [assetForm, setAssetForm] = useState({
    name: "",
    serialNumber: "",
    category: "Laptop",
    purchaseCost: "1500",
    warrantyMonths: "24",
    condition: "New",
    location: "SF Head Office",
    isBookable: false
  });

  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    email: "",
    role: "Employee",
    departmentId: "",
    status: "Active",
    password: ""
  });

  const [assignForm, setAssignForm] = useState({
    assetId: "",
    employeeId: "",
    notes: ""
  });

  const [deptForm, setDeptForm] = useState({
    name: "",
    parentId: ""
  });

  const [maintenanceResolveForm, setMaintenanceResolveForm] = useState({
    technicianName: "",
    actionNotes: ""
  });

  const [transferRejectForm, setTransferRejectForm] = useState({
    comments: ""
  });

  const [csvImportText, setCsvImportText] = useState("");

  // Notification Toast state
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Load corporate configurations on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.getSystemSettings();
      if (data) setSystemSettings(data);
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshData();
      await fetchSettings();
      showToast("success", "Enterprise Datastore synchronized with backend.");
    } catch {
      showToast("error", "Failed to sync with ERP engine.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMarkNotifRead = async () => {
    try {
      await api.readAllNotifications();
      await onRefreshData();
      showToast("success", "Notifications cleared.");
    } catch (err) {
      console.error(err);
    }
  };

  // KPI calculations
  const totalAssets = assets.length;
  const activeAssets = assets.filter(a => a.status === AssetStatus.Allocated || a.status === AssetStatus.Reserved).length;
  const assignedAssets = assets.filter(a => a.currentHolderId).length;
  const availableAssets = assets.filter(a => a.status === AssetStatus.Available).length;
  const totalEmployees = users.length;
  const activeBookings = bookings.filter(b => b.status === "Upcoming" || b.status === "Ongoing").length;
  const pendingTransfers = transfers.filter(t => t.status === "Pending").length;
  const openMaintenance = maintenances.filter(m => m.status === "Pending" || m.status === "Approved" || m.status === "In-Progress").length;
  const pendingApprovals = pendingTransfers + bookings.filter(b => b.status === "Upcoming").length;

  // Chart data generators
  const getCategoryBreakdown = () => {
    const counts: Record<string, number> = {};
    assets.forEach(a => {
      counts[a.category] = (counts[a.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const getConditionBreakdown = () => {
    const counts: Record<string, number> = {};
    assets.forEach(a => {
      counts[a.condition] = (counts[a.condition] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const getDepartmentStats = () => {
    return departments.map(d => {
      const assetCount = assets.filter(a => a.departmentId === d.id).length;
      const userCount = users.filter(u => u.departmentId === d.id).length;
      return {
        name: d.name,
        Assets: assetCount,
        Employees: userCount
      };
    });
  };

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#64748B"];

  // =========================
  // ACTIONS & HANDLERS
  // =========================

  // Asset Handlers
  const handleRegisterAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAsset({
        name: assetForm.name,
        serialNumber: assetForm.serialNumber,
        category: assetForm.category as AssetCategory,
        purchaseCost: parseFloat(assetForm.purchaseCost),
        warrantyMonths: parseInt(assetForm.warrantyMonths),
        condition: assetForm.condition as AssetCondition,
        location: assetForm.location,
        isBookable: assetForm.isBookable
      });
      await onRefreshData();
      setModalType(null);
      showToast("success", `Asset "${assetForm.name}" registered successfully.`);
      // Reset form
      setAssetForm({
        name: "",
        serialNumber: "",
        category: "Laptop",
        purchaseCost: "1500",
        warrantyMonths: "24",
        condition: "New",
        location: "SF Head Office",
        isBookable: false
      });
    } catch (err: any) {
      showToast("error", err.message || "Failed to register asset.");
    }
  };

  const handleEditAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      await api.updateAsset(selectedAsset.id, {
        name: assetForm.name,
        serialNumber: assetForm.serialNumber,
        category: assetForm.category as AssetCategory,
        purchaseCost: parseFloat(assetForm.purchaseCost),
        warrantyMonths: parseInt(assetForm.warrantyMonths),
        condition: assetForm.condition as AssetCondition,
        location: assetForm.location,
        isBookable: assetForm.isBookable
      });
      await onRefreshData();
      setModalType(null);
      setSelectedAsset(null);
      showToast("success", "Asset metrics updated successfully.");
    } catch (err: any) {
      showToast("error", err.message || "Failed to update asset.");
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!window.confirm("Are you sure you want to retire and remove this asset from database?")) return;
    try {
      await api.deleteAsset(id);
      await onRefreshData();
      showToast("success", "Asset has been retired and deleted.");
    } catch (err: any) {
      showToast("error", err.message || "Failed to delete asset.");
    }
  };

  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.allocateAsset(assignForm.assetId, {
        userId: assignForm.employeeId,
        notes: assignForm.notes
      });
      await onRefreshData();
      setModalType(null);
      showToast("success", "Asset assigned successfully.");
    } catch (err: any) {
      showToast("error", err.message || "Failed to assign asset.");
    }
  };

  const handleUnassignAsset = async (assetId: string) => {
    if (!window.confirm("Confirm returning asset back to general corporate pool?")) return;
    try {
      await api.returnAsset(assetId, { notes: "Returned by Administrator" });
      await onRefreshData();
      showToast("success", "Asset unassigned and returned to available inventory.");
    } catch (err: any) {
      showToast("error", err.message || "Failed to unassign asset.");
    }
  };

  // Employee Handlers
  const handleAddEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addEmployee({
        name: employeeForm.name,
        email: employeeForm.email,
        role: employeeForm.role as Role,
        departmentId: employeeForm.departmentId,
        status: employeeForm.status,
        password: employeeForm.password || "password"
      });
      await onRefreshData();
      setModalType(null);
      showToast("success", `Employee "${employeeForm.name}" registered in directory.`);
      setEmployeeForm({ name: "", email: "", role: "Employee", departmentId: "", status: "Active", password: "" });
    } catch (err: any) {
      showToast("error", err.message || "Failed to add employee.");
    }
  };

  const handleEditEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    try {
      await api.updateEmployee(selectedEmployee.id, {
        name: employeeForm.name,
        email: employeeForm.email,
        role: employeeForm.role as Role,
        departmentId: employeeForm.departmentId,
        status: employeeForm.status,
        password: employeeForm.password || undefined
      });
      await onRefreshData();
      setModalType(null);
      setSelectedEmployee(null);
      showToast("success", "Employee credentials updated.");
    } catch (err: any) {
      showToast("error", err.message || "Failed to update employee.");
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (id === currentUser.id) {
      showToast("error", "You cannot delete your own administrative account!");
      return;
    }
    if (!window.confirm("Are you sure you want to terminate this employee record? Associated assets will be returned to pool.")) return;
    try {
      await api.deleteEmployee(id);
      await onRefreshData();
      showToast("success", "Employee record removed.");
    } catch (err: any) {
      showToast("error", err.message || "Failed to delete employee.");
    }
  };

  // Department Handlers
  const handleCreateDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDepartment({
        name: deptForm.name,
        parentId: deptForm.parentId || null
      });
      await onRefreshData();
      setModalType(null);
      showToast("success", `Department "${deptForm.name}" has been created.`);
      setDeptForm({ name: "", parentId: "" });
    } catch (err: any) {
      showToast("error", err.message || "Failed to create department.");
    }
  };

  // Booking Handlers
  const handleApproveBooking = async (id: string) => {
    try {
      await api.approveBooking(id);
      await onRefreshData();
      showToast("success", "Booking approved.");
    } catch (err: any) {
      showToast("error", err.message || "Failed to approve booking.");
    }
  };

  const handleRejectBooking = async (id: string) => {
    try {
      await api.rejectBooking(id);
      await onRefreshData();
      showToast("success", "Booking rejected and cancelled.");
    } catch (err: any) {
      showToast("error", err.message || "Failed to reject booking.");
    }
  };

  const handleCancelBooking = async (id: string) => {
    try {
      await api.cancelBooking(id);
      await onRefreshData();
      showToast("success", "Booking cancelled.");
    } catch (err: any) {
      showToast("error", err.message || "Failed to cancel booking.");
    }
  };

  // Transfer Handlers
  const handleApproveTransfer = async (id: string) => {
    try {
      await api.approveTransfer(id);
      await onRefreshData();
      showToast("success", "Transfer approved. Asset parameters updated.");
    } catch (err: any) {
      showToast("error", err.message || "Failed to approve transfer.");
    }
  };

  const handleRejectTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;
    try {
      await api.rejectTransfer(selectedTransfer.id, transferRejectForm.comments);
      await onRefreshData();
      setModalType(null);
      setSelectedTransfer(null);
      showToast("success", "Transfer request rejected.");
      setTransferRejectForm({ comments: "" });
    } catch (err: any) {
      showToast("error", err.message || "Failed to reject transfer.");
    }
  };

  // Maintenance Handlers
  const handleApproveMaintenance = async (id: string) => {
    const technician = prompt("Assign technician name to dispatch immediately:", "Odoo Tech Lab");
    if (technician === null) return;
    try {
      await api.approveMaintenance(id, technician);
      await onRefreshData();
      showToast("success", "Maintenance approved and technician dispatched.");
    } catch (err: any) {
      showToast("error", err.message || "Failed to dispatch maintenance.");
    }
  };

  const handleResolveMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaintenance) return;
    try {
      await api.resolveMaintenance(selectedMaintenance.id);
      await onRefreshData();
      setModalType(null);
      setSelectedMaintenance(null);
      showToast("success", "Maintenance ticket marked resolved.");
    } catch (err: any) {
      showToast("error", err.message || "Failed to resolve maintenance.");
    }
  };

  // CSV Bulk Import
  const handleCsvImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvImportText.trim()) return;
    try {
      // Split by newline
      const lines = csvImportText.trim().split("\n");
      const headers = lines[0].split(",");
      let successCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",");
        if (values.length < 2) continue;

        const assetObj: any = {
          name: values[0]?.trim(),
          serialNumber: values[1]?.trim() || `SN-${Math.floor(Math.random() * 10000000)}`,
          category: (values[2]?.trim() || "Laptop") as AssetCategory,
          purchaseCost: parseFloat(values[3] || "1200"),
          warrantyMonths: parseInt(values[4] || "24"),
          condition: (values[5]?.trim() || "New") as AssetCondition,
          location: values[6]?.trim() || "SF Head Office",
          isBookable: values[7]?.trim().toLowerCase() === "true"
        };

        await api.createAsset(assetObj);
        successCount++;
      }

      await onRefreshData();
      setModalType(null);
      setCsvImportText("");
      showToast("success", `Bulk Import complete. Added ${successCount} assets.`);
    } catch (err: any) {
      showToast("error", err.message || "Failed bulk import.");
    }
  };

  // System Settings submit
  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveSystemSettings(systemSettings);
      showToast("success", "Global configuration saved on ERP server.");
    } catch (err: any) {
      showToast("error", err.message || "Failed to save settings.");
    }
  };

  // Export & Print actions
  const handleExportCSV = (type: "assets" | "employees" | "bookings" | "maintenances" | "departments") => {
    let headers: string[] = [];
    let rows: any[] = [];
    let fileName = `AssetFlow_Admin_${type}_ledger.csv`;

    if (type === "assets") {
      headers = ["Asset Tag", "Asset Name", "Category", "Cost", "Location", "Warranty", "Status", "Condition"];
      rows = assets.map(a => [a.tag, a.name, a.category, a.purchaseCost, a.location, a.warrantyMonths, a.status, a.condition]);
    } else if (type === "employees") {
      headers = ["ID", "Name", "Email", "Role", "Department", "Status"];
      rows = users.map(u => [u.id, u.name, u.email, u.role, u.departmentId, u.status]);
    } else if (type === "bookings") {
      headers = ["Booking Title", "Resource Name", "Category", "Reserved By", "Start Time", "End Time", "Status"];
      rows = bookings.map(b => [b.title, b.assetName, b.assetCategory, b.userName, b.start, b.end, b.status]);
    } else if (type === "departments") {
      headers = ["ID", "Department Name", "Parent ID", "Status"];
      rows = departments.map(d => [d.id, d.name, d.parentId || "None", d.status]);
    } else {
      headers = ["Service Ticket", "Category", "Asset ID", "Priority", "Issue Details", "Technician", "Status"];
      rows = maintenances.map(m => [m.id, m.assetName, m.assetTag, m.priority, m.description, m.technicianName || "None", m.status]);
    }

    const csvContent = [headers.join(","), ...rows.map(r => r.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.click();
    showToast("success", `Exported ${type} database records.`);
  };

  const handlePrintSelectedReport = (type: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let content = "";
    if (type === "assets") {
      content = assets.map(a => `
        <tr>
          <td style="padding:10px; border-bottom:1px solid #ddd; font-family:monospace;">${a.tag}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd; font-weight:bold;">${a.name}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd;">${a.category}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd;">₹${a.purchaseCost.toLocaleString()}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd;">${a.location}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd;"><span style="padding:2px 6px; background:#f1f5f9; border-radius:4px; font-size:10px;">${a.status}</span></td>
        </tr>
      `).join("");
    } else if (type === "employees") {
      content = users.map(u => `
        <tr>
          <td style="padding:10px; border-bottom:1px solid #ddd; font-family:monospace;">${u.id}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd; font-weight:bold;">${u.name}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd;">${u.email}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd;">${u.role}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd;">${u.departmentId || "None"}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd;">${u.status}</td>
        </tr>
      `).join("");
    } else if (type === "bookings") {
      content = bookings.map(b => `
        <tr>
          <td style="padding:10px; border-bottom:1px solid #ddd;">${b.title}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd; font-weight:bold;">${b.assetName}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd;">${b.userName}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd;">${new Date(b.start).toLocaleString('en-IN')}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd;">${new Date(b.end).toLocaleString('en-IN')}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd;">${b.status}</td>
        </tr>
      `).join("");
    } else {
      content = maintenances.map(m => `
        <tr>
          <td style="padding:10px; border-bottom:1px solid #ddd; font-family:monospace;">${m.id}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd; font-weight:bold;">${m.assetName}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd;">${m.reportedByName}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd;">${m.description}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd;">${m.priority}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd;">${m.status}</td>
        </tr>
      `).join("");
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>AssetFlow Corporate Director Audit List</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; margin: 40px; }
            h1 { font-size: 24px; font-weight: bold; margin-bottom: 5px; color: #1e3a8a; border-bottom: 3px solid #2563eb; padding-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 25px; text-align: left; font-size: 11px; }
            th { background-color: #f8fafc; padding: 12px 10px; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; }
            tr:hover { background-color: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>AssetFlow Enterprise ERP Registry Report (${type.toUpperCase()})</h1>
          <p>Generated on: ${new Date().toLocaleString('en-IN')} • Authorized Director ID: ${currentUser.name}</p>
          <table>
            <thead>
              <tr>
                ${type === "assets" ? "<th>TAG CODE</th><th>ASSET NAME</th><th>CATEGORY</th><th>VALUATION</th><th>LOCATION</th><th>STATUS</th>" : ""}
                ${type === "employees" ? "<th>ID</th><th>EMPLOYEE NAME</th><th>EMAIL</th><th>ROLE</th><th>DEPARTMENT</th><th>STATUS</th>" : ""}
                ${type === "bookings" ? "<th>RESERVATION</th><th>RESOURCE</th><th>RESERVED BY</th><th>START TIME</th><th>END TIME</th><th>STATUS</th>" : ""}
                ${type === "maintenances" ? "<th>TICKET ID</th><th>ASSET RESOURCE</th><th>REPORTED BY</th><th>ISSUE SUMMARY</th><th>PRIORITY</th><th>STATUS</th>" : ""}
              </tr>
            </thead>
            <tbody>
              ${content}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const isDark = theme === "dark";

  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("laptop")) return <Laptop className="w-3.5 h-3.5 text-[#64748B]" />;
    if (cat.includes("monitor")) return <Monitor className="w-3.5 h-3.5 text-[#64748B]" />;
    if (cat.includes("server")) return <Server className="w-3.5 h-3.5 text-[#64748B]" />;
    if (cat.includes("mobile") || cat.includes("phone")) return <Smartphone className="w-3.5 h-3.5 text-[#64748B]" />;
    if (cat.includes("vehicle") || cat.includes("car")) return <Car className="w-3.5 h-3.5 text-[#64748B]" />;
    if (cat.includes("room") || cat.includes("meeting")) return <Users className="w-3.5 h-3.5 text-[#64748B]" />;
    if (cat.includes("desk") || cat.includes("furniture")) return <Layout className="w-3.5 h-3.5 text-[#64748B]" />;
    return <Package className="w-3.5 h-3.5 text-[#64748B]" />;
  };

  const getStatusBadge = (status: AssetStatus) => {
    const iconClass = "w-3 h-3 shrink-0";
    switch (status) {
      case AssetStatus.Available:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">
            <CheckCircle2 className={iconClass} />
            {status}
          </span>
        );
      case AssetStatus.Allocated:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full">
            <User className={iconClass} />
            {status}
          </span>
        );
      case AssetStatus.Reserved:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full">
            <CalendarIcon className={iconClass} />
            {status}
          </span>
        );
      case AssetStatus.UnderMaintenance:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full">
            <Hammer className={iconClass} />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full">
            <AlertTriangle className={iconClass} />
            {status}
          </span>
        );
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-300 font-sans flex ${isDark ? "bg-[#090D16] text-slate-100" : "bg-[#F8FAFC] text-[#0F172A]"}`}>
      
      {/* =========================
          ADMIN SIDEBAR
         ========================= */}
      <aside className={`${isSidebarOpen ? "w-64" : "w-16"} border-r border-slate-800 transition-all duration-300 flex flex-col shrink-0 relative bg-[#0F172A] text-slate-300`}>
        
        {/* Brand Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
              AF
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="font-display font-bold text-sm tracking-tight text-white">
                  AssetFlow
                </span>
                <span className="text-[9px] font-mono leading-none text-slate-400">ADMIN CONSOLE</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg cursor-pointer hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isSidebarOpen && "rotate-180"}`} />
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="p-2 space-y-1 flex-grow overflow-y-auto">
          {[
            { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
            { id: "assets", label: "Assets", icon: Layers },
            { id: "employees", label: "Employees", icon: Users },
            { id: "departments", label: "Departments", icon: Building2 },
            { id: "bookings", label: "Bookings", icon: CalendarIcon },
            { id: "transfers", label: "Transfers", icon: ArrowRightLeft },
            { id: "maintenance", label: "Maintenance", icon: Hammer },
            { id: "logs", label: "Audit Logs", icon: ClipboardList },
            { id: "reports", label: "Reports", icon: FileBarChart2 },
            { id: "settings", label: "Settings", icon: SettingsIcon },
          ].map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition text-xs font-semibold cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/10 font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                } ${!isSidebarOpen && "justify-center"}`}
              >
                <Icon className="w-4 h-4" />
                {isSidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Info Lower Drawer */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {onSwitchToEmployeeView && (
            <button
              onClick={onSwitchToEmployeeView}
              className={`w-full flex items-center gap-2 px-3 py-2 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 rounded-xl transition text-xs font-bold cursor-pointer ${
                !isSidebarOpen && "justify-center"
              }`}
              title="Return to Employee Workspace"
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {isSidebarOpen && <span>Employee Desk</span>}
            </button>
          )}

          {isSidebarOpen && (
            <div className="p-2 rounded-xl border border-slate-800 bg-slate-900/60 text-[10px] space-y-1">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                <h4 className="font-bold truncate text-slate-200">{currentUser.name}</h4>
              </div>
              <p className="text-slate-400 truncate font-mono">Role: {currentUser.role}</p>
            </div>
          )}

          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-xl transition text-xs font-semibold cursor-pointer ${
              !isSidebarOpen && "justify-center"
            }`}
          >
            <LogOut className="w-4 h-4" />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* =========================
          MAIN CONTROLS WRAPPER
         ========================= */}
      <div className="flex-grow flex flex-col min-w-0">
        
        {/* Sticky Header */}
        <header className={`h-16 border-b px-6 flex items-center justify-between gap-4 sticky top-0 z-10 ${
          isDark ? "bg-[#090D16]/90 border-slate-850 backdrop-blur-md text-white" : "bg-white/90 border-slate-200 backdrop-blur-md text-slate-800"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded ${isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
              Admin Panel
            </span>
            <span className="text-slate-400">/</span>
            <span className="text-xs font-bold font-display capitalize">{activeTab} Desk</span>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Sync Datastore Button */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className={`p-2 rounded-xl transition cursor-pointer relative ${
                isDark ? "text-slate-400 hover:text-white hover:bg-slate-850" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
              title="Sync Datastore"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing && "animate-spin"}`} />
            </button>

            {/* Dark/Light Toggle */}
            <button
              onClick={() => onThemeChange(isDark ? "light" : "dark")}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isDark ? "text-slate-400 hover:text-white hover:bg-slate-850" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notification alert inbox */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationDropdownOpen(!isNotificationDropdownOpen)}
                className={`p-2 rounded-xl transition cursor-pointer relative ${
                  isDark ? "text-slate-400 hover:text-white hover:bg-slate-850" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Bell className="w-4 h-4" />
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsNotificationDropdownOpen(false)}></div>
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={`absolute right-0 mt-2 w-80 border rounded-xl shadow-xl p-4 space-y-3 z-40 text-xs ${
                        isDark ? "bg-[#0B1220] border-slate-800" : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="flex justify-between items-center border-b pb-2 dark:border-slate-800">
                        <span className="font-bold">Enterprise Alerts ({notifications.length})</span>
                        <button onClick={handleMarkNotifRead} className="text-[10px] text-blue-600 hover:underline">
                          Clear All
                        </button>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="text-center py-6 text-slate-500">Inbox empty.</p>
                        ) : (
                          notifications.map(n => (
                            <div key={n.id} className={`p-2 border rounded-lg text-xs ${
                              isDark ? "bg-slate-900/60 border-slate-850 text-slate-300" : "bg-slate-50 border-slate-150 text-slate-600"
                            }`}>
                              <h5 className="font-semibold">{n.title}</h5>
                              <p className="text-[10px] leading-relaxed mt-0.5">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Avatar indicator */}
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center border border-blue-500/20 text-white font-bold text-xs uppercase shadow">
                {currentUser.name.slice(0, 2)}
              </span>
            </div>

          </div>
        </header>

        {/* Dynamic Workspace Container */}
        <main className="flex-grow p-6 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          
          {/* Toast Notification */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className={`p-4 rounded-xl border shadow-lg flex gap-3 text-xs items-center fixed top-20 right-6 z-50 max-w-md ${
                  toast.type === "success"
                    ? "bg-green-500/10 border-green-500/20 text-green-400"
                    : toast.type === "error"
                      ? "bg-red-500/10 border-red-500/20 text-red-400"
                      : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                }`}
              >
                {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />}
                {toast.type === "error" && <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                {toast.type === "info" && <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                <p className="font-semibold">{toast.message}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* =========================================================================
              1. ADMIN DASHBOARD VIEW
             ========================================================================= */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Header greeting */}
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-display font-extrabold tracking-tight">Odoo Command Slate</h1>
                  <p className="text-xs text-slate-500 mt-1">Live corporate parameters and asset accounting ledger</p>
                </div>
                <div className="flex gap-2.5">
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold rounded-full">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
                    ERP ENGINE ACTIVE
                  </span>
                </div>
              </div>

              {/* KPI CARDS GRID */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {[
                  { title: "Total Assets", count: totalAssets, icon: Layers, color: "text-blue-500", desc: "Corporate Registry", tab: "assets" },
                  { title: "Active Assets", count: activeAssets, icon: Activity, color: "text-emerald-500", desc: "Currently Assigned", tab: "assets" },
                  { title: "Assigned Assets", count: assignedAssets, icon: Users, color: "text-indigo-500", desc: "Allocated Resources", tab: "assets" },
                  { title: "Available Assets", count: availableAssets, icon: CheckCircle2, color: "text-sky-500", desc: "Free in Sandbox", tab: "assets" },
                  { title: "Total Employees", count: totalEmployees, icon: Users, color: "text-violet-500", desc: "W-2 Resource Pool", tab: "employees" },
                  { title: "Active Bookings", count: activeBookings, icon: CalendarIcon, color: "text-amber-500", desc: "Resource Reservs", tab: "bookings" },
                  { title: "Pending Approvals", count: pendingApprovals, icon: Shield, color: "text-yellow-500", desc: "Awaiting Action", tab: "transfers" },
                  { title: "Open Tickets", count: openMaintenance, icon: Hammer, color: "text-red-500", desc: "Active Service Req", tab: "maintenance" },
                  { title: "Pending Transfers", count: pendingTransfers, icon: ArrowRightLeft, color: "text-pink-500", desc: "Dept Flow Requests", tab: "transfers" }
                ].map((kpi, idx) => {
                  const Icon = kpi.icon;
                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveTab(kpi.tab)}
                      className={`p-4 rounded-2xl border transition duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer flex flex-col justify-between ${
                        isDark ? "bg-[#0B1220] border-slate-850 hover:border-slate-700" : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-mono font-bold uppercase text-slate-500 truncate">{kpi.title}</span>
                        <Icon className={`w-4 h-4 ${kpi.color}`} />
                      </div>
                      <div className="mt-2">
                        <span className="text-2xl font-bold font-mono">{kpi.count}</span>
                        <p className="text-[9px] text-slate-400 mt-0.5">{kpi.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* QUICK ACTIONS BUTTONS */}
              <div className={`p-4 rounded-2xl border ${isDark ? "bg-[#0B1220] border-slate-850" : "bg-white border-slate-200"}`}>
                <h3 className="text-xs font-mono font-bold uppercase text-slate-500 mb-3">Enterprise Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: "Register Asset", icon: Plus, action: () => setModalType("registerAsset") },
                    { label: "Add Employee", icon: UserPlus, action: () => setModalType("addEmployee") },
                    { label: "Assign Asset", icon: ArrowRightLeft, action: () => setModalType("assignAsset") },
                    { label: "Approve Booking", icon: Check, action: () => setActiveTab("bookings") },
                    { label: "Approve Transfer", icon: Shield, action: () => setActiveTab("transfers") },
                    { label: "Create Department", icon: Building2, action: () => setModalType("createDepartment") }
                  ].map((act, idx) => {
                    const Icon = act.icon;
                    return (
                      <button
                        key={idx}
                        onClick={act.action}
                        className="flex items-center gap-2 justify-center py-2.5 px-3 rounded-xl border text-xs font-semibold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition duration-200 cursor-pointer text-center"
                      >
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{act.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ANALYTICS CHARTS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Category Breakdown */}
                <div className={`p-5 rounded-2xl border ${isDark ? "bg-[#0B1220] border-slate-850" : "bg-white border-slate-200"}`}>
                  <h3 className="text-xs font-mono font-bold uppercase text-slate-500 mb-4">Inventory Category Allocation</h3>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getCategoryBreakdown()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {getCategoryBreakdown().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Condition Breakdown */}
                <div className={`p-5 rounded-2xl border ${isDark ? "bg-[#0B1220] border-slate-850" : "bg-white border-slate-200"}`}>
                  <h3 className="text-xs font-mono font-bold uppercase text-slate-500 mb-4">Hardware Condition Ledger</h3>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getConditionBreakdown()}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          paddingAngle={1}
                          dataKey="value"
                        >
                          {getConditionBreakdown().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Departmental Metrics */}
                <div className={`p-5 rounded-2xl border lg:col-span-1 ${isDark ? "bg-[#0B1220] border-slate-850" : "bg-white border-slate-200"}`}>
                  <h3 className="text-xs font-mono font-bold uppercase text-slate-500 mb-4">Departmental Resource Matrix</h3>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getDepartmentStats()}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                        <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} />
                        <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        <Bar dataKey="Assets" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Employees" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* RECENT ACTIVITY LOGS */}
              <div className={`p-5 rounded-2xl border ${isDark ? "bg-[#0B1220] border-slate-850" : "bg-white border-slate-200"}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-mono font-bold uppercase text-slate-500">Live Workspace Activity Log</h3>
                  <button onClick={() => setActiveTab("logs")} className="text-[10px] text-blue-500 hover:underline">
                    View Comprehensive Logs
                  </button>
                </div>
                <div className="space-y-3">
                  {logs.slice(0, 5).map(log => (
                    <div
                      key={log.id}
                      className={`p-3 rounded-xl border flex justify-between items-center text-xs ${
                        isDark ? "bg-slate-900/60 border-slate-850 hover:border-slate-800" : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex gap-2.5 items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <div>
                          <p className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-850"}`}>
                            {log.details}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Executed by: {log.userName} • Target: {log.targetType}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* =========================================================================
              2. ASSETS DIRECTORY (CRUD + ADVANCED FILTERS + IMPORT/EXPORT)
             ========================================================================= */}
          {activeTab === "assets" && (
            <div className="space-y-6 animate-fadeIn pb-12">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">Enterprise Assets Directory</h1>
                  <p className="text-xs text-[#64748B] mt-1">Complete corporate hardware, device registry and lifecycle ledger</p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => setModalType("importCsv")}
                    className="py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition duration-200 cursor-pointer"
                  >
                    Bulk Import
                  </button>
                  <button
                    onClick={() => handleExportCSV("assets")}
                    className="py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition duration-200 cursor-pointer flex items-center gap-1.5"
                  >
                    <FileDown className="w-3.5 h-3.5 text-slate-500" /> Export CSV
                  </button>
                  <button
                    onClick={() => setModalType("registerAsset")}
                    className="py-2.5 px-4 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition duration-200 cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Asset
                  </button>
                </div>
              </div>

              {/* SEARCH & FILTERS BAR (FLOATING WHITE TOOLBAR) */}
              <div className={`p-4 rounded-xl border flex flex-col lg:flex-row gap-4 items-center justify-between ${
                isDark ? "bg-[#0B1220] border-slate-850" : "bg-white border-slate-200"
              } shadow-sm`}>
                <div className="relative w-full lg:max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#64748B]" />
                  <input
                    type="text"
                    placeholder="Search by asset tag, name, serial number..."
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-slate-200 focus:border-[#2563EB] focus:bg-white rounded-xl text-xs font-medium text-[#0F172A] placeholder-[#64748B] outline-none transition-all duration-200"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto lg:justify-end">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B]">
                    <Filter className="w-3.5 h-3.5" />
                    <span>Filter by:</span>
                  </div>
                  <select
                    value={assetCategoryFilter}
                    onChange={(e) => setAssetCategoryFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 text-[#0F172A] rounded-xl text-xs font-medium outline-none hover:border-[#2563EB] cursor-pointer transition-all duration-200 min-w-[150px]"
                  >
                    <option value="">All Categories</option>
                    {systemSettings.categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <select
                    value={assetStatusFilter}
                    onChange={(e) => setAssetStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 text-[#0F172A] rounded-xl text-xs font-medium outline-none hover:border-[#2563EB] cursor-pointer transition-all duration-200 min-w-[150px]"
                  >
                    <option value="">All Statuses</option>
                    {Object.values(AssetStatus).map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* RECORD TABLE */}
              <div className={`border rounded-xl overflow-hidden ${
                isDark ? "bg-[#0B1220] border-slate-850" : "bg-white border-slate-200"
              } shadow-sm`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F1F5F9] border-b border-slate-200 text-[#64748B] uppercase text-[10px] font-mono tracking-wider">
                      <tr>
                        <th className="p-3.5 pl-4 text-center w-10">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer align-middle"
                            disabled
                          />
                        </th>
                        <th className="p-3.5 font-bold">TAG CODE</th>
                        <th className="p-3.5 font-bold">ASSET RESOURCE</th>
                        <th className="p-3.5 font-bold">CATEGORY</th>
                        <th className="p-3.5 font-bold">VALUATION</th>
                        <th className="p-3.5 font-bold">LOCATION</th>
                        <th className="p-3.5 font-bold">STATUS</th>
                        <th className="p-3.5 font-bold">CONDITION</th>
                        <th className="p-3.5 font-bold">HOLDER</th>
                        <th className="p-3.5 font-bold text-center">CONTROLS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {assets
                        .filter(a => {
                          const matchesSearch =
                            a.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
                            a.tag.toLowerCase().includes(assetSearch.toLowerCase()) ||
                            a.serialNumber.toLowerCase().includes(assetSearch.toLowerCase());
                          const matchesCategory = assetCategoryFilter ? a.category === assetCategoryFilter : true;
                          const matchesStatus = assetStatusFilter ? a.status === assetStatusFilter : true;
                          return matchesSearch && matchesCategory && matchesStatus;
                        })
                        .map(a => {
                          const holder = users.find(u => u.id === a.currentHolderId);
                          return (
                            <tr
                              key={a.id}
                              className="transition-colors duration-150 border-b border-slate-200/60 even:bg-slate-50/40 hover:bg-[#EFF6FF] text-[#0F172A]"
                            >
                              <td className="p-3.5 text-center align-middle">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer align-middle"
                                />
                              </td>
                              <td className="p-3.5 font-mono font-bold text-[#2563EB]">{a.tag}</td>
                              <td className="p-3.5">
                                <div>
                                  <p className="font-extrabold text-xs text-[#0F172A] tracking-tight">{a.name}</p>
                                  <p className="text-[10px] text-[#64748B] font-mono mt-0.5">SN: {a.serialNumber}</p>
                                </div>
                              </td>
                              <td className="p-3.5">
                                <div className="flex items-center gap-1.5 text-[#0F172A] font-medium">
                                  {getCategoryIcon(a.category)}
                                  <span>{a.category}</span>
                                </div>
                              </td>
                              <td className="p-3.5 font-mono font-bold text-[#0F172A]">₹{a.purchaseCost.toLocaleString()}</td>
                              <td className="p-3.5">
                                <div className="flex items-center gap-1.5 text-[#64748B] font-medium">
                                  <MapPin className="w-3.5 h-3.5 text-[#64748B]" />
                                  <span>{a.location}</span>
                                </div>
                              </td>
                              <td className="p-3.5">
                                {getStatusBadge(a.status)}
                              </td>
                              <td className="p-3.5">
                                <span className="font-semibold text-xs text-[#64748B]">{a.condition}</span>
                              </td>
                              <td className="p-3.5">
                                {holder ? (
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-5.5 h-5.5 bg-blue-50 text-[#2563EB] text-[10px] rounded-full flex items-center justify-center font-bold border border-blue-100">
                                      {holder.name.slice(0, 1)}
                                    </div>
                                    <span className="truncate max-w-[100px] text-xs font-medium text-[#0F172A]">{holder.name}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 font-mono text-[11px] italic">Pool</span>
                                )}
                              </td>
                              <td className="p-3.5 text-center space-x-1">
                                <button
                                  onClick={() => {
                                    setSelectedAsset(a);
                                    setAssetForm({
                                      name: a.name,
                                      serialNumber: a.serialNumber,
                                      category: a.category,
                                      purchaseCost: String(a.purchaseCost),
                                      warrantyMonths: String(a.warrantyMonths),
                                      condition: a.condition,
                                      location: a.location,
                                      isBookable: a.isBookable
                                    });
                                    setModalType("editAsset");
                                  }}
                                  className="p-1.5 hover:bg-blue-50 text-[#2563EB] rounded-lg cursor-pointer inline-flex items-center justify-center transition-colors border border-transparent hover:border-blue-100"
                                  title="Edit Record"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {a.currentHolderId ? (
                                  <button
                                    onClick={() => handleUnassignAsset(a.id)}
                                    className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg cursor-pointer inline-flex items-center justify-center transition-colors border border-transparent hover:border-amber-100"
                                    title="Unassign & Pool Asset"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setAssignForm({ assetId: a.id, employeeId: "", notes: "" });
                                      setModalType("assignAsset");
                                    }}
                                    className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg cursor-pointer inline-flex items-center justify-center transition-colors border border-transparent hover:border-emerald-100"
                                    title="Assign to Employee"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteAsset(a.id)}
                                  className="p-1.5 hover:bg-red-50 text-[#EF4444] rounded-lg cursor-pointer inline-flex items-center justify-center transition-colors border border-transparent hover:border-red-100"
                                  title="Delete Asset"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              3. EMPLOYEES DIRECTORY (CRUD + ASSIGNED ASSETS + ROLE MODIFIERS)
             ========================================================================= */}
          {activeTab === "employees" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-lg font-bold">W-2 Employee Directory</h1>
                  <p className="text-xs text-slate-500">Manage corporate staff members, role thresholds, and department placements</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExportCSV("employees")}
                    className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Export Directory
                  </button>
                  <button
                    onClick={() => setModalType("addEmployee")}
                    className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Employee
                  </button>
                </div>
              </div>

              {/* SEARCH & FILTERS BAR */}
              <div className={`p-3 rounded-xl border flex flex-col md:flex-row gap-3 items-center ${isDark ? "bg-[#0B1220] border-slate-850" : "bg-white border-slate-200"}`}>
                <div className="relative w-full md:w-1/2">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search employees by name or email..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 bg-transparent border rounded-xl text-xs outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-3 w-full md:w-1/2 justify-end">
                  <select
                    value={employeeDeptFilter}
                    onChange={(e) => setEmployeeDeptFilter(e.target.value)}
                    className={`p-1.5 rounded-xl border text-xs outline-none bg-transparent ${isDark ? "border-slate-800" : "border-slate-200"}`}
                  >
                    <option value="">-- All Departments --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* EMPLOYEES GRID VIEW WITH CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {users
                  .filter(u => {
                    const matchesSearch =
                      u.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
                      u.email.toLowerCase().includes(employeeSearch.toLowerCase());
                    const matchesDept = employeeDeptFilter ? u.departmentId === employeeDeptFilter : true;
                    return matchesSearch && matchesDept;
                  })
                  .map(u => {
                    const dept = departments.find(d => d.id === u.departmentId);
                    const userAssets = assets.filter(a => a.currentHolderId === u.id);
                    return (
                      <div
                        key={u.id}
                        className={`p-4 rounded-2xl border transition duration-300 flex flex-col justify-between ${
                          isDark ? "bg-[#0B1220] border-slate-850 hover:border-slate-700" : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex gap-3 items-center">
                              <div className="relative w-10 h-10 shrink-0">
                                {u.avatar ? (
                                  <img 
                                    src={u.avatar} 
                                    alt={u.name} 
                                    className="w-10 h-10 rounded-full border border-blue-500/20 object-cover" 
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      const fallbackEl = e.currentTarget.nextElementSibling;
                                      if (fallbackEl) fallbackEl.classList.remove('hidden');
                                    }}
                                  />
                                ) : null}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold font-display uppercase text-xs border border-blue-500/20 ${u.avatar ? "hidden" : ""} ${
                                  u.role === Role.Admin 
                                    ? "bg-red-500/10 text-red-500" 
                                    : u.role === Role.AssetManager
                                      ? "bg-indigo-500/10 text-indigo-500"
                                      : "bg-blue-500/10 text-blue-500"
                                }`}>
                                  {u.name ? u.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??"}
                                </div>
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-bold text-xs truncate">{u.name}</h3>
                                <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded ${
                              u.role === Role.Admin
                                ? "bg-red-500/10 text-red-400"
                                : u.role === Role.AssetManager
                                  ? "bg-indigo-500/10 text-indigo-400"
                                  : "bg-blue-500/10 text-blue-400"
                            }`}>
                              {u.role}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] border-t dark:border-slate-850 pt-3">
                            <div>
                              <span className="text-slate-500">Department</span>
                              <p className="font-semibold">{dept ? dept.name : "None assigned"}</p>
                            </div>
                            <div>
                              <span className="text-slate-500">Status</span>
                              <p className="font-semibold">{u.status}</p>
                            </div>
                          </div>

                          <div className="mt-3 text-[11px]">
                            <span className="text-slate-500">Assigned Corporate Assets ({userAssets.length})</span>
                            {userAssets.length === 0 ? (
                              <p className="text-slate-500 italic text-[10px] mt-0.5">No devices checkout</p>
                            ) : (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {userAssets.map(a => (
                                  <span key={a.id} className="text-[9px] font-mono bg-blue-500/10 border border-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                                    {a.tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t dark:border-slate-850 flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              setSelectedEmployee(u);
                              setEmployeeForm({
                                name: u.name,
                                email: u.email,
                                role: u.role,
                                departmentId: u.departmentId || "",
                                status: u.status,
                                password: ""
                              });
                              setModalType("editEmployee");
                            }}
                            className="py-1 px-2.5 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(u.id)}
                            className="py-1 px-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* =========================================================================
              4. DEPARTMENTS DIRECTORY
             ========================================================================= */}
          {activeTab === "departments" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-lg font-bold">Organizational Departments</h1>
                  <p className="text-xs text-slate-500">Workspace structure and parent hierarchical mapping</p>
                </div>
                <button
                  onClick={() => setModalType("createDepartment")}
                  className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Create Department
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map(d => {
                  const head = users.find(u => u.id === d.headId);
                  const parentDept = departments.find(p => p.id === d.parentId);
                  const employeesCount = users.filter(u => u.departmentId === d.id).length;
                  const assetsInDept = assets.filter(a => a.departmentId === d.id).length;

                  return (
                    <div
                      key={d.id}
                      className={`p-4 rounded-2xl border ${isDark ? "bg-[#0B1220] border-slate-850" : "bg-white border-slate-200"}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-sm text-blue-500">{d.name}</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Code: {d.id}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                          d.status === "Active" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                        }`}>
                          {d.status}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-[11px] border-t dark:border-slate-850 pt-3">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Director / Head</span>
                          <span className="font-semibold">{head ? head.name : "Unassigned"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Parent Tree placement</span>
                          <span className="font-semibold">{parentDept ? parentDept.name : "Main Core"}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-900">
                          <span className="text-slate-400">Total Personnel</span>
                          <span className="font-bold text-slate-300 font-mono">{employeesCount} Staff</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Scoped Assets</span>
                          <span className="font-bold text-slate-300 font-mono">{assetsInDept} Assets</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================================
              5. BOOKINGS DESK
             ========================================================================= */}
          {activeTab === "bookings" && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h1 className="text-lg font-bold">Shared Resource Booking Ledger</h1>
                <p className="text-xs text-slate-500">Monitor active reservations, upcoming leases, and handle employee schedules</p>
              </div>

              {/* BOOKING CALENDAR TIMELINE GRAPHIC */}
              <div className={`p-4 rounded-2xl border ${isDark ? "bg-[#0B1220] border-slate-850" : "bg-white border-slate-200"}`}>
                <h3 className="text-xs font-mono font-bold uppercase text-slate-500 mb-4">Enterprise Resource Schedule</h3>
                <div className="space-y-3">
                  {bookings.length === 0 ? (
                    <p className="text-center text-slate-500 py-8 text-xs">No reservations logged.</p>
                  ) : (
                    bookings.map(b => {
                      const isCancelled = b.status === "Cancelled";
                      return (
                        <div
                          key={b.id}
                          className={`p-3.5 rounded-xl border flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs ${
                            isDark ? "bg-slate-900/40 border-slate-850" : "bg-slate-50 border-slate-150"
                          }`}
                        >
                          <div>
                            <div className="flex gap-2 items-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                                b.assetCategory === AssetCategory.MeetingRoom
                                  ? "bg-indigo-500/10 text-indigo-400"
                                  : "bg-amber-500/10 text-amber-400"
                              }`}>
                                {b.assetCategory}
                              </span>
                              <h4 className="font-bold text-blue-500">{b.assetName}</h4>
                            </div>
                            <h5 className="font-semibold text-slate-300 mt-1">{b.title}</h5>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Reserved by: {b.userName} • ID: {b.id}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-1">
                              Lease: {new Date(b.start).toLocaleString('en-IN')} to {new Date(b.end).toLocaleString('en-IN')}
                            </p>
                          </div>

                          <div className="flex gap-2 items-center self-end sm:self-auto">
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                              b.status === "Upcoming"
                                ? "bg-green-500/10 text-green-400"
                                : b.status === "Cancelled"
                                  ? "bg-red-500/10 text-red-400"
                                  : "bg-blue-500/10 text-blue-400"
                            }`}>
                              {b.status}
                            </span>
                            {!isCancelled && (
                              <div className="flex gap-1">
                                {b.status === "Upcoming" && (
                                  <button
                                    onClick={() => handleApproveBooking(b.id)}
                                    className="p-1.5 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded cursor-pointer"
                                    title="Approve / Confirm Reservation"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleCancelBooking(b.id)}
                                  className="p-1.5 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded cursor-pointer"
                                  title="Cancel Booking"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              6. TRANSFERS DESK
             ========================================================================= */}
          {activeTab === "transfers" && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h1 className="text-lg font-bold">Inter-departmental Transfer flow</h1>
                <p className="text-xs text-slate-500">Approve, decline and complete hardware placements across corporate sectors</p>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? "bg-[#0B1220] border-slate-850" : "bg-white border-slate-200"}`}>
                <h3 className="text-xs font-mono font-bold uppercase text-slate-500 mb-4">Pending Transfer Ledger</h3>
                <div className="space-y-3">
                  {transfers.filter(t => t.status === "Pending").length === 0 ? (
                    <p className="text-center text-slate-500 py-8 text-xs">No incoming transfer requests pending approval.</p>
                  ) : (
                    transfers
                      .filter(t => t.status === "Pending")
                      .map(t => {
                        const targetDept = departments.find(d => d.id === t.targetDepartmentId);
                        const sourceDept = departments.find(d => d.id === t.sourceDepartmentId);
                        return (
                          <div
                            key={t.id}
                            className={`p-3.5 rounded-xl border flex flex-col md:flex-row justify-between md:items-center gap-3 text-xs ${
                              isDark ? "bg-slate-900/40 border-slate-850" : "bg-slate-50 border-slate-150"
                            }`}
                          >
                            <div>
                              <div className="flex gap-2 items-center">
                                <span className="font-mono font-bold text-blue-500">{t.assetTag}</span>
                                <span className="text-slate-400">|</span>
                                <h4 className="font-bold">{t.assetName}</h4>
                              </div>
                              <p className="text-slate-400 mt-1">
                                Requester: <span className="font-semibold text-slate-200">{t.requestedByName}</span>
                              </p>
                              <div className="flex items-center gap-2 mt-2 font-mono text-[10px] text-slate-500 bg-slate-950/40 p-1.5 rounded-lg border dark:border-slate-850">
                                <span>Source: {sourceDept ? sourceDept.name : "Central"}</span>
                                <ChevronRight className="w-3 h-3 text-slate-600" />
                                <span>Target Placement: {targetDept ? targetDept.name : "None"}</span>
                              </div>
                            </div>

                            <div className="flex gap-2 self-end md:self-auto">
                              <button
                                onClick={() => handleApproveTransfer(t.id)}
                                className="py-1 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer transition text-[11px]"
                              >
                                Approve Transfer
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedTransfer(t);
                                  setTransferRejectForm({ comments: "" });
                                  setModalType("rejectTransfer");
                                }}
                                className="py-1 px-3 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold rounded-lg cursor-pointer transition text-[11px]"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* TRANSFER HISTORY */}
              <div className={`p-4 rounded-2xl border ${isDark ? "bg-[#0B1220] border-slate-850" : "bg-white border-slate-200"}`}>
                <h3 className="text-xs font-mono font-bold uppercase text-slate-500 mb-3">Historic Transfer Ledger</h3>
                <div className="space-y-2">
                  {transfers.filter(t => t.status !== "Pending").map(t => (
                    <div key={t.id} className="p-2.5 rounded-lg border dark:border-slate-850 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-semibold">{t.assetName} ({t.assetTag})</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Approved by: {t.approvedByName || "System"}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                        t.status === "Approved" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              7. MAINTENANCE DESK
             ========================================================================= */}
          {activeTab === "maintenance" && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h1 className="text-lg font-bold">Enterprise Maintenance Desk</h1>
                <p className="text-xs text-slate-500">Service tickets, technician dispatch, hardware calibration, and physical repairs</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {maintenances.map(m => {
                  const isPending = m.status === "Pending";
                  const isInProgress = m.status === "Approved" || m.status === "In-Progress";

                  return (
                    <div
                      key={m.id}
                      className={`p-4 rounded-2xl border flex flex-col md:flex-row justify-between md:items-center gap-4 ${
                        isDark ? "bg-[#0B1220] border-slate-850" : "bg-white border-slate-200"
                      }`}
                    >
                      <div>
                        <div className="flex gap-2 items-center">
                          <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded ${
                            m.priority === "Critical" || m.priority === "High"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-blue-500/10 text-blue-400"
                          }`}>
                            {m.priority} Priority
                          </span>
                          <span className="text-slate-500 font-mono">{m.assetTag}</span>
                          <h4 className="font-bold text-blue-500">{m.assetName}</h4>
                        </div>
                        <p className="font-semibold mt-2 text-xs text-slate-300">Issue: {m.description}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Reported by: {m.reportedByName} • Assigned Tech: {m.technicianName || "Awaiting dispatch"}
                        </p>
                      </div>

                      <div className="flex gap-2 items-center self-end md:self-auto text-xs">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                          m.status === "Resolved"
                            ? "bg-green-500/10 text-green-400"
                            : m.status === "Pending"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-blue-500/10 text-blue-400"
                        }`}>
                          {m.status}
                        </span>

                        <div className="flex gap-1">
                          {isPending && (
                            <button
                              onClick={() => handleApproveMaintenance(m.id)}
                              className="py-1 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg cursor-pointer transition text-[11px]"
                            >
                              Dispatch Technician
                            </button>
                          )}
                          {isInProgress && (
                            <button
                              onClick={() => {
                                setSelectedMaintenance(m);
                                setMaintenanceResolveForm({ technicianName: m.technicianName || "", actionNotes: "" });
                                setModalType("resolveMaintenance");
                              }}
                              className="py-1 px-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg cursor-pointer transition text-[11px]"
                            >
                              Resolve Ticket
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================================
              8. AUDIT LOGS DESK
             ========================================================================= */}
          {activeTab === "logs" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-lg font-bold">System Security Audit Logs</h1>
                  <p className="text-xs text-slate-500">Unfiltered logs tracking every corporate modification, login, and ledger entry</p>
                </div>
                <button
                  onClick={() => handleExportCSV("departments")}
                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Export System State
                </button>
              </div>

              <div className={`p-4 rounded-xl border max-h-[500px] overflow-y-auto space-y-2 ${isDark ? "bg-[#0B1220] border-slate-850" : "bg-white border-slate-200"}`}>
                {logs.map(log => (
                  <div key={log.id} className="p-2.5 rounded border dark:border-slate-850 text-xs flex justify-between items-center font-mono">
                    <div className="space-y-1">
                      <div className="flex gap-2 items-center">
                        <span className="text-blue-500 font-bold">[{log.action}]</span>
                        <span className="text-slate-500">by</span>
                        <span className="font-semibold text-slate-300">{log.userName}</span>
                      </div>
                      <p className="text-slate-400 font-sans">{log.details}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 flex-shrink-0 ml-4">
                      {new Date(log.createdAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================================
              9. REPORTS GENERATOR (PDF & EXCEL EXPORTS)
             ========================================================================= */}
          {activeTab === "reports" && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h1 className="text-lg font-bold">ERP Corporate Reporting Deck</h1>
                <p className="text-xs text-slate-500">Generate high-fidelity, corporate checklist reports for physical audits</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { title: "Asset Audit Report", type: "assets", desc: "Hardware lifecycle list" },
                  { title: "Employee Directory", type: "employees", desc: "Employee allocation list" },
                  { title: "Resource Bookings", type: "bookings", desc: "Calendar leases report" },
                  { title: "Maintenance Tickets", type: "maintenances", desc: "Hardware repair ledger" }
                ].map((rep, idx) => (
                  <div
                    key={idx}
                    className={`p-5 rounded-2xl border space-y-4 flex flex-col justify-between ${
                      isDark ? "bg-[#0B1220] border-slate-850" : "bg-white border-slate-200"
                    }`}
                  >
                    <div>
                      <h3 className="font-bold text-sm text-blue-500">{rep.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">{rep.desc}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleExportCSV(rep.type as any)}
                        className="py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-[10px] cursor-pointer text-center"
                      >
                        CSV Excel
                      </button>
                      <button
                        onClick={() => handlePrintSelectedReport(rep.type)}
                        className="py-1.5 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg text-[10px] cursor-pointer text-center"
                      >
                        Print PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================================
              10. GLOBAL SYSTEM SETTINGS VIEW
             ========================================================================= */}
          {activeTab === "settings" && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h1 className="text-lg font-bold">System Configuration Desk</h1>
                <p className="text-xs text-slate-500">Configure global currencies, fiscal periods, device categories, and physical branch locations</p>
              </div>

              <form onSubmit={handleSettingsSubmit} className={`p-6 rounded-2xl border space-y-6 ${isDark ? "bg-[#0B1220] border-slate-850" : "bg-white border-slate-200"}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-bold uppercase font-mono text-[10px]">Company Name</label>
                    <input
                      type="text"
                      value={systemSettings.companyName}
                      onChange={(e) => setSystemSettings({ ...systemSettings, companyName: e.target.value })}
                      className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl outline-none text-white focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-bold uppercase font-mono text-[10px]">Valuation Currency</label>
                    <select
                      value={systemSettings.currency}
                      onChange={(e) => setSystemSettings({ ...systemSettings, currency: e.target.value })}
                      className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl text-white"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="INR">INR (₹)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-bold uppercase font-mono text-[10px]">Corporate Timezone</label>
                    <select
                      value={systemSettings.timezone}
                      onChange={(e) => setSystemSettings({ ...systemSettings, timezone: e.target.value })}
                      className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl text-white"
                    >
                      <option value="UTC-7">Pacific (UTC-7)</option>
                      <option value="UTC-5">Eastern (UTC-5)</option>
                      <option value="UTC+0">GMT (UTC+0)</option>
                      <option value="UTC+9">Tokyo (UTC+9)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-bold uppercase font-mono text-[10px]">Fiscal Year Kickoff</label>
                    <input
                      type="text"
                      value={systemSettings.fiscalYearStart}
                      onChange={(e) => setSystemSettings({ ...systemSettings, fiscalYearStart: e.target.value })}
                      className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl outline-none text-white focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="border-t dark:border-slate-850 pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="py-2.5 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition cursor-pointer"
                  >
                    Save Global Enterprise Configurations
                  </button>
                </div>
              </form>
            </div>
          )}

        </main>
      </div>

      {/* =========================================================================
          MODALS CONTAINER
         ========================================================================= */}
      <AnimatePresence>
        {modalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setModalType(null)}></div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`relative max-w-lg w-full border rounded-2xl shadow-2xl p-6 overflow-hidden z-10 text-xs ${
                isDark ? "bg-[#0B1220] border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"
              }`}
            >
              <div className="flex justify-between items-center border-b dark:border-slate-850 pb-3 mb-4">
                <h3 className="font-bold text-sm capitalize">
                  {modalType === "registerAsset" && "Register Corporate Asset"}
                  {modalType === "editAsset" && "Edit Asset Configuration"}
                  {modalType === "addEmployee" && "Add New Directory Employee"}
                  {modalType === "editEmployee" && "Modify Employee Details"}
                  {modalType === "assignAsset" && "Allocate Device Pool"}
                  {modalType === "createDepartment" && "Create Workplace Department"}
                  {modalType === "resolveMaintenance" && "Complete Service Ticket"}
                  {modalType === "rejectTransfer" && "Reject Inter-departmental Transfer"}
                  {modalType === "importCsv" && "Bulk CSV Ledger Import"}
                </h3>
                <button onClick={() => setModalType(null)} className="p-1 hover:bg-slate-850 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* REGISTER / EDIT ASSET FORM */}
              {(modalType === "registerAsset" || modalType === "editAsset") && (
                <form onSubmit={modalType === "registerAsset" ? handleRegisterAssetSubmit : handleEditAssetSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold block">Asset / Device Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MacBook Pro M3"
                      value={assetForm.name}
                      onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                      className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-slate-400 font-semibold block">Serial Number (S/N)</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. C02X877..."
                        value={assetForm.serialNumber}
                        onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
                        className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-400 font-semibold block">Category</label>
                      <select
                        value={assetForm.category}
                        onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                        className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl text-white"
                      >
                        {systemSettings.categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-slate-400 font-semibold block">Purchase Cost ({systemSettings.currency})</label>
                      <input
                        type="number"
                        required
                        value={assetForm.purchaseCost}
                        onChange={(e) => setAssetForm({ ...assetForm, purchaseCost: e.target.value })}
                        className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-400 font-semibold block">Warranty Months</label>
                      <input
                        type="number"
                        required
                        value={assetForm.warrantyMonths}
                        onChange={(e) => setAssetForm({ ...assetForm, warrantyMonths: e.target.value })}
                        className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-slate-400 font-semibold block">Condition</label>
                      <select
                        value={assetForm.condition}
                        onChange={(e) => setAssetForm({ ...assetForm, condition: e.target.value })}
                        className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl text-white"
                      >
                        {Object.values(AssetCondition).map(cond => (
                          <option key={cond} value={cond}>{cond}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-400 font-semibold block">Location</label>
                      <select
                        value={assetForm.location}
                        onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                        className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl text-white"
                      >
                        {systemSettings.locations.map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isBookable"
                      checked={assetForm.isBookable}
                      onChange={(e) => setAssetForm({ ...assetForm, isBookable: e.target.checked })}
                      className="w-4 h-4 accent-blue-600 rounded border"
                    />
                    <label htmlFor="isBookable" className="text-slate-400">Mark as bookable shared resource</label>
                  </div>

                  <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl">
                    Save Record
                  </button>
                </form>
              )}

              {/* CSV BULK IMPORT */}
              {modalType === "importCsv" && (
                <form onSubmit={handleCsvImportSubmit} className="space-y-4">
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
                    <p className="font-bold text-white">Expected CSV format:</p>
                    <p>name,serialNumber,category,purchaseCost,warrantyMonths,condition,location,isBookable</p>
                    <p>Example: Dell XPS 15,SN-XPS2026,Laptop,1800,36,New,SF Head Office,false</p>
                  </div>
                  <textarea
                    required
                    rows={8}
                    placeholder="Paste CSV rows here (with headers)..."
                    value={csvImportText}
                    onChange={(e) => setCsvImportText(e.target.value)}
                    className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl text-white font-mono"
                  ></textarea>
                  <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl">
                    Complete Bulk Import
                  </button>
                </form>
              )}

              {/* ADD / EDIT EMPLOYEE FORM */}
              {(modalType === "addEmployee" || modalType === "editEmployee") && (
                <form onSubmit={modalType === "addEmployee" ? handleAddEmployeeSubmit : handleEditEmployeeSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold block">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alan Turing"
                      value={employeeForm.name}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                      className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold block">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="turing@company.com"
                      value={employeeForm.email}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                      className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl text-white outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-slate-400 font-semibold block">Role Designation</label>
                      <select
                        value={employeeForm.role}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}
                        className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl text-white"
                      >
                        {Object.values(Role).map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 font-semibold block">Department Placement</label>
                      <select
                        value={employeeForm.departmentId}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, departmentId: e.target.value })}
                        className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl text-white"
                      >
                        <option value="">-- Choose Dept --</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-slate-400 font-semibold block">Password (or keep blank to default)</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={employeeForm.password}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                        className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl text-white outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 font-semibold block">Status</label>
                      <select
                        value={employeeForm.status}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value })}
                        className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl text-white"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="OnLeave">OnLeave</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl">
                    Save Record
                  </button>
                </form>
              )}

              {/* REJECT TRANSFER FORM */}
              {modalType === "rejectTransfer" && (
                <form onSubmit={handleRejectTransferSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold block">Rejection Feedback / Comments</label>
                    <textarea
                      required
                      placeholder="Detail why this departmental transfer is declined..."
                      value={transferRejectForm.comments}
                      onChange={(e) => setTransferRejectForm({ ...transferRejectForm, comments: e.target.value })}
                      className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl text-white outline-none"
                    ></textarea>
                  </div>
                  <button type="submit" className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl">
                    Decline Transfer
                  </button>
                </form>
              )}

              {/* RESOLVE MAINTENANCE TICKET */}
              {modalType === "resolveMaintenance" && (
                <form onSubmit={handleResolveMaintenanceSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold block">Maintenance Resolution Report</label>
                    <textarea
                      required
                      placeholder="Input repair metrics and action notes..."
                      value={maintenanceResolveForm.actionNotes}
                      onChange={(e) => setMaintenanceResolveForm({ ...maintenanceResolveForm, actionNotes: e.target.value })}
                      className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl text-white outline-none"
                    ></textarea>
                  </div>
                  <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl">
                    Mark Ticket Resolved
                  </button>
                </form>
              )}

              {/* ALLOCATE / ASSIGN ASSET FORM */}
              {modalType === "assignAsset" && (
                <form onSubmit={handleAllocateSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold block">Choose Employee Recipient</label>
                    <select
                      required
                      value={assignForm.employeeId}
                      onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
                      className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl text-white"
                    >
                      <option value="">-- Choose Employee --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold block">Allocation Comments</label>
                    <input
                      type="text"
                      placeholder="e.g. Standard workstation deployment"
                      value={assignForm.notes}
                      onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                      className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl text-white outline-none"
                    />
                  </div>

                  <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl">
                    Allocate Asset
                  </button>
                </form>
              )}

              {/* CREATE DEPARTMENT */}
              {modalType === "createDepartment" && (
                <form onSubmit={handleCreateDeptSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold block">Department Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Advanced Tech Lab"
                      value={deptForm.name}
                      onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                      className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold block">Parent Hierarchical Placement</label>
                    <select
                      value={deptForm.parentId}
                      onChange={(e) => setDeptForm({ ...deptForm, parentId: e.target.value })}
                      className="w-full p-2.5 bg-slate-900/60 border dark:border-slate-850 rounded-xl text-white"
                    >
                      <option value="">-- None (Main Root Branch) --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl">
                    Initialize Department
                  </button>
                </form>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
