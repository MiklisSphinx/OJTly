'use client';
import ClockInCard from '@/components/ClockInCard';

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-gray-600">Track your OJT hours and manage your progress.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Attendance Section */}
          <ClockInCard />

          {/* Quick Stats Placeholder */}
          <div className="p-6 bg-purple-700 rounded-2xl text-white shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Total Hours</h2>
            <div className="text-4xl font-bold">124 / 600</div>
            <p className="mt-2 text-purple-200">You're 20% through your OJT!</p>
          </div>
        </div>
      </div>
    </main>
  );
}