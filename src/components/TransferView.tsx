import React, { useState } from "react";
import { ArrowRightLeft, Check, X, Plus, AlertCircle, MessageSquare } from "lucide-react";
import { Transfer, Asset, Department, User, Role } from "../types";
import { api } from "../api";

interface TransferViewProps {
  transfers: Transfer[];
  assets: Asset[];
  departments: Department[];
  users: User[];
  currentUser: User;
  onRefreshTransfers: () => void;
  theme: "dark" | "light";
}

export default function TransferView({
  transfers,
  assets,
  departments,
  users,
  currentUser,
  onRefreshTransfers,
  theme
}: TransferViewProps) {
  const isDark = theme === "dark";
  const isApprover = currentUser.role === Role.Admin || currentUser.role === Role.AssetManager || currentUser.role === Role.DepartmentHead;

  // States
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [rejectComments, setRejectComments] = useState<Record<string, string>>({});
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);

  // Form
  const [transferForm, setTransferForm] = useState({
    assetId: "",
    targetDepartmentId: "",
    targetHolderId: "",
    comments: ""
  });

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTransfer(transferForm);
      onRefreshTransfers();
      setIsRequestOpen(false);
      setTransferForm({ assetId: "", targetDepartmentId: "", targetHolderId: "", comments: "" });
    } catch (err: any) {
      alert(`Transfer Request failed: ${err.message}`);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.approveTransfer(id);
      onRefreshTransfers();
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    }
  };

  const handleReject = async (id: string) => {
    const comment = rejectComments[id] || "Rejected by reviewer.";
    try {
      await api.rejectTransfer(id, comment);
      onRefreshTransfers();
      setShowRejectInput(null);
    } catch (err: any) {
      alert(`Rejection failed: ${err.message}`);
    }
  };

  // Filter States
  const [statusTab, setStatusTab] = useState<string>("All");

  // Calculate statistics
  const totalTransfers = transfers.length;
  const pendingTransfers = transfers.filter(t => t.status === "Pending").length;
  const approvedTransfers = transfers.filter(t => t.status === "Approved").length;
  const rejectedTransfers = transfers.filter(t => t.status === "Rejected").length;

  // Filter transfers
  const filteredTransfers = transfers.filter(t => {
    return statusTab === "All" || t.status === statusTab;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-display font-extrabold ${isDark ? "text-white" : "text-slate-900"} tracking-tight flex items-center gap-2`}>
            <ArrowRightLeft className="w-6 h-6 text-indigo-500" />
            <span>Asset Relocations</span>
          </h1>
          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"} mt-1`}>
            Review and coordinate the physical relocation or transfer of hardware inventory across corporate departments.
          </p>
        </div>

        <button
          onClick={() => setIsRequestOpen(true)}
          className="text-xs font-bold px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition shadow-md shadow-indigo-600/10 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Request Transfer
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Relocation petitions</span>
            <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
          </div>
          <h3 className={`text-2xl font-extrabold font-display leading-tight mt-2 ${isDark ? "text-white" : "text-slate-900"}`}>{totalTransfers}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Total requests logged</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Awaiting review</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className={`text-2xl font-extrabold font-display leading-tight mt-2 ${isDark ? "text-white" : "text-slate-900"}`}>{pendingTransfers}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Awaiting head sign-off</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Approved relocations</span>
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className={`text-2xl font-extrabold font-display leading-tight mt-2 ${isDark ? "text-[#10B981]" : "text-[#059669]"}`}>{approvedTransfers}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Inventory moved successfully</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Rejected petitions</span>
            <X className="w-4 h-4 text-rose-500" />
          </div>
          <h3 className={`text-2xl font-extrabold font-display leading-tight mt-2 ${isDark ? "text-white" : "text-slate-900"}`}>{rejectedTransfers}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Petitions denied with feedback</p>
        </div>
      </div>

      {/* Filter Tabs and Timeline Status */}
      <div className={`p-3 rounded-2xl border flex flex-wrap gap-4 items-center justify-between ${
        isDark ? "bg-slate-900/20 border-slate-850" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className="flex items-center gap-1.5">
          {["All", "Pending", "Approved", "Rejected"].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`px-3 py-1.5 text-xs rounded-xl font-bold transition cursor-pointer ${
                statusTab === tab
                  ? "bg-indigo-600 text-white shadow-sm"
                  : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab} Logs
            </button>
          ))}
        </div>

        <span className="text-[10px] font-mono text-slate-400 font-bold">
          Displaying {filteredTransfers.length} relocate logs
        </span>
      </div>

      {/* Main ledger list */}
      <div className={`border ${isDark ? "bg-[#0B1220]/20 border-slate-800/80" : "bg-white border-slate-200 shadow-sm"} rounded-2xl overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b ${isDark ? "border-slate-800 bg-[#0B1220]/60 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"} font-mono uppercase tracking-wider`}>
                <th className="p-4 font-bold">Relocating Resource</th>
                <th className="p-4 font-bold">Requested By</th>
                <th className="p-4 font-bold">Source Dept</th>
                <th className="p-4 font-bold">Target Destination</th>
                <th className="p-4 font-bold">Status Timeline</th>
                {isApprover && <th className="p-4 font-bold text-right">Review Actions</th>}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-slate-800/40" : "divide-slate-200/60"}`}>
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`p-12 text-center font-medium ${isDark ? "text-slate-500" : "text-slate-400"} font-mono`}>
                    No cross-department transfers match this filter.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map(trf => {
                  const targetDept = departments.find(d => d.id === trf.targetDepartmentId);
                  const sourceDept = departments.find(d => d.id === trf.sourceDepartmentId);
                  const targetUser = users.find(u => u.id === trf.targetHolderId);
                  const isPending = trf.status === "Pending";

                  return (
                    <tr key={trf.id} className={`transition-colors border-b ${isDark ? "hover:bg-slate-900/30 border-slate-800/40" : "hover:bg-[#EFF6FF] border-slate-200/60"}`}>
                      <td className="p-4">
                        <div className={`font-extrabold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{trf.assetName}</div>
                        <span className={`inline-block text-[9px] font-mono mt-1 px-1.5 py-0.5 rounded border ${
                          isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-slate-100 border-slate-150 text-slate-600"
                        }`}>Tag: {trf.assetTag}</span>
                      </td>
                      <td className="p-4">
                        <div className={`font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>{trf.requestedByName}</div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{new Date(trf.createdAt).toLocaleDateString('en-IN')}</span>
                      </td>
                      <td className={`p-4 font-semibold ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        {sourceDept ? sourceDept.name : "Unassigned"}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>{targetDept ? targetDept.name : "Unknown"}</span>
                          {targetUser && (
                            <span className="text-[10px] font-mono text-indigo-500 font-bold">({targetUser.name})</span>
                          )}
                        </div>
                        {trf.comments && (
                          <p className="text-[10px] text-slate-400 italic mt-1.5 flex items-center gap-1 max-w-[200px] truncate" title={trf.comments}>
                            <MessageSquare className="w-3 h-3 text-indigo-500 shrink-0" /> "{trf.comments}"
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-mono border font-bold w-fit ${
                            trf.status === "Pending" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                            trf.status === "Approved" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                            "bg-red-500/10 text-red-500 border-red-500/20"
                          }`}>
                            {trf.status}
                          </span>
                          {trf.approvedByName && (
                            <span className="text-[9px] text-slate-500 block font-mono">Authorized: {trf.approvedByName}</span>
                          )}
                        </div>
                      </td>
                      
                      {/* Review Actions */}
                      {isApprover && (
                        <td className="p-4 text-right">
                          {isPending ? (
                            <div className="flex justify-end gap-1.5 items-center">
                              {showRejectInput === trf.id ? (
                                <div className="flex gap-1 items-center">
                                  <input
                                    type="text"
                                    placeholder="Rejection note..."
                                    value={rejectComments[trf.id] || ""}
                                    onChange={(e) => setRejectComments({ ...rejectComments, [trf.id]: e.target.value })}
                                    className={`p-1.5 text-xs rounded-lg outline-none border ${
                                      isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                                    }`}
                                  />
                                  <button
                                    onClick={() => handleReject(trf.id)}
                                    className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg cursor-pointer"
                                    title="Deny petition"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setShowRejectInput(null)}
                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-[10px] cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleApprove(trf.id)}
                                    className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center justify-center gap-1 cursor-pointer text-[11px] font-bold shadow-sm"
                                    title="Approve relocation"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Approve
                                  </button>
                                  <button
                                    onClick={() => setShowRejectInput(trf.id)}
                                    className={`p-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer text-[11px] font-bold shadow-sm border ${
                                      isDark 
                                        ? "bg-slate-900 hover:bg-slate-850 text-red-400 border-slate-800 hover:border-red-500/20" 
                                        : "bg-white hover:bg-red-50 text-red-600 border-slate-200 hover:border-red-200"
                                    }`}
                                    title="Reject relocation"
                                  >
                                    <X className="w-3.5 h-3.5" /> Reject
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-[10px]">Decision Locked</span>
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

      {/* MODAL: Request Transfer */}
      {isRequestOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleRequestSubmit}
            className={`${
              isDark ? "bg-[#090D16] border-slate-800 text-white" : "bg-white border-slate-200 text-[#0F172A] shadow-2xl"
            } border rounded-3xl w-full max-w-sm p-6 space-y-4 relative`}
          >
            <button
              type="button"
              onClick={() => setIsRequestOpen(false)}
              className={`absolute right-6 top-6 ${isDark ? "text-slate-500" : "text-slate-400 hover:text-slate-700"}`}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className={`text-base font-display font-bold ${isDark ? "text-white" : "text-[#0F172A]"}`}>Relocate Hardware Resource</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Target Asset</label>
                <select
                  required
                  value={transferForm.assetId}
                  onChange={(e) => setTransferForm({ ...transferForm, assetId: e.target.value })}
                  className={`w-full p-2.5 rounded-xl text-xs outline-none border font-mono ${
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
                  <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Target Department</label>
                  <select
                    required
                    value={transferForm.targetDepartmentId}
                    onChange={(e) => setTransferForm({ ...transferForm, targetDepartmentId: e.target.value })}
                    className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                      isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                    }`}
                  >
                    <option value="">-- Dept --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Target Holder (Optional)</label>
                  <select
                    value={transferForm.targetHolderId}
                    onChange={(e) => setTransferForm({ ...transferForm, targetHolderId: e.target.value })}
                    className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                      isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                    }`}
                  >
                    <option value="">-- Employee --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Transfer Justification Notes</label>
                <textarea
                  required
                  placeholder="Explain why this hardware needs to relocate departments..."
                  rows={3}
                  value={transferForm.comments}
                  onChange={(e) => setTransferForm({ ...transferForm, comments: e.target.value })}
                  className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                    isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full text-xs font-semibold py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl cursor-pointer"
            >
              Submit Transfer Petition
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
