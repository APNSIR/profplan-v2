export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-slate-800 space-y-6">
      <h1 className="text-3xl font-black text-slate-950">Terms of Service</h1>
      <p className="text-xs text-slate-500 font-bold">Last Updated: September 2026</p>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-slate-900">1. Acceptance of Terms</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          By accessing and using ProfPlan (odishateachers.com), educators agree to use the service for managing educational schedules, lesson records, and academic progress tracking in accordance with institutional guidelines.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-slate-900">2. User Data and Backups</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          ProfPlan operates client-side. Users are responsible for regularly exporting offline JSON snapshots or utilizing the Google Drive sync feature to preserve their lesson progress records across devices.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-slate-900">3. Disclaimer</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          The software is provided "as is" by APNSIR Foundation to assist teaching personnel with statutory compliance and academic self-auditing.
        </p>
      </section>
    </div>
  );
}