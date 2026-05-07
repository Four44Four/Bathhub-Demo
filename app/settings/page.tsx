import Link from "next/link";

export default function SettingsPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-2 text-sm opacity-80">Stub page.</p>

      <div className="mt-6">
        <Link className="underline underline-offset-4" href="/settings/visual">
          Visual Settings
        </Link>
      </div>
    </main>
  );
}

