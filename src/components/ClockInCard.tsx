'use client';
import { createClient } from '@/utils/supabase/client';
import { useState } from 'react';

export default function ClockInCard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleClockIn = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase
        .from('attendance')
        .insert([{ 
          student_id: user.id, 
          check_in: new Date().toISOString(), 
          status: 'pending' 
        }]);

      if (error) alert("Error: " + error.message);
      else alert("Clock-in successful! Data saved to Supabase.");
    }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">Daily Attendance</h2>
      <button 
        onClick={handleClockIn}
        disabled={loading}
        className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg active:scale-95"
      >
        {loading ? "Syncing..." : "🕒 Clock In Now"}
      </button>
      <p className="text-xs text-gray-500 mt-3 text-center">Your location and time will be recorded.</p>
    </div>
  );
}