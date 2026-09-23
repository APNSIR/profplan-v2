'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { HelpCircle, X, ChevronRight, ArrowUpRight } from 'lucide-react';

interface Step {
    step: string;
    desc: string;
    href?: string;
    onClick?: () => void;
}

interface PageGuideProps {
    guideKey: string;
    title: string;
    summary: string;
    steps: Step[];
}

export default function PageGuide({
    guideKey,
    title,
    summary,
    steps,
}: PageGuideProps) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const isDismissed = localStorage.getItem(`guide_${guideKey}`);

        if (!isDismissed) {
            setIsOpen(true);
        }
    }, [guideKey]);

    const handleDismiss = () => {
        localStorage.setItem(`guide_${guideKey}`, 'dismissed');
        setIsOpen(false);
    };

    if (!isOpen) {
        return (
            <div className="mb-4 flex justify-end">
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                >
                    <HelpCircle className="h-3.5 w-3.5" />
                    How does this page work?
                </button>
            </div>
        );
    }

    return (
        <div className="relative mb-6 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-sm">

            {/* CLOSE GUIDE */}

            <button
                type="button"
                onClick={handleDismiss}
                className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 transition hover:bg-white/70 hover:text-slate-700"
                aria-label="Dismiss guide"
            >
                <X className="h-4 w-4" />
            </button>

            {/* GUIDE HEADER */}

            <div className="mb-1 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    💡
                </span>

                <h2 className="text-sm font-bold text-blue-950">
                    {title}
                </h2>
            </div>

            <p className="mb-3 ml-8 text-xs text-slate-600">
                {summary}
            </p>

            {/* GUIDE STEPS */}

            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">

                {steps.map((item, index) => {

                    const cardClassName =
                        'group block w-full rounded-lg border border-blue-100/80 bg-white/90 p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/40';

                    const content = (
                        <>
                            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-blue-700">

                                <span>{item.step}</span>

                                {item.href || item.onClick ? (
                                    <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-500" />
                                ) : index < steps.length - 1 ? (
                                    <ChevronRight className="ml-auto hidden h-3 w-3 text-slate-300 md:inline" />
                                ) : null}

                            </div>

                            <p className="text-xs leading-relaxed text-slate-600">
                                {item.desc}
                            </p>

                            {item.href || item.onClick ? (
                                <div className="mt-2 text-[10px] font-bold text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
                                    Open →
                                </div>
                            ) : null}
                        </>
                    );

                    if (item.href) {
                        return (
                            <Link
                                key={index}
                                href={item.href}
                                className={cardClassName}
                            >
                                {content}
                            </Link>
                        );
                    }

                    if (item.onClick) {
                        return (
                            <button
                                key={index}
                                type="button"
                                onClick={item.onClick}
                                className={cardClassName}
                            >
                                {content}
                            </button>
                        );
                    }

                    return (
                        <div
                            key={index}
                            className="rounded-lg border border-blue-100/80 bg-white/90 p-3 shadow-sm"
                        >
                            {content}
                        </div>
                    );
                })}

            </div>
        </div>
    );
}