import { calculateQualityPercent } from '../shared/unifiedEvaluationSchema';

// دالة موحدة للحصول على نسبة الجودة من أي مصدر بيانات
function getQualityPercent(record: any): number {
  // إذا كانت النسبة المئوية متوفرة مباشرة، استخدمها
  if (typeof record.qualityPercent === 'number') {
    return Math.max(0, Math.min(100, record.qualityPercent));
  }
  
  // إذا كان هناك تقييم متوسط، حوّله إلى نسبة مئوية
  if (typeof record.averageRating === 'number') {
    // النظام القديم يستخدم مقياس 0-4, لذا 1/4 = 25%
    // لكن لضمان "1 → 20%" نحتاج لمقياس 0-5
    // نفترض أن البيانات القديمة من 0-4 ونحولها بحذر
    const rating = record.averageRating;
    return Math.round((rating / 4) * 100);
  }
  
  // إذا كان لديه عناصر تقييم، استخدم calculateQualityPercent
  if (record.evaluationItems && Array.isArray(record.evaluationItems)) {
    return calculateQualityPercent(record.evaluationItems);
  }
  
  return 0;
}

// دالة ذكية محسنة لتحليل البيانات وإنتاج التوصيات المخصصة
function analyzeDataAndGenerateRecommendations(reportData: any): string {
  // Enhanced input validation with PDF-style design
  if (!reportData || typeof reportData !== 'object') {
    return `
    <div class="analysis-section pdf-style-section">
      <div class="section-header">
        <h2>⚠️ لا توجد بيانات كافية للتحليل</h2>
      </div>
    </div>
    `;
  }
  const locations = Array.isArray(reportData.locations) ? reportData.locations : [];
  const totalEvaluations = Math.max(0, reportData.totalEvaluations || 0);
  
  // Safe calculation with validation
  const overallCompletionRate = locations.length > 0 
    ? Math.round(locations.reduce((sum: number, loc: any) => {
        const rate = typeof loc.completionRate === 'number' ? loc.completionRate : 0;
        return sum + Math.max(0, Math.min(100, rate)); // Clamp between 0-100
      }, 0) / locations.length)
    : 0;
    
  // حساب جودة التقييم العامة كنسبة مئوية (0-100%)
  const overallQualityPercent = locations.length > 0
    ? Math.round(locations.reduce((sum: number, loc: any) => {
        // تحويل من مقياس 0-4 إلى نسبة مئوية إذا كانت البيانات من النظام القديم
        let qualityPercent = 0;
        if (typeof loc.averageRating === 'number') {
          // إذا كان التقييم من 0-4، حوّله إلى نسبة مئوية
          qualityPercent = (loc.averageRating / 4) * 100;
        } else if (typeof loc.qualityPercent === 'number') {
          // إذا كانت النسبة المئوية متوفرة مباشرة
          qualityPercent = loc.qualityPercent;
        }
        return sum + Math.max(0, Math.min(100, qualityPercent));
      }, 0) / locations.length)
    : 0;

  // تحليل الأداء حسب الموقع مع العتبات الصحيحة (80% ممتاز، 60% جيد)
  const highPerformingLocations = locations.filter((loc: any) => {
    const completionRate = loc.completionRate || 0;
    const qualityPercent = loc.averageRating ? (loc.averageRating / 4) * 100 : (loc.qualityPercent || 0);
    return completionRate >= 80 && qualityPercent >= 80; // 80% جودة و 80% إكمال
  });
  
  const lowPerformingLocations = locations.filter((loc: any) => {
    const completionRate = loc.completionRate || 0;
    const qualityPercent = loc.averageRating ? (loc.averageRating / 4) * 100 : (loc.qualityPercent || 0);
    return completionRate < 60 || qualityPercent < 60; // أقل من 60% جودة أو 60% إكمال
  });
  const moderatePerformingLocations = locations.filter((loc: any) => 
    !highPerformingLocations.includes(loc) && !lowPerformingLocations.includes(loc)
  );
  
  // إحصائيات إضافية للتصميم الجديد
  const totalTasks = locations.reduce((sum: number, loc: any) => sum + (loc.totalPossibleTasks || 0), 0);
  const completedTasks = locations.reduce((sum: number, loc: any) => sum + (loc.totalCompletedTasks || 0), 0);
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

  // تحليل التوزيع الزمني
  const allDailyReports = locations.flatMap((loc: any) => loc.dailyReports || []);
  const evaluationsByDate = allDailyReports.reduce((acc: any, report: any) => {
    const date = report.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(report);
    return acc;
  }, {});

  // تحليل المهام الأكثر إشكالية مع تفاصيل أكثر ذكاءً
  const allTasks = allDailyReports.flatMap((report: any) => report.tasks || []);
  const tasksByCategory = allTasks.reduce((acc: any, task: any) => {
    const category = task.categoryAr || 'غير محدد';
    if (!acc[category]) acc[category] = { 
      total: 0, 
      completed: 0, 
      totalRating: 0, 
      ratedCount: 0,
      tasks: [],
      locations: new Set(),
      users: new Set()
    };
    acc[category].total++;
    if (task.completed) acc[category].completed++;
    if (task.rating && task.rating > 0) {
      acc[category].totalRating += task.rating;
      acc[category].ratedCount++;
    }
    acc[category].tasks.push(task);
    acc[category].locations.add(task.locationName || 'غير محدد');
    acc[category].users.add(task.userName || 'غير محدد');
    return acc;
  }, {});

  const problematicCategories = Object.entries(tasksByCategory)
    .map(([category, data]: [string, any]) => ({
      category,
      completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      averageRating: data.ratedCount > 0 ? (data.totalRating / data.ratedCount).toFixed(1) : '0.0',
      total: data.total,
      tasks: data.tasks,
      locations: Array.from(data.locations),
      users: Array.from(data.users)
    }))
    .filter(item => item.completionRate < 70 || getQualityPercent({averageRating: parseFloat(item.averageRating)}) < 60)
    .sort((a, b) => a.completionRate - b.completionRate);

  // تحليل ذكي لأنواع المواقع وتحدياتها
  const locationTypes = locations.reduce((acc: any, loc: any) => {
    const type = getLocationTypeFromIcon(loc.icon || 'building');
    if (!acc[type]) acc[type] = { 
      locations: [], 
      totalRating: 0, 
      count: 0,
      commonIssues: []
    };
    acc[type].locations.push(loc);
    acc[type].totalRating += (loc.averageRating || 0);
    acc[type].count++;
    return acc;
  }, {});

  // دالة مساعدة لتحديد نوع الموقع
  function getLocationTypeFromIcon(icon: string): string {
    const typeMap: { [key: string]: string } = {
      'building': 'المباني الإدارية',
      'home': 'المساكن',
      'droplets': 'دورات المياه',
      'map-pin': 'البيئة الخارجية',
      'package': 'المخازن',
      'clinic-medical': 'العيادات الطبية',
      'chef-hat': 'المطابخ'
    };
    return typeMap[icon] || 'أخرى';
  }

  // دالة تحليل الاتجاهات الزمنية
  function analyzeTemporalTrends(evaluationsByDate: any) {
    const dates = Object.keys(evaluationsByDate).sort();
    if (dates.length < 2) return null;
    
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    const firstDayAvg = evaluationsByDate[firstDate].reduce((sum: number, evaluation: any) => 
      sum + (evaluation.averageRating || 0), 0) / evaluationsByDate[firstDate].length;
    const lastDayAvg = evaluationsByDate[lastDate].reduce((sum: number, evaluation: any) => 
      sum + (evaluation.averageRating || 0), 0) / evaluationsByDate[lastDate].length;
    
    return {
      trend: lastDayAvg > firstDayAvg ? 'تحسن' : lastDayAvg < firstDayAvg ? 'تراجع' : 'مستقر',
      change: Math.abs(lastDayAvg - firstDayAvg).toFixed(1)
    };
  }

  // تحليل الاتجاهات الزمنية
  const dateAnalysis = Object.keys(evaluationsByDate).length > 1 ? 
    analyzeTemporalTrends(evaluationsByDate) : null;

  // دالة ذكية لإنتاج التوصيات المخصصة بناءً على البيانات الفعلية
  function generateSmartRecommendations() {
    const immediateRecommendations = [];
    const mediumTermRecommendations = [];
    const longTermRecommendations = [];

    // توصيات فورية مبنية على البيانات الفعلية
    if (problematicCategories.length > 0) {
      const topProblematic = problematicCategories[0];
      const qualityPercent = getQualityPercent({averageRating: parseFloat(topProblematic.averageRating)});
      immediateRecommendations.push(`<strong>التركيز على ${topProblematic.category}:</strong> هذه المهمة تحتاج اهتماماً فورياً (جودة التقييم: ${qualityPercent}%). يُنصح بمراجعة الإجراءات وتوفير التدريب المناسب`);
      
      if (topProblematic.locations.length > 1) {
        immediateRecommendations.push(`<strong>تنسيق بين المواقع:</strong> مشكلة ${topProblematic.category} موجودة في ${topProblematic.locations.length} مواقع مختلفة، مما يتطلب حلاً موحداً`);
      }
    }

    if (lowPerformingLocations.length > 0) {
      const lowPerformingNames = lowPerformingLocations.map((loc: any) => loc.nameAr).join('، ');
      immediateRecommendations.push(`<strong>خطة طوارئ:</strong> المواقع التالية تحتاج تدخلاً فورياً: ${lowPerformingNames}`);
    }

    if (dateAnalysis && dateAnalysis.trend === 'تراجع') {
      immediateRecommendations.push(`<strong>وقف التراجع:</strong> هناك انخفاض في الأداء بمقدار ${dateAnalysis.change} نقطة، يتطلب تحليلاً فورياً للأسباب`);
    }

    // توصيات متوسطة المدى مبنية على تحليل الأنماط
    if (highPerformingLocations.length > 0 && lowPerformingLocations.length > 0) {
      const locationQuality = getQualityPercent(highPerformingLocations[0]);
      mediumTermRecommendations.push(`<strong>نقل الخبرات:</strong> استفادة من تجربة ${highPerformingLocations[0].nameAr} (جودة: ${locationQuality}%) لتحسين المواقع الأخرى`);
    }

    // تحليل أنواع المواقع المختلفة
    Object.entries(locationTypes).forEach(([type, data]: [string, any]) => {
      if (data.count > 1) {
        const avgRating = (data.totalRating / data.count).toFixed(1);
        if (getQualityPercent({averageRating: parseFloat(avgRating)}) < 60) {
          const typeQualityPercent = getQualityPercent({averageRating: parseFloat(avgRating)});
          mediumTermRecommendations.push(`<strong>تخصص في ${type}:</strong> جميع مواقع ${type} تحتاج برنامج تحسين متخصص (جودة حالية: ${typeQualityPercent}%)`);
        }
      }
    });

    if (problematicCategories.length >= 3) {
      mediumTermRecommendations.push(`<strong>مراجعة شاملة:</strong> وجود ${problematicCategories.length} فئات مشاكل يتطلب مراجعة إجراءات العمل الأساسية`);
    }

    // توصيات طويلة المدى مبنية على التحليل الاستراتيجي
    if (totalEvaluations > 50) {
      longTermRecommendations.push(`<strong>تحليل البيانات الضخمة:</strong> مع ${totalEvaluations} تقييم، يمكن تطوير نماذج تنبؤية لتحسين الأداء مستقبلياً`);
    }

    if (dateAnalysis && dateAnalysis.trend === 'تحسن') {
      longTermRecommendations.push(`<strong>استدامة التحسن:</strong> الأداء يتحسن بمعدل ${dateAnalysis.change} نقطة، يُنصح بتوثيق العوامل المساهمة وتطبيقها على نطاق أوسع`);
    }

    const uniqueLocations = new Set(allDailyReports.map((report: any) => report.locationName)).size;
    if (uniqueLocations >= 5) {
      longTermRecommendations.push(`<strong>إدارة متقدمة:</strong> مع ${uniqueLocations} موقع، يُنصح بتطوير نظام إدارة مركزي وتوحيد المعايير`);
    }

    return {
      immediate: immediateRecommendations,
      mediumTerm: mediumTermRecommendations,
      longTerm: longTermRecommendations
    };
  }

  const smartRecommendations = generateSmartRecommendations();

  // دالة ذكية لإنتاج خطة المتابعة المخصصة بناءً على البيانات الفعلية
  function generateSmartFollowUpPlan() {
    const followUpPlan = [];

    // تحليل البيانات لإنتاج خطة متابعة ذكية
    const criticalIssues = problematicCategories.slice(0, 3); // أهم 3 مشاكل
    const urgentLocations = lowPerformingLocations.slice(0, 2); // أهم موقعين يحتاجان تدخل
    const totalDays = Object.keys(evaluationsByDate).length;
    const averageOverallRating = allDailyReports.reduce((sum: number, report: any) => 
      sum + (report.averageRating || 0), 0) / allDailyReports.length;

    // الأسبوع الأول - التدخل الفوري
    if (criticalIssues.length > 0 || urgentLocations.length > 0) {
      const week1Actions = [];
      
      if (criticalIssues.length > 0) {
        week1Actions.push(`مراجعة فورية لمعايير "${criticalIssues[0].category}" في جميع المواقع`);
        week1Actions.push(`تدريب مكثف للفريق على تحسين "${criticalIssues[0].category}"`);
      }
      
      if (urgentLocations.length > 0) {
        urgentLocations.forEach((location: any) => {
          const locationQuality = getQualityPercent(location);
          week1Actions.push(`زيارة تفقدية يومية لموقع ${location.nameAr} (جودة حالية: ${locationQuality}%)`);
        });
      }
      
      // تحويل للنسبة المئوية للمقارنة الموحدة
      const overallQualityPercent = getQualityPercent({averageRating: averageOverallRating});
      if (overallQualityPercent < 50) { // حالة طوارئ - أقل من 50%
        week1Actions.push('اجتماع طوارئ مع جميع المسؤولين لوضع خطة إنقاذ فورية');
      }
      
      followUpPlan.push({
        period: 'الأسبوع الأول',
        actions: week1Actions
      });
    }

    // الأسبوع الثاني - التقييم والتعديل
    const week2Actions = [];
    
    if (criticalIssues.length > 1) {
      week2Actions.push(`تقييم شامل لتحسن "${criticalIssues[0].category}" وبدء العمل على "${criticalIssues[1].category}"`);
    }
    
    if (dateAnalysis && dateAnalysis.trend === 'تراجع') {
      week2Actions.push(`تحليل جذور أسباب التراجع البالغ ${dateAnalysis.change} نقطة ووضع خطة علاجية`);
    }
    
    if (highPerformingLocations.length > 0 && lowPerformingLocations.length > 0) {
      week2Actions.push(`تنظيم زيارة تبادل خبرات من ${highPerformingLocations[0].nameAr} إلى المواقع الأخرى`);
    }
    
    if (totalDays < 7) {
      week2Actions.push('زيادة تكرار التقييمات لجمع بيانات أكثر شمولية');
    }
    
    followUpPlan.push({
      period: 'الأسبوع الثاني',
      actions: week2Actions.length > 0 ? week2Actions : ['متابعة تطبيق خطة الأسبوع الأول وقياس النتائج']
    });

    // الشهر الأول - التحسين المنهجي
    const month1Actions = [];
    
    Object.entries(locationTypes).forEach(([type, data]: [string, any]) => {
      if (data.count > 1) {
        const avgRating = (data.totalRating / data.count).toFixed(1);
        if (getQualityPercent({averageRating: parseFloat(avgRating)}) < 75) {
          const typeQualityPercent = getQualityPercent({averageRating: parseFloat(avgRating)});
          month1Actions.push(`برنامج تحسين متخصص لجميع مواقع ${type} (جودة حالية: ${typeQualityPercent}%)`);
        }
      }
    });
    
    if (problematicCategories.length >= 2) {
      month1Actions.push(`مراجعة شاملة لإجراءات العمل في: ${problematicCategories.slice(0, 2).map(cat => cat.category).join(' و ')}`);
    }
    
    const overallQualityPercent = getQualityPercent({averageRating: averageOverallRating});
    if (overallQualityPercent >= 75) { // أداء جيد - 75% أو أكثر
      month1Actions.push('تطوير برنامج مكافآت للحفاظ على مستوى الأداء الجيد');
    } else {
      month1Actions.push('تقييم أداء الفريق وإعادة توزيع المهام حسب الكفاءات');
    }
    
    followUpPlan.push({
      period: 'الشهر الأول',
      actions: month1Actions.length > 0 ? month1Actions : ['تعزيز نظام المتابعة والتطوير المستمر']
    });

    // كل ثلاثة أشهر - التطوير الاستراتيجي
    const quarter1Actions = [];
    
    if (totalEvaluations > 30) {
      quarter1Actions.push('تحليل البيانات لوضع مؤشرات أداء متقدمة ونماذج تنبؤية');
    }
    
    const uniqueLocations = new Set(allDailyReports.map((report: any) => report.locationName)).size;
    if (uniqueLocations >= 3) {
      quarter1Actions.push(`تطوير نظام إدارة موحد لـ ${uniqueLocations} موقع مع معايير قياسية`);
    }
    
    if (dateAnalysis && dateAnalysis.trend === 'تحسن') {
      quarter1Actions.push(`توثيق عوامل النجاح المؤدية للتحسن بمقدار ${dateAnalysis.change} نقطة وتطبيقها على نطاق أوسع`);
    }
    
    quarter1Actions.push('تطوير برنامج شهادات مهنية للفريق وتحديث أدوات العمل');
    
    followUpPlan.push({
      period: 'كل ثلاثة أشهر',
      actions: quarter1Actions
    });

    return followUpPlan;
  }

  const smartFollowUpPlan = generateSmartFollowUpPlan();

  // تحضير بيانات الرسم البياني العام - معالجة محسنة للأعمدة
  console.log('📊 Processing overall chart data...');
  console.log('Locations data:', locations.length, 'items');
  
  // استخدام بيانات الـ locations مباشرة مع حساب صحيح للتقييمات من dailyReports
  const overallLocationNames = locations
    .filter((loc: any) => (loc.dailyReports || []).length > 0) // فقط المواقع التي لها تقييمات
    .map((loc: any) => loc.nameAr || loc.nameEn || 'موقع غير محدد');
    
  const overallLocationRatings = locations
    .filter((loc: any) => (loc.dailyReports || []).length > 0)
    .map((loc: any) => {
      const locationReports = loc.dailyReports || [];
      if (locationReports.length === 0) return 0;
      
      // حساب متوسط التقييم من dailyReports
      const totalRating = locationReports.reduce((sum: number, report: any) => {
        return sum + (report.averageRating || 0);
      }, 0);
      
      const averageRating = totalRating / locationReports.length;
      
      return Math.round(averageRating * 10) / 10; // التقييم بالفعل على مقياس 0-4
    });
  
  console.log('Chart names:', overallLocationNames);
  console.log('Chart ratings:', overallLocationRatings);

  // بيانات الرسم البياني لجميع المواقع حسب التاريخ - معالجة من dailyReports
  const timelineData: { date: string; average: string }[] = [];
  const allDailyReportsForTimeline = locations.flatMap((loc: any) => 
    (loc.dailyReports || []).map((report: any) => {
      let dateStr = '';
      try {
        if (typeof report.date === 'string') {
          dateStr = report.date.split('T')[0];
        } else if (report.date instanceof Date) {
          dateStr = report.date.toLocaleDateString('en-CA', {
            timeZone: 'Asia/Riyadh'
          });
        } else if (report.date) {
          dateStr = new Date(report.date).toLocaleDateString('en-CA', {
            timeZone: 'Asia/Riyadh'
          });
        } else {
          dateStr = new Date().toLocaleDateString('en-CA', {
            timeZone: 'Asia/Riyadh'
          });
        }
      } catch (error) {
        console.error('Date parsing error:', error);
        dateStr = new Date().toLocaleDateString('en-CA', {
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
      }
      
      return {
        date: dateStr,
        averageRating: report.averageRating || 0
      };
    })
  );
  
  // تجميع التقييمات حسب التاريخ
  const evaluationsByDateNew = allDailyReportsForTimeline.reduce((acc: any, item: any) => {
    if (!item.date) return acc;
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item.averageRating);
    return acc;
  }, {});
  
  // حساب المتوسط اليومي
  Object.keys(evaluationsByDateNew).sort().forEach(date => {
    const dayRatings = evaluationsByDateNew[date];
    if (dayRatings.length > 0) {
      const dayAverage = dayRatings.reduce((sum: number, rating: number) => sum + rating, 0) / dayRatings.length;
      timelineData.push({
        date: date,
        average: dayAverage.toFixed(1) // التقييم بالفعل على مقياس 0-4
      });
    }
  });
  
  console.log('Timeline data:', timelineData);

  // تحليل الاتجاه الزمني العام للأداء
  const generateTrendAnalysis = () => {
    if (timelineData.length < 2) {
      return {
        trend: 'غير محدد',
        description: 'لا توجد بيانات كافية لتحليل الاتجاه',
        change: 0,
        icon: '📊',
        color: '#6b7280'
      };
    }

    const firstValue = parseFloat(timelineData[0].average);
    const lastValue = parseFloat(timelineData[timelineData.length - 1].average);
    const change = lastValue - firstValue;
    const changePercent = ((change / firstValue) * 100).toFixed(1);

    if (change > 0.3) {
      return {
        trend: 'تحسن ملحوظ',
        description: `الأداء يتحسن بوتيرة إيجابية بزيادة ${change.toFixed(1)} نقطة (${changePercent}%)`,
        change: change.toFixed(1),
        icon: '📈',
        color: '#10b981'
      };
    } else if (change > 0.1) {
      return {
        trend: 'تحسن طفيف',
        description: `هناك تحسن تدريجي في الأداء بزيادة ${change.toFixed(1)} نقطة (${changePercent}%)`,
        change: change.toFixed(1),
        icon: '📊',
        color: '#059669'
      };
    } else if (change < -0.3) {
      return {
        trend: 'تراجع ملحوظ',
        description: `الأداء يتراجع ويحتاج تدخل فوري بانخفاض ${Math.abs(change).toFixed(1)} نقطة (${Math.abs(parseFloat(changePercent))}%)`,
        change: change.toFixed(1),
        icon: '📉',
        color: '#ef4444'
      };
    } else if (change < -0.1) {
      return {
        trend: 'تراجع طفيف',
        description: `هناك انخفاض طفيف في الأداء بانخفاض ${Math.abs(change).toFixed(1)} نقطة (${Math.abs(parseFloat(changePercent))}%)`,
        change: change.toFixed(1),
        icon: '📊',
        color: '#f59e0b'
      };
    } else {
      return {
        trend: 'استقرار',
        description: `الأداء مستقر نسبياً مع تغيير طفيف ${Math.abs(change).toFixed(1)} نقطة`,
        change: change.toFixed(1),
        icon: '🎯',
        color: '#6366f1'
      };
    }
  };

  const trendAnalysis = generateTrendAnalysis();

  return `
    <div class="analysis-section">
      <h2 class="analysis-title">📊 تحليل النتائج والتوصيات</h2>
      
      <!-- الرسم البياني العام الشامل -->
      <div class="overall-charts-section">
        <h3>📈 الرسم البياني العام لجميع المواقع</h3>
        
        <div class="charts-grid-overview">
          <div class="chart-container">
            <h4>أداء المواقع - المقارنة العامة</h4>
            <canvas id="overallLocationsChart" width="400" height="250"></canvas>
          </div>
          
          ${timelineData.length > 1 ? `
          <div class="chart-container">
            <h4>الاتجاه الزمني العام للأداء</h4>
            <canvas id="overallTimelineChart" width="400" height="250"></canvas>
          </div>
          ` : ''}
        </div>
        
        <script type="text/javascript">
          // رسم بياني شامل لجميع المواقع
          const overallLocationsCtx = document.getElementById('overallLocationsChart').getContext('2d');
          new Chart(overallLocationsCtx, {
            type: 'bar',
            data: {
              labels: ${JSON.stringify(overallLocationNames)},
              datasets: [{
                label: 'متوسط التقييم',
                data: ${JSON.stringify(overallLocationRatings)},
                backgroundColor: function(context) {
                  const value = parseFloat(context.parsed.y);
                  // تحويل المقياس: 80% = 3.2, 60% = 2.4, 40% = 1.6
                  if (value >= 3.2) return 'rgba(34, 197, 94, 0.8)'; // ممتاز (80%+) - أخضر
                  if (value >= 2.4) return 'rgba(251, 191, 36, 0.8)'; // جيد (60%+) - أصفر
                  if (value >= 1.6) return 'rgba(249, 115, 22, 0.8)'; // مقبول (40%+) - برتقالي
                  return 'rgba(239, 68, 68, 0.8)'; // ضعيف - أحمر
                },
                borderColor: function(context) {
                  const value = parseFloat(context.parsed.y);
                  // تحويل المقياس: 80% = 3.2, 60% = 2.4, 40% = 1.6
                  if (value >= 3.2) return 'rgb(34, 197, 94)';
                  if (value >= 2.4) return 'rgb(251, 191, 36)';
                  if (value >= 1.6) return 'rgb(249, 115, 22)';
                  return 'rgb(239, 68, 68)';
                },
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
              }]
            },
            options: {
              responsive: true,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    afterLabel: function(context) {
                      const value = parseFloat(context.parsed.y);
                      // عتبات موحدة: 80% = 3.2, 60% = 2.4, 40% = 1.6
                      if (value >= 3.2) return 'أداء ممتاز ⭐⭐⭐⭐';
                      if (value >= 2.4) return 'أداء جيد ⭐⭐⭐';
                      if (value >= 1.6) return 'أداء مقبول ⭐⭐';
                      return 'يحتاج تحسين ⭐';
                    }
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 4,
                  ticks: {
                    stepSize: 1,
                    callback: function(value) {
                      const labels = ['', 'ضعيف', 'مقبول', 'جيد', 'ممتاز'];
                      return labels[value] || value;
                    }
                  }
                },
                x: {
                  ticks: {
                    maxRotation: 45,
                    font: { size: 10 }
                  }
                }
              }
            }
          });
          
          ${timelineData.length > 1 ? `
          // رسم بياني للاتجاه الزمني العام
          const overallTimelineCtx = document.getElementById('overallTimelineChart').getContext('2d');
          new Chart(overallTimelineCtx, {
            type: 'line',
            data: {
              labels: ${JSON.stringify(timelineData.map(item => item.date))},
              datasets: [{
                label: 'متوسط الأداء اليومي',
                data: ${JSON.stringify(timelineData.map(item => item.average))},
                borderColor: '#fbbf24',
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: function(context) {
                  const value = parseFloat(context.parsed.y);
                  // عتبات موحدة: 80% = 3.2, 60% = 2.4, 40% = 1.6
                  if (value >= 3.2) return '#22c55e'; // أخضر (ممتاز)
                  if (value >= 2.4) return '#fbbf24'; // أصفر (جيد)
                  if (value >= 1.6) return '#f97316'; // برتقالي (مقبول)
                  return '#ef4444'; // أحمر (ضعيف)
                },
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
              }]
            },
            options: {
              responsive: true,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    afterLabel: function(context) {
                      const value = parseFloat(context.parsed.y);
                      // عتبات موحدة: 80% = 3.2, 60% = 2.4, 40% = 1.6
                      if (value >= 3.2) return 'يوم ممتاز ⭐⭐⭐⭐';
                      if (value >= 2.4) return 'يوم جيد ⭐⭐⭐';
                      if (value >= 1.6) return 'يوم مقبول ⭐⭐';
                      return 'يوم يحتاج تحسين ⭐';
                    }
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 4,
                  ticks: {
                    stepSize: 1,
                    callback: function(value) {
                      const labels = ['', 'ضعيف', 'مقبول', 'جيد', 'ممتاز'];
                      return labels[value] || value;
                    }
                  }
                },
                x: {
                  ticks: {
                    maxRotation: 45,
                    font: { size: 10 }
                  }
                }
              }
            }
          });
          
          // إضافة شرح الاتجاه الزمني
          const trendContainer = document.createElement('div');
          trendContainer.className = 'trend-analysis-container';
          trendContainer.innerHTML = \`
            <div class="trend-analysis">
              <div class="trend-icon" style="color: ${trendAnalysis.color}">
                ${trendAnalysis.icon}
              </div>
              <div class="trend-content">
                <h4 class="trend-title" style="color: ${trendAnalysis.color}">
                  ${trendAnalysis.trend}
                </h4>
                <p class="trend-description">
                  ${trendAnalysis.description}
                </p>
              </div>
            </div>
          \`;
          
          const chartContainer = document.getElementById('overallTimelineChart').parentElement;
          chartContainer.appendChild(trendContainer);
          ` : ''}
        </script>
      </div>
      
      <!-- ملخص الأداء العام -->
      <div class="performance-summary">
        <h3>📈 ملخص الأداء العام</h3>
        <div class="performance-metrics">

          <div class="metric-card ${overallQualityPercent >= 80 ? 'excellent' : overallQualityPercent >= 60 ? 'good' : 'needs-improvement'}">
            <div class="metric-title">جودة التقييم العامة</div>
            <div class="metric-value">${overallQualityPercent}%</div>
            <div class="metric-status">
              ${overallQualityPercent >= 80 ? '🟢 ممتاز' : overallQualityPercent >= 60 ? '🟡 جيد' : '🔴 يحتاج تحسين'}
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-title">إجمالي التقييمات</div>
            <div class="metric-value">${totalEvaluations}</div>
            <div class="metric-status">📊 البيانات</div>
          </div>
        </div>
      </div>

      <!-- تحليل الأداء حسب الموقع -->
      <div class="location-analysis">
        <h3>🏢 تحليل الأداء حسب المواقع</h3>
        
        ${highPerformingLocations.length > 0 ? `
        <div class="performance-category excellent-locations">
          <h4>🟢 المواقع عالية الأداء (${highPerformingLocations.length} موقع)</h4>
          <ul>
            ${highPerformingLocations.map((loc: any) => {
              const qualityPercent = getQualityPercent(loc);
              return `<li><strong>${loc.nameAr}</strong> - جودة: ${qualityPercent}%</li>`;
            }).join('')}
          </ul>
          <div class="insight">💡 هذه المواقع تُدار بشكل ممتاز ويمكن اعتمادها كنموذج للمواقع الأخرى</div>
        </div>
        ` : ''}

        ${moderatePerformingLocations.length > 0 ? `
        <div class="performance-category moderate-locations">
          <h4>🟡 المواقع متوسطة الأداء (${moderatePerformingLocations.length} موقع)</h4>
          <ul>
            ${moderatePerformingLocations.map((loc: any) => {
              const qualityPercent = getQualityPercent(loc);
              return `<li><strong>${loc.nameAr}</strong> - جودة: ${qualityPercent}%</li>`;
            }).join('')}
          </ul>
          <div class="insight">⚠️ هذه المواقع تحتاج إلى تحسينات طفيفة لتصل للمستوى المطلوب</div>
        </div>
        ` : ''}

        ${lowPerformingLocations.length > 0 ? `
        <div class="performance-category low-locations">
          <h4>🔴 المواقع التي تحتاج اهتماماً خاصاً (${lowPerformingLocations.length} موقع)</h4>
          <ul>
            ${lowPerformingLocations.map((loc: any) => {
              const qualityPercent = getQualityPercent(loc);
              return `<li><strong>${loc.nameAr}</strong> - جودة: ${qualityPercent}%</li>`;
            }).join('')}
          </ul>
          <div class="insight">🚨 هذه المواقع تحتاج إلى خطة تحسين فورية</div>
        </div>
        ` : ''}
      </div>

      <!-- تحليل المهام الإشكالية -->
      ${problematicCategories.length > 0 ? `
      <div class="task-analysis">
        <h3>🛠️ المهام التي تحتاج تركيز خاص</h3>
        <div class="problematic-tasks">
          ${problematicCategories.slice(0, 5).map((task: any) => `
            <div class="task-issue">
              <div class="task-name">${task.category}</div>
              <div class="task-stats">
                <span>جودة التقييم: ${getQualityPercent({averageRating: parseFloat(task.averageRating)})}%</span>
                <span>العدد الكلي: ${task.total}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- التوصيات العملية الذكية -->
      <div class="recommendations">
        <h3>🎯 التوصيات العملية المبنية على تحليل البيانات</h3>
        
        <div class="recommendation-category">
          <h4>⚡ توصيات فورية (يمكن تنفيذها خلال أسبوع)</h4>
          <ul class="recommendation-list">
            ${smartRecommendations.immediate.length > 0 ? 
              smartRecommendations.immediate.map(rec => `<li>${rec}</li>`).join('') : 
              '<li><strong>🎉 الأداء ممتاز:</strong> لا توجد مشاكل عاجلة تحتاج تدخل فوري، يُنصح بالحفاظ على المستوى الحالي</li>'
            }
            ${smartRecommendations.immediate.length === 0 ? `
              <li><strong>المراقبة المستمرة:</strong> رغم عدم وجود مشاكل عاجلة، يُنصح بالمتابعة الدورية للحفاظ على الجودة</li>
              <li><strong>تحفيز الفريق:</strong> الاعتراف بالأداء الجيد وتحفيز الفريق لاستمرار التميز</li>
            ` : ''}
          </ul>
        </div>

        <div class="recommendation-category">
          <h4>🏗️ توصيات متوسطة المدى (شهر إلى ثلاثة أشهر)</h4>
          <ul class="recommendation-list">
            ${smartRecommendations.mediumTerm.length > 0 ? 
              smartRecommendations.mediumTerm.map(rec => `<li>${rec}</li>`).join('') : ''
            }
            ${smartRecommendations.mediumTerm.length === 0 ? `
              <li><strong>توحيد المعايير:</strong> إنشاء دليل موحد لمعايير النظافة لجميع المواقع</li>
              <li><strong>التدريب المتقدم:</strong> برامج تدريبية متخصصة لتطوير مهارات الفريق</li>
            ` : ''}
            <li><strong>نظام التقييم المطور:</strong> تحسين نظام التقييم بناءً على النتائج الحالية</li>
            <li><strong>تبادل الخبرات:</strong> تنظيم ورش عمل لتبادل أفضل الممارسات بين الفرق</li>
          </ul>
        </div>

        <div class="recommendation-category">
          <h4>🚀 توصيات طويلة المدى (أكثر من ثلاثة أشهر)</h4>
          <ul class="recommendation-list">
            ${smartRecommendations.longTerm.length > 0 ? 
              smartRecommendations.longTerm.map(rec => `<li>${rec}</li>`).join('') : ''
            }
            ${smartRecommendations.longTerm.length === 0 ? `
              <li><strong>الأتمتة والتقنية:</strong> استخدام تقنيات ذكية لمراقبة وتحسين الأداء</li>
            ` : ''}
            <li><strong>التطوير المهني:</strong> برنامج شهادات مهنية متخصصة للعاملين</li>
            <li><strong>الاستدامة:</strong> التحول إلى حلول صديقة للبيئة وموفرة للطاقة</li>
            <li><strong>التوسع الذكي:</strong> تطبيق الدروس المستفادة على مواقع ومشاريع جديدة</li>
          </ul>
        </div>

        ${dateAnalysis ? `
        <div class="trend-analysis">
          <h4>📈 تحليل الاتجاه الزمني</h4>
          <div class="trend-indicator ${dateAnalysis.trend === 'تحسن' ? 'improving' : dateAnalysis.trend === 'تراجع' ? 'declining' : 'stable'}">
            <span class="trend-label">الاتجاه العام: ${dateAnalysis.trend}</span>
            <span class="trend-change">مقدار التغيير: ${dateAnalysis.change} نقطة</span>
          </div>
        </div>
        ` : ''}
      </div>

      <!-- خطة المتابعة المقترحة الذكية -->
      <div class="follow-up-plan">
        <h3>📅 خطة المتابعة المخصصة بناءً على التحليل</h3>
        
        <div class="follow-up-timeline">
          ${smartFollowUpPlan.map(phase => `
            <div class="timeline-item">
              <div class="timeline-period">${phase.period}</div>
              <div class="timeline-action">
                <ul class="timeline-actions-list">
                  ${phase.actions.map(action => `<li>${action}</li>`).join('')}
                </ul>
              </div>
            </div>
          `).join('')}
        </div>

        ${smartFollowUpPlan.length === 0 ? `
        <div class="no-followup">
          <p><strong>🎉 أداء ممتاز!</strong> النظام يعمل بكفاءة عالية ولا يحتاج خطة متابعة خاصة حالياً.</p>
          <p><strong>التوصية:</strong> الحفاظ على نفس مستوى الأداء مع مراجعة دورية شهرية.</p>
        </div>
        ` : ''}

        <div class="plan-summary">
          <h4>📊 ملخص الخطة المخصصة</h4>
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-label">إجمالي التقييمات المحللة:</span>
              <span class="stat-value">${totalEvaluations} تقييم</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">المواقع المشمولة:</span>
              <span class="stat-value">${new Set(allDailyReports.map((report: any) => report.locationName)).size} موقع</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">فترة التحليل:</span>
              <span class="stat-value">${Object.keys(evaluationsByDate).length} يوم</span>
            </div>
            ${dateAnalysis ? `
            <div class="stat-item">
              <span class="stat-label">الاتجاه العام:</span>
              <span class="stat-value trend-${dateAnalysis.trend === 'تحسن' ? 'improving' : dateAnalysis.trend === 'تراجع' ? 'declining' : 'stable'}">${dateAnalysis.trend}</span>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

export function generateHTMLReport(reportData: any): string {
  const locations = reportData.locations || [];
  const analysisSection = analyzeDataAndGenerateRecommendations(reportData);
  
  const generateLocationSection = (location: any) => {
    const dailyReports = location.dailyReports || [];
    
    if (dailyReports.length === 0) {
      return `
        <div class="location-section">
          <h3 class="location-title">${location.nameAr} (${location.nameEn})</h3>
          <div class="no-data">لا توجد تقييمات لهذا الموقع في الفترة المحددة</div>
        </div>
      `;
    }

    const dailyReportsHTML = dailyReports.map((daily: any) => {
      // استخراج الوقت من التاريخ
      const dateTime = new Date(daily.date);
      const timeString = dateTime.toLocaleTimeString('ar-EG', { 
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      return `
      <div class="daily-report">
        <div class="daily-header">
          <h4>${daily.dateFormatted}</h4>
          <div class="daily-meta">
            <span>المقيم: ${daily.userFullName}</span>
            <span>الوقت: ${timeString}</span>
            <span>التقييم العام: ${daily.averageRatingText}</span>
          </div>
        </div>
        
        <div class="tasks-grid">
          ${daily.tasks.map((task: any) => `
            <div class="task-item ${task.completed ? 'completed' : 'incomplete'}">
              <div class="task-category">${task.categoryAr}</div>
              <div class="task-name">${task.taskAr}</div>
              <div class="task-status">
                <span class="status">${task.completedText}</span>
                <span class="rating">${task.ratingText}</span>
              </div>
              ${task.itemComment ? `
                <div class="task-comment">
                  <strong>ملاحظة البند:</strong> ${task.itemComment}
                </div>
              ` : ''}
              ${task.notes ? `
                <div class="task-notes">
                  <strong>ملاحظة إضافية:</strong> ${task.notes}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
        
        ${daily.evaluationNotes ? `
          <div class="evaluation-notes">
            <strong>ملاحظات التقييم:</strong>
            <p>${daily.evaluationNotes}</p>
          </div>
        ` : ''}
      </div>
    `;
    }).join('');

    // تحضير بيانات الرسم البياني
    const locationId = `location_${location.id}`;
    
    // تجميع البيانات حسب المستخدم
    const userPerformance: Record<string, {
      totalEvaluations: number;
      averageRating: string;
      totalRating: number;
      ratedTasks: number;
    }> = {};
    
    dailyReports.forEach((daily: any) => {
      const userName = daily.userFullName;
      if (!userPerformance[userName]) {
        userPerformance[userName] = {
          totalEvaluations: 0,
          averageRating: '0.0',
          totalRating: 0,
          ratedTasks: 0
        };
      }
      
      userPerformance[userName].totalEvaluations++;
      
      // حساب متوسط التقييمات
      daily.tasks.forEach((task: any) => {
        if (task.rating && task.rating >= 1 && task.rating <= 4) {
          userPerformance[userName].totalRating += task.rating;
          userPerformance[userName].ratedTasks++;
        }
      });
    });
    
    // حساب المتوسطات النهائية
    Object.keys(userPerformance).forEach(userName => {
      const user = userPerformance[userName];
      user.averageRating = user.ratedTasks > 0 
        ? (user.totalRating / user.ratedTasks).toFixed(1)
        : '0.0';
    });
    
    const userNames = Object.keys(userPerformance);
    const userAverageRatings = userNames.map(name => parseFloat(userPerformance[name].averageRating));
    
    // تحليل أداء المواقع حسب المستخدم
    const locationUserPerformance: Record<string, Record<string, { totalRating: number; count: number; avgRating: number }>> = {};
    
    dailyReports.forEach((daily: any) => {
      const userName = daily.userFullName;
      const locationName = location.nameAr;
      
      if (!locationUserPerformance[userName]) {
        locationUserPerformance[userName] = {};
      }
      
      if (!locationUserPerformance[userName][locationName]) {
        locationUserPerformance[userName][locationName] = { totalRating: 0, count: 0, avgRating: 0 };
      }
      
      daily.tasks.forEach((task: any) => {
        if (task.rating && task.rating >= 1 && task.rating <= 4) {
          locationUserPerformance[userName][locationName].totalRating += task.rating;
          locationUserPerformance[userName][locationName].count++;
        }
      });
    });
    
    // حساب متوسط التقييم لكل مستخدم في كل موقع
    Object.keys(locationUserPerformance).forEach(userName => {
      Object.keys(locationUserPerformance[userName]).forEach(locationName => {
        const data = locationUserPerformance[userName][locationName];
        data.avgRating = data.count > 0 ? data.totalRating / data.count : 0;
      });
    });
    
    // تحضير بيانات الرسم البياني للمواقع حسب المستخدم
    const locationRatingsData = userNames.map(userName => {
      const locationData = locationUserPerformance[userName];
      return locationData && locationData[location.nameAr] ? locationData[location.nameAr].avgRating : 0;
    });
    
    // تحليل الموقع - تجميع المهام حسب نوعها مع استخدام أسماء المهام الصحيحة
    const taskPerformance: Record<string, { totalRating: number; count: number; avgRating: number }> = {};
    
    // طباعة بنية البيانات للتشخيص
    console.log('تشخيص بيانات المهام:', JSON.stringify(dailyReports[0]?.tasks?.slice(0, 2), null, 2));
    
    dailyReports.forEach((daily: any) => {
      daily.tasks.forEach((task: any) => {
        if (task.rating && task.rating >= 1 && task.rating <= 4) {
          // تجربة جميع الحقول الممكنة لاسم المهمة
          let taskKey = '';
          const possibleKeys = [
            task.nameAr, task.taskAr, task.name, task.categoryAr, 
            task.category, task.taskName, task.templateNameAr,
            task.templateName, task.checklistName, task.checklistNameAr,
            task.itemNameAr, task.itemName
          ];
          
          for (const key of possibleKeys) {
            if (key && typeof key === 'string' && key.trim() !== '') {
              taskKey = key.trim();
              break;
            }
          }
          
          // إذا لم نجد اسم، استخدم معرف فريد
          if (!taskKey) {
            taskKey = `بند التقييم ${task.templateId || task.id || Math.random().toString(36).substr(2, 5)}`;
          }
          
          if (!taskPerformance[taskKey]) {
            taskPerformance[taskKey] = { totalRating: 0, count: 0, avgRating: 0 };
          }
          taskPerformance[taskKey].totalRating += task.rating;
          taskPerformance[taskKey].count++;
        }
      });
    });
    
    // حساب متوسط التقييم لكل مهمة
    Object.keys(taskPerformance).forEach(taskKey => {
      const task = taskPerformance[taskKey];
      task.avgRating = task.count > 0 ? task.totalRating / task.count : 0;
    });
    
    // ترتيب المهام حسب أعلى تقييم وأخذ أول 10 مهام للرسم الأول
    const sortedTasks = Object.entries(taskPerformance)
      .filter(([name, data]) => data.count > 0) // فقط المهام التي لها تقييمات
      .sort((a, b) => b[1].count - a[1].count) // ترتيب حسب عدد التقييمات أولاً
      .slice(0, 10);
    
    const taskNames = sortedTasks.map(([name]) => name);
    const taskRatings = sortedTasks.map(([, data]) => data.avgRating);
    
    // حساب المتوسط الإجمالي للموقع للرسم الثاني
    const allRatings = Object.values(taskPerformance).filter(task => task.count > 0);
    const overallAverage = allRatings.length > 0 
      ? allRatings.reduce((sum, task) => sum + task.avgRating, 0) / allRatings.length 
      : 0;
    
    // بيانات الرسم الثاني - عمود واحد فقط للمتوسط الإجمالي
    const overallTaskNames = [location.nameAr]; // اسم الموقع فقط
    const overallTaskRatings = [overallAverage]; // المتوسط الإجمالي فقط
    
    // إحصائيات التقييمات العامة
    const ratingDistribution = [0, 0, 0, 0]; // للتقييمات 1-4
    dailyReports.forEach((daily: any) => {
      daily.tasks.forEach((task: any) => {
        if (task.rating && task.rating >= 1 && task.rating <= 4) {
          ratingDistribution[task.rating - 1]++;
        }
      });
    });

    return `
      <div class="location-section">
        <h3 class="location-title">${location.nameAr} (${location.nameEn})</h3>
        <div class="location-summary">
          <div class="summary-item">
            <span class="label">إجمالي التقييمات:</span>
            <span class="value">${location.totalEvaluations}</span>
          </div>

          <div class="summary-item">
            <span class="label">التقييم العام:</span>
            <span class="value">${getQualityPercent(location)}%</span>
          </div>
          <div class="summary-item">
            <span class="label">عدد المقيمين:</span>
            <span class="value">${location.uniqueUsers}</span>
          </div>
        </div>
        
        <!-- الرسوم البيانية للموقع والمستخدم -->
        <div class="charts-section">
          <h4 class="charts-title">📊 تحليل الأداء حسب الموقع والمستخدم</h4>
          <div class="charts-grid">
            <div class="chart-container">
              <h5>🏢 أداء الموقع - متوسط التقييمات</h5>
              <canvas id="locationPerformanceChart_${locationId}" width="400" height="250"></canvas>
            </div>
            <div class="chart-container">
              <h5>📊 متوسط تقييم الموقع اجمالي</h5>
              <canvas id="taskPerformanceChart_${locationId}" width="400" height="300"></canvas>
            </div>
          </div>
        </div>
        ${dailyReportsHTML}
        
        <script type="text/javascript">
          // رسم بياني لأداء الموقع - المهام والتقييمات
          const locationPerformanceCtx_${locationId} = document.getElementById('locationPerformanceChart_${locationId}').getContext('2d');
          new Chart(locationPerformanceCtx_${locationId}, {
            type: 'bar',
            data: {
              labels: ${JSON.stringify(taskNames)},
              datasets: [{
                label: 'متوسط التقييم',
                data: ${JSON.stringify(taskRatings)},
                backgroundColor: function(context) {
                  const value = context.parsed.y;
                  // عتبات موحدة: 80% = 3.2, 60% = 2.4, 40% = 1.6
                  if (value >= 3.2) return 'rgba(34, 197, 94, 0.8)'; // ممتاز (80%+)
                  if (value >= 2.4) return 'rgba(251, 191, 36, 0.8)'; // جيد (60%+)
                  if (value >= 1.6) return 'rgba(249, 115, 22, 0.8)'; // مقبول (40%+)
                  return 'rgba(239, 68, 68, 0.8)'; // ضعيف
                },
                borderColor: function(context) {
                  const value = context.parsed.y;
                  // عتبات موحدة: 80% = 3.2, 60% = 2.4, 40% = 1.6
                  if (value >= 3.2) return 'rgb(34, 197, 94)';
                  if (value >= 2.4) return 'rgb(251, 191, 36)';
                  if (value >= 1.6) return 'rgb(249, 115, 22)';
                  return 'rgb(239, 68, 68)';
                },
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
              }]
            },
            options: {
              responsive: true,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    afterLabel: function(context) {
                      const value = context.parsed.y;
                      // عتبات موحدة: 80% = 3.2, 60% = 2.4, 40% = 1.6
                      if (value >= 3.2) return 'أداء ممتاز ⭐⭐⭐⭐';
                      if (value >= 2.4) return 'أداء جيد ⭐⭐⭐';
                      if (value >= 1.6) return 'أداء مقبول ⭐⭐';
                      return 'يحتاج تحسين ⭐';
                    }
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 4,
                  ticks: {
                    stepSize: 1,
                    callback: function(value) {
                      const labels = ['', 'ضعيف', 'مقبول', 'جيد', 'ممتاز'];
                      return labels[value] || value;
                    }
                  }
                },
                x: {
                  ticks: {
                    maxRotation: 45,
                    font: { size: 10 }
                  }
                }
              }
            }
          });
          
          // رسم بياني عمودي لمتوسط تقييم الموقع الإجمالي (عمود واحد)
          const taskPerformanceCtx_${locationId} = document.getElementById('taskPerformanceChart_${locationId}').getContext('2d');
          new Chart(taskPerformanceCtx_${locationId}, {
            type: 'bar',
            data: {
              labels: ${JSON.stringify(overallTaskNames)},
              datasets: [{
                label: 'متوسط التقييم الإجمالي',
                data: ${JSON.stringify(overallTaskRatings)},
                backgroundColor: function(context) {
                  const value = context.parsed.y;
                  // عتبات موحدة: 80% = 3.2, 60% = 2.4, 40% = 1.6
                  if (value >= 3.2) return 'rgba(34, 197, 94, 0.8)'; // أخضر ممتاز (80%+)
                  if (value >= 2.4) return 'rgba(251, 191, 36, 0.8)'; // أصفر جيد (60%+)
                  if (value >= 1.6) return 'rgba(249, 115, 22, 0.8)'; // برتقالي مقبول (40%+)
                  return 'rgba(239, 68, 68, 0.8)'; // أحمر يحتاج تحسين
                },
                borderColor: function(context) {
                  const value = context.parsed.y;
                  // عتبات موحدة: 80% = 3.2, 60% = 2.4, 40% = 1.6
                  if (value >= 3.2) return '#16a34a';
                  if (value >= 2.4) return '#f59e0b';
                  if (value >= 1.6) return '#ea580c';
                  return '#dc2626';
                },
                borderWidth: 2,
                borderRadius: 6,
                borderSkipped: false,
                hoverBackgroundColor: function(context) {
                  const value = context.parsed.y;
                  // عتبات موحدة: 80% = 3.2, 60% = 2.4, 40% = 1.6
                  if (value >= 3.2) return 'rgba(34, 197, 94, 0.9)';
                  if (value >= 2.4) return 'rgba(251, 191, 36, 0.9)';
                  if (value >= 1.6) return 'rgba(249, 115, 22, 0.9)';
                  return 'rgba(239, 68, 68, 0.9)';
                }
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  titleColor: '#fff',
                  bodyColor: '#fff',
                  borderColor: '#fbbf24',
                  borderWidth: 2,
                  callbacks: {
                    title: function(context) {
                      return 'المهمة: ' + context[0].label;
                    },
                    label: function(context) {
                      const value = context.parsed.y;
                      let performance = '';
                      // عتبات موحدة: 80% = 3.2, 60% = 2.4, 40% = 1.6
                      if (value >= 3.2) performance = 'ممتاز ⭐⭐⭐⭐';
                      else if (value >= 2.4) performance = 'جيد ⭐⭐⭐';
                      else if (value >= 1.6) performance = 'مقبول ⭐⭐';
                      else if (value > 0) performance = 'يحتاج تحسين ⭐';
                      else performance = 'لا توجد تقييمات';
                      
                      const qualityPercent = Math.round((value / 4) * 100);
                      return 'جودة التقييم: ' + qualityPercent + '% - ' + performance;
                    },
                    afterLabel: function(context) {
                      const value = context.parsed.y;
                      // عتبات موحدة: 80% = 3.2, 60% = 2.4, 40% = 1.6
                      if (value >= 3.2) return '🟢 أداء ممتاز';
                      else if (value >= 2.4) return '🟡 أداء جيد';
                      else if (value >= 1.6) return '🟠 أداء مقبول';
                      else if (value > 0) return '🔴 يحتاج تحسين';
                      else return '⚪ لا توجد بيانات';
                    }
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 4,
                  ticks: {
                    stepSize: 0.5,
                    callback: function(value) {
                      const labels = {
                        0: '0',
                        1: '1 - ضعيف',
                        2: '2 - مقبول', 
                        3: '3 - جيد',
                        4: '4 - ممتاز'
                      };
                      return labels[value] || value;
                    },
                    font: {
                      family: 'Segoe UI, IBM Plex Sans Arabic, Arial',
                      size: 10
                    }
                  },
                  grid: {
                    color: 'rgba(0, 0, 0, 0.1)',
                    drawBorder: false
                  }
                },
                x: {
                  ticks: {
                    maxRotation: 45,
                    font: {
                      family: 'Segoe UI, IBM Plex Sans Arabic, Arial',
                      size: 9,
                      weight: 'bold'
                    }
                  },
                  grid: {
                    display: false
                  }
                }
              },
              animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
              },
              interaction: {
                intersect: false,
                mode: 'index'
              }
            }
          });
        </script>
      </div>
    `;
  };

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تقرير نظام بيئة العمل - HSA GROUP</title>
    <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', 'Amiri', 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
            padding: 20px;
            direction: rtl;
        }
        
        .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .report-header {
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            color: #1a1a1a;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        
        .company-name {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 10px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }
        
        .report-title {
            font-size: 1.8em;
            margin-bottom: 15px;
        }
        
        .report-period {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .report-meta {
            background: #f8f9fa;
            padding: 20px;
            border-bottom: 1px solid #dee2e6;
        }
        
        .meta-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .meta-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border-right: 4px solid #fbbf24;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .meta-label {
            font-size: 0.9em;
            color: #666;
            margin-bottom: 5px;
        }
        
        .meta-value {
            font-size: 1.3em;
            font-weight: bold;
            color: #333;
        }
        
        .report-content {
            padding: 30px;
        }
        
        .location-section {
            margin-bottom: 40px;
            border: 1px solid #dee2e6;
            border-radius: 10px;
            overflow: hidden;
        }
        
        .location-title {
            background: linear-gradient(135deg, #374151, #1f2937);
            color: white;
            padding: 18px 25px;
            margin: 0;
            font-size: 1.5em;
            font-weight: bold;
            border-radius: 10px 10px 0 0;
        }
        
        .location-summary {
            background: #f8f9fa;
            padding: 20px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        
        .summary-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        
        .summary-item .label {
            display: block;
            font-size: 0.9em;
            color: #666;
            margin-bottom: 5px;
        }
        
        .summary-item .value {
            display: block;
            font-size: 1.5em;
            font-weight: bold;
            color: #f59e0b;
        }
        
        .daily-report {
            border-top: 1px solid #dee2e6;
            padding: 20px;
        }
        
        .daily-header {
            margin-bottom: 20px;
        }
        
        .daily-header h4 {
            font-size: 1.3em;
            color: #333;
            margin-bottom: 10px;
        }
        
        .daily-meta {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            font-size: 0.9em;
            color: #666;
        }
        
        .tasks-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .task-item {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            transition: all 0.3s ease;
        }
        
        .task-item.completed {
            background: #dcfce7;
            border-color: #bbf7d0;
            border-right: 4px solid #10b981;
        }
        
        .task-item.incomplete {
            background: #fef2f2;
            border-color: #fecaca;
            border-right: 4px solid #ef4444;
        }
        
        .task-category {
            font-size: 0.8em;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        
        .task-name {
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
        }
        
        .task-status {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.9em;
        }
        
        .status {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
        }
        
        .completed .status {
            background: #28a745;
            color: white;
        }
        
        .incomplete .status {
            background: #dc3545;
            color: white;
        }
        
        .rating {
            font-weight: bold;
            color: #ffd700;
        }
        
        .task-comment, .task-notes {
            margin-top: 10px;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.7);
            border-radius: 6px;
            border-right: 3px solid #3b82f6;
            font-size: 0.85em;
            line-height: 1.4;
        }
        
        .task-comment strong, .task-notes strong {
            color: #3b82f6;
            font-weight: 600;
            display: block;
            margin-bottom: 4px;
        }
        
        .task-comment {
            border-right-color: #10b981;
        }
        
        .task-comment strong {
            color: #10b981;
        }
        
        .task-notes {
            border-right-color: #f59e0b;
        }
        
        .task-notes strong {
            color: #f59e0b;
        }
        
        .evaluation-notes {
            background: #e9ecef;
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
        }
        
        .evaluation-notes strong {
            color: #495057;
            margin-bottom: 10px;
            display: block;
        }
        
        .evaluation-notes p {
            color: #6c757d;
            line-height: 1.5;
        }
        
        /* تنسيق الرسوم البيانية */
        .charts-section {
            background: #f8f9fa;
            padding: 25px;
            margin: 20px 0;
            border-radius: 10px;
            border: 2px solid #fbbf24;
        }
        
        .charts-title {
            font-size: 1.4em;
            color: #333;
            margin-bottom: 20px;
            text-align: center;
            font-weight: bold;
        }
        
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 25px;
        }
        
        .chart-container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border: 1px solid #dee2e6;
        }
        
        .chart-container h5 {
            font-size: 1.1em;
            color: #333;
            margin-bottom: 15px;
            text-align: center;
            font-weight: bold;
            border-bottom: 2px solid #fbbf24;
            padding-bottom: 10px;
        }
        
        .chart-container canvas {
            max-height: 300px;
        }
        
        .chart-container.full-width {
            grid-column: 1 / -1;
        }
        
        .no-data {
            padding: 40px;
            text-align: center;
            color: #6c757d;
            font-style: italic;
        }
        
        .report-footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #dee2e6;
            color: #6c757d;
            font-size: 0.9em;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .report-container {
                box-shadow: none;
                border-radius: 0;
            }
            
            .daily-report {
                page-break-inside: avoid;
            }
            
            .charts-grid {
                grid-template-columns: 1fr;
            }
            
            .chart-container {
                max-height: 300px;
                overflow: hidden;
            }
            
            .location-section {
                page-break-inside: avoid;
                margin-bottom: 30px;
            }
        }
        
        /* تنسيق قسم التحليل والتوصيات */
        .analysis-section {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 30px;
            margin: 30px 0;
            border-radius: 15px;
            border: 2px solid #fbbf24;
        }

        .analysis-title {
            color: #f59e0b;
            font-size: 1.8em;
            margin-bottom: 25px;
            text-align: center;
            border-bottom: 3px solid #fbbf24;
            padding-bottom: 15px;
        }

        .section-title {
            color: #374151;
            font-size: 1.6em;
            margin: 30px 0 20px 0;
            padding: 15px;
            background: linear-gradient(90deg, #fbbf24, #f59e0b);
            color: white;
            border-radius: 10px;
        }

        .performance-summary {
            margin-bottom: 30px;
        }

        .performance-metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            border: 2px solid #e5e7eb;
            transition: transform 0.3s ease;
        }

        .metric-card:hover {
            transform: translateY(-5px);
        }

        .metric-card.excellent {
            border-color: #10b981;
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        }

        .metric-card.good {
            border-color: #f59e0b;
            background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
        }

        .metric-card.needs-improvement {
            border-color: #ef4444;
            background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
        }

        .metric-title {
            font-size: 0.9em;
            color: #6b7280;
            margin-bottom: 10px;
        }

        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 5px;
        }

        .metric-status {
            font-size: 0.8em;
            font-weight: bold;
        }

        .location-analysis, .task-analysis, .recommendations {
            margin: 30px 0;
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .performance-category {
            margin: 20px 0;
            padding: 20px;
            border-radius: 10px;
        }

        .excellent-locations {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border-right: 5px solid #10b981;
        }

        .moderate-locations {
            background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
            border-right: 5px solid #f59e0b;
        }

        .low-locations {
            background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
            border-right: 5px solid #ef4444;
        }

        .insight {
            background: rgba(255,255,255,0.8);
            padding: 12px;
            border-radius: 8px;
            margin-top: 15px;
            font-style: italic;
            border-right: 3px solid #6b7280;
        }

        .problematic-tasks {
            display: grid;
            gap: 15px;
        }

        .task-issue {
            background: #f9fafb;
            padding: 15px;
            border-radius: 8px;
            border-right: 4px solid #ef4444;
        }

        .task-name {
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 8px;
        }

        .task-stats {
            display: flex;
            gap: 15px;
            font-size: 0.9em;
            color: #6b7280;
        }

        .recommendation-category {
            margin: 25px 0;
            padding: 20px;
            background: #f8fafc;
            border-radius: 10px;
            border-right: 4px solid #3b82f6;
        }

        .recommendation-list {
            list-style: none;
            padding: 0;
        }

        .recommendation-list li {
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
            line-height: 1.6;
        }

        .recommendation-list li:last-child {
            border-bottom: none;
        }

        .follow-up-plan {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            padding: 25px;
            border-radius: 12px;
            margin-top: 30px;
        }

        .follow-up-timeline {
            display: grid;
            gap: 15px;
        }

        .timeline-item {
            display: flex;
            align-items: center;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .timeline-period {
            background: #3b82f6;
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: bold;
            min-width: 120px;
            text-align: center;
            margin-left: 20px;
        }

        .timeline-action {
            flex: 1;
            color: #374151;
            line-height: 1.5;
        }

        @media (max-width: 768px) {
            .meta-grid {
                grid-template-columns: 1fr;
            }
            
            .location-summary {
                grid-template-columns: 1fr;
            }
            
            .tasks-grid {
                grid-template-columns: 1fr;
            }
            
            .daily-meta {
                flex-direction: column;
                gap: 10px;
            }

            .performance-metrics {
                grid-template-columns: 1fr;
            }

            .task-stats {
                flex-direction: column;
                gap: 5px;
            }

            .timeline-item {
                flex-direction: column;
                text-align: center;
            }

            .timeline-period {
                margin: 0 0 10px 0;
            }
        }
        
        /* تصميم تحليل الاتجاه الزمني */
        .trend-analysis {
            margin-top: 25px;
            padding: 20px;
            background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
            border-radius: 12px;
            border: 2px solid #d1d5db;
        }

        .trend-analysis h4 {
            margin-bottom: 15px;
            color: #374151;
            font-size: 1.2em;
        }

        .trend-indicator {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            border-radius: 10px;
            font-weight: bold;
            font-size: 1.1em;
        }

        .trend-indicator.improving {
            background: linear-gradient(135deg, #d1fae5, #a7f3d0);
            color: #065f46;
            border: 2px solid #10b981;
        }

        .trend-indicator.declining {
            background: linear-gradient(135deg, #fee2e2, #fecaca);
            color: #991b1b;
            border: 2px solid #ef4444;
        }

        .trend-indicator.stable {
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            color: #92400e;
            border: 2px solid #f59e0b;
        }

        .trend-label {
            font-size: 1.1em;
        }

        .trend-change {
            font-size: 1em;
            opacity: 0.9;
        }

        /* تحسين تصميم التوصيات الذكية */
        .recommendations h3 {
            background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
            color: white !important;
            padding: 15px 25px;
            border-radius: 10px;
            margin-bottom: 20px;
            text-align: center;
            font-size: 1.3em;
            box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);
        }

        .recommendation-category h4 {
            background: linear-gradient(135deg, #1f2937, #374151) !important;
            color: white !important;
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 15px;  
            font-size: 1.1em;
        }

        .recommendation-list li {
            margin-bottom: 12px !important;
            padding: 12px 15px;
            background: #f9fafb;
            border-radius: 8px;
            border-right: 4px solid #6366f1;
            line-height: 1.6;
        }

        .recommendation-list li strong {
            color: #4f46e5;
        }

        /* تصميم شرح الاتجاه الزمني */
        .trend-analysis-container {
            margin-top: 20px;
            padding: 0;
        }

        .trend-analysis {
            display: flex;
            align-items: center;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin: 15px 0;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        }

        .trend-analysis:hover {
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
            transform: translateY(-2px);
        }

        .trend-icon {
            font-size: 2.5em;
            margin-left: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 80px;
        }

        .trend-content {
            flex: 1;
        }

        .trend-title {
            font-size: 1.4em;
            font-weight: bold;
            margin: 0 0 8px 0;
            display: flex;
            align-items: center;
        }

        .trend-description {
            font-size: 1.1em;
            color: #475569;
            margin: 0;
            line-height: 1.6;
            text-align: justify;
        }

        /* تصميم خطة المتابعة الذكية */
        .timeline-actions-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .timeline-actions-list li {
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.2);
            line-height: 1.5;
            color: #374151;
        }

        .timeline-actions-list li:last-child {
            border-bottom: none;
        }

        .no-followup {
            text-align: center;
            padding: 30px;
            background: linear-gradient(135deg, #ecfdf5, #d1fae5);
            border-radius: 12px;
            border: 2px solid #10b981;
            margin: 20px 0;
        }

        .plan-summary {
            margin-top: 30px;
            padding: 25px;
            background: linear-gradient(135deg, #f8fafc, #e2e8f0);
            border-radius: 12px;
            border: 2px solid #64748b;
        }

        .plan-summary h4 {
            color: #1e293b;
            margin-bottom: 20px;
            font-size: 1.2em;
        }

        .summary-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }

        .stat-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 15px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .stat-label {
            font-weight: 600;
            color: #475569;
        }

        .stat-value {
            font-weight: bold;
            color: #1e293b;
        }

        .stat-value.trend-improving {
            color: #059669;
        }

        .stat-value.trend-declining {
            color: #dc2626;
        }

        .stat-value.trend-stable {
            color: #d97706;
        }

        /* تصميم الرسم البياني العام الشامل */
        .overall-charts-section {
            background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
            padding: 30px;
            margin: 30px 0;
            border-radius: 15px;
            border: 3px solid #fbbf24;
            box-shadow: 0 8px 25px rgba(251, 191, 36, 0.2);
        }

        .overall-charts-section h3 {
            color: #f59e0b;
            font-size: 1.6em;
            margin-bottom: 25px;
            text-align: center;
            border-bottom: 3px solid #fbbf24;
            padding-bottom: 15px;
        }

        .charts-grid-overview {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
            gap: 30px;
            margin-top: 25px;
        }

        .charts-grid-overview .chart-container {
            background: white;
            padding: 25px;
            border-radius: 12px;
            border: 2px solid #e5e7eb;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .charts-grid-overview .chart-container:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }

        .charts-grid-overview .chart-container h4 {
            color: #374151;
            font-size: 1.2em;
            margin-bottom: 20px;
            text-align: center;
            padding: 12px;
            background: linear-gradient(135deg, #f8fafc, #e2e8f0);
            border-radius: 8px;
            border: 1px solid #d1d5db;
        }

        @media (max-width: 768px) {
            .charts-grid-overview {
                grid-template-columns: 1fr;
            }
            
            .charts-grid-overview .chart-container {
                padding: 20px;
            }
        }
        
    </style>
</head>
<body>
    <div class="report-container">
        <div class="report-header">
            <div class="company-name">HSA GROUP</div>
            <div class="report-title">تقرير نظام بيئة العمل</div>
            <div class="report-period">الفترة: ${reportData.period}</div>
        </div>
        
        <div class="report-meta">
            <div class="meta-grid">
                <div class="meta-item">
                    <div class="meta-label">تاريخ التوليد</div>
                    <div class="meta-value">${reportData.generatedAt}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">إجمالي التقييمات</div>
                    <div class="meta-value">${reportData.totalEvaluations}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">عدد المواقع</div>
                    <div class="meta-value">${reportData.totalLocations}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">عدد المستخدمين</div>
                    <div class="meta-value">${reportData.uniqueUsers}</div>
                </div>
            </div>
        </div>
        
        ${analysisSection}
        
        <div class="report-content">
            <h2 class="section-title">📋 تفاصيل التقييمات حسب الموقع</h2>
            ${locations.map(generateLocationSection).join('')}
        </div>
        
        <div class="report-footer">
            تم إنشاء هذا التقرير بواسطة نظام بيئة العمل - HSA GROUP
            <br>
            ${reportData.generatedAt} في الساعة ${reportData.generatedTime}
        </div>
    </div>
</body>
</html>
  `;
}