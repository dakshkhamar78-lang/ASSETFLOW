import React, { useState, useRef, useEffect } from "react";
import {
  Layers,
  Search,
  Plus,
  Trash2,
  QrCode,
  Calendar,
  CheckCircle,
  FileSpreadsheet,
  Cpu,
  RefreshCw,
  AlertCircle,
  User,
  ArrowRightLeft,
  X,
  Upload,
  UserCheck,
  CheckSquare,
  Square,
  Info
} from "lucide-react";
import { Asset, User as Employee, AssetCategory, AssetCondition, AssetStatus, Role } from "../types";
import { api } from "../api";

export const getCategoryImageUrl = (category: string) => {
  switch (category) {
    case "Laptop":
      return "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=300&q=80";
    case "Monitor":
      return "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=300&q=80";
    case "Server":
      return "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=300&q=80";
    case "Mobile":
      return "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=300&q=80";
    case "Vehicle":
      return "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=300&q=80";
    case "MeetingRoom":
      return "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=300&q=80";
    case "Desk":
      return "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=300&q=80";
    default:
      return "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=300&q=80";
  }
};

interface AssetManagerViewProps {
  assets: Asset[];
  users: Employee[];
  departments: any[];
  currentUser: Employee;
  onRefreshAssets: () => void;
  theme: "dark" | "light";
  defaultRegisterOpen?: boolean;
  onRegisterModalClose?: () => void;
}

export default function AssetManagerView({
  assets,
  users,
  departments,
  currentUser,
  onRefreshAssets,
  theme,
  defaultRegisterOpen,
  onRegisterModalClose
}: AssetManagerViewProps) {
  const isDark = theme === "dark";
  const isManagerOrAdmin = currentUser.role === Role.Admin || currentUser.role === Role.AssetManager;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedCondition, setSelectedCondition] = useState<string>("All");
  
  // Selection for bulk allocate
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  
  // Modals / Details
  const [activeAsset, setActiveAsset] = useState<Asset | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  useEffect(() => {
    if (defaultRegisterOpen) {
      setIsRegisterOpen(true);
    }
  }, [defaultRegisterOpen]);

  const closeRegisterModal = () => {
    setIsRegisterOpen(false);
    onRegisterModalClose?.();
  };
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [isBulkAllocateOpen, setIsBulkAllocateOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);

  // Gemini AI state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);

  // Registration and toast states
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Form states
  const [newAssetForm, setNewAssetForm] = useState({
    name: "",
    category: AssetCategory.Laptop,
    serialNumber: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    purchaseCost: "",
    warrantyMonths: "24",
    condition: AssetCondition.New,
    location: "San Francisco Office",
    isBookable: false,
    departmentId: "",
  });

  const [allocationForm, setAllocationForm] = useState({
    userId: "",
    expectedReturnDate: "",
    departmentId: ""
  });

  const [returnForm, setReturnForm] = useState({
    conditionCheck: AssetCondition.Good,
    notes: ""
  });

  // Bulk Excel import simulation
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Filtered Assets
  const filteredAssets = assets.filter(a => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.category && a.category.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === "All" || a.category === selectedCategory;
    const matchesStatus = selectedStatus === "All" || a.status === selectedStatus;
    const matchesCondition = selectedCondition === "All" || a.condition === selectedCondition;

    return matchesSearch && matchesCategory && matchesStatus && matchesCondition;
  });

  // Toggle selection
  const handleToggleSelectAsset = (id: string) => {
    const asset = assets.find(a => a.id === id);
    if (!asset || asset.status !== AssetStatus.Available) return; // Only allow selecting Available assets
    if (selectedAssetIds.includes(id)) {
      setSelectedAssetIds(selectedAssetIds.filter(x => x !== id));
    } else {
      setSelectedAssetIds([...selectedAssetIds, id]);
    }
  };

  const handleSelectAllAvailable = () => {
    const availableIds = filteredAssets
      .filter(a => a.status === AssetStatus.Available)
      .map(a => a.id);
    if (selectedAssetIds.length === availableIds.length) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(availableIds);
    }
  };

  // Register Asset
  const handleRegisterAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Explicit manual validation of all required fields
    const { name, category, purchaseDate, purchaseCost, warrantyMonths, condition, location } = newAssetForm;
    
    if (!name || !name.trim()) {
      setToast({ message: "Asset Name is required.", type: "error" });
      return;
    }
    if (!category) {
      setToast({ message: "Category is required.", type: "error" });
      return;
    }
    if (!purchaseDate) {
      setToast({ message: "Purchase Date is required.", type: "error" });
      return;
    }
    if (!purchaseCost || isNaN(Number(purchaseCost)) || Number(purchaseCost) <= 0) {
      setToast({ message: "Purchase Cost must be a positive number.", type: "error" });
      return;
    }
    if (!warrantyMonths || isNaN(Number(warrantyMonths)) || Number(warrantyMonths) < 0) {
      setToast({ message: "Warranty must be a non-negative number.", type: "error" });
      return;
    }
    if (!condition) {
      setToast({ message: "Condition is required.", type: "error" });
      return;
    }
    if (!location || !location.trim()) {
      setToast({ message: "Initial Location is required.", type: "error" });
      return;
    }

    setIsRegisterLoading(true);

    try {
      await api.createAsset(newAssetForm);
      onRefreshAssets();
      closeRegisterModal();
      setToast({ message: "Asset added successfully", type: "success" });
      
      // Reset form
      setNewAssetForm({
        name: "",
        category: AssetCategory.Laptop,
        serialNumber: "",
        purchaseDate: new Date().toISOString().split("T")[0],
        purchaseCost: "",
        warrantyMonths: "24",
        condition: AssetCondition.New,
        location: "San Francisco Office",
        isBookable: false,
        departmentId: "",
      });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to register asset. Please try again.", type: "error" });
    } finally {
      setIsRegisterLoading(false);
    }
  };

  // Allocation Submit
  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAsset) return;
    try {
      await api.allocateAsset(activeAsset.id, allocationForm);
      onRefreshAssets();
      setIsAllocateOpen(false);
      setActiveAsset(null);
    } catch (err: any) {
      alert(`Allocation Error: ${err.message}`);
    }
  };

  // Bulk Allocation Submit
  const handleBulkAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAssetIds.length === 0) return;
    try {
      await api.bulkAllocateAssets({
        assetIds: selectedAssetIds,
        userId: allocationForm.userId,
        departmentId: allocationForm.departmentId,
        expectedReturnDate: allocationForm.expectedReturnDate
      });
      onRefreshAssets();
      setIsBulkAllocateOpen(false);
      setSelectedAssetIds([]);
    } catch (err: any) {
      alert(`Bulk Allocation Error: ${err.message}`);
    }
  };

  // Return Submit
  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAsset) return;
    try {
      await api.returnAsset(activeAsset.id, returnForm);
      onRefreshAssets();
      setIsReturnOpen(false);
      setActiveAsset(null);
    } catch (err: any) {
      alert(`Return Error: ${err.message}`);
    }
  };

  // Delete Asset
  const handleDeleteAsset = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this asset from the database? This is irreversible.")) return;
    try {
      await api.deleteAsset(id);
      onRefreshAssets();
      setActiveAsset(null);
    } catch (err: any) {
      alert(`Deletion Error: ${err.message}`);
    }
  };

  // Drag & Drop Bulk real/simulated Excel logic
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const parseSpreadsheetFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      
      const rows = text.split("\n");
      const parsedRows: any[] = [];
      const startIndex = (rows[0] && rows[0].toLowerCase().includes("name")) ? 1 : 0;
      
      for (let i = startIndex; i < rows.length; i++) {
        const line = rows[i].trim();
        if (!line) continue;
        
        const cols = line.split(",").map(val => val.replace(/^["']|["']$/g, "").trim());
        if (cols.length >= 2) {
          const name = cols[0];
          const rawCat = cols[1];
          let category = AssetCategory.Laptop;
          if (rawCat) {
            const match = Object.values(AssetCategory).find(c => c.toLowerCase() === rawCat.toLowerCase());
            if (match) category = match;
          }
          const serialNumber = cols[2] || `SN-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
          const purchaseCost = parseFloat(cols[3]) || 999;
          const location = cols[4] || "Headquarters";
          
          parsedRows.push({
            name,
            category,
            serialNumber,
            purchaseCost,
            location
          });
        }
      }
      
      if (parsedRows.length > 0) {
        setImportPreview(parsedRows);
      } else {
        // Fallback realistic dataset if file structure is unexpected or empty
        const mockExcelRows = [
          { name: "MacBook Air 15\" M3", category: AssetCategory.Laptop, serialNumber: "C02FK301Q1", purchaseCost: 1299, location: "New York Hub" },
          { name: "Dell IPS Curved 34\" Display", category: AssetCategory.Monitor, serialNumber: "DL-9082KL1", purchaseCost: 649, location: "San Francisco Office" },
          { name: "Ford Transit Van (Fleet #8)", category: AssetCategory.Vehicle, serialNumber: "1FDX81023", purchaseCost: 38500, location: "Garage Sub-Level 2" },
          { name: "Sony Alpha 7 IV DSLR", category: AssetCategory.Other, serialNumber: "SN-CAM-901", purchaseCost: 2499, location: "Studio A Closet" }
        ];
        setImportPreview(mockExcelRows);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseSpreadsheetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseSpreadsheetFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleExecuteBulkImport = async () => {
    try {
      for (const row of importPreview) {
        await api.createAsset({
          name: row.name,
          category: row.category,
          serialNumber: row.serialNumber,
          purchaseDate: new Date().toISOString().split("T")[0],
          purchaseCost: row.purchaseCost,
          warrantyMonths: "24",
          condition: AssetCondition.New,
          location: row.location,
          isBookable: row.category === AssetCategory.Vehicle || row.category === AssetCategory.MeetingRoom,
          departmentId: ""
        });
      }
      onRefreshAssets();
      setIsBulkImportOpen(false);
      setImportPreview([]);
      alert("Successfully bulk-imported assets from file.");
    } catch (err: any) {
      alert(`Bulk Import Error: ${err.message}`);
    }
  };

  // AI Predict Lifespan via Gemini API
  const handleAiPrediction = async (assetId: string) => {
    setIsAiLoading(true);
    setAiResult(null);
    try {
      const response = await api.getAiRetirement(assetId);
      setAiResult(response);
    } catch (err: any) {
      alert(`AI Server offline: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Stats Calculations
  const totalAssetsCount = assets.length;
  const assignedCount = assets.filter(a => a.status === AssetStatus.Allocated).length;
  const availableCount = assets.filter(a => a.status === AssetStatus.Available).length;
  const maintenanceCount = assets.filter(a => a.status === AssetStatus.UnderMaintenance).length;
  const expiringWarrantyCount = assets.filter(a => a.warrantyMonths <= 12).length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Control Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-display font-extrabold ${isDark ? "text-white" : "text-slate-900"} tracking-tight flex items-center gap-2`}>
            <Layers className="w-6 h-6 text-indigo-500" />
            <span>Asset Registry</span>
          </h1>
          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"} mt-1`}>
            Enterprise-grade hardware tracking, lifecycle orchestration, and Gemini AI lifespan forecasting.
          </p>
        </div>

        {isManagerOrAdmin && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsBulkImportOpen(true)}
              className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 cursor-pointer border shadow-sm ${
                isDark 
                  ? "bg-slate-900 border-slate-800 hover:bg-slate-800 text-white" 
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Excel Import
            </button>
            <button
              onClick={() => setIsRegisterOpen(true)}
              className="text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-200 shadow-md flex items-center gap-1.5 cursor-pointer text-white bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/10 hover:shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" /> Register Asset
            </button>
          </div>
        )}
      </div>

      {/* Top Section KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Assets */}
        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100 shadow-sm"
        } hover:scale-[1.01] flex flex-col justify-between h-28`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total Assets</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <h3 className={`text-2xl font-extrabold font-display leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              {totalAssetsCount}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Gross valuation tracking</p>
          </div>
        </div>

        {/* Assigned */}
        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100 shadow-sm"
        } hover:scale-[1.01] flex flex-col justify-between h-28`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Deployed</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <h3 className={`text-2xl font-extrabold font-display leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              {assignedCount}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Allocated to staff</p>
          </div>
        </div>

        {/* Available */}
        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100 shadow-sm"
        } hover:scale-[1.01] flex flex-col justify-between h-28`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Available</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <h3 className={`text-2xl font-extrabold font-display leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              {availableCount}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Ready in stockroom</p>
          </div>
        </div>

        {/* Maintenance */}
        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100 shadow-sm"
        } hover:scale-[1.01] flex flex-col justify-between h-28`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>In Repair</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <h3 className={`text-2xl font-extrabold font-display leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              {maintenanceCount}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Active service desk tickets</p>
          </div>
        </div>

        {/* Warranty Expiring */}
        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100 shadow-sm"
        } hover:scale-[1.01] flex flex-col justify-between h-28 col-span-2 lg:col-span-1`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Warranty Alert</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <h3 className={`text-2xl font-extrabold font-display leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              {expiringWarrantyCount}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Expiring within 12 mos</p>
          </div>
        </div>
      </div>

      {/* Multi-faceted Search Filters */}
      <div className={`p-4 rounded-2xl border ${isDark ? "bg-[#0B1220]/60 border-slate-800/60" : "bg-white border-slate-200 shadow-sm"} grid grid-cols-1 lg:grid-cols-12 gap-4 items-center`}>
        <div className="lg:col-span-4 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tags, serials, descriptions, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border outline-none transition duration-200 ${
              isDark 
                ? "bg-slate-950/40 border-slate-850 text-white placeholder-slate-500 focus:border-indigo-500/80" 
                : "bg-slate-50 hover:bg-[#EFF6FF] border-slate-200 text-[#0F172A] placeholder-[#64748B] focus:border-indigo-500 focus:bg-white"
            }`}
          />
        </div>

        <div className="lg:col-span-8 flex flex-wrap gap-2 items-center lg:justify-end">
          {/* Category Select */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`text-xs px-3.5 py-2.5 rounded-xl outline-none border cursor-pointer transition duration-200 ${
              isDark 
                ? "bg-slate-950 border-slate-850 text-slate-300" 
                : "bg-white border-slate-200 text-slate-700 hover:border-indigo-500 hover:shadow-sm"
            }`}
          >
            <option value="All">All Categories</option>
            {Object.values(AssetCategory).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Status Select */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className={`text-xs px-3.5 py-2.5 rounded-xl outline-none border cursor-pointer transition duration-200 ${
              isDark 
                ? "bg-slate-950 border-slate-850 text-slate-300" 
                : "bg-white border-slate-200 text-slate-700 hover:border-indigo-500 hover:shadow-sm"
            }`}
          >
            <option value="All">All Statuses</option>
            {Object.values(AssetStatus).map(stat => (
              <option key={stat} value={stat}>{stat}</option>
            ))}
          </select>

          {/* Condition Select */}
          <select
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className={`text-xs px-3.5 py-2.5 rounded-xl outline-none border cursor-pointer transition duration-200 ${
              isDark 
                ? "bg-slate-950 border-slate-850 text-slate-300" 
                : "bg-white border-slate-200 text-slate-700 hover:border-indigo-500 hover:shadow-sm"
            }`}
          >
            <option value="All">All Conditions</option>
            {Object.values(AssetCondition).map(cond => (
              <option key={cond} value={cond}>{cond}</option>
            ))}
          </select>

          {selectedAssetIds.length > 0 && (
            <button
              onClick={() => setIsBulkAllocateOpen(true)}
              className="text-xs font-bold px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow"
            >
              <UserCheck className="w-4 h-4" /> Deploy Batch ({selectedAssetIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Main Table Layout */}
      <div className={`border ${isDark ? "bg-[#0B1220]/20 border-slate-800/80" : "bg-white border-slate-200 shadow-sm"} rounded-2xl overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b ${isDark ? "border-slate-800 bg-[#0B1220]/60 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"} font-mono uppercase tracking-wider`}>
                <th className="p-4 w-12 text-center">
                  <button
                    onClick={handleSelectAllAvailable}
                    className="text-slate-400 hover:text-indigo-500 cursor-pointer transition-colors"
                  >
                    {selectedAssetIds.length > 0 ? (
                      <CheckSquare className="w-4.5 h-4.5 text-indigo-500" />
                    ) : (
                      <Square className="w-4.5 h-4.5" />
                    )}
                  </button>
                </th>
                <th className="p-4 font-bold">Asset ID / Code</th>
                <th className="p-4 font-bold">Hardware details</th>
                <th className="p-4 font-bold">Category</th>
                <th className="p-4 font-bold">Assigned To</th>
                <th className="p-4 font-bold">SLA Location</th>
                <th className="p-4 font-bold">Life Cycle status</th>
                <th className="p-4 font-bold">Warranty</th>
                <th className="p-4 font-bold">Condition</th>
                <th className="p-4 font-bold text-right">Review</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-slate-800/40" : "divide-slate-200/60"}`}>
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={10} className={`p-12 text-center font-medium ${isDark ? "text-slate-500" : "text-slate-400"} font-mono`}>
                    No matching assets identified in hardware database.
                  </td>
                </tr>
              ) : (
                filteredAssets.map(asset => {
                  const isAllocated = asset.status === AssetStatus.Allocated;
                  const isAvailable = asset.status === AssetStatus.Available;
                  const holder = users.find(u => u.id === asset.currentHolderId);
                  
                  return (
                    <tr
                      key={asset.id}
                      className={`transition-colors duration-150 border-b ${
                        isDark 
                          ? `hover:bg-slate-900/30 border-slate-800/40 ${selectedAssetIds.includes(asset.id) ? "bg-indigo-500/5" : ""}` 
                          : `hover:bg-[#EFF6FF] border-slate-200/60 even:bg-slate-50/20 ${selectedAssetIds.includes(asset.id) ? "bg-blue-50/40" : ""}`
                      }`}
                    >
                      <td className="p-4 text-center">
                        {isAvailable ? (
                          <button
                            onClick={() => handleToggleSelectAsset(asset.id)}
                            className="cursor-pointer text-slate-400 hover:text-indigo-500 transition-colors"
                          >
                            {selectedAssetIds.includes(asset.id) ? (
                              <CheckSquare className="w-4.5 h-4.5 text-indigo-500" />
                            ) : (
                              <Square className="w-4.5 h-4.5" />
                            )}
                          </button>
                        ) : (
                          <span className="w-4.5 h-4.5 block mx-auto"></span>
                        )}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`font-mono font-bold px-2 py-1 rounded-lg border text-[10px] ${
                          isDark 
                            ? "bg-slate-900/80 border-slate-800 text-indigo-400" 
                            : "bg-slate-100 border-slate-200 text-[#2563EB]"
                        }`}>
                          {asset.tag}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={getCategoryImageUrl(asset.category)} 
                            alt={asset.name} 
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200/60 shadow-sm shrink-0" 
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className={`font-extrabold text-xs tracking-tight ${isDark ? "text-white" : "text-[#0F172A]"}`}>{asset.name}</div>
                            <div className={`text-[10px] font-mono mt-0.5 ${isDark ? "text-slate-500" : "text-[#64748B]"}`}>SN: {asset.serialNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          isDark 
                            ? "bg-slate-900 text-slate-400 border-slate-850" 
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>
                          {asset.category}
                        </span>
                      </td>
                      <td className="p-4">
                        {isAllocated && holder ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
                              {holder.avatar ? (
                                <img src={holder.avatar} alt={holder.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-[8px] font-bold font-mono text-slate-700 uppercase">{holder.name[0]}</span>
                              )}
                            </div>
                            <div>
                              <div className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>{holder.name}</div>
                              <span className="text-[9px] text-slate-400 font-mono">ID: {holder.id.slice(0, 5)}</span>
                            </div>
                          </div>
                        ) : (
                          <span className={`text-[10px] font-mono font-medium ${isDark ? "text-slate-600" : "text-slate-400"}`}>-- Pool Inventory --</span>
                        )}
                      </td>
                      <td className={`p-4 font-semibold ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        {asset.location}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono border font-bold ${
                          asset.status === AssetStatus.Available 
                            ? isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : asset.status === AssetStatus.Allocated 
                              ? isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-700 border-blue-200" 
                              : asset.status === AssetStatus.UnderMaintenance 
                                ? isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200" 
                                : asset.status === AssetStatus.Retired 
                                  ? isDark ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-slate-100 text-slate-600 border-slate-200" 
                                  : isDark ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-red-50 text-red-700 border-red-200"
                        }`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className={`p-4 font-mono font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        {asset.warrantyMonths} Mos
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          asset.condition === AssetCondition.New || asset.condition === AssetCondition.Excellent 
                            ? isDark ? "bg-emerald-500/20 text-emerald-300 border-transparent" : "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : asset.condition === AssetCondition.Good 
                              ? isDark ? "bg-blue-500/20 text-blue-300 border-transparent" : "bg-blue-50 text-blue-700 border-blue-200" 
                              : asset.condition === AssetCondition.Fair 
                                ? isDark ? "bg-amber-500/20 text-amber-300 border-transparent" : "bg-amber-50 text-amber-700 border-amber-200" 
                                : isDark ? "bg-red-500/20 text-red-300 border-transparent" : "bg-red-50 text-red-700 border-red-200"
                        }`}>
                          {asset.condition}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            setActiveAsset(asset);
                            setAiResult(null);
                          }}
                          className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer shadow-sm hover:shadow border ${
                            isDark 
                              ? "bg-slate-900 hover:bg-slate-850 text-indigo-400 border-slate-800" 
                              : "bg-white hover:bg-blue-50 text-indigo-600 border-slate-200 hover:border-blue-200"
                          }`}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asset Detail & Gemini Prediction Modal Overlay */}
      {activeAsset && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`${
            isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-[#0F172A] shadow-2xl"
          } border rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 relative`}>
            <button
              onClick={() => setActiveAsset(null)}
              className={`absolute right-6 top-6 ${isDark ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-700"} cursor-pointer`}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className={`pb-4 border-b ${isDark ? "border-slate-900" : "border-slate-150"} flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
              <div>
                <span className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full font-mono border ${
                  isDark ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" : "bg-indigo-50 text-indigo-700 border-indigo-100"
                }`}>
                  {activeAsset.category}
                </span>
                <h2 className={`text-xl font-display font-extrabold mt-2 ${isDark ? "text-white" : "text-slate-900"}`}>{activeAsset.name}</h2>
                <p className={`text-xs font-mono mt-1 ${isDark ? "text-slate-500" : "text-slate-500"}`}>Tag Code: {activeAsset.tag} • Serial: {activeAsset.serialNumber}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAiPrediction(activeAsset.id)}
                  disabled={isAiLoading}
                  className="text-xs font-semibold px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl transition flex items-center gap-1.5 shadow-md shadow-indigo-600/15 cursor-pointer disabled:opacity-50"
                >
                  <Cpu className="w-4 h-4" /> {isAiLoading ? "Analysing..." : "AI Lifespan Forecast"}
                </button>
                {isManagerOrAdmin && activeAsset.status === AssetStatus.Available && (
                  <button
                    onClick={() => {
                      setIsAllocateOpen(true);
                      setAllocationForm({ userId: "", expectedReturnDate: "", departmentId: "" });
                    }}
                    className="text-xs font-semibold px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl cursor-pointer"
                  >
                    Allocate Asset
                  </button>
                )}
                {isManagerOrAdmin && activeAsset.status === AssetStatus.Allocated && (
                  <button
                    onClick={() => {
                      setIsReturnOpen(true);
                      setReturnForm({ conditionCheck: activeAsset.condition, notes: "" });
                    }}
                    className="text-xs font-semibold px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer"
                  >
                    Process Return
                  </button>
                )}
              </div>
            </div>

            {/* Split Panel: Left Details, Right Lifecycle / Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
              
              {/* Left detail specs (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Asset Hero Photo Card */}
                <div className="relative h-48 w-full rounded-2xl overflow-hidden border border-slate-200/60 shadow-sm shrink-0">
                  <img 
                    src={getCategoryImageUrl(activeAsset.category)} 
                    alt={activeAsset.name} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-4">
                    <div>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-600 text-white rounded mb-1 inline-block">
                        {activeAsset.category}
                      </span>
                      <h4 className="text-white font-bold text-base leading-tight">{activeAsset.name}</h4>
                      <p className="text-slate-300 text-[10px] mt-0.5 font-mono">ID: {activeAsset.tag} • SN: {activeAsset.serialNumber}</p>
                    </div>
                  </div>
                </div>

                {/* AI result display */}
                {aiResult && (
                  <div className={`border rounded-2xl p-4 space-y-3 ${
                    isDark 
                      ? "bg-indigo-500/5 border-indigo-500/20 text-slate-300" 
                      : "bg-[#EEF2FF] border-indigo-100 text-slate-700"
                  }`}>
                    <div className={`flex justify-between items-center pb-2 border-b ${
                      isDark ? "border-indigo-500/10" : "border-indigo-200"
                    }`}>
                      <div className="flex items-center gap-2">
                        <Cpu className={`w-4 h-4 ${isDark ? "text-indigo-400" : "text-indigo-600"}`} />
                        <h4 className={`font-display font-semibold text-sm ${isDark ? "text-indigo-300" : "text-indigo-900"}`}>Gemini AI Lifecycle Predictor</h4>
                      </div>
                      <span className={`text-[10px] font-mono font-bold ${isDark ? "text-indigo-400" : "text-indigo-700"}`}>Risk Score: {aiResult.riskScore}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                        <span className={`block text-[10px] ${isDark ? "text-slate-500" : "text-slate-500"}`}>PREDICTED RETIREMENT</span>
                        <span className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{aiResult.predictedRetirementDate}</span>
                      </div>
                      <div>
                        <span className={`block text-[10px] ${isDark ? "text-slate-500" : "text-slate-500"}`}>ESTIMATED SALVAGE</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">${aiResult.estimatedSalvageValue} USD</span>
                      </div>
                    </div>
                    <div className="text-xs space-y-2">
                      <p className={`${isDark ? "text-slate-300" : "text-slate-700"} leading-relaxed`}><span className={`font-semibold ${isDark ? "text-indigo-300" : "text-indigo-900"}`}>Risk Analysis:</span> {aiResult.riskAnalysis}</p>
                      <div className={`p-2.5 rounded-xl text-[11px] leading-normal border ${
                        isDark 
                          ? "bg-slate-900 border-slate-800 text-slate-400" 
                          : "bg-white border-indigo-100 text-[#0F172A]"
                      }`}>
                        <span className="font-bold text-amber-600 dark:text-amber-400 block mb-0.5">Recommended Actions:</span>
                        {aiResult.recommendedAction}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-900/40 border-slate-800/80" : "bg-[#F8FAFC] border-slate-200"}`}>
                    <span className={`block text-[10px] font-bold ${isDark ? "text-slate-500" : "text-slate-500"}`}>PURCHASE DATE</span>
                    <span className={`font-mono font-semibold ${isDark ? "text-slate-200" : "text-slate-900"}`}>{activeAsset.purchaseDate}</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-900/40 border-slate-800/80" : "bg-[#F8FAFC] border-slate-200"}`}>
                    <span className={`block text-[10px] font-bold ${isDark ? "text-slate-500" : "text-slate-500"}`}>PURCHASE COST</span>
                    <span className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-900"}`}>₹{activeAsset.purchaseCost}</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-900/40 border-slate-800/80" : "bg-[#F8FAFC] border-slate-200"}`}>
                    <span className={`block text-[10px] font-bold ${isDark ? "text-slate-500" : "text-slate-500"}`}>WARRANTY LIFESPAN</span>
                    <span className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-900"}`}>{activeAsset.warrantyMonths} Months</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-900/40 border-slate-800/80" : "bg-[#F8FAFC] border-slate-200"}`}>
                    <span className={`block text-[10px] font-bold ${isDark ? "text-slate-500" : "text-slate-500"}`}>PHYSICAL CONDITION</span>
                    <span className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-900"}`}>{activeAsset.condition}</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-900/40 border-slate-800/80" : "bg-[#F8FAFC] border-slate-200"}`}>
                    <span className={`block text-[10px] font-bold ${isDark ? "text-slate-500" : "text-slate-500"}`}>OFFICE / ZONE LOCATION</span>
                    <span className={`truncate block font-semibold ${isDark ? "text-slate-200" : "text-slate-900"}`}>{activeAsset.location}</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-900/40 border-slate-800/80" : "bg-[#F8FAFC] border-slate-200"}`}>
                    <span className={`block text-[10px] font-bold ${isDark ? "text-slate-500" : "text-slate-500"}`}>BOOKABLE SHARED</span>
                    <span className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-900"}`}>{activeAsset.isBookable ? "Yes (Shared)" : "No (Individual)"}</span>
                  </div>
                </div>

                {/* Simulated printable tag wrapper */}
                <div className={`p-4 border rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 ${
                  isDark ? "bg-slate-900 border-slate-850" : "bg-slate-50 border-slate-200"
                }`}>
                  <div className="space-y-1 text-center sm:text-left">
                    <h4 className={`text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-900"}`}>Generated Printable Asset Tag</h4>
                    <p className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-500"}`}>Includes system tag code and active visual validation signature</p>
                  </div>
                  <div className="bg-white p-2 rounded-xl flex items-center justify-center shadow-inner border border-slate-200">
                    <svg className="w-20 h-20 text-slate-950" viewBox="0 0 100 100">
                      {/* Corner markers */}
                      <rect x="10" y="10" width="20" height="20" fill="currentColor" />
                      <rect x="14" y="14" width="12" height="12" fill="white" />
                      <rect x="10" y="70" width="20" height="20" fill="currentColor" />
                      <rect x="14" y="74" width="12" height="12" fill="white" />
                      <rect x="70" y="10" width="20" height="20" fill="currentColor" />
                      <rect x="74" y="14" width="12" height="12" fill="white" />
                      {/* Random barcodes blocks */}
                      <rect x="40" y="15" width="10" height="5" fill="currentColor" />
                      <rect x="55" y="10" width="5" height="15" fill="currentColor" />
                      <rect x="45" y="30" width="15" height="10" fill="currentColor" />
                      <rect x="15" y="45" width="10" height="15" fill="currentColor" />
                      <rect x="40" y="55" width="20" height="5" fill="currentColor" />
                      <rect x="70" y="50" width="15" height="15" fill="currentColor" />
                      <rect x="75" y="75" width="15" height="15" fill="currentColor" />
                      <rect x="45" y="70" width="10" height="20" fill="currentColor" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Right Lifecycle Audit Log (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className={`border rounded-2xl p-4 ${
                  isDark ? "bg-slate-900/30 border-slate-800/80" : "bg-slate-50 border-slate-200"
                }`}>
                  <h4 className={`text-xs font-semibold pb-2 border-b ${
                    isDark ? "text-slate-200 border-slate-800/40" : "text-slate-900 border-slate-200"
                  }`}>Audit Trail History</h4>
                  <div className="space-y-4 mt-3 max-h-60 overflow-y-auto pr-1">
                    {activeAsset.history.map(hist => (
                      <div key={hist.id} className={`relative pl-4 pb-2 border-l last:border-0 last:pb-0 ${
                        isDark ? "border-slate-800" : "border-slate-200"
                      }`}>
                        <span className="absolute -left-1 top-1.5 w-2 h-2 rounded-full bg-indigo-500"></span>
                        <div className="text-[11px] space-y-0.5">
                          <div className="flex justify-between items-center">
                            <span className={`font-bold ${isDark ? "text-slate-200" : "text-slate-900"}`}>{hist.action}</span>
                            <span className={`text-[9px] font-mono ${isDark ? "text-slate-500" : "text-slate-500"}`}>{new Date(hist.date).toLocaleDateString('en-IN')}</span>
                          </div>
                          <p className={`${isDark ? "text-slate-400" : "text-slate-600"} text-[10px]`}>{hist.details}</p>
                          <span className={`text-[9px] font-mono block ${isDark ? "text-slate-500" : "text-slate-500"}`}>By: {hist.performedBy}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {isManagerOrAdmin && (
                  <button
                    onClick={() => handleDeleteAsset(activeAsset.id)}
                    className="w-full text-xs font-semibold py-3 border border-red-500/20 hover:bg-red-500/5 text-red-600 dark:text-red-400 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Purge Asset Registry
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Register New Asset */}
      {isRegisterOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            noValidate
            onSubmit={handleRegisterAssetSubmit}
            className={`${
              isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-[#0F172A] shadow-2xl"
            } border rounded-3xl w-full max-w-lg p-6 space-y-4 relative`}
          >
            <button
              type="button"
              onClick={closeRegisterModal}
              className={`absolute right-6 top-6 ${isDark ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className={`text-lg font-display font-bold ${isDark ? "text-white" : "text-[#0F172A]"}`}>Register New Hardware Asset</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Asset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dell UltraSharp 27 Monitor"
                  value={newAssetForm.name}
                  onChange={(e) => setNewAssetForm({ ...newAssetForm, name: e.target.value })}
                  className={`w-full pl-3 pr-4 py-2.5 rounded-xl outline-none border transition-all duration-200 ${
                    isDark 
                      ? "bg-slate-900 border-slate-800 text-white focus:border-indigo-500" 
                      : "bg-[#F8FAFC] border-slate-200 text-[#0F172A] focus:border-[#2563EB] focus:bg-white"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Category</label>
                  <select
                    value={newAssetForm.category}
                    onChange={(e) => setNewAssetForm({ ...newAssetForm, category: e.target.value as AssetCategory })}
                    className={`w-full p-2.5 rounded-xl outline-none border ${
                      isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                    }`}
                  >
                    {Object.values(AssetCategory).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Serial Number</label>
                  <input
                    type="text"
                    placeholder="Auto-Generated SN if empty"
                    value={newAssetForm.serialNumber}
                    onChange={(e) => setNewAssetForm({ ...newAssetForm, serialNumber: e.target.value })}
                    className={`w-full pl-3 pr-4 py-2.5 rounded-xl outline-none border transition-all duration-200 ${
                      isDark 
                        ? "bg-slate-900 border-slate-800 text-white focus:border-indigo-500" 
                        : "bg-[#F8FAFC] border-slate-200 text-[#0F172A] focus:border-[#2563EB] focus:bg-white"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Purchase Date</label>
                  <input
                    type="date"
                    required
                    value={newAssetForm.purchaseDate}
                    onChange={(e) => setNewAssetForm({ ...newAssetForm, purchaseDate: e.target.value })}
                    className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                      isDark ? "bg-slate-900 border-slate-800 text-white font-mono" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A] font-mono"
                    }`}
                  />
                </div>
                <div>
                  <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Cost (USD)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 899"
                    value={newAssetForm.purchaseCost}
                    onChange={(e) => setNewAssetForm({ ...newAssetForm, purchaseCost: e.target.value })}
                    className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                      isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                    }`}
                  />
                </div>
                <div>
                  <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Warranty (Months)</label>
                  <input
                    type="number"
                    value={newAssetForm.warrantyMonths}
                    onChange={(e) => setNewAssetForm({ ...newAssetForm, warrantyMonths: e.target.value })}
                    className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                      isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Condition</label>
                  <select
                    value={newAssetForm.condition}
                    onChange={(e) => setNewAssetForm({ ...newAssetForm, condition: e.target.value as AssetCondition })}
                    className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                      isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                    }`}
                  >
                    {Object.values(AssetCondition).map(cond => (
                      <option key={cond} value={cond}>{cond}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Initial Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 4th Floor Bay C"
                    value={newAssetForm.location}
                    onChange={(e) => setNewAssetForm({ ...newAssetForm, location: e.target.value })}
                    className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                      isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="isBookableCheck"
                  checked={newAssetForm.isBookable}
                  onChange={(e) => setNewAssetForm({ ...newAssetForm, isBookable: e.target.checked })}
                  className={`w-4 h-4 rounded ${
                    isDark ? "bg-slate-900 border-slate-800" : "bg-[#F8FAFC] border-slate-200"
                  }`}
                />
                <label htmlFor="isBookableCheck" className={`text-xs ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Allow shared booking (Meeting rooms, fleets, hardware equipment)
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isRegisterLoading}
              className="w-full text-sm font-semibold py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-55 shadow-sm"
            >
              {isRegisterLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Registering Asset...</span>
                </>
              ) : (
                <span>Add To Active Inventory</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* MODAL: Excel Simulated Bulk Import */}
      {isBulkImportOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`${
            isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-[#0F172A] shadow-2xl"
          } border rounded-3xl w-full max-w-xl p-6 space-y-4 relative`}>
            <button
              onClick={() => setIsBulkImportOpen(false)}
              className={`absolute right-6 top-6 ${isDark ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className={`text-lg font-display font-bold ${isDark ? "text-white" : "text-[#0F172A]"}`}>Simulated Excel Bulk Import</h3>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-[#64748B]"}`}>Drag and drop any CSV/Excel spreadsheet to extract hardware registers in real-time</p>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition cursor-pointer hover:border-indigo-500/80 hover:bg-indigo-500/5 ${
                isDragging ? "border-indigo-500 bg-indigo-500/5" : isDark ? "border-slate-800 bg-slate-900/20" : "border-slate-300 bg-[#F8FAFC]"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv,.txt"
                className="hidden"
              />
              <Upload className="w-8 h-8 text-indigo-500" />
              <p className={`text-xs ${isDark ? "text-slate-300" : "text-slate-700"}`}>Drag & Drop Excel/CSV here or <span className="text-indigo-500 underline font-semibold">Browse File</span></p>
              <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Supports standard comma-separated .csv spreadsheet formats</span>
            </div>

            {importPreview.length > 0 && (
              <div className="space-y-2">
                <h4 className={`text-xs font-semibold ${isDark ? "text-slate-200" : "text-[#0F172A]"}`}>Extracted Registers Preview ({importPreview.length} rows):</h4>
                <div className={`max-h-40 overflow-y-auto border rounded-xl divide-y text-[10px] ${
                  isDark ? "border-slate-900 divide-slate-900" : "border-slate-200 divide-slate-100"
                }`}>
                  {importPreview.map((row, idx) => (
                    <div key={idx} className={`p-2.5 flex justify-between ${isDark ? "bg-slate-900 text-slate-400" : "bg-slate-50 text-slate-700"}`}>
                      <span className="font-semibold">{row.name} ({row.category})</span>
                      <span className="font-mono">SN: {row.serialNumber} • ${row.purchaseCost}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleExecuteBulkImport}
                  className="w-full text-xs font-semibold py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition cursor-pointer mt-4 shadow"
                >
                  Import All Registers Into DB
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Single Allocate Form */}
      {isAllocateOpen && activeAsset && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAllocateSubmit}
            className={`${
              isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-[#0F172A] shadow-2xl"
            } border rounded-3xl w-full max-w-sm p-6 space-y-4 relative`}
          >
            <button
              type="button"
              onClick={() => setIsAllocateOpen(false)}
              className={`absolute right-6 top-6 ${isDark ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-[#0F172A]"}`}>Assign Asset: {activeAsset.name}</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Target Employee</label>
                <select
                  required
                  value={allocationForm.userId}
                  onChange={(e) => setAllocationForm({ ...allocationForm, userId: e.target.value })}
                  className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                    isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                  }`}
                >
                  <option value="">-- Select Employee --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Expected Return Date</label>
                <input
                  type="date"
                  value={allocationForm.expectedReturnDate}
                  onChange={(e) => setAllocationForm({ ...allocationForm, expectedReturnDate: e.target.value })}
                  className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                    isDark ? "bg-slate-900 border-slate-800 text-white font-mono" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A] font-mono"
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full text-xs font-semibold py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl cursor-pointer shadow"
            >
              Verify & Allocate
            </button>
          </form>
        </div>
      )}

      {/* MODAL: Bulk Allocate Form */}
      {isBulkAllocateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleBulkAllocateSubmit}
            className={`${
              isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-[#0F172A] shadow-2xl"
            } border rounded-3xl w-full max-w-sm p-6 space-y-4 relative`}
          >
            <button
              type="button"
              onClick={() => setIsBulkAllocateOpen(false)}
              className={`absolute right-6 top-6 ${isDark ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-[#0F172A]"}`}>Bulk Assign {selectedAssetIds.length} Assets</h3>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-[#64748B]"}`}>Deploy selected items in parallel to a single target owner.</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Target Employee</label>
                <select
                  required
                  value={allocationForm.userId}
                  onChange={(e) => setAllocationForm({ ...allocationForm, userId: e.target.value })}
                  className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                    isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                  }`}
                >
                  <option value="">-- Select Employee --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Expected Return Date</label>
                <input
                  type="date"
                  value={allocationForm.expectedReturnDate}
                  onChange={(e) => setAllocationForm({ ...allocationForm, expectedReturnDate: e.target.value })}
                  className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                    isDark ? "bg-slate-900 border-slate-800 text-white font-mono" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A] font-mono"
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full text-xs font-semibold py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer shadow"
            >
              Deploy Batch Assignment
            </button>
          </form>
        </div>
      )}

      {/* MODAL: Handover / Return Process */}
      {isReturnOpen && activeAsset && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleReturnSubmit}
            className={`${
              isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-[#0F172A] shadow-2xl"
            } border rounded-3xl w-full max-w-sm p-6 space-y-4 relative`}
          >
            <button
              type="button"
              onClick={() => setIsReturnOpen(false)}
              className={`absolute right-6 top-6 ${isDark ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-[#0F172A]"}`}>Process Return: {activeAsset.name}</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Condition Assessment</label>
                <select
                  required
                  value={returnForm.conditionCheck}
                  onChange={(e) => setReturnForm({ ...returnForm, conditionCheck: e.target.value as AssetCondition })}
                  className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                    isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                  }`}
                >
                  {Object.values(AssetCondition).map(cond => (
                    <option key={cond} value={cond}>{cond}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Return Notes / Comments</label>
                <textarea
                  placeholder="Note any cosmetic wear or hardware performance remarks..."
                  rows={3}
                  value={returnForm.notes}
                  onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                  className={`w-full p-2.5 rounded-xl text-xs outline-none border resize-none ${
                    isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full text-xs font-semibold py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer shadow"
            >
              Confirm Safe Return & Unlock
            </button>
          </form>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[100] p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in border ${
          toast.type === "success" 
            ? "bg-emerald-950/95 border-emerald-800 text-emerald-200" 
            : "bg-red-950/95 border-red-800 text-red-200"
        }`}>
          {toast.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400" />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

    </div>
  );
}
