export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-slate-800 space-y-6">
      <h1 className="text-3xl font-black text-slate-950">Privacy Policy for ProfPlan</h1>
      <p className="text-xs text-slate-500 font-bold">Last Updated: September 2026</p>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-slate-900">1. Overview</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          ProfPlan is an offline-first academic management platform created by the APNSIR Foundation for educators. All lesson plans, timetables, and teaching registers are saved directly onto your device (IndexedDB and local storage). We do not operate central database servers to monitor or collect your classroom records.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-slate-900">2. Google Drive Data Usage</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          When you select "Sync to Drive", ProfPlan requests permission strictly for the <code>https://www.googleapis.com/auth/drive.appdata</code> scope. 
        </p>
        <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
          <li><strong>Restricted Scope:</strong> ProfPlan only interacts with its own hidden application folder on your personal Google Drive. It cannot view, read, modify, or delete any personal documents, photos, or files in your Google Drive.</li>
          <li><strong>Purpose:</strong> Access is used solely to save and retrieve an encrypted user backup file (<code>profplan_cloud_sync.json</code>).</li>
          <li><strong>No Third-Party Transfer:</strong> Your tokens and academic data are never transmitted to external analytics tools or third-party servers.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-slate-900">3. Contact</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          If you have questions regarding this policy, reach out to the project administrator at <strong>pcbiqac@gmail.com</strong>.
        </p>
      </section>
    </div>
  );
}