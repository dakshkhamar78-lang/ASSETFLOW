import React, { useState } from "react";
import { Hammer, Check, Plus, AlertTriangle, Clock, X, Cpu, Settings } from "lucide-react";
import { Maintenance, Asset, User, Role } from "../types";
import { api } from "../api";
import { getMaintenanceImage, maintenanceImageUrl } from "../maintenanceImages";

interface MaintenanceViewProps {
  maintenances: Maintenance[];
  assets: Asset[];
  currentUser: User;
  onRefreshMaintenances: () => void;
  theme: "dark" | "light";
}

export default function MaintenanceView({
  maintenances,
  assets,
  currentUser,
  onRefreshMaintenances,
  theme
}: MaintenanceViewProps) {
  const isDark = theme === "dark";
  const isManagerOrAdmin = currentUser.role === Role.Admin || currentUser.role === Role.AssetManager;

  // States
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    assetId: "",
    issueDescription: "",
    priority: "Medium" as "Low" | "Medium" | "High" | "Critical",
    scheduledDate: new Date().toISOString().split("T")[0],
    photoUrl: ""
  });

  const [assignedTechnician, setAssignedTechnician] = useState<Record<string, string>>({});
  const [showAssignInput, setShowAssignInput] = useState<string | null>(null);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createMaintenance({
        assetId: ticketForm.assetId,
        description: ticketForm.issueDescription,
        priority: ticketForm.priority,
        photoUrl: ticketForm.photoUrl,
        scheduledDate: ticketForm.scheduledDate
      });
      onRefreshMaintenances();
      setIsTicketOpen(false);
      setTicketForm({
        assetId: "",
        issueDescription: "",
        priority: "Medium",
        scheduledDate: new Date().toISOString().split("T")[0],
        photoUrl: ""
      });
    } catch (err: any) {
      alert(`Failed to log ticket: ${err.message}`);
    }
  };

  const handleApproveTicket = async (id: string) => {
    const techName = assignedTechnician[id] || "Corporate IT Engineer";
    try {
      await api.approveMaintenance(id, techName);
      onRefreshMaintenances();
      setShowAssignInput(null);
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    }
  };

  const handleResolveTicket = async (id: string) => {
    try {
      await api.resolveMaintenance(id);
      onRefreshMaintenances();
    } catch (err: any) {
      alert(`Resolution failed: ${err.message}`);
    }
  };

  // Filter States
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Calculate triage statistics
  const totalTickets = maintenances.length;
  const criticalUrgencyCount = maintenances.filter(m => m.priority === "Critical" && m.status !== "Resolved").length;
  const pendingDispatchCount = maintenances.filter(m => m.status === "Pending").length;
  const resolvedCount = maintenances.filter(m => m.status === "Resolved").length;

  // Filtered maintenance list
  const filteredMaintenances = maintenances.filter(m => {
    const matchPriority = priorityFilter === "All" || m.priority === priorityFilter;
    const matchStatus = statusFilter === "All" || m.status === statusFilter;
    return matchPriority && matchStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-display font-extrabold ${isDark ? "text-white" : "text-slate-900"} tracking-tight flex items-center gap-2`}>
            <Hammer className="w-6 h-6 text-indigo-500" />
            <span>Service Desk & Repair Logs</span>
          </h1>
          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"} mt-1`}>
            Log physical or hardware malfunctions, triage critical tickets, and dispatch repair technicians with real-time status tracking.
          </p>
        </div>

        <button
          onClick={() => setIsTicketOpen(true)}
          className="text-xs font-bold px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition shadow-md shadow-indigo-600/10 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Log Service Ticket
        </button>
      </div>

      {/* KPI Triage Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Service Tickets</span>
            <Cpu className="w-4 h-4 text-indigo-500" />
          </div>
          <h3 className={`text-2xl font-extrabold font-display leading-tight mt-2 ${isDark ? "text-white" : "text-slate-900"}`}>{totalTickets}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Total active & completed logs</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Critical Urgency</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <h3 className={`text-2xl font-extrabold font-display leading-tight mt-2 ${isDark ? "text-rose-400" : "text-rose-600"}`}>{criticalUrgencyCount}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Urgent unhandled failures</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Pending Dispatch</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className={`text-2xl font-extrabold font-display leading-tight mt-2 ${isDark ? "text-white" : "text-slate-900"}`}>{pendingDispatchCount}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Awaiting manager delegation</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Resolved Fixes</span>
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className={`text-2xl font-extrabold font-display leading-tight mt-2 ${isDark ? "text-[#10B981]" : "text-[#059669]"}`}>{resolvedCount}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Safely recommissioned assets</p>
        </div>
      </div>

      {/* Control Filters Bar */}
      <div className={`p-3.5 rounded-2xl border flex flex-wrap gap-4 items-center justify-between ${
        isDark ? "bg-slate-900/20 border-slate-850" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Priority filter */}
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-600"}`}>Urgency:</span>
            <div className="flex gap-1">
              {["All", "Critical", "High", "Medium", "Low"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`px-2.5 py-1 text-[10px] rounded-lg font-bold transition-colors cursor-pointer ${
                    priorityFilter === p
                      ? "bg-indigo-600 text-white"
                      : isDark ? "bg-slate-900 text-slate-400 hover:text-white border border-slate-800" : "bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-150"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-600"}`}>State:</span>
            <div className="flex gap-1">
              {["All", "Pending", "Approved", "Resolved"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 text-[10px] rounded-lg font-bold transition-colors cursor-pointer ${
                    statusFilter === s
                      ? "bg-indigo-600 text-white"
                      : isDark ? "bg-slate-900 text-slate-400 hover:text-white border border-slate-800" : "bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-150"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <span className="text-[10px] font-mono text-slate-400 font-bold">
          Found {filteredMaintenances.length} ticket{filteredMaintenances.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMaintenances.length === 0 ? (
          <div className={`col-span-full text-center py-16 font-mono text-slate-500 border border-dashed rounded-2xl ${
            isDark ? "border-slate-800" : "border-slate-300"
          }`}>
            No service logs match the selected filter criteria.
          </div>
        ) : (
          filteredMaintenances.map(m => {
            const isPending = m.status === "Pending";
            const isApproved = m.status === "Approved";
            const isResolved = m.status === "Resolved";

            const ticketAsset = assets.find(a => a.id === m.assetId);
            const imageSrc = m.photoUrl || getMaintenanceImage(ticketAsset?.category, m.description, m.id);

            return (
              <div
                key={m.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between gap-4 transition duration-200 hover:scale-[1.01] ${
                  isDark ? "bg-[#0B1220]/20 border-slate-800/80 hover:border-slate-700/80" : "bg-white border-slate-200 shadow-sm hover:border-slate-300"
                }`}
              >
                <div className="space-y-3">
                  {/* Visual Repair Image */}
                  <div className="h-32 w-full rounded-xl overflow-hidden border border-slate-200/10 relative bg-slate-950 shrink-0 shadow-inner">
                    <img 
                      src={imageSrc} 
                      alt={`${m.assetName} - ${m.description}`} 
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover hover:scale-105 transition duration-300 opacity-90"
                      referrerPolicy="no-referrer"
                    />
                    <span className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider uppercase border shadow ${
                      isResolved ? "bg-emerald-600 text-white border-emerald-500" :
                      isApproved ? "bg-amber-500 text-white border-amber-400" :
                      "bg-blue-600 text-white border-blue-500"
                    }`}>
                      {m.status}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h3 className={`font-extrabold text-xs truncate ${isDark ? "text-white" : "text-slate-900"}`}>{m.assetName}</h3>
                        <span className={`inline-block text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border mt-1 ${
                          isDark ? "text-slate-400 bg-slate-900 border-slate-800" : "text-slate-600 bg-slate-100 border-slate-150"
                        }`}>{m.assetTag}</span>
                      </div>
                      
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 ${
                        m.priority === "Critical" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                        m.priority === "High" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                        "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                      }`}>
                        {m.priority}
                      </span>
                    </div>

                    <p className={`text-xs leading-relaxed italic ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      "{m.description}"
                    </p>

                    <div className={`text-[10px] space-y-1 pt-2.5 border-t font-mono ${
                      isDark ? "border-slate-850 text-slate-500" : "border-slate-150 text-slate-500"
                    }`}>
                      <div className="flex justify-between">
                        <span>Current state:</span>
                        <span className={`font-bold ${
                          isResolved ? "text-emerald-500" : isApproved ? "text-amber-500" : "text-blue-500"
                        }`}>{m.status}</span>
                      </div>
                      {m.technicianName && (
                        <div className="flex justify-between">
                          <span>Assigned Engineer:</span>
                          <span className={`font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>{m.technicianName}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Logged date:</span>
                        <span className="font-medium">{new Date(m.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technician assignment triggers for Managers */}
                {isManagerOrAdmin && !isResolved && (
                  <div className={`pt-3 border-t flex justify-end gap-1.5 ${isDark ? "border-slate-850" : "border-slate-150"}`}>
                    {isPending ? (
                      showAssignInput === m.id ? (
                        <div className="flex gap-1 w-full">
                          <input
                            type="text"
                            placeholder="Technician..."
                            value={assignedTechnician[m.id] || ""}
                            onChange={(e) => setAssignedTechnician({ ...assignedTechnician, [m.id]: e.target.value })}
                            className={`p-1.5 text-xs rounded-lg flex-grow outline-none border ${
                              isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                            }`}
                          />
                          <button
                            onClick={() => handleApproveTicket(m.id)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowAssignInput(null)}
                            className="p-1.5 bg-slate-800 text-slate-400 rounded-lg cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowAssignInput(m.id)}
                          className="w-full text-xs font-bold py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Settings className="w-3.5 h-3.5" /> Approve & Assign Tech
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => handleResolveTicket(m.id)}
                        className="w-full text-xs font-bold py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Check className="w-4 h-4" /> Dispatch Resolution Complete
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Log Service Ticket */}
      {isTicketOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateTicket}
            className={`${
              isDark ? "bg-[#090D16] border-slate-800 text-white" : "bg-white border-slate-200 text-[#0F172A] shadow-2xl"
            } border rounded-3xl w-full max-w-sm p-6 space-y-4 relative`}
          >
            <button
              type="button"
              onClick={() => setIsTicketOpen(false)}
              className={`absolute right-6 top-6 ${isDark ? "text-slate-500" : "text-slate-400 hover:text-slate-700"}`}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className={`text-base font-display font-bold ${isDark ? "text-white" : "text-[#0F172A]"}`}>Request Resource Service</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Select Damaged Asset</label>
                <select
                  required
                  value={ticketForm.assetId}
                  onChange={(e) => setTicketForm({ ...ticketForm, assetId: e.target.value })}
                  className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                    isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                  }`}
                >
                  <option value="">-- Choose Asset --</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.tag})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Priority</label>
                  <select
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value as any })}
                    className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                      isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                    }`}
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Critical">Critical Priority</option>
                  </select>
                </div>
                <div>
                  <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={ticketForm.scheduledDate}
                    onChange={(e) => setTicketForm({ ...ticketForm, scheduledDate: e.target.value })}
                    className={`w-full p-2 rounded-xl text-xs outline-none border font-mono ${
                      isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Issue / Malfunction Description</label>
                <textarea
                  required
                  placeholder="Describe screen flickers, battery drain, mechanical failure..."
                  rows={3}
                  value={ticketForm.issueDescription}
                  onChange={(e) => setTicketForm({ ...ticketForm, issueDescription: e.target.value })}
                  className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                    isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                  }`}
                />
              </div>

              <div>
                <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Attach Issue Photo URL (Optional)</label>
                <input
                  type="text"
                  placeholder="Paste image URL or click a sample damage preset below..."
                  value={ticketForm.photoUrl}
                  onChange={(e) => setTicketForm({ ...ticketForm, photoUrl: e.target.value })}
                  className={`w-full p-2.5 rounded-xl text-xs outline-none border font-mono ${
                    isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                  }`}
                />
                
                  <div className="mt-2 space-y-1">
                    <span className="text-[10px] text-slate-400 block font-mono">Quick Sample Presets:</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTicketForm({ ...ticketForm, photoUrl: maintenanceImageUrl("1561064041-38db54d8c63d") })}
                        className={`px-2 py-1 text-[10px] rounded-lg cursor-pointer transition border font-semibold ${
                          isDark 
                            ? "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800" 
                            : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200"
                        }`}
                      >
                        🖥️ Cracked Monitor
                      </button>
                      <button
                        type="button"
                        onClick={() => setTicketForm({ ...ticketForm, photoUrl: maintenanceImageUrl("1721333089418-faead19e3654") })}
                        className={`px-2 py-1 text-[10px] rounded-lg cursor-pointer transition border font-semibold ${
                          isDark 
                            ? "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800" 
                            : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200"
                        }`}
                      >
                        💻 Broken Laptop
                      </button>
                      <button
                        type="button"
                        onClick={() => setTicketForm({ ...ticketForm, photoUrl: maintenanceImageUrl("1746017302141-c9b930816de9") })}
                        className={`px-2 py-1 text-[10px] rounded-lg cursor-pointer transition border font-semibold ${
                          isDark 
                            ? "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800" 
                            : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200"
                        }`}
                      >
                        📱 Cracked Phone
                      </button>
                      <button
                        type="button"
                        onClick={() => setTicketForm({ ...ticketForm, photoUrl: maintenanceImageUrl("1710857679450-ecd7945dd4bd") })}
                        className={`px-2 py-1 text-[10px] rounded-lg cursor-pointer transition border font-semibold ${
                          isDark 
                            ? "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800" 
                            : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200"
                        }`}
                      >
                        🖨️ Printer Jam
                      </button>
                      <button
                        type="button"
                        onClick={() => setTicketForm({ ...ticketForm, photoUrl: maintenanceImageUrl("1779357807496-ac3f5c17b941") })}
                        className={`px-2 py-1 text-[10px] rounded-lg cursor-pointer transition border font-semibold ${
                          isDark 
                            ? "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800" 
                            : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200"
                        }`}
                      >
                        🚗 Flat Tyre
                      </button>
                    </div>
                  </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full text-xs font-semibold py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl cursor-pointer"
            >
              Dispatch Servicing Ticket
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
