import React, { useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash,
  AlertCircle,
  X,
  CheckCircle,
  ArrowRight,
  Info
} from "lucide-react";
import { Booking, Asset, User as Employee, Role } from "../types";
import { api } from "../api";

interface ResourceBookingViewProps {
  bookings: Booking[];
  assets: Asset[];
  currentUser: Employee;
  onRefreshBookings: () => void;
  theme: "dark" | "light";
}

export default function ResourceBookingView({
  bookings,
  assets,
  currentUser,
  onRefreshBookings,
  theme
}: ResourceBookingViewProps) {
  const isDark = theme === "dark";
  const bookableAssets = assets.filter(a => a.isBookable);

  // States
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"calendar" | "list">("calendar");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [bookingForm, setBookingForm] = useState({
    title: "",
    start: "",
    end: "",
    purpose: "",
    departmentId: "",
    employeeName: "",
    contact: "",
    priority: "Medium",
    remarks: ""
  });
  
  // Simulated Calendar Day (July 12, 2026 as reference day matching seeded data)
  const [currentCalendarDay, setCurrentCalendarDay] = useState("2026-07-12");

  // Conflict state
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Filter Bookings for the current day to display on hour grid
  const dayBookings = bookings.filter(b => b.start.startsWith(currentCalendarDay) && b.status !== "Cancelled");

  // Time slots for Hourly Grid: 08:00 to 18:00
  const hours = Array.from({ length: 11 }, (_, i) => i + 8); // [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

  // Check for booking conflicts for selected asset
  const checkConflicts = (assetId: string, start: string, end: string): string | null => {
    if (!assetId || !start || !end) return null;

    const newStart = new Date(`${currentCalendarDay}T${start}`);
    const newEnd = new Date(`${currentCalendarDay}T${end}`);

    const assetBookings = bookings.filter(b => 
      b.assetId === assetId && 
      b.status !== "Cancelled" &&
      b.start.startsWith(currentCalendarDay)
    );

    for (const booking of assetBookings) {
      const existingStart = new Date(booking.start);
      const existingEnd = new Date(booking.end);

      // Check for overlap
      if (newStart < existingEnd && newEnd > existingStart) {
        return `Conflict: Asset already booked from ${existingStart.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'})} to ${existingEnd.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'})} by ${booking.userName}`;
      }
    }

    return null;
  };

  // Get available time slots for selected asset
  const getAvailableSlots = (assetId: string): string[] => {
    if (!assetId) return hours.map(h => `${String(h).padStart(2, "0")}:00`);

    const assetBookings = bookings.filter(b => 
      b.assetId === assetId && 
      b.status !== "Cancelled" &&
      b.start.startsWith(currentCalendarDay)
    );

    const bookedRanges = assetBookings.map(b => ({
      start: parseInt(b.start.split("T")[1].split(":")[0]),
      end: parseInt(b.end.split("T")[1].split(":")[0])
    }));

    return hours.filter(hour => {
      // Check if this hour falls within any booked range
      return !bookedRanges.some(range => hour >= range.start && hour < range.end);
    }).map(h => `${String(h).padStart(2, "0")}:00`);
  };

  // Booking submit with API collision check
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);

    const startDateTime = `${currentCalendarDay}T${bookingForm.start}`;
    const endDateTime = `${currentCalendarDay}T${bookingForm.end}`;

    if (new Date(startDateTime) >= new Date(endDateTime)) {
      setConflictError("Error: Start time must be strictly before end time.");
      return;
    }

    // Check for local conflicts
    const conflict = checkConflicts(selectedAssetId, bookingForm.start, bookingForm.end);
    if (conflict) {
      setConflictError(conflict);
      return;
    }

    try {
      await api.createBooking({
        assetId: selectedAssetId,
        title: bookingForm.title,
        start: startDateTime,
        end: endDateTime
      });
      onRefreshBookings();
      setIsBookModalOpen(false);
      setBookingForm({ title: "", start: "", end: "", purpose: "", departmentId: "", employeeName: "", contact: "", priority: "Medium", remarks: "" });
      setSelectedAssetId("");
    } catch (err: any) {
      setConflictError(err.message);
    }
  };

  const handleCancelBooking = async (id: string) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await api.cancelBooking(id);
      onRefreshBookings();
    } catch (err: any) {
      alert(`Cancellation Error: ${err.message}`);
    }
  };

  // Calculate Statistics for Bookings page
  const totalBookingsCount = bookings.length;
  const activeBookingsCount = bookings.filter(b => b.status === "Ongoing" || b.status === "Upcoming").length;
  const busyAssetsCount = bookableAssets.filter(asset => bookings.some(b => b.assetId === asset.id && b.status === "Ongoing")).length;
  const utilizationPercentage = bookableAssets.length > 0 ? Math.round((busyAssetsCount / bookableAssets.length) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-display font-extrabold ${isDark ? "text-white" : "text-slate-900"} tracking-tight flex items-center gap-2`}>
            <Calendar className="w-6 h-6 text-indigo-500" />
            <span>Resource Scheduler</span>
          </h1>
          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"} mt-1`}>
            Book corporate boardrooms, shared vehicle fleets, or specialized hardware registers with automatic overlap collision prevention.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab buttons */}
          <div className={`flex p-1 rounded-xl border ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-100 border-slate-200"}`}>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeTab === "calendar" 
                  ? "bg-indigo-600 text-white shadow-sm" 
                  : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Hourly Grid
            </button>
            <button
              onClick={() => setActiveTab("list")}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeTab === "list" 
                  ? "bg-indigo-600 text-white shadow-sm" 
                  : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              List Ledger
            </button>
          </div>

          <button
            onClick={() => setIsBookModalOpen(true)}
            className="text-xs font-bold px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition shadow-md shadow-indigo-600/10 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Book Resource
          </button>
        </div>
      </div>

      {/* Scheduler KPIs Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Gross Reservations</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <h3 className={`text-2xl font-extrabold font-display leading-tight mt-2 ${isDark ? "text-white" : "text-slate-900"}`}>{totalBookingsCount}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Total reservations in ledger</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Active Schedule</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <h3 className={`text-2xl font-extrabold font-display leading-tight mt-2 ${isDark ? "text-white" : "text-slate-900"}`}>{activeBookingsCount}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Upcoming or ongoing bookings</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Busy Resources</span>
            <MapPin className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className={`text-2xl font-extrabold font-display leading-tight mt-2 ${isDark ? "text-white" : "text-slate-900"}`}>{busyAssetsCount}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Currently occupied resources</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Utilization rate</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className={`text-2xl font-extrabold font-display leading-tight mt-2 ${isDark ? "text-white" : "text-slate-900"}`}>{utilizationPercentage}%</h3>
          <p className="text-[10px] text-slate-400 mt-1">Shared hardware deployment rate</p>
        </div>
      </div>

      {/* Main Panel layout */}
      {activeTab === "calendar" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Day Scheduler Hourly Grid (8 cols) */}
          <div className={`p-5 rounded-2xl border ${isDark ? "bg-[#0B1220]/20 border-slate-800/80" : "bg-white border-slate-200 shadow-sm"} lg:col-span-8 space-y-4`}>
            <div className={`flex justify-between items-center pb-3 border-b ${isDark ? "border-slate-800/60" : "border-slate-150"}`}>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span className={`font-display font-extrabold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>Hourly Schedule — July 12, 2026</span>
              </div>
              <input
                type="date"
                value={currentCalendarDay}
                onChange={(e) => setCurrentCalendarDay(e.target.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono outline-none border ${
                  isDark 
                    ? "bg-slate-950/60 border-slate-850 text-slate-300" 
                    : "bg-[#F8FAFC] border-slate-200 text-slate-700"
                }`}
              />
            </div>

            {/* Hourly Row Stack */}
            <div className="space-y-3 mt-4 max-h-[500px] overflow-y-auto pr-1 relative">
              {hours.map(hour => {
                const hourString = `${String(hour).padStart(2, "0")}:00`;
                // Check if any bookings cross this specific hour
                const matchingBookings = dayBookings.filter(b => {
                  const bStartHour = parseInt(b.start.split("T")[1].split(":")[0]);
                  const bEndHour = parseInt(b.end.split("T")[1].split(":")[0]);
                  return hour >= bStartHour && hour < bEndHour;
                });

                return (
                  <div key={hour} className={`flex gap-4 items-start min-h-[60px] border-b pb-3 last:border-0 last:pb-0 ${isDark ? "border-slate-850" : "border-slate-100"}`}>
                    <span className="w-12 font-mono text-slate-400 text-right mt-1.5 font-bold">{hourString}</span>
                    
                    <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {matchingBookings.length === 0 ? (
                        <div className={`py-3 px-4 rounded-xl border text-[11px] italic flex items-center ${
                          isDark 
                            ? "bg-slate-900/10 border-slate-850 text-slate-600" 
                            : "bg-slate-50 border-slate-100 text-slate-400"
                        }`}>
                          No reservations scheduled for this slot.
                        </div>
                      ) : (
                        matchingBookings.map(b => (
                          <div
                            key={b.id}
                            className={`p-3 rounded-xl border flex justify-between items-center transition-all duration-150 hover:scale-[1.01] ${
                              b.assetCategory === "MeetingRoom" 
                                ? isDark ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" : "bg-indigo-50 border-indigo-150 text-indigo-800"
                                : b.assetCategory === "Vehicle" 
                                  ? isDark ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-emerald-50 border-emerald-150 text-emerald-800"
                                  : isDark ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : "bg-amber-50 border-amber-150 text-amber-800"
                            }`}
                          >
                            <div className="min-w-0 flex-grow">
                              <p className="font-extrabold truncate text-xs">{b.title}</p>
                              <p className={`text-[10px] font-mono mt-0.5 truncate ${isDark ? "text-slate-400" : "text-slate-600"}`}>{b.assetName}</p>
                              <span className={`text-[9px] block mt-1 ${isDark ? "text-slate-500" : "text-slate-500"}`}>Owner: {b.userName}</span>
                            </div>

                            {/* Delete button if owner */}
                            {(b.userId === currentUser.id || currentUser.role === Role.Admin) && (
                              <button
                                onClick={() => handleCancelBooking(b.id)}
                                className={`p-1.5 rounded-lg cursor-pointer transition ${
                                  isDark 
                                    ? "hover:bg-red-500/20 text-slate-500 hover:text-red-400" 
                                    : "hover:bg-red-50 text-slate-400 hover:text-red-600"
                                }`}
                                title="Cancel reservation"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bookable shared assets summary sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className={`p-5 rounded-2xl border ${isDark ? "bg-[#0B1220]/20 border-slate-800/80" : "bg-white border-slate-200 shadow-sm"}`}>
              <h3 className={`font-display font-extrabold text-sm mb-3 ${isDark ? "text-slate-200" : "text-slate-900"}`}>Shared Hardware & Rooms</h3>
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {bookableAssets.map(asset => {
                  const activeB = bookings.find(b => b.assetId === asset.id && b.status === "Ongoing");
                  
                  return (
                    <div key={asset.id} className={`p-3.5 rounded-xl border flex justify-between items-center transition-all ${
                      isDark ? "bg-slate-900/40 border-slate-850 hover:bg-slate-850/50" : "bg-slate-50 border-slate-100 hover:bg-slate-100/50"
                    }`}>
                      <div className="min-w-0">
                        <h4 className={`font-extrabold text-xs truncate ${isDark ? "text-slate-200" : "text-slate-800"}`}>{asset.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{asset.tag} • {asset.location}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${
                        activeB 
                          ? isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200" 
                          : isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}>
                        {activeB ? "Busy" : "Ready"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* List ledger view */
        <div className={`border ${isDark ? "bg-[#0B1220]/20 border-slate-800/80" : "bg-white border-slate-200 shadow-sm"} rounded-2xl overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b ${isDark ? "border-slate-800 bg-[#0B1220]/60 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"} font-mono uppercase tracking-wider`}>
                  <th className="p-4 font-bold">Reserved Resource</th>
                  <th className="p-4 font-bold">Booking Title</th>
                  <th className="p-4 font-bold">Owner / Host</th>
                  <th className="p-4 font-bold">Scheduled Window</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? "divide-slate-800/40" : "divide-slate-200/60"}`}>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={`p-12 text-center font-medium ${isDark ? "text-slate-500" : "text-slate-400"} font-mono`}>
                      No active bookings identified in the global corporate registry.
                    </td>
                  </tr>
                ) : (
                  bookings.map(b => (
                    <tr key={b.id} className={`transition-colors border-b ${isDark ? "hover:bg-slate-900/30 border-slate-800/40" : "hover:bg-[#EFF6FF] border-slate-200/60"}`}>
                      <td className="p-4 font-extrabold">
                        <div className={`${isDark ? "text-slate-100" : "text-slate-900"}`}>{b.assetName}</div>
                        <span className={`inline-block text-[9px] font-mono mt-1 font-semibold px-2 py-0.5 rounded border ${
                          isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-600"
                        }`}>{b.assetCategory}</span>
                      </td>
                      <td className={`p-4 font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>"{b.title}"</td>
                      <td className={`p-4 font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>{b.userName}</td>
                      <td className="p-4 font-mono text-slate-400 leading-normal">
                        {new Date(b.start).toLocaleDateString('en-IN')} {new Date(b.start).toLocaleTimeString('en-IN', {hour: "2-digit", minute: "2-digit"})} → <br />
                        {new Date(b.end).toLocaleDateString('en-IN')} {new Date(b.end).toLocaleTimeString('en-IN', {hour: "2-digit", minute: "2-digit"})}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono border font-bold ${
                          b.status === "Upcoming" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                          b.status === "Ongoing" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          b.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          "bg-slate-800 text-slate-400 border-slate-700"
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {b.status !== "Cancelled" && (b.userId === currentUser.id || currentUser.role === Role.Admin) && (
                          <button
                            onClick={() => handleCancelBooking(b.id)}
                            className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer shadow-sm hover:shadow border ${
                              isDark 
                                ? "bg-slate-900 hover:bg-slate-850 text-red-400 border-slate-800 hover:border-red-500/25" 
                                : "bg-white hover:bg-red-50 text-red-600 border-slate-200 hover:border-red-200"
                            }`}
                          >
                            Cancel Booking
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Book Shared Resource */}
      {isBookModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleBookingSubmit}
            className={`${
              isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-[#0F172A] shadow-2xl"
            } border rounded-3xl w-full max-w-sm p-6 space-y-4 relative`}
          >
            <button
              type="button"
              onClick={() => {
                setIsBookModalOpen(false);
                setConflictError(null);
              }}
              className={`absolute right-6 top-6 ${isDark ? "text-slate-500" : "text-slate-400 hover:text-slate-700"}`}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className={`text-base font-display font-bold ${isDark ? "text-white" : "text-[#0F172A]"}`}>Schedule Shared Asset</h3>

            {conflictError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-2 text-red-400 leading-snug">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>{conflictError}</p>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Select Shared Resource</label>
                <select
                  required
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                    isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                  }`}
                >
                  <option value="">-- Choose Bookable Asset --</option>
                  {bookableAssets.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.category} - {a.location})</option>
                  ))}
                </select>
              </div>

              {selectedAssetId && (
                <div>
                  <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Available Time Slots</label>
                  <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-900/40 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                    {getAvailableSlots(selectedAssetId).length === 0 ? (
                      <p className="text-[10px] text-amber-500 font-medium">No available slots for this asset today</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {getAvailableSlots(selectedAssetId).map(slot => (
                          <span key={slot} className={`px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold ${
                            isDark ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}>
                            {slot}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Meeting / Booking Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design Board Review"
                  value={bookingForm.title}
                  onChange={(e) => setBookingForm({ ...bookingForm, title: e.target.value })}
                  className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                    isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Start Time</label>
                  <select
                    required
                    value={bookingForm.start}
                    onChange={(e) => setBookingForm({ ...bookingForm, start: e.target.value })}
                    className={`w-full p-2.5 rounded-xl text-xs outline-none border font-mono ${
                      isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                    }`}
                  >
                    <option value="">-- Start --</option>
                    {hours.map(h => {
                      const ts = `${String(h).padStart(2, "0")}:00:00`;
                      return <option key={h} value={ts}>{String(h).padStart(2, "0")}:00</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>End Time</label>
                  <select
                    required
                    value={bookingForm.end}
                    onChange={(e) => setBookingForm({ ...bookingForm, end: e.target.value })}
                    className={`w-full p-2.5 rounded-xl text-xs outline-none border font-mono ${
                      isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                    }`}
                  >
                    <option value="">-- End --</option>
                    {hours.map(h => {
                      const ts = `${String(h).padStart(2, "0")}:00:00`;
                      return <option key={h} value={ts}>{String(h).padStart(2, "0")}:00</option>;
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Client meeting, training session"
                  value={bookingForm.purpose}
                  onChange={(e) => setBookingForm({ ...bookingForm, purpose: e.target.value })}
                  className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                    isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Marketing, Engineering"
                    value={bookingForm.departmentId}
                    onChange={(e) => setBookingForm({ ...bookingForm, departmentId: e.target.value })}
                    className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                      isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                    }`}
                  />
                </div>
                <div>
                  <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Employee Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Karan Mehta"
                    value={bookingForm.employeeName}
                    onChange={(e) => setBookingForm({ ...bookingForm, employeeName: e.target.value })}
                    className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                      isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Contact</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={bookingForm.contact}
                  onChange={(e) => setBookingForm({ ...bookingForm, contact: e.target.value })}
                  className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                    isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                  }`}
                />
              </div>

              <div>
                <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Priority</label>
                <select
                  value={bookingForm.priority}
                  onChange={(e) => setBookingForm({ ...bookingForm, priority: e.target.value })}
                  className={`w-full p-2.5 rounded-xl text-xs outline-none border ${
                    isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                  }`}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label className={`${isDark ? "text-slate-400" : "text-[#64748B] font-semibold"} block mb-1`}>Remarks</label>
                <textarea
                  placeholder="Additional notes or requirements"
                  value={bookingForm.remarks}
                  onChange={(e) => setBookingForm({ ...bookingForm, remarks: e.target.value })}
                  rows={2}
                  className={`w-full p-2.5 rounded-xl text-xs outline-none border resize-none ${
                    isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-[#F8FAFC] border-slate-200 text-[#0F172A]"
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full text-xs font-semibold py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl cursor-pointer shadow"
            >
              Verify Schedule Availability
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
