import type { Express } from "express";
import { storage } from "../storage";

export function registerInteractiveKpiRoutes(app: Express) {
  // Get interactive KPI data with filtering
  app.get('/api/kpi/interactive', async (req, res) => {
    try {
      const { companyId, userId, dateFrom, dateTo } = req.query;
      
      console.log('📊 Interactive KPI request:', {
        companyId: companyId || 'all',
        userId: userId || 'all',
        dateFrom,
        dateTo
      });

      // Get all active companies (excluding administrative ones)
      const allCompanies = await storage.getAllCompanies();
      let companies = allCompanies.filter(company => {
        const isAdminCompany = company.nameAr?.includes('الشؤون الإدارية') || 
                              company.nameAr?.includes('مدير الشؤون الإدارية') ||
                              company.id === 1; // Admin company ID
        return !isAdminCompany && company.isActive;
      });

      // Filter by specific company if requested
      if (companyId && companyId !== 'all') {
        const selectedCompanyId = parseInt(companyId as string);
        companies = companies.filter(company => company.id === selectedCompanyId);
      }

      // Parse date filters - استخدام توقيت الرياض الثابت
      const deviceTimezone = 'Asia/Riyadh';
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const startDate = dateFrom ? new Date(dateFrom as string) : thirtyDaysAgo;
      const endDate = dateTo ? new Date(dateTo as string) : now;

      // Initialize counters
      let totalAssessments = 0;
      let totalLocations = 0;
      let totalUsers = 0;
      let assessmentsInPeriod = 0;
      let assessmentsWithComments = 0;
      let totalScore = 0;
      let validScores = 0;
      let recentActivityMap: { [key: string]: { assessments: number; totalScore: number; scoreCount: number } } = {};
      let locationStatsMap: { [key: number]: { nameAr: string; assessments: number; totalScore: number; scoreCount: number; lastAssessment: string } } = {};
      let userActivityMap: { [key: number]: boolean } = {};

      // Process each company
      for (const company of companies) {
        const locations = await storage.getAllLocations(company.id);
        totalLocations += locations.length;

        // Get company users (excluding administrative roles)
        const allUsers = await storage.getAllUsers();
        const companyUsers = allUsers.filter(u => u.companyId === company.id);
        const filteredUsers = companyUsers.filter((user: any) => {
          const isAdminRole = user.role === 'admin_affairs_manager' || 
                             user.role === 'company_data_specialist' ||
                             user.fullName?.includes('مدير الشؤون الإدارية') ||
                             user.fullName?.includes('اخصائي بيانات الشركة');
          return !isAdminRole;
        });
        totalUsers += filteredUsers.length;

        // Process each location
        for (const location of locations) {
          locationStatsMap[location.id] = {
            nameAr: location.nameAr,
            assessments: 0,
            totalScore: 0,
            scoreCount: 0,
            lastAssessment: 'لا يوجد'
          };

          // Get assessments for this location
          const assessments = await storage.getDailyChecklistsByLocation(
            location.id,
            startDate,
            endDate
          );

          totalAssessments += assessments.length;

          // Filter by specific user if requested
          let filteredAssessments = assessments;
          if (userId && userId !== 'all') {
            const selectedUserId = parseInt(userId as string);
            filteredAssessments = assessments.filter(assessment => assessment.userId === selectedUserId);
          }

          assessmentsInPeriod += filteredAssessments.length;

          // Process each assessment
          filteredAssessments.forEach((assessment: any) => {
            const assessmentDate = new Date(assessment.createdAt);
            // تنسيق التاريخ بالتوقيت المحلي
            const dateKey = assessmentDate.toLocaleDateString('en-CA', {
              timeZone: 'Asia/Riyadh'
            });

            // Track user activity
            if (assessment.userId) {
              userActivityMap[assessment.userId] = true;
            }

            // Update recent activity map
            if (!recentActivityMap[dateKey]) {
              recentActivityMap[dateKey] = { assessments: 0, totalScore: 0, scoreCount: 0 };
            }
            recentActivityMap[dateKey].assessments++;

            // Update location stats
            locationStatsMap[location.id].assessments++;
            locationStatsMap[location.id].lastAssessment = assessmentDate.toLocaleDateString('ar-EG', {
              calendar: 'gregory',
              timeZone: 'Asia/Riyadh'
            });

            // Calculate score from tasks
            if (assessment.tasks && Array.isArray(assessment.tasks)) {
              let assessmentScore = 0;
              let taskCount = 0;
              let hasComments = false;

              assessment.tasks.forEach((task: any) => {
                if (task.rating !== undefined && task.rating !== null) {
                  assessmentScore += task.rating;
                  taskCount++;
                }
                
                // Check for comments
                if (task.itemComment && task.itemComment.trim().length > 0) {
                  hasComments = true;
                }
              });

              // Also check for evaluation notes
              if (assessment.evaluationNotes && assessment.evaluationNotes.trim().length > 0) {
                hasComments = true;
              }

              if (hasComments) {
                assessmentsWithComments++;
              }

              if (taskCount > 0) {
                const avgScore = (assessmentScore / taskCount) * 20; // Convert to percentage
                totalScore += avgScore;
                validScores++;

                // Update activity map
                recentActivityMap[dateKey].totalScore += avgScore;
                recentActivityMap[dateKey].scoreCount++;

                // Update location stats
                locationStatsMap[location.id].totalScore += avgScore;
                locationStatsMap[location.id].scoreCount++;
              }
            }
          });
        }
      }

      // Calculate metrics
      const averageScore = validScores > 0 ? totalScore / validScores : 0;
      const completionRate = totalLocations > 0 ? Math.min(100, (assessmentsInPeriod / totalLocations) * 10) : 0;
      const commentCoverageRate = assessmentsInPeriod > 0 ? Math.round((assessmentsWithComments / assessmentsInPeriod) * 100) : 0;
      const averageCommentsPerAssessment = assessmentsInPeriod > 0 ? (assessmentsWithComments / assessmentsInPeriod).toFixed(1) : '0.0';
      
      // Active/inactive users
      const activeUsers = Object.keys(userActivityMap).length;
      const inactiveUsers = totalUsers - activeUsers;

      // Location performance analysis
      const locationStats = Object.entries(locationStatsMap).map(([id, stats]) => ({
        id: parseInt(id),
        nameAr: stats.nameAr,
        assessments: stats.assessments,
        averageScore: stats.scoreCount > 0 ? Math.round(stats.totalScore / stats.scoreCount) : 0,
        lastAssessment: stats.lastAssessment
      }));

      const highPerformingLocations = locationStats.filter(loc => loc.averageScore > 80).length;
      const lowPerformingLocations = locationStats.filter(loc => loc.averageScore < 60 && loc.assessments > 0).length;

      // Recent activity chart data
      const recentActivity = Object.entries(recentActivityMap)
        .map(([date, data]) => ({
          date,
          assessments: data.assessments,
          averageScore: data.scoreCount > 0 ? Math.round(data.totalScore / data.scoreCount) : 0
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-30); // Last 30 days

      // Determine improvement trend
      let improvementTrend = 'stable';
      if (recentActivity.length >= 2) {
        const recent = recentActivity.slice(-7); // Last week
        const previous = recentActivity.slice(-14, -7); // Previous week
        
        if (recent.length > 0 && previous.length > 0) {
          const recentAvg = recent.reduce((sum, day) => sum + day.averageScore, 0) / recent.length;
          const previousAvg = previous.reduce((sum, day) => sum + day.averageScore, 0) / previous.length;
          
          if (recentAvg > previousAvg + 5) improvementTrend = 'up';
          else if (recentAvg < previousAvg - 5) improvementTrend = 'down';
        }
      }

      const kpiData = {
        totalAssessments,
        totalLocations,
        totalUsers,
        averageScore,
        assessmentsInPeriod,
        completionRate,
        assessmentsWithComments,
        commentCoverageRate,
        averageCommentsPerAssessment: parseFloat(averageCommentsPerAssessment),
        highPerformingLocations,
        lowPerformingLocations,
        improvementTrend,
        activeUsers,
        inactiveUsers,
        recentActivity,
        locationStats: locationStats.sort((a, b) => b.averageScore - a.averageScore).slice(0, 10) // Top 10
      };

      console.log('✅ Interactive KPI data calculated:', {
        companies: companies.length,
        totalAssessments,
        assessmentsInPeriod,
        averageScore: averageScore.toFixed(1),
        commentCoverageRate
      });

      res.json(kpiData);

    } catch (error) {
      console.error('❌ Error fetching interactive KPI data:', error);
      res.status(500).json({ error: 'Failed to fetch KPI data' });
    }
  });

  console.log('✅ Interactive KPI routes registered');
}