import type { Express } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { cacheQuery } from '../middleware/database';

/**
 * تسجيل مسارات التحليلات المحسنة
 */
export function registerEnhancedAnalyticsRoutes(app: Express) {
  
  // تحليلات الأداء الشاملة للشركة
  app.get('/api/analytics/performance/:companyId', async (req, res) => {
    try {
      const { companyId } = req.params;
      const { timeframe } = req.query;
      
      // استخدام Cache للاستعلامات الثقيلة
      const performanceData = await cacheQuery(
        `performance_${companyId}_${timeframe}`,
        async () => {
          // تحليل الأداء حسب الإطار الزمني
          const results = await db.execute(sql`
            WITH performance_metrics AS (
              SELECT 
                DATE_TRUNC('day', created_at) as date,
                location_id,
                COUNT(*) as total_evaluations,
                AVG((tasks->>'overallScore')::numeric) as avg_score,
                COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed_count
              FROM daily_checklists 
              WHERE company_id = ${companyId}
                AND created_at >= NOW() - INTERVAL '30 days'
              GROUP BY DATE_TRUNC('day', created_at), location_id
            )
            SELECT 
              date,
              SUM(total_evaluations) as daily_evaluations,
              AVG(avg_score) as daily_avg_score,
              SUM(completed_count) as daily_completed,
              (SUM(completed_count)::float / SUM(total_evaluations)) * 100 as completion_rate
            FROM performance_metrics
            GROUP BY date
            ORDER BY date DESC
          `);
          
          return results.rows;
        },
        5 * 60 * 1000 // Cache لمدة 5 دقائق
      );
      
      res.json({
        data: performanceData,
        timestamp: new Date().toISOString(),
        companyId
      });
      
    } catch (error) {
      console.error('❌ Analytics performance error:', error);
      res.status(500).json({
        error: 'فشل في جلب تحليلات الأداء',
        details: (error as Error).message
      });
    }
  });

  // تحليل المواقع الأكثر نشاطاً
  app.get('/api/analytics/locations/activity', async (req, res) => {
    try {
      const { companyId } = req.query;
      
      const locationActivity = await cacheQuery(
        `location_activity_${companyId}`,
        async () => {
          const results = await db.execute(sql`
            SELECT 
              l.id,
              l.name_ar,
              l.name_en,
              COUNT(dc.id) as total_evaluations,
              AVG((dc.tasks->>'overallScore')::numeric) as avg_score,
              COUNT(CASE WHEN dc.completed_at IS NOT NULL THEN 1 END) as completed_count,
              MAX(dc.created_at) as last_evaluation
            FROM locations l
            LEFT JOIN daily_checklists dc ON l.id = dc.location_id
            WHERE l.company_id = ${companyId}
              AND l.is_active = true
              AND dc.created_at >= NOW() - INTERVAL '7 days'
            GROUP BY l.id, l.name_ar, l.name_en
            ORDER BY total_evaluations DESC
            LIMIT 20
          `);
          
          return results.rows;
        },
        3 * 60 * 1000 // Cache لمدة 3 دقائق
      );
      
      res.json({
        locations: locationActivity,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Location activity analytics error:', error);
      res.status(500).json({
        error: 'فشل في جلب تحليل نشاط المواقع',
        details: (error as Error).message
      });
    }
  });

  // تحليل أداء المستخدمين
  app.get('/api/analytics/users/performance', async (req, res) => {
    try {
      const { companyId, period } = req.query;
      const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 7;
      
      const userPerformance = await cacheQuery(
        `user_performance_${companyId}_${period}`,
        async () => {
          const results = await db.execute(sql`
            SELECT 
              u.id,
              u.username,
              u.full_name,
              u.role,
              COUNT(dc.id) as evaluations_count,
              AVG((dc.tasks->>'overallScore')::numeric) as avg_score,
              COUNT(CASE WHEN dc.completed_at IS NOT NULL THEN 1 END) as completed_evaluations,
              MAX(dc.created_at) as last_activity
            FROM users u
            LEFT JOIN daily_checklists dc ON u.id = dc.user_id
            WHERE u.company_id = ${companyId}
              AND u.is_active = true
              AND dc.created_at >= NOW() - INTERVAL '${periodDays} days'
            GROUP BY u.id, u.username, u.full_name, u.role
            HAVING COUNT(dc.id) > 0
            ORDER BY evaluations_count DESC
            LIMIT 50
          `);
          
          return results.rows;
        },
        10 * 60 * 1000 // Cache لمدة 10 دقائق
      );
      
      res.json({
        users: userPerformance,
        period: periodDays,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ User performance analytics error:', error);
      res.status(500).json({
        error: 'فشل في جلب تحليل أداء المستخدمين',
        details: (error as Error).message
      });
    }
  });

  // تحليل الاتجاهات والأنماط
  app.get('/api/analytics/trends', async (req, res) => {
    try {
      const { companyId, metric } = req.query;
      
      const trendsData = await cacheQuery(
        `trends_${companyId}_${metric}`,
        async () => {
          let query;
          
          switch (metric) {
            case 'completion_rate':
              query = sql`
                SELECT 
                  DATE_TRUNC('day', created_at) as date,
                  (COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END)::float / COUNT(*)) * 100 as value,
                  COUNT(*) as total_evaluations
                FROM daily_checklists 
                WHERE company_id = ${companyId}
                  AND created_at >= NOW() - INTERVAL '30 days'
                GROUP BY DATE_TRUNC('day', created_at)
                ORDER BY date ASC
              `;
              break;
              
            case 'average_score':
              query = sql`
                SELECT 
                  DATE_TRUNC('day', created_at) as date,
                  AVG((tasks->>'overallScore')::numeric) as value,
                  COUNT(*) as total_evaluations
                FROM daily_checklists 
                WHERE company_id = ${companyId}
                  AND created_at >= NOW() - INTERVAL '30 days'
                  AND tasks->>'overallScore' IS NOT NULL
                GROUP BY DATE_TRUNC('day', created_at)
                ORDER BY date ASC
              `;
              break;
              
            default:
              query = sql`
                SELECT 
                  DATE_TRUNC('day', created_at) as date,
                  COUNT(*) as value
                FROM daily_checklists 
                WHERE company_id = ${companyId}
                  AND created_at >= NOW() - INTERVAL '30 days'
                GROUP BY DATE_TRUNC('day', created_at)
                ORDER BY date ASC
              `;
          }
          
          const results = await db.execute(query);
          return results.rows;
        },
        15 * 60 * 1000 // Cache لمدة 15 دقيقة
      );
      
      // حساب الاتجاه
      const trend = calculateTrend(trendsData);
      
      res.json({
        data: trendsData,
        trend: trend,
        metric: metric,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Trends analytics error:', error);
      res.status(500).json({
        error: 'فشل في جلب تحليل الاتجاهات',
        details: (error as Error).message
      });
    }
  });
}

/**
 * حساب اتجاه البيانات (صاعد/هابط/مستقر)
 */
function calculateTrend(data: any[]): { direction: string; percentage: number; confidence: string } {
  if (data.length < 2) {
    return { direction: 'مستقر', percentage: 0, confidence: 'منخفض' };
  }
  
  const first = parseFloat(data[0].value) || 0;
  const last = parseFloat(data[data.length - 1].value) || 0;
  
  const percentage = first === 0 ? 0 : ((last - first) / first) * 100;
  
  let direction = 'مستقر';
  if (percentage > 5) direction = 'صاعد';
  else if (percentage < -5) direction = 'هابط';
  
  let confidence = 'منخفض';
  if (Math.abs(percentage) > 20) confidence = 'عالي';
  else if (Math.abs(percentage) > 10) confidence = 'متوسط';
  
  return {
    direction,
    percentage: Math.round(percentage * 100) / 100,
    confidence
  };
}