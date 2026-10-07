'use client';

import './globals.css';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';

import Nav from '@/components/Nav';
import HeaderProfileWidget from '@/components/HeaderProfileWidget';

import { getCurrentAcademicSession, getActiveAcademicSession, saveActiveAcademicSession } from '@/lib/store';
import { migrateFromLocalStorageIfNeeded } from '@/lib/migration';
import { supabase } from '@/lib/supabaseClient';
import { Calendar, CheckCircle2, RotateCcw, X } from 'lucide-react';

/* =========================================================
   SESSION SETTINGS MODAL (CUSTOMIZABLE ACADEMIC SESSION)
   ========================================================= */
function SessionSettingsModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const [sessionInput, setSessionInput] = useState(() => getActiveAcademicSession());
    const [successMsg, setSuccessMsg] = useState(false);

    if (!isOpen) return null;

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!sessionInput.trim()) return;

        saveActiveAcademicSession(sessionInput);
        setSuccessMsg(true);
        setTimeout(() => {
            setSuccessMsg(false);
            onClose();
            window.location.reload(); // Refresh to apply session across all components
        }, 700);
    };

    const handleResetToAuto = () => {
        const auto = getCurrentAcademicSession();
        setSessionInput(auto);
        saveActiveAcademicSession(auto);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-md rounded-[30px] border border-white/20 bg-white p-6 sm:p-7 shadow-2xl text-slate-900 space-y-5 animate-in zoom-in-95">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
                            <Calendar className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900">
                                Academic Session Settings
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Customize your institutional session label &amp; boundaries
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 cursor-pointer transition"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {successMsg ? (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="font-bold">Session updated successfully! Refreshing...</span>
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                                Active Academic Session / Year *
                            </label>
                            <input
                                type="text"
                                value={sessionInput}
                                onChange={(e) => setSessionInput(e.target.value)}
                                placeholder="e.g. 2026-2027 or 2026-27"
                                required
                                autoFocus
                                className="w-full px-4 py-3 text-sm font-black text-slate-900 rounded-xl border-2 border-indigo-200 bg-indigo-50/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition"
                            />
                            <p className="mt-1 text-[11px] text-slate-500 font-medium">
                                Auto-calculated default is <strong className="text-slate-800">{getCurrentAcademicSession()}</strong>.
                            </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={handleResetToAuto}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                            >
                                <RotateCcw className="w-3.5 h-3.5" /> Reset to Auto
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition"
                                >
                                    Save Session
                                </button>
                            </div>
                        </div>
                    </form>
                )}

            </div>
        </div>
    );
}

/* =========================================================
   SUPABASE HEALTH CHECK
   ========================================================= */

const SUPABASE_HEALTHCHECK_KEY =
  'profplan_supabase_healthcheck_at';

const SUPABASE_HEALTHCHECK_INTERVAL =
  24 * 60 * 60 * 1000; // 24 hours

async function pingSupabaseDatabase(): Promise<void> {
  if (
    typeof window === 'undefined' ||
    !supabase ||
    !navigator.onLine
  ) {
    return;
  }

  try {
    const lastCheck = Number(
      window.localStorage.getItem(
        SUPABASE_HEALTHCHECK_KEY
      ) || '0'
    );

    const now = Date.now();

    if (
      Number.isFinite(lastCheck) &&
      now - lastCheck <
        SUPABASE_HEALTHCHECK_INTERVAL
    ) {
      return;
    }

    const { error } = await supabase
      .from('teacher_profiles')
      .select('id', {
        count: 'exact',
        head: true,
      });

    if (error) {
      console.warn(
        'Supabase health check note:',
        error.message
      );
      return;
    }

    window.localStorage.setItem(
      SUPABASE_HEALTHCHECK_KEY,
      String(now)
    );

    console.log(
      '⚡ ProfPlan Supabase health check: connection verified.'
    );
  } catch {
    /* Local-first fallback */
  }
}

/* =========================================================
   SERVICE WORKER MANAGEMENT
   ========================================================= */

async function manageServiceWorker(): Promise<void> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    try {
      const registrations =
        await navigator.serviceWorker.getRegistrations();

      if (registrations.length > 0) {
        await Promise.all(
          registrations.map((registration) =>
            registration.unregister()
          )
        );

        console.log(
          '🧹 ProfPlan development mode: old service worker registrations removed.'
        );
      }
    } catch (error) {
      console.warn(
        '⚠️ ProfPlan development service worker cleanup failed:',
        error
      );
    }

    return;
  }

  try {
    const registration =
      await navigator.serviceWorker.register(
        '/sw.js'
      );

    console.log(
      '✅ ProfPlan PWA ServiceWorker active with scope:',
      registration.scope
    );
  } catch (error) {
    console.warn(
      '⚠️ ProfPlan ServiceWorker registration failed:',
      error
    );
  }
}

/* =========================================================
   ROOT LAYOUT
========================================================= */

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [academicSession, setAcademicSession] = useState(() => getActiveAcademicSession());
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);

  const isHomePage = pathname === '/';

  /* =======================================================
     CLIENT INITIALISATION
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    try {
      migrateFromLocalStorageIfNeeded();
    } catch (error) {
      console.error(
        'ProfPlan: local data migration failed:',
        error
      );
    }

    if (!cancelled) {
      void pingSupabaseDatabase();
    }

    const initialiseServiceWorker = () => {
      if (!cancelled) {
        void manageServiceWorker();
      }
    };

    if (
      document.readyState === 'complete'
    ) {
      initialiseServiceWorker();
    } else {
      window.addEventListener(
        'load',
        initialiseServiceWorker,
        { once: true }
      );
    }

    const handleSessionChange = () => {
      setAcademicSession(getActiveAcademicSession());
    };
    window.addEventListener('profplan-session-change', handleSessionChange);

    return () => {
      cancelled = true;

      window.removeEventListener(
        'load',
        initialiseServiceWorker
      );
      window.removeEventListener('profplan-session-change', handleSessionChange);
    };
  }, []);

  return (
    <html lang="en">
      <head>
        <title>
          ProfPlan - Academic Register
        </title>

        <meta
          name="description"
          content="Teacher-Centric Lesson Planner, Timetable Manager & Academic Progress Register by APNSIR Foundation"
        />

        <meta
          name="theme-color"
          content="#020617"
        />

        <meta
          name="mobile-web-app-capable"
          content="yes"
        />

        <meta
          name="apple-mobile-web-app-capable"
          content="yes"
        />

        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />

        <meta
          name="apple-mobile-web-app-title"
          content="ProfPlan"
        />

        {/* PWA */}
        <link
          rel="manifest"
          href="/manifest.webmanifest"
        />

        {/* Explicit favicon prevents default /favicon.ico request */}
        <link
          rel="icon"
          href="/apnsir-logo.png"
          type="image/png"
        />

        {/* iOS home-screen icon */}
        <link
          rel="apple-touch-icon"
          href="/apnsir-logo.png"
        />

        {/* Google Identity Services */}
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
      </head>

      <body
        className={
          isHomePage
            ? 'min-h-screen flex flex-col bg-slate-950 text-white'
            : 'min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white'
        }
      >
        {/* =================================================
            TOP INSTITUTIONAL HEADER
            Hidden on Home Page
        ================================================= */}

        {!isHomePage && (
          <header className="bg-slate-950 text-white border-b border-slate-800 shadow-md sticky top-0 z-40">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">

              {/* -------------------------------------------
                  BRAND → HOME
              ------------------------------------------- */}

              <Link
                href="/"
                title="Return to OdishaTeachers.com Home"
                className="flex items-center gap-2.5 min-w-0 group hover:opacity-90 transition cursor-pointer"
              >
                <div className="relative h-9 w-9 sm:h-11 sm:w-11 shrink-0 overflow-hidden rounded-full bg-white p-0.5 shadow-sm border border-slate-700 group-hover:ring-2 group-hover:ring-indigo-400/50 transition">
                  <Image
                    src="/apnsir-logo.png"
                    alt="APNSIR Foundation Logo"
                    width={44}
                    height={44}
                    priority
                    className="h-full w-full object-contain rounded-full"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs sm:text-base font-black tracking-tight text-white truncate leading-tight group-hover:text-indigo-200 transition">
                      E-Lesson Plan
                    </span>

                    <span className="hidden sm:inline text-[9px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider">
                      APNSIR FOUNDATION
                    </span>
                  </div>

                  <div className="text-[10px] sm:text-xs text-blue-200/80 font-medium truncate">
                    Daily Teaching Progress
                  </div>
                </div>
              </Link>

              {/* -------------------------------------------
                  HEADER CONTROLS
              ------------------------------------------- */}

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

                {/* Academic Session (Responsive: Full text on desktop, compact badge on mobile) */}
                <button
                  type="button"
                  onClick={() => setIsSessionModalOpen(true)}
                  title="Click to customize academic session boundaries"
                  className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 px-2 sm:px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-semibold text-slate-200 shadow-inner hover:border-indigo-400 transition cursor-pointer shrink-0"
                >
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse" />
                  
                  {/* Desktop View */}
                  <span className="hidden sm:inline">Session {academicSession}</span>

                  {/* Mobile View Badge */}
                  <span className="sm:hidden font-black text-amber-300">
                    {academicSession.includes('-') 
                      ? `${academicSession.split('-')[0].slice(-2)}-${academicSession.split('-')[1].slice(-2)}` 
                      : academicSession}
                  </span>
                </button>

                {/* Profile */}
                <HeaderProfileWidget />

                {/* Navigation Drawer */}
                <Nav />

              </div>
            </div>
          </header>
        )}

        {/* =================================================
            MAIN BODY
        ================================================= */}

        <main
          className={
            isHomePage
              ? 'flex-1 flex flex-col'
              : 'main max-w-6xl w-full mx-auto p-4 md:p-6 flex-1'
          }
        >
          {children}
        </main>

        {/* =================================================
            INSTITUTIONAL FOOTER
            Hidden on Home Page
        ================================================= */}

        {!isHomePage && (
          <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
            <div className="max-w-6xl mx-auto px-4 text-center text-xs text-slate-500 space-y-0.5">

              <p className="font-bold text-slate-700">
                E-Lesson Plan-cum-Progress Register
              </p>

              <p>
                An Initiative by{' '}
                <strong>
                  APNSIR FOUNDATION
                </strong>{' '}
                (Section 8 Company). Designed for Academic
                Quality Assurance &amp; Departmental Compliance.
              </p>

            </div>
          </footer>
        )}

        {/* SESSION SETTINGS MODAL */}
        <SessionSettingsModal
          isOpen={isSessionModalOpen}
          onClose={() => setIsSessionModalOpen(false)}
        />
      </body>
    </html>
  );
}