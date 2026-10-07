'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DataHubModal from '@/components/DataHubModal';
import {
  CalendarDays,
  Clock,
  BookOpen,
  FileText,
  Calendar,
  BarChart3,
  Menu,
  X,
  Layers3,
  ChevronRight,
  Sparkles,
  Cloud,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

/* =========================================================
   SAVE TO HOME SCREEN HOOK (NON-TECHIE FRIENDLY MODAL)
   ========================================================= */
function useSaveToHomeScreen() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const triggerSave = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  return { isModalOpen, setIsModalOpen, triggerSave };
}

export default function Nav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isDataHubOpen, setIsDataHubOpen] = useState(false);
  const { isModalOpen, setIsModalOpen, triggerSave } = useSaveToHomeScreen();

  const navItems = [
    { name: 'Today Dashboard', href: '/today', icon: CalendarDays, desc: 'Daily attendance & class progress' },
    { name: 'Weekly Timetable', href: '/timetable', icon: Clock, desc: 'Manage your periods & routine' },
    { name: 'Syllabus & Units', href: '/syllabus', icon: BookOpen, desc: 'Academic courses, papers & units' },
    { name: 'Class Register', href: '/log', icon: FileText, desc: 'Teaching progress & student records' },
    { name: 'Academic Holidays', href: '/holidays', icon: Calendar, desc: 'Official institution calendar' },
    { name: 'Progress Reports', href: '/reports', icon: BarChart3, desc: 'Analytics & compliance registers' },
  ];

  // Close drawer automatically when navigating to a new route
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent background scrolling when the drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      <div className="flex items-center gap-2">
        {/* 1. GLOBAL CLOUD SYNC & BACKUP BUTTON */}
        <button
          type="button"
          onClick={() => setIsDataHubOpen(true)}
          aria-label="Cloud Sync & Backup Hub"
          title="Cloud Sync & Academic Data Backup"
          className="flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-950/60 hover:bg-blue-900/80 px-3 py-2 text-xs font-bold text-blue-200 shadow-sm transition hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 active:scale-95 cursor-pointer"
        >
          <Cloud className="h-4 w-4 text-blue-400 animate-pulse" />
          <span className="hidden sm:inline">Cloud Sync</span>
        </button>

        {/* 2. THE 3-BAR (HAMBURGER) TRIGGER BUTTON */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Navigation Menu"
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:border-indigo-500 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
        >
          <Menu className="h-4 w-4 text-indigo-400 group-hover:text-white" />
          <span className="hidden sm:inline">Menu</span>
        </button>
      </div>

      {/* 3. BACKDROP OVERLAY */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[90] bg-slate-950/75 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 4. SLIDING DRAWER PANEL */}
      <aside
        className={`fixed top-0 right-0 z-[100] flex h-full w-80 max-w-[85vw] flex-col justify-between border-l border-slate-800 bg-slate-950 text-white shadow-2xl transition-transform duration-300 ease-in-out overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Workspace Navigation Drawer"
      >
        {/* DRAWER TOP HEADER */}
        <div>
          <div className="flex items-center justify-between border-b border-slate-800/90 px-5 py-4 bg-slate-900/50">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                <Layers3 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-black tracking-wide text-white">Workspace Menu</p>
                <p className="text-[10px] text-indigo-300">Quick Navigation</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition hover:bg-slate-800 hover:text-white cursor-pointer"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* SAVE TO HOME SCREEN CALLOUT INSIDE DRAWER */}
          <div className="p-4 pb-0">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                triggerSave();
              }}
              className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl border border-blue-500/40 bg-gradient-to-r from-blue-900/40 to-indigo-900/40 text-blue-100 hover:border-blue-400 hover:bg-blue-900/60 transition shadow-sm text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight text-white">Save to Home Screen</p>
                  <p className="text-[10px] text-blue-300">Instant Access &bull; Zero Downloads</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-blue-400 group-hover:translate-x-0.5 transition" />
            </button>
          </div>

          {/* QUICK CLOUD SYNC CALLOUT INSIDE DRAWER */}
          <div className="p-4 pb-0">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsDataHubOpen(true);
              }}
              className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-indigo-900/40 to-violet-900/40 text-indigo-100 hover:border-indigo-400 hover:bg-indigo-900/60 transition shadow-sm text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight text-white">Cloud Sync &amp; Backup</p>
                  <p className="text-[10px] text-indigo-300">Google Drive &amp; Local JSON</p>
                </div>
              </div>
              <Cloud className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition" />
            </button>
          </div>

          {/* LIST OF 6 CLEAN TABS */}
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`group flex items-center justify-between gap-3 rounded-2xl p-3 text-left transition-all ${
                    isActive
                      ? 'border border-indigo-500/50 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-900/30'
                      : 'border border-slate-800/80 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-tight truncate">{item.name}</p>
                      <p
                        className={`text-[10px] truncate ${
                          isActive ? 'text-indigo-100' : 'text-slate-400'
                        }`}
                      >
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    className={`h-4 w-4 shrink-0 transition ${
                      isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'
                    }`}
                  />
                </Link>
              );
            })}
          </nav>
        </div>

        {/* DRAWER FOOTER */}
        <div className="border-t border-slate-800/80 bg-slate-900/40 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span>APNSIR Foundation Initiative</span>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-500">OdishaTeachers.com &bull; Academic Portal</p>
        </div>
      </aside>

      {/* 5. FRIENDLY NON-TECHIE GUIDE MODAL */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-[30px] border border-white/20 bg-white p-6 sm:p-7 shadow-2xl text-slate-900 space-y-5 animate-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Save ProfPlan to Home Screen
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Enjoy instant offline access with zero downloads!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 cursor-pointer transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-medium text-slate-700 leading-relaxed">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-blue-50/70 border border-blue-100">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-black text-xs">
                  1
                </div>
                <div>
                  <strong className="text-slate-900 block font-black">Tap your browser menu</strong>
                  Look for the three dots (<span className="font-bold text-slate-900">⠇</span>) in the top-right corner of your browser (or the Share icon on iPhone Safari).
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white font-black text-xs">
                  2
                </div>
                <div>
                  <strong className="text-slate-900 block font-black">Select &quot;Add to Home Screen&quot;</strong>
                  Tap <span className="font-bold text-indigo-700">&quot;Add to Home Screen&quot;</span> or <span className="font-bold text-indigo-700">&quot;Install App&quot;</span> from the menu list.
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition cursor-pointer"
              >
                Got It, Thanks!
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 6. GLOBAL DATA HUB MODAL WITH ACTIVE PAGE BROADCAST */}
      <DataHubModal
        isOpen={isDataHubOpen}
        onClose={() => {
          setIsDataHubOpen(false);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('profplan-change'));
          }
        }}
      />
    </>
  );
}