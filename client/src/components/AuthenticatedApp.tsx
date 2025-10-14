import { useEffect } from "react";
import { Route, Switch } from "wouter";
import Dashboard from "@/pages/dashboard";
import LocationChecklist from "@/pages/location-checklist";
import Reports from "@/pages/reports";
import SmartAnalysis from "@/pages/smart-analysis";
import Locations from "@/pages/locations";

import UserManagement from "@/pages/user-management";

import ChecklistManager from "@/pages/checklist-manager";
import AdvancedChecklistManager from "@/pages/advanced-checklist-manager";
import AssessmentLocations from "@/pages/assessment-locations";
import SuperAdminDashboard from "@/pages/super-admin-dashboard";
import EnhancedGeneralManagerDashboard from "@/pages/enhanced-general-manager-dashboard";
import BackupManagerPage from "@/pages/backup-manager";
import KpiDashboard from "@/pages/KpiDashboard";
import InteractiveKpiDashboard from "@/pages/InteractiveKpiDashboard";
import CentralPurchases from "@/pages/central-purchases";
import SystemSettings from "@/pages/system-settings";
import SecurityDashboard from "@/pages/security-dashboard";
// تم حذف SyncManagement - ملف قديم غير مستخدم

import NotFound from "@/pages/not-found";

import UnifiedHeader from "@/components/layout/unified-header";
import ProtectedRoute from "@/components/ProtectedRoute";
// import { QuickUnificationButton } from "@/components/QuickUnificationButton"; // Disabled for clean UI

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  companyId?: number;
}

interface AuthenticatedAppProps {
  user: User;
}

export default function AuthenticatedApp({ user }: AuthenticatedAppProps) {
  console.log('🏠 AuthenticatedApp: Rendering for user:', user.username);
  
  // تفعيل النظام الموحد المبسط (يحل محل جميع أنظمة المزامنة القديمة)
  useEffect(() => {
    const initializeUnifiedSync = async () => {
      try {
        console.log('🚀 تفعيل النظام الموحد المبسط...');
        // لا حاجة لاستيراد منفصل - كل شيء في enhancedIndexedDB
        console.log('✅ تم تفعيل النظام الموحد المبسط');
      } catch (error) {
        console.error('❌ فشل تفعيل النظام الموحد:', error);
      }
    };
    
    // تفعيل فقط إذا كان المستخدم مسجل دخوله
    if (user && user.username) {
      initializeUnifiedSync();
    }
    
    // لا حاجة لتنظيف في النظام الموحد
  }, [user.username]);
  
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <UnifiedHeader />
        <main className="container mx-auto px-4 py-6">
          <Switch>
            <Route path="/">
              {(user.role === 'enhanced_general_manager' || user.role === 'hsa_group_admin') ? (
                <EnhancedGeneralManagerDashboard />
              ) : (user.role === 'analytics_viewer') ? (
                <Dashboard />
              ) : (
                <Dashboard />
              )}
            </Route>
            <Route path="/dashboard">
              {(user.role === 'enhanced_general_manager' || user.role === 'hsa_group_admin') ? (
                <EnhancedGeneralManagerDashboard />
              ) : (user.role === 'analytics_viewer') ? (
                <Dashboard />
              ) : (
                <Dashboard />
              )}
            </Route>

            <Route path="/location/:id" component={LocationChecklist} />
            <Route path="/reports">
              <ProtectedRoute adminOnly={true} supervisorAccess={false}>
                <Reports />
              </ProtectedRoute>
            </Route>
            <Route path="/smart-analysis">
              <ProtectedRoute adminOnly={true} supervisorAccess={false}>
                <SmartAnalysis />
              </ProtectedRoute>
            </Route>
            <Route path="/locations">
              <ProtectedRoute adminOnly={true} allowDataSpecialist={true}>
                <Locations />
              </ProtectedRoute>
            </Route>

            <Route path="/users">
              <ProtectedRoute adminOnly={true} supervisorAccess={true} requiredSection="users">
                <UserManagement />
              </ProtectedRoute>
            </Route>

            <Route path="/checklist-manager">
              <ProtectedRoute adminOnly={true} allowDataSpecialist={true}>
                <ChecklistManager />
              </ProtectedRoute>
            </Route>
            <Route path="/advanced-checklist-manager">
              <ProtectedRoute adminOnly={true} allowDataSpecialist={true}>
                <AdvancedChecklistManager />
              </ProtectedRoute>
            </Route>
            <Route path="/assessment-locations" component={AssessmentLocations} />
            <Route path="/super-admin-dashboard">
              <ProtectedRoute adminOnly={true}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            </Route>
            <Route path="/enhanced-general-manager-dashboard">
              <ProtectedRoute adminOnly={true}>
                <EnhancedGeneralManagerDashboard />
              </ProtectedRoute>
            </Route>
            <Route path="/backup-manager">
              <ProtectedRoute adminOnly={true}>
                <BackupManagerPage />
              </ProtectedRoute>
            </Route>
            <Route path="/kpi-dashboard">
              <ProtectedRoute adminOnly={true} excludeRoles={["admin_affairs_manager"]}>
                <KpiDashboard />
              </ProtectedRoute>
            </Route>
            <Route path="/interactive-kpi">
              <ProtectedRoute adminOnly={true}>
                <InteractiveKpiDashboard />
              </ProtectedRoute>
            </Route>
            <Route path="/central-purchases">
              <ProtectedRoute adminOnly={true} allowAffairsManager={true}>
                <CentralPurchases />
              </ProtectedRoute>
            </Route>
            <Route path="/system-settings" component={SystemSettings} />
            {/* debug storage removed - localStorage dependent */}
            <Route path="/security-dashboard">
              <ProtectedRoute adminOnly={true}>
                <SecurityDashboard />
              </ProtectedRoute>
            </Route>
            {/* تم حذف sync-management */}

            <Route component={NotFound} />
          </Switch>
        </main>
        
        {/* زر التوحيد السريع */}
        {/* <QuickUnificationButton /> Disabled for clean UI */}
      </div>
    </>
  );
}