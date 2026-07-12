import React, { useState } from "react";
import { 
  FileBarChart2, 
  ArrowDownToLine, 
  Printer, 
  Calendar,
  Layers,
  Hammer,
  ArrowRightLeft,
  Briefcase,
  AlertCircle
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from "recharts";
import { Asset, Booking, Maintenance, Transfer } from "../types";

interface ReportsViewProps {
  assets: Asset[];
  bookings: Booking[];
  maintenances: Maintenance[];
  transfers: Transfer[];
  onExportCSV: (type: "assets" | "bookings" | "maintenances" | "transfers") => void;
  onPrintInventory: () => void;
  theme: "dark" | "light";
  userName: string;
}

export default function ReportsView({
  assets,
  bookings,
  maintenances,
  transfers,
  onExportCSV,
  onPrintInventory,
  theme,
  userName
}: ReportsViewProps) {
  const isDark = theme === "dark";

  // Calculate live statistics
  const totalAssetsCost = assets.reduce((sum, item) => sum + (item.purchaseCost || 0), 0);
  const totalActiveBookings = bookings.filter(b => b.status === "Ongoing" || b.status === "Upcoming").length;
  const pendingTransfers = transfers.filter(t => t.status === "Pending").length;
  const pendingMaintenance = maintenances.filter(m => m.status === "Pending" || m.status === "In-Progress").length;

  // Process data for Category Valuation Area Chart
  const categoryMap: Record<string, number> = {};
  assets.forEach((asset) => {
    const cat = asset.category || "General";
    categoryMap[cat] = (categoryMap[cat] || 0) + (asset.purchaseCost || 0);
  });
  
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    Valuation: value,
  }));

  // Process data for Asset Condition Distribution Pie Chart
  const conditionMap: Record<string, number> = { New: 0, Good: 0, Fair: 0, Poor: 0 };
  assets.forEach((asset) => {
    const cond = asset.condition || "Good";
    if (conditionMap[cond] !== undefined) {
      conditionMap[cond]++;
    } else {
      conditionMap["Good"]++;
    }
  });

  const conditionData = Object.entries(conditionMap).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = {
    New: "#6366F1",     // Indigo
    Good: "#10B981",    // Emerald
    Fair: "#F59E0B",    // Amber
    Poor: "#EF4444",    // Rose
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-display font-extrabold ${isDark ? "text-white" : "text-slate-900"} tracking-tight flex items-center gap-2`}>
            <FileBarChart2 className="w-6 h-6 text-indigo-500" />
            <span>Audits & Executive Reports</span>
          </h1>
          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"} mt-1`}>
            Generate high-fidelity spreadsheets, examine asset valuation curves, and print physical documents for operational reviews.
          </p>
        </div>
      </div>

      {/* Mini Executive Snapshot Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Gross Valuation</span>
          <h3 className={`text-2xl font-extrabold font-display leading-tight mt-2 ${isDark ? "text-white" : "text-slate-900"}`}>
            ₹{totalAssetsCost.toLocaleString()}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">Total active inventory cost</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Active Schedule</span>
          <h3 className={`text-2xl font-extrabold font-display leading-tight mt-2 ${isDark ? "text-white" : "text-slate-900"}`}>
            {totalActiveBookings}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">Ongoing room & vehicle holds</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Service Desk Queue</span>
          <h3 className={`text-2xl font-extrabold font-display leading-tight mt-2 ${pendingMaintenance > 0 ? "text-rose-400" : isDark ? "text-white" : "text-slate-900"}`}>
            {pendingMaintenance}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">Repair tickets awaiting dispatch</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Transfer Petitions</span>
          <h3 className={`text-2xl font-extrabold font-display leading-tight mt-2 ${isDark ? "text-white" : "text-slate-900"}`}>
            {pendingTransfers}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">Cross-department requests</p>
        </div>
      </div>

      {/* Analytics Charts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1: Category Valuation Curve */}
        <div className={`p-5 rounded-3xl border lg:col-span-8 flex flex-col justify-between gap-4 ${
          isDark ? "bg-[#0B1220]/20 border-slate-800/80" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div>
            <h3 className={`text-sm font-display font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Capital Distribution Curve</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Asset replacement valuation totals categorized by inventory division</p>
          </div>

          <div className="h-64 w-full">
            {categoryData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs font-mono text-slate-500">
                No inventory datasets to compute curve.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValuation" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="name" 
                    stroke={isDark ? "#475569" : "#94A3B8"} 
                    fontSize={10} 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke={isDark ? "#475569" : "#94A3B8"} 
                    fontSize={10} 
                    tickLine={false} 
                  />
                  <ChartTooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? "#090D16" : "#FFFFFF", 
                      borderColor: isDark ? "#1E293B" : "#E2E8F0",
                      borderRadius: "12px",
                      fontSize: "11px",
                      color: isDark ? "#FFFFFF" : "#0F172A"
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Valuation" 
                    stroke="#6366F1" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorValuation)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Asset Condition Distribution */}
        <div className={`p-5 rounded-3xl border lg:col-span-4 flex flex-col justify-between gap-4 ${
          isDark ? "bg-[#0B1220]/20 border-slate-800/80" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div>
            <h3 className={`text-sm font-display font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Health & Degradation</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Asset conditions index based on real-time hardware logging audits</p>
          </div>

          <div className="h-64 w-full flex flex-col items-center justify-center">
            {assets.length === 0 ? (
              <div className="text-xs font-mono text-slate-500">No assets detected.</div>
            ) : (
              <div className="relative w-full h-full">
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={conditionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {conditionData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[entry.name as keyof typeof COLORS] || "#6366F1"} 
                        />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      contentStyle={{ 
                        backgroundColor: isDark ? "#090D16" : "#FFFFFF", 
                        borderColor: isDark ? "#1E293B" : "#E2E8F0",
                        borderRadius: "12px",
                        fontSize: "11px",
                        color: isDark ? "#FFFFFF" : "#0F172A"
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Custom list description */}
                <div className="flex justify-center gap-3 text-[10px] font-mono mt-1 flex-wrap">
                  {conditionData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1">
                      <span 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: COLORS[entry.name as keyof typeof COLORS] }}
                      />
                      <span className={isDark ? "text-slate-400" : "text-slate-600"}>{entry.name} ({entry.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Primary Report Generator Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Asset Directory */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between gap-4 transition-all duration-200 hover:scale-[1.01] ${
          isDark ? "bg-[#0B1220]/20 border-slate-800/80 hover:border-slate-700" : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
        }`}>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <h4 className={`font-bold font-display text-xs ${isDark ? "text-slate-200" : "text-slate-850"}`}>
                Inventory Registry
              </h4>
            </div>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Full database directory details including depreciated values, cost metrics, and barcodes.
            </p>
          </div>
          
          <div className="flex gap-1.5 text-xs">
            <button
              onClick={() => onExportCSV("assets")}
              className="flex-grow font-bold py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition text-[10px]"
            >
              <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
            </button>
            <button
              onClick={onPrintInventory}
              className="px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl cursor-pointer transition flex items-center justify-center"
              title="Generate printable PDF layout"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 2: Bookings */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between gap-4 transition-all duration-200 hover:scale-[1.01] ${
          isDark ? "bg-[#0B1220]/20 border-slate-800/80 hover:border-slate-700" : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
        }`}>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <h4 className={`font-bold font-display text-xs ${isDark ? "text-slate-200" : "text-slate-850"}`}>
                Reservations ledger
              </h4>
            </div>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Chronological log of corporate bookings, boardrooms, vehicle entries, and assets.
            </p>
          </div>
          
          <button
            onClick={() => onExportCSV("bookings")}
            className="w-full font-bold py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition text-[10px]"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
          </button>
        </div>

        {/* Card 3: Maintenance */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between gap-4 transition-all duration-200 hover:scale-[1.01] ${
          isDark ? "bg-[#0B1220]/20 border-slate-800/80 hover:border-slate-700" : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
        }`}>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                <Hammer className="w-4 h-4" />
              </div>
              <h4 className={`font-bold font-display text-xs ${isDark ? "text-slate-200" : "text-slate-850"}`}>
                Repair SLA Records
              </h4>
            </div>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Complete ticket history, repair descriptions, technician assignments, and cost factors.
            </p>
          </div>
          
          <button
            onClick={() => onExportCSV("maintenances")}
            className="w-full font-bold py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition text-[10px]"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
          </button>
        </div>

        {/* Card 4: Transfers */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between gap-4 transition-all duration-200 hover:scale-[1.01] ${
          isDark ? "bg-[#0B1220]/20 border-slate-800/80 hover:border-slate-700" : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
        }`}>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-500 shrink-0">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <h4 className={`font-bold font-display text-xs ${isDark ? "text-slate-200" : "text-slate-850"}`}>
                Department Relocations
              </h4>
            </div>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Full authorization ledger of departmental transfers, approvals, and custody notes.
            </p>
          </div>
          
          <button
            onClick={() => onExportCSV("transfers")}
            className="w-full font-bold py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition text-[10px]"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
          </button>
        </div>
      </div>

      {/* Security notice footer */}
      <div className={`p-4 rounded-xl border flex items-start gap-3 ${
        isDark ? "bg-slate-950 border-slate-850 text-slate-400" : "bg-slate-50 border-slate-150 text-slate-600"
      }`}>
        <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">
          <strong>Corporate Security Protocol:</strong> All exported report spreadsheets and print documents contain sensitive operational data. Do not distribute CSV sheets outside authorized networks. Auditor logins are bound to user session ID <strong>{userName}</strong>.
        </p>
      </div>

    </div>
  );
}
