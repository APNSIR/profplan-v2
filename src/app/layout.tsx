'use client';

import './globals.css';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Nav from '@/components/Nav';
import OnboardingModal from '@/components/OnboardingModal';
import HeaderProfileWidget from '@/components/HeaderProfileWidget';
import { getCurrentAcademicSession } from '@/lib/store';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const academicSession = getCurrentAcademicSession();
  
  // Check if the user is on the home/landing page
  const isHomePage = pathname === '/';

  return (
    <html lang="en">
      <body className={isHomePage ? "min-h-screen flex flex-col bg-slate-950 text-white" : "min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white"}>
        
        {/* FIRST-TIME TEACHER ONBOARDING MODAL - Hidden on Home Page */}
        {!isHomePage && <OnboardingModal />}

        {/* TOP INSTITUTIONAL BRAND & EDUCATOR PROFILE HEADER - Hidden on Home Page */}
        {!isHomePage && (
          <header className="bg-slate-950 text-white border-b border-slate-800 shadow-md sticky top-0 z-40">
            <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white p-0.5 shadow-sm border border-slate-700">
                  <Image
                    src="/apnsir-logo.png"
                    alt="APNSIR Foundation Logo"
                    width={44}
                    height={44}
                    priority
                    className="h-full w-full object-contain rounded-full"
                  />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                      E-Lesson Plan-cum-Progress Register
                    </span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                      APNSIR FOUNDATION
                    </span>
                  </div>
                  <div className="text-xs text-blue-200/80 font-medium">
                    Academic Lesson Planning &amp; Daily Teaching Progress
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <div className="hidden md:flex items-center gap-2 bg-slate-900 border border-slate-700/80 px-3 py-1.5 rounded-2xl text-xs font-semibold text-slate-200 shadow-inner">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Session {academicSession}</span>
                </div>
                <HeaderProfileWidget />
              </div>
            </div>
          </header>
        )}

        {/* PRIMARY NAVIGATION COMPONENT - Hidden on Home Page */}
        {!isHomePage && <Nav />}

        {/* MAIN BODY VIEWPORT */}
        <main className={isHomePage ? "flex-1 flex flex-col" : "main max-w-6xl w-full mx-auto p-4 md:p-6 flex-1"}>
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