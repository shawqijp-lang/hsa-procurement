// This file is replaced by InteractiveKpiDashboard.tsx - redirecting users
import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function KpiDashboard() {
  const [, navigate] = useLocation();
  
  useEffect(() => {
    // Redirect to the new interactive dashboard
    navigate('/interactive-kpi');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">جاري إعادة توجيهك للوحة القيادة التفاعلية...</p>
      </div>
    </div>
  );
}