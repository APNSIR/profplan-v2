'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Clock, BookOpen, FileText, Calendar, BarChart3 } from 'lucide-react';

export default function Nav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Today', href: '/today', icon: CalendarDays },
    { name: 'Syllabus', href: '/syllabus', icon: BookOpen },
    { name: 'Timetable', href: '/timetable', icon: Clock },
    { name: 'Class Register', href: '/log', icon: FileText },
    { name: 'Holidays', href: '/holidays', icon: Calendar },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
  ];

  return (
    <nav className="bg-blue-700 text-white shadow-lg">
      <div className="mx-auto max-w-7xl px-4 py-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 shadow-xs ${isActive
                  ? 'bg-blue-800 text-white shadow-md ring-2 ring-blue-400/40 scale-[1.02]'
                  : 'bg-white/5 hover:bg-blue-800 text-blue-100 hover:text-white border border-white/5'
                  }`}
              >
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-blue-200'}`} />
                <span className="tracking-tight">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}