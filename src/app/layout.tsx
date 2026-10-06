'use client';

import './globals.css';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';

import Nav from '@/components/Nav';
import HeaderProfileWidget from '@/components/HeaderProfileWidget';

import { getCurrentAcademicSession } from '@/lib/store';
import { migrateFromLocalStorageIfNeeded } from '@/lib/migration';
import { supabase } from '@/lib/supabaseClient';

/* =========================================================
   SUPABASE HEALTH CHECK
   =========================================================
   Best-effort activity check when ProfPlan is opened.

   IMPORTANT:
   This only runs when the application is actually opened.
   It cannot keep an otherwise unused Supabase project active
   by itself.
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

    /*
     * Avoid unnecessary repeated requests.
     * This also prevents duplicate development requests
     * caused by React Strict Mode.
     */
    if (
      Number.isFinite(lastCheck) &&
      now - lastCheck <
        SUPABASE_HEALTHCHECK_INTERVAL
    ) {
      return;
    }

    /*
     * Current ProfPlan canonical table:
     * teacher_profiles
     *
     * We only need to confirm that the table is reachable.
     * Selecting "id" avoids depending on a specific profile field.
     */
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
    /*
     * ProfPlan is local-first.
     * Network/connection failures should never interrupt
     * the application or the teacher's local workspace.
     */
  }
}

/* =========================================================
   SERVICE WORKER MANAGEMENT
   =========================================================
   Development:
   - Do NOT register the PWA service worker.
   - Remove an old localhost registration if one exists.
   This prevents stale cached chunks from interfering with
   Next.js Fast Refresh / development chunk loading.

   Production:
   - Register /sw.js normally.
========================================================= */

async function manageServiceWorker(): Promise<void> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return;
  }

  /* -------------------------------------------------------
     DEVELOPMENT
     ------------------------------------------------------- */
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

  /* -------------------------------------------------------
     PRODUCTION
     ------------------------------------------------------- */

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
    /*
     * PWA failure should never stop ProfPlan itself.
     */
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
  const academicSession =
    getCurrentAcademicSession();

  const isHomePage = pathname === '/';

  /* =======================================================
     CLIENT INITIALISATION
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    /* -----------------------------------------------------
       1. LOCAL DATA MIGRATION
       ----------------------------------------------------- */
    try {
      migrateFromLocalStorageIfNeeded();
    } catch (error) {
      console.error(
        'ProfPlan: local data migration failed:',
        error
      );
    }

    /* -----------------------------------------------------
       2. SUPABASE HEALTH CHECK
       ----------------------------------------------------- */
    if (!cancelled) {
      void pingSupabaseDatabase();
    }

    /* -----------------------------------------------------
       3. PWA / SERVICE WORKER
       ----------------------------------------------------- */
    const initialiseServiceWorker = () => {
      if (!cancelled) {
        void manageServiceWorker();
      }
    };

    /*
     * If the page has already finished loading, register
     * immediately. Otherwise wait for the load event.
     */
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

    /* -----------------------------------------------------
       CLEANUP
       ----------------------------------------------------- */
    return () => {
      cancelled = true;

      window.removeEventListener(
        'load',
        initialiseServiceWorker
      );
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

        {/* Explicit favicon prevents the default /favicon.ico request */}
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

                {/* Academic Session */}
                <div className="hidden lg:flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-200 shadow-inner">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />

                  <span>
                    Session {academicSession}
                  </span>
                </div>

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
      </body>
    </html>
  );
}