import React, { useState } from "react";
import { Users, Search, ShieldCheck, Mail, ShieldAlert, Award, ArrowUpRight } from "lucide-react";
import { User, Department, Role } from "../types";
import { api } from "../api";

interface EmployeesViewProps {
  users: User[];
  departments: Department[];
  currentUser: User;
  onRefreshUsers: () => void;
  theme: "dark" | "light";
}

export default function EmployeesView({
  users,
  departments,
  currentUser,
  onRefreshUsers,
  theme
}: EmployeesViewProps) {
  const isDark = theme === "dark";
  const isAdmin = currentUser.role === Role.Admin;

  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("All");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("All");

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = selectedRoleFilter === "All" || u.role === selectedRoleFilter;
    
    const matchesDept = selectedDeptFilter === "All" || u.departmentId === selectedDeptFilter;

    return matchesSearch && matchesRole && matchesDept;
  });

  const handlePromoteRole = async (userId: string, newRole: string) => {
    try {
      await api.promoteUserRole(userId, newRole);
      onRefreshUsers();
    } catch (err: any) {
      alert(`Promotion error: ${err.message}`);
    }
  };

  // KPI Calculations
  const totalEmployees = users.length;
  const adminCount = users.filter(u => u.role === Role.Admin).length;
  const managerCount = users.filter(u => u.role === Role.AssetManager).length;
  const unassignedCount = users.filter(u => !u.departmentId).length;

  // Drawer State
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Page Header Card */}
      <div className={`p-6 rounded-2xl border transition duration-200 ${
        isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100 shadow-sm"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-display font-extrabold ${isDark ? "text-white" : "text-slate-900"} tracking-tight flex items-center gap-2`}>
              <Users className="w-6 h-6 text-indigo-500" />
              <span>Personnel Directory</span>
            </h1>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"} mt-1`}>
              Manage corporate personnel, administer security access tiers, and audit authorization credentials.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono px-3 py-1.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-full font-bold">
              {totalEmployees} Registered Staff
            </span>
          </div>
        </div>

        {/* Mini KPIs inside header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-500/10 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Administrators</span>
            <p className={`text-lg font-bold font-display ${isDark ? "text-white" : "text-slate-800"}`}>{adminCount}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Asset Managers</span>
            <p className={`text-lg font-bold font-display ${isDark ? "text-white" : "text-slate-800"}`}>{managerCount}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Dept Heads / Staff</span>
            <p className={`text-lg font-bold font-display ${isDark ? "text-white" : "text-slate-800"}`}>{totalEmployees - adminCount - managerCount}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Unassigned Desks</span>
            <p className={`text-lg font-bold font-display ${unassignedCount > 0 ? "text-amber-500" : isDark ? "text-white" : "text-slate-800"}`}>{unassignedCount}</p>
          </div>
        </div>
      </div>

      {/* Search Filters Row */}
      <div className={`p-4 rounded-2xl border ${
        isDark ? "bg-slate-900/20 border-slate-850" : "bg-white border-slate-200 shadow-sm"
      } grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs`}>
        
        {/* Search */}
        <div className="md:col-span-4 relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search employees by name, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full text-xs pl-10 pr-4 py-2.5 rounded-xl outline-none transition ${
              isDark 
                ? "bg-slate-950/40 border border-slate-800/60 text-white placeholder-slate-500 focus:border-indigo-500/80" 
                : "bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500/80"
            }`}
          />
        </div>

        {/* Dropdown Filters */}
        <div className="md:col-span-8 flex flex-wrap gap-2 items-center justify-end">
          
          {/* Department filter */}
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className={`text-xs px-3.5 py-2.5 rounded-xl outline-none font-medium border ${
              isDark 
                ? "bg-slate-950 border-slate-800 text-slate-300" 
                : "bg-white border-slate-200 text-slate-700 shadow-sm"
            }`}
          >
            <option value="All">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Role filter */}
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className={`text-xs px-3.5 py-2.5 rounded-xl outline-none font-medium border ${
              isDark 
                ? "bg-slate-950 border-slate-800 text-slate-300" 
                : "bg-white border-slate-200 text-slate-700 shadow-sm"
            }`}
          >
            <option value="All">All Tiers</option>
            {Object.values(Role).map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Directory Table Grid */}
      <div className={`border rounded-2xl overflow-hidden shadow-sm ${
        isDark ? "bg-[#0B1220]/20 border-slate-800/80" : "bg-white border-slate-200"
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b font-mono uppercase text-[10px] tracking-wider ${
                isDark ? "border-slate-800 bg-slate-900/60 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"
              }`}>
                <th className="p-4 font-bold">Staff Identity Details</th>
                <th className="p-4 font-bold">Department placement</th>
                <th className="p-4 font-bold">Authorization Tier</th>
                {isAdmin && <th className="p-4 text-right font-bold">Security controls</th>}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-slate-800/40" : "divide-slate-200/60"}`}>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-500 font-mono font-medium">
                    No matching personnel located in corporate directory.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const dept = departments.find(d => d.id === user.departmentId);
                  const isSelf = user.id === currentUser.id;

                  return (
                    <tr 
                      key={user.id} 
                      onClick={() => setSelectedEmployee(user)}
                      className={`hover:bg-slate-500/5 transition-colors cursor-pointer ${
                        isSelf ? (isDark ? "bg-blue-500/5" : "bg-blue-50/40") : ""
                      }`}
                    >
                      {/* Name / Email */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-9 h-9 shrink-0">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold font-display uppercase text-[10px] ${
                              user.role === Role.Admin
                                ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                : user.role === Role.AssetManager
                                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                  : "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                            }`}>
                              {user.name ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??"}
                            </div>
                          </div>
                          <div>
                            <div className={`font-extrabold text-xs ${isDark ? "text-white" : "text-slate-900"} flex items-center gap-1.5`}>
                              {user.name}
                              {isSelf && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-blue-100 text-blue-700 font-mono font-bold rounded">YOU</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                              <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" /> {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="p-4">
                        {dept ? (
                          <div className="space-y-1">
                            <span className={`font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                              {dept.name}
                            </span>
                            <p className="text-[9px] font-mono text-slate-400">ID: {dept.id}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono italic">Unassigned Desk</span>
                        )}
                      </td>

                      {/* Access Role Badge */}
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-xl text-[9px] font-mono border font-bold uppercase inline-flex items-center gap-1 ${
                          user.role === Role.Admin 
                            ? "bg-red-500/10 text-red-400 border-red-500/20" 
                            : user.role === Role.AssetManager 
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                              : user.role === Role.DepartmentHead 
                                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                                : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                        }`}>
                          {user.role === Role.Admin && <ShieldAlert className="w-3 h-3 text-red-400 shrink-0" />}
                          {user.role === Role.AssetManager && <Award className="w-3 h-3 text-amber-400 shrink-0" />}
                          {user.role === Role.DepartmentHead && <ShieldCheck className="w-3 h-3 text-indigo-400 shrink-0" />}
                          {user.role}
                        </span>
                      </td>

                      {/* Promotion dropdown actions */}
                      {isAdmin && (
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {isSelf ? (
                            <span className="text-[10px] text-slate-400 font-mono italic">Superadmin Block</span>
                          ) : (
                            <select
                              value={user.role}
                              onChange={(e) => handlePromoteRole(user.id, e.target.value)}
                              className={`p-1.5 text-[11px] rounded-lg font-mono outline-none border transition ${
                                isDark 
                                  ? "bg-[#090D16] border-slate-800 text-slate-300 focus:border-indigo-500" 
                                  : "bg-white border-slate-200 text-slate-700 shadow-sm focus:border-indigo-500"
                              }`}
                            >
                              {Object.values(Role).map(role => (
                                <option key={role} value={role}>{role}</option>
                              ))}
                            </select>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Slide Drawer */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end" onClick={() => setSelectedEmployee(null)}>
          <div 
            className={`w-full max-w-md h-full p-6 space-y-6 overflow-y-auto animate-slide-in relative border-l flex flex-col justify-between ${
              isDark ? "bg-[#090D16] border-slate-800 text-white" : "bg-white border-slate-200 text-[#0F172A] shadow-2xl"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              {/* Header inside drawer */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-500/10">
                <h3 className="text-base font-display font-extrabold flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  <span>Personnel Credentials</span>
                </h3>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className={`p-1 rounded-lg ${isDark ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}
                >
                  Close Drawer
                </button>
              </div>

              {/* Profile card representation */}
              <div className="flex items-center gap-4 p-4 rounded-2xl border bg-slate-500/5">
                <div className="relative w-14 h-14 shrink-0">
                  {selectedEmployee.avatar ? (
                    <img 
                      src={selectedEmployee.avatar} 
                      alt={selectedEmployee.name} 
                      className="w-14 h-14 rounded-full object-cover border border-slate-200/40" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-indigo-600/10 text-indigo-500 flex items-center justify-center font-bold text-lg font-display uppercase">
                      {selectedEmployee.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2)}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <h4 className={`text-base font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>{selectedEmployee.name}</h4>
                  <p className="text-xs text-slate-400 font-mono truncate mt-0.5">{selectedEmployee.email}</p>
                </div>
              </div>

              {/* Security permissions information */}
              <div className="space-y-3">
                <h5 className={`text-xs font-mono font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-600"}`}>Account Access Tiers</h5>
                
                <div className="space-y-2 text-xs">
                  <div className={`p-3 rounded-xl border flex justify-between items-center ${isDark ? "border-slate-850 bg-slate-900/40" : "border-slate-150 bg-slate-50"}`}>
                    <span className="font-semibold">Authorization Grade</span>
                    <span className="font-bold font-mono text-indigo-500">{selectedEmployee.role}</span>
                  </div>

                  <div className={`p-3 rounded-xl border flex justify-between items-center ${isDark ? "border-slate-850 bg-slate-900/40" : "border-slate-150 bg-slate-50"}`}>
                    <span className="font-semibold">Department Segment</span>
                    <span className="font-bold">
                      {departments.find(d => d.id === selectedEmployee.departmentId)?.name || "Unassigned Operations"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick bio or workspace actions */}
              <div className="p-4 rounded-xl border border-dashed text-xs space-y-2 border-indigo-500/20">
                <p className="font-bold text-indigo-500 flex items-center gap-1 font-mono uppercase text-[10px]">
                  <ShieldCheck className="w-4 h-4" /> Administrative Grade Info
                </p>
                <p className={`${isDark ? "text-slate-400" : "text-slate-600"} leading-relaxed`}>
                  This employee possesses {selectedEmployee.role} capabilities. They have permission to create hardware bookings, request physical asset transfers, and log repair service logs.
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedEmployee(null)}
              className="w-full text-xs font-bold py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition cursor-pointer"
            >
              Finish Directory Review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
