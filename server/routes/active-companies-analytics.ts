import type { Express } from "express";
import { storage } from "../storage";

// Import the main authentication function from the routes file
// We need to declare this as a variable that will be set by the main routes
let mainAuthenticateToken: any = null;

export function setAuthenticationFunction(authFunc: any) {
  mainAuthenticateToken = authFunc;
}

export function registerActiveCompaniesAnalyticsRoutes(app: Express) {
  
  // الحصول على الشركات الفعالة فقط (استثناء الشركة المرجعية وشركة الشؤون الإدارية)
  app.get('/api/enhanced-gm/active-companies', mainAuthenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // التحقق من صلاحيات مدير بيئة العمل أو مشاهد التحليلات
      if (currentUser.role !== 'hsa_group_admin' && 
          currentUser.role !== 'enhanced_general_manager' && 
          currentUser.role !== 'analytics_viewer') {
        console.log('❌ Access denied - insufficient permissions:', { 
          userId: currentUser.id, 
          role: currentUser.role 
        });
        return res.status(403).json({ message: 'صلاحيات مدير بيئة العمل أو مشاهد التحليلات مطلوبة' });
      }
      
      const companies = await storage.getAllCompanies();
      
      // استثناء الشركة المرجعية (ID: 2) وشركة الشؤون الإدارية لمدير بيئة العمل (ID: 1)
      // مدير بيئة العمل يمكنه رؤية جميع الشركات الفعالة
      const activeCompanies = companies.filter((company: any) => {
        // استثناء الشركات غير الفعالة فقط
        const isReferenceCompany = company.nameAr === 'الشركة المرجعية' || company.id === 2;
        const isAdminCompany = company.nameAr === 'الشؤون الإدارية الإدارة العامة' || 
                             company.nameAr === 'الشؤون الإدارية' ||
                             (company.id === 1 && currentUser.companyId === 1);
        
        return !isReferenceCompany && !isAdminCompany;
      });
      
      console.log('🏢 Active Companies API - User:', currentUser.username);
      console.log('🏢 Total companies:', companies.length);
      console.log('🏢 Active companies returned:', activeCompanies.length);
      console.log('🏢 Active companies list:', activeCompanies.map(c => ({ id: c.id, name: c.nameAr })));
      
      res.json(activeCompanies);
      
    } catch (error) {
      console.error('Error fetching active companies:', error);
      res.status(500).json({ message: 'فشل في جلب الشركات الفعالة' });
    }
  });

  // الحصول على تحليلات الشركات الفعالة فقط
  app.get('/api/enhanced-gm/active-companies-analytics/:selectedCompany/:timeRange', 
    mainAuthenticateToken, async (req: any, res) => {
    try {
      const { selectedCompany, timeRange } = req.params;
      const currentUser = req.user;
      
      // التحقق من صلاحيات مدير بيئة العمل أو مشاهد التحليلات
      if (currentUser.role !== 'hsa_group_admin' && 
          currentUser.role !== 'enhanced_general_manager' && 
          currentUser.role !== 'analytics_viewer') {
        console.log('❌ Access denied - insufficient permissions:', { 
          userId: currentUser.id, 
          role: currentUser.role 
        });
        return res.status(403).json({ message: 'صلاحيات مدير بيئة العمل أو مشاهد التحليلات مطلوبة' });
      }
      
      const companies = await storage.getAllCompanies();
      
      // فلترة الشركات الفعالة فقط - نفس المنطق المستخدم في مسار الشركات الفعالة
      const activeCompanies = companies.filter((company: any) => {
        const isReferenceCompany = company.nameAr === 'الشركة المرجعية' || company.id === 2;
        const isAdminCompany = company.nameAr === 'الشؤون الإدارية الإدارة العامة' || 
                             company.nameAr === 'الشؤون الإدارية' ||
                             (company.id === 1 && currentUser.companyId === 1);
        
        return !isReferenceCompany && !isAdminCompany;
      });

      console.log('📊 Analytics API - User:', currentUser.username);
      console.log('📊 Analytics API - Active companies for analysis:', activeCompanies.length);

      const analytics = await Promise.all(
        activeCompanies.map(async (company: any) => {
          const locations = await storage.getAllLocations(company.id);
          const users = await storage.getAllUsers(company.id);
          
          // حساب المدة الزمنية للتحليل
          const now = new Date();
          const startDate = new Date();
          
          switch (timeRange) {
            case 'week':
              startDate.setDate(now.getDate() - 7);
              break;
            case 'month':
              startDate.setMonth(now.getMonth() - 1);
              break;
            case 'quarter':
              startDate.setMonth(now.getMonth() - 3);
              break;
            case 'year':
              startDate.setFullYear(now.getFullYear() - 1);
              break;
            default:
              startDate.setMonth(now.getMonth() - 1);
          }

          let totalEvaluations = 0;
          let totalScore = 0;
          let lastEvaluationDate = new Date(0);

          // جمع بيانات التقييمات من جميع المواقع
          for (const location of locations) {
            const evaluations = await storage.getDailyChecklistsByLocation(
              location.id, 
              startDate, 
              now
            );
            
            totalEvaluations += evaluations.length;
            
            evaluations.forEach((evaluation: any) => {
              if (evaluation.tasks && Array.isArray(evaluation.tasks)) {
                let locationScore = 0;
                let totalTasks = 0;
                
                evaluation.tasks.forEach((task: any) => {
                  if (task.completed && task.rating) {
                    locationScore += task.rating;
                    totalTasks++;
                  }
                });
                
                if (totalTasks > 0) {
                  totalScore += (locationScore / totalTasks) * 100;
                }
              }
              
              const evalDate = evaluation.createdAt ? new Date(evaluation.createdAt) : new Date(0);
              if (evalDate > lastEvaluationDate) {
                lastEvaluationDate = evalDate;
              }
            });
          }

          const averageScore = totalEvaluations > 0 ? 
            Math.round((totalScore / totalEvaluations) * 100) / 100 : 0;

          // حساب معدل الإنجاز (افتراضي بناءً على المواقع والفترة الزمنية)
          const expectedEvaluations = locations.length * (timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : timeRange === 'quarter' ? 90 : 365);
          const completionRate = expectedEvaluations > 0 ? 
            Math.min(100, Math.round((totalEvaluations / expectedEvaluations) * 100 * 100) / 100) : 0;

          // تحديد الاتجاه
          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (averageScore >= 85) trend = 'up';
          else if (averageScore < 70) trend = 'down';

          // حساب المشاكل الحرجة
          let criticalIssues = 0;
          if (locations.length === 0) criticalIssues++;
          if (totalEvaluations === 0) criticalIssues++;
          if (averageScore < 60) criticalIssues++;

          // بيانات الاتجاه الأسبوعي (افتراضية للعرض)
          const weeklyTrend = [];
          for (let i = 6; i >= 0; i--) {
            const weekDate = new Date();
            weekDate.setDate(weekDate.getDate() - (i * 7));
            weeklyTrend.push({
              week: `الأسبوع ${7 - i}`,
              score: Math.max(60, Math.min(100, averageScore + (Math.random() - 0.5) * 10)),
              evaluations: Math.floor(totalEvaluations / 7) + Math.floor(Math.random() * 5)
            });
          }

          // فئات المواقع
          const locationCategories = [
            { category: 'مكاتب إدارية', count: Math.floor(locations.length * 0.4), avgScore: averageScore + 5 },
            { category: 'مواقع إنتاجية', count: Math.floor(locations.length * 0.3), avgScore: averageScore },
            { category: 'مستودعات', count: Math.floor(locations.length * 0.2), avgScore: averageScore - 3 },
            { category: 'مراكز توزيع', count: Math.floor(locations.length * 0.1), avgScore: averageScore + 2 }
          ].filter(cat => cat.count > 0);

          return {
            companyId: company.id,
            companyName: company.nameAr,
            totalLocations: locations.length,
            completedEvaluations: totalEvaluations,
            averageScore,
            completionRate,
            activeUsers: users.length,
            lastEvaluationDate: lastEvaluationDate.getTime() > 0 ? 
              lastEvaluationDate.toISOString().split('T')[0] : 'لا توجد تقييمات',
            trend,
            criticalIssues,
            weeklyTrend,
            locationCategories
          };
        })
      );

      // فلترة حسب الشركة المختارة
      const filteredAnalytics = selectedCompany === 'all' ? 
        analytics : analytics.filter((a: any) => a.companyId.toString() === selectedCompany);

      console.log('📊 Active Companies Analytics:', filteredAnalytics.length, 'companies analyzed');
      res.json(filteredAnalytics);
      
    } catch (error) {
      console.error('Error fetching active companies analytics:', error);
      res.status(500).json({ message: 'Failed to fetch active companies analytics' });
    }
  });
}