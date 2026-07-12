import React, { useState } from "react";
import { 
  Settings, 
  User, 
  Shield, 
  Bell, 
  Monitor, 
  Save, 
  RefreshCw, 
  CheckCircle,
  Database,
  Lock,
  Moon,
  Sun,
  Briefcase,
  Sliders,
  Smartphone,
  Key,
  Clock,
  Trash2,
  Check,
  AlertTriangle,
  Mail,
  Building,
  Globe,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Terminal,
  ShieldCheck,
  UserCheck,
  SlidersHorizontal,
  LogOut,
  Sparkles,
  Laptop,
  CheckSquare,
  Network
} from "lucide-react";
import { User as Employee, Role } from "../types";
import { api } from "../api";
import { motion, AnimatePresence } from "motion/react";

interface SettingsViewProps {
  currentUser: Employee;
  theme: "dark" | "light";
  onThemeChange: (theme: "dark" | "light") => void;
  onRefreshData?: () => void;
  onUpdateUser: (user: Employee) => void;
}

type Tab = 
  | "profile" 
  | "security" 
  | "notifications" 
  | "appearance" 
  | "organization" 
  | "preferences" 
  | "devices" 
  | "api" 
  | "sessions" 
  | "system";

export default function SettingsView({
  currentUser,
  theme,
  onThemeChange,
  onRefreshData,
  onUpdateUser
}: SettingsViewProps) {
  const isDark = theme === "dark";

  // Navigation Items Definitions
  const navigationItems = [
    { id: "profile", label: "Profile", desc: "Identity & Avatars", icon: User, color: "text-blue-500", bg: "bg-blue-500/10" },
    { id: "security", label: "Security", desc: "Access & Password", icon: Shield, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { id: "notifications", label: "Notifications", desc: "Workspace Alerts", icon: Bell, color: "text-amber-500", bg: "bg-amber-500/10" },
    { id: "appearance", label: "Appearance", desc: "Visual Theme", icon: Monitor, color: "text-violet-500", bg: "bg-violet-500/10" },
    { id: "organization", label: "Organization", desc: "Department Info", icon: Briefcase, color: "text-pink-500", bg: "bg-pink-500/10" },
    { id: "preferences", label: "Preferences", desc: "Locale & Language", icon: Sliders, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { id: "devices", label: "Connected Devices", desc: "Device Registry", icon: Smartphone, color: "text-orange-500", bg: "bg-orange-500/10" },
    { id: "api", label: "API Keys", desc: "ERP Access Keys", icon: Key, color: "text-cyan-500", bg: "bg-cyan-500/10" },
    { id: "sessions", label: "Sessions", desc: "Audit Login Trails", icon: Clock, color: "text-sky-500", bg: "bg-sky-500/10" },
    { id: "system", label: "System & Health", desc: "Ingress Protocol", icon: Database, color: "text-fuchsia-500", bg: "bg-fuchsia-500/10" },
  ];

  // Core States
  const [activeSettingsTab, setActiveSettingsTab] = useState<Tab>("profile");
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profileAvatar, setProfileAvatar] = useState(currentUser.avatar || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Notification States
  const [notifPreferences, setNotifPreferences] = useState({
    transfers: true,
    bookings: true,
    maintenance: true,
    weeklyDigest: false,
    systemAlerts: true
  });

  // Language & Timezone
  const [language, setLanguage] = useState("English (US)");
  const [timezone, setTimezone] = useState("UTC");
  const [preferencesSuccess, setPreferencesSuccess] = useState(false);

  // Password States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // 2FA States
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSuccess, setTwoFactorSuccess] = useState(false);

  // API Keys state
  const [apiKeys, setApiKeys] = useState([
    { id: "1", name: "Production ERP Ingress", key: "ak_live_79a2be94c56fd812ea10", status: "Active", createdAt: "2026-05-12" },
    { id: "2", name: "Sandbox Testing Pipeline", key: "ak_test_31db59ee94ab2d73ff25", status: "Active", createdAt: "2026-06-01" }
  ]);
  const [newKeyName, setNewKeyName] = useState("");
  const [apiKeySuccess, setApiKeySuccess] = useState(false);

  // Connected Devices state
  const [devices, setDevices] = useState([
    { id: "1", name: "Apple MacBook Pro 16\" (This Device)", type: "Laptop", location: "San Francisco, US", ip: "192.168.1.45", lastActive: "Active Now" },
    { id: "2", name: "Apple iPhone 15 Pro", type: "Mobile", location: "San Francisco, US", ip: "172.56.21.9", lastActive: "12 mins ago" },
    { id: "3", name: "Windows Desktop Hub", type: "Desktop", location: "Dublin Hub, IE", ip: "10.0.4.112", lastActive: "3 days ago" }
  ]);
  const [deviceSuccess, setDeviceSuccess] = useState(false);

  // Session History state
  const [sessions, setSessions] = useState([
    { id: "1", browser: "Chrome Browser v125", ip: "192.168.1.1", os: "macOS Sonoma", active: true, date: "Active Now" },
    { id: "2", browser: "Safari Mobile v17", ip: "73.2.14.99", os: "iOS 17.4", active: false, date: "Today, 10:14 AM" },
    { id: "3", browser: "Firefox Developer Edition", ip: "185.190.140.2", os: "Linux Ubuntu", active: false, date: "July 08, 2026, 02:32 PM" }
  ]);
  const [sessionSuccess, setSessionSuccess] = useState(false);

  // Danger zone confirmations
  const [confirmEraseText, setConfirmEraseText] = useState("");
  const [isErasing, setIsErasing] = useState(false);
  const [eraseSuccess, setEraseSuccess] = useState(false);

  // Profile presets for cycling
  const avatarPresets = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=300&q=80"
  ];
  const [presetIndex, setPresetIndex] = useState(0);

  // Handlers
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const updatedUser = await api.updateProfile({ 
        name: profileName, 
        avatar: profileAvatar 
      });
      onUpdateUser(updatedUser);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Failed to save profile: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePreference = (key: keyof typeof notifPreferences) => {
    setNotifPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCycleAvatar = () => {
    const nextIndex = (presetIndex + 1) % avatarPresets.length;
    setPresetIndex(nextIndex);
    setProfileAvatar(avatarPresets[nextIndex]);
  };

  const handleRemoveAvatar = () => {
    setProfileAvatar("");
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setPreferencesSuccess(true);
    setTimeout(() => setPreferencesSuccess(false), 3000);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long.");
      return;
    }

    setPasswordSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setPasswordSuccess(false), 3000);
  };

  const handleToggle2FA = () => {
    setTwoFactorEnabled(!twoFactorEnabled);
    setTwoFactorSuccess(true);
    setTimeout(() => setTwoFactorSuccess(false), 3000);
  };

  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    
    const randomHex = Array.from({length: 20}, () => Math.floor(Math.random()*16).toString(16)).join("");
    const newKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: `ak_live_${randomHex.slice(0, 20)}`,
      status: "Active",
      createdAt: new Date().toISOString().split("T")[0]
    };

    setApiKeys([newKey, ...apiKeys]);
    setNewKeyName("");
    setApiKeySuccess(true);
    setTimeout(() => setApiKeySuccess(false), 3000);
  };

  const handleRevokeApiKey = (id: string) => {
    setApiKeys(apiKeys.filter(k => k.id !== id));
  };

  const handleRevokeDevice = (id: string) => {
    setDevices(devices.filter(d => d.id !== id));
    setDeviceSuccess(true);
    setTimeout(() => setDeviceSuccess(false), 3000);
  };

  const handleTerminateSession = (id: string) => {
    setSessions(sessions.filter(s => s.id !== id));
    setSessionSuccess(true);
    setTimeout(() => setSessionSuccess(false), 3000);
  };

  const handleEraseData = () => {
    if (confirmEraseText !== "ERASE") {
      alert("Please type 'ERASE' to confirm database deletion.");
      return;
    }
    setIsErasing(true);
    setTimeout(() => {
      setIsErasing(false);
      setConfirmEraseText("");
      setEraseSuccess(true);
      if (onRefreshData) onRefreshData();
      setTimeout(() => setEraseSuccess(false), 4000);
    }, 1500);
  };

  // Password strength visual indicator
  const getPasswordStrength = () => {
    if (!newPassword) return { label: "No Password", color: "bg-slate-200 dark:bg-slate-800", percent: 0 };
    if (newPassword.length < 5) return { label: "Weak", color: "bg-rose-500", percent: 25 };
    if (newPassword.length < 8) return { label: "Fair", color: "bg-amber-500", percent: 50 };
    if (/[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword)) {
      return { label: "Strong (Enterprise Grade)", color: "bg-emerald-500", percent: 100 };
    }
    return { label: "Good", color: "bg-indigo-500", percent: 75 };
  };

  const strength = getPasswordStrength();

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Top Header Card with Metadata & Quick Actions */}
      <div className={`p-6 rounded-3xl border transition duration-200 ${
        isDark ? "bg-[#090D16] border-slate-850 text-white" : "bg-white border-slate-150 shadow-sm"
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded-lg">
                <Settings className="w-5 h-5 animate-spin-slow" />
              </span>
              <h1 className={`text-2xl font-display font-extrabold ${isDark ? "text-white" : "text-slate-900"} tracking-tight`}>
                Administrative Control Panel
              </h1>
            </div>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"} mt-1.5 max-w-xl`}>
              Manage public-facing corporate identity directories, audit security keys, adjust visual viewport themes, and configure system integrations.
            </p>
          </div>
          
          {/* Quick Actions Row */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const configStr = JSON.stringify({
                  user: currentUser,
                  theme,
                  notif: notifPreferences,
                  locale: { language, timezone }
                }, null, 2);
                const blob = new Blob([configStr], {type: "application/json"});
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `assetflow-config-${currentUser.id}.json`;
                a.click();
              }}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border cursor-pointer ${
                isDark 
                  ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800" 
                  : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
              title="Export workspace variables as JSON"
            >
              <Copy className="w-3.5 h-3.5" /> Export JSON
            </button>

            <button
              onClick={onRefreshData}
              className="px-3 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-600/10"
              title="Synchronize ERP global cache data"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-sync Datastore
            </button>
          </div>
        </div>
      </div>

      {/* Main Settings Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Sidebar Navigation Rail */}
        <div className="lg:col-span-3 space-y-1">
          <div className={`p-2.5 rounded-2xl border ${
            isDark ? "bg-[#090D16]/50 border-slate-850" : "bg-slate-50 border-slate-200/60"
          }`}>
            <span className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Workspace Categories
            </span>
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const IconComp = item.icon;
                const isActive = activeSettingsTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSettingsTab(item.id as Tab)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition duration-150 relative group cursor-pointer ${
                      isActive
                        ? isDark 
                          ? "bg-slate-900 text-white border border-slate-800 shadow-inner" 
                          : "bg-white text-slate-900 border border-slate-200/80 shadow-sm font-bold"
                        : isDark
                          ? "text-slate-400 hover:text-white hover:bg-slate-900/30"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`p-2 rounded-lg ${item.bg} ${item.color} shrink-0 group-hover:scale-105 transition duration-200`}>
                        <IconComp className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold block truncate">{item.label}</span>
                        <span className="text-[9px] text-slate-400 block truncate leading-tight font-medium">{item.desc}</span>
                      </div>
                    </div>
                    {isActive && (
                      <motion.span 
                        layoutId="activeIndicator"
                        className="w-1.5 h-6 bg-indigo-500 rounded-full"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Form Content */}
        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSettingsTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              
              {/* 1. PROFILE IDENTITY TAB */}
              {activeSettingsTab === "profile" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* Left sub-card: Profile Card Badge */}
                  <div className={`md:col-span-5 p-6 rounded-3xl border text-center relative overflow-hidden ${
                    isDark ? "bg-[#090D16] border-slate-850" : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
                    
                    <div className="flex flex-col items-center pt-3">
                      {/* Avatar Initials Frame */}
                      <div className="relative w-28 h-28 group">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 blur-md opacity-25 group-hover:opacity-40 transition duration-300" />
                        <div className="w-28 h-28 rounded-2xl bg-indigo-600/10 text-indigo-500 border border-dashed border-indigo-500/30 flex items-center justify-center font-extrabold text-2xl font-display uppercase relative z-10">
                          {profileName ? profileName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??"}
                        </div>
                        <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full z-20 animate-pulse" title="Online Status" />
                      </div>

                      {/* Info & Badges */}
                      <h3 className={`text-base font-extrabold font-display mt-4 ${isDark ? "text-white" : "text-slate-900"}`}>
                        {profileName || "Daksh Khamar"}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{currentUser.email}</p>

                      <div className="flex flex-wrap justify-center gap-1.5 mt-3.5">
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase">
                          {currentUser.role} Badge
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-sans font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          Dept: {currentUser.departmentId || "General Operations"}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          ID: EMP-{currentUser.id.slice(0, 6).toUpperCase()}
                        </span>
                      </div>

                      <div className={`mt-5 pt-4 border-t w-full grid grid-cols-2 text-left text-[11px] ${
                        isDark ? "border-slate-850 text-slate-400" : "border-slate-150 text-slate-500"
                      }`}>
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 font-mono uppercase block">Member Since</span>
                          <span className={`font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>Oct 2024</span>
                        </div>
                        <div className="space-y-1 text-right">
                          <span className="text-[9px] text-slate-400 font-mono uppercase block">Status</span>
                          <span className="text-emerald-500 font-bold">● Active Workspace</span>
                        </div>
                      </div>

                      {/* Avatar quick actions */}
                      <div className="mt-6 flex gap-2 w-full">
                        <button
                          type="button"
                          onClick={handleCycleAvatar}
                          className="flex-grow text-[10px] font-bold py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Sparkles className="w-3 h-3" /> Cycle Photo
                        </button>
                        {profileAvatar && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            className={`px-3 py-2 text-[10px] font-bold rounded-xl transition border cursor-pointer ${
                              isDark 
                                ? "bg-slate-900 hover:bg-red-950/20 text-red-400 border-slate-800 hover:border-red-900/30" 
                                : "bg-white hover:bg-red-50 text-red-600 border-slate-200 hover:border-red-200"
                            }`}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right sub-card: Profile Information Form */}
                  <div className={`md:col-span-7 p-6 rounded-3xl border ${
                    isDark ? "bg-[#090D16] border-slate-850" : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                      <div className="pb-3 border-b border-slate-500/10">
                        <h3 className={`text-sm font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>Profile Information</h3>
                        <p className="text-[11px] text-slate-500">Update your public employee directory identity profile.</p>
                      </div>

                      {/* Modern Inputs with icons */}
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className={`text-[11px] font-bold ${isDark ? "text-slate-400" : "text-slate-600"} block`}>
                            Full Name
                          </label>
                          <div className="relative group">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition">
                              <User className="w-4 h-4" />
                            </span>
                            <input
                              type="text"
                              required
                              value={profileName}
                              onChange={(e) => setProfileName(e.target.value)}
                              className={`w-full text-xs pl-10 pr-3 py-2.5 rounded-xl outline-none border transition ${
                                isDark 
                                  ? "bg-slate-950 border-slate-800 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10" 
                                  : "bg-[#F8FAFC] border-slate-200 text-[#0F172A] focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                              }`}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className={`text-[11px] font-bold ${isDark ? "text-slate-400" : "text-slate-600"} block`}>
                            Corporate Email Address
                          </label>
                          <div className="relative opacity-65">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                              <Mail className="w-4 h-4" />
                            </span>
                            <input
                              type="email"
                              disabled
                              value={currentUser.email}
                              className={`w-full text-xs pl-10 pr-3 py-2.5 rounded-xl border font-mono cursor-not-allowed ${
                                isDark ? "bg-slate-900 border-slate-850 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-500"
                              }`}
                            />
                          </div>
                          <span className="text-[9px] text-slate-500 font-mono block">Locked & managed by administrator directory</span>
                        </div>

                        <div className="space-y-1">
                          <label className={`text-[11px] font-bold ${isDark ? "text-slate-400" : "text-slate-600"} block`}>
                            Avatar Image URL
                          </label>
                          <div className="relative group">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition">
                              <Globe className="w-4 h-4" />
                            </span>
                            <input
                              type="text"
                              placeholder="Paste external image URL or cycle above..."
                              value={profileAvatar}
                              onChange={(e) => setProfileAvatar(e.target.value)}
                              className={`w-full text-xs pl-10 pr-3 py-2.5 rounded-xl outline-none border transition font-mono ${
                                isDark 
                                  ? "bg-slate-950 border-slate-800 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10" 
                                  : "bg-[#F8FAFC] border-slate-200 text-[#0F172A] focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Save Button with custom gradient & dynamic states */}
                      <div className="pt-4 border-t border-slate-500/10 flex items-center justify-between">
                        <div>
                          {saveSuccess && (
                            <motion.span 
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="text-emerald-500 font-bold flex items-center gap-1.5 text-xs font-mono"
                            >
                              <CheckCircle className="w-4 h-4" /> Profile updated successfully!
                            </motion.span>
                          )}
                        </div>
                        
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer text-xs shadow-md shadow-indigo-600/10 transition"
                        >
                          {isSaving ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* 2. SECURITY TAB */}
              {activeSettingsTab === "security" && (
                <div className="space-y-6">
                  
                  {/* Security Policy Summary */}
                  <div className={`p-5 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isDark ? "bg-[#090D16] border-slate-850" : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" /> Maximum Access Security Active
                      </span>
                      <h4 className={`text-sm font-bold ${isDark ? "text-slate-100" : "text-slate-850"}`}>
                        Access policies & authentication criteria
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Your account requires complex password policies and mandatory TLS encryption for API connections.
                      </p>
                    </div>
                    <div className="px-3.5 py-2 rounded-xl bg-emerald-500/5 text-emerald-500 border border-emerald-500/20 text-xs font-mono font-bold">
                      Shield Status: SECURE
                    </div>
                  </div>

                  {/* Password Modification Card */}
                  <div className={`p-6 rounded-3xl border ${
                    isDark ? "bg-[#090D16] border-slate-850" : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="pb-3 border-b border-slate-500/10 flex items-center justify-between">
                        <div>
                          <h3 className={`text-sm font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>Change Account Password</h3>
                          <p className="text-[11px] text-slate-500">Maintain security by changing your credentials regularly.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {passwordError && (
                        <div className="p-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-semibold">
                          {passwordError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className={`text-[11px] font-bold ${isDark ? "text-slate-400" : "text-slate-600"} block`}>Current Password</label>
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="••••••••"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className={`w-full text-xs p-2.5 rounded-xl outline-none border transition ${
                              isDark 
                                ? "bg-slate-950 border-slate-800 text-white focus:border-indigo-500" 
                                : "bg-[#F8FAFC] border-slate-200 text-[#0F172A] focus:bg-white focus:border-indigo-500"
                            }`}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className={`text-[11px] font-bold ${isDark ? "text-slate-400" : "text-slate-600"} block`}>New Password</label>
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="Min. 8 chars"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className={`w-full text-xs p-2.5 rounded-xl outline-none border transition ${
                              isDark 
                                ? "bg-slate-950 border-slate-800 text-white focus:border-indigo-500" 
                                : "bg-[#F8FAFC] border-slate-200 text-[#0F172A] focus:bg-white focus:border-indigo-500"
                            }`}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className={`text-[11px] font-bold ${isDark ? "text-slate-400" : "text-slate-600"} block`}>Confirm Password</label>
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`w-full text-xs p-2.5 rounded-xl outline-none border transition ${
                              isDark 
                                ? "bg-slate-950 border-slate-800 text-white focus:border-indigo-500" 
                                : "bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] focus:bg-white focus:border-indigo-500"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Password Strength Meter */}
                      {newPassword && (
                        <div className="p-3 rounded-xl bg-slate-500/5 border border-slate-500/10 space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-slate-400">Security passphrase strength:</span>
                            <span className={`font-bold ${
                              strength.label === "Weak" ? "text-red-500" :
                              strength.label === "Fair" ? "text-amber-500" :
                              strength.label === "Good" ? "text-indigo-500" : "text-emerald-500"
                            }`}>{strength.label}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden">
                            <motion.div 
                              className={`h-full ${strength.color}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${strength.percent}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                          <p className="text-[9px] text-slate-500 leading-tight">
                            Password recommendation: Must include uppercase characters, integers (0-9), and special characters (@#$%).
                          </p>
                        </div>
                      )}

                      <div className="pt-3 border-t border-slate-500/10 flex items-center justify-between">
                        <div>
                          {passwordSuccess && (
                            <span className="text-emerald-500 font-bold flex items-center gap-1 text-xs">
                              <CheckCircle className="w-4 h-4" /> Password changed successfully!
                            </span>
                          )}
                        </div>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                        >
                          Modify Passphrase
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Two-Factor Authentication (2FA) */}
                  <div className={`p-6 rounded-3xl border ${
                    isDark ? "bg-[#090D16] border-slate-850" : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-500/10">
                      <div>
                        <h3 className={`text-sm font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>Two-Factor Authentication (2FA)</h3>
                        <p className="text-[11px] text-slate-500">Provide secondary verification protection for administrative login audits.</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {twoFactorSuccess && (
                          <span className="text-emerald-500 font-mono text-[10px] font-bold">Updated</span>
                        )}
                        <button
                          onClick={handleToggle2FA}
                          className={`w-11 h-6 rounded-full p-1 transition cursor-pointer ${
                            twoFactorEnabled ? "bg-emerald-500" : "bg-slate-700"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition duration-200 ${
                            twoFactorEnabled ? "translate-x-5" : "translate-x-0"
                          }`} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4 text-xs leading-relaxed">
                      <div className="flex items-start gap-3">
                        <Smartphone className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <p className={`font-bold ${isDark ? "text-slate-300" : "text-slate-800"}`}>
                            {twoFactorEnabled ? "Dual-Channel Protection Active" : "Dual-Channel Protection Disabled"}
                          </p>
                          <p className="text-slate-500 mt-0.5">
                            Verify security keys using standard authentication protocol software (e.g. Google Authenticator, Bitwarden).
                          </p>
                        </div>
                      </div>

                      {twoFactorEnabled && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="p-4 rounded-2xl bg-slate-500/5 border border-indigo-500/10 space-y-3"
                        >
                          <p className="font-bold text-indigo-500 font-mono text-[10px] uppercase">
                            Your Backup Recovery Keys
                          </p>
                          <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-slate-400">
                            <div className="p-1.5 rounded bg-slate-950/40 border border-slate-800 flex justify-between">
                              <span>7481-9124</span>
                              <Copy className="w-3 h-3 text-slate-600 hover:text-slate-300 cursor-pointer" onClick={() => navigator.clipboard.writeText("7481-9124")} />
                            </div>
                            <div className="p-1.5 rounded bg-slate-950/40 border border-slate-800 flex justify-between">
                              <span>8219-3310</span>
                              <Copy className="w-3 h-3 text-slate-600 hover:text-slate-300 cursor-pointer" onClick={() => navigator.clipboard.writeText("8219-3310")} />
                            </div>
                            <div className="p-1.5 rounded bg-slate-950/40 border border-slate-800 flex justify-between">
                              <span>2109-8831</span>
                              <Copy className="w-3 h-3 text-slate-600 hover:text-slate-300 cursor-pointer" onClick={() => navigator.clipboard.writeText("2109-8831")} />
                            </div>
                            <div className="p-1.5 rounded bg-slate-950/40 border border-slate-800 flex justify-between">
                              <span>5991-0421</span>
                              <Copy className="w-3 h-3 text-slate-600 hover:text-slate-300 cursor-pointer" onClick={() => navigator.clipboard.writeText("5991-0421")} />
                            </div>
                          </div>
                          <span className="text-[9px] text-slate-500 block leading-none italic">Keep recovery keys securely offline. Each key resolves login lockout bypass.</span>
                        </motion.div>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* 3. ALERTS & NOTIFICATIONS TAB */}
              {activeSettingsTab === "notifications" && (
                <div className={`p-6 rounded-3xl border ${
                  isDark ? "bg-[#090D16] border-slate-850" : "bg-white border-slate-200 shadow-sm"
                }`}>
                  <div className="pb-4 border-b border-slate-500/10">
                    <h3 className={`text-sm font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>Alert Preferences</h3>
                    <p className="text-[11px] text-slate-500 mt-1">Select which operational events trigger real-time workspace warnings.</p>
                  </div>

                  <div className="space-y-4 mt-4">
                    {/* Switch 1 */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-500/5 rounded-2xl border border-slate-500/10 text-xs">
                      <div>
                        <span className={`font-bold block ${isDark ? "text-slate-200" : "text-slate-700"}`}>Transfer Requests & relocations</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">Alert me when an asset transfer is pending my review approval.</span>
                      </div>
                      <button
                        onClick={() => handleTogglePreference("transfers")}
                        className={`w-11 h-6 rounded-full p-1 transition cursor-pointer ${
                          notifPreferences.transfers ? "bg-indigo-600" : "bg-slate-700"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition duration-200 ${
                          notifPreferences.transfers ? "translate-x-5" : "translate-x-0"
                        }`} />
                      </button>
                    </div>

                    {/* Switch 2 */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-500/5 rounded-2xl border border-slate-500/10 text-xs">
                      <div>
                        <span className={`font-bold block ${isDark ? "text-slate-200" : "text-slate-700"}`}>Resource Scheduler reservations</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">Alert me when other employees schedule boardrooms or company vehicles.</span>
                      </div>
                      <button
                        onClick={() => handleTogglePreference("bookings")}
                        className={`w-11 h-6 rounded-full p-1 transition cursor-pointer ${
                          notifPreferences.bookings ? "bg-indigo-600" : "bg-slate-700"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition duration-200 ${
                          notifPreferences.bookings ? "translate-x-5" : "translate-x-0"
                        }`} />
                      </button>
                    </div>

                    {/* Switch 3 */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-500/5 rounded-2xl border border-slate-500/10 text-xs">
                      <div>
                        <span className={`font-bold block ${isDark ? "text-slate-200" : "text-slate-700"}`}>Maintenance SLA Breakage reports</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">Notify me immediately when hardware reports critical malfunction breakages.</span>
                      </div>
                      <button
                        onClick={() => handleTogglePreference("maintenance")}
                        className={`w-11 h-6 rounded-full p-1 transition cursor-pointer ${
                          notifPreferences.maintenance ? "bg-indigo-600" : "bg-slate-700"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition duration-200 ${
                          notifPreferences.maintenance ? "translate-x-5" : "translate-x-0"
                        }`} />
                      </button>
                    </div>

                    {/* Switch 4 */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-500/5 rounded-2xl border border-slate-500/10 text-xs">
                      <div>
                        <span className={`font-bold block ${isDark ? "text-slate-200" : "text-slate-700"}`}>Weekly Asset Depreciation Digest</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">Summarize category valuation metrics and capital loss projections.</span>
                      </div>
                      <button
                        onClick={() => handleTogglePreference("weeklyDigest")}
                        className={`w-11 h-6 rounded-full p-1 transition cursor-pointer ${
                          notifPreferences.weeklyDigest ? "bg-indigo-600" : "bg-slate-700"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition duration-200 ${
                          notifPreferences.weeklyDigest ? "translate-x-5" : "translate-x-0"
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. APPEARANCE TAB */}
              {activeSettingsTab === "appearance" && (
                <div className={`p-6 rounded-3xl border ${
                  isDark ? "bg-[#090D16] border-slate-850" : "bg-white border-slate-200 shadow-sm"
                }`}>
                  <div className="pb-4 border-b border-slate-500/10">
                    <h3 className={`text-sm font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>Appearance Theme Settings</h3>
                    <p className="text-[11px] text-slate-500 mt-1">Select the color environment of your AssetFlow ERP workspace.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {/* Light option */}
                    <button
                      onClick={() => onThemeChange("light")}
                      className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-32 transition outline-none cursor-pointer hover:scale-[1.01] duration-150 relative overflow-hidden ${
                        !isDark 
                          ? "bg-white border-indigo-600 shadow-md ring-1 ring-indigo-600" 
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Sun className={`w-6 h-6 ${!isDark ? "text-indigo-600" : "text-slate-500"}`} />
                        {!isDark && <Check className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <div>
                        <span className={`font-bold block text-xs ${!isDark ? "text-slate-900" : "text-slate-400"}`}>Corporate Light</span>
                        <span className="text-[10px] text-slate-500 font-medium">Soft whites, high-contrast layouts and clean slate accents.</span>
                      </div>
                    </button>

                    {/* Dark option */}
                    <button
                      onClick={() => onThemeChange("dark")}
                      className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-32 transition outline-none cursor-pointer hover:scale-[1.01] duration-150 relative overflow-hidden ${
                        isDark 
                          ? "bg-[#0B1220] border-indigo-500 shadow-md ring-1 ring-indigo-500" 
                          : "bg-[#F8FAFC] border-slate-250 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Moon className={`w-6 h-6 ${isDark ? "text-indigo-400" : "text-slate-500"}`} />
                        {isDark && <Check className="w-4 h-4 text-indigo-500" />}
                      </div>
                      <div>
                        <span className={`font-bold block text-xs ${isDark ? "text-white" : "text-slate-700"}`}>Executive Twilight</span>
                        <span className="text-[10px] text-slate-500 font-medium">Eye-safe slate-blue dark canvas designed for deep focus.</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* 5. ORGANIZATION TAB */}
              {activeSettingsTab === "organization" && (
                <div className={`p-6 rounded-3xl border ${
                  isDark ? "bg-[#090D16] border-slate-850" : "bg-white border-slate-200 shadow-sm"
                }`}>
                  <div className="pb-4 border-b border-slate-500/10">
                    <h3 className={`text-sm font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>Department & Workspace Organization</h3>
                    <p className="text-[11px] text-slate-500 mt-1">Review your corporate segmentations, department heads, and locations.</p>
                  </div>

                  <div className="space-y-4 mt-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className={`p-4 rounded-2xl border ${isDark ? "bg-slate-950/60 border-slate-850" : "bg-slate-50 border-slate-150"}`}>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Corporate Segment</span>
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-indigo-500" />
                          <span className={`font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                            {currentUser.departmentId || "General Operations Segment"}
                          </span>
                        </div>
                      </div>

                      <div className={`p-4 rounded-2xl border ${isDark ? "bg-slate-950/60 border-slate-850" : "bg-slate-50 border-slate-150"}`}>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Authorization Grade</span>
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-amber-500" />
                          <span className="font-mono font-bold uppercase">{currentUser.role} Authorization</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 mt-2">
                      <label className={`text-[11px] font-bold ${isDark ? "text-slate-400" : "text-slate-600"} block`}>
                        Primary Branch Office
                      </label>
                      <select
                        className={`w-full text-xs p-2.5 rounded-xl outline-none border transition ${
                          isDark 
                            ? "bg-slate-950 border-slate-800 text-white focus:border-indigo-500" 
                            : "bg-[#F8FAFC] border-slate-200 text-[#0F172A] focus:bg-white focus:border-indigo-500"
                        }`}
                        defaultValue="HQ"
                      >
                        <option value="HQ">San Francisco HQ — Main Campus (US)</option>
                        <option value="dublin">Dublin Hub — Regional Office (IE)</option>
                        <option value="tokyo">Tokyo Lab — Research Division (JP)</option>
                        <option value="london">London Finance — Square Mile (UK)</option>
                      </select>
                    </div>

                    <div className="p-4 rounded-2xl border border-dashed border-indigo-500/20 text-slate-400 text-xs leading-relaxed mt-2 bg-indigo-500/2">
                      <p className="font-bold text-indigo-500 uppercase text-[9px] tracking-wider font-mono flex items-center gap-1 mb-1">
                        <Terminal className="w-4 h-4" /> Administrative Privileges Info
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Your user account has direct access to hardware booking allocations, repair ticketing dispatches, cross-department relocations, and printable CSV summaries.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. PREFERENCES TAB */}
              {activeSettingsTab === "preferences" && (
                <div className={`p-6 rounded-3xl border ${
                  isDark ? "bg-[#090D16] border-slate-850" : "bg-white border-slate-200 shadow-sm"
                }`}>
                  <form onSubmit={handleSavePreferences} className="space-y-4">
                    <div className="pb-4 border-b border-slate-500/10">
                      <h3 className={`text-sm font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>Regional & Locale Preferences</h3>
                      <p className="text-[11px] text-slate-500 mt-1">Configure language dialects, active timezones, and number representation formats.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className={`text-[11px] font-bold ${isDark ? "text-slate-400" : "text-slate-600"} block`}>
                          Primary Interface Language
                        </label>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className={`w-full text-xs p-2.5 rounded-xl outline-none border transition ${
                            isDark 
                              ? "bg-slate-950 border-slate-800 text-white focus:border-indigo-500" 
                              : "bg-[#F8FAFC] border-slate-200 text-[#0F172A] focus:bg-white"
                          }`}
                        >
                          <option value="English (US)">English (United States)</option>
                          <option value="Spanish">Español (España)</option>
                          <option value="French">Français (France)</option>
                          <option value="Japanese">日本語 (日本)</option>
                          <option value="German">Deutsch (Deutschland)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className={`text-[11px] font-bold ${isDark ? "text-slate-400" : "text-slate-600"} block`}>
                          Active Timezone Offset
                        </label>
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className={`w-full text-xs p-2.5 rounded-xl outline-none border transition ${
                            isDark 
                              ? "bg-slate-950 border-slate-800 text-white focus:border-indigo-500" 
                              : "bg-[#F8FAFC] border-slate-200 text-[#0F172A] focus:bg-white"
                          }`}
                        >
                          <option value="UTC">Coordinated Universal Time (UTC)</option>
                          <option value="America/New_York">Eastern Standard Time (EST) — NY</option>
                          <option value="America/Los_Angeles">Pacific Standard Time (PST) — SF</option>
                          <option value="Europe/London">Greenwich Mean Time (GMT) — London</option>
                          <option value="Asia/Tokyo">Japan Standard Time (JST) — Tokyo</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-500/10 flex items-center justify-between">
                      <div>
                        {preferencesSuccess && (
                          <span className="text-emerald-500 font-bold flex items-center gap-1.5 text-xs">
                            <CheckCircle className="w-4 h-4" /> Preferences applied successfully!
                          </span>
                        )}
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                      >
                        Apply Preferences
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 7. CONNECTED DEVICES TAB */}
              {activeSettingsTab === "devices" && (
                <div className={`p-6 rounded-3xl border ${
                  isDark ? "bg-[#090D16] border-slate-850" : "bg-white border-slate-200 shadow-sm"
                }`}>
                  <div className="pb-3 border-b border-slate-500/10 flex justify-between items-center">
                    <div>
                      <h3 className={`text-sm font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>Connected Hardware Devices</h3>
                      <p className="text-[11px] text-slate-500">Authorized devices currently authenticated to access your credentials.</p>
                    </div>
                    {deviceSuccess && (
                      <span className="text-emerald-500 text-xs font-bold animate-pulse">Device Revoked</span>
                    )}
                  </div>

                  <div className="space-y-3 mt-4">
                    <AnimatePresence>
                      {devices.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 border border-dashed rounded-2xl border-slate-800 font-mono text-xs">
                          No connected hardware registries found.
                        </div>
                      ) : (
                        devices.map((device) => (
                          <motion.div
                            key={device.id}
                            initial={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-colors ${
                              isDark ? "bg-slate-950/60 border-slate-850 hover:bg-slate-900/40" : "bg-slate-50 border-slate-150 hover:bg-slate-100/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
                                {device.type === "Laptop" ? <Laptop className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                              </span>
                              <div>
                                <span className={`font-bold block text-xs ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                                  {device.name}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                                  IP: {device.ip} • Loc: {device.location}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                device.lastActive === "Active Now" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-slate-500/10 text-slate-400"
                              }`}>
                                {device.lastActive}
                              </span>
                              {device.lastActive !== "Active Now" && (
                                <button
                                  onClick={() => handleRevokeDevice(device.id)}
                                  className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition cursor-pointer ${
                                    isDark 
                                      ? "bg-slate-900 text-red-400 border-slate-800 hover:bg-red-950/20 hover:border-red-900/30" 
                                      : "bg-white text-red-600 border-slate-200 hover:bg-red-50 hover:border-red-200"
                                  }`}
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* 8. API KEYS TAB */}
              {activeSettingsTab === "api" && (
                <div className="space-y-6">
                  
                  {/* Create Key Card */}
                  <div className={`p-6 rounded-3xl border ${
                    isDark ? "bg-[#090D16] border-slate-850" : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <form onSubmit={handleCreateApiKey} className="space-y-3">
                      <div>
                        <h3 className={`text-sm font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>Create ERP Access API Keys</h3>
                        <p className="text-[11px] text-slate-500">Configure programmatic credentials for developer ledger pipelines.</p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="text"
                          required
                          placeholder="e.g. Jenkins Deploy Server"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          className={`text-xs p-2.5 rounded-xl outline-none border transition flex-grow ${
                            isDark 
                              ? "bg-slate-950 border-slate-800 text-white focus:border-indigo-500" 
                              : "bg-[#F8FAFC] border-slate-200 text-[#0F172A] focus:bg-white focus:border-indigo-500"
                          }`}
                        />
                        <button
                          type="submit"
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/10 shrink-0"
                        >
                          <Plus className="w-4 h-4" /> Generate API Key
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Keys list Card */}
                  <div className={`p-6 rounded-3xl border ${
                    isDark ? "bg-[#090D16] border-slate-850" : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <div className="pb-3 border-b border-slate-500/10 flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        Active Access Secret Tokens
                      </span>
                      {apiKeySuccess && (
                        <span className="text-emerald-500 text-xs font-bold animate-pulse flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Token generated!
                        </span>
                      )}
                    </div>

                    <div className="space-y-3 mt-4">
                      {apiKeys.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 border border-dashed rounded-2xl border-slate-850 font-mono text-xs">
                          No access secrets registered. Generate a key above.
                        </div>
                      ) : (
                        apiKeys.map((item) => (
                          <div
                            key={item.id}
                            className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                              isDark ? "bg-slate-950/60 border-slate-850 hover:bg-slate-900/40" : "bg-slate-50 border-slate-150 hover:bg-slate-100/50"
                            }`}
                          >
                            <div>
                              <span className={`font-bold block text-xs ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                                {item.name}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-mono text-[10px] text-indigo-500 font-bold tracking-wider">
                                  {item.key.slice(0, 8)}••••••••••••••••
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.key);
                                    alert("API key token copied to clipboard!");
                                  }}
                                  className="text-slate-500 hover:text-slate-300 transition"
                                  title="Copy token secret"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 justify-between sm:justify-end">
                              <span className="text-[9px] font-mono text-slate-500">
                                Created: {item.createdAt}
                              </span>
                              <button
                                onClick={() => handleRevokeApiKey(item.id)}
                                className={`text-[10px] font-bold p-1.5 rounded-lg border transition cursor-pointer ${
                                  isDark 
                                    ? "bg-slate-900 text-red-400 border-slate-800 hover:bg-red-950/20 hover:border-red-900/30" 
                                    : "bg-white text-red-600 border-slate-200 hover:bg-red-50 hover:border-red-200"
                                }`}
                              >
                                Revoke
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* 9. SESSIONS TAB */}
              {activeSettingsTab === "sessions" && (
                <div className={`p-6 rounded-3xl border ${
                  isDark ? "bg-[#090D16] border-slate-850" : "bg-white border-slate-200 shadow-sm"
                }`}>
                  <div className="pb-3 border-b border-slate-500/10 flex justify-between items-center">
                    <div>
                      <h3 className={`text-sm font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>Active Workspace Sessions</h3>
                      <p className="text-[11px] text-slate-500">Audit current web container environments authenticated to your profile.</p>
                    </div>
                    {sessionSuccess && (
                      <span className="text-emerald-500 text-xs font-bold animate-pulse">Session Terminated</span>
                    )}
                  </div>

                  <div className="space-y-3 mt-4">
                    <AnimatePresence>
                      {sessions.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 border border-dashed rounded-2xl border-slate-850 font-mono text-xs">
                          No active sessions detected.
                        </div>
                      ) : (
                        sessions.map((session) => (
                          <motion.div
                            key={session.id}
                            initial={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-colors ${
                              isDark ? "bg-slate-950/60 border-slate-850 hover:bg-slate-900/40" : "bg-slate-50 border-slate-150 hover:bg-slate-100/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
                                <Clock className="w-4 h-4" />
                              </span>
                              <div>
                                <span className={`font-bold block text-xs ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                                  {session.browser}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                  OS: {session.os} • Client IP: {session.ip}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                                session.active ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-slate-500/10 text-slate-400"
                              }`}>
                                {session.date}
                              </span>
                              {!session.active && (
                                <button
                                  onClick={() => handleTerminateSession(session.id)}
                                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition cursor-pointer ${
                                    isDark 
                                      ? "bg-slate-900 text-red-400 border-slate-800 hover:bg-red-950/20 hover:border-red-900/30" 
                                      : "bg-white text-red-600 border-slate-200 hover:bg-red-50 hover:border-red-200"
                                  }`}
                                >
                                  Terminate
                                </button>
                              )}
                            </div>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* 10. SYSTEM & DANGER ZONE TAB */}
              {activeSettingsTab === "system" && (
                <div className="space-y-6 animate-fade-in text-xs font-sans">
                  
                  {/* System & database status */}
                  <div className={`p-6 rounded-3xl border ${
                    isDark ? "bg-[#090D16] border-slate-850" : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <div className="pb-3 border-b border-slate-500/10 flex justify-between items-center">
                      <div>
                        <h3 className={`text-sm font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>System & Database Health</h3>
                        <p className="text-[11px] text-slate-500">Review real-time localized file databases and active proxy configurations.</p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 font-bold">AssetFlow ERP v4.11</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div className={`p-4 rounded-2xl border flex flex-col justify-between h-24 ${
                        isDark ? "bg-slate-950/60 border-slate-850" : "bg-slate-50 border-slate-150"
                      }`}>
                        <span className="text-slate-400 font-mono font-bold text-[9px] tracking-wider uppercase">DATABASE PROTOCOL</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className={`font-mono text-xs font-bold ${isDark ? "text-slate-200" : "text-slate-700"}`}>LOCAL STATE JSON</span>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        </div>
                      </div>

                      <div className={`p-4 rounded-2xl border flex flex-col justify-between h-24 ${
                        isDark ? "bg-slate-950/60 border-slate-850" : "bg-slate-50 border-slate-150"
                      }`}>
                        <span className="text-slate-400 font-mono font-bold text-[9px] tracking-wider uppercase">VITE REVERSE INGRESS PROXY</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className={`font-mono text-xs font-bold ${isDark ? "text-slate-200" : "text-slate-700"}`}>PORT 3000 SECURED</span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded font-bold">ONLINE</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="p-6 rounded-3xl border border-red-500/20 bg-red-500/2 space-y-4">
                    <div className="pb-3 border-b border-red-500/10">
                      <h3 className="text-sm font-bold text-red-500 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                        <AlertTriangle className="w-4 h-4" /> Danger Zone
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1">Irreversible administrative actions that delete databases or accounts.</p>
                    </div>

                    <div className="space-y-4 text-xs leading-relaxed">
                      <div>
                        <p className={`font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>Reset Workspace Database Local Cache</p>
                        <p className="text-slate-500 mt-0.5">
                          This deletes all simulated local ledger histories of asset transfers, reservations, and service maintenance tickets.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="text"
                          placeholder="Type 'ERASE' to authorize"
                          value={confirmEraseText}
                          onChange={(e) => setConfirmEraseText(e.target.value)}
                          className={`text-xs p-2.5 rounded-xl outline-none border transition ${
                            isDark 
                              ? "bg-slate-950 border-slate-800 text-white focus:border-red-500" 
                              : "bg-white border-[#E2E8F0] text-[#0F172A] focus:border-red-500"
                          }`}
                        />
                        <button
                          type="button"
                          disabled={isErasing || confirmEraseText !== "ERASE"}
                          onClick={handleEraseData}
                          className="px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-red-600/10 shrink-0"
                        >
                          {isErasing ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Wiping Database...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              Wipe Local Database
                            </>
                          )}
                        </button>
                      </div>

                      {eraseSuccess && (
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold"
                        >
                          Workspace database wiped and re-seeded successfully!
                        </motion.div>
                      )}
                    </div>
                  </div>

                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
