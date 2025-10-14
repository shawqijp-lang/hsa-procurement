import type { Express } from "express";
import { storage } from "../storage";

interface Location {
  id: number;
  nameAr: string;
  companyId: number;
}

interface Assessment {
  id: number;
  locationId: number;
  overallScore: number;
  createdAt: string;
}

interface Company {
  id: number;
  nameAr: string;
  nameEn?: string;
}

export function registerEnhancedGMExecutiveRoutes(app: Express) {
  
  // Get active companies for filtering
  app.get('/api/companies/active', async (req, res) => {
    try {
      const allCompanies = await storage.getAllCompanies();
      
      // فلترة الشركات الفعالة فقط - استثناء الشركة المرجعية والشؤون الإدارية
      const activeCompanies = allCompanies.filter(company => {
        const isReferenceCompany = company.nameAr === 'الشركة المرجعية' || 
                                  company.nameAr === 'قالب الشركات الجديدة' ||
                                  company.id === 2;
        const isAdminCompany = company.nameAr === 'الشؤون الإدارية الإدارة العامة' || 
                              company.nameAr === 'الشؤون الإدارية' || 
                              company.id === 1;
        
        return !isReferenceCompany && !isAdminCompany && company.isActive;
      }).map(company => ({
        id: company.id,
        nameAr: company.nameAr,
        nameEn: company.nameEn,
        isActive: company.isActive
      }));

      res.json(activeCompanies);
    } catch (error) {
      console.error('❌ Error fetching active companies:', error);
      res.status(500).json({ error: 'Failed to fetch active companies' });
    }
  });

  // Get executive KPIs for group overview with company filtering
  app.get('/api/enhanced-gm/executive/kpis/:company?/:timeRange?', async (req, res) => {
    try {
      const { company: selectedCompany = 'all', timeRange = '6months' } = req.params;
      
      // Get all companies
      const allCompanies = await storage.getAllCompanies();
      
      // فلترة الشركات الفعالة فقط - استثناء الشركة المرجعية والشؤون الإدارية
      let companies = allCompanies.filter(company => {
        const isReferenceCompany = company.nameAr === 'الشركة المرجعية' || 
                                  company.nameAr === 'قالب الشركات الجديدة' ||
                                  company.id === 2;
        const isAdminCompany = company.nameAr === 'الشؤون الإدارية الإدارة العامة' || 
                              company.nameAr === 'الشؤون الإدارية' || 
                              company.id === 1;
        
        return !isReferenceCompany && !isAdminCompany && company.isActive;
      });
      
      // Apply company filter if specific company is selected
      if (selectedCompany !== 'all') {
        const companyId = parseInt(selectedCompany);
        companies = companies.filter(company => company.id === companyId);
      }
      
      // Calculate KPIs for selected companies
      const totalCompanies = companies.length;
      
      // Get total locations across all companies  
      let totalLocations = 0;
      for (const company of companies) {
        const locations = await storage.getAllLocations(company.id);
        totalLocations += locations.length;
      }
      
      // Get all assessments across companies with real-time data
      let totalAssessments = 0;
      let totalScore = 0;
      let completedAssessments = 0;
      let assessmentsWithComments = 0;
      let recentAssessments = 0; // التقييمات من آخر 7 أيام
      
      const recentCutoff = new Date();
      recentCutoff.setDate(recentCutoff.getDate() - 7);
      
      for (const company of companies) {
        const locations = await storage.getAllLocations(company.id);
        for (const location of locations) {
          // استخدام التواريخ الصحيحة للحصول على البيانات المحدثة
          const startDate = new Date();
          const months = timeRange === '3months' ? 3 : timeRange === '12months' ? 12 : 6;
          startDate.setMonth(startDate.getMonth() - months);
          const endDate = new Date();
          
          const assessments = await storage.getDailyChecklistsByLocation(location.id, startDate, endDate, company.id);
          totalAssessments += assessments.length;
          completedAssessments += assessments.length;
          
          // حساب النقاط الفعلية من المهام المكتملة والتعليقات
          assessments.forEach((assessment: any) => {
            // فحص التقييمات الحديثة
            const assessmentDate = new Date(assessment.createdAt);
            if (assessmentDate >= recentCutoff) {
              recentAssessments++;
            }
            
            // فحص وجود تعليقات تقييم
            if (assessment.evaluationNotes && assessment.evaluationNotes.trim().length > 0) {
              assessmentsWithComments++;
            }
            
            if (assessment.tasks && Array.isArray(assessment.tasks)) {
              let locationScore = 0;
              let totalTasks = 0;
              let tasksWithComments = 0;
              
              assessment.tasks.forEach((task: any) => {
                if (task.completed && task.rating) {
                  locationScore += task.rating;
                  totalTasks++;
                  
                  // فحص وجود تعليقات على المهام
                  if (task.itemComment && task.itemComment.trim().length > 0) {
                    tasksWithComments++;
                  }
                }
              });
              
              if (totalTasks > 0) {
                // حساب النقاط مع مراعاة جودة التعليقات
                const baseScore = (locationScore / totalTasks) * 100;
                // إضافة مكافأة للتقييمات التي تحتوي على تعليقات مفصلة
                const commentBonus = tasksWithComments > 0 ? 2 : 0;
                totalScore += Math.min(100, baseScore + commentBonus);
              }
            }
          });
        }
      }
      
      const avgGroupScore = completedAssessments > 0 ? 
        Math.round((totalScore / completedAssessments) * 100) / 100 : 0;
      
      const completionRate = totalLocations > 0 ? 
        Math.round((completedAssessments / (totalLocations * 4)) * 100 * 100) / 100 : 0; // Assuming 4 assessments per location per period
      
      // حساب التنبيهات الحرجة بناءً على البيانات الفعلية
      let criticalAlerts = 0;
      for (const company of companies) {
        const locations = await storage.getAllLocations(company.id);
        if (locations.length === 0) {
          criticalAlerts++; // شركة بدون مواقع
        }
      }
      
      // Find top performer and improvement needed
      const companyPerformances = await Promise.all(
        companies.map(async (company: Company) => {
          const locations = await storage.getAllLocations(company.id);
          let companyScore = 0;
          let companyAssessments = 0;
          
          for (const location of locations) {
            const startDate = new Date();
            const months = timeRange === '3months' ? 3 : timeRange === '12months' ? 12 : 6;
            startDate.setMonth(startDate.getMonth() - months);
            const endDate = new Date();
            
            const assessments = await storage.getDailyChecklistsByLocation(location.id, startDate, endDate);
            
            assessments.forEach((assessment: any) => {
              if (assessment.tasks && Array.isArray(assessment.tasks)) {
                let locationScore = 0;
                let totalTasks = 0;
                assessment.tasks.forEach((task: any) => {
                  if (task.completed && task.rating) {
                    locationScore += task.rating;
                    totalTasks++;
                  }
                });
                if (totalTasks > 0) {
                  companyScore += (locationScore / totalTasks) * 100;
                  companyAssessments++;
                }
              }
            });
          }
          
          return {
            company: company.nameAr,
            avgScore: companyAssessments > 0 ? companyScore / companyAssessments : 0,
            assessments: companyAssessments
          };
        })
      );
      
      const topPerformer = companyPerformances.reduce((best, current) => 
        current.avgScore > best.avgScore ? current : best
      );
      
      const improvementNeeded = companyPerformances.reduce((worst, current) => 
        current.avgScore < worst.avgScore ? current : worst
      );
      
      const kpis = {
        totalCompanies,
        totalLocations,
        totalAssessments: completedAssessments,
        avgGroupScore,
        completionRate,
        criticalAlerts,
        topPerformer: topPerformer.company,
        improvementNeeded: improvementNeeded.company,
        // إضافة معلومات جديدة حول التحديثات والتعليقات
        recentAssessments, // التقييمات من آخر أسبوع
        assessmentsWithComments, // التقييمات التي تحتوي على تعليقات
        commentCoverageRate: completedAssessments > 0 ? 
          Math.round((assessmentsWithComments / completedAssessments) * 100) : 0 // نسبة التقييمات المع تعليقات
      };
      
      console.log(`📊 Executive KPIs (${selectedCompany}/${timeRange}) - Companies (${companies.length}):`, kpis);
      res.json(kpis);
      
    } catch (error) {
      console.error('Error fetching executive KPIs:', error);
      res.status(500).json({ message: 'Failed to fetch executive KPIs' });
    }
  });

  // Get companies summary for executive dashboard with filtering support
  app.get('/api/enhanced-gm/executive/companies-summary/:companyId?', async (req, res) => {
    try {
      const selectedCompanyId = req.params.companyId;
      let allCompanies = await storage.getAllCompanies();
      
      // If specific company is selected, filter to just that company
      if (selectedCompanyId && selectedCompanyId !== 'all') {
        const companyId = parseInt(selectedCompanyId);
        allCompanies = allCompanies.filter(company => company.id === companyId);
      }
      
      // فلترة الشركات الفعالة فقط - استثناء الشركة المرجعية والشؤون الإدارية
      const companies = allCompanies.filter(company => {
        const isReferenceCompany = company.nameAr === 'الشركة المرجعية' || 
                                  company.nameAr === 'قالب الشركات الجديدة' ||
                                  company.id === 2;
        const isAdminCompany = company.nameAr === 'الشؤون الإدارية الإدارة العامة' || 
                              company.nameAr === 'الشؤون الإدارية' || 
                              company.id === 1;
        
        return !isReferenceCompany && !isAdminCompany;
      });

      const companiesSummary = await Promise.all(
        companies.map(async (company: Company) => {
          const locations = await storage.getAllLocations(company.id);
          
          let totalAssessments = 0;
          let totalScore = 0;
          let lastAssessmentDate = new Date(0);
          
          for (const location of locations) {
            const assessments = await storage.getDailyChecklistsByLocation(location.id, new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date(), company.id);
            totalAssessments += assessments.length;
            
            let recentUpdates = 0; // التحديثات من آخر أسبوع
            let detailedComments = 0; // التعليقات المفصلة
            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            
            assessments.forEach((assessment: any) => {
              // فحص التحديثات الحديثة
              const assessmentDate = assessment.createdAt ? new Date(assessment.createdAt) : new Date(0);
              if (assessmentDate > lastAssessmentDate) {
                lastAssessmentDate = assessmentDate;
              }
              
              if (assessmentDate >= oneWeekAgo) {
                recentUpdates++;
              }
              
              // فحص جودة التعليقات العامة
              if (assessment.evaluationNotes && assessment.evaluationNotes.trim().length > 10) {
                detailedComments++;
              }
              
              if (assessment.tasks && Array.isArray(assessment.tasks)) {
                let locationScore = 0;
                let totalTasks = 0;
                let tasksWithDetailedComments = 0;
                
                assessment.tasks.forEach((task: any) => {
                  if (task.completed && task.rating) {
                    locationScore += task.rating;
                    totalTasks++;
                    
                    // فحص جودة تعليقات المهام
                    if (task.itemComment && task.itemComment.trim().length > 5) {
                      tasksWithDetailedComments++;
                    }
                  }
                });
                
                if (totalTasks > 0) {
                  // تحسين النقاط بناءً على جودة التعليقات
                  const baseScore = (locationScore / totalTasks) * 100;
                  const commentQualityBonus = (tasksWithDetailedComments / totalTasks) * 5; // مكافأة 5% للتعليقات الجيدة
                  totalScore += Math.min(100, baseScore + commentQualityBonus);
                }
                
                detailedComments += tasksWithDetailedComments;
              }
            });
          }
          
          const avgScore = totalAssessments > 0 ? 
            Math.round((totalScore / totalAssessments) * 100) / 100 : 0;
          
          // Determine status
          let status = 'poor';
          if (avgScore >= 90) status = 'excellent';
          else if (avgScore >= 80) status = 'good';
          else if (avgScore >= 70) status = 'fair';
          
          // حساب الاتجاه بناءً على البيانات الفعلية
          let trend = 'stable';
          if (totalAssessments === 0) {
            trend = 'down';
          } else if (avgScore >= 85) {
            trend = 'up';
          } else if (avgScore < 70) {
            trend = 'down';
          }
          
          // حساب المشاكل الحرجة الفعلية
          let criticalIssues = 0;
          if (locations.length === 0) criticalIssues++; // لا توجد مواقع
          if (totalAssessments === 0) criticalIssues++; // لا توجد تقييمات
          if (avgScore < 60) criticalIssues++; // نتائج ضعيفة
          
          return {
            id: company.id,
            nameAr: company.nameAr,
            nameEn: company.nameEn || company.nameAr,
            totalLocations: locations.length,
            completedAssessments: totalAssessments,
            avgScore,
            trend,
            criticalIssues,
            lastAssessment: lastAssessmentDate.getTime() > 0 ? lastAssessmentDate.toISOString().split('T')[0] : 'لا توجد تقييمات',
            status
          };
        })
      );
      
      console.log(`📊 Companies Summary (${selectedCompanyId || 'all'}) - Active Companies:`, companiesSummary.length, 'companies');
      res.json(companiesSummary);
      
    } catch (error) {
      console.error('Error fetching companies summary:', error);
      res.status(500).json({ message: 'Failed to fetch companies summary' });
    }
  });

  // Get trends data for charts - NOW WITH REAL DATA FROM DATABASE
  app.get('/api/enhanced-gm/executive/trends/:company/:timeRange', async (req, res) => {
    try {
      const { company, timeRange } = req.params;
      
      // Get all companies for filtering
      const allCompanies = await storage.getAllCompanies();
      let companies = allCompanies.filter(comp => {
        const isReferenceCompany = comp.nameAr === 'الشركة المرجعية' || 
                                  comp.nameAr === 'قالب الشركات الجديدة' ||
                                  comp.id === 2;
        const isAdminCompany = comp.nameAr === 'الشؤون الإدارية الإدارة العامة' || 
                              comp.nameAr === 'الشؤون الإدارية' || 
                              comp.id === 1;
        
        return !isReferenceCompany && !isAdminCompany && comp.isActive;
      });

      // Apply company filter if specific company is selected
      if (company !== 'all') {
        const companyId = parseInt(company);
        companies = companies.filter(comp => comp.id === companyId);
      }
      
      // Generate trend data based on time range with REAL database data
      const months = timeRange === '3months' ? 3 : timeRange === '12months' ? 12 : 6;
      const trendData = [];
      
      const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];
      
      const currentDate = new Date();
      
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date();
        date.setMonth(currentDate.getMonth() - i);
        const monthName = monthNames[date.getMonth()];
        
        // Calculate start and end dates for this month
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        let monthScore = 0;
        let monthAssessments = 0;
        let monthComments = 0;
        
        // Get real data from database for this month
        for (const comp of companies) {
          const locations = await storage.getAllLocations(comp.id);
          
          for (const location of locations) {
            const assessments = await storage.getDailyChecklistsByLocation(
              location.id, 
              monthStart, 
              monthEnd, 
              comp.id
            );
            
            monthAssessments += assessments.length;
            
            // Calculate real scores from tasks
            assessments.forEach((assessment: any) => {
              if (assessment.tasks && Array.isArray(assessment.tasks)) {
                let locationScore = 0;
                let totalTasks = 0;
                
                assessment.tasks.forEach((task: any) => {
                  if (task.completed && task.rating) {
                    locationScore += task.rating;
                    totalTasks++;
                    
                    // Count comments
                    if (task.itemComment && task.itemComment.trim().length > 0) {
                      monthComments++;
                    }
                  }
                });
                
                if (totalTasks > 0) {
                  monthScore += (locationScore / totalTasks) * 25; // Scale to 100%
                }
              }
              
              // Count evaluation notes
              if (assessment.evaluationNotes && assessment.evaluationNotes.trim().length > 0) {
                monthComments++;
              }
            });
          }
        }
        
        const avgScore = monthAssessments > 0 ? 
          Math.round((monthScore / monthAssessments) * 100) / 100 : 0;
        
        trendData.push({
          month: monthName,
          score: Math.max(0, Math.min(100, avgScore)),
          assessments: monthAssessments,
          commentsCount: monthComments // إضافة عدد التعليقات
        });
      }
      
      console.log(`📈 Real Trends for ${company} (${timeRange}):`, trendData.length, 'data points with actual database data');
      res.json(trendData);
      
    } catch (error) {
      console.error('Error fetching real trends:', error);
      res.status(500).json({ message: 'Failed to fetch trends data' });
    }
  });

  // Get alerts for the executive dashboard with company filtering
  app.get('/api/enhanced-gm/executive/alerts/:companyId?', async (req, res) => {
    try {
      const selectedCompanyId = req.params.companyId;
      let allCompanies = await storage.getAllCompanies();
      
      // If specific company is selected, filter to just that company
      if (selectedCompanyId && selectedCompanyId !== 'all') {
        const companyId = parseInt(selectedCompanyId);
        allCompanies = allCompanies.filter(company => company.id === companyId);
      }
      
      // فلترة الشركات الفعالة فقط - استثناء الشركة المرجعية والشؤون الإدارية
      const companies = allCompanies.filter(company => {
        const isReferenceCompany = company.nameAr === 'الشركة المرجعية' || 
                                  company.nameAr === 'قالب الشركات الجديدة' ||
                                  company.id === 2;
        const isAdminCompany = company.nameAr === 'الشؤون الإدارية الإدارة العامة' || 
                              company.nameAr === 'الشؤون الإدارية' || 
                              company.id === 1;
        
        return !isReferenceCompany && !isAdminCompany;
      });
      const alerts = [];
      let alertId = 1;
      
      for (const company of companies) {
        const locations = await storage.getAllLocations(company.id);
        
        // تحقق من الشركات بدون مواقع
        if (locations.length === 0) {
          alerts.push({
            id: alertId++,
            companyName: company.nameAr,
            locationName: null,
            type: 'critical',
            message: 'لا توجد مواقع مسجلة في هذه الشركة',
            timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
            priority: 1
          });
        }
        
        // تحقق من المواقع بدون تقييمات
        for (const location of locations) {
          const recentDate = new Date();
          recentDate.setDate(recentDate.getDate() - 7);
          const assessments = await storage.getDailyChecklistsByLocation(location.id, recentDate, new Date());
          
          if (assessments.length === 0) {
            alerts.push({
              id: alertId++,
              companyName: company.nameAr,
              locationName: location.nameAr,
              type: 'warning',
              message: 'لم يتم إجراء أي تقييمات في الأسبوع الماضي',
              timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
              priority: 2
            });
          }
        }
      }
      
      // Sort by priority
      alerts.sort((a, b) => a.priority - b.priority);
      
      console.log(`🚨 Executive Alerts (${selectedCompanyId || 'all'}) - Companies:`, alerts.length, 'alerts generated');
      res.json(alerts);
      
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({ message: 'Failed to fetch alerts' });
    }
  });

  // New endpoint: Get recent evaluations and comments
  app.get('/api/enhanced-gm/executive/recent-updates/:company?/:days?', async (req, res) => {
    try {
      const { company: selectedCompany = 'all', days = '7' } = req.params;
      const daysBack = parseInt(days);
      
      // Get all active companies
      const allCompanies = await storage.getAllCompanies();
      let companies = allCompanies.filter(company => {
        const isReferenceCompany = company.nameAr === 'الشركة المرجعية' || 
                                  company.nameAr === 'قالب الشركات الجديدة' ||
                                  company.id === 2;
        const isAdminCompany = company.nameAr === 'الشؤون الإدارية الإدارة العامة' || 
                              company.nameAr === 'الشؤون الإدارية' || 
                              company.id === 1;
        
        return !isReferenceCompany && !isAdminCompany && company.isActive;
      });

      // Apply company filter if specific company is selected
      if (selectedCompany !== 'all') {
        const companyId = parseInt(selectedCompany);
        companies = companies.filter(company => company.id === companyId);
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      let recentUpdates = [];
      let totalComments = 0;
      let totalEvaluations = 0;

      // Get recent evaluations with comments
      for (const company of companies) {
        const locations = await storage.getAllLocations(company.id);
        
        for (const location of locations) {
          const assessments = await storage.getDailyChecklistsByLocation(
            location.id,
            cutoffDate,
            new Date(),
            company.id
          );

          assessments.forEach((assessment: any) => {
            totalEvaluations++;
            const assessmentDate = new Date(assessment.createdAt);
            
            // Check for evaluation notes
            if (assessment.evaluationNotes && assessment.evaluationNotes.trim().length > 0) {
              totalComments++;
              recentUpdates.push({
                id: `eval-${assessment.id}`,
                type: 'evaluation_note',
                companyName: company.nameAr,
                locationName: location.nameAr,
                content: assessment.evaluationNotes,
                date: assessmentDate,
                userInfo: `تقييم رقم ${assessment.id}`
              });
            }

            // Check for task comments
            if (assessment.tasks && Array.isArray(assessment.tasks)) {
              assessment.tasks.forEach((task: any, taskIndex: number) => {
                if (task.itemComment && task.itemComment.trim().length > 0) {
                  totalComments++;
                  recentUpdates.push({
                    id: `task-${assessment.id}-${taskIndex}`,
                    type: 'task_comment',
                    companyName: company.nameAr,
                    locationName: location.nameAr,
                    content: task.itemComment,
                    taskRating: task.rating || 0,
                    date: assessmentDate,
                    userInfo: `مهمة ${taskIndex + 1} - تقييم ${assessment.id}`
                  });
                }
              });
            }
          });
        }
      }

      // Sort by most recent
      recentUpdates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Limit to most recent 50 updates
      recentUpdates = recentUpdates.slice(0, 50);

      const summary = {
        totalUpdates: recentUpdates.length,
        totalComments,
        totalEvaluations,
        commentRate: totalEvaluations > 0 ? Math.round((totalComments / totalEvaluations) * 100) : 0,
        companiesCount: companies.length,
        daysBack,
        updates: recentUpdates
      };

      console.log(`📊 Recent updates fetched: ${summary.totalUpdates} updates from ${summary.companiesCount} companies`);
      res.json(summary);

    } catch (error) {
      console.error('Error fetching recent updates:', error);
      res.status(500).json({ error: 'Failed to fetch recent updates' });
    }
  });
}