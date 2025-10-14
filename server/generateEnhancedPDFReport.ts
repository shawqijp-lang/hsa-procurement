// دالة إنشاء التقرير المحسن بتصميم PDF المتقدم مع النمط المطلوب
export function generateEnhancedPDFStyleReport(reportData: any): string {
  const locations = reportData.locations || [];
  
  // دالة إنشاء رأس التقرير بنمط PDF
  function generatePDFStyleReportHeader(reportData: any): string {
    const currentDate = new Date().toLocaleDateString('ar-EG', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      calendar: 'gregory'
    });
    
    const totalUsers = reportData.totalUsers || 1;
    const totalLocations = reportData.locations?.length || 0;
    const totalEvaluations = reportData.totalEvaluations || 0;
    const dateRange = reportData.dateRange || `${new Date().toLocaleDateString('ar-EG')}`;
    const generatedBy = reportData.generatedBy || 'مدير الشؤون الإدارية';
    
    return `
      <div class="pdf-report-header">
        <div class="header-grid">
          <div class="header-right">
            <div class="header-item">
              <span class="header-label">تاريخ إنشاء التقرير:</span>
              <span class="header-value">${currentDate}</span>
            </div>
            <div class="header-item">
              <span class="header-label">تم إنشاؤه بواسطة:</span>
              <span class="header-value">${generatedBy}</span>
            </div>
            <div class="header-item">
              <span class="header-label">إجمالي التقييمات:</span>
              <span class="header-value">${totalEvaluations}</span>
            </div>
            <div class="header-item">
              <span class="header-label">عدد المواقع:</span>
              <span class="header-value">${totalLocations}</span>
            </div>
            <div class="header-item">
              <span class="header-label">عدد المستخدمين:</span>
              <span class="header-value">${totalUsers}</span>
            </div>
            <div class="header-item">
              <span class="header-label">الفترة الزمنية:</span>
              <span class="header-value">${dateRange}</span>
            </div>
          </div>
          <div class="header-left">
            <h1 class="report-title">التقرير التفصيلي الشامل للتقييمات - نظام هائل سعيد أنعم وشركاه</h1>
          </div>
        </div>
      </div>
    `;
  }

  // دالة إنشاء الإحصائيات العامة بنمط PDF
  function generatePDFStyleGeneralStats(reportData: any): string {
    const locations = reportData.locations || [];
    const totalTasks = locations.reduce((sum: number, loc: any) => sum + (loc.totalPossibleTasks || 0), 0);
    const completedTasks = locations.reduce((sum: number, loc: any) => sum + (loc.totalCompletedTasks || 0), 0);
    const averageRating = locations.length > 0 
      ? (locations.reduce((sum: number, loc: any) => sum + (loc.averageRating || 0), 0) / locations.length).toFixed(2)
      : '0.00';
    
    // حساب المهام الفرعية
    const allSubTasks = locations.reduce((sum: number, loc: any) => {
      const reports = loc.dailyReports || [];
      return sum + reports.reduce((s: number, r: any) => {
        const tasks = r.tasks || [];
        return s + tasks.reduce((ts: number, t: any) => ts + (t.subTasks?.length || 0), 0);
      }, 0);
    }, 0);
    
    // حساب التقييمات العالية والمنخفضة
    const highRatingTasks = locations.reduce((sum: number, loc: any) => {
      const reports = loc.dailyReports || [];
      return sum + reports.reduce((s: number, r: any) => {
        const tasks = r.tasks || [];
        return s + tasks.filter((t: any) => (t.rating || 0) >= 4).length;
      }, 0);
    }, 0);
    
    const lowRatingTasks = locations.reduce((sum: number, loc: any) => {
      const reports = loc.dailyReports || [];
      return sum + reports.reduce((s: number, r: any) => {
        const tasks = r.tasks || [];
        return s + tasks.filter((t: any) => (t.rating || 0) <= 2 && (t.rating || 0) > 0).length;
      }, 0);
    }, 0);
    
    const totalComments = locations.reduce((sum: number, loc: any) => {
      const reports = loc.dailyReports || [];
      return sum + reports.reduce((s: number, r: any) => {
        const tasks = r.tasks || [];
        return s + tasks.filter((t: any) => t.comment && t.comment.trim().length > 0).length;
      }, 0);
    }, 0);
    
    return `
      <div class="pdf-general-stats">
        <h2 class="stats-title">الإحصائيات العامة للتقرير</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">${totalTasks}</span>
            <span class="stat-label">🎯 :إجمالي المهام</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${completedTasks}</span>
            <span class="stat-label">✅ :المهام المكتملة</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${averageRating}/4</span>
            <span class="stat-label">⭐ :متوسط التقييم</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${allSubTasks}</span>
            <span class="stat-label">📊 :المهام الفرعية</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${highRatingTasks}</span>
            <span class="stat-label">🟢 :تقييمات عالية</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${lowRatingTasks}</span>
            <span class="stat-label">🔴 :تقييمات منخفضة</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${totalComments}</span>
            <span class="stat-label">📝 :ملاحظات عامة</span>
          </div>
        </div>
      </div>
    `;
  }

  // دالة إنشاء تفاصيل المواقع بنمط PDF
  function generatePDFStyleLocationDetails(reportData: any): string {
    const locations = reportData.locations || [];
    
    if (locations.length === 0) {
      return `
        <div class="pdf-locations-section">
          <h2 class="section-title">تفاصيل المواقع</h2>
          <div class="no-data">لا توجد مواقع للعرض</div>
        </div>
      `;
    }

    const locationsHTML = locations.map((location: any, index: number) => {
      const dailyReports = location.dailyReports || [];
      
      if (dailyReports.length === 0) {
        return `
          <div class="pdf-location-section">
            <div class="location-header">
              <h3 class="location-title">📍 الموقع: ${location.nameAr}</h3>
            </div>
            <div class="no-data">لا توجد تقييمات لهذا الموقع</div>
          </div>
        `;
      }

      // إحصائيات الموقع
      const locationTotalTasks = dailyReports.reduce((sum: number, report: any) => sum + (report.tasks?.length || 0), 0);
      const locationCompletedTasks = dailyReports.reduce((sum: number, report: any) => {
        const tasks = report.tasks || [];
        return sum + tasks.filter((t: any) => t.completed).length;
      }, 0);
      
      const locationSubTasks = dailyReports.reduce((sum: number, report: any) => {
        const tasks = report.tasks || [];
        return sum + tasks.reduce((ts: number, t: any) => ts + (t.subTasks?.length || 0), 0);
      }, 0);

      const locationHighRating = dailyReports.reduce((sum: number, report: any) => {
        const tasks = report.tasks || [];
        return sum + tasks.filter((t: any) => (t.rating || 0) >= 4).length;
      }, 0);

      const locationLowRating = dailyReports.reduce((sum: number, report: any) => {
        const tasks = report.tasks || [];
        return sum + tasks.filter((t: any) => (t.rating || 0) <= 2 && (t.rating || 0) > 0).length;
      }, 0);

      const locationComments = dailyReports.reduce((sum: number, report: any) => {
        const tasks = report.tasks || [];
        return sum + tasks.filter((t: any) => t.comment && t.comment.trim().length > 0).length;
      }, 0);

      // تفاصيل التقييمات اليومية
      const dailyReportsHTML = dailyReports.map((daily: any) => {
        const evaluationDate = new Date(daily.date).toLocaleDateString('ar-EG', {
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          calendar: 'gregory'
        });
        
        // استخدام الوقت الفعلي للتقييم بتوقيت الرياض
        const evaluationTime = daily.evaluationTime || 
          (daily.evaluationDateTime ? new Date(daily.evaluationDateTime).toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Riyadh'
          }) : new Date(daily.date).toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Riyadh'
          }));

        // تجميع المهام حسب الفئة
        const tasksByCategory: { [key: string]: any[] } = {};
        (daily.tasks || []).forEach((task: any) => {
          const category = task.categoryAr || 'غير محدد';
          if (!tasksByCategory[category]) {
            tasksByCategory[category] = [];
          }
          tasksByCategory[category].push(task);
        });

        const categoriesHTML = Object.entries(tasksByCategory).map(([category, tasks]) => {
          const categoryTotalTasks = tasks.length;
          const categoryCompletedTasks = tasks.filter(t => t.completed).length;
          const categoryAverageRating = tasks.filter(t => t.rating > 0).length > 0
            ? (tasks.filter(t => t.rating > 0).reduce((sum, t) => sum + (t.rating || 0), 0) / tasks.filter(t => t.rating > 0).length).toFixed(2)
            : '0.00';

          const categorySubTasks = tasks.reduce((sum, t) => sum + (t.subTasks?.length || 0), 0);
          const categoryHighRating = tasks.filter(t => (t.rating || 0) >= 4).length;
          const categoryLowRating = tasks.filter(t => (t.rating || 0) <= 2 && (t.rating || 0) > 0).length;
          const categoryComments = tasks.filter(t => t.comment && t.comment.trim().length > 0).length;

          const categoryTasksHTML = tasks.map(task => {
            const subTasksHTML = (task.subTasks || []).map((subTask: any) => `
              <tr class="sub-task-row">
                <td class="sub-task-name">↳ ${subTask.nameAr}</td>
                <td class="sub-task-rating">${subTask.rating || 0}/4</td>
              </tr>
            `).join('');

            return `
              <tr class="main-task-row">
                <td class="task-name">${task.taskAr} 🎯</td>
                <td class="task-rating">${task.rating || 0}/4</td>
              </tr>
              ${subTasksHTML}
            `;
          }).join('');

          const commentsHTML = tasks.filter(t => t.comment && t.comment.trim().length > 0)
            .map(t => `<div class="comment-item">💭 ${t.comment}</div>`).join('');

          return `
            <div class="pdf-category-section">
              <div class="category-header">
                <h4 class="category-title">الفئة 📋<br>${category}</h4>
                <div class="category-stats">
                  <div class="category-stat">
                    <span class="stat-value">${categoryTotalTasks}</span>
                    <span class="stat-label">🎯 :إجمالي المهام</span>
                  </div>
                  <div class="category-stat">
                    <span class="stat-value">${categoryCompletedTasks}</span>
                    <span class="stat-label">✅ :المهام المكتملة</span>
                  </div>
                  <div class="category-stat">
                    <span class="stat-value">${categoryAverageRating}/4</span>
                    <span class="stat-label">⭐ :متوسط التقييم</span>
                  </div>
                  <div class="category-stat">
                    <span class="stat-value">${categorySubTasks}</span>
                    <span class="stat-label">📊 :المهام الفرعية</span>
                  </div>
                  <div class="category-stat">
                    <span class="stat-value">${categoryHighRating}</span>
                    <span class="stat-label">🟢 :تقييمات عالية</span>
                  </div>
                  <div class="category-stat">
                    <span class="stat-value">${categoryLowRating}</span>
                    <span class="stat-label">🔴 :تقييمات منخفضة</span>
                  </div>
                  <div class="category-stat">
                    <span class="stat-value">${categoryComments}</span>
                    <span class="stat-label">📝 :ملاحظات عامة</span>
                  </div>
                </div>
              </div>
              
              <div class="tasks-table">
                <table class="pdf-tasks-table">
                  <thead>
                    <tr>
                      <th class="task-header">المهمة والتفاصيل 🎯</th>
                      <th class="rating-header">التقييم ⭐</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${categoryTasksHTML}
                  </tbody>
                </table>
              </div>

              ${commentsHTML ? `
                <div class="category-comments">
                  <h5>التعليقات 💭</h5>
                  ${commentsHTML}
                </div>
              ` : ''}
            </div>
          `;
        }).join('');

        return `
          <div class="pdf-daily-evaluation">
            <div class="evaluation-header">
              <div class="evaluation-info">
                <span class="evaluation-date">${evaluationDate}</span>
                <span class="evaluation-time">${evaluationTime}</span>
                <span class="evaluator">المقيم: ${daily.userFullName} 📋</span>
              </div>
            </div>
            ${categoriesHTML}
          </div>
        `;
      }).join('');

      return `
        <div class="pdf-location-section">
          <div class="location-header">
            <h3 class="location-title">📍 الموقع: ${location.nameAr}</h3>
          </div>

          <div class="location-stats">
            <div class="location-stat">
              <span class="stat-value">${locationTotalTasks}</span>
              <span class="stat-label">🎯 :إجمالي المهام</span>
            </div>
            <div class="location-stat">
              <span class="stat-value">${locationCompletedTasks}</span>
              <span class="stat-label">✅ :المهام المكتملة</span>
            </div>
            <div class="location-stat">
              <span class="stat-value">${location.averageRating || 0}/4</span>
              <span class="stat-label">⭐ :متوسط التقييم</span>
            </div>
            <div class="location-stat">
              <span class="stat-value">${locationSubTasks}</span>
              <span class="stat-label">📊 :المهام الفرعية</span>
            </div>
            <div class="location-stat">
              <span class="stat-value">${locationHighRating}</span>
              <span class="stat-label">🟢 :تقييمات عالية</span>
            </div>
            <div class="location-stat">
              <span class="stat-value">${locationLowRating}</span>
              <span class="stat-label">🔴 :تقييمات منخفضة</span>
            </div>
            <div class="location-stat">
              <span class="stat-value">${locationComments}</span>
              <span class="stat-label">📝 :ملاحظات عامة</span>
            </div>
          </div>

          ${dailyReportsHTML}
        </div>
      `;
    }).join('');

    return `
      <div class="pdf-locations-section">
        <h2 class="section-title">تفاصيل المواقع والتقييمات</h2>
        ${locationsHTML}
      </div>
    `;
  }

  // دالة إنشاء التحليل الإجمالي
  function generateFinalAnalysis(reportData: any): string {
    const locations = reportData.locations || [];
    const totalEvaluations = reportData.totalEvaluations || 0;
    const totalTasks = locations.reduce((sum: number, loc: any) => sum + (loc.totalPossibleTasks || 0), 0);
    const completedTasks = locations.reduce((sum: number, loc: any) => sum + (loc.totalCompletedTasks || 0), 0);
    const averageRating = locations.length > 0 
      ? (locations.reduce((sum: number, loc: any) => sum + (loc.averageRating || 0), 0) / locations.length).toFixed(2)
      : '0.00';
    const totalLocations = locations.length;

    return `
      <div class="pdf-final-analysis">
        <h2 class="analysis-title">التحليل الإجمالي للتقرير التفصيلي 📈</h2>
        <div class="final-stats-grid">
          <div class="final-stat-item">
            <span class="final-stat-label">إجمالي المهام عبر جميع التقييمات:</span>
            <span class="final-stat-value">${totalTasks}</span>
          </div>
          <div class="final-stat-item">
            <span class="final-stat-label">إجمالي المهام المكتملة:</span>
            <span class="final-stat-value">${completedTasks}</span>
          </div>
          <div class="final-stat-item">
            <span class="final-stat-label">المتوسط العام للتقييمات:</span>
            <span class="final-stat-value">${averageRating}/4</span>
          </div>
          <div class="final-stat-item">
            <span class="final-stat-label">عدد التقييمات المشمولة:</span>
            <span class="final-stat-value">${totalEvaluations}</span>
          </div>
          <div class="final-stat-item">
            <span class="final-stat-label">عدد المواقع المغطاة:</span>
            <span class="final-stat-value">${totalLocations}</span>
          </div>
        </div>
        
        <div class="company-signature">
          <h3>هائل سعيد أنعم وشركاه</h3>
          <p>التقرير التفصيلي الشامل للتقييمات</p>
        </div>
      </div>
    `;
  }

  // تجميع التقرير الكامل
  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>التقرير التفصيلي الشامل للتقييمات - نظام هائل سعيد أنعم وشركاه</title>
      <style>
        body {
          font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 20px;
          background-color: #ffffff;
          color: #000000;
          line-height: 1.6;
        }
        
        /* PDF Style Report Header */
        .pdf-report-header {
          background: white;
          border: 3px solid #FFD700;
          border-radius: 15px;
          padding: 25px;
          margin-bottom: 25px;
          box-shadow: 0 6px 20px rgba(255, 215, 0, 0.15);
        }
        
        .header-grid {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 25px;
          align-items: center;
        }
        
        .header-item {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 2px solid #f5f5f5;
          font-size: 16px;
        }
        
        .header-label {
          font-weight: bold;
          color: #333;
        }
        
        .header-value {
          color: #000;
          font-weight: bold;
        }
        
        .report-title {
          font-size: 22px;
          font-weight: bold;
          text-align: center;
          margin: 0;
          padding: 25px;
          background: linear-gradient(135deg, #FFD700, #FFA500);
          border-radius: 15px;
          color: #000;
          box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
        }
        
        /* PDF Style General Stats */
        .pdf-general-stats {
          background: white;
          border: 3px solid #FFD700;
          border-radius: 15px;
          padding: 25px;
          margin-bottom: 25px;
          box-shadow: 0 6px 20px rgba(255, 215, 0, 0.15);
        }
        
        .stats-title {
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          color: #000;
          margin-bottom: 20px;
          padding: 15px;
          background: linear-gradient(135deg, #FFD700, #FFA500);
          border-radius: 10px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }
        
        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          background: #f9f9f9;
          border-radius: 10px;
          border-left: 5px solid #FFD700;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .stat-value {
          font-size: 28px;
          font-weight: bold;
          color: #000;
        }
        
        .stat-label {
          font-size: 16px;
          color: #333;
          font-weight: bold;
        }

        /* PDF Style Locations Section */
        .pdf-locations-section {
          margin-bottom: 30px;
        }

        .section-title {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
          padding: 20px;
          border-radius: 15px;
          margin-bottom: 20px;
          box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
        }

        .pdf-location-section {
          background: white;
          border: 2px solid #4CAF50;
          border-radius: 15px;
          padding: 25px;
          margin-bottom: 25px;
          box-shadow: 0 6px 20px rgba(76, 175, 80, 0.1);
        }

        .location-title {
          font-size: 20px;
          font-weight: bold;
          color: #000;
          text-align: center;
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 20px;
        }

        .location-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .location-stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 15px;
          background: #f0f8f0;
          border-radius: 8px;
          border-left: 4px solid #4CAF50;
        }

        .pdf-daily-evaluation {
          background: #fafafa;
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 15px;
          border-left: 5px solid #2196F3;
        }

        .evaluation-header {
          background: linear-gradient(135deg, #2196F3, #1976D2);
          color: white;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 15px;
          text-align: center;
        }

        .evaluation-info {
          display: flex;
          justify-content: space-around;
          align-items: center;
          flex-wrap: wrap;
        }

        .evaluation-date, .evaluation-time, .evaluator {
          font-weight: bold;
          margin: 5px;
        }

        /* PDF Category Sections */
        .pdf-category-section {
          background: white;
          border: 2px solid #FF9800;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 4px 15px rgba(255, 152, 0, 0.1);
        }

        .category-header {
          margin-bottom: 15px;
        }

        .category-title {
          font-size: 18px;
          font-weight: bold;
          text-align: center;
          background: linear-gradient(135deg, #FF9800, #F57C00);
          color: white;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 15px;
        }

        .category-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 10px;
          margin-bottom: 15px;
        }

        .category-stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #fff3e0;
          border-radius: 6px;
          border-left: 3px solid #FF9800;
          font-size: 14px;
        }

        /* Tasks Table */
        .tasks-table {
          margin-top: 15px;
        }

        .pdf-tasks-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .pdf-tasks-table th {
          background: linear-gradient(135deg, #6a1b9a, #4527a0);
          color: white;
          padding: 15px;
          text-align: center;
          font-weight: bold;
          font-size: 16px;
        }

        .pdf-tasks-table td {
          padding: 12px 15px;
          border-bottom: 1px solid #e0e0e0;
          vertical-align: middle;
        }

        .main-task-row {
          background: #f8f9fa;
        }

        .main-task-row:hover {
          background: #e3f2fd;
        }

        .sub-task-row {
          background: #ffffff;
        }

        .sub-task-row:hover {
          background: #f5f5f5;
        }

        .task-name, .sub-task-name {
          font-weight: bold;
          color: #2c3e50;
        }

        .sub-task-name {
          padding-right: 20px;
          font-size: 14px;
          color: #555;
        }

        .task-rating, .sub-task-rating {
          text-align: center;
          font-weight: bold;
          color: #e67e22;
          font-size: 16px;
        }

        /* Comments */
        .category-comments {
          margin-top: 15px;
          padding: 15px;
          background: #f0f4f8;
          border-radius: 8px;
          border-left: 4px solid #3498db;
        }

        .category-comments h5 {
          margin: 0 0 10px 0;
          color: #2c3e50;
          font-weight: bold;
        }

        .comment-item {
          background: white;
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          color: #555;
        }

        /* Final Analysis */
        .pdf-final-analysis {
          background: white;
          border: 3px solid #9C27B0;
          border-radius: 15px;
          padding: 25px;
          margin-top: 30px;
          box-shadow: 0 6px 20px rgba(156, 39, 176, 0.15);
        }

        .analysis-title {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          background: linear-gradient(135deg, #9C27B0, #7B1FA2);
          color: white;
          padding: 20px;
          border-radius: 10px;
          margin-bottom: 20px;
        }

        .final-stats-grid {
          display: grid;
          gap: 15px;
          margin-bottom: 25px;
        }

        .final-stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          background: #f3e5f5;
          border-radius: 10px;
          border-left: 5px solid #9C27B0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .final-stat-label {
          font-size: 16px;
          font-weight: bold;
          color: #4a148c;
        }

        .final-stat-value {
          font-size: 20px;
          font-weight: bold;
          color: #000;
        }

        .company-signature {
          text-align: center;
          padding: 20px;
          background: linear-gradient(135deg, #FFD700, #FFA500);
          border-radius: 10px;
          margin-top: 20px;
        }

        .company-signature h3 {
          margin: 0 0 5px 0;
          font-size: 22px;
          font-weight: bold;
          color: #000;
        }

        .company-signature p {
          margin: 0;
          font-size: 16px;
          color: #333;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .header-grid {
            grid-template-columns: 1fr;
          }
          
          .stats-grid,
          .location-stats,
          .category-stats {
            grid-template-columns: 1fr;
          }
          
          .evaluation-info {
            flex-direction: column;
          }
          
          .pdf-tasks-table {
            font-size: 14px;
          }
          
          .stat-value {
            font-size: 24px;
          }
        }

        .no-data {
          text-align: center;
          padding: 40px 20px;
          color: #666;
          font-size: 18px;
          background: #f9f9f9;
          border-radius: 10px;
          border: 2px dashed #ddd;
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        ${generatePDFStyleReportHeader(reportData)}
        ${generatePDFStyleGeneralStats(reportData)}
        ${generatePDFStyleLocationDetails(reportData)}
        ${generateFinalAnalysis(reportData)}
      </div>
    </body>
    </html>
  `;
}