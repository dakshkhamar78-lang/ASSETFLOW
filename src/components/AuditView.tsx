import React, { useState } from "react";
import {
  FileText,
  CheckCircle,
  Plus,
  ArrowRight,
  ClipboardList,
  AlertTriangle,
  Cpu,
  RefreshCw,
  X,
  FileSpreadsheet,
  Layers,
  Activity,
  Check,
  CheckSquare,
  AlertCircle
} from "lucide-react";
import { AuditCycle, AuditItem, Asset, User, Role, AssetCondition, AssetStatus } from "../types";
import { api } from "../api";

interface AuditViewProps {
  audits: AuditCycle[];
  assets: Asset[];
  users: User[];
  departments: any[];
  currentUser: User;
  onRefreshAudits: () => void;
  onRefreshAssets: () => void;
  theme: "dark" | "light";
}

export default function AuditView({
  audits,
  assets,
  users,
  departments,
  currentUser,
  onRefreshAudits,
  onRefreshAssets,
  theme
}: AuditViewProps) {
  const isDark = theme === "dark";
  const isManagerOrAdmin = currentUser.role === Role.Admin || currentUser.role === Role.AssetManager;

  // States
  const [isNewAuditOpen, setIsNewAuditOpen] = useState(false);
  const [activeCycle, setActiveCycle] = useState<AuditCycle | null>(null);
  
  // Gemini Executive Report state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiReportText, setAiReportText] = useState<string | null>(null);

  // Form
  const [newAuditForm, setNewAuditForm] = useState({
    title: "",
    departmentId: "",
    location: "San Francisco Office"
  });

  // Verification Form State (inside audit list)
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemVerification, setItemVerification] = useState({
    verified: true,
    condition: AssetCondition.Good,
    notes: ""
  });

  const handleCreateAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAudit(newAuditForm);
      onRefreshAudits();
      setIsNewAuditOpen(false);
      setNewAuditForm({ title: "", departmentId: "", location: "San Francisco Office" });
    } catch (err: any) {
      alert(`Audit creation failed: ${err.message}`);
    }
  };

  const handleStartAudit = async (id: string) => {
    try {
      const updated = await api.startAudit(id);
      onRefreshAudits();
      setActiveCycle(updated);
    } catch (err: any) {
      alert(`Failed to start audit: ${err.message}`);
    }
  };

  const handleUpdateItemVerification = async (itemId: string) => {
    if (!activeCycle) return;
    try {
      const updated = await api.updateAuditItem(activeCycle.id, {
        itemId,
        verified: itemVerification.verified,
        condition: itemVerification.condition,
        notes: itemVerification.notes
      });
      onRefreshAudits();
      setActiveCycle(updated);
      setEditingItemId(null);
    } catch (err: any) {
      alert(`Item update failed: ${err.message}`);
    }
  };

  const handleCloseAudit = async (id: string) => {
    if (!window.confirm("Closing this audit commits all verified item conditions, statuses, and locations directly back into the live inventory directory. Proceed?")) return;
    try {
      await api.closeAudit(id);
      onRefreshAudits();
      onRefreshAssets();
      setActiveCycle(null);
      alert("Compliance Audit closed. Assets synchronized.");
    } catch (err: any) {
      alert(`Closing audit failed: ${err.message}`);
    }
  };

  const handleGenerateAiReport = async (id: string) => {
    setIsAiLoading(true);
    setAiReportText(null);
    try {
      const response = await api.getAiAuditReport(id);
      setAiReportText(response.report);
    } catch (err: any) {
      alert(`AI compliance engine failed: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-xs font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold">Audit Logs</h1>
          <p className="text-xs text-slate-500">Initiate physical audit cycles, check expected holders, and synthesize discrepancy reports using Gemini AI</p>
        </div>

        {isManagerOrAdmin && (
          <button
            onClick={() => setIsNewAuditOpen(true)}
            className="font-semibold px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition shadow-md shadow-indigo-500/10 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Start Audit Cycle
          </button>
        )}
      </div>

      {/* Cycle List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {audits.map(aud => {
          const matchedDept = departments.find(d => d.id === aud.departmentId);
          const totalCount = aud.items.length;
          const verifiedCount = aud.items.filter(i => i.verified).length;
          const pct = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

          return (
            <div
              key={aud.id}
              className={`p-4 rounded-2xl border flex flex-col justify-between gap-4 ${
                isDark ? "bg-slate-900/40 border-slate-800/60" : "bg-white border-slate-200"
              }`}
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-200 dark:text-white">{aud.title}</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Location Scope: {aud.location}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono border font-semibold ${
                    aud.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    aud.status === "In-Progress" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                    "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  }`}>
                    {aud.status}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Audit Verification Progress</span>
                    <span>{verifiedCount} / {totalCount} Items</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-mono space-y-0.5">
                  <div>Target Team: <span className="text-slate-300 font-semibold">{matchedDept ? matchedDept.name : "All Departments"}</span></div>
                  <div>Created: <span>{new Date(aud.createdAt).toLocaleDateString('en-IN')}</span></div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 border-t border-slate-900 flex justify-end gap-1.5">
                {aud.status === "Draft" ? (
                  <button
                    onClick={() => handleStartAudit(aud.id)}
                    className="w-full font-semibold py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl cursor-pointer"
                  >
                    Deploy Audit Cycle
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setActiveCycle(aud);
                      setAiReportText(null);
                    }}
                    className="w-full font-semibold py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl cursor-pointer"
                  >
                    Manage Verification
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Verification & Gemini Reporting Screen */}
      {activeCycle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 relative">
            <button
              onClick={() => setActiveCycle(null)}
              className="absolute right-6 top-6 text-slate-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="pb-4 border-b border-slate-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded font-mono">CYCLE MANAGEMENT</span>
                <h2 className="text-xl font-display font-bold text-white mt-1">{activeCycle.title}</h2>
                <p className="text-xs text-slate-500 font-mono">Scope: {activeCycle.location} • Status: {activeCycle.status}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGenerateAiReport(activeCycle.id)}
                  disabled={isAiLoading}
                  className="text-xs font-semibold px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl transition flex items-center gap-1.5 shadow-md shadow-indigo-600/10 disabled:opacity-50 cursor-pointer"
                >
                  <Cpu className="w-4 h-4" /> {isAiLoading ? "Synthesizing Compliance..." : "Gemini AI Discrepancy Report"}
                </button>

                {activeCycle.status === "In-Progress" && isManagerOrAdmin && (
                  <button
                    onClick={() => handleCloseAudit(activeCycle.id)}
                    className="text-xs font-semibold px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer"
                  >
                    Commit & Close Audit
                  </button>
                )}
              </div>
            </div>

            {/* Split screen: Left Audits verification grid, Right Gemini executive report */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
              
              {/* Left Column (items list) */}
              <div className="lg:col-span-7 space-y-4">
                <h3 className="font-display font-semibold text-sm text-slate-200">Reconciled Hardware Checklist ({activeCycle.items.length} assets)</h3>
                
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {activeCycle.items.map(item => {
                    const isEditing = editingItemId === item.id;
                    const asset = assets.find(a => a.id === item.assetId);

                    return (
                      <div className="p-3 bg-slate-900/40 hover:bg-slate-900 border border-slate-800/60 rounded-2xl flex flex-col justify-between gap-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-200 dark:text-white">{item.assetName}</h4>
                            <span className="text-[9px] font-mono text-slate-500 uppercase bg-slate-950 px-1 py-0.5 rounded border border-slate-800">{item.assetTag}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.verified ? (
                              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Reconciled
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Unchecked
                              </span>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <label className="flex items-center gap-2 text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={itemVerification.verified}
                                  onChange={(e) => setItemVerification({ ...itemVerification, verified: e.target.checked })}
                                  className="w-4 h-4"
                                />
                                Physical Unit Verified
                              </label>

                              <select
                                value={itemVerification.condition}
                                onChange={(e) => setItemVerification({ ...itemVerification, condition: e.target.value as AssetCondition })}
                                className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                              >
                                {Object.values(AssetCondition).map(cond => (
                                  <option key={cond} value={cond}>{cond}</option>
                                ))}
                              </select>
                            </div>

                            <input
                              type="text"
                              placeholder="Add reconciliation notes (missing accessory, cosmetic scratches...)"
                              value={itemVerification.notes}
                              onChange={(e) => setItemVerification({ ...itemVerification, notes: e.target.value })}
                              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white outline-none text-[11px]"
                            />

                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleUpdateItemVerification(item.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer"
                              >
                                Commit Verify
                              </button>
                              <button
                                onClick={() => setEditingItemId(null)}
                                className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-end text-[11px] pt-1.5 border-t border-slate-900">
                            <div>
                              <p className="text-slate-400">Audited Condition: <span className="text-slate-200 font-semibold">{item.condition || "N/A"}</span></p>
                              {item.notes && <p className="text-slate-500 mt-0.5">Notes: "{item.notes}"</p>}
                            </div>

                            {activeCycle.status === "In-Progress" && isManagerOrAdmin && (
                              <button
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setItemVerification({
                                    verified: item.verified,
                                    condition: item.condition || AssetCondition.Good,
                                    notes: item.notes || ""
                                  });
                                }}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 rounded border border-slate-700/60 transition cursor-pointer"
                              >
                                Update Verification
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column (Gemini compliance report) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between min-h-[350px]">
                  <div>
                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800/40">
                      <Cpu className="w-4 h-4 text-violet-400" />
                      <h4 className="font-display font-semibold text-xs text-slate-200">Gemini Compliance Executive Report</h4>
                    </div>

                    <div className="mt-4 text-slate-300 leading-relaxed max-h-[380px] overflow-y-auto pr-1 whitespace-pre-line text-[11px]">
                      {aiReportText ? (
                        aiReportText
                      ) : (
                        <div className="text-center py-20 text-slate-500">
                          <ClipboardList className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                          <p>Click "Gemini AI Discrepancy Report" to synthesize active compliance risks and audit discrepancy insights.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {aiReportText && (
                    <button
                      onClick={() => {
                        const blob = new Blob([aiReportText], { type: "text/markdown;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.setAttribute("href", url);
                        link.setAttribute("download", `AssetFlow_Audit_Report_${activeCycle.id}.md`);
                        link.click();
                      }}
                      className="w-full text-center py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl cursor-pointer mt-4"
                    >
                      Export Compliance Report (.md)
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL: Start New Audit Cycle */}
      {isNewAuditOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateAudit}
            className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4 relative"
          >
            <button
              type="button"
              onClick={() => setIsNewAuditOpen(false)}
              className="absolute right-6 top-6 text-slate-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-display font-bold">Deploy Audit Reconciliation Cycle</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Cycle Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q3 Engineering Floor Verification"
                  value={newAuditForm.title}
                  onChange={(e) => setNewAuditForm({ ...newAuditForm, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Target Department Scope</label>
                  <select
                    value={newAuditForm.departmentId}
                    onChange={(e) => setNewAuditForm({ ...newAuditForm, departmentId: e.target.value })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                  >
                    <option value="">-- All Departments --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Audit Physical Office Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. San Francisco Office"
                    value={newAuditForm.location}
                    onChange={(e) => setNewAuditForm({ ...newAuditForm, location: e.target.value })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full text-xs font-semibold py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl cursor-pointer"
            >
              Initialize Draft Cycle
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
