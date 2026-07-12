import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Search,
  ShieldCheck,
  Mail,
  Plus,
  X,
  Building,
  Cpu,
  TrendingUp,
  HeartHandshake,
  Wallet,
  Settings2,
  ArrowUpDown,
  Activity,
  Check,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Laptop,
  Briefcase,
  Clock,
  ShieldAlert,
  SlidersHorizontal,
  FolderLock,
  ChevronDown,
  UserCheck,
  Building2,
  Trash2,
  PhoneCall,
  UserPlus
} from "lucide-react";
import { User, Department, Role, Asset, UserStatus } from "../types";
import { api } from "../api";

interface OrgViewProps {
  users: User[];
  departments: Department[];
  currentUser: User;
  onRefreshUsers: () => void;
  onRefreshDepartments: () => void;
  theme: "dark" | "light";
  assets?: Asset[];
}

// Map department codes or names to icons for premium look
const getDepartmentIcon = (name: string) => {
  const lowercase = name.toLowerCase();
  if (lowercase.includes("it") || lowercase.includes("tech") || lowercase.includes("engineering")) {
    return <Cpu className="w-5 h-5 text-indigo-500" />;
  }
  if (lowercase.includes("sales") || lowercase.includes("market") || lowercase.includes("growth")) {
    return <TrendingUp className="w-5 h-5 text-emerald-500" />;
  }
  if (lowercase.includes("hr") || lowercase.includes("people") || lowercase.includes("talent")) {
    return <HeartHandshake className="w-5 h-5 text-rose-500" />;
  }
  if (lowercase.includes("finance") || lowercase.includes("legal") || lowercase.includes("audit") || lowercase.includes("accounting")) {
    return <Wallet className="w-5 h-5 text-amber-500" />;
  }
  if (lowercase.includes("ops") || lowercase.includes("operation") || lowercase.includes("fleet") || lowercase.includes("admin")) {
    return <Briefcase className="w-5 h-5 text-sky-500" />;
  }
  return <Building className="w-5 h-5 text-blue-500" />;
};

// Helper function to generate initials-based avatar
const getInitialsAvatar = (name: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export default function OrgView({
  users,
  departments,
  currentUser,
  onRefreshUsers,
  onRefreshDepartments,
  theme,
  assets = []
}: OrgViewProps) {
  const isDark = theme === "dark";
  const isAdmin = currentUser.role === Role.Admin;

  // Department state & modal
  const [isNewDeptOpen, setIsNewDeptOpen] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: "", code: "", parentId: "" });
  const [isSubmittingDept, setIsSubmittingDept] = useState(false);

  // DataTable state
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [deptFilter, setDeptFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  
  // Sorting & Pagination state
  const [sortField, setSortField] = useState<keyof User>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected Department for deep view or quick actions
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  // Promote states
  const [promotingUserId, setPromotingUserId] = useState<string | null>(null);

  // Department Statistics
  const departmentStats = useMemo(() => {
    return departments.map(dept => {
      const deptUsers = users.filter(u => u.departmentId === dept.id);
      const deptAssets = assets.filter(a => a.departmentId === dept.id);
      const headEmployee = users.find(u => u.id === dept.headId);

      // Allocation loading progress
      const totalCost = deptAssets.reduce((sum, a) => sum + (a.purchaseCost || 0), 0);
      const activeAssetsCount = deptAssets.filter(a => a.status === "Allocated" || a.status === "Available").length;
      const progressRatio = deptAssets.length > 0 ? (activeAssetsCount / deptAssets.length) * 100 : 0;

      return {
        ...dept,
        employeeCount: deptUsers.length,
        assetCount: deptAssets.length,
        totalValue: totalCost,
        head: headEmployee,
        progress: progressRatio,
        members: deptUsers
      };
    });
  }, [departments, users, assets]);

  // Handle department creation
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingDept(true);
    try {
      await api.createDepartment({
        name: deptForm.name,
        code: deptForm.code || `DEPT-${deptForm.name.toUpperCase().slice(0, 4)}`,
        parentId: deptForm.parentId || undefined
      });
      onRefreshDepartments();
      setIsNewDeptOpen(false);
      setDeptForm({ name: "", code: "", parentId: "" });
    } catch (err: any) {
      alert(`Failed to create department: ${err.message}`);
    } finally {
      setIsSubmittingDept(false);
    }
  };

  // Handle role promotion
  const handlePromoteRole = async (userId: string, newRole: string) => {
    try {
      await api.promoteUserRole(userId, newRole);
      onRefreshUsers();
      setPromotingUserId(null);
    } catch (err: any) {
      alert(`Role change error: ${err.message}`);
    }
  };

  // Sort & Filter Directory Users
  const handleSort = (field: keyof User) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === "All" || u.role === roleFilter;
      const matchesDept = deptFilter === "All" || u.departmentId === deptFilter;
      const matchesStatus = statusFilter === "All" || u.status === statusFilter;

      return matchesSearch && matchesRole && matchesDept && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, deptFilter, statusFilter]);

  const sortedUsers = useMemo(() => {
    const sorted = [...filteredUsers];
    sorted.sort((a, b) => {
      let aVal = a[sortField] || "";
      let bVal = b[sortField] || "";

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredUsers, sortField, sortDirection]);

  // Paginated directory users
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedUsers, currentPage]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / itemsPerPage));

  // Auto-reset page on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, deptFilter, statusFilter]);

  // Determine mockup Last Login from ID/CreatedAt for design consistency
  const getLastLoginText = (user: User) => {
    const code = user.id.charCodeAt(user.id.length - 1) || 0;
    if (code % 3 === 0) return "Today, 10:24 AM";
    if (code % 3 === 1) return "Yesterday, 3:45 PM";
    return "3 days ago";
  };

  return (
    <div className={`space-y-8 pb-12 font-sans ${isDark ? "text-slate-100" : "text-slate-900"}`}>
      
      {/* 1. Page Title & Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/50 dark:border-slate-800/40 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl dark:bg-indigo-400/10">
              <Building2 className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Organization Desk</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Coordinate departments, audit employee directories, and administer role clearance levels
          </p>
        </div>

        {isAdmin && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsNewDeptOpen(true)}
            className="font-semibold text-xs px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-sm shadow-indigo-600/15 flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Create Department
          </motion.button>
        )}
      </div>

      {/* 2. Department Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold tracking-tight uppercase text-slate-400">Corporate Units ({departments.length})</h2>
          </div>
          <span className="text-[10px] font-mono text-slate-500">Odoo 18 Multi-tenant Structure</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departmentStats.map((dept) => (
            <motion.div
              key={dept.id}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={`p-5 rounded-2xl border transition-all ${
                isDark 
                  ? "bg-slate-900/60 border-slate-800/80 hover:border-slate-700/80 shadow-slate-950/20" 
                  : "bg-white border-slate-200/80 hover:border-indigo-100 shadow-slate-200/40"
              } shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[190px]`}
            >
              {/* Background gradient lighting */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

              <div>
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${
                      isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"
                    }`}>
                      {getDepartmentIcon(dept.name)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm tracking-tight">{dept.name}</h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{dept.id}</p>
                    </div>
                  </div>

                  {/* Status dot */}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium border ${
                    dept.status === "Active"
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                  }`}>
                    <span className={`w-1 h-1 rounded-full ${dept.status === "Active" ? "bg-emerald-500" : "bg-slate-500"}`} />
                    {dept.status}
                  </span>
                </div>

                {/* Grid details (Members / Assets / Value) */}
                <div className="grid grid-cols-3 gap-4 my-4 pt-3 border-t border-slate-100 dark:border-slate-800/40">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-medium">Employees</span>
                    <p className="text-sm font-bold tracking-tight">{dept.employeeCount}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-medium">Assets Held</span>
                    <p className="text-sm font-bold tracking-tight">{dept.assetCount}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-medium">Valuation</span>
                    <p className="text-sm font-bold tracking-tight text-indigo-500">₹{dept.totalValue.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Lower Section: Head & Progress Bar */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative w-6 h-6 shrink-0">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-[9px] flex items-center justify-center font-bold uppercase">
                        {dept.head ? getInitialsAvatar(dept.head.name) : "??"}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Unit Director</p>
                      <h4 className="text-[10px] font-bold truncate max-w-[120px]">{dept.head ? dept.head.name : "Unassigned"}</h4>
                    </div>
                  </div>

                  {/* Quick Filter action */}
                  <button
                    onClick={() => {
                      if (deptFilter === dept.id) {
                        setDeptFilter("All");
                      } else {
                        setDeptFilter(dept.id);
                      }
                    }}
                    className={`px-2.5 py-1 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${
                      deptFilter === dept.id
                        ? "bg-indigo-600 text-white border-indigo-500"
                        : isDark
                          ? "bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                    }`}
                  >
                    {deptFilter === dept.id ? "Selected" : "View Members"}
                  </button>
                </div>

                {/* Progress bar showing active assets usage ratio */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                    <span>Operational Asset Capacity</span>
                    <span>{Math.round(dept.progress)}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${dept.progress || 5}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full bg-indigo-500 rounded-full" 
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 3. Employee Directory Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold tracking-tight uppercase text-slate-400">Employee Registry ({sortedUsers.length})</h2>
          </div>
        </div>

        {/* Filters Controls Panel */}
        <div className={`p-4 rounded-2xl border ${
          isDark ? "bg-slate-900/40 border-slate-800/60" : "bg-white border-slate-200/80 shadow-sm"
        } grid grid-cols-1 md:grid-cols-4 gap-3 items-center`}>
          
          {/* Search bar */}
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border outline-none transition-all ${
                isDark 
                  ? "bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500" 
                  : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-400"
              }`}
            />
          </div>

          {/* Role Filter dropdown */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`w-full p-2 text-xs rounded-xl border outline-none cursor-pointer ${
                isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              <option value="All">All Clearance Levels</option>
              {Object.values(Role).map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          {/* Department Filter dropdown */}
          <div className="flex items-center gap-2">
            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className={`w-full p-2 text-xs rounded-xl border outline-none cursor-pointer ${
                isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              <option value="All">All Corporate Units</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter dropdown */}
          <div className="flex items-center gap-2">
            <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full p-2 text-xs rounded-xl border outline-none cursor-pointer ${
                isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              <option value="All">All Statuses</option>
              {Object.values(UserStatus).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Premium Datatable card */}
        <div className={`border rounded-2xl overflow-hidden shadow-xl ${
          isDark ? "bg-slate-950/60 border-slate-800/80" : "bg-white border-slate-200/80"
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 text-[10px] font-mono tracking-wider uppercase text-slate-400 sticky top-0 z-10`}>
                  <th className="p-4 cursor-pointer hover:text-indigo-500 transition-colors" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1.5">
                      Employee Details <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer hover:text-indigo-500 transition-colors" onClick={() => handleSort("departmentId")}>
                    <div className="flex items-center gap-1.5">
                      Business Unit <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer hover:text-indigo-500 transition-colors" onClick={() => handleSort("role")}>
                    <div className="flex items-center gap-1.5">
                      Access Role <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer hover:text-indigo-500 transition-colors" onClick={() => handleSort("status")}>
                    <div className="flex items-center gap-1.5">
                      Active State <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-500" /> Active Session
                    </div>
                  </th>
                  {isAdmin && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
                <AnimatePresence mode="popLayout">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="p-12 text-center text-slate-400">
                        <div className="max-w-xs mx-auto space-y-2">
                          <Users className="w-8 h-8 text-slate-600 mx-auto opacity-40 animate-pulse" />
                          <p className="text-xs font-semibold">No employees match current filtration parameters</p>
                          <p className="text-[10px] text-slate-500">Refine search criteria or reset filters</p>
                          <button 
                            onClick={() => {
                              setSearchTerm("");
                              setRoleFilter("All");
                              setDeptFilter("All");
                              setStatusFilter("All");
                            }}
                            className="px-3 py-1.5 text-[10px] font-bold bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 rounded-lg cursor-pointer transition border border-indigo-500/15"
                          >
                            Reset Directory
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u, idx) => {
                      const dept = departments.find(d => d.id === u.departmentId);
                      const isCurrentUser = u.id === currentUser.id;

                      return (
                        <motion.tr
                          key={u.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className={`hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors group`}
                        >
                          {/* Member Details */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="relative w-8 h-8 shrink-0">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                  u.role === Role.Admin
                                    ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                    : u.role === Role.AssetManager
                                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                      : "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                                }`}>
                                  {u.name ? u.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??"}
                                </div>
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-xs flex items-center gap-1.5">
                                  {u.name}
                                  {isCurrentUser && (
                                    <span className="text-[8px] bg-indigo-500 text-white font-mono uppercase px-1 py-0.2 rounded font-bold">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                                  <Mail className="w-3 h-3 text-slate-500" />
                                  <span>{u.email}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Business Unit / Dept */}
                          <td className="p-4">
                            {dept ? (
                              <div className="inline-flex items-center gap-1.5">
                                <span className="p-1 rounded-lg bg-indigo-500/5 text-indigo-500 dark:text-indigo-400">
                                  {getDepartmentIcon(dept.name)}
                                </span>
                                <div>
                                  <span className="text-xs font-semibold">{dept.name}</span>
                                  <p className="text-[8px] font-mono text-slate-500 mt-0.2">ID: {dept.id}</p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-[10px]">Unassigned</span>
                            )}
                          </td>

                          {/* Role Badge */}
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-semibold border ${
                              u.role === Role.Admin 
                                ? "bg-rose-500/10 text-rose-500 border-rose-500/20" 
                                : u.role === Role.AssetManager
                                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                  : u.role === Role.DepartmentHead
                                    ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                                    : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            }`}>
                              {u.role === Role.Admin && <ShieldCheck className="w-3 h-3" />}
                              {u.role}
                            </span>
                          </td>

                          {/* Active State / Status */}
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              u.status === UserStatus.Active
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                                : u.status === UserStatus.OnLeave
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400"
                                  : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                u.status === UserStatus.Active ? "bg-emerald-500" :
                                u.status === UserStatus.OnLeave ? "bg-amber-500" : "bg-slate-400"
                              }`} />
                              {u.status}
                            </span>
                          </td>

                          {/* Mock last session log */}
                          <td className="p-4 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            {getLastLoginText(u)}
                          </td>

                          {/* Action panel */}
                          {isAdmin && (
                            <td className="p-4 text-right">
                              {isCurrentUser ? (
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-slate-800/40">Self</span>
                              ) : promotingUserId === u.id ? (
                                <div className="flex items-center justify-end gap-1">
                                  <select
                                    defaultValue={u.role}
                                    onChange={(e) => handlePromoteRole(u.id, e.target.value)}
                                    className={`p-1 text-[10px] font-mono rounded-lg border outline-none ${
                                      isDark ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                                    }`}
                                    autoFocus
                                    onBlur={() => setTimeout(() => setPromotingUserId(null), 200)}
                                  >
                                    {Object.values(Role).map(role => (
                                      <option key={role} value={role}>{role}</option>
                                    ))}
                                  </select>
                                  <button onClick={() => setPromotingUserId(null)} className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setPromotingUserId(u.id)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                                    isDark 
                                      ? "bg-slate-900/60 border-slate-800/60 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/30" 
                                      : "bg-white border-slate-200 text-indigo-600 hover:bg-indigo-500/5 hover:border-indigo-500/30"
                                  }`}
                                >
                                  <Settings2 className="w-3.5 h-3.5" /> Edit Role
                                </button>
                              )}
                            </td>
                          )}
                        </motion.tr>
                      );
                    })
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Footer Pagination Controls */}
          <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 font-mono ${
            isDark ? "border-slate-800/60" : "border-slate-100"
          }`}>
            <span>
              Showing <strong className="text-slate-400 dark:text-slate-200">{sortedUsers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> to{" "}
              <strong className="text-slate-400 dark:text-slate-200">{Math.min(currentPage * itemsPerPage, sortedUsers.length)}</strong> of{" "}
              <strong className="text-slate-400 dark:text-slate-200">{sortedUsers.length}</strong> cataloged records
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  currentPage === 1
                    ? "opacity-40 cursor-not-allowed border-transparent"
                    : isDark
                      ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                      page === currentPage
                        ? "bg-indigo-600 text-white border-indigo-500"
                        : isDark
                          ? "bg-slate-950 hover:bg-slate-900 border-slate-850 text-slate-400"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  currentPage === totalPages
                    ? "opacity-40 cursor-not-allowed border-transparent"
                    : isDark
                      ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Create New Department */}
      {isNewDeptOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl relative ${
              isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <button
              type="button"
              onClick={() => setIsNewDeptOpen(false)}
              className="absolute right-5 top-5 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                <Building className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold">Construct Business Unit</h3>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Unit Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales & Growth"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none transition-all ${
                    isDark 
                      ? "bg-slate-900 border-slate-800 text-white focus:border-indigo-500" 
                      : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-400"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Unit Code (Unique)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DEPT-SALES"
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none transition-all ${
                      isDark 
                        ? "bg-slate-900 border-slate-800 text-white focus:border-indigo-500" 
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-400"
                    }`}
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Parent Division</label>
                  <select
                    value={deptForm.parentId}
                    onChange={(e) => setDeptForm({ ...deptForm, parentId: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none transition-all ${
                      isDark 
                        ? "bg-slate-900 border-slate-800 text-white" 
                        : "bg-slate-50 border-slate-200 text-slate-850"
                    }`}
                  >
                    <option value="">-- None --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingDept}
                className="w-full text-xs font-semibold py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl cursor-pointer transition shadow-sm shadow-indigo-600/10 flex items-center justify-center gap-2 mt-2"
              >
                {isSubmittingDept ? "Creating Unit..." : "Register Corporate Division"}
              </button>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
