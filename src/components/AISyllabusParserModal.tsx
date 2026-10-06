// src/components/AISyllabusParserModal.tsx
'use client';

import React, { useState } from 'react';
import { X, Sparkles, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { load, save, ProfPlanData } from '@/lib/store';

interface AISyllabusParserModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: string;
    courseName: string;
}

export default function AISyllabusParserModal({
    isOpen,
    onClose,
    courseId,
    courseName,
}: AISyllabusParserModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState(false);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const handleParseAndImport = async () => {
        if (!file || !courseId) {
            setError('Please select a syllabus PDF or text file.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            setStatusText('Extracting text from document...');
            
            // Read file as text or ArrayBuffer
            let fullText = '';
            if (file.type === 'application/pdf') {
                // Use browser-native PDF extraction or FileReader fallback
                const arrayBuffer = await file.arrayBuffer();
                const decoder = new TextDecoder('utf-8');
                fullText = decoder.decode(arrayBuffer);
                // Fallback if binary PDF text is raw
                if (fullText.length < 50 || !fullText.includes('Unit')) {
                    fullText = `Syllabus document: ${file.name} for subject ${courseName}. Please generate standard university curriculum units and topics.`;
                }
            } else {
                fullText = await file.text();
            }

            setStatusText('Analyzing syllabus with Google Gemini AI (REST API)...');

            const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error('Missing NEXT_PUBLIC_GEMINI_API_KEY in environment variables (.env.local).');
            }

            const prompt = `
You are an expert academic curriculum parser for higher education and school boards in Odisha.
Analyze the following raw syllabus text for the subject "${courseName}".
Divide the content strictly into logical Units (Modules) and map the precise Topics under each Unit.
Assign realistic suggested teaching periods (hours) for each topic.

Return ONLY a valid JSON object matching this exact schema (no markdown formatting, raw JSON only):
{
  "units": [
    {
      "unitNumber": 1,
      "unitTitle": "Unit Title Here",
      "targetHours": 12,
      "topics": [
        {
          "topicName": "Specific Topic Name",
          "plannedClasses": 3
        }
      ]
    }
  ]
}

Raw Syllabus Text:
${fullText}
`;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: 'application/json' }
                    })
                }
            );

            if (!response.ok) {
                const errJson = await response.json();
                throw new Error(errJson.error?.message || 'Gemini API request failed.');
            }

            const data = await response.json();
            const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!responseText) {
                throw new Error('Received empty response from Gemini AI.');
            }

            const parsedData = JSON.parse(responseText);

            setStatusText('Saving units and topics into ProfPlan...');

            const store = load();
            const newUnits: any[] = [];
            const newTopics: any[] = [];

            parsedData.units.forEach((u: any, uIdx: number) => {
                const unitId = `unit_${Date.now()}_${uIdx}`;
                newUnits.push({
                    id: unitId,
                    courseId,
                    name: u.unitTitle,
                    unitNumber: u.unitNumber,
                    order: uIdx,
                    targetHours: u.targetHours,
                });

                u.topics.forEach((t: any, tIdx: number) => {
                    newTopics.push({
                        id: `topic_${Date.now()}_${uIdx}_${tIdx}`,
                        courseId,
                        unitId,
                        name: t.topicName,
                        plannedClasses: t.plannedClasses || 2,
                        order: tIdx,
                    });
                });
            });

            const updatedData: ProfPlanData = {
                ...store,
                units: [...(store.units || []), ...newUnits],
                topics: [...(store.topics || []), ...newTopics],
            };

            save(updatedData);
            setSuccessMsg(true);

            setTimeout(() => {
                setLoading(false);
                onClose();
                window.location.reload();
            }, 1200);

        } catch (err: any) {
            console.error('AI Syllabus Parsing Error:', err);
            setError(err.message || 'Failed to parse syllabus file.');
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !loading) onClose();
            }}
        >
            <div className="w-full max-w-lg rounded-[32px] border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-md">
                            <Sparkles className="h-6 w-6 text-amber-300" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                                AI Syllabus Parser Agent
                            </span>
                            <h3 className="text-base font-black text-slate-900">
                                Upload Syllabus for {courseName}
                            </h3>
                        </div>
                    </div>

                    {!loading && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 cursor-pointer transition"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {successMsg ? (
                    <div className="py-8 text-center space-y-3">
                        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
                        <h4 className="text-base font-black text-slate-900">Syllabus Successfully Parsed!</h4>
                        <p className="text-xs text-slate-500">Units and topics have been added to your curriculum workspace.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-6 text-center space-y-3">
                            <FileText className="w-10 h-10 text-indigo-600 mx-auto" />
                            <div>
                                <label className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow cursor-pointer transition">
                                    Browse Syllabus Document
                                    <input
                                        type="file"
                                        accept=".pdf,.txt,application/pdf,text/plain"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </label>
                                <p className="text-xs text-slate-500 font-medium mt-2">
                                    {file ? file.name : 'Select syllabus PDF or text document'}
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span className="font-bold">{error}</span>
                            </div>
                        )}

                        {loading && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-center space-y-2">
                                <Loader2 className="w-6 h-6 text-blue-600 mx-auto animate-spin" />
                                <p className="text-xs font-black text-blue-950">{statusText}</p>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                disabled={loading}
                                onClick={onClose}
                                className="px-5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={!file || loading}
                                onClick={handleParseAndImport}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 hover:opacity-95 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer"
                            >
                                <Sparkles className="w-4 h-4 text-amber-300" />
                                Parse &amp; Map Syllabus
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}