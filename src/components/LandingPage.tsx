import React, { useState } from "react";
import { motion } from "motion/react";
import { Shield, Layers, Calendar, Activity, Zap, BarChart3, ChevronRight, UserPlus, LogIn, ArrowRight, Eye } from "lucide-react";

interface LandingPageProps {
  onNavigateToAuth: (mode: "login" | "signup") => void;
}

export default function LandingPage({ onNavigateToAuth }: LandingPageProps) {
  return (
    <div className="relative min-h-screen font-sans bg-slate-950 overflow-hidden text-slate-100 flex flex-col justify-between">
      {/* Dynamic Background Mesh Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      
      {/* Decorative Radial Gradients */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
            AssetFlow
          </span>
          <span className="text-[10px] uppercase tracking-widest bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono border border-indigo-500/30">
            v1.0
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigateToAuth("login")}
            className="text-sm font-medium text-slate-300 hover:text-white transition-all duration-200 flex items-center gap-1.5 px-4 py-2 hover:bg-slate-900/50 rounded-lg border border-transparent hover:border-slate-800"
          >
            <LogIn className="w-4 h-4" /> Sign In
          </button>
          <button
            onClick={() => onNavigateToAuth("signup")}
            className="text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 px-4 py-2 rounded-lg transition-all duration-300 shadow-md shadow-indigo-500/15 hover:shadow-indigo-500/25 flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" /> Employee Register
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-12 gap-12 items-center flex-grow">
        
        {/* Left column text */}
        <div className="lg:col-span-7 flex flex-col items-start gap-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-full text-xs text-indigo-300 font-mono shadow-inner"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            Odoo Hackathon Winner: Enterprise Asset Flow
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1]"
          >
            Connected <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              Enterprise Resources
            </span> <br />
            digitized instantly.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed"
          >
            Streamline your organizational layout. Register assets, schedule shared spaces, coordinate maintenance tickets, execute cross-department transfers, and manage audits backed by Gemini AI.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center gap-4 mt-4"
          >
            <button
              onClick={() => onNavigateToAuth("login")}
              className="group text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-6 py-3.5 rounded-xl transition-all-300 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/35 flex items-center gap-2 cursor-pointer"
            >
              Enter Dashboard 
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#features"
              className="text-sm font-semibold text-slate-300 hover:text-white px-5 py-3 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/30 hover:bg-slate-900/80 transition-all duration-200"
            >
              Explore Features
            </a>
          </motion.div>

          {/* Quick Metrics */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-slate-900 w-full"
          >
            <div>
              <p className="font-display text-2xl font-bold text-white">100%</p>
              <p className="text-xs text-slate-500 font-sans mt-1">Audit Coverage</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-indigo-400">&lt; 3.2s</p>
              <p className="text-xs text-slate-500 font-sans mt-1">Gemini AI Synthesis</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-emerald-400">0%</p>
              <p className="text-xs text-slate-500 font-sans mt-1">Resource Overlaps</p>
            </div>
          </motion.div>
        </div>

        {/* Right column: Interactive UI Preview Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="lg:col-span-5 relative"
        >
          {/* Glass Card Wrapper */}
          <div className="relative glass-panel rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden p-6">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800/60">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/60"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-500/60"></span>
                <span className="w-3 h-3 rounded-full bg-green-500/60"></span>
              </div>
              <span className="text-xs font-mono text-slate-500">assetflow_erp_dashboard_live</span>
            </div>

            {/* Simulated Live UI Metrics */}
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-900/60 rounded-xl p-4 border border-slate-800/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono text-slate-400">TOTAL ASSETS REG</h4>
                    <p className="text-lg font-bold text-white font-display">254 Assets</p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-medium">
                  +12.4%
                </span>
              </div>

              <div className="flex justify-between items-center bg-slate-900/60 rounded-xl p-4 border border-slate-800/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono text-slate-400">ACTIVE BOOKINGS TODAY</h4>
                    <p className="text-lg font-bold text-white font-display">18 Bookings</p>
                  </div>
                </div>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono font-medium">
                  Optimal
                </span>
              </div>

              <div className="flex justify-between items-center bg-slate-900/60 rounded-xl p-4 border border-slate-800/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono text-slate-400">MAINTENANCE CYCLE</h4>
                    <p className="text-lg font-bold text-white font-display">3 Active Tickets</p>
                  </div>
                </div>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono font-medium">
                  Assigned
                </span>
              </div>
            </div>

            {/* Graphic Chart Element */}
            <div className="mt-6 pt-4 border-t border-slate-800/60">
              <div className="flex justify-between text-[11px] text-slate-500 font-mono mb-2">
                <span>Monthly Asset Utilization Trend</span>
                <span className="text-indigo-400">Gemini Powered Risk Score: 12%</span>
              </div>
              <div className="h-16 flex items-end gap-1 px-2">
                {[30, 45, 35, 60, 40, 75, 90, 85, 95, 60, 75, 80].map((val, idx) => (
                  <div key={idx} className="flex-1 bg-gradient-to-t from-indigo-500/20 to-indigo-500 rounded-t-sm" style={{ height: `${val}%` }}></div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Bento Grid Features Section */}
      <section id="features" className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20 border-t border-slate-900 bg-slate-950">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white">
            Designed for Modern Enterprise Standards
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto mt-3">
            Fully integrated database, instant QR tags, audit discrepancy checks, scheduling and real-time timeline logs.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/60 p-6 rounded-2xl transition-all duration-300">
            <Shield className="w-8 h-8 text-indigo-400 mb-4" />
            <h3 className="font-display font-semibold text-lg text-white mb-2">Role Based Security</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Administrators manage permissions, Asset Managers track locations, Department Heads approve transfers, and Employees book shared resources.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/60 p-6 rounded-2xl transition-all duration-300">
            <Zap className="w-8 h-8 text-amber-400 mb-4" />
            <h3 className="font-display font-semibold text-lg text-white mb-2">Gemini AI Engine</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Unlock smart retirement dates, remaining salvage value estimates, and multi-paragraph executive discrepancy reports generated by the model.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/60 p-6 rounded-2xl transition-all duration-300">
            <Calendar className="w-8 h-8 text-emerald-400 mb-4" />
            <h3 className="font-display font-semibold text-lg text-white mb-2">Resource Scheduler</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Book conference rooms, team vehicles, or hardware equipment with an interactive calendar view featuring instant overlap check conflict rejections.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/60 p-6 rounded-2xl transition-all duration-300">
            <Activity className="w-8 h-8 text-blue-400 mb-4" />
            <h3 className="font-display font-semibold text-lg text-white mb-2">Maintenance tickets</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Report issues, specify priorities, and assign technicians. Approved tickets automatically lock assets to UnderMaintenance and unlock them upon repair.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/60 p-6 rounded-2xl transition-all duration-300">
            <BarChart3 className="w-8 h-8 text-purple-400 mb-4" />
            <h3 className="font-display font-semibold text-lg text-white mb-2">Audits & Reports</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Deploy audit cycles to verify and update condition status across specific physical zones, and export data directly into Excel spreadsheets.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/60 p-6 rounded-2xl transition-all duration-300">
            <Layers className="w-8 h-8 text-pink-400 mb-4" />
            <h3 className="font-display font-semibold text-lg text-white mb-2">Bulk Allocation Flow</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Select dozens of physical units in the inventory sheet, select an owner, and batch assign them with automated notifications and QR tag registers.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 border-t border-slate-900 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500">
        <p>© 2026 AssetFlow ERP Inc. Built securely in standard Cloud Native Workspace.</p>
        <div className="flex gap-4 mt-4 sm:mt-0">
          <a href="#" className="hover:text-slate-300">Privacy Policy</a>
          <span>•</span>
          <a href="#" className="hover:text-slate-300">Terms of Service</a>
          <span>•</span>
          <a href="#" className="hover:text-slate-300">Odoo Hackathon Project</a>
        </div>
      </footer>
    </div>
  );
}
