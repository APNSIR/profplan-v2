'use client';

import React, { useState } from 'react';
import {
    Sparkles,
    X,
    Upload,
    Check,
    Loader2,
    Plus,
    Copy,
    ExternalLink,
    AlertCircle,
    ArrowRight,
    Wand2,
    CheckCircle2
} from 'lucide-react';
import { load, save, ProfPlanData } from '@/lib/store';
import { supabase } from '@/lib/supabaseClient';

interface AILessonPlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: ProfPlanData;
}

type GeneratedTopic = {
    name: string;
    plannedClasses: number;
};

type GeneratedUnit = {
    unitNumber: number;
    name: string;
    topics: GeneratedTopic[];
};

export default function AILessonPlanModal({
    isOpen,
    onClose,
    data,
}: AILessonPlanModalProps) {
    const [step, setStep] = useState<'form' | 'fallback' | 'preview'>('form');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [rawText, setRawText] = useState('');
    const [fileName, setFileName] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCleaningText, setIsCleaningText] = useState(false);
    const [syllabusScope, setSyllabusScope] = useState<'semester' | 'year'>('semester');
    const [externalAiOutput, setExternalAiOutput] = useState('');
    const [copiedPrompt, setCopiedPrompt] = useState(false);

    // Inline creation states
    const [showAddClass, setShowAddClass] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [newClassStream, setNewClassStream] = useState('Arts Stream');

    const [showAddSubject, setShowAddSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [newSubjectCode, setNewSubjectCode] = useState('');

    // Generated preview state
    const [generatedUnits, setGeneratedUnits] = useState<GeneratedUnit[]>([]);

    if (!isOpen) return null;

    const currentClasses = data.classes || [];
    const currentCourses = data.courses || [];

    const availableCourses = currentCourses.filter(
        (c: any) =>
            !selectedClassId ||
            c.classId === selectedClassId ||
            c.semester ===
                currentClasses.find((cls: any) => cls.id === selectedClassId)?.name
    );

    const handleInlineAddClass = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClassName.trim()) return;

        const store = load();
        const newClassId = `cls_${Date.now()}`;
        const newClassObj = {
            id: newClassId,
            name: newClassName.trim(),
            stream: newClassStream.trim(),
        };

        const updatedData = {
            ...store,
            classes: [...(store.classes || []), newClassObj],
        };

        save(updatedData);
        setSelectedClassId(newClassId);
        setNewClassName('');
        setShowAddClass(false);
    };

    const handleInlineAddSubject = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubjectName.trim() || !selectedClassId) return;

        const store = load();
        const targetClass = currentClasses.find(
            (c: any) => c.id === selectedClassId
        );
        const newCourseId = `crs_${Date.now()}`;
        const newCourseObj = {
            id: newCourseId,
            name: newSubjectName.trim(),
            code: newSubjectCode.trim().toUpperCase() || 'SUB-1',
            semester: targetClass?.name || 'General',
            department: targetClass?.stream || 'General',
            hours: syllabusScope === 'semester' ? 45 : 90,
            targetHours: syllabusScope === 'semester' ? 45 : 90,
            classId: selectedClassId,
        };

        const updatedData = {
            ...store,
            courses: [...(store.courses || []), newCourseObj],
        };

        save(updatedData);
        setSelectedCourseId(newCourseId);
        setNewSubjectName('');
        setNewSubjectCode('');
        setShowAddSubject(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);

        if (file.type === 'application/pdf') {
            setRawText(
                `[Attached PDF: ${file.name}]\nPlease paste the extracted syllabus course objectives and modules text directly below for precise AI generation.`
            );
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setRawText(
                (event.target?.result as string) ||
                    `Extracted syllabus content from ${file.name}`
            );
        };
        reader.readAsText(file);
    };

    const handleCleanAndParseText = () => {
        if (!rawText.trim()) return;
        setIsCleaningText(true);
        setTimeout(() => {
            const cleaned = rawText
                .replace(/\r\n/g, '\n')
                .replace(/[ \t]+/g, ' ')
                .replace(/\n\s*\n/g, '\n\n')
                .trim();
            setRawText(cleaned);
            setIsCleaningText(false);
        }, 400);
    };

    const generatedPromptText = `Act as an expert curriculum designer. Please divide the following syllabus text into structured academic units with topics. Since this is a ${syllabusScope === 'semester' ? 'semester-long course (strictly 40 to 45 deliverable periods total)' : 'full-year course (strictly 80 to 90 deliverable periods total)'}, distribute the classes logically across all units and topics so that total planned classes sum up correctly.

Return ONLY a valid JSON object in this exact structure without markdown ticks if possible, or standard JSON:
{
  "success": true,
  "units": [
    {
      "unitNumber": 1,
      "name": "Unit Title",
      "topics": [
        { "name": "Topic Name", "plannedClasses": 5 }
      ]
    }
  ]
}

Syllabus Text:
${rawText.trim()}`;

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(generatedPromptText);
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 3000);
    };

    const handleParseExternalAiText = () => {
        try {
            let cleaned = externalAiOutput.trim();
            if (cleaned.startsWith('```json')) {
                cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
            } else if (cleaned.startsWith('```')) {
                cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
            }

            const parsed = JSON.parse(cleaned);
            if (parsed && Array.isArray(parsed.units) && parsed.units.length > 0) {
                setGeneratedUnits(parsed.units);
                setStep('preview');
            } else {
                alert('Could not detect valid units structure in the pasted text. Please make sure it follows the requested JSON or structured unit format.');
            }
        } catch (err) {
            console.error('Parsing error:', err);
            alert('Invalid format. Please paste the valid JSON or structured output generated by ChatGPT/Gemini.');
        }
    };

    const handleGenerateAI = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedClassId) {
            alert('Please select a class or semester.');
            return;
        }

        if (!selectedCourseId) {
            alert('Please select a target subject paper.');
            return;
        }

        if (!rawText.trim()) {
            alert('Please upload or paste the syllabus before generating the AI plan.');
            return;
        }

        const course = currentCourses.find((c: any) => c.id === selectedCourseId);
        const selectedClass = currentClasses.find((c: any) => c.id === selectedClassId);

        if (!course) {
            alert('The selected subject paper could not be found.');
            return;
        }

        setIsGenerating(true);

        try {
            const { data: result, error } = await supabase.functions.invoke('profplan-ai', {
                body: {
                    className: selectedClass?.name || '',
                    subjectName: course.name || '',
                    subjectCode: course.code || '',
                    syllabusText: rawText.trim(),
                    scope: syllabusScope,
                },
            });

            if (error) {
                setStep('fallback');
                return;
            }

            if (
                !result ||
                result.success !== true ||
                !Array.isArray(result.units) ||
                result.units.length === 0
            ) {
                setStep('fallback');
                return;
            }

            setGeneratedUnits(result.units);
            setStep('preview');
        } catch (error) {
            setStep('fallback');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDeployToSyllabus = () => {
        const store = load();
        if (!store) return;

        const newUnits: any[] = [...(store.units || [])];
        const newTopics: any[] = [...(store.topics || [])];

        generatedUnits.forEach((u, uIdx) => {
            const unitId = `unit_ai_${Date.now()}_${uIdx}`;

            newUnits.push({
                id: unitId,
                courseId: selectedCourseId,
                name: u.name,
                title: u.name,
                unitNumber: u.unitNumber,
                order: uIdx,
            });

            u.topics.forEach((t, tIdx) => {
                newTopics.push({
                    id: `topic_ai_${Date.now()}_${uIdx}_${tIdx}`,
                    courseId: selectedCourseId,
                    unitId: unitId,
                    name: t.name,
                    title: t.name,
                    plannedClasses: t.plannedClasses,
                    order: tIdx,
                });
            });
        });

        const updatedData = {
            ...store,
            units: newUnits,
            topics: newTopics,
        };

        save(updatedData);
        alert('✓ AI Syllabus successfully deployed and integrated into your Syllabus Page!');
        onClose();
        window.location.href = '/syllabus';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-[32px] border border-white/40 bg-white shadow-2xl flex flex-col">

                {/* MODAL HEADER */}
                <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-6 py-5 text-white">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.35),transparent_50%)]" />

                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/25 text-amber-300 ring-1 ring-amber-400/40 shadow-inner">
                                <Sparkles className="w-5 h-5 animate-spin" />
                            </div>

                            <div>
                                <h3 className="text-base font-black text-white tracking-tight">
                                    AI Syllabus &amp; Lesson Planner
                                </h3>
                                <p className="text-[10px] font-extrabold text-amber-300 uppercase tracking-widest mt-0.5">
                                    APNSIR Foundation • Smart Curriculum Assistant
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* MODAL BODY */}
                <div className="overflow-y-auto p-6 sm:p-7 space-y-6">

                    {step === 'form' ? (
                        <form onSubmit={handleGenerateAI} className="space-y-5">

                            {/* SCOPE SELECTOR */}
                            <div className="space-y-2">
                                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600">
                                    Course Duration Scope *
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSyllabusScope('semester')}
                                        className={`py-3 px-4 rounded-2xl text-xs font-black border-2 transition cursor-pointer ${
                                            syllabusScope === 'semester'
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-950 shadow-sm'
                                                : 'border-slate-200 bg-slate-50 text-slate-600'
                                        }`}
                                    >
                                        Semester Course (40 - 45 Periods)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSyllabusScope('year')}
                                        className={`py-3 px-4 rounded-2xl text-xs font-black border-2 transition cursor-pointer ${
                                            syllabusScope === 'year'
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-950 shadow-sm'
                                                : 'border-slate-200 bg-slate-50 text-slate-600'
                                        }`}
                                    >
                                        Full Year Course (80 - 90 Periods)
                                    </button>
                                </div>
                            </div>

                            {/* CLASS / SEMESTER */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600">
                                        Select Class / Semester *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddClass(!showAddClass)}
                                        className="text-xs font-black text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200 transition cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        {showAddClass ? 'Cancel' : '+ Add New Class'}
                                    </button>
                                </div>

                                {showAddClass && (
                                    <div className="p-4 rounded-2xl bg-indigo-50/80 border-2 border-indigo-200 space-y-3 animate-in fade-in">
                                        <p className="text-xs font-black text-indigo-950">
                                            Register New Class / Semester Workspace
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <input
                                                type="text"
                                                placeholder="e.g. BA 3rd Semester"
                                                value={newClassName}
                                                onChange={(e) => setNewClassName(e.target.value)}
                                                className="rounded-xl border border-indigo-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                                            />
                                            <select
                                                value={newClassStream}
                                                onChange={(e) => setNewClassStream(e.target.value)}
                                                className="rounded-xl border border-indigo-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none cursor-pointer"
                                            >
                                                <option value="Arts Stream">Arts Stream</option>
                                                <option value="Science Stream">Science Stream</option>
                                                <option value="Commerce Stream">Commerce Stream</option>
                                                <option value="General / Academic">General / Academic</option>
                                            </select>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleInlineAddClass}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow cursor-pointer"
                                        >
                                            Save &amp; Select Class
                                        </button>
                                    </div>
                                )}

                                <select
                                    value={selectedClassId}
                                    onChange={(e) => setSelectedClassId(e.target.value)}
                                    required
                                    className="w-full rounded-2xl border-2 border-indigo-200/90 bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/50 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition cursor-pointer shadow-xs"
                                >
                                    <option value="" className="text-slate-400 bg-white font-normal">
                                        -- Choose Class Workspace --
                                    </option>
                                    {currentClasses.map((cls: any) => (
                                        <option key={cls.id} value={cls.id} className="text-slate-900 font-bold bg-white py-2">
                                            🎓 {cls.name} {cls.stream ? `(${cls.stream})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* SUBJECT / PAPER */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600">
                                        Select Subject / Paper *
                                    </label>
                                    {selectedClassId && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAddSubject(!showAddSubject)}
                                            className="text-xs font-black text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 transition cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            {showAddSubject ? 'Cancel' : '+ Add New Subject'}
                                        </button>
                                    )}
                                </div>

                                {showAddSubject && (
                                    <div className="p-4 rounded-2xl bg-emerald-50/80 border-2 border-emerald-200 space-y-3 animate-in fade-in">
                                        <p className="text-xs font-black text-emerald-950">
                                            Add New Subject Paper for Selected Class
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <input
                                                type="text"
                                                placeholder="e.g. British Literature"
                                                value={newSubjectName}
                                                onChange={(e) => setNewSubjectName(e.target.value)}
                                                className="rounded-xl border border-emerald-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600"
                                            />
                                            <input
                                                type="text"
                                                placeholder="e.g. ENG-CORE-5"
                                                value={newSubjectCode}
                                                onChange={(e) => setNewSubjectCode(e.target.value)}
                                                className="rounded-xl border border-emerald-300 bg-white px-3.5 py-2.5 text-xs font-bold uppercase text-slate-900 outline-none"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleInlineAddSubject}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow cursor-pointer"
                                        >
                                            Save &amp; Select Subject
                                        </button>
                                    </div>
                                )}

                                <select
                                    value={selectedCourseId}
                                    onChange={(e) => setSelectedCourseId(e.target.value)}
                                    required
                                    className="w-full rounded-2xl border-2 border-indigo-200/90 bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/50 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition cursor-pointer shadow-xs"
                                >
                                    <option value="" className="text-slate-400 bg-white font-normal">
                                        -- Choose Subject Paper --
                                    </option>
                                    {availableCourses.map((c: any) => (
                                        <option key={c.id} value={c.id} className="text-slate-900 font-bold bg-white py-2">
                                            📚 {c.name} ({c.code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* SYLLABUS UPLOAD / PASTE WITH AI PARSER CLEANSE */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600">
                                        Upload Syllabus PDF or Paste Syllabus Text
                                    </label>
                                    {rawText.trim() && (
                                        <button
                                            type="button"
                                            onClick={handleCleanAndParseText}
                                            disabled={isCleaningText}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[11px] font-black rounded-xl transition cursor-pointer shadow-2xs"
                                        >
                                            {isCleaningText ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 text-indigo-600" />}
                                            {isCleaningText ? 'Cleansing...' : '✨ AI Cleanse & Parse Text'}
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/30 p-6 text-center cursor-pointer hover:bg-indigo-50/80 transition group">
                                        <Upload className="w-7 h-7 text-indigo-600 mb-2 group-hover:scale-110 transition" />
                                        <span className="text-xs font-black text-indigo-950">
                                            {fileName ? `Attached: ${fileName}` : 'Click to upload syllabus PDF document'}
                                        </span>
                                        <span className="text-[10px] text-slate-500 mt-0.5">
                                            Supports PDF or syllabus text outlines
                                        </span>
                                        <input
                                            type="file"
                                            accept=".pdf,.txt"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={rawText}
                                        onChange={(e) => setRawText(e.target.value)}
                                        placeholder="Or paste syllabus course objectives and modules text directly here..."
                                        className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 text-xs font-medium text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition shadow-xs resize-none"
                                    />
                                </div>
                            </div>

                            {/* ACTION BUTTONS */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-2xl cursor-pointer transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isGenerating}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-amber-600 px-7 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-orange-500/20 transition hover:opacity-95 cursor-pointer disabled:opacity-50"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Connecting to AI...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            Generate AI Syllabus Plan
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : step === 'fallback' ? (

                        /* 3-STEP SOPHISTICATED FALLBACK WIZARD */
                        <div className="space-y-6 animate-in fade-in">
                            <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-start gap-3 shadow-2xs">
                                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-xs font-black text-amber-950 uppercase tracking-tight">
                                        Direct AI Connection Unreachable
                                    </h4>
                                    <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                                        Follow the 3 simple steps below using your preferred AI assistant (ChatGPT or Gemini) to generate and import your syllabus plan instantly.
                                    </p>
                                </div>
                            </div>

                            {/* STEP 1 GRADIENT PANEL */}
                            <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-50/90 via-blue-50/50 to-indigo-50/90 border-2 border-indigo-200/80 space-y-3.5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-xs shadow-md">
                                            1
                                        </div>
                                        <h5 className="text-xs font-black uppercase tracking-wider text-indigo-950">
                                            Copy the Smart Curriculum Prompt
                                        </h5>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCopyPrompt}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md transition cursor-pointer"
                                    >
                                        {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copiedPrompt ? 'Prompt Copied!' : 'Copy Prompt'}
                                    </button>
                                </div>
                                <textarea
                                    readOnly
                                    rows={3}
                                    value={generatedPromptText}
                                    className="w-full rounded-2xl border border-indigo-200 bg-white p-3.5 text-xs font-mono text-slate-800 outline-none resize-none select-all shadow-inner"
                                />
                            </div>

                            {/* STEP 2 GRADIENT PANEL */}
                            <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-50/90 border-2 border-amber-200/80 space-y-3.5 shadow-sm">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-600 text-white font-black text-xs shadow-md">
                                        2
                                    </div>
                                    <h5 className="text-xs font-black uppercase tracking-wider text-amber-950">
                                        Open Your Preferred AI Assistant
                                    </h5>
                                </div>
                                <p className="text-xs text-amber-900 font-medium">
                                    Click one of the buttons below to open ChatGPT or Gemini, then paste the copied prompt there:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <a
                                        href="https://chatgpt.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-md transition group"
                                    >
                                        <span>Open ChatGPT</span>
                                        <ExternalLink className="w-4 h-4 transition-transform group-hover:scale-110" />
                                    </a>
                                    <a
                                        href="https://gemini.google.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md transition group"
                                    >
                                        <span>Open Gemini</span>
                                        <ExternalLink className="w-4 h-4 transition-transform group-hover:scale-110" />
                                    </a>
                                </div>
                            </div>

                            {/* STEP 3 GRADIENT PANEL */}
                            <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-emerald-50/90 border-2 border-emerald-200/80 space-y-3.5 shadow-sm">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-xs shadow-md">
                                        3
                                    </div>
                                    <h5 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                                        Paste JSON Output &amp; Embed Units
                                    </h5>
                                </div>
                                <p className="text-xs text-emerald-900 font-medium">
                                    Paste the JSON code response generated by ChatGPT or Gemini into the box below:
                                </p>
                                <textarea
                                    rows={4}
                                    value={externalAiOutput}
                                    onChange={(e) => setExternalAiOutput(e.target.value)}
                                    placeholder="Paste the JSON response here..."
                                    className="w-full rounded-2xl border border-emerald-200 bg-white p-4 text-xs font-mono text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 transition shadow-inner resize-none"
                                />
                            </div>

                            {/* FALLBACK FOOTER ACTIONS */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setStep('form')}
                                    className="px-5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-2xl cursor-pointer transition border border-slate-200"
                                >
                                    Back to Form
                                </button>
                                <button
                                    type="button"
                                    onClick={handleParseExternalAiText}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-7 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-600/20 transition hover:opacity-95 cursor-pointer"
                                >
                                    Parse &amp; Embed Units <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ) : (

                        /* PREVIEW */
                        <div className="space-y-4 animate-in fade-in">
                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between shadow-2xs">
                                <div>
                                    <h4 className="text-xs font-black text-emerald-950">
                                        AI Syllabus Generated Successfully!
                                    </h4>
                                    <p className="text-[11px] text-emerald-800 mt-0.5">
                                        Review the structured units below. Deploy them instantly to integrate into your Syllabus Page.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setStep('form')}
                                    className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                                >
                                    Regenerate
                                </button>
                            </div>

                            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                                {generatedUnits.map((unit) => (
                                    <div
                                        key={unit.unitNumber}
                                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 shadow-2xs"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="px-2.5 py-1 rounded-lg bg-indigo-950 text-white font-black text-[10px]">
                                                Unit {unit.unitNumber}
                                            </span>
                                            <span className="text-xs font-bold text-slate-700">
                                                {unit.name}
                                            </span>
                                        </div>
                                        <div className="space-y-1.5 pt-1">
                                            {unit.topics.map((topic, idx) => (
                                                <div
                                                    key={`${unit.unitNumber}-${idx}`}
                                                    className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-slate-100 text-xs shadow-2xs"
                                                >
                                                    <span className="font-semibold text-slate-900">
                                                        {topic.name}
                                                    </span>
                                                    <span className="font-extrabold text-indigo-600 text-[11px]">
                                                        {topic.plannedClasses} periods
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* PREVIEW ACTIONS */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setStep('form')}
                                    className="px-5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-2xl cursor-pointer transition border border-slate-200"
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeployToSyllabus}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-indigo-600/20 transition hover:opacity-95 cursor-pointer"
                                >
                                    <Check className="w-4 h-4" />
                                    Deploy to Syllabus Page
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}