'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  MapPin, 
  Building2, 
  Laptop,
  MessageCircle,
  LogIn,
  X,
  Award,
  HelpCircle,
  Loader2
} from 'lucide-react';

const WHATSAPP_COMMUNITY_URL =
  'https://chat.whatsapp.com/Gkm703nk0tzEojU0wol0pX?s=cl&p=i&mlu=4&ilr=4';

const HELP_DESK_PHONE = "916371421335";
const HELP_DESK_URL = `https://wa.me/${HELP_DESK_PHONE}?text=${encodeURIComponent(
  "Namaskar Sir, I am an educator visiting OdishaTeachers.com. I would like assistance regarding the platform."
)}`;

export default function Home() {
  const router = useRouter();
  const corporateAddress = "Qr. No. BL-106, VSS Nagar, Mancheswar, Bhubaneswar, Khorda - 751017, Odisha";

  const [isOnboarded, setIsOnboarded] = useState(false);
  const [userName, setUserName] = useState('');
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    try {
      // 1. Check profplan_profile
      const storedProfile = localStorage.getItem('profplan_profile');
      let foundOnboarded = false;

      if (storedProfile) {
        const parsed = JSON.parse(storedProfile);
        if (parsed?.onboarded || parsed?.name) {
          foundOnboarded = true;
          setUserName(parsed.name || 'Teacher');
        }
      }

      // 2. Also check profplan_data (if teacher already created timetable/classes)
      const storedData = localStorage.getItem('profplan_data');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        if (
          (parsedData?.classes && parsedData.classes.length > 0) ||
          (parsedData?.slots && parsedData.slots.length > 0)
        ) {
          foundOnboarded = true;
          if (!userName) setUserName('Teacher');
        }
      }

      if (foundOnboarded) {
        setIsOnboarded(true);
      } else {
        localStorage.setItem('profplan_landing_active', 'true');
      }
    } catch {
      // Safe fallback
    }

    return () => {
      localStorage.removeItem('profplan_landing_active');
    };
  }, [userName]);

  const handleLaunchSetup = () => {
    localStorage.removeItem('profplan_landing_active');
    // If already has classes or slots, always route to /today
    if (isOnboarded) {
      router.push('/today');
    } else {
      router.push('/today');
    }
  };

  const handleDirectWorkspace = () => {
    localStorage.removeItem('profplan_landing_active');
    router.push('/today');
  };

  const handleGoogleSignIn = () => {
    setIsConnecting(true);
    setTimeout(() => {
      handleDirectWorkspace();
    }, 400);
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.trim().length === 10) {
      localStorage.setItem('profplan_user_phone', phoneNumber.trim());
    }
    handleDirectWorkspace();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white flex flex-col justify-between px-4 sm:px-8 py-5 overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      
      {/* ============================================================
          1. HEADER: BRAND & OFFICIAL INITIATIVE
      ============================================================ */}
      <header className="max-w-4xl mx-auto w-full pb-3 border-b border-white/10">
        <div className="flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-11 h-11 sm:w-13 sm:h-13 shrink-0 overflow-hidden rounded-full bg-white p-0.5 shadow-lg ring-2 ring-indigo-400/40">
              <img
                src="/apnsir-logo.png"
                alt="APNSIR Foundation Logo"
                className="w-full h-full object-contain rounded-full"
                width={52}
                height={52}
              />
            </div>
            
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                OdishaTeachers<span className="text-orange-500">.com</span>
              </h1>

              <div className="flex flex-wrap items-center gap-x-1.5 text-[10px] sm:text-xs mt-0.5">
                <span className="text-slate-400">An Initiative of</span>
                <span className="font-bold text-indigo-300">APNSIR FOUNDATION</span>
                <span className="text-slate-500">&bull;</span>
                <span className="font-medium text-slate-300">Section 8 Company</span>
              </div>
            </div>
          </div>

          <a
            href={HELP_DESK_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Chat with Help Desk on WhatsApp"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/20 px-3.5 py-1.5 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-600 hover:text-white transition whitespace-nowrap shrink-0 shadow-sm"
          >
            <HelpCircle className="h-3.5 w-3.5 text-emerald-400" />
            <span>Help Desk</span>
          </a>
        </div>
      </header>

      {/* ============================================================
          2. HERO SECTION & APPLICATION ACTIONS
      ============================================================ */}
      <main className="max-w-3xl mx-auto text-center my-auto py-6 sm:py-9 w-full">
        
        {/* Initiative Pill */}
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3.5 py-1 text-[11px] font-bold text-indigo-300 ring-1 ring-indigo-500/30 mb-3 shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-orange-400" />
          <span>Odisha&apos;s Dedicated Digital Platform for Teachers</span>
        </div>

        {/* Vision Headline */}
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
          Digital Excellence for{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-violet-300 to-white">
            Every Educator in Odisha.
          </span>
        </h2>

        {/* Featured Product: PROFPLAN */}
        <div 
          onClick={handleDirectWorkspace}
          className="group block mt-6 text-slate-200 max-w-xl mx-auto leading-relaxed bg-gradient-to-b from-white/[0.09] to-white/[0.04] border border-white/20 p-5 sm:p-6 rounded-[1.75rem] backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.45)] transition duration-300 hover:-translate-y-0.5 hover:border-indigo-500/60 hover:shadow-indigo-500/10 cursor-pointer text-center relative overflow-hidden"
        >
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-black uppercase tracking-[0.2em] mb-2 ring-1 ring-indigo-500/30">
            <Laptop className="h-3 w-3 text-orange-400" /> Featured Digital Tool
          </div>
          <p className="font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300 text-2xl sm:text-3xl tracking-tight">
            PROFPLAN
          </p>
          <p className="text-indigo-200 font-bold text-xs sm:text-sm mt-0.5 tracking-wide">
            E-Lesson Plan-cum-Progress Register
          </p>
          <p className="text-orange-400 font-extrabold text-[11px] mt-2 uppercase tracking-wider">
            A Gift to the Teaching Fraternity
          </p>
          <p className="text-slate-300 text-[11px] font-medium tracking-wider mt-0.5 italic">
            Plan &bull; Teach &bull; Record &bull; Progress
          </p>
        </div>

        {/* Primary Call-to-Action Suite */}
        <div className="mt-5 max-w-sm mx-auto w-full space-y-2">
          <button
            type="button"
            onClick={handleDirectWorkspace}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 py-3.5 px-5 text-sm font-extrabold text-white shadow-lg shadow-indigo-950/60 hover:-translate-y-0.5 transition cursor-pointer"
          >
            <span>{isOnboarded ? `Continue as ${userName}` : 'Open Daily Dashboard'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowSignInModal(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-white/20 bg-white/10 py-2.5 px-3 text-xs font-bold text-white hover:bg-white/15 transition cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5 text-indigo-300 shrink-0" />
              <span className="truncate">Teacher Login</span>
            </button>

            <a
              href={WHATSAPP_COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-500/30 bg-emerald-600/15 py-2.5 px-3 text-xs font-bold text-emerald-300 hover:bg-emerald-600/25 transition truncate"
            >
              <MessageCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">WhatsApp Group</span>
            </a>
          </div>
        </div>

        {/* ============================================================
            3. INSTITUTIONAL CREDIBILITY & REGISTERED OFFICE CARD
        ============================================================ */}
        <div className="mt-6 max-w-xl mx-auto rounded-2xl border border-white/15 bg-white/[0.04] p-4 backdrop-blur-md shadow-xl text-center space-y-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
              OdishaTeachers<span className="text-orange-500">.com</span>
            </h3>
            <p className="text-slate-300 text-[11px] sm:text-xs mt-0.5 font-medium">
              An Initiative of <span className="text-indigo-300 font-bold">APNSIR Foundation</span> (A Registered Section 8 Non-Profit Company)
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] sm:text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-lg border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1 text-slate-300">
              <Building2 className="h-3 w-3 text-indigo-400 shrink-0" />
              <span className="text-slate-400">CIN:</span>
              <span className="font-mono font-bold text-white">U85500OD2024NPL046895</span>
            </span>

            <span className="inline-flex items-center gap-1 rounded-lg border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1 text-slate-300">
              <Award className="h-3 w-3 text-indigo-400 shrink-0" />
              <span className="text-slate-400">Licence:</span>
              <span className="font-mono font-bold text-white">160609</span>
            </span>

            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300 font-semibold">
              <ShieldCheck className="h-3 w-3 text-emerald-400 shrink-0" />
              <span>12AB &amp; 80G Registered NGO</span>
            </span>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-center gap-1.5 text-slate-400 text-[11px]">
            <MapPin className="h-3.5 w-3.5 text-orange-400 shrink-0" />
            <span className="leading-snug">{corporateAddress}</span>
          </div>
        </div>

        {/* ============================================================
            4. MEMORIAL DEDICATION: LATE CHARUMANI PARIDA
        ============================================================ */}
        <div className="mt-4 max-w-xl mx-auto rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-white/[0.04] to-amber-500/10 p-3.5 sm:p-4 backdrop-blur-md shadow-lg shadow-black/25 text-left">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-full ring-2 ring-amber-400 shadow-md shadow-amber-950/50 bg-slate-950">
              <img
                src="/charumani-parida.png"
                alt="Late Charumani Parida"
                className="h-full w-full object-cover [object-position:50%_18%] scale-135"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.16em] text-amber-400">
                In Loving Memory &amp; Dedication
              </p>

              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight mt-0.5">
                Late Charumani Parida
              </h3>

              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed mt-0.5">
                Founder, <strong className="text-slate-100 font-semibold">SEVA English Medium School</strong>. An inspiring teacher and dedicated social reformer who devoted her life to education and service across remote Kandhamal.
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* ============================================================
          5. SIGN IN MODAL FOR RETURNING TEACHERS
      ============================================================ */}
      {showSignInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-white/20 bg-slate-900 p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => {
                setShowSignInModal(false);
                setIsConnecting(false);
              }}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center pt-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30 mb-3">
                <LogIn className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-white">Teacher Login</h3>
              <p className="mt-1 text-xs text-slate-400">
                Access your existing timetable and saved teaching records.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                disabled={isConnecting}
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-white px-4 py-3.5 text-xs font-bold text-slate-900 shadow-md hover:bg-slate-100 transition cursor-pointer disabled:opacity-75"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                    <span>Opening Workspace...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Continue with Google Account</span>
                  </>
                )}
              </button>

              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <span className="relative bg-slate-900 px-3 text-[10px] font-bold uppercase text-slate-500">
                  Or enter registered phone
                </span>
              </div>

              <form onSubmit={handlePhoneSubmit} className="space-y-3">
                <input
                  type="tel"
                  maxLength={10}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit registered WhatsApp / Phone"
                  className="w-full rounded-xl border border-slate-700 bg-white/5 px-4 py-3 text-xs font-semibold text-white placeholder:text-slate-500 outline-none focus:border-indigo-500"
                />

                <button
                  type="submit"
                  className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-500 transition cursor-pointer"
                >
                  Find My Workspace
                </button>
              </form>
            </div>

            <p className="mt-4 text-center text-[10px] text-slate-400">
              New to ProfPlan?{' '}
              <button
                type="button"
                onClick={() => {
                  setShowSignInModal(false);
                  handleDirectWorkspace();
                }}
                className="font-bold text-indigo-400 hover:underline cursor-pointer"
              >
                Go directly to Today Dashboard
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ============================================================
          6. CLEAN COPYRIGHT FOOTER
      ============================================================ */}
      <footer className="max-w-4xl mx-auto w-full pt-4 pb-2 border-t border-white/10 text-center text-[11px] text-slate-500">
        <p>&copy; {new Date().getFullYear()} APNSIR Foundation. All rights reserved.</p>
      </footer>

    </div>
  );
}