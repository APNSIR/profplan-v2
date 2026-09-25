'use client';

import './globals.css';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Nav from '@/components/Nav';
import OnboardingModal from '@/components/OnboardingModal';
import HeaderProfileWidget from '@/components/HeaderProfileWidget';
import { getCurrentAcademicSession } from '@/lib/store';
import { migrateFromLocalStorageIfNeeded } from '@/lib/migration';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const academicSession = getCurrentAcademicSession();

  useEffect(() => {
    // 1. Run initial migration from localStorage into IndexedDB on mount
    migrateFromLocalStorageIfNeeded();

    // 2. Register Service Worker for Offline PWA Support
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('✅ ProfPlan PWA ServiceWorker active with scope:', registration.scope);
          })
          .catch((error) => {
            console.error('⚠️ ProfPlan ServiceWorker registration failed:', error);
          });
      });
    }
  }, []);

  // Check if the user is on the home/landing page
  const isHomePage = pathname === '/';

  return (
    <html lang="en">
      <head>
        <title>ProfPlan - Academic Register</title>
        <meta
          name="description"
          content="Teacher-Centric Lesson Planner, Timetable Manager & Academic Progress Register by APNSIR Foundation"
        />

        {/* PWA & Mobile Install Meta Tags */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#020617" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ProfPlan" />
        <link rel="apple-touch-icon" href="/apnsir-logo.png" />

        {/* Google Identity Services (GIS) Client for Zero-Cost Drive Sync */}
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>

      <body
        className={
          isHomePage
            ? 'min-h-screen flex flex-col bg-slate-950 text-white'
            : 'min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white'
        }
      >
        {/* FIRST-TIME TEACHER ONBOARDING MODAL - Hidden on Home Page */}
        {!isHomePage && <OnboardingModal />}

        {/* TOP INSTITUTIONAL BRAND & EDUCATOR PROFILE HEADER - Hidden on Home Page */}
        {!isHomePage && (
          <header className="bg-slate-950 text-white border-b border-slate-800 shadow-md sticky top-0 z-40">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
              
              {/* CLICKABLE BRAND LOGO & TITLE -> TRANSPORTS TO HOME */}
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

              {/* CONTROLS (SESSION BADGE + PROFILE + HAMBURGER MENU) */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="hidden lg:flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-200 shadow-inner">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Session {academicSession}</span>
                </div>

                <HeaderProfileWidget />

                {/* HAMBURGER SLIDING DRAWER TRIGGER */}
                <Nav />
              </div>

            </div>
          </header>
        )}

        {/* MAIN BODY VIEWPORT */}
        <main
          className={
            isHomePage
              ? 'flex-1 flex flex-col'
              : 'main max-w-6xl w-full mx-auto p-4 md:p-6 flex-1'
          }
        >
          {children}
        </main>

        {/* INSTITUTIONAL COMPLIANCE FOOTER - Hidden on Home Page */}
        {!isHomePage && (
          <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
            <div className="max-w-6xl mx-auto px-4 text-center text-xs text-slate-500 space-y-0.5">
              <p className="font-bold text-slate-700">
                E-Lesson Plan-cum-Progress Register
              </p>
              <p>
                An Initiative by <strong>APNSIR FOUNDATION</strong> (Section 8 Company). Designed for Academic Quality Assurance &amp; Departmental Compliance.
              </p>
            </div>
          </footer>
        )}
      </body>
    </html>
  );
}