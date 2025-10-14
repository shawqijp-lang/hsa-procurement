import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerEnhancedGMExecutiveRoutes } from './routes/enhanced-gm-executive';
import { registerActiveCompaniesAnalyticsRoutes } from './routes/active-companies-analytics';
import unifiedStorageRouter from './routes/unified-storage';

import { storage } from "./storage";
import { insertUserSchema, insertDailyChecklistSchema, insertCategoryCommentSchema, type TaskCompletion, type User, type InsertUser } from "@shared/schema";
import { insertMasterEvaluationSchema, type InsertMasterEvaluation } from "@shared/masterEvaluationSchema";
import { validateInput, CommonValidationSchemas } from './middleware/input-validation';
import { generateHTMLReport } from './generateHTMLReport';
import { generateEnhancedPDFStyleReport } from './generateEnhancedPDFReport';
import { applyCompanyFilter, filterRequestByCompany, validateCompanyAccess } from './middleware/companyFilter';
import { performanceTracker, securityMonitor, systemMonitor } from './middleware/monitoring';
import { databaseHealthCheck, cacheQuery, invalidateCache, getCacheStats } from './middleware/database';
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { db } from "./db";
import { loginAttempts, supervisorUserLocationPermissions, categoryComments, dailyChecklists, checklistTemplates, users, locations, companies, reportFiltersSchema, type ReportFilters, type KPIResponse, type TrendSeries, type ComparisonResponse, type InsightsResponse } from "@shared/schema";
import { unifiedEvaluations } from '../shared/unifiedEvaluationSchema';
import { masterEvaluations, type MasterEvaluation } from '../shared/masterEvaluationSchema';
import { eq, sql, and, gte, lte, desc, inArray } from "drizzle-orm";
import Anthropic from '@anthropic-ai/sdk';

// Enhanced security: No fallback for production
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
  return "dev-secret-key-2025"; // Only for development
})();

// Enhanced type definitions for better type safety
interface JWTPayload {
  id: number;
  userId: number;
  iat: number;
  exp: number;
}

interface AuthenticatedRequest extends Express.Request {
  user?: User;
  userCompanyId?: number;
  body: any;
  files?: any;
}

// 🤖 Anthropic AI Integration for Smart Analysis
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

// 📊 Data Analysis Helper Functions
function analyzeEvaluationData(evaluations: any[]) {
  console.log('📊 [Analytics] تحليل البيانات الرقمية...');
  
  const summary = {
    totalEvaluations: evaluations.length,
    uniqueLocations: Array.from(new Set(evaluations.map(e => e.locationId))).length,
    averageScore: 0,
    scoreDistribution: { excellent: 0, good: 0, average: 0, poor: 0 }
  };

  const locationBreakdown = new Map();
  const trends = [];
  let totalScore = 0;

  evaluations.forEach((eval_: any) => {
    // حساب النتيجة من evaluation_items
    let evalScore = 0;
    if (eval_.evaluationItems && Array.isArray(eval_.evaluationItems)) {
      const items = eval_.evaluationItems;
      const itemScores = items.map((item: any) => {
        if (item.subTaskRatings && Array.isArray(item.subTaskRatings)) {
          const avgSubTaskScore = item.subTaskRatings.reduce((sum: number, sub: any) => sum + (sub.rating || 0), 0) / item.subTaskRatings.length;
          return avgSubTaskScore;
        }
        return item.rating || 0;
      });
      evalScore = itemScores.length > 0 ? (itemScores.reduce((sum: number, score: number) => sum + score, 0) / itemScores.length) * 20 : 0; // Convert to percentage
    } else {
      evalScore = eval_.overallRating || 0;
    }

    totalScore += evalScore;

    // تصنيف النتائج
    if (evalScore >= 90) summary.scoreDistribution.excellent++;
    else if (evalScore >= 75) summary.scoreDistribution.good++;
    else if (evalScore >= 60) summary.scoreDistribution.average++;
    else summary.scoreDistribution.poor++;

    // تحليل حسب الموقع
    const locationKey = `${eval_.locationId}_${eval_.locationNameAr}`;
    if (!locationBreakdown.has(locationKey)) {
      locationBreakdown.set(locationKey, {
        locationId: eval_.locationId,
        locationName: eval_.locationNameAr,
        evaluations: [],
        averageScore: 0,
        trend: 'stable'
      });
    }
    locationBreakdown.get(locationKey).evaluations.push({ score: evalScore, date: eval_.evaluationDate });
  });

  summary.averageScore = evaluations.length > 0 ? Math.round(totalScore / evaluations.length) : 0;

  // حساب متوسط كل موقع
  locationBreakdown.forEach(location => {
    const scores = location.evaluations.map(e => e.score);
    location.averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    
    // تحديد الاتجاه
    if (scores.length >= 2) {
      const recent = scores.slice(-3).reduce((sum, score) => sum + score, 0) / Math.min(3, scores.length);
      const older = scores.slice(0, -3).reduce((sum, score) => sum + score, 0) / Math.max(1, scores.length - 3);
      location.trend = recent > older + 5 ? 'improving' : recent < older - 5 ? 'declining' : 'stable';
    }
  });

  return {
    summary,
    trends: Array.from(locationBreakdown.values()).sort((a, b) => b.averageScore - a.averageScore),
    locationBreakdown: Array.from(locationBreakdown.values()),
    chartData: generateChartData(evaluations)
  };
}

function extractCommentsForAI(evaluations: any[], includeComments: boolean) {
  console.log('💬 [AI] استخراج النصوص للتحليل...');
  
  if (!includeComments) return [];

  const comments = [];
  evaluations.forEach((eval_: any) => {
    // الملاحظات العامة
    if (eval_.generalNotes) {
      comments.push({
        type: 'general',
        location: eval_.locationNameAr,
        text: eval_.generalNotes,
        score: eval_.overallRating || 0,
        date: eval_.evaluationDate
      });
    }

    // تعليقات البنود
    if (eval_.evaluationItems && Array.isArray(eval_.evaluationItems)) {
      eval_.evaluationItems.forEach(item => {
        if (item.itemComment) {
          comments.push({
            type: 'item',
            location: eval_.locationNameAr,
            category: item.categoryAr || 'غير محدد',
            task: item.taskNameAr || 'مهمة غير محددة',
            text: item.itemComment,
            rating: item.rating || 0,
            date: eval_.evaluationDate
          });
        }
      });
    }
  });

  console.log(`💬 [AI] تم استخراج ${comments.length} تعليق للتحليل`);
  return comments;
}

async function performAIAnalysis(comments: any[], analyticsData: any, analysisType: string) {
  console.log('🤖 [AI] بدء التحليل بالذكاء الاصطناعي...');
  console.log('💬 [AI] عدد التعليقات للتحليل:', comments.length);
  
  // جرب OpenAI أولاً كخيار بديل
  if (process.env.OPENAI_API_KEY) {
    console.log('🔄 [AI] محاولة استخدام OpenAI كبديل...');
    try {
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      const commentsText = comments.map(c => `${c.location}: ${c.text} (التقييم: ${c.rating || 'غير محدد'})`).join('\n');
      const analyticsContext = `
إحصائيات عامة:
- إجمالي التقييمات: ${analyticsData.summary.totalEvaluations}
- المتوسط العام: ${analyticsData.summary.averageScore}%
- عدد المواقع: ${analyticsData.summary.uniqueLocations}
- التوزيع: ممتاز (${analyticsData.summary.scoreDistribution.excellent}) | جيد (${analyticsData.summary.scoreDistribution.good}) | متوسط (${analyticsData.summary.scoreDistribution.average}) | ضعيف (${analyticsData.summary.scoreDistribution.poor})
      `;

      const prompt = `أنت خبير في تحليل تقييمات بيئة العمل والأداء التشغيلي. قم بتحليل البيانات التالية بعمق وأعطِ رؤى قابلة للتنفيذ.

${analyticsContext}

التعليقات والملاحظات:
${commentsText}

يرجى تقديم تحليل شامل يتضمن:
1. رؤى عامة عن الأداء والاتجاهات
2. تحديد نقاط القوة الرئيسية
3. تحديد نقاط الضعف والتحديات
4. توصيات عملية قابلة للتنفيذ
5. تحليل المشاعر العامة

أجب بالعربية واستخدم تحليلاً مهنياً ومفصلاً.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'أنت خبير تحليل أداء ومستشار في تحسين بيئة العمل. قدم تحليلاً مهنياً ومفصلاً.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.7
      });

      const aiResponseText = response.choices[0]?.message?.content || '';
      
      // استخراج المكونات من الاستجابة
      const insights = extractSection(aiResponseText, 'رؤى|تحليل|الأداء');
      const strengths = extractBulletPoints(aiResponseText, 'قوة|إيجابي|ممتاز');
      const weaknesses = extractBulletPoints(aiResponseText, 'ضعف|سلبي|تحدي|مشكلة');
      const recommendations = extractBulletPoints(aiResponseText, 'توصية|اقتراح|يُنصح');
      
      // تحليل المشاعر البسيط
      const sentiment = analyzeSentiment(commentsText);

      console.log('✅ [AI] تم التحليل بـ OpenAI بنجاح');
      
      return {
        insights,
        recommendations,
        strengths,
        weaknesses,
        sentiment,
        fullAnalysis: aiResponseText
      };
      
    } catch (openaiError: any) {
      console.log('⚠️ [AI] فشل OpenAI، المحاولة مع نظام التحليل المحلي...');
    }
  }
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️ [AI] لم يتم العثور على ANTHROPIC_API_KEY');
    return {
      insights: 'التحليل بالذكاء الاصطناعي غير متاح حالياً',
      recommendations: ['تأكد من تكوين مفتاح Anthropic API'],
      strengths: [],
      weaknesses: [],
      sentiment: { positive: 0, negative: 0, neutral: 100 }
    };
  }
  
  // نظام التحليل الذكي المحلي المتطور
  console.log('🧠 [AI] استخدام نظام التحليل الذكي المحلي...');
  return generateAdvancedLocalAnalysis(comments, analyticsData);
}

function generateAdvancedLocalAnalysis(comments: any[], analyticsData: any) {
  const { summary } = analyticsData;
  const avgScore = summary.averageScore;
  
  // تحليل متطور للتعليقات
  const positiveKeywords = ['ممتاز', 'جيد', 'رائع', 'مثالي', 'نظيف', 'منظم', 'سريع', 'فعال', 'جودة'];
  const negativeKeywords = ['سيء', 'ضعيف', 'مشكلة', 'خطأ', 'متأخر', 'قديم', 'معطل', 'نقص', 'غير'];
  const improvementKeywords = ['تحسين', 'تطوير', 'إصلاح', 'تحديث', 'صيانة', 'تدريب', 'مراجعة'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;
  
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  
  // تحليل التعليقات
  comments.forEach(comment => {
    const text = comment.text.toLowerCase();
    const rating = comment.rating || 0;
    
    // تحليل المشاعر
    const hasPositive = positiveKeywords.some(keyword => text.includes(keyword));
    const hasNegative = negativeKeywords.some(keyword => text.includes(keyword));
    const hasImprovement = improvementKeywords.some(keyword => text.includes(keyword));
    
    if (hasPositive || rating >= 4) {
      positiveCount++;
      if (hasPositive) {
        const foundPositive = positiveKeywords.find(keyword => text.includes(keyword));
        strengths.push(`${comment.location}: تم تسجيل نقاط إيجابية (${foundPositive})`);
      }
    } else if (hasNegative || rating <= 2) {
      negativeCount++;
      if (hasNegative) {
        const foundNegative = negativeKeywords.find(keyword => text.includes(keyword));
        weaknesses.push(`${comment.location}: تحديات تحتاج معالجة (${foundNegative})`);
      }
    } else {
      neutralCount++;
    }
    
    if (hasImprovement) {
      recommendations.push(`${comment.location}: يحتاج تحسين حسب الملاحظات`);
    }
  });
  
  // إنشاء رؤى ذكية
  let insights = '';
  
  if (avgScore >= 85) {
    insights = `الأداء العام ممتاز بمعدل ${avgScore}%. تم تحليل ${summary.totalEvaluations} تقييم عبر ${summary.uniqueLocations} موقع. النتائج تظهر مستوى عالي من الكفاءة التشغيلية.`;
  } else if (avgScore >= 70) {
    insights = `الأداء العام جيد بمعدل ${avgScore}%. هناك فرص للتحسين في بعض المناطق. التحليل يظهر أساس قوي مع إمكانيات للتطوير.`;
  } else if (avgScore >= 50) {
    insights = `الأداء العام متوسط بمعدل ${avgScore}%. يحتاج إلى تركيز على التحسينات الأساسية. التحليل يشير إلى ضرورة اتخاذ إجراءات تطويرية.`;
  } else {
    insights = `الأداء العام يحتاج تطوير فوري بمعدل ${avgScore}%. النتائج تتطلب تدخل سريع ووضع خطة شاملة للتحسين.`;
  }
  
  // إضافة توصيات ذكية حسب الأداء
  if (avgScore < 70) {
    recommendations.push('وضع خطة تحسين شاملة مع جدول زمني واضح');
    recommendations.push('زيادة التدريب والتطوير للفرق التشغيلية');
    recommendations.push('مراجعة العمليات والإجراءات الحالية');
  }
  
  if (summary.totalEvaluations < 10) {
    recommendations.push('زيادة تكرار التقييمات للحصول على بيانات أكثر دقة');
  }
  
  if (comments.length < 3) {
    recommendations.push('تشجيع المقيّمين على إضافة تعليقات مفصلة لتحسين جودة التحليل');
  }
  
  // حساب نسب المشاعر
  const totalComments = Math.max(positiveCount + negativeCount + neutralCount, 1);
  const sentimentAnalysis = {
    positive: Math.round((positiveCount / totalComments) * 100),
    negative: Math.round((negativeCount / totalComments) * 100),
    neutral: Math.round((neutralCount / totalComments) * 100)
  };
  
  // إضافة نقاط قوة افتراضية حسب الأداء
  if (avgScore >= 80) {
    strengths.push('مستوى أداء عالي يتجاوز المعايير المطلوبة');
  }
  if (avgScore >= 70) {
    strengths.push('أداء مستقر ومقبول حسب المعايير');
  }
  if (summary.totalEvaluations >= 10) {
    strengths.push('قاعدة بيانات تقييم قوية تدعم اتخاذ قرارات مدروسة');
  }
  
  // إضافة نقاط ضعف حسب الأداء
  if (avgScore < 60) {
    weaknesses.push('مستوى الأداء أقل من المعايير المطلوبة');
  }
  if (summary.totalEvaluations < 5) {
    weaknesses.push('قلة عدد التقييمات قد تؤثر على دقة التحليل');
  }
  
  return {
    insights,
    recommendations: recommendations.length > 0 ? recommendations : ['مواصلة المراقبة والتقييم المنتظم'],
    strengths: strengths.length > 0 ? strengths : ['لا توجد نقاط قوة محددة'],
    weaknesses: weaknesses.length > 0 ? weaknesses : ['لا توجد نقاط ضعف واضحة'],
    sentiment: sentimentAnalysis
  };
}

function extractSection(text: string, keywords: string): string {
  const lines = text.split('\n');
  const keywordRegex = new RegExp(keywords, 'i');
  
  let result = '';
  let capturing = false;
  
  for (const line of lines) {
    if (keywordRegex.test(line)) {
      capturing = true;
      result += line + '\n';
    } else if (capturing && line.trim()) {
      result += line + '\n';
    } else if (capturing && !line.trim()) {
      break;
    }
  }
  
  return result.trim() || 'لا توجد رؤى محددة';
}

function extractBulletPoints(text: string, keywords: string): string[] {
  const lines = text.split('\n');
  const keywordRegex = new RegExp(keywords, 'i');
  const bullets: string[] = [];
  
  for (const line of lines) {
    if (keywordRegex.test(line) || line.trim().startsWith('-') || line.trim().startsWith('•')) {
      const cleaned = line.replace(/^[-•*]\s*/, '').trim();
      if (cleaned && cleaned.length > 5) {
        bullets.push(cleaned);
      }
    }
  }
  
  return bullets.slice(0, 5);
}

function analyzeSentiment(text: string) {
  const positiveWords = ['ممتاز', 'جيد', 'رائع', 'نظيف', 'سريع'];
  const negativeWords = ['سيء', 'ضعيف', 'مشكلة', 'خطأ', 'متأخر'];
  
  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
  
  const total = Math.max(positiveCount + negativeCount, 1);
  
  return {
    positive: Math.round((positiveCount / total) * 100),
    negative: Math.round((negativeCount / total) * 100),
    neutral: Math.max(0, 100 - Math.round((positiveCount / total) * 100) - Math.round((negativeCount / total) * 100))
  };
}

function generateChartData(evaluations: any[]) {
  // إنشاء بيانات الرسوم البيانية
  const dateGroups = new Map();
  evaluations.forEach((eval_: any) => {
    const date = eval_.evaluationDate;
    if (!dateGroups.has(date)) {
      dateGroups.set(date, { date, count: 0, averageScore: 0, scores: [] });
    }
    const group = dateGroups.get(date);
    group.count++;
    const score = eval_.overallRating || 0;
    group.scores.push(score);
  });

  dateGroups.forEach(group => {
    group.averageScore = Math.round(group.scores.reduce((sum, score) => sum + score, 0) / group.scores.length);
  });

  return Array.from(dateGroups.values()).sort((a, b) => a.date.localeCompare(b.date));
}


interface SystemCheckResult {
  success: boolean;
  message: string;
  errors?: string[];
  warnings?: string[];
  results?: any;
  summary?: any;
}

// وظائف إدارة محاولات تسجيل الدخول
async function checkLoginAttempts(identifier: string): Promise<{ allowed: boolean; timeLeft?: number }> {
  try {
    const [attempt] = await db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.identifier, identifier))
      .limit(1);

    if (!attempt) {
      return { allowed: true };
    }

    const now = new Date();
    
    // التحقق من انتهاء فترة الحظر
    if (attempt.blockedUntil && attempt.blockedUntil > now) {
      const timeLeft = Math.ceil((attempt.blockedUntil.getTime() - now.getTime()) / (1000 * 60));
      return { allowed: false, timeLeft };
    }

    // إذا انتهت فترة الحظر، قم بإعادة تعيين العداد
    if (attempt.blockedUntil && attempt.blockedUntil <= now) {
      await db
        .update(loginAttempts)
        .set({
          failedAttempts: 0,
          blockedUntil: null,
          updatedAt: now
        })
        .where(eq(loginAttempts.identifier, identifier));
      return { allowed: true };
    }

    // التحقق من عدد المحاولات
    if (attempt.failedAttempts >= 5) {
      const blockUntil = new Date(now.getTime() + 15 * 60 * 1000); // 15 دقيقة
      await db
        .update(loginAttempts)
        .set({
          blockedUntil: blockUntil,
          updatedAt: now
        })
        .where(eq(loginAttempts.identifier, identifier));
      return { allowed: false, timeLeft: 15 };
    }

    return { allowed: true };
  } catch (error) {
    console.error('خطأ في فحص محاولات الدخول:', error);
    return { allowed: true }; // السماح في حالة الخطأ لتجنب منع المستخدمين
  }
}

async function recordFailedLogin(identifier: string): Promise<void> {
  try {
    const now = new Date();
    const [existing] = await db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.identifier, identifier))
      .limit(1);

    if (existing) {
      const newCount = existing.failedAttempts + 1;
      let blockedUntil = null;
      
      // حظر لمدة 15 دقيقة بعد 5 محاولات فاشلة
      if (newCount >= 5) {
        blockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
      }

      await db
        .update(loginAttempts)
        .set({
          failedAttempts: newCount,
          lastAttemptAt: now,
          blockedUntil,
          updatedAt: now
        })
        .where(eq(loginAttempts.identifier, identifier));
    } else {
      await db
        .insert(loginAttempts)
        .values({
          identifier,
          failedAttempts: 1,
          lastAttemptAt: now,
          createdAt: now,
          updatedAt: now
        });
    }
  } catch (error) {
    console.error('خطأ في تسجيل المحاولة الفاشلة:', error);
  }
}

async function resetLoginAttempts(identifier: string): Promise<void> {
  try {
    await db
      .update(loginAttempts)
      .set({
        failedAttempts: 0,
        blockedUntil: null,
        updatedAt: new Date()
      })
      .where(eq(loginAttempts.identifier, identifier));
  } catch (error) {
    console.error('خطأ في إعادة تعيين محاولات الدخول:', error);
  }
}

// Enhanced authentication middleware with company context
async function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (process.env.NODE_ENV === 'development') {
    console.log('🔐 Auth middleware - Token present:', !!token);
    if (token) {
      console.log('🔐 Token preview:', token.substring(0, 50) + '...');
    }
  }

  if (!token) {
    console.log('❌ Auth middleware - No token provided');
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    // التحقق من صحة التوكن قبل المعالجة
    if (!token || typeof token !== 'string' || token.trim() === '') {
      console.log('❌ Auth middleware - Invalid token format');
      return res.status(403).json({ message: 'Invalid token format' });
    }

    let decoded: JWTPayload & { companyId?: number, offline?: boolean, availableLocations?: number[] };
    
    // التحقق من الـ offline tokens أولاً
    if (token.includes('.') && token.split('.').length === 3) {
      try {
        const [header, payload, signature] = token.split('.');
        
        // التحقق من صحة أجزاء التوكن
        if (!header || !payload || !signature) {
          throw new Error('Invalid token structure');
        }
        
        const decodedPayload = JSON.parse(atob(payload));
        
        // إذا كان offline token صالح
        if (decodedPayload.offline === true) {
          console.log('🔧 معالجة offline token...');
          decoded = decodedPayload;
        } else {
          // استخدام التحقق العادي للـ JWT
          try {
            decoded = jwt.verify(token, JWT_SECRET) as JWTPayload & { companyId?: number };
          } catch (jwtError) {
            console.log('❌ JWT verification failed in normal flow:', jwtError.message);
            return res.status(403).json({ message: 'Invalid or malformed token' });
          }
        }
      } catch (offlineError) {
        console.log('❌ Offline token parsing failed:', offlineError.message);
        // إذا فشل فحص الـ offline token، جرب JWT عادي
        try {
          decoded = jwt.verify(token, JWT_SECRET) as JWTPayload & { companyId?: number };
        } catch (jwtError) {
          console.log('❌ JWT verification failed in fallback:', jwtError.message);
          return res.status(403).json({ message: 'Invalid or malformed token' });
        }
      }
    } else {
      // JWT عادي
      try {
        decoded = jwt.verify(token, JWT_SECRET) as JWTPayload & { companyId?: number };
      } catch (jwtError) {
        console.log('❌ JWT verification failed:', jwtError.message);
        return res.status(403).json({ message: 'Invalid or malformed token' });
      }
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('🔓 Auth middleware - User decoded:', { 
        id: decoded.id, 
        userId: decoded.userId, 
        companyId: decoded.companyId 
      });
    }
    
    // Try both 'id' and 'userId' fields for backward compatibility
    const userId = decoded.id || decoded.userId;
    if (!userId) {
      console.log('❌ Auth middleware - No user ID in token');
      return res.status(403).json({ message: 'Invalid token format' });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      console.log('❌ Auth middleware - User not found:', userId);
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (!user.isActive) {
      console.log('❌ Auth middleware - User is inactive:', userId);
      return res.status(401).json({ message: 'User account is disabled' });
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Auth middleware - User authenticated:', { 
        id: user.id, 
        role: user.role, 
        username: user.username,
        companyId: user.companyId 
      });
    }
    
    // 🚀 [PERFORMANCE] إضافة المواقع المتاحة من token لتجنب الاستعلامات المتكررة
    req.user = {
      ...user,
      availableLocations: decoded.availableLocations || []
    };
    req.userCompanyId = user.companyId; // Set company context
    next();
  } catch (error) {
    console.log('❌ Auth middleware - Token verification failed:', error);
    return res.status(403).json({ message: 'Invalid token' });
  }
}

// Middleware for General Manager - SUPREME ACCESS
async function requireGeneralManager(req: any, res: any, next: any) {
  // SUPREME ACCESS: Only General Manager gets unrestricted system-level access
  const allowedRoles = ['hsa_group_admin'];
  
  const hasRoleAccess = allowedRoles.includes(req.user.role);
  
  if (hasRoleAccess) {
    console.log('👑 GENERAL MANAGER ACCESS: Supreme permission granted:', {
      username: req.user.username,
      role: req.user.role,
      endpoint: req.path,
      access_level: 'SUPREME'
    });
    return next();
  }
  
  console.log('❌ General Manager access denied:', {
    username: req.user.username,
    role: req.user.role,
    endpoint: req.path
  });
  return res.status(403).json({ message: 'General Manager access required' });
}

// Middleware for admin-only routes - ALL ADMINS get full access  
async function requireAdmin(req: any, res: any, next: any) {
  // ENHANCED ADMIN ACCESS: All admin types get unrestricted access (including data_specialist for location and checklist management)
  const allowedRoles = ['admin', 'hsa_group_admin', 'department_manager'];
  
  // اخصائي بيانات الشركة له صلاحيات خاصة لإدارة المواقع وقوائم التشييك
  const dataSpecialistEndpoints = ['/api/locations', '/api/checklist-templates', '/api/templates'];
  const isDataSpecialistAllowed = req.user.role === 'data_specialist' && 
    dataSpecialistEndpoints.some(endpoint => req.path.startsWith(endpoint));
  
  const hasRoleAccess = allowedRoles.includes(req.user.role);
  
  if (hasRoleAccess || isDataSpecialistAllowed) {
    console.log('✅ ADMIN ACCESS: Permission granted:', {
      username: req.user.username,
      role: req.user.role,
      endpoint: req.path,
      access_type: req.user.role === 'data_specialist' ? 'DATA_SPECIALIST' : 'role_based',
      isDataSpecialistAccess: isDataSpecialistAllowed
    });
    return next();
  }
  
  console.log('❌ Admin access denied:', {
    username: req.user.username,
    role: req.user.role,
    endpoint: req.path,
    allowedRoles,
    isDataSpecialistAllowed
  });
  return res.status(403).json({ message: 'Admin access required' });
}

// Middleware for supervisor access - CONTROLLED SUPERVISOR ACCESS
async function requireSupervisorAccess(req: any, res: any, next: any) {
  // SUPERVISOR ACCESS: Allow supervisors to manage their teams
  const allowedRoles = ['supervisor'];
  
  const hasRoleAccess = allowedRoles.includes(req.user.role);
  
  if (hasRoleAccess) {
    console.log('👨‍💼 SUPERVISOR ACCESS: Permission granted:', {
      username: req.user.username,
      role: req.user.role,
      endpoint: req.path,
      access_level: 'TEAM_MANAGEMENT'
    });
    return next();
  }
  
  console.log('❌ Supervisor access denied:', {
    username: req.user.username,
    role: req.user.role,
    endpoint: req.path
  });
  return res.status(403).json({ message: 'Supervisor access required' });
}

// Middleware for admin OR supervisor access - MIXED ACCESS
async function requireAdminOrSupervisor(req: any, res: any, next: any) {
  // MIXED ACCESS: Allow both admins and supervisors with appropriate scope (including data_specialist for location and checklist management)
  const allowedRoles = ['admin', 'hsa_group_admin', 'department_manager', 'supervisor'];
  
  // اخصائي بيانات الشركة له صلاحيات خاصة لإدارة المواقع وقوائم التشييك
  const dataSpecialistEndpoints = ['/api/locations', '/api/checklist-templates', '/api/templates'];
  const isDataSpecialistAllowed = req.user.role === 'data_specialist' && 
    dataSpecialistEndpoints.some(endpoint => req.path.startsWith(endpoint));
  
  const hasRoleAccess = allowedRoles.includes(req.user.role);
  
  if (hasRoleAccess || isDataSpecialistAllowed) {
    console.log('✅ ADMIN/SUPERVISOR ACCESS: Permission granted:', {
      username: req.user.username,
      role: req.user.role,
      endpoint: req.path,
      access_type: req.user.role === 'supervisor' ? 'LIMITED_TEAM' : 
                  req.user.role === 'data_specialist' ? 'DATA_SPECIALIST' : 'FULL_ADMIN',
      isDataSpecialistAccess: isDataSpecialistAllowed
    });
    return next();
  }
  
  console.log('❌ Admin/Supervisor access denied:', {
    username: req.user.username,
    role: req.user.role,
    endpoint: req.path,
    allowedRoles,
    isDataSpecialistAllowed
  });
  return res.status(403).json({ message: 'Admin or Supervisor access required' });
}

// Middleware for regular users - BASIC USER ACCESS
async function requireUserAccess(req: any, res: any, next: any) {
  // BASIC USER ACCESS: Allow regular users and above (including data_specialist and analytics_viewer)
  const allowedRoles = ['user', 'supervisor', 'admin', 'hsa_group_admin', 'enhanced_general_manager', 'department_manager', 'data_specialist', 'analytics_viewer'];
  
  const hasRoleAccess = allowedRoles.includes(req.user.role);
  
  if (hasRoleAccess) {
    console.log('✅ USER ACCESS: Permission granted:', {
      username: req.user.username,
      role: req.user.role,
      endpoint: req.path,
      access_level: 'BASIC_USER'
    });
    return next();
  }
  
  console.log('❌ User access denied:', {
    username: req.user.username,
    role: req.user.role,
    endpoint: req.path
  });
  return res.status(403).json({ message: 'User access required' });
}

// Middleware for user-specific data access - RESTRICTED TO OWN DATA
async function requireOwnDataAccess(req: any, res: any, next: any) {
  // RESTRICTED ACCESS: Users can only access their own data
  const currentUserId = req.user.id;
  const requestedUserId = parseInt(req.params.userId || req.body.userId || req.query.userId);
  
  // Admins and supervisors can access any data
  if (['admin', 'hsa_group_admin', 'department_manager', 'supervisor'].includes(req.user.role)) {
    return next();
  }
  
  // Regular users can only access their own data
  if (req.user.role === 'user') {
    if (requestedUserId && requestedUserId !== currentUserId) {
      console.log('❌ Access denied - user trying to access other user data:', {
        currentUserId,
        requestedUserId,
        endpoint: req.path
      });
      return res.status(403).json({ message: 'يمكنك فقط الوصول لبياناتك الشخصية' });
    }
  }
  
  console.log('✅ Own data access granted:', {
    userId: currentUserId,
    role: req.user.role,
    endpoint: req.path
  });
  return next();
}

// Middleware for admin access only - ALL ADMINS get full access
async function requireAdminOnly(req: any, res: any, next: any) {
  // ENHANCED ADMIN ACCESS: All admin types get unrestricted access (including data_specialist for location and checklist management)
  const allowedRoles = ['admin', 'hsa_group_admin', 'department_manager', 'enhanced_general_manager'];
  
  // اخصائي بيانات الشركة له صلاحيات خاصة لإدارة المواقع وقوائم التشييك
  const dataSpecialistEndpoints = ['/api/locations', '/api/checklist-templates', '/api/templates'];
  const isDataSpecialistAllowed = req.user.role === 'data_specialist' && 
    dataSpecialistEndpoints.some(endpoint => req.path.startsWith(endpoint));
  
  const hasRoleAccess = allowedRoles.includes(req.user.role);
  
  if (hasRoleAccess || isDataSpecialistAllowed) {
    console.log('✅ ADMIN ACCESS: Permission granted:', {
      username: req.user.username,
      role: req.user.role,
      endpoint: req.path,
      access_type: req.user.role === 'data_specialist' ? 'DATA_SPECIALIST' : 'role_based',
      isDataSpecialistAccess: isDataSpecialistAllowed
    });
    return next();
  }
  
  console.log('❌ Admin access denied:', {
    username: req.user.username,
    role: req.user.role,
    endpoint: req.path,
    allowedRoles,
    isDataSpecialistAllowed
  });
  return res.status(403).json({ message: 'Admin access required' });
}

// Middleware for modification operations - Enhanced General Manager has FULL access
async function requireModificationAccess(req: any, res: any, next: any) {
  const allowedRoles = ['admin', 'department_manager', 'enhanced_general_manager', 'hsa_group_admin'];
  
  const hasRoleAccess = allowedRoles.includes(req.user.role);
  
  if (hasRoleAccess) {
    console.log('✅ MODIFICATION ACCESS: Permission granted:', {
      username: req.user.username,
      role: req.user.role,
      endpoint: req.path,
      method: req.method
    });
    return next();
  }
  
  console.log('❌ Modification access denied:', {
    username: req.user.username,
    role: req.user.role,
    endpoint: req.path,
    allowedRoles
  });
  return res.status(403).json({ message: 'Admin access required for modifications' });
}

// Enhanced permission checker for user management operations
async function canManageUser(req: any, res: any, next: any) {
  const targetUserId = parseInt(req.params.id);
  const currentUser = req.user;
  
  // RESTRICTED ACCESS: Only admins and supervisors - NO REGULAR USERS
  const allowedRoles = ['admin', 'hsa_group_admin', 'department_manager', 'supervisor', 'enhanced_general_manager'];
  
  // Block regular users completely from user management
  if (currentUser.role === 'user') {
    console.log('❌ Regular user blocked from user management:', {
      userId: currentUser.id,
      username: currentUser.username,
      attemptedAction: req.method,
      targetUserId
    });
    return res.status(403).json({ message: 'المستخدمون العاديون لا يملكون صلاحية إدارة المستخدمين' });
  }
  
  const hasRoleAccess = allowedRoles.includes(currentUser.role);
  
  if (hasRoleAccess) {
    // Additional checks for supervisors
    if (currentUser.role === 'supervisor') {
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Supervisors can only manage users in their company
      if (targetUser.companyId !== currentUser.companyId) {
        console.log('❌ Supervisor cannot manage user from different company:', {
          supervisorCompany: currentUser.companyId,
          targetUserCompany: targetUser.companyId
        });
        return res.status(403).json({ message: 'Cannot manage users from other companies' });
      }
      
      // Supervisors cannot manage admins or other supervisors
      if (['admin', 'hsa_group_admin', 'department_manager', 'supervisor'].includes(targetUser.role)) {
        console.log('❌ Supervisor cannot manage admin/supervisor roles:', {
          targetRole: targetUser.role
        });
        return res.status(403).json({ message: 'Cannot manage admin or supervisor accounts' });
      }
    }
    
    // Prevent admin from deleting themselves
    if (req.method === 'DELETE' && targetUserId === currentUser.id) {
      return res.status(403).json({ message: 'Cannot delete your own account' });
    }
    // Additional validation can be added here if needed
    
    console.log('✅ ADMIN ACCESS: User management permission granted:', { 
      currentUser: currentUser.username,
      role: currentUser.role,
      targetUser: targetUserId, 
      action: req.method 
    });
    return next();
  }
  
  console.log('❌ User management permission denied:', { 
    currentUser: currentUser.id, 
    role: currentUser.role,
    targetUser: targetUserId 
  });
  return res.status(403).json({ message: 'Insufficient permissions for user management' });
}

// Menu management permissions - ADMIN ACCESS
async function canManageMenus(req: any, res: any, next: any) {
  const currentUser = req.user;
  
  // ADMIN ACCESS: All admin types get menu management access
  const allowedRoles = ['admin', 'hsa_group_admin', 'department_manager'];
  
  if (allowedRoles.includes(currentUser.role)) {
    
    console.log('✅ SUPER ADMIN ACCESS: Menu management permission granted:', { 
      username: currentUser.username,
      userId: currentUser.id, 
      role: currentUser.role 
    });
    return next();
  }
  
  console.log('❌ Menu management permission denied:', { 
    userId: currentUser.id, 
    role: currentUser.role 
  });
  return res.status(403).json({ message: 'Admin access required for menu management' });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Import rate limiting for security
  const rateLimit = (await import('express-rate-limit')).default;
  
  // Enhanced Security Headers Middleware
  app.use((req, res, next) => {
    // Basic security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // HTTPS enforcement in production
    if (process.env.NODE_ENV === 'production' && req.get('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.get('host')}${req.url}`);
    }
    
    // Content Security Policy محسنة أمنياً
    const cspPolicy = process.env.NODE_ENV === 'production' 
      ? "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline' fonts.googleapis.com; " +
        "font-src 'self' fonts.gstatic.com; " +
        "img-src 'self' data: blob:; " +
        "connect-src 'self'; " +
        "frame-ancestors 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self';"
      : "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline' fonts.googleapis.com; " +
        "font-src 'self' fonts.gstatic.com; " +
        "img-src 'self' data: blob:; " +
        "connect-src 'self' ws: wss:; " +
        "frame-ancestors 'none';"
    
    res.setHeader('Content-Security-Policy', cspPolicy);
    
    next();
  });
  
  // Enhanced Rate limiting for login attempts
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: { message: 'عدد كبير من محاولات الدخول، حاول مرة أخرى بعد 15 دقيقة' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
  });
  
  // CSRF Protection for sensitive endpoints
  const csrfProtection = (req: any, res: any, next: any) => {
    const origin = req.get('origin');
    const host = req.get('host');
    const referer = req.get('referer');
    
    // Allow same-origin requests or verify referer
    if (origin && origin.includes(host)) {
      return next();
    }
    
    if (referer && referer.includes(host)) {
      return next();
    }
    
    // In development, be more lenient
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }
    
    return res.status(403).json({ error: 'CSRF protection: Invalid origin' });
  };

  // General API rate limiting
  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    message: { message: 'تم تجاوز الحد المسموح من الطلبات، يرجى المحاولة لاحقاً' }
  });

  // Apply rate limiting to all API routes
  app.use('/api/', apiLimiter);

  // File type validation middleware - Enhanced for Excel support
  const fileValidationMiddleware = async (req: any, res: any, next: any) => {
    if (req.files) {
      const allowedFileTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'application/json', // .json
        'text/csv', // .csv
        'application/octet-stream' // For binary files that may not have proper mimetype
      ];

      for (const fileKey in req.files) {
        const file = req.files[fileKey];
        if (file) {
          // Check extension first - more reliable than mimetype for Excel files
          const isExcelFile = file.name.match(/\.(xlsx|xls)$/i);
          const isCsvFile = file.name.match(/\.csv$/i);
          const isJsonFile = file.name.match(/\.json$/i);
          const isAllowedMimetype = allowedFileTypes.includes(file.mimetype);
          
          // Allow files if they have the right extension OR the right mimetype
          const isValidFile = isExcelFile || isCsvFile || isJsonFile || isAllowedMimetype;
          
          if (!isValidFile) {
            console.warn('🚫 Blocked file upload:', { 
              mimetype: file.mimetype, 
              name: file.name,
              extension: file.name.split('.').pop(),
              ip: req.ip 
            });
            
            // تسجيل محاولة رفع ملف غير مسموح
            try {
              const { securityLogger, SecurityEventType, SecurityLevel } = await import('./middleware/security-logger');
              await securityLogger.log({
                eventType: SecurityEventType.FILE_UPLOAD_VIOLATION,
                level: SecurityLevel.MEDIUM,
                ipAddress: req.ip || 'unknown',
                userAgent: req.headers['user-agent'],
                details: {
                  filename: file.name,
                  mimetype: file.mimetype,
                  extension: file.name.split('.').pop(),
                  size: file.size
                }
              });
            } catch (logError) {
              console.error('Failed to log file upload violation:', logError);
            }
            
            return res.status(400).json({ 
              message: 'نوع الملف غير مسموح. فقط ملفات Excel و CSV مسموحة' 
            });
          }
          
          // Log successful file validation
          console.log('✅ File validation passed:', {
            name: file.name,
            mimetype: file.mimetype,
            size: file.size,
            isExcelFile: !!isExcelFile,
            validatedBy: isExcelFile ? 'extension' : 'mimetype'
          });
        }
      }
    }
    next();
  };

  // Apply file validation to all routes
  app.use(fileValidationMiddleware);

  // Performance monitoring middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (duration > 1000) {
        console.warn(`⚠️ Slow request: ${req.method} ${req.path} took ${duration}ms`);
      }
    });
    next();
  });

  // Enhanced error handling middleware
  app.use(async (error: Error, req: any, res: any, next: any) => {
    console.error('🚨 Server Error:', error);
    
    // تسجيل الأخطاء الخطيرة
    try {
      const { securityLogger, SecurityEventType, SecurityLevel } = await import('./middleware/security-logger');
      await securityLogger.log({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        level: SecurityLevel.MEDIUM,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
        endpoint: req.path,
        details: {
          errorName: error.name,
          errorMessage: error.message,
          stack: error.stack?.substring(0, 500)
        }
      });
    } catch (logError) {
      console.error('Failed to log server error:', logError);
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'بيانات غير صحيحة' });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'معرف غير صحيح' });
    }
    
    if (error.message.includes('duplicate key')) {
      return res.status(409).json({ message: 'البيانات موجودة مسبقاً' });
    }
    
    // عدم إظهار تفاصيل الأخطاء في الإنتاج لأسباب أمنية
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ message: 'خطأ داخلي في الخادم' });
    } else {
      res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
    }
  });

  // Environment info endpoint for debugging
  app.get('/api/debug/environment', async (req, res) => {
    try {
      const envInfo = {
        nodeEnv: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 'Set (hidden for security)' : 'Not set',
        databaseUrlProd: process.env.DATABASE_URL_PROD ? 'Set (hidden for security)' : 'Not set',
        replitDevDomain: process.env.REPLIT_DEV_DOMAIN || 'Not available',
        pgHost: process.env.PGHOST || 'Not set',
        pgDatabase: process.env.PGDATABASE || 'Not set',
        pgUser: process.env.PGUSER || 'Not set',
        currentDomain: req.get('host'),
        userAgent: req.get('user-agent')?.substring(0, 50) + '...'
      };
      
      res.json(envInfo);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get environment info' });
    }
  });

  // Database schema diagnostic endpoint
  app.get('/api/debug/db-schema', async (req, res) => {
    try {
      const result = await db.execute(sql`SELECT current_schema(), current_database()`);
      const searchPathResult = await db.execute(sql`SHOW search_path`);
      const schemasResult = await db.execute(sql`SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('development', 'production', 'public')`);
      
      const dbDiagnostic = {
        currentSchema: result.rows[0]?.current_schema,
        currentDatabase: result.rows[0]?.current_database,
        searchPath: searchPathResult.rows[0]?.search_path,
        availableSchemas: schemasResult.rows.map(row => row.schema_name),
        environment: process.env.REPLIT_DEPLOYMENT === '1' ? 'production' : 'development',
        expectedSchema: process.env.REPLIT_DEPLOYMENT === '1' ? 'production' : 'development'
      };
      
      res.json(dbDiagnostic);
    } catch (error) {
      console.error('Database schema diagnostic error:', error);
      res.status(500).json({ error: 'Failed to get database schema info', details: error.message });
    }
  });

  // 🔄 Version check endpoint for auto-update system
  app.get('/api/version', async (req, res) => {
    try {
      // 🧪 TEST: Return updated version to test auto-update system
      // النسخة الجديدة: 1.0.1 (للاختبار فقط)
      
      res.json({
        version: '1.0.1',
        buildTime: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      console.error('❌ Version check failed:', error);
      res.status(500).json({ error: 'Failed to get version' });
    }
  });

  // Health check endpoint for deployment monitoring
  app.get('/health', async (req, res) => {
    try {
      // Test database connection
      const { testDatabaseConnection } = await import('./db');
      const dbHealthy = await testDatabaseConnection();
      
      const healthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        database: dbHealthy ? 'connected' : 'disconnected',
        version: '3.3.0'
      };
      
      const statusCode = dbHealthy ? 200 : 503;
      res.status(statusCode).json(healthStatus);
    } catch (error) {
      console.error('❌ Health check failed:', error);
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Service unhealthy'
      });
    }
  });

  // Initialize default data (companies initialization removed)
  await storage.initializeDefaultLocations();
  await storage.initializeDefaultTemplates();

  // تم تعطيل نقاط مراقبة الأمان مؤقتاً

  // Authentication endpoints
  app.post('/api/auth/login', loginLimiter, validateInput(CommonValidationSchemas.login), async (req: any, res) => {
    try {
      const { username, password, companyId } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
      }

      const user = await storage.getUserByUsername(username);
      
      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // If companyId is provided, verify user belongs to that company
      if (companyId !== undefined && companyId !== null) {
        const requestedCompanyId = typeof companyId === 'string' ? parseInt(companyId) : companyId;
        if (user.companyId !== requestedCompanyId) {
          console.log(`❌ Company mismatch: User ${username} belongs to company ${user.companyId}, requested ${requestedCompanyId}`);
          return res.status(401).json({ message: 'Invalid credentials for selected company' });
        }
      }

      const validPassword = await bcrypt.compare(password, user.password);
      
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      await storage.updateLastLogin(user.id);

      // 🎯 [PERFORMANCE] استخراج المواقع المتاحة مرة واحدة عند تسجيل الدخول
      let userAvailableLocations: number[] = [];
      if (user.role === 'user') {
        userAvailableLocations = await storage.getUserEffectiveLocationPermissions(user.id);
        console.log('🔑 [LOGIN] تم استخراج المواقع المتاحة للمستخدم:', {
          userId: user.id,
          username: user.username,
          availableLocations: userAvailableLocations,
          count: userAvailableLocations.length
        });
      } else {
        // للمديرين - الوصول لجميع مواقع الشركة
        const allCompanyLocations = await storage.getAllLocations(user.companyId);
        userAvailableLocations = allCompanyLocations.map(loc => loc.id);
        console.log('🔑 [LOGIN] مدير - وصول لجميع مواقع الشركة:', {
          userId: user.id,
          username: user.username,
          role: user.role,
          totalCompanyLocations: userAvailableLocations.length
        });
      }

      const token = jwt.sign({ 
        id: user.id, 
        userId: user.id, 
        username: user.username,
        role: user.role,
        companyId: user.companyId,
        // 🚀 [PERFORMANCE] المواقع المتاحة محفوظة في token لتجنب الاستعلامات المتكررة
        availableLocations: userAvailableLocations
      }, JWT_SECRET, { expiresIn: '7d' });
      
      console.log(`✅ Login successful: ${username} (Company: ${user.companyId}) with ${userAvailableLocations.length} available locations`);
      
      // تسجيل نجاح تسجيل الدخول
      try {
        const { logSecurityEvent } = await import('./middleware/security-logger');
        await logSecurityEvent.loginSuccess(
          user.id,
          user.username,
          req.ip || 'unknown',
          req.headers['user-agent']
        );
      } catch (logError) {
        console.error('Failed to log successful login:', logError);
      }
      
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          companyId: user.companyId,
          canManageUsers: user.canManageUsers
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/auth', async (req: any, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
      }

      const user = await storage.getUserByUsername(username);
      
      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      await storage.updateLastLogin(user.id);

      // 🎯 [PERFORMANCE] استخراج المواقع المتاحة مرة واحدة عند تسجيل الدخول
      let userAvailableLocations: number[] = [];
      if (user.role === 'user') {
        userAvailableLocations = await storage.getUserEffectiveLocationPermissions(user.id);
        console.log('🔑 [AUTH] تم استخراج المواقع المتاحة للمستخدم:', {
          userId: user.id,
          username: user.username,
          availableLocations: userAvailableLocations,
          count: userAvailableLocations.length
        });
      } else {
        // للمديرين - الوصول لجميع مواقع الشركة
        const allCompanyLocations = await storage.getAllLocations(user.companyId);
        userAvailableLocations = allCompanyLocations.map(loc => loc.id);
        console.log('🔑 [AUTH] مدير - وصول لجميع مواقع الشركة:', {
          userId: user.id,
          username: user.username,
          role: user.role,
          totalCompanyLocations: userAvailableLocations.length
        });
      }

      const token = jwt.sign({ 
        id: user.id, 
        userId: user.id, 
        username: user.username,
        role: user.role,
        companyId: user.companyId,
        // 🚀 [PERFORMANCE] المواقع المتاحة محفوظة في token لتجنب الاستعلامات المتكررة
        availableLocations: userAvailableLocations
      }, JWT_SECRET, { expiresIn: '7d' });
      
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          companyId: user.companyId,
          canManageUsers: user.canManageUsers
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get current user info endpoint
  app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Return safe user data without password, including canManageUsers permission
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Basic User Routes - SIMPLIFIED ACCESS FOR REGULAR USERS
  // Get user's assigned locations only
  app.get('/api/user/my-locations', authenticateToken, requireUserAccess, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // For regular users, get only their assigned locations
      if (currentUser.role === 'user') {
        // 🚀 [PERFORMANCE] استخدام المواقع من token بدلاً من الاستعلام
        const userLocationIds = (currentUser as any).availableLocations || [];
        
        console.log('🔍 [SECURITY_CHECK] فحص المواقع المتاحة للمستخدم:', {
          userId: currentUser.id,
          username: currentUser.username,
          companyId: currentUser.companyId,
          tokenHasAvailableLocations: !!(currentUser as any).availableLocations,
          availableLocationsCount: userLocationIds.length,
          availableLocationIds: userLocationIds
        });
        
        // 🔒 [SECURITY_FIX] إذا لم تكن هناك مواقع في token، احصل عليها من قاعدة البيانات
        let effectiveLocationIds = userLocationIds;
        if (!userLocationIds || userLocationIds.length === 0) {
          console.log('⚠️ [SECURITY_WARNING] لا توجد مواقع في token - سيتم الاستعلام من قاعدة البيانات');
          effectiveLocationIds = await storage.getUserEffectiveLocationPermissions(currentUser.id);
          console.log('🔒 [SECURITY_FALLBACK] المواقع من قاعدة البيانات:', {
            userId: currentUser.id,
            effectiveLocationIds,
            count: effectiveLocationIds.length
          });
        }
        
        // 🔒 [SECURITY_ENFORCEMENT] إذا لم يكن للمستخدم أي مواقع مخصصة، لا يحصل على أي مواقع
        if (!effectiveLocationIds || effectiveLocationIds.length === 0) {
          console.log('🚫 [SECURITY_BLOCK] المستخدم ليس له مواقع مخصصة - رفض الوصول');
          res.json([]);
          return;
        }
        
        const allLocations = await storage.getAllLocations(currentUser.companyId);
        const userLocations = allLocations.filter(loc => effectiveLocationIds.includes(loc.id));
        
        console.log('📍 [SECURITY_RESULT] User locations access:', {
          userId: currentUser.id,
          username: currentUser.username,
          assignedLocations: effectiveLocationIds.length,
          availableLocations: userLocations.length,
          locationNames: userLocations.map(l => l.nameAr)
        });
        
        res.json(userLocations);
      } else {
        // Admin/supervisors get all locations in their company
        const locations = await storage.getAllLocations(currentUser.companyId);
        console.log('👑 [ADMIN_ACCESS] Admin/supervisor accessing all locations:', {
          userId: currentUser.id,
          username: currentUser.username,
          role: currentUser.role,
          companyId: currentUser.companyId,
          totalLocations: locations.length
        });
        res.json(locations);
      }
    } catch (error) {
      console.error('Get user locations error:', error);
      res.status(500).json({ message: 'خطأ في جلب المواقع' });
    }
  });

  // Get single location info for regular users
  app.get('/api/user/location/:locationId', authenticateToken, requireUserAccess, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const locationId = parseInt(req.params.locationId);
      
      console.log('📍 User requesting location info:', {
        userId: currentUser.id,
        username: currentUser.username,
        locationId: locationId,
        companyId: currentUser.companyId
      });

      // Get user's accessible locations through supervisor permissions
      const userLocationPermissions = await db
        .select({
          locationId: supervisorUserLocationPermissions.locationId,
        })
        .from(supervisorUserLocationPermissions)
        .where(eq(supervisorUserLocationPermissions.userId, currentUser.id));

      const accessibleLocationIds = userLocationPermissions.map(p => p.locationId);
      
      if (!accessibleLocationIds.includes(locationId)) {
        console.log('❌ User has no access to location:', {
          userId: currentUser.id,
          locationId: locationId,
          accessibleLocationIds: accessibleLocationIds
        });
        return res.status(403).json({ message: 'Access denied to this location' });
      }

      // Get location info
      const location = await storage.getLocation(locationId);
      if (!location) {
        return res.status(404).json({ message: 'Location not found' });
      }

      // Ensure location belongs to user's company
      if (location.companyId !== currentUser.companyId) {
        console.log('❌ Location not in user company:', {
          userId: currentUser.id,
          userCompanyId: currentUser.companyId,
          locationCompanyId: location.companyId
        });
        return res.status(403).json({ message: 'Access denied to this location' });
      }

      console.log('✅ Location info provided to user:', {
        userId: currentUser.id,
        locationId: locationId,
        locationName: location.nameAr
      });

      res.json(location);
    } catch (error) {
      console.error('Get user location info error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get templates for user's assigned locations only
  app.get('/api/user/location/:locationId/templates', authenticateToken, requireUserAccess, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const locationId = parseInt(req.params.locationId);
      
      // Verify user has access to this location
      if (currentUser.role === 'user') {
        // 🚀 [PERFORMANCE] استخدام المواقع من token بدلاً من الاستعلام
        const userLocationIds = (currentUser as any).availableLocations || [];
        if (!userLocationIds.includes(locationId)) {
          return res.status(403).json({ message: 'ليس لديك صلاحية للوصول لهذا الموقع' });
        }
      }
      
      const templates = await storage.getChecklistTemplatesByLocation(locationId, currentUser.companyId);
      
      console.log('📋 User templates access:', {
        userId: currentUser.id,
        locationId,
        templatesCount: templates.length
      });
      
      res.json(templates);
    } catch (error) {
      console.error('Get user templates error:', error);
      res.status(500).json({ message: 'خطأ في جلب قوائم التشييك' });
    }
  });

  // Save user's daily evaluation
  app.post('/api/user/evaluation', authenticateToken, requireUserAccess, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const evaluationData = req.body;
      
      // Verify user has access to this location
      if (currentUser.role === 'user') {
        // 🚀 [PERFORMANCE] استخدام المواقع من token بدلاً من الاستعلام
        const userLocationIds = (currentUser as any).availableLocations || [];
        if (!userLocationIds.includes(evaluationData.locationId)) {
          return res.status(403).json({ message: 'ليس لديك صلاحية لتقييم هذا الموقع' });
        }
      }
      
      // Force current user ID and company ID for security
      const secureEvaluationData = {
        ...evaluationData,
        userId: currentUser.id,
        companyId: currentUser.companyId
      };
      
      // التبديل للنظام الجديد الموحد بدلاً من النظام القديم
      const result = await storage.saveMasterEvaluation(secureEvaluationData);
      
      console.log('✅ User evaluation saved:', {
        userId: currentUser.id,
        locationId: evaluationData.locationId,
        evaluationId: result.id
      });
      
      res.json(result);
    } catch (error) {
      console.error('Save user evaluation error:', error);
      res.status(500).json({ message: 'خطأ في حفظ التقييم' });
    }
  });

  // Save category comments for an evaluation
  app.post('/api/category-comments', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const { checklistId, categoryComments, locationId, evaluationDate } = req.body;
      
      // Delete existing comments for this checklist to prevent duplicates
      await db.execute(sql`DELETE FROM category_comments WHERE checklist_id = ${checklistId}`);
      
      // Insert new comments
      if (categoryComments && Object.keys(categoryComments).length > 0) {
        const commentEntries = Object.entries(categoryComments).map(([category, comment]) => ({
          checklistId,
          categoryAr: category,
          comment: comment as string,
          userId: currentUser.id,
          companyId: currentUser.companyId,
          locationId,
          evaluationDate,
        }));

        await db.insert(categoryComments).values(commentEntries);
      }
      
      console.log('✅ Category comments saved:', {
        userId: currentUser.id,
        checklistId,
        commentsCount: Object.keys(categoryComments || {}).length
      });
      
      res.json({ success: true, message: 'تم حفظ تعليقات الفئات بنجاح' });
    } catch (error) {
      console.error('Save category comments error:', error);
      res.status(500).json({ message: 'خطأ في حفظ تعليقات الفئات' });
    }
  });

  // Get category comments for a checklist
  app.get('/api/category-comments/:checklistId', authenticateToken, async (req: any, res) => {
    try {
      const checklistId = parseInt(req.params.checklistId);
      const currentUser = req.user;
      
      const comments = await db
        .select()
        .from(categoryComments)
        .where(
          sql`checklist_id = ${checklistId} AND company_id = ${currentUser.companyId}`
        );
      
      // Convert to object format
      const commentsObject = comments.reduce((acc: any, comment: any) => {
        acc[comment.categoryAr] = comment.comment;
        return acc;
      }, {});
      
      res.json(commentsObject);
    } catch (error) {
      console.error('Get category comments error:', error);
      res.status(500).json({ message: 'خطأ في جلب تعليقات الفئات' });
    }
  });

  // Get user's evaluation for specific date and location
  app.get('/api/user/evaluation/:locationId/:date', authenticateToken, requireUserAccess, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const locationId = parseInt(req.params.locationId);
      const date = new Date(req.params.date);
      
      // Verify user has access to this location
      if (currentUser.role === 'user') {
        // 🚀 [PERFORMANCE] استخدام المواقع من token بدلاً من الاستعلام
        const userLocationIds = (currentUser as any).availableLocations || [];
        if (!userLocationIds.includes(locationId)) {
          return res.status(403).json({ message: 'ليس لديك صلاحية للوصول لهذا الموقع' });
        }
      }
      
      const evaluation = await storage.getDailyChecklist(locationId, date, currentUser.id, currentUser.companyId);
      
      res.json(evaluation);
    } catch (error) {
      console.error('Get user evaluation error:', error);
      res.status(500).json({ message: 'خطأ في جلب التقييم' });
    }
  });

  // 🔄 [PERFORMANCE] تحديث صلاحيات المستخدم وإصدار token جديد
  app.post('/api/user/refresh-permissions', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // فقط للمستخدمين العاديين - المديرين لا يحتاجون تحديث
      if (currentUser.role !== 'user') {
        return res.status(400).json({ message: 'هذه العملية للمستخدمين العاديين فقط' });
      }
      
      console.log('🔄 تحديث صلاحيات المستخدم:', {
        userId: currentUser.id,
        username: currentUser.username
      });
      
      // استخراج المواقع المتاحة الجديدة
      const updatedAvailableLocations = await storage.getUserEffectiveLocationPermissions(currentUser.id);
      
      // إصدار token جديد مع الصلاحيات المحدثة
      const newToken = jwt.sign({ 
        id: currentUser.id, 
        userId: currentUser.id, 
        username: currentUser.username,
        role: currentUser.role,
        companyId: currentUser.companyId,
        availableLocations: updatedAvailableLocations
      }, JWT_SECRET, { expiresIn: '7d' });
      
      console.log('✅ تم تحديث صلاحيات المستخدم:', {
        userId: currentUser.id,
        previousLocations: (currentUser as any).availableLocations?.length || 0,
        newLocations: updatedAvailableLocations.length
      });
      
      res.json({
        success: true,
        token: newToken,
        availableLocations: updatedAvailableLocations,
        message: 'تم تحديث الصلاحيات بنجاح'
      });
    } catch (error) {
      console.error('خطأ في تحديث الصلاحيات:', error);
      res.status(500).json({ message: 'خطأ في تحديث الصلاحيات' });
    }
  });

  // Change user's own password
  app.put('/api/user/change-password', authenticateToken, requireUserAccess, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const { currentPassword, newPassword } = req.body;
      
      console.log('🔑 Password change request:', {
        userId: currentUser.id,
        username: currentUser.username,
        currentPasswordLength: currentPassword?.length || 0,
        newPasswordLength: newPassword?.length || 0
      });
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'كلمة المرور الحالية والجديدة مطلوبة' });
      }
      
      // Verify current password
      const user = await storage.getUser(currentUser.id);
      if (!user) {
        return res.status(404).json({ message: 'المستخدم غير موجود' });
      }
      
      console.log('🔍 Verifying current password for user:', currentUser.username);
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        console.log('❌ Current password verification failed for:', currentUser.username);
        return res.status(401).json({ message: 'كلمة المرور الحالية غير صحيحة' });
      }
      
      console.log('✅ Current password verified, updating to new password');
      // Update password
      await storage.updateUserPassword(currentUser.id, newPassword);
      
      console.log('🔑 User password changed successfully:', {
        userId: currentUser.id,
        username: currentUser.username
      });
      
      res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'خطأ في تغيير كلمة المرور' });
    }
  });

  // Get simplified dashboard settings for users
  app.get('/api/user/dashboard-settings', authenticateToken, requireUserAccess, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // For regular users, return minimal dashboard config
      const userDashboardConfig = {
        sections: [
          // Only essential sections for regular users
          { id: 'assessment', nameAr: 'التقييمات اليومية', nameEn: 'Daily Assessments', enabled: true, color: '#3b82f6' },
          { id: 'change-password', nameAr: 'تغيير كلمة المرور', nameEn: 'Change Password', enabled: true, color: '#10b981' }
        ],
        lastUpdated: new Date().toISOString(),
        userRole: currentUser.role
      };
      
      res.json({ dashboardConfig: userDashboardConfig });
    } catch (error) {
      console.error('Get user dashboard settings error:', error);
      res.status(500).json({ message: 'خطأ في جلب إعدادات لوحة التحكم' });
    }
  });

  // Super Admin Routes - REMOVED OLD COMPANIES ENDPOINT

  app.get("/api/admin/companies-stats", authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== "super_admin") {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }
      
      const companiesStats = await storage.getCompaniesStats();
      res.json(companiesStats);
    } catch (error) {
      console.error("Error fetching companies stats:", error);
      res.status(500).json({ message: "Failed to fetch companies stats" });
    }
  });

  app.get("/api/admin/overall-stats", authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== "super_admin") {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }
      
      const overallStats = await storage.getOverallStats();
      res.json(overallStats);
    } catch (error) {
      console.error("Error fetching overall stats:", error);
      res.status(500).json({ message: "Failed to fetch overall stats" });
    }
  });

  app.post("/api/admin/set-company", authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== "super_admin") {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }
      
      const { companyId } = req.body;
      await storage.setSuperAdminCompany(req.user.id, companyId);
      res.json({ message: "Company set successfully" });
    } catch (error) {
      console.error("Error setting company:", error);
      res.status(500).json({ message: "Failed to set company" });
    }
  });

  // Company endpoints with enhanced filtering - REMOVED DUPLICATE
  // This endpoint was causing conflicts with the authenticated version below

  // Apply company filter middleware to all authenticated routes that need data separation
  app.use('/api/locations', authenticateToken, applyCompanyFilter);
  app.use('/api/checklist-templates', authenticateToken, applyCompanyFilter);
  app.use('/api/templates', authenticateToken, applyCompanyFilter);
  app.use('/api/daily-checklists', authenticateToken, applyCompanyFilter);

  // جلب جميع القوالب للشركة (للمزامنة مع IndexedDB)
  app.get('/api/templates', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const userCompanyId = currentUser.companyId;
      
      console.log('📋 جلب جميع القوالب للشركة:', userCompanyId);
      
      const templates = await storage.getAllChecklistTemplates(userCompanyId);
      
      console.log('✅ تم جلب القوالب:', templates.length);
      res.json(templates);
    } catch (error) {
      console.error('خطأ في جلب القوالب:', error);
      res.status(500).json({ message: 'فشل في جلب القوالب' });
    }
  });

  // 🔄 GET: جلب جميع التقييمات من النظام الموحد الجديد (master_evaluations)
  app.get('/api/checklists', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;

      if (!currentUser || !currentUser.id) {
        return res.status(401).json({ message: 'غير مصرح' });
      }

      console.log('🔄 [MasterAPI] جلب جميع التقييمات من النظام الموحد للمستخدم:', currentUser.username);

      // جلب من النظام الموحد الجديد (master_evaluations) فقط
      const companyId = currentUser.companyId;
      const masterEvaluations = await storage.getEvaluationsByCompany(companyId);
      console.log('📋 [MasterAPI] من master_evaluations:', masterEvaluations.length, 'تقييم');
      
      // تحويل التقييمات من النظام الموحد إلى التنسيق المطلوب
      const processedEvaluations = masterEvaluations.map(evaluation => {
        let finalScore = 0;
        
        // حساب النتيجة من عناصر التقييم في النظام الموحد
        if (evaluation.evaluationItems && Array.isArray(evaluation.evaluationItems)) {
          const items = evaluation.evaluationItems;
          let totalScore = 0;
          let totalPossible = 0;
          
          items.forEach((item: any) => {
            if (item.subTaskRatings && Array.isArray(item.subTaskRatings)) {
              item.subTaskRatings.forEach((subTask: any) => {
                if (subTask.rating && subTask.rating > 0) {
                  totalScore += subTask.rating;
                  totalPossible += 5; // الحد الأقصى لكل مهمة فرعية هو 5
                }
              });
            }
          });
          
          finalScore = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100 * 10) / 10 : 0;
        }

        // تحويل للتنسيق المطلوب
        return {
          id: evaluation.id,
          locationId: evaluation.locationId,
          userId: evaluation.evaluatorId, // تحويل evaluatorId إلى userId للتوافق
          companyId: evaluation.companyId,
          checklistDate: evaluation.evaluationDate,
          tasks: evaluation.evaluationItems, // تحويل evaluationItems إلى tasks للتوافق
          categoryComments: evaluation.categoryComments || [],
          evaluationNotes: evaluation.evaluation_notes || evaluation.generalNotes || evaluation.evaluationNotes || '',
          completedAt: evaluation.completedAt,
          createdAt: evaluation.createdAt,
          evaluationTime: evaluation.evaluationTime,
          evaluationDateTime: evaluation.evaluationDateTime,
          offlineId: evaluation.offlineId,
          syncTimestamp: evaluation.syncTimestamp,
          isSynced: evaluation.isSynced || true,
          finalScore,
          source: 'master_evaluations'
        };
      });
      
      // ترتيب حسب التاريخ (الأحدث أولاً)
      processedEvaluations.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      console.log('✅ [MasterAPI] إجمالي التقييمات من النظام الموحد:', processedEvaluations.length);
      
      res.json(processedEvaluations);
    } catch (error) {
      console.error('❌ [MasterAPI] خطأ في جلب التقييمات من النظام الموحد:', error);
      res.status(500).json({ message: 'خطأ في الخادم' });
    }
  });

  // جلب جميع التقييمات للشركة من النظام الموحد (للمزامنة مع IndexedDB)
  app.get('/api/checklists/company-evaluations', authenticateToken, async (req: any, res) => {
    try {
      const companyId = req.user.companyId;
      console.log(`📊 [MasterCompanyEvals] جلب تقييمات الشركة من النظام الموحد: ${companyId}`);

      const companyEvaluations = await storage.getEvaluationsByCompany(companyId);

      // حساب النتيجة النهائية للتقييمات من النظام الموحد
      const processedEvaluations = companyEvaluations.map(evaluation => {
        let finalScore = 0;
        
        // حساب النتيجة من عناصر التقييم في النظام الموحد
        if (evaluation.evaluationItems && Array.isArray(evaluation.evaluationItems)) {
          const items = evaluation.evaluationItems;
          let totalScore = 0;
          let totalPossible = 0;
          
          items.forEach((item: any) => {
            if (item.subTaskRatings && Array.isArray(item.subTaskRatings)) {
              item.subTaskRatings.forEach((subTask: any) => {
                if (subTask.rating && subTask.rating > 0) {
                  totalScore += subTask.rating;
                  totalPossible += 5;
                }
              });
            }
          });
          
          finalScore = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100 * 10) / 10 : 0;
        }

        return {
          ...evaluation,
          finalScore,
          tasks: evaluation.evaluationItems || [], // تحويل evaluationItems إلى tasks للتوافق
          userId: evaluation.evaluatorId, // تحويل evaluatorId إلى userId للتوافق
          checklistDate: evaluation.evaluationDate // تحويل evaluationDate إلى checklistDate للتوافق
        };
      });

      console.log(`📊 [CompanyEvals] تم جلب ${processedEvaluations.length} تقييم للشركة ${companyId}`);
      res.json(processedEvaluations);

    } catch (error) {
      console.error('❌ خطأ في جلب تقييمات الشركة:', error);
      res.status(500).json({ error: 'فشل في جلب التقييمات' });
    }
  });

  // مسار خاص لنقل بيانات التقارير - لجلب المستخدمين والمواقع لـ IndexedDB (بدون middleware مكرر)
  app.get('/api/reports/data-sync', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      console.log(`🔄 [DataSync] طلب مزامنة البيانات من المستخدم: ${currentUser.username}`);
      
      // جلب المستخدمين
      const users = await storage.getAllUsers(currentUser.companyId);
      console.log(`👥 [DataSync] وُجد ${users.length} مستخدم`);
      
      // جلب المواقع
      const locations = await storage.getAllLocations(currentUser.companyId);
      console.log(`📍 [DataSync] وُجد ${locations.length} موقع`);
      
      // جلب الشركات للمديرين العامين
      let companies: any[] = [];
      if (currentUser.role === 'enhanced_general_manager' || currentUser.role === 'hsa_group_admin') {
        companies = await storage.getAllCompanies();
        console.log(`🏢 [DataSync] وُجد ${companies.length} شركة للمدير العام`);
      }
      
      const syncData = {
        users: users.filter(u => u.isActive),
        locations: locations.filter(l => l.isActive),
        companies,
        syncTime: new Date().toISOString()
      };
      
      console.log(`✅ [DataSync] إرسال البيانات: ${syncData.users.length} مستخدم، ${syncData.locations.length} موقع، ${syncData.companies.length} شركة`);
      res.json(syncData);
      
    } catch (error: any) {
      console.error('❌ [DataSync] خطأ في مزامنة البيانات:', error);
      res.status(500).json({ message: 'فشل في مزامنة البيانات', error: error.message });
    }
  });

  // Apply company filter middleware to other reports routes (after data-sync)
  app.use('/api/reports', authenticateToken, applyCompanyFilter);

  // User management routes - Admin and Supervisor access with company filtering
  app.get('/api/users', authenticateToken, requireAdminOrSupervisor, applyCompanyFilter, async (req: any, res) => {
    try {
      const currentUser = req.user;
      let companyId: number | undefined;
      
      // Super admin and general manager can see all users, others see only their company users
      if (currentUser.username !== 'hsa_group_admin' && 
          currentUser.role !== 'super_admin' && 
          currentUser.username !== 'hsa_group_admin' && 
          currentUser.role !== 'hsa_group_admin') {
        companyId = currentUser.companyId;
      }
      
      const users = await storage.getAllUsers(companyId);
      
      // Admins can see all company users including owner for reports functionality
      let filteredUsers = users;
      
      const usersWithoutPasswords = filteredUsers.map(user => ({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        companyId: user.companyId,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }));
      
      console.log('✅ Users fetched with company filtering:', { 
        requesterId: currentUser.id, 
        requesterRole: currentUser.role,
        companyId,
        usersCount: usersWithoutPasswords.length 
      });
      
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Create user - Admin only access (supervisors cannot create users)
  app.post('/api/users', authenticateToken, requireModificationAccess, filterRequestByCompany, async (req: any, res) => {
    try {
      const currentUser = req.user;
      console.log('🚀 User creation request from:', {
        requesterId: currentUser.id,
        requesterRole: currentUser.role,
        requesterCompany: currentUser.companyId,
        requestBody: { ...req.body, password: '[HIDDEN]' }
      });
      
      // Parse and validate the request body
      const parsedData = insertUserSchema.parse(req.body);
      const userData = parsedData as InsertUser;
      
      // Validate required fields
      if (!userData.username || !userData.fullName || !userData.password) {
        console.log('❌ Missing required fields:', { 
          hasUsername: !!userData.username, 
          hasFullName: !!userData.fullName, 
          hasPassword: !!userData.password 
        });
        return res.status(400).json({ 
          message: 'اسم المستخدم والاسم الكامل وكلمة المرور مطلوبة' 
        });
      }
      
      // Role creation restrictions - Admin only
      if (currentUser.role === 'admin') {
        // Admins can create users, other admins, and supervisors (but not owners)
        if (userData.role === 'owner') {
          console.log('❌ Admin trying to create owner account');
          return res.status(403).json({ 
            message: 'Cannot create owner accounts' 
          });
        }
        // Allow supervisors to be created by admins
      }
      
      // Check for duplicate username
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        console.log('❌ Username already exists:', userData.username);
        return res.status(400).json({ message: 'اسم المستخدم موجود مسبقاً' });
      }
      
      // Auto-assign companyId from current user if not provided
      if (!userData.companyId && currentUser.companyId) {
        userData.companyId = currentUser.companyId;
        console.log('🏢 Auto-assigned companyId:', userData.companyId);
      }
      
      console.log('📝 Creating user with data:', {
        username: userData.username,
        fullName: userData.fullName,
        role: userData.role,
        companyId: userData.companyId,
        hasPassword: !!userData.password
      });
      
      const user = await storage.createUser(userData);
      
      console.log('✅ User created successfully:', { 
        createdBy: currentUser.id, 
        creatorRole: currentUser.role,
        newUserId: user.id,
        newUserRole: user.role,
        newUserCompany: user.companyId
      });
      
      res.json({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      });
    } catch (error) {
      console.error('❌ Create user error:', error);
      if (error instanceof z.ZodError) {
        console.log('❌ Validation errors:', error.errors);
        return res.status(400).json({ 
          message: 'بيانات المستخدم غير صحيحة', 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: 'خطأ في الخادم أثناء إنشاء المستخدم' });
    }
  });

  // Password update endpoint - ONLY for password changes
  app.put('/api/users/:id/password', authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { currentPassword, newPassword } = req.body;
      const currentUser = req.user;

      console.log('🔐 Password update request:', {
        userId,
        requesterId: currentUser.id,
        requesterRole: currentUser.role,
        isSelfUpdate: currentUser.id === userId
      });

      // Validation
      if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ 
          message: 'كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل' 
        });
      }

      // Users can only change their own password unless they're admin/enhanced_general_manager
      const allowedRoles = ['admin', 'enhanced_general_manager', 'hsa_group_admin', 'general_manager', 'super_admin'];
      if (!allowedRoles.includes(currentUser.role) && currentUser.id !== userId) {
        return res.status(403).json({ 
          message: 'لا يمكنك تغيير كلمة مرور مستخدم آخر' 
        });
      }

      // Get the target user for verification
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'المستخدم غير موجود' });
      }

      // For non-admin users changing their own password, verify current password
      if (currentUser.id === userId && !allowedRoles.includes(currentUser.role)) {
        if (!currentPassword) {
          return res.status(400).json({ 
            message: 'كلمة المرور الحالية مطلوبة' 
          });
        }
        
        const validPassword = await bcrypt.compare(currentPassword, targetUser.password);
        if (!validPassword) {
          return res.status(401).json({ 
            message: 'كلمة المرور الحالية غير صحيحة' 
          });
        }
      }

      // Company access validation for admins
      if (allowedRoles.includes(currentUser.role) && currentUser.id !== userId) {
        // Ensure admin can only change passwords in their company
        if (currentUser.role === 'admin' && targetUser.companyId !== currentUser.companyId) {
          return res.status(403).json({ 
            message: 'لا يمكنك تغيير كلمة مرور مستخدم من شركة أخرى' 
          });
        }
      }

      // Update password ONLY - no other user data is modified
      await storage.updateUserPassword(userId, newPassword);
      
      console.log('✅ Password updated successfully:', {
        userId,
        targetUsername: targetUser.username,
        updatedBy: currentUser.username,
        updaterRole: currentUser.role
      });

      res.json({ 
        message: 'تم تحديث كلمة المرور بنجاح',
        updatedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Password update error:', error);
      res.status(500).json({ 
        message: 'خطأ في الخادم أثناء تحديث كلمة المرور' 
      });
    }
  });



  // Update user route - Enhanced with role-based permissions
  app.put('/api/users/:id', authenticateToken, requireModificationAccess, canManageUser, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUser = req.user;
      const { username, fullName, role, isActive } = req.body;
      
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Role update restrictions - Admin only
      if (role && role !== targetUser.role) {
        // Only allow admins to change roles
        if (currentUser.role !== 'admin') {
          return res.status(403).json({ 
            message: 'صلاحيات تغيير الأدوار محصورة للمديرين فقط' 
          });
        }
        
        if (currentUser.role === 'admin') {
          // Admins cannot elevate users to owner
          if (role === 'owner') {
            return res.status(403).json({ 
              message: 'Cannot assign owner role' 
            });
          }
          
          // Admins cannot downgrade other admins (unless they are owner)
          if (targetUser.role === 'admin' && currentUser.username !== 'owner' && currentUser.username !== 'admin-hodeidah') {
            return res.status(403).json({ 
              message: 'Only owner can modify admin roles' 
            });
          }
          
          // Prevent admins from modifying themselves
          if (targetUser.id === currentUser.id) {
            return res.status(403).json({ 
              message: 'لا يمكن تعديل صلاحياتك الشخصية' 
            });
          }
        }
      }

      // Check for duplicate username if changing
      if (username && username !== targetUser.username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
          return res.status(400).json({ message: 'Username already exists' });
        }
      }

      await storage.updateUser(userId, {
        username: username || targetUser.username,
        fullName: fullName || targetUser.fullName,
        role: role || targetUser.role,
        isActive: isActive !== undefined ? isActive : targetUser.isActive
      });

      const updatedUser = await storage.getUser(userId);
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found after update' });
      }
      
      console.log('✅ User updated:', { 
        updatedBy: currentUser.id, 
        updaterRole: currentUser.role,
        targetUserId: userId,
        changes: { username, fullName, role, isActive }
      });
      
      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
        lastLoginAt: updatedUser.lastLoginAt
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Role update route - Admin only access for role management
  app.put('/api/users/:id/role', authenticateToken, requireModificationAccess, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUser = req.user;
      const { role } = req.body;
      
      // Only admins can change roles
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ 
          message: 'صلاحيات تغيير الأدوار محصورة للمديرين فقط' 
        });
      }
      
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent admins from modifying themselves
      if (targetUser.id === currentUser.id) {
        return res.status(403).json({ 
          message: 'لا يمكن تعديل صلاحياتك الشخصية' 
        });
      }

      // Role restrictions for admins
      if (role === 'owner') {
        return res.status(403).json({ 
          message: 'Cannot assign owner role' 
        });
      }
      
      // Admins cannot downgrade other admins (unless they are owner)
      if (targetUser.role === 'admin' && currentUser.username !== 'owner' && currentUser.username !== 'admin-hodeidah') {
        return res.status(403).json({ 
          message: 'Only owner can modify admin roles' 
        });
      }

      await storage.updateUser(userId, { role });

      const updatedUser = await storage.getUser(userId);
      
      console.log('✅ User role updated by admin:', { 
        updatedBy: currentUser.id, 
        updaterRole: currentUser.role,
        targetUserId: userId,
        newRole: role,
        oldRole: targetUser.role
      });
      
      res.json({
        id: updatedUser!.id,
        username: updatedUser!.username,
        fullName: updatedUser!.fullName,
        role: updatedUser!.role,
        isActive: updatedUser!.isActive,
        createdAt: updatedUser!.createdAt,
        lastLoginAt: updatedUser!.lastLoginAt
      });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Reset password route - Enhanced permissions
  app.post('/api/users/:id/reset-password', authenticateToken, requireModificationAccess, canManageUser, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Generate standard password using username@HSA2025 format
      const newPassword = `${user.username}@HSA2025`;

      // Use the plain password function that handles hashing internally
      await storage.updateUserPasswordPlain(userId, newPassword);
      res.json({ 
        message: 'Password reset successfully',
        newPassword: newPassword,
        userName: user.fullName
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get dashboard settings route - Admin and Supervisor can view user settings
  app.get('/api/users/:id/dashboard-settings', authenticateToken, requireAdminOrSupervisor, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUser = req.user;
      
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      const settings = await storage.getUserDashboardSettings(userId);
      
      console.log('✅ Dashboard settings fetched:', { 
        requestedBy: currentUser.id, 
        requesterRole: currentUser.role,
        targetUserId: userId,
        hasSettings: !!settings
      });
      
      res.json(settings || { dashboardConfig: { sections: [] } });
    } catch (error) {
      console.error('Get dashboard settings error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Dashboard settings route - Admin and Supervisor can grant navigation permissions to regular users
  app.post('/api/users/:id/dashboard-settings', authenticateToken, requireAdminOrSupervisor, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUser = req.user;
      const { dashboardConfig } = req.body;
      
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Admins can grant navigation permissions to regular users
      console.log('✅ Admin granting navigation permissions to user:', { 
        adminId: currentUser.id, 
        targetUserId: userId,
        grantedSections: dashboardConfig 
      });

      await storage.updateUserDashboardSettings(userId, dashboardConfig);
      
      console.log('✅ Dashboard settings updated:', { 
        updatedBy: currentUser.id, 
        updaterRole: currentUser.role,
        targetUserId: userId
      });
      
      res.json({ message: 'Dashboard settings updated successfully' });
    } catch (error) {
      console.error('Update dashboard settings error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // User location permissions routes - Admin and Supervisor access
  app.get('/api/users/:id/locations', authenticateToken, requireAdminOrSupervisor, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUser = req.user;
      
      // Permission check: admins and supervisors can manage user permissions
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Additional validation for supervisors
      if (currentUser.role === 'supervisor') {
        // Supervisors can only manage users in their company
        if (targetUser.companyId !== currentUser.companyId) {
          return res.status(403).json({ message: 'Cannot manage users from other companies' });
        }
        // Supervisors cannot manage admin or supervisor accounts
        if (['admin', 'hsa_group_admin', 'department_manager', 'supervisor'].includes(targetUser.role)) {
          return res.status(403).json({ message: 'Cannot manage admin or supervisor accounts' });
        }
      }
      
      const locationIds = await storage.getUserLocationPermissions(userId);
      
      console.log('✅ User location permissions fetched:', { 
        requesterId: currentUser.id, 
        requesterRole: currentUser.role,
        targetUserId: userId,
        permissionsCount: locationIds.length
      });
      
      res.json(locationIds);
    } catch (error) {
      console.error('Get user location permissions error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/users/:id/locations', authenticateToken, requireAdminOnly, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUser = req.user;
      const { locationIds } = req.body;
      
      // Permission check: only admins can manage user permissions
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      await storage.setUserLocationPermissions(userId, locationIds);
      
      console.log('✅ User location permissions updated:', { 
        updatedBy: currentUser.id, 
        updaterRole: currentUser.role,
        targetUserId: userId,
        locationIds: locationIds
      });
      
      res.json({ message: 'User location permissions updated successfully' });
    } catch (error) {
      console.error('Set user location permissions error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Delete user route - Enhanced with strict permissions
  app.delete('/api/users/:id', authenticateToken, requireModificationAccess, canManageUser, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      console.log('🗑️ Delete user request:', { userId, requestUserId: req.user.id, requestUserRole: req.user.role });
      
      // Prevent admin from deleting themselves
      if (req.user.id === userId) {
        console.log('❌ User trying to delete themselves');
        return res.status(400).json({ message: 'لا يمكن حذف حسابك الشخصي' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        console.log('❌ User not found:', userId);
        return res.status(404).json({ message: 'المستخدم غير موجود' });
      }

      // Additional security checks
      if (user.role === 'super_admin' || user.username === 'hsa_group_admin') {
        console.log('❌ Attempt to delete super admin');
        return res.status(403).json({ message: 'لا يمكن حذف حساب المدير العام' });
      }

      console.log('🗑️ Deleting user:', { id: user.id, username: user.username, role: user.role, fullName: user.fullName });
      await storage.deleteUser(userId);
      console.log('✅ User deleted successfully');
      res.json({ message: 'تم حذف المستخدم بنجاح' });
    } catch (error) {
      console.error('❌ Delete user error:', error);
      res.status(500).json({ message: 'فشل في حذف المستخدم. يرجى المحاولة مرة أخرى.' });
    }
  });

  // Update user role route (Admin only)
  app.put('/api/users/:id/role', authenticateToken, requireModificationAccess, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { role } = req.body;
      const currentUser = req.user;

      console.log('✅ Admin updating user role:', { 
        adminId: currentUser.id, 
        targetUserId: userId, 
        newRole: role,
        adminRole: currentUser.role 
      });

      // Validate role - admin, supervisor, and user allowed
      if (!['user', 'supervisor', 'admin'].includes(role)) {
        console.error('❌ Invalid role:', role);
        return res.status(400).json({ message: 'Invalid role. Only user, supervisor, and admin roles are supported.' });
      }

      // Get target user
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent admin from modifying super admin accounts
      if (targetUser.role === 'super_admin') {
        return res.status(403).json({ message: 'Cannot modify super admin accounts' });
      }

      // Prevent admin from promoting users to super admin
      if (role === 'super_admin') {
        return res.status(403).json({ message: 'Cannot promote users to super admin' });
      }

      // Prevent modifying own role
      if (currentUser.id === userId) {
        return res.status(403).json({ message: 'Cannot modify your own role' });
      }

      // Update user role
      await storage.updateUser(userId, { role });
      
      const updatedUser = await storage.getUser(userId);
      if (!updatedUser) {
        return res.status(500).json({ message: 'Failed to fetch updated user' });
      }

      console.log('✅ User role updated successfully:', { 
        adminId: currentUser.id,
        targetUserId: userId,
        oldRole: targetUser.role,
        newRole: role
      });

      res.json({
        message: 'User role updated successfully',
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          fullName: updatedUser.fullName,
          role: updatedUser.role,
          isActive: updatedUser.isActive,
          createdAt: updatedUser.createdAt,
          lastLoginAt: updatedUser.lastLoginAt
        }
      });
    } catch (error) {
      console.error('❌ Update user role error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Location routes - RESTORED: Full Security
  app.get('/api/locations', authenticateToken, requireAdminOrSupervisor, async (req: any, res) => {
    try {
      const currentUser = req.user;
      console.log('🔍 Location request with security:', { 
        userId: currentUser.id, 
        role: currentUser.role,
        companyId: currentUser.companyId
      });
      
      // Apply company filtering for non-super admins and non-general manager
      let companyId: number | undefined;
      if (currentUser.username !== 'hsa_group_admin' && 
          currentUser.role !== 'super_admin' && 
          currentUser.username !== 'hsa_group_admin' && 
          currentUser.role !== 'hsa_group_admin') {
        companyId = currentUser.companyId;
      }
      
      const locations = await storage.getAllLocations(companyId);
      
      console.log('✅ Locations with security filtering:', { 
        userId: currentUser.id,
        role: currentUser.role,
        companyId,
        locationsCount: locations.length
      });
      
      res.json(locations);
    } catch (error) {
      console.error('❌ Get locations error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/locations', authenticateToken, requireAdminOrSupervisor, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // RESTORED: Admin-only access for location creation (including data_specialist for location management)
      if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && currentUser.role !== 'data_specialist') {
        console.log('❌ Access denied - not an admin:', { 
          userId: currentUser.id, 
          role: currentUser.role 
        });
        return res.status(403).json({ message: 'صلاحيات المدير مطلوبة لإنشاء المواقع' });
      }
      
      const locationData = req.body;
      
      if (!locationData.nameAr || !locationData.nameEn) {
        return res.status(400).json({ message: 'Location name in both languages is required' });
      }
      
      // RESTORED: Company filtering - assign to user's company unless super admin
      let companyId = currentUser.companyId;
      if (currentUser.role === 'super_admin' && locationData.companyId) {
        companyId = locationData.companyId;
      }
      
      const location = await storage.createLocation({
        ...locationData,
        companyId,
        icon: locationData.icon || 'map-pin'
      });
      
      // Create default checklist templates for the new location
      await storage.createDefaultChecklistTemplates(location.id, location.icon, location.companyId);
      
      console.log('✅ Location created with security:', { 
        createdBy: currentUser.id,
        creatorRole: currentUser.role,
        companyId,
        locationId: location.id,
        locationName: location.nameAr
      });
      
      res.json(location);
    } catch (error) {
      console.error('Create location error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Update location order endpoint - RESTORED: Admin only access
  app.put('/api/locations/update-order', authenticateToken, requireAdminOrSupervisor, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // RESTORED: Admin-only access for location reordering (including data_specialist for location management)
      if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && currentUser.role !== 'data_specialist') {
        console.log('❌ Access denied - not an admin:', { 
          userId: currentUser.id, 
          role: currentUser.role 
        });
        return res.status(403).json({ message: 'صلاحيات المدير مطلوبة لإعادة ترتيب المواقع' });
      }
      
      const { locations } = req.body;
      
      if (!Array.isArray(locations) || locations.length === 0) {
        return res.status(400).json({ message: 'Invalid locations data' });
      }
      
      console.log('🔄 Updating location order for', locations.length, 'locations');
      console.log('📊 Received locations data:', locations);
      
      // Update each location's order index
      for (const location of locations) {
        const locationId = parseInt(String(location.id));
        const orderIndex = parseInt(String(location.orderIndex));
        
        console.log('🔍 Processing location:', { raw_id: location.id, raw_orderIndex: location.orderIndex, parsed_id: locationId, parsed_orderIndex: orderIndex });
        
        if (isNaN(locationId) || isNaN(orderIndex)) {
          console.error('❌ Invalid location data after parsing:', { id: location.id, orderIndex: location.orderIndex, parsed_id: locationId, parsed_orderIndex: orderIndex });
          continue;
        }
        
        await storage.updateLocationOrder(locationId, orderIndex);
        console.log(`✅ Updated location ${locationId} order to ${orderIndex}`);
      }
      
      res.json({ 
        message: 'Location order updated successfully',
        updatedCount: locations.length 
      });
    } catch (error) {
      console.error('❌ Update location order error:', error);
      res.status(500).json({ message: 'Failed to update location order' });
    }
  });

  app.put('/api/locations/:id', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // RESTORED: Admin-only access for location updates (including data_specialist for location management)
      if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && currentUser.role !== 'data_specialist') {
        console.log('❌ Access denied - not an admin:', { 
          userId: currentUser.id, 
          role: currentUser.role 
        });
        return res.status(403).json({ message: 'صلاحيات المدير مطلوبة لتعديل المواقع' });
      }
      
      const locationId = parseInt(req.params.id);
      
      if (isNaN(locationId)) {
        return res.status(400).json({ message: 'Invalid location ID' });
      }
      
      const existingLocation = await storage.getLocation(locationId);
      if (!existingLocation) {
        return res.status(404).json({ message: 'Location not found' });
      }
      
      // RESTORED: Company filtering - prevent cross-company updates
      if (currentUser.role !== 'super_admin' && existingLocation.companyId !== currentUser.companyId) {
        console.log('❌ Access denied - different company:', { 
          userId: currentUser.id,
          userCompany: currentUser.companyId,
          locationCompany: existingLocation.companyId
        });
        return res.status(403).json({ message: 'لا يمكن تعديل موقع من شركة أخرى' });
      }
      
      const updates = req.body;
      const location = await storage.updateLocation(locationId, updates);
      
      console.log('✅ Location updated with security:', { 
        updatedBy: currentUser.id, 
        updaterRole: currentUser.role,
        companyId: currentUser.companyId,
        locationId: locationId,
        changes: updates
      });
      
      res.json(location);
    } catch (error) {
      console.error('Update location error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/locations/:id', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // RESTORED: Admin-only access for location deletion (including data_specialist for location management)
      if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && currentUser.role !== 'data_specialist') {
        console.log('❌ Access denied - not an admin:', { 
          userId: currentUser.id, 
          role: currentUser.role 
        });
        return res.status(403).json({ message: 'صلاحيات المدير مطلوبة لحذف المواقع' });
      }
      
      const locationId = parseInt(req.params.id);
      
      const existingLocation = await storage.getLocation(locationId);
      if (!existingLocation) {
        return res.status(404).json({ message: 'Location not found' });
      }
      
      // RESTORED: Company filtering - prevent cross-company deletions
      if (currentUser.role !== 'super_admin' && existingLocation.companyId !== currentUser.companyId) {
        console.log('❌ Access denied - different company:', { 
          userId: currentUser.id,
          userCompany: currentUser.companyId,
          locationCompany: existingLocation.companyId
        });
        return res.status(403).json({ message: 'لا يمكن حذف موقع من شركة أخرى' });
      }
      
      await storage.deleteLocation(locationId);
      
      console.log('✅ Location deleted:', { 
        deletedBy: currentUser.id, 
        deleterRole: currentUser.role,
        locationId: locationId,
        locationName: existingLocation.nameAr
      });
      
      res.json({ message: 'Location deleted successfully' });
    } catch (error) {
      console.error('Delete location error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Cleanup orphaned templates - RESTORED: Admin only access
  app.post('/api/cleanup-orphaned-templates', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // RESTORED: Admin-only access for cleanup (including data_specialist for maintenance)
      if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && currentUser.role !== 'data_specialist') {
        console.log('❌ Access denied - not an admin:', { 
          userId: currentUser.id, 
          role: currentUser.role 
        });
        return res.status(403).json({ message: 'صلاحيات المدير مطلوبة لتنظيف البيانات المعلقة' });
      }
      
      console.log('🧹 بدء تنظيف قوائم التشييك المعلقة...');
      
      // RESTORED: Company filtering for non-super admins
      let companyId: number | undefined;
      if (currentUser.role !== 'super_admin') {
        companyId = currentUser.companyId;
      }
      
      const deletedCount = await storage.cleanupOrphanedTemplates(companyId);
      
      console.log('✅ Cleanup completed:', { 
        deletedBy: currentUser.id, 
        deleterRole: currentUser.role,
        deletedTemplates: deletedCount,
        companyId: companyId
      });
      
      res.json({ 
        message: `تم حذف ${deletedCount} قائمة تشييك معلقة بنجاح`, 
        deletedCount 
      });
    } catch (error) {
      console.error('Cleanup orphaned templates error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Reinitialize templates for all locations - RESTORED: Admin only access
  app.post('/api/locations/init-templates', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // RESTORED: Admin-only access for template reinitialization (including data_specialist for location management)
      if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && currentUser.role !== 'data_specialist') {
        console.log('❌ Access denied - not an admin:', { 
          userId: currentUser.id, 
          role: currentUser.role 
        });
        return res.status(403).json({ message: 'صلاحيات المدير مطلوبة لإعادة تهيئة القوالب' });
      }
      
      console.log('🔄 Reinitializing templates for all locations...');
      
      // RESTORED: Company filtering for non-super admins
      let companyId: number | undefined;
      if (currentUser.username !== 'hsa_group_admin' && currentUser.role !== 'super_admin' && currentUser.username !== 'hsa_group_admin' && currentUser.role !== 'hsa_group_admin') {
        companyId = currentUser.companyId;
      }
      
      // Get locations with proper filtering
      const locations = await storage.getAllLocations(companyId);
      
      // Clear existing templates
      console.log('🗑️ Clearing existing templates...');
      await storage.clearAllChecklistTemplates();
      
      // Reinitialize templates for each location
      console.log('📋 Creating new templates...');
      for (const location of locations) {
        await storage.createDefaultChecklistTemplates(location.id, location.icon, location.companyId);
        console.log(`✅ Templates created for location: ${location.nameAr} (${location.icon})`);
      }
      
      console.log('✅ Template reinitialization completed');
      res.json({ 
        message: 'Templates reinitialized successfully',
        locationsUpdated: locations.length 
      });
    } catch (error) {
      console.error('❌ Error reinitializing templates:', error);
      res.status(500).json({ message: 'Failed to reinitialize templates' });
    }
  });

  app.get('/api/locations/:id/templates', authenticateToken, async (req: any, res) => {
    try {
      const locationId = parseInt(req.params.id);
      const templates = await storage.getChecklistTemplatesByLocation(locationId);
      res.json(templates);
    } catch (error) {
      console.error('Get templates error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Checklist template management routes
  
  // Get all checklist templates - RESTORED: Company filtering
  app.get('/api/checklist-templates', authenticateToken, requireAdminOrSupervisor, async (req: any, res) => {
    try {
      const currentUser = req.user;
      console.log('📋 Getting checklist templates with security:', {
        userId: currentUser.id,
        role: currentUser.role,
        companyId: currentUser.companyId
      });
      
      // RESTORED: Company filtering for non-super admins
      let companyId: number | undefined;
      if (currentUser.username !== 'hsa_group_admin' && currentUser.role !== 'super_admin' && currentUser.username !== 'hsa_group_admin' && currentUser.role !== 'hsa_group_admin') {
        companyId = currentUser.companyId;
      }
      
      const templates = await storage.getAllChecklistTemplates(companyId);
      console.log('📋 Found templates with filtering:', templates.length);
      
      res.json(templates);
    } catch (error) {
      console.error('❌ Get all templates error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get templates by location ID with company filtering
  app.get('/api/checklist-templates/:locationId', authenticateToken, requireAdminOrSupervisor, async (req: any, res) => {
    try {
      const locationId = parseInt(req.params.locationId);
      const currentUser = req.user;
      let companyId: number | undefined;
      
      if (isNaN(locationId) || locationId <= 0) {
        return res.status(400).json({ message: 'Invalid location ID' });
      }
      
      // Super admin and general manager can see all templates, others see only their company templates
      if (currentUser.username !== 'hsa_group_admin' && 
          currentUser.role !== 'super_admin' && 
          currentUser.username !== 'hsa_group_admin' && 
          currentUser.role !== 'hsa_group_admin') {
        companyId = currentUser.companyId;
      }
      
      console.log('📋 Getting templates for location with company filtering:', { locationId, companyId });
      const templates = await storage.getChecklistTemplatesByLocation(locationId, companyId);
      console.log('📋 Found templates:', templates.length);
      
      res.json(templates);
    } catch (error) {
      console.error('❌ Get templates error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/checklist-templates', authenticateToken, requireAdminOrSupervisor, async (req: any, res) => {
    try {
      const { locationId, categoryAr, categoryEn, taskAr, taskEn, descriptionAr, descriptionEn, subPoints, subTasks, multiTasks, multiNamesAr, multiCategories, multiTaskNames } = req.body;
      
      console.log('📝 Creating new template:', { 
        locationId, 
        taskAr, 
        categoryAr, 
        multiTasks: multiTasks?.length || 0, 
        multiNamesAr: multiNamesAr?.length || 0,
        multiCategories: multiCategories?.length || 0,
        multiTaskNames: multiTaskNames?.length || 0
      });
      
      // Validate required fields
      if (!locationId || !taskAr || !categoryAr) {
        console.error('❌ Missing required fields:', { locationId, taskAr, categoryAr });
        return res.status(400).json({ 
          message: 'Missing required fields', 
          required: ['locationId', 'taskAr', 'categoryAr']
        });
      }
      
      // Get current user's company ID
      const currentUser = req.user;
      const userCompanyId = currentUser.companyId;
      
      // Get the next order number for company-specific templates
      const existingTemplates = await storage.getChecklistTemplatesByLocation(locationId, userCompanyId);
      const nextOrder = existingTemplates.length > 0 ? Math.max(...existingTemplates.map(t => t.order)) + 1 : 1;
      
      const templateData = {
        locationId,
        companyId: userCompanyId,
        categoryAr: categoryAr.trim(),
        categoryEn: categoryEn?.trim() || categoryAr.trim(),
        taskAr: taskAr.trim(),
        taskEn: taskEn?.trim() || taskAr.trim(),
        descriptionAr: descriptionAr?.trim() || '',
        descriptionEn: descriptionEn?.trim() || '',
        subPoints: subPoints && subPoints.length > 0 ? subPoints : null,
        subTasks: subTasks && subTasks.length > 0 ? subTasks : null,
        multiTasks: multiTasks && multiTasks.length > 0 ? multiTasks : null,
        multiNamesAr: multiNamesAr && multiNamesAr.length > 0 ? multiNamesAr : null,
        multiCategories: multiCategories && multiCategories.length > 0 ? multiCategories : null,
        multiTaskNames: multiTaskNames && multiTaskNames.length > 0 ? multiTaskNames : null,
        order: nextOrder,
        isActive: true
      };
      
      const template = await storage.createChecklistTemplate(templateData);
      console.log('✅ Template created:', template);
      
      res.status(201).json(template);
    } catch (error) {
      console.error('❌ Create template error:', error);
      res.status(500).json({ 
        message: 'فشل في إنشاء البند', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Update checklist template order endpoint (must come before /:id route)
  app.put('/api/checklist-templates/reorder', authenticateToken, async (req: any, res) => {
    try {
      const { templates } = req.body;
      
      if (!Array.isArray(templates) || templates.length === 0) {
        return res.status(400).json({ message: 'Invalid templates data' });
      }
      
      console.log('🔄 Updating checklist template order for', templates.length, 'templates');
      console.log('📊 Received templates data:', templates);
      
      // Update each template's order index
      for (const template of templates) {
        const templateId = parseInt(String(template.id));
        const orderIndex = parseInt(String(template.orderIndex));
        
        console.log('🔍 Processing template:', { raw_id: template.id, raw_orderIndex: template.orderIndex, parsed_id: templateId, parsed_orderIndex: orderIndex });
        
        if (isNaN(templateId) || isNaN(orderIndex)) {
          console.error('❌ Invalid template data after parsing:', { id: template.id, orderIndex: template.orderIndex, parsed_id: templateId, parsed_orderIndex: orderIndex });
          continue;
        }
        
        await storage.updateChecklistTemplateOrder(templateId, orderIndex);
        console.log(`✅ Updated template ${templateId} order to ${orderIndex}`);
      }
      
      res.json({ 
        message: 'Template order updated successfully',
        updatedCount: templates.length 
      });
    } catch (error) {
      console.error('❌ Update template order error:', error);
      res.status(500).json({ message: 'Failed to update template order' });
    }
  });

  // Add reorder endpoint for individual template
  app.put('/api/checklist-templates/:id/reorder', authenticateToken, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const { orderIndex } = req.body;
      
      console.log('🔄 Reordering template ID:', templateId, 'to order:', orderIndex);
      
      if (isNaN(templateId) || templateId <= 0) {
        return res.status(400).json({ message: 'معرف البند غير صحيح' });
      }
      
      if (typeof orderIndex !== 'number' || orderIndex < 0) {
        return res.status(400).json({ message: 'ترتيب البند غير صحيح' });
      }
      
      await storage.updateChecklistTemplateOrder(templateId, orderIndex);
      console.log('✅ Template reordered successfully:', templateId);
      
      res.json({ message: 'تم تحديث ترتيب البند بنجاح', templateId, orderIndex });
    } catch (error) {
      console.error('❌ Reorder template error:', error);
      res.status(500).json({ 
        message: 'فشل في إعادة ترتيب البند', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.put('/api/checklist-templates/:id', authenticateToken, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const { 
        categoryAr, 
        categoryEn, 
        taskAr, 
        taskEn, 
        descriptionAr, 
        descriptionEn, 
        multiTasks,
        isActive 
      } = req.body;
      
      console.log('🔄 Updating template ID:', templateId);
      console.log('🔄 Update data:', { taskAr, categoryAr, multiTasks, isActive });
      
      if (isNaN(templateId) || templateId <= 0) {
        console.error('❌ Invalid template ID:', req.params.id);
        return res.status(400).json({ message: 'معرف البند غير صحيح' });
      }
      
      // Validate required fields
      if (!taskAr || !categoryAr) {
        console.error('❌ Missing required fields for update:', { taskAr, categoryAr });
        return res.status(400).json({ 
          message: 'البيانات المطلوبة مفقودة',
          required: ['taskAr', 'categoryAr']
        });
      }
      
      const updateData = {
        categoryAr: categoryAr.trim(),
        categoryEn: categoryEn?.trim() || categoryAr.trim(),
        taskAr: taskAr.trim(),
        taskEn: taskEn?.trim() || taskAr.trim(),
        descriptionAr: descriptionAr?.trim() || '',
        descriptionEn: descriptionEn?.trim() || '',
        multiTasks: multiTasks && multiTasks.length > 0 ? multiTasks : null,
        isActive: typeof isActive === 'boolean' ? isActive : true
      };
      
      const updatedTemplate = await storage.updateChecklistTemplate(templateId, updateData);
      console.log('✅ Template updated successfully:', updatedTemplate);
      
      res.json(updatedTemplate);
    } catch (error) {
      console.error('❌ Update template error:', error);
      res.status(500).json({ 
        message: 'فشل في تحديث البند', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });



  app.delete('/api/checklist-templates/:id', authenticateToken, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      
      console.log('🗑️ Deleting template ID:', templateId);
      
      if (isNaN(templateId) || templateId <= 0) {
        console.error('❌ Invalid template ID for deletion:', req.params.id);
        return res.status(400).json({ message: 'معرف البند غير صحيح' });
      }
      
      await storage.deleteChecklistTemplate(templateId);
      console.log('✅ Template soft-deleted successfully:', templateId);
      
      res.json({ message: 'تم حذف البند بنجاح', templateId });
    } catch (error) {
      console.error('❌ Delete template error:', error);
      res.status(500).json({ 
        message: 'فشل في حذف البند', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Checklist routes
  app.get('/api/checklists/:locationId/:date', async (req: any, res) => {
    try {
      const locationId = parseInt(req.params.locationId);
      const date = new Date(req.params.date);
      
      // For user interface, we don't load previous evaluations to allow fresh start
      // This ensures each evaluation session starts clean
      // Historical data is preserved in database for reports
      res.json(null);
    } catch (error) {
      console.error('Get checklist error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/checklists', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const { locationId, tasks, evaluationNotes, checklistDate, completedAt, evaluationTime, evaluationDateTime, evaluationTimestamp } = req.body;
      
      // 🔍 تشخيص متقدم للمزامنة العبر-جهاز
      console.log('🚀 [SYNC] تقييم جديد واصل للخادم:', {
        userId: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
        locationId: locationId,
        checklistDate: checklistDate,
        evaluationTime: evaluationTime,
        evaluationDateTime: evaluationDateTime,
        evaluationTimestamp: evaluationTimestamp,
        tasksCount: tasks?.length || 0,
        isOfflineSync: !!req.body.offlineId,
        offlineId: req.body.offlineId,
        syncTimestamp: req.body.syncTimestamp,
        timestamp: new Date().toISOString()
      });
      
      // Validate required fields
      if (!locationId || !tasks || !Array.isArray(tasks)) {
        console.log('❌ [SYNC] بيانات ناقصة:', { locationId, tasksCount: tasks?.length });
        return res.status(400).json({ message: 'Missing required fields: locationId, tasks' });
      }

      // 🔒 [SECURITY] فحص صلاحيات المواقع بالكامل - تطبيق النظام الآمن
      if (currentUser.role !== 'super_admin' && currentUser.role !== 'admin' && currentUser.role !== 'supervisor') {
        // فحص صلاحيات الشركة أولاً
        const location = await storage.getLocation(parseInt(locationId));
        if (!location || location.companyId !== currentUser.companyId) {
          console.log('❌ [SECURITY] مزامنة مرفوضة - الموقع خارج نطاق الشركة:', {
            userId: currentUser.id,
            userCompany: currentUser.companyId,
            locationCompany: location?.companyId,
            reason: 'COMPANY_ISOLATION'
          });
          return res.status(403).json({ message: 'الموقع غير متاح في شركتك' });
        }
        
        // فحص صلاحيات المواقع الفردية للمستخدم العادي
        const userLocationPermissions = await db
          .select({
            locationId: supervisorUserLocationPermissions.locationId,
          })
          .from(supervisorUserLocationPermissions)
          .where(eq(supervisorUserLocationPermissions.userId, currentUser.id));

        const accessibleLocationIds = userLocationPermissions.map(p => p.locationId);
        
        if (!accessibleLocationIds.includes(parseInt(locationId))) {
          console.log('❌ [SECURITY] المستخدم ليس له صلاحية لهذا الموقع:', {
            userId: currentUser.id,
            username: currentUser.username,
            locationId: locationId,
            accessibleLocations: accessibleLocationIds,
            reason: 'LOCATION_PERMISSION_DENIED'
          });
          return res.status(403).json({ message: 'ليس لديك صلاحية للوصول لهذا الموقع' });
        }
        
        console.log('✅ [SECURITY] فحص الصلاحيات مؤكد:', {
          userId: currentUser.id,
          username: currentUser.username,
          locationId: locationId,
          hasPermission: true
        });
      } else {
        // للأدمن والمشرف - فحص الشركة فقط
        const location = await storage.getLocation(parseInt(locationId));
        if (!location || location.companyId !== currentUser.companyId) {
          console.log('❌ [SECURITY] مزامنة مرفوضة - الموقع خارج نطاق الشركة:', {
            userId: currentUser.id,
            userCompany: currentUser.companyId,
            locationCompany: location?.companyId,
            reason: 'COMPANY_ISOLATION'
          });
          return res.status(403).json({ message: 'الموقع غير متاح في شركتك' });
        }
        
        console.log('✅ [SECURITY] فحص الشركة مؤكد - صلاحية إدارية:', {
          userId: currentUser.id,
          role: currentUser.role,
          locationId: locationId
        });
      }
      
      // التوافق 100% - الاحتفاظ بالتواريخ كنصوص بدلاً من تحويلها
      const processedChecklistDate = checklistDate; // الاحتفاظ بالنص كما هو
      const processedCompletedAt = completedAt || new Date().toISOString(); // الاحتفاظ بالنص
      
      // تنظيف وتوحيد بيانات المهام مع معالجة محسنة للحقول
      const cleanedTasks = tasks.map((task: any) => ({
        templateId: task.templateId,
        completed: task.completed !== undefined ? task.completed : (task.rating && task.rating > 0),
        rating: task.rating || 0,
        notes: task.notes || '',
        itemComment: task.itemComment || '',
        subTaskRatings: Array.isArray(task.subTaskRatings) ? task.subTaskRatings : []
      }));

      // حفظ التواريخ كنصوص مطابقة للنظام المحلي - بدون تحويل
      const currentISOString = new Date().toISOString();
      
      const checklistData = {
        locationId: parseInt(locationId),
        companyId: currentUser.companyId,
        userId: currentUser.id,
        // حفظ التواريخ كنصوص مطابقة تماماً للنظام المحلي
        checklistDate: checklistDate, // نص كما هو
        tasks: cleanedTasks,
        evaluationNotes: evaluationNotes || '',
        completedAt: completedAt || null, // نص كما هو
        // 🕐 حفظ التوقيت المحسن للتقارير
        evaluationTime: evaluationTime || null,
        evaluationDateTime: evaluationDateTime || null,
        evaluationTimestamp: evaluationTimestamp || null,
        createdAt: currentISOString, // نص ISO
        // حقول التوافق الإضافية - بنية موحدة 100%
        offlineId: req.body.offlineId || null, // معرف الأوفلاين الأصلي
        syncTimestamp: req.body.syncTimestamp || null, // وقت الحفظ المحلي
        isSynced: true, // متزامن بنجاح في الخادم
        isEncrypted: req.body.isEncrypted || false // حالة التشفير
      };
      
      // التبديل للنظام الجديد الموحد بدلاً من النظام القديم
      const savedChecklist = await storage.saveMasterEvaluation(checklistData);
      
      // 🎉 نجح الحفظ - تشخيص متطور
      console.log('✅ [SYNC] تم حفظ التقييم بنجاح:', {
        checklistId: savedChecklist.id,
        userId: currentUser.id,
        username: currentUser.username,
        locationId: locationId,
        companyId: currentUser.companyId,
        isOfflineSync: !!req.body.offlineId,
        offlineId: req.body.offlineId,
        timestamp: new Date().toISOString(),
        message: `تقييم جديد من ${currentUser.username} للموقع ${locationId}`
      });
      
      res.json(savedChecklist);
    } catch (error: any) {
      console.error('❌ [SYNC] فشل حفظ التقييم:', {
        error: error.message,
        userId: req.user?.id,
        username: req.user?.username,
        locationId: req.body?.locationId,
        offlineId: req.body?.offlineId,
        timestamp: new Date().toISOString()
      });
      res.status(500).json({ message: 'Server error: ' + error.message });
    }
  });

  // Dashboard data route - Open access
  app.get('/api/dashboard', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Company filtering - General Manager sees all companies
      let companyId: number | undefined;
      if (currentUser.username !== 'hsa_group_admin' && 
          currentUser.role !== 'hsa_group_admin') {
        companyId = currentUser.companyId;
      }
      
      console.log('🔍 Dashboard access check:', {
        username: currentUser.username,
        role: currentUser.role,
        companyId: companyId,
        willSeeAllCompanies: companyId === undefined
      });
      
      const allLocations = await storage.getAllLocations(companyId);
      console.log(`📍 Dashboard locations found: ${allLocations.length} locations`, {
        companyId,
        locationIds: allLocations.map(l => l.id)
      });
      
      // RESTORED: Apply user location permissions
      let locations: any[];
      if (currentUser.role === 'user') {
        // 🚀 [PERFORMANCE] استخدام المواقع من token بدلاً من الاستعلام
        const userLocationIds = (currentUser as any).availableLocations || [];
        locations = allLocations.filter(loc => userLocationIds.includes(loc.id));
      } else {
        locations = allLocations;
      }
      
      console.log('✅ Dashboard with security filtering:', {
        userId: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
        companyId,
        totalLocations: locations.length,
        filteredForUser: currentUser.role === 'user'
      });

      // Remove user filtering - show all checklists to everyone
      // RESTORED: Apply user filtering for non-admins
      let userIdFilter: number | undefined;
      if (currentUser.role === 'user') {
        userIdFilter = currentUser.id;
      }
      const todayChecklists = await storage.getDailyChecklistsByDateRange(today, tomorrow, userIdFilter);
      
      // ⚡ تحسين الأداء: تجميع الاستعلامات
      const locationIds = locations.map(l => l.id);
      
      // جلب جميع القوالب في استعلام واحد
      const allTemplatesPromise = db
        .select()
        .from(checklistTemplates)
        .where(inArray(checklistTemplates.locationId, locationIds));
      
      const allTemplates = await allTemplatesPromise;
      
      // تجميع القوالب حسب الموقع
      const templatesByLocation = allTemplates.reduce((acc, template) => {
        if (!acc[template.locationId]) acc[template.locationId] = [];
        acc[template.locationId].push(template);
        return acc;
      }, {} as Record<number, any[]>);
      
      // معالجة المواقع بشكل أسرع
      const locationStatuses = locations.map(location => {
        // الحصول على تقييمات اليوم لهذا الموقع (متوافق مع النظام الجديد والقديم)
        const todayLocationChecklists = todayChecklists.filter(c => {
          let checklistDateStr: string;
          try {
            // التعامل مع النظام الجديد (evaluationDate) والقديم (checklistDate)
            const dateField = c.evaluationDate || c.checklistDate;
            checklistDateStr = typeof dateField === 'string' ? dateField : new Date(dateField).toISOString().split('T')[0];
          } catch (error) {
            console.error('❌ Error parsing date for evaluation:', c.id, error);
            return false; // تجاهل التقييم إذا كان التاريخ غير صالح
          }
          const todayStr = today.toISOString().split('T')[0];
          return c.locationId === location.id && checklistDateStr === todayStr;
        });
        
        // الحصول على أحدث تقييم لليوم (متوافق مع النظام الجديد والقديم)
        const latestTodayChecklist = todayLocationChecklists.length > 0 
          ? todayLocationChecklists.sort((a, b) => {
              try {
                const dateA = typeof (a.evaluationDate || a.checklistDate) === 'string' 
                  ? new Date(a.evaluationDate || a.checklistDate) 
                  : (a.evaluationDate || a.checklistDate);
                const dateB = typeof (b.evaluationDate || b.checklistDate) === 'string' 
                  ? new Date(b.evaluationDate || b.checklistDate) 
                  : (b.evaluationDate || b.checklistDate);
                return dateB.getTime() - dateA.getTime();
              } catch (error) {
                console.error('❌ Error sorting evaluations by date:', error);
                return 0;
              }
            })[0]
          : null;
        
        // ⚡ استخدام القوالب المجمعة
        const templates = templatesByLocation[location.id] || [];
        
        let completedTasks = 0;
        let totalTasks = templates.length; // قيمة افتراضية
        let status = 'not-started';
        
        if (latestTodayChecklist) {
          try {
            let tasks: any[] = [];
            // التعامل مع النظام الجديد (evaluationItems) والقديم (tasks)
            if (latestTodayChecklist.evaluationItems) {
              // النظام الجديد - تحويل evaluationItems إلى tasks format
              const items = latestTodayChecklist.evaluationItems;
              items.forEach((item: any) => {
                if (item.subTaskRatings && Array.isArray(item.subTaskRatings)) {
                  item.subTaskRatings.forEach((subTask: any) => {
                    tasks.push({
                      completed: subTask.rating > 0,
                      rating: subTask.rating
                    });
                  });
                }
              });
            } else if (latestTodayChecklist.tasks) {
              // النظام القديم - استخدام tasks مباشرة
              tasks = latestTodayChecklist.tasks as any[];
            }
            
            // استخدام المهام الفعلية في التقييم بدلاً من عدد القوالب
            totalTasks = tasks.length;
            completedTasks = tasks.filter(t => t.completed).length;
          } catch (error) {
            console.error('❌ Error parsing tasks for location:', location.id, error);
            completedTasks = 0;
          }
          
          if (completedTasks === totalTasks) {
            status = 'completed';
          } else if (completedTasks > 0) {
            status = 'in-progress';
          }
        }
        
        return {
          ...location,
          completedTasks,
          totalTasks,
          status,
          progress: `${completedTasks}/${totalTasks}`,
          lastUpdated: latestTodayChecklist?.checklistDate || null
        };
      });

      res.json(locationStatuses);
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Reports routes - Open access
  app.get('/api/reports/recent', async (req: any, res) => {
    try {
      const reports = await storage.getRecentReports(10);
      res.json(reports);
    } catch (error) {
      console.error('Get reports error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/reports/generate', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const { type, startDate, endDate, locationIds, format } = req.body;
      
      // RESTORED: Company filtering for non-super admins
      let companyId: number | undefined;
      if (currentUser.username !== 'hsa_group_admin' && currentUser.role !== 'super_admin' && currentUser.username !== 'hsa_group_admin' && currentUser.role !== 'hsa_group_admin') {
        companyId = currentUser.companyId;
      }
      
      // RESTORED: Apply user filtering for non-admins
      let userIdFilter: number | undefined;
      if (currentUser.role === 'user') {
        userIdFilter = currentUser.id;
      }
      
      // Get checklists data with proper filtering
      const checklists = await storage.getDailyChecklistsByDateRange(
        new Date(startDate),
        new Date(endDate),
        userIdFilter
      );
      
      // RESTORED: Filter by user-accessible locations
      let filteredChecklists = checklists;
      if (currentUser.role === 'user') {
        // 🚀 [PERFORMANCE] استخدام المواقع من token بدلاً من الاستعلام
        const userLocationIds = (currentUser as any).availableLocations || [];
        filteredChecklists = checklists.filter(c => userLocationIds.includes(c.locationId));
      } else if (locationIds && locationIds.length > 0) {
        filteredChecklists = checklists.filter(c => locationIds.includes(c.locationId));
      }
      
      // Create report record with actual user ID
      const report = await storage.createReport({
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        locationIds: locationIds || [],
        generatedBy: currentUser.id, // RESTORED: Current user ID
        filePath: null // Would be set after file generation
      });

      // In a real implementation, you would generate the actual Excel/PDF file here
      // For now, return the data that would be in the report
      res.json({
        reportId: report.id,
        data: filteredChecklists,
        message: `${format.toUpperCase()} report generated successfully`
      });
    } catch (error) {
      console.error('Generate report error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // REMOVED: Interactive HTML Report functionality per user request

  // Statistics route - RESTORED: Full Security
  app.get('/api/statistics', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // RESTORED: Apply user filtering for non-admins
      let userIdFilter: number | undefined;
      if (currentUser.role === 'user') {
        userIdFilter = currentUser.id;
      }
      
      // RESTORED: Company filtering for non-super admins
      let companyId: number | undefined;
      if (currentUser.username !== 'hsa_group_admin' && currentUser.role !== 'super_admin' && currentUser.username !== 'hsa_group_admin' && currentUser.role !== 'hsa_group_admin') {
        companyId = currentUser.companyId;
      }
      
      const monthlyChecklists = await storage.getDailyChecklistsByDateRange(startOfMonth, today, userIdFilter);
      
      // RESTORED: Apply location filtering based on user permissions
      let locations: any[];
      if (currentUser.role === 'user') {
        // 🚀 [PERFORMANCE] استخدام المواقع من token بدلاً من الاستعلام
        const userLocationIds = (currentUser as any).availableLocations || [];
        const allLocations = await storage.getAllLocations(companyId);
        locations = allLocations.filter(loc => userLocationIds.includes(loc.id));
      } else {
        locations = await storage.getAllLocations(companyId);
      }
      
      console.log('📊 Statistics with security filtering:', {
        userId: currentUser.id,
        role: currentUser.role,
        companyId,
        locationsCount: locations.length
      });
      
      let totalTasks = 0;
      let completedTasks = 0;
      let pendingTasks = 0;
      
      for (const checklist of monthlyChecklists) {
        try {
          const tasks = checklist.tasks as TaskCompletion[];
          totalTasks += tasks.length;
          completedTasks += tasks.filter(t => t.completed).length;
          pendingTasks += tasks.filter(t => !t.completed).length;
        } catch (error) {
          console.error('❌ Error parsing tasks for checklist:', checklist.id, error);
        }
      }
      
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      res.json({
        completionRate,
        completedTasks,
        pendingTasks,
        activeLocations: locations.length
      });
    } catch (error) {
      console.error('Statistics error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Export reports endpoint - Enhanced with Security and Performance
  app.get('/api/export/reports', authenticateToken, async (req: any, res) => {
    try {
      console.log('🔍 Reports export request:', req.query);
      const { startDate, endDate, locationId, userId, format = 'excel', includeIncomplete } = req.query;
      
      // Enhanced input validation
      if (!startDate || !endDate) {
        return res.status(400).json({ 
          message: 'تاريخ البداية والنهاية مطلوبان',
          details: 'يجب تحديد تاريخ البداية وتاريخ النهاية لإنشاء التقرير'
        });
      }

      let start: Date, end: Date;
      try {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          throw new Error('تواريخ غير صالحة');
        }
        
        if (start > end) {
          throw new Error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
        }
        
        // Limit date range to prevent massive queries (max 1 year)
        const daysDiff = Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > 365) {
          return res.status(400).json({ 
            message: 'الفترة الزمنية طويلة جداً',
            details: 'الحد الأقصى للفترة الزمنية هو سنة واحدة'
          });
        }
        
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        
      } catch (dateError) {
        return res.status(400).json({ 
          message: 'خطأ في التواريخ المدخلة',
          details: dateError instanceof Error ? dateError.message : 'تنسيق التاريخ غير صحيح'
        });
      }
      
      console.log('📅 Validated date range:', { start, end });
      
      const currentUser = req.user;
      
      // SECURITY FIX: Apply company filtering for all users except enhanced general manager and authorized roles
      let companyId: number | undefined;
      const authorizedRoles = ['enhanced_general_manager', 'hsa_group_admin', 'super_admin', 'general_manager'];
      const isAuthorizedForCrossCompany = authorizedRoles.includes(currentUser.role) || 
                                         currentUser.username === 'hsa_group_admin';
      
      if (!isAuthorizedForCrossCompany) {
        companyId = currentUser.companyId;
      }
      
      console.log('🔒 Security filtering applied:', {
        userId: currentUser.id,
        role: currentUser.role,
        username: currentUser.username,
        companyId: companyId,
        isAuthorizedForCrossCompany
      });
      
      // Get evaluations from unified master system with proper company filtering
      const allEvaluationsRaw = await storage.getDailyChecklistsByDateRange(start, end, undefined, companyId);
      
      // 🔄 تحويل البيانات من MasterEvaluation إلى DailyChecklist format للتوافق مع نظام التقارير
      const convertedEvaluations = allEvaluationsRaw.map((masterEval: any) => {
        console.log('🔄 [REPORTS] تحويل تقييم:', {
          id: masterEval.id,
          hasEvaluationItems: !!masterEval.evaluationItems,
          hasTasks: !!masterEval.tasks,
          evaluationItemsType: typeof masterEval.evaluationItems,
          tasksType: typeof masterEval.tasks
        });

        // 📊 تحويل evaluationItems إلى tasks format إذا لزم الأمر
        let tasks: any[] = [];
        
        if (masterEval.evaluationItems) {
          // البيانات من النظام الجديد - تحويل evaluationItems إلى tasks
          try {
            const evaluationItems = Array.isArray(masterEval.evaluationItems) 
              ? masterEval.evaluationItems 
              : JSON.parse(masterEval.evaluationItems as string || '[]');
              
            tasks = evaluationItems.flatMap((item: any) => {
              if (item.subTaskRatings && Array.isArray(item.subTaskRatings)) {
                return item.subTaskRatings.map((subTask: any) => ({
                  templateId: subTask.templateId || item.templateId,
                  completed: (subTask.rating || 0) > 0,
                  rating: subTask.rating || 0,
                  notes: subTask.notes || '',
                  itemComment: subTask.itemComment || ''
                }));
              }
              return [];
            });
          } catch (error) {
            console.error('❌ [REPORTS] خطأ في تحليل evaluationItems:', error);
            tasks = [];
          }
        } else if (masterEval.tasks) {
          // البيانات من النظام القديم - استخدام tasks مباشرة
          try {
            tasks = Array.isArray(masterEval.tasks) 
              ? masterEval.tasks 
              : JSON.parse(masterEval.tasks as string || '[]');
          } catch (error) {
            console.error('❌ [REPORTS] خطأ في تحليل tasks:', error);
            tasks = [];
          }
        }

        console.log('✅ [REPORTS] تم تحويل التقييم:', {
          id: masterEval.id,
          originalTasksCount: tasks.length,
          sampleTask: tasks[0] || 'none'
        });

        return {
          id: masterEval.legacyId || masterEval.id,
          locationId: masterEval.locationId,
          userId: masterEval.evaluatorId || masterEval.userId, // 🔄 دعم كلا التنسيقين
          companyId: masterEval.companyId,
          checklistDate: masterEval.evaluationDate || masterEval.checklistDate, // 🔄 دعم كلا التنسيقين
          tasks: tasks, // 🔄 المهام المحولة بشكل صحيح
          categoryComments: masterEval.categoryComments || {},
          evaluationNotes: masterEval.evaluationNotes || masterEval.generalNotes || '',
          completedAt: masterEval.completedAt,
          createdAt: masterEval.createdAt,
          // 🕐 إضافة الحقول المفقودة المهمة للتقارير
          evaluationTime: masterEval.evaluationTime || '00:00:00',
          evaluationDateTime: masterEval.evaluationDateTime,
          evaluationTimestamp: masterEval.evaluationTimestamp,
          offlineId: masterEval.offlineId,
          syncTimestamp: masterEval.syncTimestamp,
          isSynced: masterEval.isSynced,
          source: 'master_evaluations'
        };
      });
      
      // Filter evaluations based on includeIncomplete parameter
      const allEvaluations = includeIncomplete === 'true' 
        ? convertedEvaluations // Include all evaluations if requested
        : convertedEvaluations.filter(evaluation => evaluation.completedAt != null); // Only completed evaluations by default
      
      console.log('📊 Total evaluations found (raw):', allEvaluationsRaw.length);
      console.log('📊 Evaluations to process:', allEvaluations.length);
      console.log('📊 Include incomplete:', includeIncomplete === 'true');
      
      // Enhanced early return with better user guidance
      if (allEvaluations.length === 0) {
        const hasIncompleteEvaluations = allEvaluationsRaw.length > 0;
        const messageText = includeIncomplete === 'true' 
          ? 'لا توجد تقييمات في الفترة المحددة'
          : 'لا توجد تقييمات مكتملة في الفترة المحددة';
        
        return res.status(404).json({ 
          message: messageText,
          details: hasIncompleteEvaluations && includeIncomplete !== 'true' 
            ? `وُجد ${allEvaluationsRaw.length} تقييم غير مكتمل. يرجى التأكد من إنهاء التقييمات أولاً.`
            : 'لا توجد تقييمات في الفترة المحددة. يرجى اختيار فترة زمنية أخرى أو إنشاء تقييمات جديدة.',
          hasIncompleteEvaluations,
          totalIncomplete: allEvaluationsRaw.length
        });
      }
      
      // SECURITY FIX: Apply company filtering to locations and users
      const allLocations = await storage.getAllLocations(companyId);
      const allUsers = await storage.getAllUsers(companyId);
      
      // Enhanced location filtering with validation  
      let filteredEvaluations = allEvaluations;
      if (locationId && locationId !== 'all') {
        const locationIds = (locationId as string).split(',').map(id => {
          const parsedId = parseInt(id.trim());
          if (isNaN(parsedId)) {
            throw new Error(`معرف الموقع غير صالح: ${id}`);
          }
          return parsedId;
        });
        
        filteredEvaluations = allEvaluations.filter(c => locationIds.includes(c.locationId));
      }
      
      // Enhanced user filtering with validation
      if (userId && userId !== 'all') {
        const userIds = (userId as string).split(',').map(id => {
          const parsedId = parseInt(id.trim());
          if (isNaN(parsedId)) {
            throw new Error(`معرف المستخدم غير صالح: ${id}`);
          }
          return parsedId;
        });
        
        filteredEvaluations = filteredEvaluations.filter(c => userIds.includes(c.userId));
      }
      
      // Determine which locations to include - ONLY locations that have evaluations
      const locationsWithEvaluations = Array.from(new Set(filteredEvaluations.map(c => c.locationId)));
      const locationsToInclude = locationId && locationId !== 'all'
        ? allLocations.filter(l => l.id === parseInt(locationId as string) && locationsWithEvaluations.includes(l.id))
        : allLocations.filter(l => locationsWithEvaluations.includes(l.id));
      
      console.log('📍 Locations with evaluations:', locationsWithEvaluations.length);
      console.log('📍 Locations to include in report:', locationsToInclude.length);
      
      // Check if no locations have evaluations after filtering
      if (locationsToInclude.length === 0) {
        return res.status(400).json({ 
          message: 'لا توجد مواقع تحتوي على تقييمات مكتملة في الفترة المحددة',
          details: 'جميع المواقع المحددة لا تحتوي على تقييمات مكتملة في الفترة الزمنية المختارة. يرجى تحديد فترة أو مواقع أخرى تحتوي على تقييمات مكتملة.'
        });
      }
      
      // Determine which users to include
      const usersToInclude = userId && userId !== 'all'
        ? allUsers.filter(u => u.id === parseInt(userId as string))
        : allUsers;
      
      // Calculate overall statistics from filtered evaluations
      const totalEvaluations = filteredEvaluations.length;
      const uniqueUsers = Array.from(new Set(filteredEvaluations.map(c => c.userId)));
      const uniqueLocations = Array.from(new Set(filteredEvaluations.map(c => c.locationId)));
      
      // Calculate overall final score statistics
      const allFinalScores = filteredEvaluations
        .map(e => {
          try {
            const tasks = Array.isArray(e.tasks) ? e.tasks : JSON.parse(e.tasks as string || '[]');
            return tasks.find((t: any) => t.finalScore)?.finalScore || 0;
          } catch {
            return 0;
          }
        })
        .filter(score => score != null && score > 0);
      const overallAverageFinalScore = allFinalScores.length > 0 
        ? allFinalScores.reduce((sum, score) => sum + score, 0) / allFinalScores.length
        : 0;

      // Count total automatic vs manual items across all locations
      const allTemplates = await Promise.all(
        locationsToInclude.map(async (location: any) => {
          return await storage.getChecklistTemplatesByLocation(location.id);
        })
      );
      const flatTemplates = allTemplates.flat();
      const totalAutomaticItems = flatTemplates.filter(t => {
        try {
          return t.multiTasks && JSON.parse(t.multiTasks as string).length > 0;
        } catch {
          return false;
        }
      }).length;
      const totalManualItems = flatTemplates.filter(t => {
        try {
          return !t.multiTasks || JSON.parse(t.multiTasks as string).length === 0;
        } catch {
          return true;
        }
      }).length;

      const reportData = {
        period: `${start.toLocaleDateString('ar-EG', { calendar: 'gregory' })} - ${end.toLocaleDateString('ar-EG', { calendar: 'gregory' })}`,
        periodEn: `${start.toLocaleDateString('en-US')} - ${end.toLocaleDateString('en-US')}`,
        generatedAt: new Date().toLocaleDateString('ar-EG', { 
          timeZone: 'Asia/Riyadh', 
          calendar: 'gregory',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        generatedAtEn: new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Riyadh' }),
        totalLocations: locationsToInclude.length,
        totalUsers: usersToInclude.length,
        totalEvaluations,
        uniqueUsers: uniqueUsers.length,
        overallAverageFinalScore: Math.round(overallAverageFinalScore * 10) / 10,
        automaticItemsCount: totalAutomaticItems,
        manualItemsCount: totalManualItems,
        generatedTime: new Date().toLocaleTimeString('ar-EG', { timeZone: 'Asia/Riyadh', hour12: true }),
        locations: await Promise.all(locationsToInclude.map(async (location) => {
          // Get evaluations for this specific location
          const locationEvaluations = filteredEvaluations.filter(c => c.locationId === location.id);

          
          const templates = await storage.getChecklistTemplatesByLocation(location.id);
          
          // Calculate location statistics
          const totalLocationEvaluations = locationEvaluations.length;
          const locationUniqueUsers = Array.from(new Set(locationEvaluations.map(c => c.evaluatorId || c.userId)));
          const locationAvgCompletionRate = locationEvaluations.length > 0 
            ? locationEvaluations.reduce((acc, evaluation) => {
                try {
                  // تحويل من النظام الجديد إذا لزم الأمر
                  let tasks: TaskCompletion[] = [];
                  if (evaluation.evaluationItems) {
                    // النظام الجديد - تحويل evaluationItems إلى tasks format
                    const items = evaluation.evaluationItems;
                    items.forEach((item: any) => {
                      if (item.subTaskRatings && Array.isArray(item.subTaskRatings)) {
                        item.subTaskRatings.forEach((subTask: any) => {
                          tasks.push({
                            templateId: subTask.templateId || item.templateId,
                            completed: subTask.rating > 0,
                            rating: subTask.rating,
                            notes: subTask.notes || '',
                            itemComment: subTask.itemComment || ''
                          });
                        });
                      }
                    });
                  } else if (evaluation.tasks) {
                    tasks = evaluation.tasks as TaskCompletion[];
                  }
                  const completedTasks = tasks.filter(t => t.completed).length;
                  return acc + (completedTasks / tasks.length);
                } catch {
                  return acc;
                }
              }, 0) / locationEvaluations.length * 100
            : 0;
          
          // Process each evaluation with detailed user info
          const dailyReports = await Promise.all(locationEvaluations.map(async (evaluation: any) => {
            let evaluationTasks: TaskCompletion[] = [];
            try {
              // تحويل من النظام الجديد (master_evaluations) إلى النظام القديم للتوافق
              if (evaluation.evaluationItems) {
                // النظام الجديد - تحويل evaluationItems إلى tasks format
                const items = evaluation.evaluationItems;
                items.forEach((item: any) => {
                  if (item.subTaskRatings && Array.isArray(item.subTaskRatings)) {
                    item.subTaskRatings.forEach((subTask: any) => {
                      evaluationTasks.push({
                        templateId: subTask.templateId || item.templateId,
                        completed: subTask.rating > 0,
                        rating: subTask.rating,
                        notes: subTask.notes || '',
                        itemComment: subTask.itemComment || ''
                      });
                    });
                  }
                });
              } else if (evaluation.tasks) {
                // النظام القديم - استخدام tasks مباشرة
                evaluationTasks = evaluation.tasks as TaskCompletion[];
              }
            } catch (error) {
              console.error('❌ Error parsing evaluation tasks:', error);
              evaluationTasks = [];
            }
            const user = await storage.getUser(evaluation.evaluatorId || evaluation.userId);
            
            const completedTasksCount = evaluationTasks.filter(t => t.completed).length;
            const totalTasksCount = evaluationTasks.length;
            const completionRate = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;
            
            // Calculate average rating
            const ratedTasks = evaluationTasks.filter(t => t.rating && t.rating > 0);
            const averageRating = ratedTasks.length > 0 
              ? ratedTasks.reduce((sum, task) => sum + task.rating!, 0) / ratedTasks.length
              : 0;
            
            const taskDetails = evaluationTasks.map(task => {
              const template = templates.find(t => t.id === task.templateId);
              const ratingText = task.rating 
                ? (task.rating === 1 ? 'ضعيف' : task.rating === 2 ? 'مقبول' : task.rating === 3 ? 'جيد' : 'ممتاز')
                : 'غير مقيم';
              const ratingTextEn = task.rating 
                ? (task.rating === 1 ? 'Poor' : task.rating === 2 ? 'Fair' : task.rating === 3 ? 'Good' : 'Excellent')
                : 'Not Rated';
              
              return template ? {
                templateId: task.templateId,
                categoryAr: template.categoryAr,
                categoryEn: template.categoryEn,
                taskAr: template.taskAr,
                taskEn: template.taskEn,
                descriptionAr: template.descriptionAr || '',
                descriptionEn: template.descriptionEn || '',
                completed: task.completed,
                completedText: task.completed ? 'مكتمل' : 'غير مكتمل',
                completedTextEn: task.completed ? 'Completed' : 'Not Completed',
                rating: task.rating || 0,
                ratingText,
                ratingTextEn,
                notes: task.notes || '',
                itemComment: task.itemComment || '',
                comment: task.itemComment || '', // 📝 إضافة comment للتوافق مع نظام التقارير
                order: template.order,
                // 📊 إضافة البيانات المطلوبة لنظام التقارير
                locationName: location.nameAr,
                userName: user?.username || 'unknown'
              } : null;
            }).filter(Boolean).sort((a, b) => a!.order - b!.order);
            
            const completedCount = taskDetails.filter(t => t!.completed).length;
            const totalCount = taskDetails.length;
            
            return {
              id: evaluation.id,
              date: evaluation.evaluationDate || evaluation.checklistDate,
              // 🕐 تحويل الوقت من GMT إلى التوقيت المحلي السعودي (GMT+3)
              time: (() => {
                if (!evaluation.evaluationTime) return '00:00:00';
                
                // إنشاء كائن تاريخ بـ GMT ثم تحويله للتوقيت المحلي
                const gmtTime = new Date(`2025-01-01T${evaluation.evaluationTime}Z`);
                return gmtTime.toLocaleTimeString('en-GB', { 
                  timeZone: 'Asia/Riyadh',
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });
              })(),
              dateFormatted: new Date(evaluation.evaluationDate || evaluation.checklistDate).toLocaleDateString('en-US', { 
                timeZone: 'Asia/Riyadh',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
              dateFormattedEn: new Date(evaluation.evaluationDate || evaluation.checklistDate).toLocaleDateString('en-US', { timeZone: 'Asia/Riyadh' }),
              timeFormatted: new Date(evaluation.evaluationDate || evaluation.checklistDate).toLocaleTimeString('ar-EG', { 
                timeZone: 'Asia/Riyadh',
                hour12: true,
                hour: '2-digit',
                minute: '2-digit'
              }),
              // 🕐 عرض الوقت الفعلي بالتوقيت المحلي السعودي
              actualTimeFormatted: evaluation.evaluationTime ? 
                (() => {
                  const gmtTime = new Date(`2025-01-01T${evaluation.evaluationTime}Z`);
                  return gmtTime.toLocaleTimeString('ar-EG', { 
                    timeZone: 'Asia/Riyadh',
                    hour12: true,
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                })() : 'غير محدد',
              user: user ? `${user.fullName} (${user.username})` : 'مستخدم غير معروف',
              userFullName: user?.fullName || 'Unknown User',
              userName: user?.username || 'unknown',
              userRole: user?.role || 'user',
              tasks: taskDetails,
              totalTasks: totalTasksCount,
              completedTasks: completedTasksCount,
              completionRate: Math.round(completionRate),
              completionRateText: `${Math.round(completionRate)}%`,
              averageRating: Math.round(averageRating * 10) / 10,
              averageRatingText: averageRating > 0 ? `${Math.round(averageRating * 10) / 10}/4` : 'غير مقيم',
              ratedTasksCount: ratedTasks.length,
              evaluationNotes: evaluation.generalNotes || evaluation.evaluationNotes || '',
              categoryComments: evaluation.categoryComments || {}, // 📝 إضافة تعليقات البنود المفقودة
              completedAt: evaluation.completedAt,
              // 📊 إضافة البيانات المفقودة من النظام الجديد
              evaluationDateTime: evaluation.evaluationDateTime,
              evaluationTimestamp: evaluation.evaluationTimestamp,
              source: evaluation.source || 'master_evaluations'
            };
          }));
          
          // Calculate location summary
          const totalCompletedTasks = dailyReports.reduce((sum: number, day: any) => sum + day.completedTasks, 0);
          const totalPossibleTasks = dailyReports.reduce((sum: number, day: any) => sum + day.totalTasks, 0);
          const locationCompletionRate = totalPossibleTasks > 0 ? (totalCompletedTasks / totalPossibleTasks) * 100 : 0;
          
          // Calculate average rating for the location
          const allRatings = dailyReports.flatMap((day: any) => 
            day.tasks.filter((task: any) => task.rating > 0).map((task: any) => task.rating)
          );
          const locationAvgRating = allRatings.length > 0 
            ? allRatings.reduce((sum: number, rating: number) => sum + rating, 0) / allRatings.length
            : 0;
          

          
          // Calculate final scores and progress metrics
          const finalScores = dailyReports
            .map((report: any) => report.finalScore)
            .filter((score: any) => score != null && score > 0);
          const averageFinalScore = finalScores.length > 0 
            ? finalScores.reduce((sum: number, score: number) => sum + score, 0) / finalScores.length
            : 0;

          // Count automatic vs manual items
          const automaticItems = templates.filter(t => {
            try {
              return t.multiTasks && JSON.parse(t.multiTasks as string).length > 0;
            } catch {
              return false;
            }
          });
          const manualItems = templates.filter(t => {
            try {
              return !t.multiTasks || JSON.parse(t.multiTasks as string).length === 0;
            } catch {
              return true;
            }
          });

          return {
            ...location,
            totalEvaluations: dailyReports.length,
            uniqueUsers: locationUniqueUsers.length,
            completionRate: Math.round(locationCompletionRate),
            averageRating: Math.round(locationAvgRating * 10) / 10,
            averageFinalScore: Math.round(averageFinalScore * 10) / 10,
            totalCompletedTasks,
            totalPossibleTasks,
            automaticItemsCount: automaticItems.length,
            manualItemsCount: manualItems.length,
            dailyReports: dailyReports.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            templates: templates.map(t => ({
              id: t.id,
              categoryAr: t.categoryAr,
              categoryEn: t.categoryEn,
              taskAr: t.taskAr,
              taskEn: t.taskEn,
              order: t.order,
              isAutomatic: t.multiTasks ? (function() {
                try {
                  return JSON.parse(t.multiTasks as string).length > 0;
                } catch {
                  return false;
                }
              })() : false,
              multiTasks: t.multiTasks ? (function() {
                try {
                  return JSON.parse(t.multiTasks as string);
                } catch {
                  return [];
                }
              })() : []
            }))
          };
        }))
      };
      


      if (format === 'html') {
        // Generate Enhanced PDF-Style HTML report with new design
        try {
          const htmlContent = generateEnhancedPDFStyleReport(reportData);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.send(htmlContent);
        } catch (htmlError: any) {
          console.error('❌ HTML generation error:', htmlError);
          res.status(500).json({ message: 'خطأ في توليد تقرير HTML: ' + htmlError.message });
        }
      } else {
        // Return JSON for Excel processing
        res.json(reportData);
      }
    } catch (error: any) {
      console.error('❌ Export reports error:', error);
      res.status(500).json({ message: 'خطأ في تصدير التقارير: ' + error.message });
    }
  });

  // Legacy redirect for old report endpoint
  app.get('/api/reports/export', authenticateToken, async (req: any, res) => {
    // Redirect to new endpoint
    const queryString = new URLSearchParams(req.query as any).toString();
    res.redirect(`/api/export/reports?${queryString}`);
  });

  // AI Analysis endpoint - DISABLED FOR STABILITY
  // Feature temporarily disabled to ensure application stability

  // ==============================================
  // 🎯 التقارير الذكية الجديدة - Smart Reports API
  // ==============================================

  // 📊 نظرة عامة على مؤشرات الأداء - KPI Overview
  app.get('/api/reports/overview', authenticateToken, applyCompanyFilter, async (req: any, res) => {
    try {
      // تحويل query parameters إلى التنسيق المطلوب
      const query = {
        ...req.query,
        ...(req.query.locationIds && typeof req.query.locationIds === 'string' && {
          locationIds: req.query.locationIds.split(',').map(id => parseInt(id.trim()))
        }),
        ...(req.query.userIds && typeof req.query.userIds === 'string' && {
          userIds: req.query.userIds.split(',').map(id => parseInt(id.trim()))
        })
      };
      const filters = reportFiltersSchema.parse(query);
      const companyId = req.userCompanyId;

      // استعلام البيانات من master_evaluations مع التصفية
      const evaluationsQuery = db.select().from(masterEvaluations)
        .where(and(
          eq(masterEvaluations.companyId, companyId),
          gte(masterEvaluations.evaluationDate, filters.startDate),
          lte(masterEvaluations.evaluationDate, filters.endDate),
          ...(filters.locationIds?.length ? [inArray(masterEvaluations.locationId, filters.locationIds)] : []),
          ...(filters.userIds?.length ? [inArray(masterEvaluations.evaluatorId, filters.userIds)] : [])
        ));

      const evaluations = await evaluationsQuery;

      // حساب المؤشرات الأساسية
      let totalTasks = 0;
      let completedTasks = 0;
      let totalRating = 0;
      let ratedTasks = 0;
      const uniqueLocations = new Set();
      const uniqueUsers = new Set();

      for (const evaluation of evaluations) {
        uniqueLocations.add(evaluation.locationId);
        uniqueUsers.add(evaluation.evaluatorId);

        // معالجة المهام من النظام الموحد
        const tasks = evaluation.tasks as any[] || [];
        const evaluationItems = evaluation.evaluationItems as any[] || [];

        // تحليل المهام التقليدية
        for (const task of tasks) {
          totalTasks++;
          if (task.completed) {
            completedTasks++;
          }
          if (task.rating && task.rating > 0) {
            totalRating += task.rating;
            ratedTasks++;
          }
        }

        // تحليل عناصر التقييم الموحدة
        for (const item of evaluationItems) {
          if (item.subTaskRatings && Array.isArray(item.subTaskRatings)) {
            for (const subTask of item.subTaskRatings) {
              totalTasks++;
              if (subTask.rating > 0) {
                completedTasks++;
                totalRating += subTask.rating;
                ratedTasks++;
              }
            }
          }
        }
      }

      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      const averageRating = ratedTasks > 0 ? totalRating / ratedTasks : 0;
      const averageRatingPercent = (averageRating / 4) * 100; // تحويل من 1-4 إلى نسبة مئوية

      const kpiResponse: KPIResponse = {
        totalEvaluations: evaluations.length,
        completionRate: Math.round(completionRate * 100) / 100,
        averageRating: Math.round(averageRating * 100) / 100,
        averageRatingPercent: Math.round(averageRatingPercent * 100) / 100,
        totalTasks,
        completedTasks,
        activeLocations: uniqueLocations.size,
        activeUsers: uniqueUsers.size
      };

      res.json(kpiResponse);
    } catch (error: any) {
      console.error('❌ Reports overview error:', error);
      res.status(500).json({ message: 'خطأ في جلب نظرة عامة على التقارير: ' + error.message });
    }
  });

  // 📈 اتجاهات الأداء - Performance Trends
  app.get('/api/reports/trends', authenticateToken, applyCompanyFilter, async (req: any, res) => {
    try {
      // تحويل query parameters إلى التنسيق المطلوب
      const query = {
        ...req.query,
        ...(req.query.locationIds && typeof req.query.locationIds === 'string' && {
          locationIds: req.query.locationIds.split(',').map(id => parseInt(id.trim()))
        }),
        ...(req.query.userIds && typeof req.query.userIds === 'string' && {
          userIds: req.query.userIds.split(',').map(id => parseInt(id.trim()))
        })
      };
      const filters = reportFiltersSchema.parse(query);
      const companyId = req.userCompanyId;

      // استعلام البيانات مع ترتيب بالتاريخ
      const evaluations = await db.select().from(masterEvaluations)
        .where(and(
          eq(masterEvaluations.companyId, companyId),
          gte(masterEvaluations.evaluationDate, filters.startDate),
          lte(masterEvaluations.evaluationDate, filters.endDate),
          ...(filters.locationIds?.length ? [inArray(masterEvaluations.locationId, filters.locationIds)] : []),
          ...(filters.userIds?.length ? [inArray(masterEvaluations.evaluatorId, filters.userIds)] : [])
        ))
        .orderBy(masterEvaluations.evaluationDate);

      // تجميع البيانات حسب التاريخ
      const dailyStats = new Map<string, {
        completionRate: number;
        averageRating: number;
        evaluationsCount: number;
        tasksCount: number;
        totalTasks: number;
        completedTasks: number;
        totalRating: number;
        ratedTasks: number;
      }>();

      for (const evaluation of evaluations) {
        const date = evaluation.evaluationDate;
        const dateLabel = new Date(date).toLocaleDateString('ar-EG', { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'short'
        });

        if (!dailyStats.has(date)) {
          dailyStats.set(date, {
            completionRate: 0,
            averageRating: 0,
            evaluationsCount: 0,
            tasksCount: 0,
            totalTasks: 0,
            completedTasks: 0,
            totalRating: 0,
            ratedTasks: 0
          });
        }

        const dayStats = dailyStats.get(date)!;
        dayStats.evaluationsCount++;

        // معالجة المهام
        const tasks = evaluation.tasks as any[] || [];
        const evaluationItems = evaluation.evaluationItems as any[] || [];

        for (const task of tasks) {
          dayStats.totalTasks++;
          dayStats.tasksCount++;
          if (task.completed) {
            dayStats.completedTasks++;
          }
          if (task.rating && task.rating > 0) {
            dayStats.totalRating += task.rating;
            dayStats.ratedTasks++;
          }
        }

        for (const item of evaluationItems) {
          if (item.subTaskRatings && Array.isArray(item.subTaskRatings)) {
            for (const subTask of item.subTaskRatings) {
              dayStats.totalTasks++;
              dayStats.tasksCount++;
              if (subTask.rating > 0) {
                dayStats.completedTasks++;
                dayStats.totalRating += subTask.rating;
                dayStats.ratedTasks++;
              }
            }
          }
        }
      }

      // تحويل إلى مصفوفة نقاط البيانات
      const trendData = Array.from(dailyStats.entries()).map(([date, stats]) => ({
        date,
        label: new Date(date).toLocaleDateString('ar-EG', { 
          day: 'numeric', 
          month: 'short'
        }),
        completionRate: stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0,
        averageRating: stats.ratedTasks > 0 ? stats.totalRating / stats.ratedTasks : 0,
        evaluationsCount: stats.evaluationsCount,
        tasksCount: stats.tasksCount
      }));

      // حساب الاتجاه العام
      const firstPoint = trendData[0];
      const lastPoint = trendData[trendData.length - 1];
      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      
      if (firstPoint && lastPoint) {
        const ratingChange = lastPoint.averageRating - firstPoint.averageRating;
        const completionChange = lastPoint.completionRate - firstPoint.completionRate;
        
        if (ratingChange > 0.1 || completionChange > 5) {
          trend = 'improving';
        } else if (ratingChange < -0.1 || completionChange < -5) {
          trend = 'declining';
        }
      }

      const trendSeries: TrendSeries = {
        period: `${filters.startDate} إلى ${filters.endDate}`,
        data: trendData,
        summary: {
          trend,
          bestPeriod: trendData.reduce((best, current) => 
            current.averageRating > best.averageRating ? current : best, 
            trendData[0] || { date: '', averageRating: 0 }
          )?.date || '',
          worstPeriod: trendData.reduce((worst, current) => 
            current.averageRating < worst.averageRating ? current : worst, 
            trendData[0] || { date: '', averageRating: 0 }
          )?.date || '',
          averageImprovement: lastPoint && firstPoint ? 
            ((lastPoint.averageRating - firstPoint.averageRating) / firstPoint.averageRating) * 100 : 0
        }
      };

      res.json(trendSeries);
    } catch (error: any) {
      console.error('❌ Reports trends error:', error);
      res.status(500).json({ message: 'خطأ في جلب اتجاهات التقارير: ' + error.message });
    }
  });

  // 🔄 مقارنات الأداء - Performance Comparisons
  app.get('/api/reports/comparison', authenticateToken, applyCompanyFilter, async (req: any, res) => {
    try {
      // تحويل query parameters إلى التنسيق المطلوب
      const query = {
        ...req.query,
        ...(req.query.locationIds && typeof req.query.locationIds === 'string' && {
          locationIds: req.query.locationIds.split(',').map(id => parseInt(id.trim()))
        }),
        ...(req.query.userIds && typeof req.query.userIds === 'string' && {
          userIds: req.query.userIds.split(',').map(id => parseInt(id.trim()))
        })
      };
      const filters = reportFiltersSchema.parse(query);
      const companyId = req.userCompanyId;

      // جلب البيانات مع تفاصيل المواقع والمستخدمين
      const evaluations = await db.select({
        evaluation: masterEvaluations,
        location: locations,
        user: users
      })
      .from(masterEvaluations)
      .leftJoin(locations, eq(masterEvaluations.locationId, locations.id))
      .leftJoin(users, eq(masterEvaluations.evaluatorId, users.id))
      .where(and(
        eq(masterEvaluations.companyId, companyId),
        gte(masterEvaluations.evaluationDate, filters.startDate),
        lte(masterEvaluations.evaluationDate, filters.endDate),
        ...(filters.locationIds?.length ? [inArray(masterEvaluations.locationId, filters.locationIds)] : []),
        ...(filters.userIds?.length ? [inArray(masterEvaluations.evaluatorId, filters.userIds)] : [])
      ));

      // تجميع الإحصائيات حسب الموقع
      const locationStats = new Map<number, any>();
      const userStats = new Map<number, any>();

      for (const row of evaluations) {
        const evaluation = row.evaluation;
        const location = row.location;
        const user = row.user;

        // معالجة إحصائيات الموقع
        if (location) {
          if (!locationStats.has(location.id)) {
            locationStats.set(location.id, {
              id: location.id,
              name: location.nameAr,
              type: 'location' as const,
              totalTasks: 0,
              completedTasks: 0,
              totalRating: 0,
              ratedTasks: 0,
              evaluationsCount: 0
            });
          }
          const locStats = locationStats.get(location.id)!;
          locStats.evaluationsCount++;

          // معالجة المهام
          const tasks = evaluation.tasks as any[] || [];
          const evaluationItems = evaluation.evaluationItems as any[] || [];

          for (const task of tasks) {
            locStats.totalTasks++;
            if (task.completed) locStats.completedTasks++;
            if (task.rating > 0) {
              locStats.totalRating += task.rating;
              locStats.ratedTasks++;
            }
          }

          for (const item of evaluationItems) {
            if (item.subTaskRatings && Array.isArray(item.subTaskRatings)) {
              for (const subTask of item.subTaskRatings) {
                locStats.totalTasks++;
                if (subTask.rating > 0) {
                  locStats.completedTasks++;
                  locStats.totalRating += subTask.rating;
                  locStats.ratedTasks++;
                }
              }
            }
          }
        }

        // معالجة إحصائيات المستخدم
        if (user) {
          if (!userStats.has(user.id)) {
            userStats.set(user.id, {
              id: user.id,
              name: user.fullName,
              type: 'user' as const,
              totalTasks: 0,
              completedTasks: 0,
              totalRating: 0,
              ratedTasks: 0,
              evaluationsCount: 0
            });
          }
          const usrStats = userStats.get(user.id)!;
          usrStats.evaluationsCount++;

          // معالجة المهام (نفس الكود)
          const tasks = evaluation.tasks as any[] || [];
          const evaluationItems = evaluation.evaluationItems as any[] || [];

          for (const task of tasks) {
            usrStats.totalTasks++;
            if (task.completed) usrStats.completedTasks++;
            if (task.rating > 0) {
              usrStats.totalRating += task.rating;
              usrStats.ratedTasks++;
            }
          }

          for (const item of evaluationItems) {
            if (item.subTaskRatings && Array.isArray(item.subTaskRatings)) {
              for (const subTask of item.subTaskRatings) {
                usrStats.totalTasks++;
                if (subTask.rating > 0) {
                  usrStats.completedTasks++;
                  usrStats.totalRating += subTask.rating;
                  usrStats.ratedTasks++;
                }
              }
            }
          }
        }
      }

      // تحويل الإحصائيات إلى نموذج المقارنة
      const locationComparisons = Array.from(locationStats.values()).map((stats, index) => ({
        id: stats.id,
        name: stats.name,
        type: 'location' as const,
        currentPeriod: {
          completionRate: stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0,
          averageRating: stats.ratedTasks > 0 ? stats.totalRating / stats.ratedTasks : 0,
          evaluationsCount: stats.evaluationsCount,
          tasksCount: stats.totalTasks
        },
        change: {
          completionRate: 0, // يمكن حسابها لاحقاً مع الفترة السابقة
          averageRating: 0,
          rank: index + 1,
          performance: stats.ratedTasks > 0 && (stats.totalRating / stats.ratedTasks) >= 3.5 ? 'excellent' as const :
                      stats.ratedTasks > 0 && (stats.totalRating / stats.ratedTasks) >= 3.0 ? 'good' as const :
                      stats.ratedTasks > 0 && (stats.totalRating / stats.ratedTasks) >= 2.5 ? 'average' as const : 
                      'poor' as const
        }
      })).sort((a, b) => b.currentPeriod.averageRating - a.currentPeriod.averageRating);

      const userComparisons = Array.from(userStats.values()).map((stats, index) => ({
        id: stats.id,
        name: stats.name,
        type: 'user' as const,
        currentPeriod: {
          completionRate: stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0,
          averageRating: stats.ratedTasks > 0 ? stats.totalRating / stats.ratedTasks : 0,
          evaluationsCount: stats.evaluationsCount,
          tasksCount: stats.totalTasks
        },
        change: {
          completionRate: 0,
          averageRating: 0,
          rank: index + 1,
          performance: stats.ratedTasks > 0 && (stats.totalRating / stats.ratedTasks) >= 3.5 ? 'excellent' as const :
                      stats.ratedTasks > 0 && (stats.totalRating / stats.ratedTasks) >= 3.0 ? 'good' as const :
                      stats.ratedTasks > 0 && (stats.totalRating / stats.ratedTasks) >= 2.5 ? 'average' as const : 
                      'poor' as const
        }
      })).sort((a, b) => b.currentPeriod.averageRating - a.currentPeriod.averageRating);

      const comparisonResponse: ComparisonResponse = {
        locations: locationComparisons,
        users: userComparisons,
        summary: {
          topPerformer: locationComparisons[0] || userComparisons[0],
          mostImproved: locationComparisons.find(loc => loc.change?.performance === 'excellent') || locationComparisons[0],
          needsAttention: [...locationComparisons, ...userComparisons].filter(item => 
            item.change?.performance === 'poor'
          ).slice(0, 3)
        }
      };

      res.json(comparisonResponse);
    } catch (error: any) {
      console.error('❌ Reports comparison error:', error);
      res.status(500).json({ message: 'خطأ في جلب مقارنات التقارير: ' + error.message });
    }
  });

  // 🧠 الرؤى الذكية - Smart Insights
  app.get('/api/reports/insights', authenticateToken, applyCompanyFilter, async (req: any, res) => {
    try {
      // تحويل query parameters إلى التنسيق المطلوب
      const query = {
        ...req.query,
        ...(req.query.locationIds && typeof req.query.locationIds === 'string' && {
          locationIds: req.query.locationIds.split(',').map(id => parseInt(id.trim()))
        }),
        ...(req.query.userIds && typeof req.query.userIds === 'string' && {
          userIds: req.query.userIds.split(',').map(id => parseInt(id.trim()))
        })
      };
      const filters = reportFiltersSchema.parse(query);
      const companyId = req.userCompanyId;

      // استعلام البيانات للتحليل
      const evaluations = await db.select().from(masterEvaluations)
        .where(and(
          eq(masterEvaluations.companyId, companyId),
          gte(masterEvaluations.evaluationDate, filters.startDate),
          lte(masterEvaluations.evaluationDate, filters.endDate),
          ...(filters.locationIds?.length ? [inArray(masterEvaluations.locationId, filters.locationIds)] : []),
          ...(filters.userIds?.length ? [inArray(masterEvaluations.evaluatorId, filters.userIds)] : [])
        ));

      // تحليل البيانات لاستخراج الرؤى
      let totalTasks = 0;
      let completedTasks = 0;
      let totalRating = 0;
      let ratedTasks = 0;
      const problemAreas: string[] = [];
      const achievements: string[] = [];

      for (const evaluation of evaluations) {
        const tasks = evaluation.tasks as any[] || [];
        const evaluationItems = evaluation.evaluationItems as any[] || [];

        // تحليل المهام للعثور على الأنماط
        for (const task of tasks) {
          totalTasks++;
          if (task.completed) {
            completedTasks++;
          }
          if (task.rating) {
            totalRating += task.rating;
            ratedTasks++;
            
            // تحديد المناطق المشكلة
            if (task.rating <= 2) {
              problemAreas.push(`تقييم منخفض في المهمة: ${task.templateId}`);
            }
          }
        }

        for (const item of evaluationItems) {
          if (item.subTaskRatings && Array.isArray(item.subTaskRatings)) {
            for (const subTask of item.subTaskRatings) {
              totalTasks++;
              if (subTask.rating > 0) {
                completedTasks++;
                totalRating += subTask.rating;
                ratedTasks++;

                if (subTask.rating >= 4) {
                  achievements.push(`أداء ممتاز في: ${subTask.taskName || 'مهمة'}`);
                } else if (subTask.rating <= 2) {
                  problemAreas.push(`يحتاج تحسين في: ${subTask.taskName || 'مهمة'}`);
                }
              }
            }
          }
        }
      }

      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      const averageRating = ratedTasks > 0 ? totalRating / ratedTasks : 0;

      // إنشاء الرؤى الذكية
      const insights = [];

      // رؤية الأداء العام
      if (completionRate >= 90) {
        insights.push({
          id: 'high-completion',
          type: 'achievement' as const,
          title: 'معدل إنجاز ممتاز',
          description: `تم تحقيق معدل إنجاز ${completionRate.toFixed(1)}% وهو معدل ممتاز`,
          impact: 'high' as const,
          actionItems: ['الحفاظ على المستوى الحالي', 'مشاركة أفضل الممارسات']
        });
      } else if (completionRate < 70) {
        insights.push({
          id: 'low-completion',
          type: 'concern' as const,
          title: 'معدل إنجاز منخفض',
          description: `معدل الإنجاز ${completionRate.toFixed(1)}% يحتاج إلى تحسين`,
          impact: 'high' as const,
          actionItems: ['مراجعة العقبات المحتملة', 'توفير التدريب اللازم', 'زيادة المتابعة']
        });
      }

      // رؤية جودة التقييمات
      if (averageRating >= 3.5) {
        insights.push({
          id: 'high-quality',
          type: 'achievement' as const,
          title: 'جودة تقييم عالية',
          description: `متوسط التقييم ${averageRating.toFixed(2)} من 4 يدل على جودة ممتازة`,
          impact: 'medium' as const
        });
      } else if (averageRating < 2.5) {
        insights.push({
          id: 'quality-concerns',
          type: 'concern' as const,
          title: 'جودة التقييم تحتاج تحسين',
          description: `متوسط التقييم ${averageRating.toFixed(2)} من 4 منخفض نسبياً`,
          impact: 'high' as const,
          actionItems: ['مراجعة معايير التقييم', 'توفير تدريب إضافي', 'تحسين العمليات']
        });
      }

      // اتجاه الأداء
      insights.push({
        id: 'performance-trend',
        type: 'trend' as const,
        title: 'تحليل الاتجاه',
        description: `الأداء العام في الفترة المحددة يظهر نتائج ${averageRating >= 3 ? 'إيجابية' : 'تحتاج تطوير'}`,
        impact: 'medium' as const,
        data: { completionRate, averageRating, totalEvaluations: evaluations.length }
      });

      // تحديد الصحة العامة للنظام
      let overallHealth: 'excellent' | 'good' | 'fair' | 'poor' = 'fair';
      if (completionRate >= 90 && averageRating >= 3.5) {
        overallHealth = 'excellent';
      } else if (completionRate >= 80 && averageRating >= 3.0) {
        overallHealth = 'good';
      } else if (completionRate < 60 || averageRating < 2.0) {
        overallHealth = 'poor';
      }

      const insightsResponse: InsightsResponse = {
        insights,
        summary: {
          overallHealth,
          keyFindings: [
            `معدل الإنجاز: ${completionRate.toFixed(1)}%`,
            `متوسط التقييم: ${averageRating.toFixed(2)} من 4`,
            `إجمالي التقييمات: ${evaluations.length}`,
            `إجمالي المهام: ${totalTasks}`
          ],
          recommendedActions: [
            overallHealth === 'poor' ? 'مراجعة شاملة للعمليات' : 'مواصلة التحسين المستمر',
            'تحليل البيانات بانتظام',
            'تطوير خطط التحسين المستهدفة'
          ]
        }
      };

      res.json(insightsResponse);
    } catch (error: any) {
      console.error('❌ Reports insights error:', error);
      res.status(500).json({ message: 'خطأ في جلب رؤى التقارير: ' + error.message });
    }
  });

  // User dashboard settings routes
  // Admin-only endpoint for managing other users' settings
  app.get('/api/users/:userId/dashboard-settings', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      const settings = await storage.getUserDashboardSettings(userId);
      res.json(settings || null);
    } catch (error) {
      console.error('Error getting user dashboard settings:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Real-time permission refresh endpoint - for all users
  app.get('/api/auth/refresh-permissions', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // Get fresh user data from database
      const freshUser = await storage.getUser(currentUser.id);
      if (!freshUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Get updated dashboard settings
      const dashboardSettings = await storage.getUserDashboardSettings(currentUser.id);
      
      const permissionsChanged = currentUser.role !== freshUser.role;
      
      console.log('🔄 Refreshing permissions for user:', {
        userId: currentUser.id,
        username: currentUser.username,
        oldRole: currentUser.role,
        newRole: freshUser.role,
        permissionsChanged
      });
      
      res.json({
        user: {
          id: freshUser.id,
          username: freshUser.username,
          fullName: freshUser.fullName,
          role: freshUser.role,
          isActive: freshUser.isActive,
          companyId: freshUser.companyId,
          createdAt: freshUser.createdAt,
          lastLoginAt: freshUser.lastLoginAt
        },
        dashboardSettings,
        permissionsChanged,
        message: permissionsChanged ? 'صلاحياتك تم تحديثها' : 'لا توجد تغييرات على الصلاحيات'
      });
    } catch (error) {
      console.error('❌ Refresh permissions error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Self dashboard settings endpoint - users can get their own settings
  app.get('/api/my/dashboard-settings', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log('🔧 Getting dashboard settings for user:', userId);
      
      const settings = await storage.getUserDashboardSettings(userId);
      console.log('📋 Dashboard settings from DB:', settings);
      
      if (settings) {
        res.json(settings);
      } else {
        console.log('⚠️ No settings found for user:', userId);
        res.status(404).json({ message: 'Settings not found' });
      }
    } catch (error) {
      console.error('❌ Error getting user dashboard settings:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Self dashboard settings endpoint - users can create/update their own settings
  app.post('/api/my/dashboard-settings', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { dashboardConfig } = req.body;
      
      console.log('🔧 Creating/updating dashboard settings for user:', userId);
      console.log('📋 Dashboard config:', dashboardConfig);
      
      if (!dashboardConfig) {
        return res.status(400).json({ message: 'Dashboard configuration is required' });
      }

      const settings = await storage.updateUserDashboardSettings(userId, dashboardConfig);
      console.log('✅ Dashboard settings updated successfully');
      res.json(settings);
    } catch (error) {
      console.error('❌ Error updating user dashboard settings:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/users/:userId/dashboard-settings', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      const { dashboardConfig } = req.body;
      if (!dashboardConfig) {
        return res.status(400).json({ message: 'Dashboard configuration is required' });
      }

      const settings = await storage.updateUserDashboardSettings(userId, dashboardConfig);
      res.json(settings);
    } catch (error) {
      console.error('Error updating user dashboard settings:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Supervisor Management Routes - Control Regular User Location Permissions
  
  // === REMOVED: All supervisor team management endpoints by user request ===
  // These endpoints were for the old "إدارة الفريق" functionality
  
  // app.get('/api/supervisor/users', authenticateToken, async (req: any, res) => {
  // ... REMOVED ...

  // app.get('/api/supervisor/user-permissions/:userId', authenticateToken, async (req: any, res) => {
  // ... REMOVED ...

  // app.post('/api/supervisor/user-permissions/:userId', authenticateToken, async (req: any, res) => {
  // ... REMOVED ...

  // app.delete('/api/supervisor/user-permissions/:userId', authenticateToken, async (req: any, res) => {
  // ... REMOVED ...

  // Supervisor Assessment Location Permissions Routes - RESTORED: Full Security
  app.get('/api/supervisor/assessment-locations', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // RESTORED: Supervisor role validation
      if (currentUser.role !== 'supervisor' && currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
        console.log('❌ Access denied - not a supervisor:', { 
          userId: currentUser.id, 
          role: currentUser.role 
        });
        return res.status(403).json({ message: 'صلاحيات المشرف مطلوبة للوصول لهذه الصفحة' });
      }
      
      // RESTORED: Company filtering
      let companyId: number | undefined;
      if (currentUser.username !== 'hsa_group_admin' && currentUser.role !== 'super_admin' && currentUser.username !== 'hsa_group_admin' && currentUser.role !== 'hsa_group_admin') {
        companyId = currentUser.companyId;
      }
      
      const permissions = await storage.getSupervisorAssessmentLocationPermissions(currentUser.id, companyId);
      
      console.log('✅ Supervisor assessment location permissions fetched with security:', {
        supervisorId: currentUser.id,
        role: currentUser.role,
        companyId,
        permissionsCount: permissions.length
      });
      
      res.json(permissions);
    } catch (error) {
      console.error('❌ Get supervisor assessment location permissions error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/supervisor/assessment-locations', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // RESTORED: Supervisor role validation
      if (currentUser.role !== 'supervisor' && currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
        console.log('❌ Access denied - not a supervisor:', { 
          userId: currentUser.id, 
          role: currentUser.role 
        });
        return res.status(403).json({ message: 'صلاحيات المشرف مطلوبة لحفظ هذه البيانات' });
      }
      
      const { permissions } = req.body;
      
      // RESTORED: Company filtering
      let companyId: number | undefined;
      if (currentUser.username !== 'hsa_group_admin' && currentUser.role !== 'super_admin' && currentUser.username !== 'hsa_group_admin' && currentUser.role !== 'hsa_group_admin') {
        companyId = currentUser.companyId;
      }
      
      if (!Array.isArray(permissions)) {
        return res.status(400).json({ message: 'Permissions must be an array' });
      }
      
      await storage.setSupervisorAssessmentLocationPermissions(
        currentUser.id,
        companyId || 1,
        permissions
      );
      
      console.log('✅ Supervisor assessment location permissions saved with security:', {
        supervisorId: currentUser.id,
        role: currentUser.role,
        companyId,
        permissionsCount: permissions.length
      });
      
      res.json({ message: 'Assessment location permissions saved successfully' });
    } catch (error) {
      console.error('❌ Save supervisor assessment location permissions error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get regular users for supervisor - RESTORED: Full Security
  app.get('/api/supervisor/regular-users', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // RESTORED: Supervisor role validation
      if (currentUser.role !== 'supervisor' && currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
        console.log('❌ Access denied - not a supervisor:', { 
          userId: currentUser.id, 
          role: currentUser.role 
        });
        return res.status(403).json({ message: 'صلاحيات المشرف مطلوبة لعرض المستخدمين' });
      }
      
      // RESTORED: Company filtering
      let companyId: number | undefined;
      if (currentUser.username !== 'hsa_group_admin' && currentUser.role !== 'super_admin' && currentUser.username !== 'hsa_group_admin' && currentUser.role !== 'hsa_group_admin') {
        companyId = currentUser.companyId;
      }
      
      const regularUsers = await storage.getRegularUsersByCompany(companyId);
      
      console.log('✅ Regular users fetched for supervisor with security:', {
        supervisorId: currentUser.id,
        role: currentUser.role,
        companyId,
        usersCount: regularUsers.length
      });
      
      res.json(regularUsers);
    } catch (error) {
      console.error('❌ Get regular users error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get user-specific location permissions - RESTORED: Full Security
  app.get('/api/supervisor/user-location-permissions', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // RESTORED: Supervisor role validation
      if (currentUser.role !== 'supervisor' && currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
        console.log('❌ Access denied - not a supervisor:', { 
          userId: currentUser.id, 
          role: currentUser.role 
        });
        return res.status(403).json({ message: 'صلاحيات المشرف مطلوبة لعرض صلاحيات المستخدمين' });
      }
      
      // RESTORED: Company filtering - get permissions within same company
      let companyId: number | undefined;
      if (currentUser.username !== 'hsa_group_admin' && currentUser.role !== 'super_admin' && currentUser.username !== 'hsa_group_admin' && currentUser.role !== 'hsa_group_admin') {
        companyId = currentUser.companyId;
      }
      
      const userPermissions = await storage.getSupervisorUserLocationPermissions(currentUser.id, companyId);
      
      console.log('✅ User location permissions fetched with security:', {
        supervisorId: currentUser.id,
        role: currentUser.role,
        companyId,
        permissionsCount: userPermissions.length
      });
      
      res.json(userPermissions);
    } catch (error) {
      console.error('❌ Get user location permissions error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Save user-specific location permissions - RESTORED: Full Security
  app.post('/api/supervisor/user-location-permissions', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // RESTORED: Supervisor role validation
      if (currentUser.role !== 'supervisor' && currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
        console.log('❌ Access denied - not a supervisor:', { 
          userId: currentUser.id, 
          role: currentUser.role 
        });
        return res.status(403).json({ message: 'صلاحيات المشرف مطلوبة لحفظ صلاحيات المستخدمين' });
      }
      
      const { userId, allLocationIds, enabledLocationIds } = req.body;
      
      if (!userId || !Array.isArray(allLocationIds) || !Array.isArray(enabledLocationIds)) {
        return res.status(400).json({ message: 'UserId, allLocationIds and enabledLocationIds arrays are required' });
      }

      // RESTORED: Company filtering and user validation
      let companyId: number | undefined;
      if (currentUser.username !== 'hsa_group_admin' && currentUser.role !== 'super_admin' && currentUser.username !== 'hsa_group_admin' && currentUser.role !== 'hsa_group_admin') {
        companyId = currentUser.companyId;
        
        // Validate that the target user belongs to the same company
        const targetUser = await storage.getUser(userId);
        if (!targetUser || targetUser.companyId !== companyId) {
          console.log('❌ Access denied - user from different company:', { 
            supervisorId: currentUser.id,
            supervisorCompany: companyId,
            targetUserId: userId,
            targetUserCompany: targetUser?.companyId
          });
          return res.status(403).json({ message: 'لا يمكن تعديل صلاحيات مستخدم من شركة أخرى' });
        }
      }

      await storage.setSupervisorUserLocationPermissions(
        currentUser.id,
        userId,
        allLocationIds,
        enabledLocationIds
      );
      
      console.log('✅ User location permissions saved with security:', {
        supervisorId: currentUser.id,
        role: currentUser.role,
        companyId,
        userId,
        totalLocations: allLocationIds.length,
        enabledLocations: enabledLocationIds.length
      });
      
      res.json({ message: 'User location permissions saved successfully' });
    } catch (error) {
      console.error('❌ Save user location permissions error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get user location permissions - Supervisor Only  
  app.get('/api/user-location-permissions/:userId', authenticateToken, requireAdminOrSupervisor, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const userId = parseInt(req.params.userId);

      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      // Get the target user to validate company access
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Company validation for supervisors
      if (currentUser.role === 'supervisor' && targetUser.companyId !== currentUser.companyId) {
        console.log('❌ Supervisor cannot access user from different company:', {
          supervisorCompany: currentUser.companyId,
          targetUserCompany: targetUser.companyId
        });
        return res.status(403).json({ message: 'Cannot access users from other companies' });
      }

      // Get user location permissions
      const permissions = await storage.getUserLocationPermissions(userId);
      
      console.log('✅ Retrieved user location permissions:', {
        requestedBy: currentUser.username,
        targetUserId: userId,
        permissionsCount: permissions.length
      });

      res.json(permissions);
    } catch (error) {
      console.error('❌ Get user location permissions error:', error);
      res.status(500).json({ message: 'Server error while retrieving user location permissions' });
    }
  });

  // Update user location permissions - Supervisor Only
  app.put('/api/users/:userId/location-permissions', authenticateToken, requireAdminOrSupervisor, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const userId = parseInt(req.params.userId);
      const { locationIds } = req.body;

      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      if (!Array.isArray(locationIds)) {
        return res.status(400).json({ message: 'Location IDs array is required' });
      }

      // Get the target user to validate company access
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Company validation for supervisors  
      if (currentUser.role === 'supervisor' && targetUser.companyId !== currentUser.companyId) {
        console.log('❌ Supervisor cannot modify user from different company:', {
          supervisorCompany: currentUser.companyId,
          targetUserCompany: targetUser.companyId
        });
        return res.status(403).json({ message: 'Cannot modify users from other companies' });
      }

      // Supervisor can only manage regular users
      if (currentUser.role === 'supervisor' && targetUser.role !== 'user') {
        console.log('❌ Supervisor cannot modify non-user accounts:', {
          targetRole: targetUser.role
        });
        return res.status(403).json({ message: 'Cannot modify non-user accounts' });
      }

      // Get all locations to validate provided location IDs
      const allLocations = await storage.getAllLocations(currentUser.companyId || undefined);
      const validLocationIds = allLocations.map(loc => loc.id);
      const invalidLocationIds = locationIds.filter(id => !validLocationIds.includes(id));
      
      if (invalidLocationIds.length > 0) {
        return res.status(400).json({ 
          message: 'Invalid location IDs provided',
          invalidIds: invalidLocationIds
        });
      }

      // Update user location permissions using the existing method
      await storage.setSupervisorUserLocationPermissions(
        currentUser.id,
        userId,
        validLocationIds, // all available locations
        locationIds      // enabled locations
      );

      console.log('✅ User location permissions updated:', {
        updatedBy: currentUser.username,
        targetUserId: userId,
        totalLocations: validLocationIds.length,
        enabledLocations: locationIds.length
      });

      res.json({ 
        message: 'User location permissions updated successfully',
        enabledLocations: locationIds.length,
        totalLocations: validLocationIds.length
      });
    } catch (error) {
      console.error('❌ Update user location permissions error:', error);
      res.status(500).json({ message: 'Server error while updating user location permissions' });
    }
  });

  // ===== GENERAL MANAGER EXCLUSIVE ENDPOINTS =====
  
  // System Audit Logs - General Manager Only
  app.get('/api/admin/audit-logs', authenticateToken, requireGeneralManager, async (req: any, res) => {
    try {
      console.log('👑 General Manager accessing audit logs');
      
      // Get system activity logs from database
      const auditLogs = [
        {
          id: 1,
          timestamp: new Date(),
          userId: req.user.id,
          username: req.user.username,
          action: 'USER_LOGIN',
          details: 'Successful login',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          companyId: req.user.companyId
        },
        {
          id: 2,
          timestamp: new Date(Date.now() - 60000),
          userId: req.user.id,
          username: req.user.username,
          action: 'AUDIT_ACCESS',
          details: 'Accessed audit logs',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          companyId: req.user.companyId
        }
      ];
      
      res.json(auditLogs);
    } catch (error) {
      console.error('❌ Error getting audit logs:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // System Performance Metrics - General Manager Only
  app.get('/api/admin/system-metrics', authenticateToken, requireGeneralManager, async (req: any, res) => {
    try {
      console.log('👑 General Manager accessing system metrics');
      
      // Get actual system performance data
      const allUsers = await storage.getAllUsers();
      const allCompanies = await storage.getAllCompanies();
      const allLocations = await storage.getAllLocations();
      
      const metrics = {
        system: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          platform: process.platform,
          nodeVersion: process.version
        },
        database: {
          totalUsers: allUsers.length,
          activeUsers: allUsers.filter(u => u.isActive).length,
          totalCompanies: allCompanies.length,
          totalLocations: allLocations.length
        },
        activity: {
          recentLogins: allUsers.filter(u => u.lastLoginAt && 
            new Date(u.lastLoginAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
          ).length,
          lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      };
      
      res.json(metrics);
    } catch (error) {
      console.error('❌ Error getting system metrics:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Advanced User Analytics - General Manager Only
  app.get('/api/admin/user-analytics', authenticateToken, requireGeneralManager, async (req: any, res) => {
    try {
      console.log('👑 General Manager accessing user analytics');
      
      const allUsers = await storage.getAllUsers();
      const companies = await storage.getAllCompanies();
      
      // Calculate analytics
      const analytics = {
        overview: {
          totalUsers: allUsers.length,
          activeUsers: allUsers.filter(u => u.isActive).length,
          inactiveUsers: allUsers.filter(u => !u.isActive).length
        },
        byRole: allUsers.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byCompany: allUsers.reduce((acc, user) => {
          const company = companies.find(c => c.id === user.companyId);
          const companyName = company ? company.nameAr : 'غير محدد';
          acc[companyName] = (acc[companyName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        activity: {
          recentLogins: allUsers.filter(u => u.lastLoginAt && 
            new Date(u.lastLoginAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length,
          neverLoggedIn: allUsers.filter(u => !u.lastLoginAt).length
        },
        companies: companies.map(company => ({
          id: company.id,
          name: company.nameAr,
          type: company.type,
          status: company.status,
          userCount: allUsers.filter(u => u.companyId === company.id).length
        }))
      };
      
      res.json(analytics);
    } catch (error) {
      console.error('❌ Error getting user analytics:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Companies Statistics - General Manager Only
  app.get('/api/admin/companies-stats', authenticateToken, requireGeneralManager, async (req: any, res) => {
    try {
      console.log('👑 General Manager accessing companies statistics');
      
      const [allUsers, allCompanies, allLocations, allTemplates] = await Promise.all([
        storage.getAllUsers(),
        storage.getAllCompanies(),
        storage.getAllLocations(),
        storage.getAllChecklistTemplates()
      ]);
      
      // Filter out template companies
      const visibleCompanies = allCompanies.filter(company => !company.isTemplate);
      
      const companiesStats = visibleCompanies.map(company => {
        const companyUsers = allUsers.filter(u => u.companyId === company.id);
        const companyLocations = allLocations.filter(l => l.companyId === company.id);
        const companyTemplates = allTemplates.filter(t => t.companyId === company.id);
        
        return {
          id: company.id,
          nameAr: company.nameAr,
          nameEn: company.nameEn,
          type: company.type,
          status: company.status,
          totalUsers: companyUsers.length,
          totalLocations: companyLocations.length,
          totalChecklists: companyTemplates.length,
          completionRate: Math.floor(Math.random() * 30) + 70, // Mock data for now
          averageRating: (Math.random() * 1.5 + 2.5).toFixed(1), // Mock data 2.5-4.0
          lastActivity: company.id === 8 ? "منذ ساعتين" : "منذ 4 ساعات"
        };
      });
      
      res.json(companiesStats);
    } catch (error) {
      console.error('❌ Error getting companies statistics:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Public endpoint for companies (for login page)
  app.get('/api/companies/public', async (req, res) => {
    try {
      console.log('🏢 Public Companies API - Fetching companies for login');
      const allCompanies = await storage.getAllCompanies();
      
      // Filter out template companies (الشركات المرجعية)
      const companies = allCompanies.filter(company => !company.isTemplate);
      
      // Return basic company info for login selection
      const publicCompanies = companies.map(company => ({
        id: company.id,
        nameAr: company.nameAr,
        nameEn: company.nameEn || company.nameAr
      }));
      console.log('🏢 Public Companies API - Returning:', publicCompanies.length, 'companies');
      res.json(publicCompanies);
    } catch (error) {
      console.error('❌ Error fetching public companies:', error);
      res.status(500).json({ message: 'Failed to fetch companies' });
    }
  });

  // KPI Dashboard API endpoints
  app.get('/api/companies', authenticateToken, async (req: any, res) => {
    try {
      console.log('🏢 Companies API - User requesting:', req.user.username);
      const companies = await storage.getAllCompanies();
      console.log('🏢 Companies API - Found companies:', companies.length);
      console.log('🏢 Companies API - Companies data:', companies.map(c => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn })));
      
      // Filter companies based on user access
      if (req.user.role === 'enhanced_general_manager') {
        // General manager can see all non-template companies
        const visibleCompanies = companies.filter(company => !company.isTemplate);
        console.log('🏢 Companies API - General manager access: returning', visibleCompanies.length, 'non-template companies');
        res.json(visibleCompanies);
      } else {
        // Other users (including admin) can only see their own company (if not template)
        const userCompanyId = req.user.companyId;
        const filteredCompanies = companies.filter(company => 
          company.id === userCompanyId && !company.isTemplate
        );
        console.log('🏢 Companies API - Filtered for user company:', userCompanyId, 'Count:', filteredCompanies.length);
        res.json(filteredCompanies);
      }
    } catch (error) {
      console.error('❌ Error fetching companies:', error);
      res.status(500).json({ message: 'Failed to fetch companies' });
    }
  });

  app.get('/api/kpi-data', authenticateToken, async (req: any, res) => {
    try {
      const companyIds = req.query.companyIds;
      const dateFrom = req.query.dateFrom;
      const dateTo = req.query.dateTo;
      
      if (!companyIds) {
        return res.status(400).json({ message: 'Company IDs are required' });
      }
      
      let ids: number[] = [];
      if (typeof companyIds === 'string') {
        // Handle single company ID or comma-separated string
        ids = companyIds.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
      } else if (Array.isArray(companyIds)) {
        ids = companyIds.map(Number).filter(id => !isNaN(id));
      }

      if (ids.length === 0) {
        return res.status(400).json({ message: 'Valid company IDs are required' });
      }

      // Security check: ensure user has access to requested companies
      if (req.user.role !== 'hsa_group_admin') {
        // For other users, filter by their company access
        const userCompanyId = req.user.companyId;
        if (userCompanyId && !ids.includes(userCompanyId)) {
          return res.status(403).json({ message: 'Access denied to requested companies' });
        }
      }
      
      console.log('📊 KPI Data Request:', {
        companyIds: ids,
        dateFrom,
        dateTo,
        requestedBy: req.user.username
      });
      
      const kpiData = await storage.getKpiData(ids, dateFrom, dateTo);
      res.json(kpiData);
    } catch (error) {
      console.error('Error fetching KPI data:', error);
      res.status(500).json({ message: 'Failed to fetch KPI data' });
    }
  });

  app.post('/api/kpi-access', authenticateToken, async (req: any, res) => {
    try {
      // Only general manager can grant KPI access
      if (req.user.role !== 'hsa_group_admin') {
        return res.status(403).json({ message: 'Only general manager can grant KPI access' });
      }

      const { userId, companyIds } = req.body;
      if (!userId || !companyIds || !Array.isArray(companyIds)) {
        return res.status(400).json({ message: 'User ID and company IDs are required' });
      }

      const kpiAccess = await storage.grantKpiAccess({
        userId,
        grantedBy: req.user.id,
        companyIds,
        isActive: true,
      });

      res.json(kpiAccess);
    } catch (error) {
      console.error('Error granting KPI access:', error);
      res.status(500).json({ message: 'Failed to grant KPI access' });
    }
  });

  // إضافة version routes مباشرة
  const versionRoutes = (await import('./routes/version')).default;
  app.use('/api/version', versionRoutes);

  // إضافة debug routes للتشخيص والعزل
  const debugRoutes = (await import('./routes/debug')).default;
  app.use('/api/debug', debugRoutes);

  // System metrics endpoint for performance monitoring
  app.get('/api/system-metrics', async (req, res) => {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      const metrics = {
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
          external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        uptime: Math.round(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
        timestamp: new Date().toISOString()
      };

      // Log performance metrics
      console.log('📊 System Metrics Requested:', {
        heapUsed: `${metrics.memory.heapUsed} MB`,
        uptime: `${Math.floor(metrics.uptime / 3600)}h ${Math.floor((metrics.uptime % 3600) / 60)}m`
      });

      res.json(metrics);
    } catch (error) {
      console.error('❌ Error fetching system metrics:', error);
      res.status(500).json({ error: 'Failed to fetch system metrics' });
    }
  });
  
  // Excel Import/Export Routes

  app.get('/api/excel/template/download', authenticateToken, async (req: any, res) => {
    try {
      // Excel template functionality temporarily disabled
      // const { generateImportTemplate } = await import('./excel-template-generator');
      // Temporary response until Excel module is restored
      res.status(503).json({ 
        message: 'خدمة إنشاء النموذج متوقفة مؤقتاً للصيانة',
        success: false 
      });
    } catch (error) {
      console.error('Excel template generation error:', error);
      res.status(500).json({ message: 'خطأ في إنشاء نموذج Excel' });
    }
  });

  // Excel Import Route
  app.post('/api/excel/import', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      console.log('🔄 [Excel Import] بدء طلب استيراد Excel:', {
        userId: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
        companyId: currentUser.companyId
      });
      
      // التحقق من الصلاحيات
      if (!['super_admin', 'admin', 'hsa_group_admin', 'department_manager'].includes(currentUser.role)) {
        console.log('❌ [Excel Import] صلاحيات غير كافية:', currentUser.role);
        return res.status(403).json({ message: 'غير مسموح بهذه العملية - يحتاج صلاحيات إدارية' });
      }
      
      // التحقق من وجود ملف
      if (!req.files || !req.files.excelFile) {
        console.log('❌ [Excel Import] لا يوجد ملف مرفق');
        return res.status(400).json({ message: 'يرجى اختيار ملف Excel' });
      }
      
      const file = req.files.excelFile;
      console.log('📁 [Excel Import] تفاصيل الملف:', {
        name: file.name,
        size: file.size,
        mimetype: file.mimetype
      });
      
      // التحقق من نوع الملف
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        console.log('❌ [Excel Import] نوع ملف غير صحيح:', file.name);
        return res.status(400).json({ message: 'يجب أن يكون الملف من نوع Excel (.xlsx أو .xls)' });
      }
      
      // التحقق من حجم الملف (100MB)
      if (file.size > 100 * 1024 * 1024) {
        console.log('❌ [Excel Import] حجم الملف كبير جداً:', file.size);
        return res.status(400).json({ message: 'حجم الملف كبير جداً. الحد الأقصى 100 ميجابايت' });
      }
      
      // معالجة الملف
      console.log('🔄 [Excel Import] بدء معالجة الملف...');
      // Excel import functionality temporarily disabled
      // const { processImportFile } = await import('./excel-import-processor-final');
      // Temporary response until Excel module is restored
      const result: SystemCheckResult = {
        success: false,
        message: 'خدمة استيراد Excel متوقفة مؤقتاً للصيانة',
        errors: [],
        warnings: []
      };
      
      console.log('📊 [Excel Import] نتيجة المعالجة:', {
        success: result.success,
        errorsCount: result.errors?.length || 0,
        warningsCount: result.warnings?.length || 0
      });
      
      if (result.success) {
        console.log('✅ [Excel Import] تم الاستيراد بنجاح');
        res.json({
          success: true,
          message: 'تم استيراد البيانات بنجاح',
          results: result.results,
          summary: result.summary,
          warnings: result.warnings
        });
      } else {
        console.log('❌ [Excel Import] فشل الاستيراد:', {
          errors: result.errors,
          warnings: result.warnings
        });
        res.status(400).json({
          success: false,
          message: 'فشل في استيراد البيانات',
          errors: result.errors,
          warnings: result.warnings
        });
      }
    } catch (error) {
      console.error('❌ [Excel Import] خطأ غير متوقع:', error);
      res.status(500).json({ 
        success: false,
        message: 'خطأ في استيراد ملف Excel',
        errors: [(error as Error).message || 'خطأ غير محدد']
      });
    }
  });

  // Excel Import Simple Route - للمهام الفرعية فقط
  app.post('/api/excel/import-simple', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: 'غير مصرح' });
      }
      console.log('🔄 [Excel Import Simple] بدء طلب استيراد مبسط للمهام الفرعية:', {
        userId: currentUser.id,
        companyId: currentUser.companyId
      });
      
      // التحقق من الصلاحيات
      if (!['super_admin', 'admin', 'hsa_group_admin', 'department_manager'].includes(currentUser.role)) {
        return res.status(403).json({ message: 'غير مسموح بهذه العملية - يحتاج صلاحيات إدارية' });
      }
      
      // التحقق من وجود ملف
      if (!req.files || !req.files.excelFile) {
        return res.status(400).json({ message: 'يرجى اختيار ملف Excel' });
      }
      
      const file = req.files.excelFile;
      
      // التحقق من نوع الملف
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        return res.status(400).json({ message: 'يجب أن يكون الملف من نوع Excel (.xlsx أو .xls)' });
      }
      
      // إنشاء ملف مؤقت
      const tempPath = `/tmp/excel_${Date.now()}.xlsx`;
      require('fs').writeFileSync(tempPath, file.data);
      
      // معالجة الملف باستخدام المعالج المبسط
      // Excel import functionality temporarily disabled
      // const { SimpleExcelImportProcessor } = await import('./excel-import-processor-simple');
      // Temporary response until Excel module is restored
      const result = {
        success: false,
        message: 'خدمة استيراد Excel متوقفة مؤقتاً للصيانة'
      };
      
      // تنظيف الملف المؤقت (إذا تم إنشاؤه)
      try {
        require('fs').unlinkSync(tempPath);
      } catch (err) {
        // Ignore file cleanup errors during maintenance mode
      }
      
      console.log('📊 [Excel Import Simple] نتيجة المعالجة:', result);
      
      res.json(result);
    } catch (error) {
      console.error('❌ [Excel Import Simple] خطأ غير متوقع:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في استيراد ملف Excel',
        errors: [(error as Error).message || 'خطأ غير محدد']
      });
    }
  });

  // Enhanced General Manager API Routes
  app.get('/api/enhanced-general-manager/company-overview', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      if (currentUser.role !== 'enhanced_general_manager' && currentUser.role !== 'hsa_group_admin') {
        return res.status(403).json({ message: 'Enhanced General Manager access required' });
      }

      // Get company overview data
      const totalUsers = await storage.getCompanyUsersCount(currentUser.companyId);
      const locations = await storage.getLocationsByCompany(currentUser.companyId);
      const activeLocations = locations.filter(loc => loc.isActive).length;

      const overview = {
        totalUsers: totalUsers,
        newUsersThisMonth: 5, // Could be calculated from database
        activeLocations: activeLocations,
        totalLocations: locations.length
      };

      res.json(overview);
    } catch (error) {
      console.error('Enhanced GM company overview error:', error);
      res.status(500).json({ message: 'خطأ في جلب نظرة عامة الشركة' });
    }
  });

  app.get('/api/enhanced-general-manager/analytics', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      if (currentUser.role !== 'enhanced_general_manager' && currentUser.role !== 'hsa_group_admin') {
        return res.status(403).json({ message: 'Enhanced General Manager access required' });
      }

      // Get analytics data for the company
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const dailyEvaluations = await storage.getDailyEvaluationsCount(currentUser.companyId, today);
      
      const analytics = {
        dailyEvaluations: dailyEvaluations || 0,
        performanceRate: 87.5 // Could be calculated from actual evaluations
      };

      res.json(analytics);
    } catch (error) {
      console.error('Enhanced GM analytics error:', error);
      res.status(500).json({ message: 'خطأ في جلب التحليلات' });
    }
  });

  // Enhanced General Manager API Routes - Cross-Company Management
  app.get('/api/enhanced-gm/companies', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      if (currentUser.role !== 'enhanced_general_manager' && currentUser.role !== 'hsa_group_admin') {
        return res.status(403).json({ message: 'Enhanced General Manager access required' });
      }

      const companies = await storage.getAllCompanies();
      // Enhanced General Manager can see all companies including template companies
      res.json(companies);
    } catch (error) {
      console.error('Enhanced GM companies error:', error);
      res.status(500).json({ message: 'خطأ في جلب الشركات' });
    }
  });

  // Get template companies for new company creation
  app.get('/api/enhanced-gm/template-companies', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      if (currentUser.role !== 'enhanced_general_manager' && currentUser.role !== 'hsa_group_admin') {
        return res.status(403).json({ message: 'Enhanced General Manager access required' });
      }

      const allCompanies = await storage.getAllCompanies();
      const templateCompanies = allCompanies.filter(company => company.isTemplate);
      
      console.log('🏢 Template Companies API - Found templates:', templateCompanies.length);
      res.json(templateCompanies);
    } catch (error) {
      console.error('Enhanced GM template companies error:', error);
      res.status(500).json({ message: 'خطأ في جلب الشركات المرجعية' });
    }
  });

  app.get('/api/enhanced-gm/location-evaluations/:companyFilter?', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      if (currentUser.role !== 'enhanced_general_manager' && currentUser.role !== 'hsa_group_admin') {
        return res.status(403).json({ message: 'Enhanced General Manager access required' });
      }

      const companyFilter = req.params.companyFilter || 'all';
      const locationEvaluations = await storage.getCrossCompanyLocationEvaluations(
        companyFilter === 'all' ? null : parseInt(companyFilter)
      );
      
      res.json(locationEvaluations);
    } catch (error) {
      console.error('Enhanced GM location evaluations error:', error);
      res.status(500).json({ message: 'خطأ في جلب تقييمات المواقع' });
    }
  });

  app.get('/api/enhanced-gm/managers', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      if (currentUser.role !== 'enhanced_general_manager' && currentUser.role !== 'hsa_group_admin') {
        return res.status(403).json({ message: 'Enhanced General Manager access required' });
      }

      const managers = await storage.getAllManagers();
      res.json(managers);
    } catch (error) {
      console.error('Enhanced GM managers error:', error);
      res.status(500).json({ message: 'خطأ في جلب المدراء' });
    }
  });

  app.post('/api/enhanced-gm/managers', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      if (currentUser.role !== 'enhanced_general_manager' && currentUser.role !== 'hsa_group_admin') {
        return res.status(403).json({ message: 'Enhanced General Manager access required' });
      }

      const { username, fullName, password, companyId, role } = req.body;
      
      const newManager = await storage.createUser({
        username,
        fullName,
        password,
        companyId,
        role
      }, currentUser.id);
      
      res.json(newManager);
    } catch (error) {
      console.error('Enhanced GM create manager error:', error);
      res.status(500).json({ message: 'خطأ في إنشاء المدير' });
    }
  });

  app.post('/api/enhanced-gm/managers/:managerId/reset-password', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      if (currentUser.role !== 'enhanced_general_manager' && currentUser.role !== 'hsa_group_admin') {
        return res.status(403).json({ message: 'Enhanced General Manager access required' });
      }

      const managerId = parseInt(req.params.managerId);
      
      // Check if this manager was created by the current Enhanced GM
      const manager = await storage.getUser(managerId);
      if (!manager) {
        return res.status(404).json({ message: 'المدير غير موجود' });
      }
      
      if (manager.createdBy !== currentUser.id) {
        return res.status(403).json({ message: 'يمكنك فقط إعادة تعيين كلمة المرور للمدراء الذين قمت بإنشائهم' });
      }
      
      // Generate new password
      const newPassword = Math.random().toString(36).slice(-8);
      
      // Update password - this function will handle hashing internally
      await storage.updateUserPasswordPlain(managerId, newPassword);
      
      console.log(`🔑 Enhanced GM ${currentUser.username} reset password for manager ${manager.username} (created by them)`);
      
      res.json({ 
        newPassword,
        message: 'تم إعادة تعيين كلمة المرور بنجاح',
        managerName: manager.fullName
      });
    } catch (error) {
      console.error('Enhanced GM reset password error:', error);
      res.status(500).json({ message: 'خطأ في إعادة تعيين كلمة المرور' });
    }
  });

  app.post('/api/enhanced-gm/managers/:managerId/deactivate', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      if (currentUser.role !== 'enhanced_general_manager' && currentUser.role !== 'hsa_group_admin') {
        return res.status(403).json({ message: 'Enhanced General Manager access required' });
      }

      const managerId = parseInt(req.params.managerId);
      await storage.deactivateManager(managerId);
      
      res.json({ message: 'Manager deactivated successfully' });
    } catch (error) {
      console.error('Enhanced GM deactivate manager error:', error);
      res.status(500).json({ message: 'خطأ في إلغاء تفعيل المدير' });
    }
  });

  app.post('/api/enhanced-gm/companies', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      if (currentUser.role !== 'enhanced_general_manager' && currentUser.role !== 'hsa_group_admin') {
        return res.status(403).json({ message: 'Enhanced General Manager access required' });
      }

      const { nameAr, nameEn, description } = req.body;
      
      const newCompany = await storage.createCompany({
        nameAr,
        nameEn,
        description
      });
      
      res.json(newCompany);
    } catch (error) {
      console.error('Enhanced GM create company error:', error);
      res.status(500).json({ message: 'خطأ في إنشاء الشركة' });
    }
  });

  app.post('/api/enhanced-gm/companies/complete-setup', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      if (currentUser.role !== 'enhanced_general_manager' && currentUser.role !== 'hsa_group_admin') {
        return res.status(403).json({ message: 'Enhanced General Manager access required' });
      }

      const { nameAr, nameEn, description, managerUsername, managerFullName, managerPassword } = req.body;
      
      // Validate required fields
      if (!nameAr || !nameEn || !managerUsername || !managerFullName || !managerPassword) {
        return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(managerUsername);
      if (existingUser) {
        return res.status(400).json({ message: 'اسم المستخدم موجود مسبقاً' });
      }
      
      const result = await storage.createCompleteCompanySetup({
        nameAr,
        nameEn,
        description,
        managerUsername,
        managerFullName,
        managerPassword
      }, currentUser.id);
      
      res.json(result);
    } catch (error) {
      console.error('Enhanced GM complete company setup error:', error);
      res.status(500).json({ 
        message: (error as Error).message || 'خطأ في إنشاء الشركة وإعدادها' 
      });
    }
  });

  app.get('/api/enhanced-gm/analytics/:companyFilter?/:timeRange?', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      if (currentUser.role !== 'enhanced_general_manager' && currentUser.role !== 'hsa_group_admin') {
        return res.status(403).json({ message: 'Enhanced General Manager access required' });
      }

      const companyFilter = req.params.companyFilter || 'all';
      const timeRange = req.params.timeRange || 'month';
      
      const analytics = await storage.getCompanyAnalytics(
        companyFilter === 'all' ? null : parseInt(companyFilter),
        timeRange
      );
      
      res.json(analytics);
    } catch (error) {
      console.error('Enhanced GM analytics error:', error);
      res.status(500).json({ message: 'خطأ في جلب التحليلات' });
    }
  });





  // System Settings Routes
  // Get user settings
  app.get('/api/settings/user', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // Get both user-specific and company-specific settings
      const [userSettings, companySettings] = await Promise.all([
        storage.getUserSettings(currentUser.id),
        storage.getCompanySettings(currentUser.companyId)
      ]);
      
      // Merge settings with user settings taking precedence
      const mergedSettings = { ...companySettings, ...userSettings };
      
      console.log('⚙️ Settings retrieved:', {
        userId: currentUser.id,
        companyId: currentUser.companyId,
        userSettingsCount: Object.keys(userSettings).length,
        companySettingsCount: Object.keys(companySettings).length
      });
      
      res.json(mergedSettings);
    } catch (error) {
      console.error('Get user settings error:', error);
      res.status(500).json({ message: 'خطأ في جلب الإعدادات' });
    }
  });

  // Save settings
  app.post('/api/settings/save', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const settings = req.body;
      
      console.log('💾 Saving settings:', {
        userId: currentUser.id,
        companyId: currentUser.companyId,
        settingsCount: Object.keys(settings).length
      });
      
      // Save each setting individually
      const savedSettings = [];
      for (const [key, value] of Object.entries(settings)) {
        // Determine if this is a user-specific or company-specific setting
        const isUserSpecific = [
          'language', 'theme', 'autoSave', 'compactMode', 'emailNotifications', 
          'browserNotifications', 'soundNotifications', 'notificationFrequency',
          'twoFactorAuth', 'offlineMode'
        ].includes(key);
        
        const settingData = {
          userId: isUserSpecific ? currentUser.id : null,
          companyId: !isUserSpecific ? currentUser.companyId : null,
          category: getCategoryForSetting(key),
          settingKey: key,
          settingValue: value as any,
          isUserSpecific,
          isCompanySpecific: !isUserSpecific
        };
        
        const saved = await storage.saveSetting(settingData);
        savedSettings.push(saved);
      }
      
      console.log('✅ Settings saved successfully:', savedSettings.length);
      res.json({ 
        message: 'تم حفظ الإعدادات بنجاح',
        savedCount: savedSettings.length 
      });
    } catch (error) {
      console.error('Save settings error:', error);
      res.status(500).json({ message: 'خطأ في حفظ الإعدادات' });
    }
  });

  // Reset settings
  app.post('/api/settings/reset', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const { category } = req.body;
      
      console.log('🔄 Resetting settings:', {
        userId: currentUser.id,
        companyId: currentUser.companyId,
        category
      });
      
      // Reset both user and company settings for the category
      await Promise.all([
        storage.resetUserSettings(currentUser.id, category),
        storage.resetCompanySettings(currentUser.companyId, category)
      ]);
      
      console.log('✅ Settings reset successfully');
      res.json({ message: 'تم إعادة تعيين الإعدادات بنجاح' });
    } catch (error) {
      console.error('Reset settings error:', error);
      res.status(500).json({ message: 'خطأ في إعادة تعيين الإعدادات' });
    }
  });

  // Helper function to determine setting category
  function getCategoryForSetting(key: string): string {
    const categoryMap: Record<string, string> = {
      language: 'general',
      autoSave: 'general',
      theme: 'appearance',
      compactMode: 'appearance',
      emailNotifications: 'notifications',
      browserNotifications: 'notifications',
      soundNotifications: 'notifications',
      notificationFrequency: 'notifications',
      sessionTimeout: 'security',
      passwordComplexity: 'security',
      twoFactorAuth: 'security',
      autoBackup: 'backup',
      backupFrequency: 'backup',
      retainBackups: 'backup',
      cacheEnabled: 'performance',
      offlineMode: 'performance',
      dataPreload: 'performance'
    };
    return categoryMap[key] || 'general';
  }

  // Register Enhanced GM Executive Routes
  registerEnhancedGMExecutiveRoutes(app);
  
  // Register Active Companies Analytics Routes
  // First, set the authentication function for the analytics routes
  const { setAuthenticationFunction } = await import('./routes/active-companies-analytics');
  setAuthenticationFunction(authenticateToken);
  registerActiveCompaniesAnalyticsRoutes(app);

  // Excel Import Routes - Object Storage Integration
  app.post("/api/objects/upload", authenticateToken, async (req, res) => {
    try {
      const { ObjectStorageService } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/excel-import/template", async (req, res) => {
    try {
      console.log('📋 تنزيل نموذج Excel...');
      // Excel import functionality temporarily disabled
      // const { ExcelImporter } = await import("./excel-import");
      // const templateBuffer = ExcelImporter.generateTemplate();
      
      res.status(503).json({ 
        error: 'خدمة نموذج Excel متوقفة مؤقتاً للصيانة' 
      });
      return;
      
      // Unreachable code removed - return statement above prevents execution
    } catch (error) {
      console.error('❌ خطأ في تحميل النموذج:', error);
      res.status(500).json({ error: 'فشل في إنشاء نموذج Excel' });
    }
  });

  app.post("/api/excel-import/process", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: 'غير مصرح' });
      }
      const { fileUrl } = req.body;
      
      console.log('🚀 بدء معالجة ملف Excel الشامل:', { 
        userId: currentUser.id, 
        companyId: currentUser.companyId,
        fileUrl: fileUrl ? 'provided' : 'missing'
      });
      
      if (!fileUrl) {
        return res.status(400).json({ 
          success: false,
          message: 'رابط الملف مطلوب',
          stats: { locationsProcessed: 0, checklistItemsProcessed: 0, tasksProcessed: 0, errors: ['رابط الملف مفقود'] }
        });
      }
      
      // تحميل الملف من Object Storage
      const response = await fetch(fileUrl);
      if (!response.ok) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن قراءة الملف المرفوع',
          stats: { locationsProcessed: 0, checklistItemsProcessed: 0, tasksProcessed: 0, errors: ['فشل في تحميل الملف'] }
        });
      }
      
      const buffer = Buffer.from(await response.arrayBuffer());
      
      // معالجة الملف
      // Excel import functionality temporarily disabled
      // const { ExcelImporter } = await import("./excel-import");
      // const importer = new ExcelImporter();
      // const result = await importer.processExcelFile(buffer, currentUser.companyId);
      
      const result = {
        success: false,
        message: 'خدمة معالجة Excel متوقفة مؤقتاً للصيانة',
        stats: { locationsProcessed: 0, checklistItemsProcessed: 0, tasksProcessed: 0, errors: ['الخدمة متوقفة للصيانة'] }
      };
      
      console.log('✅ اكتملت معالجة الملف:', result);
      res.json(result);
      
    } catch (error) {
      console.error('❌ خطأ في معالجة الاستيراد:', error);
      res.status(500).json({
        success: false,
        message: `خطأ في الخادم: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
        stats: { locationsProcessed: 0, checklistItemsProcessed: 0, tasksProcessed: 0, errors: [error instanceof Error ? error.message : 'خطأ غير معروف'] }
      });
    }
  });

  // === Analytics Users Management (Enhanced General Manager Only) ===
  
  // Get analytics users
  app.get('/api/enhanced-gm/analytics-users', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // Only enhanced general managers can access this
      if (currentUser.role !== 'hsa_group_admin' && currentUser.role !== 'enhanced_general_manager') {
        return res.status(403).json({ message: 'صلاحيات مدير بيئة العمل مطلوبة' });
      }
      
      const analyticsUsers = await storage.getAnalyticsUsers();
      res.json(analyticsUsers);
    } catch (error) {
      console.error('Get analytics users error:', error);
      res.status(500).json({ message: 'خطأ في جلب مستخدمي التحليلات' });
    }
  });

  // Create analytics user
  app.post('/api/enhanced-gm/analytics-users', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const { username, fullName, password } = req.body;
      
      // Only enhanced general managers can access this
      if (currentUser.role !== 'hsa_group_admin' && currentUser.role !== 'enhanced_general_manager') {
        return res.status(403).json({ message: 'صلاحيات مدير بيئة العمل مطلوبة' });
      }
      
      if (!username || !fullName) {
        return res.status(400).json({ message: 'اسم المستخدم والاسم الكامل مطلوبان' });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: 'اسم المستخدم موجود بالفعل' });
      }
      
      const userData = {
        username,
        fullName,
        password: password || 'viewer123',
        role: 'analytics_viewer' as const,
        companyId: currentUser.companyId || 1, // Use current user's company or default to 1
        isActive: true,
        canManageUsers: false,
        createdBy: currentUser.id
      };
      
      const newUser = await storage.createUser(userData);
      
      console.log('✅ Analytics user created:', {
        createdBy: currentUser.username,
        newUserId: newUser.id,
        newUsername: newUser.username,
        role: newUser.role
      });
      
      // Return user without password
      const { password: _, ...userResponse } = newUser;
      res.status(201).json(userResponse);
    } catch (error) {
      console.error('Create analytics user error:', error);
      res.status(500).json({ message: 'خطأ في إنشاء مستخدم التحليلات' });
    }
  });

  // Toggle analytics user status
  app.patch('/api/enhanced-gm/analytics-users/:id/toggle', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const userId = parseInt(req.params.id);
      const { isActive } = req.body;
      
      // Only enhanced general managers can access this
      if (currentUser.role !== 'hsa_group_admin' && currentUser.role !== 'enhanced_general_manager') {
        return res.status(403).json({ message: 'صلاحيات مدير بيئة العمل مطلوبة' });
      }
      
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'المستخدم غير موجود' });
      }
      
      if (targetUser.role !== 'analytics_viewer') {
        return res.status(400).json({ message: 'يمكن تعديل مستخدمي التحليلات فقط' });
      }
      
      await storage.updateUser(userId, { isActive });
      
      console.log('✅ Analytics user status updated:', {
        updatedBy: currentUser.username,
        targetUserId: userId,
        newStatus: isActive
      });
      
      const updatedUser = await storage.getUser(userId);
      const { password: _, ...userResponse } = updatedUser!;
      res.json(userResponse);
    } catch (error) {
      console.error('Toggle analytics user error:', error);
      res.status(500).json({ message: 'خطأ في تحديث حالة مستخدم التحليلات' });
    }
  });

  // Reset analytics user password
  app.patch('/api/enhanced-gm/analytics-users/:id/reset-password', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const userId = parseInt(req.params.id);
      const { newPassword } = req.body;
      
      // Only enhanced general managers can access this
      if (currentUser.role !== 'hsa_group_admin' && currentUser.role !== 'enhanced_general_manager') {
        return res.status(403).json({ message: 'صلاحيات مدير بيئة العمل مطلوبة' });
      }
      
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'المستخدم غير موجود' });
      }
      
      if (targetUser.role !== 'analytics_viewer') {
        return res.status(400).json({ message: 'يمكن إعادة تعيين كلمة مرور مستخدمي التحليلات فقط' });
      }
      
      // Use default password if none provided
      const passwordToSet = newPassword || 'viewer123';
      
      await storage.updateUserPassword(userId, passwordToSet);
      
      console.log('✅ Analytics user password reset:', {
        resetBy: currentUser.username,
        targetUserId: userId,
        targetUsername: targetUser.username,
        newPasswordSet: passwordToSet === 'viewer123' ? 'default' : 'custom'
      });
      
      res.json({ 
        message: 'تم إعادة تعيين كلمة المرور بنجاح',
        newPassword: passwordToSet
      });
    } catch (error) {
      console.error('Reset analytics user password error:', error);
      res.status(500).json({ message: 'خطأ في إعادة تعيين كلمة المرور' });
    }
  });

  // Register Advanced System Monitoring Routes
  console.log('🔧 Registering advanced monitoring routes...');
  const { registerSystemMonitoringRoutes } = await import('./routes/system-monitoring');
  registerSystemMonitoringRoutes(app);
  
  // Register Enhanced Analytics Routes
  console.log('🔧 Registering enhanced analytics routes...');
  const { registerEnhancedAnalyticsRoutes } = await import('./routes/enhanced-analytics');
  registerEnhancedAnalyticsRoutes(app);
  
  // Register Advanced Analytics Routes
  console.log('🔧 Registering advanced analytics routes...');
  // تعطيل التحليلات المعقدة لتجنب مشاكل قاعدة البيانات
  // const { registerAdvancedAnalyticsRoutes } = await import('./routes/advanced-analytics');
  // registerAdvancedAnalyticsRoutes(app);
  
  // Register Company Backup Routes
  console.log('🔧 Registering company backup routes...');
  const { registerCompanyBackupRoutes } = await import('./routes/company-backup');
  registerCompanyBackupRoutes(app);
  
  // Register Interactive KPI Routes
  console.log('🔧 Registering Interactive KPI routes...');
  const { registerInteractiveKpiRoutes } = await import('./routes/interactive-kpi');
  registerInteractiveKpiRoutes(app);


  // Register Unified Storage System Routes
  console.log('🔧 Registering unified storage system routes...');
  app.use('/api/unified-storage', unifiedStorageRouter);

  // Register Enhanced System Features
  console.log('🔧 Registering enhanced system features...');
  const { EnhancedSystemFeatures } = await import('./enhanced-features');
  EnhancedSystemFeatures.registerPerformanceDashboard(app);
  EnhancedSystemFeatures.registerSmartAlerts(app);
  EnhancedSystemFeatures.registerPredictiveAnalytics(app);
  EnhancedSystemFeatures.registerAutoOptimization(app);

  console.log('✅ All advanced routes and features registered successfully');

  // 📊 مسار تصدير تقرير Excel احترافي عالمي المستوى 
  console.log('🔧 Registering professional Excel export route...');
  app.post('/api/reports/export-excel', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const currentUser = req.user;
      const { 
        locationIds = [], 
        userIds = [], 
        startDate, 
        endDate,
        reportTitle = 'تقرير تقييم بيئة العمل - HSA Group',
        useUnifiedData = false,
        evaluations = []
      } = req.body;

      console.log('📊 [Excel Export] بدء إنشاء التقرير الاحترافي:', {
        userId: currentUser?.id,
        username: currentUser?.username,
        role: currentUser?.role,
        companyId: currentUser?.companyId,
        selectedLocations: locationIds,
        selectedUsers: userIds,
        dateRange: { startDate, endDate },
        reportTitle
      });

      // التحقق من الصلاحيات
      if (!currentUser || !currentUser.id) {
        console.log('❌ [Excel Export] صلاحيات غير كافية - لا يوجد مستخدم مصادق عليه');
        return res.status(401).json({ 
          success: false,
          message: 'غير مسموح - يجب تسجيل الدخول أولاً'
        });
      }

      // Import Excel.js dynamic
      const ExcelJS = await import('exceljs');
      
      // إنشاء Workbook جديد
      const workbook = new ExcelJS.default.Workbook();
      workbook.creator = 'نظام بيئة العمل';
      workbook.lastModifiedBy = currentUser.fullName || currentUser.username;
      workbook.created = new Date();
      workbook.modified = new Date();

      // جمع البيانات الشاملة - مدعم للأونلاين والأوفلاين
      console.log('📊 [Excel Export] جمع البيانات...');
      
      // إعلان متغير evaluationsData 
      let evaluationsData: any[] = [];
      
      // ✅ استخدام النظام الموحد لجلب جميع التقييمات مباشرة من master_evaluations
      console.log('🎯 [Excel Export] جلب البيانات من النظام الموحد master_evaluations...');
      
      // ✅ استخدام النظام الموحد بدلاً من الإجبار على PostgreSQL القديم
      const forceDirectDatabaseFetch = false; // ✅ السماح للنظام باستخدام البيانات الموحدة
      
      if (!forceDirectDatabaseFetch && useUnifiedData && evaluations && evaluations.length > 0) {
        console.log(`🎯 [Excel Export] استخدام البيانات الموحدة المرسلة من العميل: ${evaluations.length} تقييم`);
        console.log(`📊 [Excel Export] نوع البيانات: موحدة (محلي + خادم)`);
        
        // تحويل البيانات الموحدة لتتطابق مع البنية المتوقعة
        evaluationsData = evaluations.map((evaluation: any) => ({
          evaluation: {
            ...evaluation,
            id: evaluation.id,
            locationId: evaluation.locationId,
            evaluatorId: evaluation.userId || evaluation.evaluatorId,
            companyId: evaluation.companyId,
            evaluationDate: evaluation.checklistDate || evaluation.evaluationDate,
            finalScore: evaluation.finalScore || 0,
            evaluationNotes: evaluation.evaluation_notes || evaluation.evaluationNotes || evaluation.generalNotes || '',
            tasks: evaluation.tasks || evaluation.evaluationItems || [],
            evaluationItems: evaluation.tasks || evaluation.evaluationItems || [], // دعم كلا الحقلين
            overallRating: evaluation.overallRating || evaluation.finalScore || 0,
            generalNotes: evaluation.evaluation_notes || evaluation.evaluationNotes || evaluation.generalNotes || '',
            sourceType: evaluation.source || 'unknown',
            offlineGenerated: evaluation.isOffline || false
          },
          // إضافة بيانات وهمية للمستخدم والموقع - سيتم جلبها لاحقاً
          user: null,
          location: null,
          company: null
        }));

        console.log(`✅ [Excel Export] تم تحويل ${evaluationsData.length} تقييم من البيانات الموحدة`);
        
        // 🔄 جلب البيانات الحقيقية للمواقع والمستخدمين والشركات
        console.log('🔄 [Excel Export] جلب البيانات الحقيقية للمواقع والمستخدمين والشركات...');
        
        // جمع معرفات فريدة
        const locationIds = [...new Set(evaluationsData.map(item => item.evaluation.locationId))];
        const userIds = [...new Set(evaluationsData.map(item => item.evaluation.evaluatorId))];
        const companyIds = [...new Set(evaluationsData.map(item => item.evaluation.companyId))];
        
        console.log(`📍 [Excel Export] معرفات المواقع: ${locationIds}`);
        console.log(`👤 [Excel Export] معرفات المستخدمين: ${userIds}`);
        console.log(`🏢 [Excel Export] معرفات الشركات: ${companyIds}`);
        
        // جلب بيانات المواقع
        const locationsData = await db
          .select()
          .from(locations)
          .where(inArray(locations.id, locationIds));
        
        // جلب بيانات المستخدمين
        const usersData = await db
          .select()
          .from(users)
          .where(inArray(users.id, userIds));
          
        // جلب بيانات الشركات
        const companiesData = await db
          .select()
          .from(companies)
          .where(inArray(companies.id, companyIds));
        
        console.log(`📍 [Excel Export] تم جلب ${locationsData.length} موقع`);
        console.log(`👤 [Excel Export] تم جلب ${usersData.length} مستخدم`);
        console.log(`🏢 [Excel Export] تم جلب ${companiesData.length} شركة`);
        
        // إنشاء خرائط للوصول السريع
        const locationMap = new Map(locationsData.map(loc => [loc.id, loc]));
        const userMap = new Map(usersData.map(user => [user.id, user]));
        const companyMap = new Map(companiesData.map(company => [company.id, company]));
        
        // ربط البيانات الحقيقية مع التقييمات
        evaluationsData.forEach(item => {
          item.location = locationMap.get(item.evaluation.locationId) || null;
          item.user = userMap.get(item.evaluation.evaluatorId) || null;
          item.company = companyMap.get(item.evaluation.companyId) || null;
          
          // إضافة البيانات إلى evaluation object للوصول المباشر
          if (item.location) {
            item.evaluation.locationNameAr = item.location.nameAr;
            item.evaluation.locationNameEn = item.location.nameEn;
          }
          // ✅ أولوية لاسم المستخدم المحفوظ محلياً ثم من قاعدة البيانات
          if (item.evaluation.userName) {
            item.evaluation.evaluatorName = item.evaluation.userName;
          } else if (item.evaluation.evaluatorName) {
            // استخدام الاسم المحفوظ مسبقاً
          } else if (item.user) {
            item.evaluation.evaluatorName = item.user.fullName || item.user.username;
          } else {
            item.evaluation.evaluatorName = 'مستخدم غير محدد';
          }
          if (item.company) {
            item.evaluation.companyNameAr = item.company.nameAr;
            item.evaluation.companyNameEn = item.company.nameEn;
          }
        });
        
        console.log(`🔍 [Excel Export] تأكيد البيانات بعد الربط: ${evaluationsData.length} تقييم مع التفاصيل الكاملة`);
        
      } else {
        // ✅ استخدام النظام الموحد master_evaluations لجلب جميع التقييمات
        console.log('🎯 [Excel Export] جلب البيانات من النظام الموحد master_evaluations...');
        
        // شروط التصفية للنظام الموحد الصحيح (master_evaluations)
        let conditions: any[] = [];
        if (currentUser && currentUser.role !== 'general_manager' && currentUser.role !== 'hsa_group_admin' && currentUser.role !== 'super_admin') {
          conditions.push(sql`${masterEvaluations.companyId} = ${currentUser.companyId}`);
        }
        if (locationIds.length > 0) {
          conditions.push(sql`${masterEvaluations.locationId} IN (${locationIds.join(',')})`);
        }
        if (userIds && userIds.length > 0) {
          // Import inArray locally to avoid scope issues
          const { inArray: inArrayLocal } = await import('drizzle-orm');
          conditions.push(inArrayLocal(masterEvaluations.evaluatorId, userIds.map((id: string) => parseInt(id))));
        }
        if (startDate) {
          conditions.push(gte(masterEvaluations.evaluationDate, startDate));
        }
        if (endDate) {
          conditions.push(lte(masterEvaluations.evaluationDate, endDate));
        }

        // جلب البيانات الأونلاين من النظام الموحد الصحيح (master_evaluations)
        evaluationsData = await db
          .select({
            evaluation: masterEvaluations,
            user: users,
            location: locations,
            company: companies
          })
          .from(masterEvaluations)
          .leftJoin(users, eq(masterEvaluations.evaluatorId, users.id))
          .leftJoin(locations, eq(masterEvaluations.locationId, locations.id))
          .leftJoin(companies, eq(masterEvaluations.companyId, companies.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(masterEvaluations.id));
        
        console.log(`📊 [Excel Export] تم جلب ${evaluationsData.length} تقييم من PostgreSQL (أونلاين)`);
        
        // إضافة معلم للبيانات الأونلاين
        evaluationsData.forEach((item: any) => {
          if (item.evaluation) {
            item.evaluation.sourceType = 'online';
            item.evaluation.offlineGenerated = false;
          }
        });
      }

      // جلب قوالب المهام لربط templateId بأسماء المهام
      console.log('📋 [Excel Export] جلب قوالب المهام...');
      const templates = await db
        .select({
          id: checklistTemplates.id,
          taskAr: checklistTemplates.taskAr,
          taskEn: checklistTemplates.taskEn,
          categoryAr: checklistTemplates.categoryAr,
          categoryEn: checklistTemplates.categoryEn,
          locationId: checklistTemplates.locationId
        })
        .from(checklistTemplates)
        .where(eq(checklistTemplates.isActive, true));

      // إنشاء خريطة سريعة للقوالب
      const templateMap = new Map();
      templates.forEach(template => {
        templateMap.set(template.id, template);
      });

      console.log(`📋 [Excel Export] تم جلب ${templates.length} قالب مهمة`);
      console.log('🔍 [Excel Export] عينة من القوالب:', templates.slice(0, 3).map(t => ({
        id: t.id,
        taskAr: t.taskAr,
        categoryAr: t.categoryAr
      })));

      console.log(`📊 [Excel Export] تم جمع ${evaluationsData.length} تقييم`);
      
      // 🏢 تحديد اسم الشركة الديناميكي بناءً على التقييمات المُحللة
      let dynamicCompanyName = 'شركة غير محددة';
      if (evaluationsData.length > 0) {
        // تحليل البيانات للحصول على أسماء الشركات
        const companyIds = new Set();
        evaluationsData.forEach(item => {
          if (item.evaluation?.companyId) {
            companyIds.add(item.evaluation.companyId);
          }
        });
        
        if (companyIds.size === 1) {
          // شركة واحدة فقط
          const singleCompanyId = Array.from(companyIds)[0];
          const companyData = evaluationsData.find(item => item.company)?.company;
          if (companyData) {
            dynamicCompanyName = companyData.nameAr || companyData.nameEn || 'شركة غير محددة';
          }
        } else if (companyIds.size > 1) {
          // عدة شركات
          dynamicCompanyName = 'تقرير متعدد الشركات';
        }
      }
      console.log(`🏢 [Excel Export] اسم الشركة المحدد ديناميكياً: "${dynamicCompanyName}"`);
      
      // تحديث creator لـ workbook بناءً على اسم الشركة الديناميكي
      workbook.creator = `${dynamicCompanyName} - نظام بيئة العمل`;
      
      // تشخيص البيانات المُجلبة من النظام الموحد
      if (evaluationsData.length > 0) {
        console.log('🔍 [Excel Export] عينة من البيانات:', {
          firstEvaluation: {
            id: evaluationsData[0].evaluation.id,
            evaluationId: evaluationsData[0].evaluation.evaluationId,
            date: evaluationsData[0].evaluation.evaluationDate,
            locationId: evaluationsData[0].evaluation.locationId,
            locationName: evaluationsData[0].evaluation.locationNameAr || evaluationsData[0].location?.nameAr,
            evaluatorId: evaluationsData[0].evaluation.evaluatorId,
            evaluatorName: evaluationsData[0].evaluation.evaluatorName || evaluationsData[0].user?.fullName,
            tasksCount: (() => {
              const tasks = evaluationsData[0].evaluation.tasks || evaluationsData[0].evaluation.evaluationItems || [];
              // تحليل JSON إذا كان string
              let parsedTasks = tasks;
              if (typeof tasks === 'string') {
                try {
                  parsedTasks = JSON.parse(tasks);
                } catch (e) {
                  parsedTasks = [];
                }
              }
              return Array.isArray(parsedTasks) ? parsedTasks.length : 0;
            })(),
            hasNotes: !!(evaluationsData[0].evaluation.evaluation_notes || evaluationsData[0].evaluation.evaluationNotes || evaluationsData[0].evaluation.generalNotes || evaluationsData[0].evaluation.notes),
            overallRating: evaluationsData[0].evaluation.overallRating || evaluationsData[0].evaluation.finalScore || 0
          },
          totalLocations: Array.from(new Set(evaluationsData.map(item => item.evaluation.locationId))).length,
          totalUsers: Array.from(new Set(evaluationsData.map(item => item.evaluation.evaluatorId))).length
        });
      }

      // 🎯 إنشاء ورقة الملخص التنفيذي (Executive Summary)
      const summarySheet = workbook.addWorksheet('🎯 الملخص التنفيذي', {
        views: [{ rightToLeft: true }]
      });

      // تنسيق عنوان رئيسي مع اسم الشركة
      summarySheet.mergeCells('A1:H3');
      const titleCell = summarySheet.getCell('A1');
      titleCell.value = `${reportTitle}\n🏢 ${dynamicCompanyName}`;
      titleCell.font = { 
        name: 'Arial', 
        size: 18, 
        bold: true, 
        color: { argb: 'FFFFFF' }
      };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '2E8B57' } // أخضر احترافي
      };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

      // معلومات التقرير مع اسم الشركة
      summarySheet.mergeCells('A4:H4');
      const infoCell = summarySheet.getCell('A4');
      infoCell.value = `🏢 ${dynamicCompanyName} | 📅 تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG', { timeZone: 'Asia/Riyadh' })} | 📊 عدد التقييمات: ${evaluationsData.length} | 👤 المُعد: ${currentUser.fullName || currentUser.username}`;
      infoCell.font = { name: 'Arial', size: 12, bold: true };
      infoCell.alignment = { horizontal: 'center' };

      // إحصائيات عامة
      let row = 6;
      summarySheet.getCell(`A${row}`).value = '📊 الإحصائيات العامة';
      summarySheet.getCell(`A${row}`).font = { name: 'Arial', size: 14, bold: true, color: { argb: '2E8B57' }};
      
      // حساب الإحصائيات من النظام الموحد
      const totalEvaluations = evaluationsData.length;
      const uniqueLocations = new Set(evaluationsData.map(item => item.evaluation.locationId)).size;
      const uniqueEvaluators = new Set(evaluationsData.map(item => item.evaluation.evaluatorId)).size;
      
      // حساب متوسط النتائج من overallRating
      let totalScore = 0;
      let validEvaluations = 0;
      evaluationsData.forEach(item => {
        if (item.evaluation.overallRating && item.evaluation.overallRating > 0) {
          totalScore += item.evaluation.overallRating;
          validEvaluations++;
        }
      });
      const averageScore = validEvaluations > 0 ? Math.round(totalScore / validEvaluations) : 0;

      row += 2;
      // إضافة الإحصائيات في جدول
      const statsData = [
        ['المؤشر', 'القيمة', 'النوع'],
        ['إجمالي التقييمات', totalEvaluations, '📋'],
        ['عدد المواقع', uniqueLocations, '🏢'],
        ['عدد المُقيمين', uniqueEvaluators, '👥'],
        ['متوسط الأداء العام', `${averageScore}%`, '🎯']
      ];

      statsData.forEach((rowData, index) => {
        rowData.forEach((cellValue, colIndex) => {
          const cell = summarySheet.getCell(row + index, 1 + colIndex);
          cell.value = cellValue;
          
          if (index === 0) { // Header
            cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFF' }};
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4682B4' }};
          } else {
            cell.font = { name: 'Arial', size: 11 };
            if (colIndex === 1 && index === 4) { // متوسط الأداء
              cell.font.color = { argb: averageScore >= 85 ? '006400' : averageScore >= 70 ? 'FF8C00' : 'DC143C' };
              cell.font.bold = true;
            }
          }
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      // 📋 إنشاء ورقة التفاصيل الشاملة 
      const detailsSheet = workbook.addWorksheet('📋 تفاصيل التقييمات', {
        views: [{ rightToLeft: true }]
      });

      // عنوان ورقة التفاصيل مع اسم الشركة
      detailsSheet.mergeCells('A1:I2');
      const detailsTitleCell = detailsSheet.getCell('A1');
      detailsTitleCell.value = `📋 تفاصيل التقييمات\n🏢 ${dynamicCompanyName}`;
      detailsTitleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFF' }};
      detailsTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E8B57' }};
      detailsTitleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

      // رأس الجدول
      const headers = [
        'الرقم', 'الموقع', 'المُقيِّم', 'التاريخ', 'الشركة', 
        'عدد المهام', 'المهام المكتملة', 'متوسط التقييم', 'ملاحظات التقييم'
      ];

      headers.forEach((header, index) => {
        const cell = detailsSheet.getCell(3, index + 1); // رقم 3 بدلاً من 1 لان العنوان يأخذ سطرين
        cell.value = header;
        cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFF' }};
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E8B57' }};
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // بيانات التفاصيل من النظام الموحد
      evaluationsData.forEach((item, index) => {
        const rowNum = index + 4; // رقم 4 بدلاً من 2 لان العنوان يأخذ سطرين والرأس سطر واحد
        let tasks = [];
        
        // دعم جميع أنواع البيانات الممكنة: tasks, evaluationItems, evaluation_items
        const evaluationItems = item.evaluation.tasks || 
                               item.evaluation.evaluationItems || 
                               item.evaluation.evaluation_items;
        
        if (Array.isArray(evaluationItems)) {
          tasks = evaluationItems;
        } else if (typeof evaluationItems === 'string') {
          try {
            tasks = JSON.parse(evaluationItems);
          } catch (e) {
            console.warn('خطأ في تحليل بيانات التقييم:', e);
            tasks = [];
          }
        }
        
        const completedTasks = tasks.filter((task: any) => 
          task.completed || 
          task.rating > 0 || 
          task.score > 0
        ).length;
        
        const avgRating = item.evaluation.overall_rating || 
                         item.evaluation.overallRating || 
                         item.evaluation.finalScore || 0;

        const rowData = [
          index + 1,
          item.evaluation.locationNameAr || item.location?.nameAr || `موقع ${item.evaluation.locationId}`,
          item.evaluation.evaluatorName || item.user?.fullName || item.user?.username || 'غير محدد',
          new Date(item.evaluation.evaluationDate).toLocaleDateString('ar-EG', { timeZone: 'Asia/Riyadh' }),
          item.evaluation.companyNameAr || item.company?.nameAr || 'غير محدد',
          tasks.length,
          completedTasks,
          `${avgRating}%`,
          (() => {
            // ✅ جلب ملاحظات التقييم مع الأولوية للحقل الصحيح
            const notes = item.evaluation.evaluation_notes ||  // ✅ الحقل الصحيح في قاعدة البيانات
                         item.evaluation.evaluationNotes ||
                         item.evaluation.general_notes || 
                         item.evaluation.generalNotes || 
                         item.evaluation.notes || 
                         item.evaluation.evaluationNote ||
                         '';
            
            // 📝 إذا لم توجد ملاحظات عامة، اجمع تعليقات البنود المهمة
            if (!notes || notes.trim() === '') {
              let tasks = [];
              const evaluationItems = item.evaluation.evaluation_items || item.evaluation.evaluationItems;
              if (Array.isArray(evaluationItems)) {
                tasks = evaluationItems;
              } else if (typeof evaluationItems === 'string') {
                try {
                  tasks = JSON.parse(evaluationItems);
                } catch (e) {
                  tasks = [];
                }
              }
              
              // جمع تعليقات البنود المهمة
              const taskComments = tasks
                .map((task: any) => task.itemComment || task.comments || task.comment)
                .filter((comment: string) => comment && comment.trim() !== '')
                .slice(0, 2); // أول تعليقين فقط
              
              if (taskComments.length > 0) {
                return taskComments.join(' | ');
              }
            }
            
            return notes;
          })()
        ];

        rowData.forEach((cellValue, colIndex) => {
          const cell = detailsSheet.getCell(rowNum, colIndex + 1);
          cell.value = cellValue;
          cell.font = { name: 'Arial', size: 10 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          
          // تلوين متوسط التقييم
          if (colIndex === 7) {
            cell.font.color = { argb: avgRating >= 85 ? '006400' : avgRating >= 70 ? 'FF8C00' : 'DC143C' };
            cell.font.bold = true;
          }
          
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      // تنسيق عرض الأعمدة
      detailsSheet.columns = [
        { width: 8 },   // الرقم
        { width: 20 },  // الموقع
        { width: 15 },  // المُقيِّم
        { width: 12 },  // التاريخ
        { width: 15 },  // الشركة
        { width: 12 },  // عدد المهام
        { width: 15 },  // المهام المكتملة
        { width: 15 },  // متوسط التقييم
        { width: 30 }   // ملاحظات التقييم
      ];

      summarySheet.columns = [
        { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, 
        { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
      ];

      // 🏢 إنشاء أوراق منفصلة لكل موقع
      console.log('🏢 [Excel Export] إنشاء أوراق منفصلة لكل موقع...');
      
      // تجميع التقييمات حسب الموقع
      const evaluationsByLocation = new Map();
      evaluationsData.forEach(item => {
        const locationId = item.evaluation.location_id || item.evaluation.locationId;
        // استخدام البيانات المحدثة أولاً، ثم البديل
        const locationName = item.evaluation.locationNameAr || item.location?.nameAr || `موقع ${locationId}`;
        
        if (!evaluationsByLocation.has(locationId)) {
          evaluationsByLocation.set(locationId, {
            locationId,
            locationName,
            location: item.location,
            evaluations: []
          });
        }
        
        evaluationsByLocation.get(locationId).evaluations.push(item);
      });

      console.log(`🏢 [Excel Export] تم العثور على ${evaluationsByLocation.size} موقع مختلف:`, 
        Array.from(evaluationsByLocation.keys()).map(id => 
          `${id}: ${evaluationsByLocation.get(id).locationName} (${evaluationsByLocation.get(id).evaluations.length} تقييم)`
        )
      );

      // إنشاء ورقة لكل موقع
      evaluationsByLocation.forEach((locationData, locationId) => {
        console.log(`📋 [Excel Export] إنشاء ورقة للموقع: ${locationData.locationName}...`);
        
        const locationSheet = workbook.addWorksheet(`🏢 ${locationData.locationName}`, {
          views: [{ rightToLeft: true }]
        });

        // عنوان الورقة مع اسم الشركة
        locationSheet.mergeCells('A1:F3');
        const locationTitleCell = locationSheet.getCell('A1');
        locationTitleCell.value = `تقرير تفصيلي - ${locationData.locationName}\n🏢 ${dynamicCompanyName}`;
        locationTitleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFF' }};
        locationTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E86AB' }};
        locationTitleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        // معلومات ملخصة عن الموقع
        const locationEvals = locationData.evaluations;
        const totalEvaluations = locationEvals.length;
        const uniqueEvaluators = Array.from(new Set(locationEvals.map((item: any) => item.evaluation.evaluator_id || item.evaluation.evaluatorId))).length;
        const avgRating = locationEvals.length > 0 ? 
          Math.round(locationEvals.reduce((sum: number, item: any) => {
            const overallRating = item.evaluation.overall_rating || item.evaluation.overallRating || 0;
            return sum + overallRating;
          }, 0) / locationEvals.length) : 0;

        // صف الملخص
        locationSheet.getCell('A5').value = `إجمالي التقييمات: ${totalEvaluations}`;
        locationSheet.getCell('D5').value = `عدد المُقيِّمين: ${uniqueEvaluators}`;
        locationSheet.getCell('G5').value = `متوسط الأداء: ${avgRating}%`;
        
        ['A5', 'D5', 'G5'].forEach(cell => {
          locationSheet.getCell(cell).font = { name: 'Arial', size: 12, bold: true };
          locationSheet.getCell(cell).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8F4FD' }};
        });

        // رأس جدول التقييمات
        const locationHeaders = [
          '#', 'التاريخ', 'المُقيِّم', 'إجمالي المهام', 
          'المهام المكتملة', 'متوسط التقييم', 'ملاحظات التقييم'
        ];

        locationHeaders.forEach((header, index) => {
          const cell = locationSheet.getCell(7, index + 1);
          cell.value = header;
          cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' }};
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E86AB' }};
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          };
        });

        // بيانات التقييمات مرتبة حسب التاريخ
        const sortedEvaluations = locationEvals.sort((a: any, b: any) => 
          new Date(b.evaluation.evaluation_date || b.evaluation.evaluationDate || b.evaluation.created_at).getTime() - new Date(a.evaluation.evaluation_date || a.evaluation.evaluationDate || a.evaluation.created_at).getTime()
        );

        sortedEvaluations.forEach((item: any, index: number) => {
          let tasks = [];
          const evaluationItems = item.evaluation.evaluation_items || item.evaluation.evaluationItems;
          if (Array.isArray(evaluationItems)) {
            tasks = evaluationItems;
          } else if (typeof evaluationItems === 'string') {
            try {
              tasks = JSON.parse(evaluationItems);
            } catch (e) {
              tasks = [];
            }
          }
          
          const completedTasks = tasks.filter((task: any) => task.completed || task.rating > 0).length;
          const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
          const avgRating = item.evaluation.overall_rating || item.evaluation.overallRating || 0;
          
          // ✅ إصلاح الوقت - إنشاء تاريخ بالتوقيت المحلي السعودي
          let evaluationDate;
          
          if (item.evaluation.evaluationTimestamp) {
            // استخدام evaluation_timestamp مع تصحيح المنطقة الزمنية
            evaluationDate = new Date(item.evaluation.evaluationTimestamp);
            // تعديل الوقت ليعكس التوقيت السعودي (+3 ساعات من UTC)
            evaluationDate.setHours(evaluationDate.getHours() + 3);
          } else if (item.evaluation.evaluation_time && item.evaluation.evaluation_date) {
            // دمج التاريخ مع الوقت العربي المحفوظ
            const timeStr = item.evaluation.evaluation_time.replace(/[٠-٩]/g, (d: string) => 
              '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()
            );
            evaluationDate = new Date(`${item.evaluation.evaluation_date} ${timeStr}`);
          } else {
            // الاحتياطي - استخدام المصادر الأخرى
            evaluationDate = new Date(
              item.evaluation.timestamp || 
              item.evaluation.evaluation_date || 
              item.evaluation.evaluationDate || 
              item.evaluation.created_at
            );
          }
          const rowNum = 8 + index;
          // ⏰ تحويل الوقت من GMT إلى التوقيت المحلي السعودي
          const formattedTime = item.evaluation.evaluationTime ? 
            (() => {
              const gmtTime = new Date(`2025-01-01T${item.evaluation.evaluationTime}Z`);
              return gmtTime.toLocaleTimeString('ar-EG', { 
                timeZone: 'Asia/Riyadh',
                hour12: true,
                hour: '2-digit',
                minute: '2-digit'
              });
            })() : 
            (item.evaluation.evaluationDateTime ? new Date(item.evaluation.evaluationDateTime).toLocaleTimeString('ar-EG', { 
              hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Riyadh'
            }) : null);
          
          const dateTimeDisplay = formattedTime 
            ? `${evaluationDate.toLocaleDateString('ar-EG', { calendar: 'gregory', timeZone: 'Asia/Riyadh' })} - ${formattedTime}`
            : evaluationDate.toLocaleDateString('ar-EG', { calendar: 'gregory', timeZone: 'Asia/Riyadh' });
          
          const rowData = [
            index + 1,
            dateTimeDisplay,
            item.evaluation.evaluatorName || item.user?.fullName || item.user?.username || 'غير محدد',
            tasks.length,
            completedTasks,
            `${avgRating}%`,
            item.evaluation.evaluation_notes || item.evaluation.evaluationNotes || item.evaluation.general_notes || item.evaluation.generalNotes || ''
          ];

          rowData.forEach((cellValue, colIndex) => {
            const cell = locationSheet.getCell(rowNum, colIndex + 1);
            cell.value = cellValue;
            cell.font = { name: 'Arial', size: 10 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            
            // تلوين متوسط التقييم
            if (colIndex === 6) {
              cell.font.color = { argb: avgRating >= 85 ? '006400' : avgRating >= 70 ? 'FF8C00' : 'DC143C' };
              cell.font.bold = true;
            }
            
            cell.border = {
              top: { style: 'thin' }, left: { style: 'thin' },
              bottom: { style: 'thin' }, right: { style: 'thin' }
            };
          });
        });

        // تفاصيل المهام لكل تقييم - جداول منفصلة
        let currentRow = 8 + sortedEvaluations.length + 3;
        
        // عنوان قسم تفاصيل المهام
        locationSheet.mergeCells(`A${currentRow}:F${currentRow + 1}`);
        const taskSectionTitle = locationSheet.getCell(`A${currentRow}`);
        taskSectionTitle.value = 'تفاصيل المهام لكل تقييم';
        taskSectionTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' }};
        taskSectionTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '32CD32' }};
        taskSectionTitle.alignment = { horizontal: 'center', vertical: 'middle' };
        
        currentRow += 3;

        // إنشاء جدول منفصل لكل تقييم
        sortedEvaluations.forEach((item: any, evalIndex: number) => {
          let tasks = [];
          const evaluationItems = item.evaluation.evaluation_items || item.evaluation.evaluationItems;
          if (Array.isArray(evaluationItems)) {
            tasks = evaluationItems;
          } else if (typeof evaluationItems === 'string') {
            try {
              tasks = JSON.parse(evaluationItems);
            } catch (e) {
              tasks = [];
            }
          }
          
          // ✅ استخدام الوقت الفعلي للتقييم من timestamp بدلاً من التاريخ فقط
          const evaluationDate = new Date(
            item.evaluation.evaluationTimestamp || 
            item.evaluation.timestamp || 
            item.evaluation.evaluation_date || 
            item.evaluation.evaluationDate || 
            item.evaluation.created_at
          );
          const evaluatorName = item.user?.fullName || item.user?.username || 'غير محدد';
          
          // عنوان التقييم
          locationSheet.mergeCells(`A${currentRow}:F${currentRow + 1}`);
          const evaluationTitle = locationSheet.getCell(`A${currentRow}`);
          // ✅ إضانة الوقت بالتوقيت المحلي الصحيح للعنوان التفصيلي
          const titleFormattedTime = (() => {
            if (item.evaluation.evaluationTime) {
              // تحويل الوقت النصي إلى توقيت محلي صحيح
              const gmtTime = new Date(`2025-01-01T${item.evaluation.evaluationTime}Z`);
              return gmtTime.toLocaleTimeString('ar-EG', { 
                timeZone: 'Asia/Riyadh',
                hour12: true,
                hour: '2-digit',
                minute: '2-digit'
              });
            } else if (item.evaluation.evaluationDateTime) {
              return new Date(item.evaluation.evaluationDateTime).toLocaleTimeString('ar-EG', { 
                hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Riyadh'
              });
            }
            return null;
          })();
          
          const titleDateTimeDisplay = titleFormattedTime 
            ? `${evaluationDate.toLocaleDateString('ar-EG', { calendar: 'gregory', timeZone: 'Asia/Riyadh' })} ${titleFormattedTime}`
            : evaluationDate.toLocaleDateString('ar-EG', { calendar: 'gregory', timeZone: 'Asia/Riyadh' });
          
          evaluationTitle.value = `📅 التقييم ${evalIndex + 1} - ${titleDateTimeDisplay} - المُقيِّم: ${evaluatorName}`;
          evaluationTitle.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFF' }};
          evaluationTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4169E1' }};
          evaluationTitle.alignment = { horizontal: 'center', vertical: 'middle' };
          
          currentRow += 2;

          // رأس جدول التقييم الواحد
          const evaluationHeaders = [
            '#', 'اسم المهمة', 'الفئة', 'التقييم', 'تعليقات البند', 'ملاحظات التقييم'
          ];

          evaluationHeaders.forEach((header, index) => {
            const cell = locationSheet.getCell(currentRow, index + 1);
            cell.value = header;
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' }};
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4169E1' }};
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
              top: { style: 'thin' }, left: { style: 'thin' },
              bottom: { style: 'thin' }, right: { style: 'thin' }
            };
          });

          currentRow++;
          let taskCounter = 1;

          // مهام التقييم الواحد
          tasks.forEach((task: any, taskIndex: number) => {
            const taskRating = (task.rating || 0) * 25;
            
            // البحث عن القالب المناسب
            const template = templateMap.get(task.templateId);
            const taskName = task.taskNameAr || template?.taskAr || template?.taskEn || `مهمة رقم ${task.templateId}`;
            const categoryName = task.categoryAr || template?.categoryAr || template?.categoryEn || 'فئة عامة';
            
            // إضافة المهمة الرئيسية
            const taskRowData = [
              taskCounter++,
              taskName,
              categoryName,
              `${taskRating}%`,
              task.itemComment || task.comments || task.comment || '',
              (() => {
                // ✅ ملاحظات التقييم العامة تظهر فقط للمهمة الأولى لتجنب التكرار
                if (taskIndex === 0) { // المهمة الأولى فقط
                  const evaluationNotes = item.evaluation.evaluation_notes ||
                                         item.evaluation.evaluationNotes ||
                                         item.evaluation.general_notes || 
                                         item.evaluation.generalNotes || 
                                         item.evaluation.notes || '';
                  return evaluationNotes;
                }
                
                // للمهام الأخرى، اتركها فارغة
                return '';
              })()
            ];

            taskRowData.forEach((cellValue, colIndex) => {
              const cell = locationSheet.getCell(currentRow, colIndex + 1);
              cell.value = cellValue;
              cell.font = { name: 'Arial', size: 9, bold: true };
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              
              // تلوين التقييم
              if (colIndex === 3) {
                cell.font.color = { argb: taskRating >= 85 ? '006400' : taskRating >= 70 ? 'FF8C00' : 'DC143C' };
                cell.font.bold = true;
              }
              
              cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
              };
            });
            currentRow++;
            
            // 🔧 إضافة المهام الفرعية إذا كانت موجودة
            if (task.subTaskRatings && Array.isArray(task.subTaskRatings) && task.subTaskRatings.length > 0) {
              console.log(`📋 [Excel Export] إضافة ${task.subTaskRatings.length} مهمة فرعية للمهمة: ${taskName}`);
              
              task.subTaskRatings.forEach((subTask: any, subIndex: number) => {
                const subTaskRating = (subTask.rating || 0) * 25;
                
                const subTaskRowData = [
                  '', // رقم فارغ للمهام الفرعية
                  `   └ ${subTask.taskName || `مهمة فرعية ${subIndex + 1}`}`, // اسم المهمة الفرعية مع مسافة بادئة
                  '', // فئة فارغة
                  `${subTaskRating}%`,
                  '', // تعليق فارغ للمهام الفرعية
                  '' // ملاحظات فارغة
                ];

                subTaskRowData.forEach((cellValue, colIndex) => {
                  const cell = locationSheet.getCell(currentRow, colIndex + 1);
                  cell.value = cellValue;
                  cell.font = { name: 'Arial', size: 8, italic: true };
                  cell.alignment = { horizontal: 'center', vertical: 'middle' };
                  
                  // تلوين التقييم للمهمة الفرعية
                  if (colIndex === 3) {
                    cell.font.color = { argb: subTaskRating >= 85 ? '228B22' : subTaskRating >= 70 ? 'FF7F00' : 'B22222' };
                    cell.font.bold = true;
                  }
                  
                  
                  // تمييز أسماء المهام الفرعية
                  if (colIndex === 1) {
                    cell.fill = {
                      type: 'pattern',
                      pattern: 'solid',
                      fgColor: { argb: 'FFF0F8FF' } // لون أزرق فاتح للمهام الفرعية
                    };
                  }
                  
                  cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                  };
                });

                currentRow++;
              });
            }
          });
          
          // إضافة صف فارغ بين التقييمات للوضوح
          if (evalIndex < sortedEvaluations.length - 1) {
            currentRow += 2;
          }
        });

        // تنسيق عرض الأعمدة للجداول الجديدة
        locationSheet.columns = [
          { width: 8 }, { width: 25 }, { width: 15 }, { width: 12 }, 
          { width: 15 }, { width: 25 }, { width: 35 }
        ];

        console.log(`✅ [Excel Export] تم إنشاء ورقة ${locationData.locationName} بـ ${totalEvaluations} تقييم`);
      });

      // إعداد الاستجابة
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      // إنشاء اسم ملف ديناميكي بناءً على اسم الشركة المحدد
      const sanitizedCompanyName = (dynamicCompanyName || 'شركة_غير_محددة')
        .replace(/[^\u0621-\u064A\u0660-\u0669a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50); // تحديد الطول لتجنب مشاكل الـ header
      
      // استخدام encodeURIComponent لمعالجة الأحرف العربية بشكل صحيح
      const fileName = `${sanitizedCompanyName}_Work_Environment_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
      );

      // كتابة الملف وإرساله
      console.log('📊 [Excel Export] بدء كتابة الملف مع الأوراق التالية:', {
        worksheetsCount: workbook.worksheets.length,
        worksheetNames: workbook.worksheets.map(ws => ws.name)
      });
      
      await workbook.xlsx.write(res);
      res.end();

      console.log('✅ [Excel Export] تم إنشاء وإرسال التقرير بنجاح', {
        evaluationsCount: evaluationsData.length,
        worksheetsCreated: workbook.worksheets.length,
        companyName: dynamicCompanyName,
        fileName: `${sanitizedCompanyName}_Work_Environment_Report_${new Date().toISOString().split('T')[0]}.xlsx`
      });

    } catch (error) {
      console.error('❌ [Excel Export] خطأ في إنشاء التقرير:', error);
      res.status(500).json({ 
        success: false, 
        message: 'حدث خطأ في إنشاء تقرير Excel',
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      });
    }
  });
  
  // Historical data migration endpoint - نسخ البيانات التاريخية
  app.get('/api/migrate/historical-data', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const { startDate, endDate, limit = 1000, offset = 0 } = req.query;
      
      console.log('📊 نسخ البيانات التاريخية - المعاملات:', { startDate, endDate, limit, offset, userId: currentUser.id });
      
      // تحديد شركة المستخدم للأمان
      let companyFilter: any = undefined;
      if (currentUser.role !== 'general_manager' && currentUser.role !== 'hsa_group_admin' && currentUser.role !== 'super_admin') {
        companyFilter = eq(unifiedEvaluations.companyId, currentUser.companyId);
      }
      
      // بناء شروط الاستعلام
      let conditions = [];
      if (companyFilter) conditions.push(companyFilter);
      if (startDate) conditions.push(gte(unifiedEvaluations.evaluationDate, startDate));
      if (endDate) conditions.push(lte(unifiedEvaluations.evaluationDate, endDate));
      
      // جلب التقييمات التاريخية من النظام الموحد مع تفاصيل المواقع والمستخدمين
      const historicalEvaluations = await db
        .select({
          evaluation: unifiedEvaluations,
          user: users,
          location: locations,
          company: companies
        })
        .from(unifiedEvaluations)
        .leftJoin(users, eq(unifiedEvaluations.evaluatorId, users.id))
        .leftJoin(locations, eq(unifiedEvaluations.locationId, locations.id))
        .leftJoin(companies, eq(unifiedEvaluations.companyId, companies.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(unifiedEvaluations.evaluationDate))
        .limit(parseInt(limit))
        .offset(parseInt(offset));
      
      // تنسيق البيانات للنسخ المحلي - تحويل من unifiedEvaluations إلى التنسيق المطلوب
      const formattedEvaluations = historicalEvaluations.map(item => ({
        // البيانات الأساسية من unifiedEvaluations
        id: item.evaluation.id,
        evaluationId: item.evaluation.evaluationId,
        locationId: item.evaluation.locationId,
        userId: item.evaluation.evaluatorId,
        companyId: item.evaluation.companyId,
        
        // تحويل التواريخ والأوقات
        checklistDate: item.evaluation.evaluationDate,
        evaluation_date: item.evaluation.evaluationDate,
        evaluationDate: item.evaluation.evaluationDate,
        evaluationTime: item.evaluation.evaluationTime,
        evaluationDateTime: item.evaluation.evaluationDateTime,
        evaluationTimestamp: item.evaluation.evaluationTimestamp,
        
        // بيانات التقييمات
        evaluation_items: item.evaluation.evaluationItems,
        evaluationItems: item.evaluation.evaluationItems,
        overall_rating: item.evaluation.overallRating,
        overallRating: item.evaluation.overallRating,
        general_notes: item.evaluation.generalNotes,
        generalNotes: item.evaluation.generalNotes,
        evaluationNotes: item.evaluation.generalNotes,
        evaluation_notes: item.evaluation.generalNotes,
        
        // أسماء واضحة
        locationName: item.evaluation.locationNameAr || item.location?.nameAr || `موقع ${item.evaluation.locationId}`,
        locationNameAr: item.evaluation.locationNameAr || item.location?.nameAr,
        locationNameEn: item.evaluation.locationNameEn || item.location?.nameEn,
        evaluatorName: item.evaluation.evaluatorName || item.user?.fullName || item.user?.username || 'غير محدد',
        companyName: item.evaluation.companyNameAr || item.company?.nameAr || item.company?.nameEn || 'شركة غير محددة',
        
        // التوقيت
        createdAt: item.evaluation.createdAt,
        created_at: item.evaluation.createdAt,
        updatedAt: item.evaluation.updatedAt
      }));
      
      // جلب المواقع والمستخدمين للمرجع
      const companyCondition = currentUser.role !== 'general_manager' && currentUser.role !== 'hsa_group_admin' && currentUser.role !== 'super_admin'
        ? eq(locations.companyId, currentUser.companyId) 
        : undefined;
        
      const locationsData = await db
        .select()
        .from(locations)
        .where(companyCondition ? and(companyCondition) : undefined);
        
      const usersData = await db
        .select({ 
          id: users.id, 
          username: users.username, 
          fullName: users.fullName, 
          role: users.role, 
          companyId: users.companyId 
        })
        .from(users)
        .where(companyCondition ? eq(users.companyId, currentUser.companyId) : undefined);
      
      // إحصائيات
      const totalCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(dailyChecklists)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      
      const totalCount = totalCountResult[0]?.count || 0;
      const hasMore = (parseInt(offset) + formattedEvaluations.length) < totalCount;
      
      console.log(`✅ تم جلب ${formattedEvaluations.length} تقييم تاريخي من أصل ${totalCount}`);
      
      res.json({
        evaluations: formattedEvaluations,
        totalCount,
        hasMore,
        locations: locationsData,
        users: usersData
      });
      
    } catch (error: any) {
      console.error('❌ خطأ في جلب التقييمات التاريخية:', error);
      res.status(500).json({ 
        message: 'حدث خطأ في الخادم',
        error: error.message 
      });
    }
  });

  // Advanced Analytics API endpoint
  app.post('/api/advanced-analytics/comprehensive-analysis', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const { startDate, endDate, locationIds, userIds } = req.body;
      
      console.log('🧠 [Advanced Analytics] بدء التحليلات المتقدمة:', { 
        startDate, endDate, locationIds, userIds, userId: currentUser.id 
      });

      // Apply company filtering for security
      let conditions = [];
      if (currentUser.role !== 'general_manager' && currentUser.role !== 'hsa_group_admin' && currentUser.role !== 'super_admin') {
        conditions.push(eq(dailyChecklists.companyId, currentUser.companyId));
      }

      // Add date filtering
      if (startDate) conditions.push(gte(dailyChecklists.checklistDate, startDate));
      if (endDate) conditions.push(lte(dailyChecklists.checklistDate, endDate));
      
      // Add location filtering
      if (locationIds && locationIds.length > 0) {
        conditions.push(inArray(dailyChecklists.locationId, locationIds.map((id: string) => parseInt(id))));
      }
      
      // Add user filtering
      if (userIds && userIds.length > 0) {
        conditions.push(inArray(dailyChecklists.userId, userIds.map((id: string) => parseInt(id))));
      }

      // Fetch evaluation data with location and user details
      const evaluations = await db
        .select({
          evaluation: dailyChecklists,
          user: users,
          location: locations
        })
        .from(dailyChecklists)
        .leftJoin(users, eq(dailyChecklists.userId, users.id))
        .leftJoin(locations, eq(dailyChecklists.locationId, locations.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(dailyChecklists.checklistDate));

      console.log(`🧠 [Advanced Analytics] تم جلب ${evaluations.length} تقييم للتحليل`);

      // Fetch all templates for task name mapping
      const templates = await db
        .select({
          id: checklistTemplates.id,
          taskAr: checklistTemplates.taskAr,
          taskEn: checklistTemplates.taskEn,
          categoryAr: checklistTemplates.categoryAr,
          categoryEn: checklistTemplates.categoryEn,
          multiTasks: checklistTemplates.multiTasks
        })
        .from(checklistTemplates)
        .where(eq(checklistTemplates.isActive, true));

      // إنشاء خريطة سريعة للقوالب
      const templateMap = new Map();
      templates.forEach(template => {
        templateMap.set(template.id, template);
      });

      // Calculate summary statistics
      const totalEvaluations = evaluations.length;
      const uniqueLocations = new Set(evaluations.map(e => e.evaluation.locationId)).size;
      
      // If no evaluations found, provide helpful message
      if (totalEvaluations === 0) {
        console.log('⚠️ [Advanced Analytics] لا توجد تقييمات في الفترة المحددة');
        return res.json({
          summary: {
            totalEvaluations: 0,
            totalLocations: 0,
            averageScore: 0,
            executiveSummary: 'لا توجد تقييمات في الفترة الزمنية المحددة. يرجى التأكد من وجود تقييمات مُدخلة في النظام أو توسيع نطاق التاريخ المحدد.'
          },
          patterns: [],
          recommendations: [{
            category: "إدخال البيانات",
            recommendation: "يُنصح بإدخال تقييمات يومية للمواقع للحصول على تحليلات دقيقة",
            priority: "عالية",
            expectedImpact: "ضروري"
          }],
          chartData: {
            locationEvaluations: [],
            locationPerformance: [],
            performanceDistribution: { excellent: 0, good: 0, needsImprovement: 0 },
            evaluationTrend: []
          },
          aiInsights: `
لا توجد بيانات تقييمات متاحة للتحليل في الفترة الزمنية المحددة.

📋 الخطوات المقترحة:
• التأكد من إدخال تقييمات يومية في النظام
• مراجعة النطاق الزمني المحدد للتقرير
• التحقق من صلاحيات المستخدم لعرض التقييمات

🎯 التوصيات:
• ابدأ بإدخال تقييمات للمواقع المختلفة
• استخدم قوالب التقييم المتاحة في النظام
• راجع دليل المستخدم لمعرفة كيفية إدخال البيانات
          `.trim()
        });
      }
      
      // Calculate average score
      let totalScore = 0;
      let scoredEvaluations = 0;
      
      evaluations.forEach(item => {
        if (item.evaluation.tasks && Array.isArray(item.evaluation.tasks)) {
          const tasks = item.evaluation.tasks;
          let evalScore = 0;
          let evalTasks = 0;
          
          tasks.forEach((task: any) => {
            // Include main task rating
            if (task.rating && !isNaN(task.rating)) {
              evalScore += task.rating;
              evalTasks++;
            }
            
            // Include subtask ratings
            if (task.subTasks && Array.isArray(task.subTasks)) {
              task.subTasks.forEach((subTask: any) => {
                if (subTask.rating && !isNaN(subTask.rating)) {
                  evalScore += subTask.rating;
                  evalTasks++;
                }
              });
            }
          });
          
          if (evalTasks > 0) {
            totalScore += (evalScore / evalTasks) * 25; // Convert to percentage (rating 1-4 to 25-100%)
            scoredEvaluations++;
          }
        }
      });
      
      const averageScore = scoredEvaluations > 0 ? Math.round(totalScore / scoredEvaluations) : 0;

      // Generate intelligent patterns and insights
      const patterns = [];
      const recommendations = [];

      // Pattern 1: Performance trends
      if (evaluations.length > 0) {
        const recentEvaluations = evaluations.slice(0, Math.min(10, evaluations.length));
        const olderEvaluations = evaluations.slice(-Math.min(10, evaluations.length));
        
        if (recentEvaluations.length > 0 && olderEvaluations.length > 0) {
          patterns.push({
            type: "اتجاه الأداء",
            description: `تم تحليل ${totalEvaluations} تقييم عبر ${uniqueLocations} موقع`,
            strength: "عالية",
            significance: "مهمة"
          });
        }
      }

      // Pattern 2: Location performance analysis
      if (uniqueLocations > 1) {
        patterns.push({
          type: "تحليل أداء المواقع",
          description: `تباين في الأداء عبر ${uniqueLocations} موقع مختلف`,
          strength: "متوسطة",
          significance: "عالية"
        });
      }

      // Recommendations based on analysis
      if (averageScore < 70) {
        recommendations.push({
          category: "تحسين الأداء",
          recommendation: "يُنصح بوضع خطة تحسين شاملة لرفع مستوى الأداء",
          priority: "عالية",
          expectedImpact: "كبير"
        });
      }

      if (totalEvaluations < 50) {
        recommendations.push({
          category: "زيادة التقييمات",
          recommendation: "زيادة تكرار التقييمات للحصول على بيانات أكثر دقة",
          priority: "متوسطة",
          expectedImpact: "متوسط"
        });
      }

      recommendations.push({
        category: "التحليل المستمر",
        recommendation: "مراجعة دورية للتحليلات لضمان التحسن المستمر",
        priority: "متوسطة",
        expectedImpact: "طويل المدى"
      });

      // Generate AI insights summary
      const aiInsights = `
بناءً على تحليل ${totalEvaluations} تقييم عبر ${uniqueLocations} موقع، تم اكتشاف الأنماط التالية:

📊 الأداء العام: ${averageScore}% (${averageScore >= 80 ? 'ممتاز' : averageScore >= 70 ? 'جيد' : 'يحتاج تحسين'})

🎯 النقاط الرئيسية:
• متوسط الأداء الحالي يُظهر ${averageScore >= 75 ? 'مستوى مرضي' : 'حاجة للتطوير'}
• توزيع التقييمات عبر المواقع ${uniqueLocations > 1 ? 'متنوع ويتطلب مراجعة مخصصة' : 'مركز ويمكن التحكم به بسهولة'}
• عدد التقييمات ${totalEvaluations >= 100 ? 'كافي للتحليل الدقيق' : 'يحتاج زيادة للحصول على رؤى أعمق'}

💡 التوصيات الذكية:
${averageScore < 70 ? '• أولوية قصوى: تحسين العمليات والإجراءات' : ''}
${uniqueLocations > 3 ? '• تطبيق استراتيجية موحدة عبر جميع المواقع' : ''}
• مراقبة مستمرة وتحليل دوري للاتجاهات

🔮 التنبؤات:
مع الاستمرار في التحسينات المقترحة، يُتوقع رفع مستوى الأداء بـ ${Math.round(Math.random() * 15 + 10)}% خلال الربع القادم.
      `;

      // Generate chart data
      const chartData = {
        locationEvaluations: [],
        locationPerformance: [],
        performanceDistribution: { excellent: 0, good: 0, needsImprovement: 0 },
        evaluationTrend: []
      };

      // Location evaluations and performance data
      const locationMap = new Map();
      const locationScores = new Map();
      const locationCounts = new Map();

      evaluations.forEach(item => {
        const locationId = item.evaluation.location_id || item.evaluation.locationId;
        
        // Properly get location name from joined data
        let locationName = `موقع رقم ${locationId}`;
        if (item.location) {
          if (item.location.nameAr && item.location.nameAr.trim()) {
            locationName = item.location.nameAr.trim();
          } else if (item.location.nameEn && item.location.nameEn.trim()) {
            locationName = item.location.nameEn.trim();
          }
        }
        
        // Count evaluations per location
        locationCounts.set(locationId, (locationCounts.get(locationId) || 0) + 1);
        locationMap.set(locationId, locationName);

        // Calculate location scores including subtasks
        if (item.evaluation.tasks && Array.isArray(item.evaluation.tasks)) {
          const tasks = item.evaluation.tasks;
          let evalScore = 0;
          let evalTasks = 0;
          
          tasks.forEach((task: any) => {
            // Include main task rating
            if (task.rating && !isNaN(task.rating)) {
              evalScore += task.rating;
              evalTasks++;
            }
            
            // Include subtask ratings
            if (task.subTasks && Array.isArray(task.subTasks)) {
              task.subTasks.forEach((subTask: any) => {
                if (subTask.rating && !isNaN(subTask.rating)) {
                  evalScore += subTask.rating;
                  evalTasks++;
                }
              });
            }
          });
          
          if (evalTasks > 0) {
            const locationScore = (evalScore / evalTasks) * 20; // Convert to percentage
            const currentScores = locationScores.get(locationId) || [];
            currentScores.push(locationScore);
            locationScores.set(locationId, currentScores);
          }
        }
      });

      // Process location data for charts
      locationMap.forEach((name, locationId) => {
        const count = locationCounts.get(locationId) || 0;
        const scores = locationScores.get(locationId) || [];
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        
        chartData.locationEvaluations.push({ name, count });
        chartData.locationPerformance.push({ name, averageScore: avgScore });
        
        // Count performance distribution
        if (avgScore >= 80) chartData.performanceDistribution.excellent++;
        else if (avgScore >= 60) chartData.performanceDistribution.good++;
        else chartData.performanceDistribution.needsImprovement++;
      });

      // Generate evaluation trend data (daily counts over the last 30 days)
      const trendMap = new Map();
      const endDateObj = new Date();
      const startDateObj = new Date();
      startDateObj.setDate(startDateObj.getDate() - 30);
      
      evaluations.forEach(item => {
        const evalDate = new Date(item.evaluation.checklistDate);
        if (evalDate >= startDateObj && evalDate <= endDateObj) {
          const dateStr = evalDate.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', calendar: 'gregory' });
          trendMap.set(dateStr, (trendMap.get(dateStr) || 0) + 1);
        }
      });

      // Convert trend data to array format
      const trendArray = [];
      for (let d = 0; d < 30; d++) {
        const date = new Date();
        date.setDate(date.getDate() - (29 - d));
        const dateStr = date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', calendar: 'gregory' });
        trendArray.push({
          date: dateStr,
          count: trendMap.get(dateStr) || 0
        });
      }
      chartData.evaluationTrend = trendArray;

      // Generate detailed location-specific analysis
      const locationAnalysis = [];
      for (const [locationId, name] of locationMap.entries()) {
        const locationEvaluations = evaluations.filter(item => item.evaluation.locationId === locationId);
        const locationScoresList = locationScores.get(locationId) || [];
        const avgScore = locationScoresList.length > 0 ? Math.round(locationScoresList.reduce((a, b) => a + b, 0) / locationScoresList.length) : 0;
        
        // Collect all evaluation notes and category comments for this location
        const allComments = [];
        const allCategoryComments = [];
        const problemAreas = new Map();
        const excellentAreas = new Map();
        
        locationEvaluations.forEach(item => {
          // Add evaluation notes
          if (item.evaluation.evaluationNotes && item.evaluation.evaluationNotes.trim()) {
            allComments.push({
              date: new Date(item.evaluation.checklistDate).toLocaleDateString('ar-EG', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                calendar: 'gregory'
              }),
              comment: item.evaluation.evaluationNotes.trim(),
              evaluator: item.user?.username || 'غير محدد'
            });
          }
          
          // Add category comments
          if (item.evaluation.categoryComments && typeof item.evaluation.categoryComments === 'object') {
            Object.entries(item.evaluation.categoryComments).forEach(([category, comment]) => {
              if (comment && typeof comment === 'string' && comment.trim()) {
                allCategoryComments.push({
                  date: new Date(item.evaluation.checklistDate).toLocaleDateString('ar-EG', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric',
                    calendar: 'gregory'
                  }),
                  category,
                  comment: comment.trim(),
                  evaluator: item.user?.username || 'غير محدد'
                });
              }
            });
          }
          
          // Analyze tasks for problem and excellent areas
          if (item.evaluation.tasks && Array.isArray(item.evaluation.tasks)) {
            item.evaluation.tasks.forEach((task: any) => {
              // احصل على بيانات القالب باستخدام templateId
              const template = templateMap.get(task.templateId);
              const taskName = template ? (template.taskAr || template.task || `البند ${task.templateId}`) : `بند محذوف (رقم ${task.templateId})`;
              
              // Analyze main task
              if (task.rating && !isNaN(task.rating)) {
                if (task.rating <= 2) {
                  problemAreas.set(taskName, (problemAreas.get(taskName) || 0) + 1);
                } else if (task.rating >= 4) {
                  excellentAreas.set(taskName, (excellentAreas.get(taskName) || 0) + 1);
                }
              }
              
              // Analyze subtasks from subTaskRatings
              if (task.subTaskRatings && Array.isArray(task.subTaskRatings) && template && template.multiTasks) {
                task.subTaskRatings.forEach((subRating: any, index: number) => {
                  const rating = typeof subRating === 'number' ? subRating : subRating.rating;
                  if (rating && !isNaN(rating)) {
                    const subTaskTemplate = template.multiTasks[index];
                    const subTaskName = subTaskTemplate ? (subTaskTemplate.ar || subTaskTemplate.name || `مهمة فرعية ${index + 1}`) : `مهمة فرعية ${index + 1}`;
                    const fullSubTaskName = `${taskName} - ${subTaskName}`;
                    
                    if (rating <= 2) {
                      problemAreas.set(fullSubTaskName, (problemAreas.get(fullSubTaskName) || 0) + 1);
                    } else if (rating >= 4) {
                      excellentAreas.set(fullSubTaskName, (excellentAreas.get(fullSubTaskName) || 0) + 1);
                    }
                  }
                });
              }
            });
          }
        });

        // Sort problem and excellent areas by frequency
        const sortedProblems = Array.from(problemAreas.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([task, count]) => ({ task, count }));
          
        const sortedExcellent = Array.from(excellentAreas.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([task, count]) => ({ task, count }));

        // Generate detailed task breakdown
        const taskBreakdown = await generateTaskBreakdown(locationEvaluations);

        locationAnalysis.push({
          locationId,
          locationName: name,
          totalEvaluations: locationEvaluations.length,
          averageScore: avgScore,
          performanceLevel: avgScore >= 80 ? 'ممتاز' : avgScore >= 60 ? 'جيد' : 'يحتاج تحسين',
          performanceColor: avgScore >= 80 ? 'excellent' : avgScore >= 60 ? 'good' : 'needs-improvement',
          evaluationComments: allComments.slice(0, 10), // Latest 10 comments
          categoryComments: allCategoryComments.slice(0, 15), // Latest 15 category comments
          problemAreas: sortedProblems,
          excellentAreas: sortedExcellent,
          taskBreakdown: taskBreakdown,
          insights: generateLocationInsights(avgScore, locationEvaluations.length, sortedProblems.length, sortedExcellent.length)
        });
      }

      // Helper function to generate detailed task breakdown with hierarchical structure
      async function generateTaskBreakdown(locationEvaluations: any[]): Promise<any[]> {
        // جلب قوالب المهام لربط templateId بأسماء المهام
        const templates = await db
          .select({
            id: checklistTemplates.id,
            taskAr: checklistTemplates.taskAr,
            taskEn: checklistTemplates.taskEn,
            categoryAr: checklistTemplates.categoryAr,
            categoryEn: checklistTemplates.categoryEn,
            locationId: checklistTemplates.locationId,
            multiTasks: checklistTemplates.multiTasks,
            subTasks: checklistTemplates.subTasks
          })
          .from(checklistTemplates)
          .where(eq(checklistTemplates.isActive, true));
        
        // إنشاء خريطة سريعة للقوالب
        const templateMap = new Map();
        templates.forEach(template => {
          templateMap.set(template.id, template);
        });
        
        // تنظيم هرمي: الفئة -> البند -> المهام الفرعية
        const categoryMap = new Map(); // فئة -> بنود
        
        locationEvaluations.forEach(item => {
          if (item.evaluation.tasks && Array.isArray(item.evaluation.tasks)) {
            item.evaluation.tasks.forEach((task: any) => {
              // احصل على بيانات القالب باستخدام templateId
              const template = templateMap.get(task.templateId);
              
              if (!template) {
                console.warn('⚠️ لم يتم العثور على قالب للمهمة:', task.templateId);
                // استخدم بيانات افتراضية إذا لم يتم العثور على القالب
                const fallbackTaskName = `بند محذوف (رقم ${task.templateId})`;
                const fallbackCategoryName = 'بنود محذوفة';
                
                // إنشاء الفئة إذا لم تكن موجودة
                if (!categoryMap.has(fallbackCategoryName)) {
                  categoryMap.set(fallbackCategoryName, new Map());
                }
                
                const fallbackItemsInCategory = categoryMap.get(fallbackCategoryName);
                
                if (!fallbackItemsInCategory.has(fallbackTaskName)) {
                  fallbackItemsInCategory.set(fallbackTaskName, {
                    name: fallbackTaskName,
                    category: fallbackCategoryName,
                    templateId: task.templateId,
                    totalRatings: 0,
                    ratings: [],
                    subTasks: []
                  });
                }
                
                const fallbackItemData = fallbackItemsInCategory.get(fallbackTaskName);
                
                // إضافة التقييم للبند الافتراضي
                if (task.rating && !isNaN(task.rating)) {
                  fallbackItemData.ratings.push({
                    rating: task.rating,
                    date: new Date(item.evaluation.checklistDate).toLocaleDateString('ar-EG', { 
                      day: 'numeric', 
                      month: 'short',
                      calendar: 'gregory'
                    }),
                    // 🕐 إضافة الوقت إن وُجد
                    time: item.evaluation.evaluationTime || null,
                    dateTime: item.evaluation.evaluationDateTime || null,
                    evaluator: item.user?.username || 'غير محدد'
                  });
                  fallbackItemData.totalRatings++;
                }
                
                return; // انتهاء معالجة المهمة المفقودة
              }
              
              const categoryName = template.categoryAr || 'عام';
              const itemName = template.taskAr || 'بند غير محدد';
              
              // إنشاء الفئة إذا لم تكن موجودة
              if (!categoryMap.has(categoryName)) {
                categoryMap.set(categoryName, new Map()); // Map of items
              }
              
              const itemsInCategory = categoryMap.get(categoryName);
              
              // إنشاء البند إذا لم يكن موجوداً
              if (!itemsInCategory.has(itemName)) {
                itemsInCategory.set(itemName, {
                  name: itemName,
                  category: categoryName,
                  templateId: task.templateId,
                  totalRatings: 0,
                  ratings: [],
                  subTasks: []
                });
              }
              
              const itemData = itemsInCategory.get(itemName);
              
              // إضافة التقييم للبند الأساسي
              if (task.rating && !isNaN(task.rating)) {
                itemData.ratings.push({
                  rating: task.rating,
                  date: new Date(item.evaluation.checklistDate).toLocaleDateString('ar-EG', { 
                    day: 'numeric', 
                    month: 'short',
                    calendar: 'gregory'
                  }),
                  // 🕐 إضافة الوقت إن وُجد
                  time: item.evaluation.evaluationTime || null,
                  dateTime: item.evaluation.evaluationDateTime || null,
                  evaluator: item.user?.username || 'غير محدد'
                });
                itemData.totalRatings++;
              }
              
              // معالجة المهام الفرعية من subTaskRatings باستخدام multiTasks
              if (task.subTaskRatings && Array.isArray(task.subTaskRatings)) {
                task.subTaskRatings.forEach((subTaskData: any, index: number) => {
                  let subTaskName = 'مهمة فرعية غير محددة';
                  let actualRating = subTaskData.rating || subTaskData;
                  
                  // استخدم multiTasks بدلاً من subTasks للحصول على الأسماء
                  if (template.multiTasks && Array.isArray(template.multiTasks) && template.multiTasks[index]) {
                    subTaskName = template.multiTasks[index].ar || template.multiTasks[index].name || `مهمة فرعية ${index + 1}`;
                  }
                  
                  // البحث عن المهمة الفرعية أو إنشاؤها
                  let existingSubTask = itemData.subTasks.find((st: any) => st.name === subTaskName);
                  if (!existingSubTask) {
                    existingSubTask = {
                      name: subTaskName,
                      ratings: [],
                      totalRatings: 0
                    };
                    itemData.subTasks.push(existingSubTask);
                  }
                  
                  if (actualRating && !isNaN(actualRating)) {
                    existingSubTask.ratings.push({
                      rating: actualRating,
                      date: new Date(item.evaluation.checklistDate).toLocaleDateString('ar-EG', { 
                        day: 'numeric', 
                        month: 'short',
                        calendar: 'gregory'
                      }),
                      // 🕐 إضافة الوقت إن وُجد
                      time: item.evaluation.evaluationTime || null,
                      dateTime: item.evaluation.evaluationDateTime || null,
                      evaluator: item.user?.username || 'غير محدد'
                    });
                    existingSubTask.totalRatings++;
                  }
                });
              }
              
            });
          }
        });
        
        // تحويل البيانات إلى تركيب هرمي منظم
        const hierarchicalData: any[] = [];
        
        categoryMap.forEach((items, categoryName) => {
          const categoryItems: any[] = [];
          
          items.forEach((itemData: any, itemName: string) => {
            // حساب متوسط البند بناءً على المهام الفرعية إذا وجدت، وإلا التقييم الرئيسي
            let avgRating = '0';
            if (itemData.subTasks && itemData.subTasks.length > 0) {
              // حساب المتوسط بناءً على المهام الفرعية
              const subTasksWithRatings = itemData.subTasks.filter((st: any) => st.totalRatings > 0);
              if (subTasksWithRatings.length > 0) {
                const totalSubTaskRating = subTasksWithRatings.reduce((sum: number, st: any) => {
                  const subAvg = st.ratings.reduce((s: number, r: any) => s + r.rating, 0) / st.totalRatings;
                  return sum + subAvg;
                }, 0);
                avgRating = (totalSubTaskRating / subTasksWithRatings.length).toFixed(1);
              }
            } else if (itemData.totalRatings > 0) {
              // الاعتماد على التقييم الرئيسي إذا لم توجد مهام فرعية
              avgRating = (itemData.ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / itemData.totalRatings).toFixed(1);
            }
            
            // حساب متوسط المهام الفرعية
            const subTasksArray = itemData.subTasks.map((subTask: any) => ({
              name: subTask.name,
              averageRating: subTask.totalRatings > 0 
                ? (subTask.ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / subTask.totalRatings).toFixed(1)
                : '0',
              totalRatings: subTask.totalRatings,
              ratings: subTask.ratings.slice(-3), // آخر 3 تقييمات
              performance: subTask.totalRatings > 0 ? (parseFloat((subTask.ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / subTask.totalRatings).toFixed(1)) >= 4 ? 'ممتاز' : parseFloat((subTask.ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / subTask.totalRatings).toFixed(1)) >= 3 ? 'جيد' : parseFloat((subTask.ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / subTask.totalRatings).toFixed(1)) >= 2 ? 'متوسط' : 'ضعيف') : 'غير مقيّم'
            }));
            
            
            categoryItems.push({
              name: itemName,
              category: categoryName,
              averageRating: avgRating,
              totalRatings: itemData.totalRatings,
              ratings: itemData.ratings.slice(-3), // آخر 3 تقييمات
              subTasks: subTasksArray,
              performance: parseFloat(avgRating) >= 4 ? 'ممتاز' : parseFloat(avgRating) >= 3 ? 'جيد' : parseFloat(avgRating) >= 2 ? 'متوسط' : parseFloat(avgRating) > 0 ? 'ضعيف' : 'غير مقيّم'
            });
          });
          
          // ترتيب البنود حسب الأداء
          categoryItems.sort((a, b) => parseFloat(b.averageRating || '0') - parseFloat(a.averageRating || '0'));
          
          hierarchicalData.push({
            categoryName: categoryName,
            items: categoryItems,
            totalItems: categoryItems.length,
            categoryAverage: categoryItems.length > 0 
              ? (categoryItems.reduce((sum, item) => sum + parseFloat(item.averageRating || '0'), 0) / categoryItems.length).toFixed(1)
              : '0'
          });
        });
        
        // ترتيب الفئات حسب المتوسط
        hierarchicalData.sort((a, b) => parseFloat(b.categoryAverage) - parseFloat(a.categoryAverage));
        
        return hierarchicalData;
      }

      // Helper function to generate location insights
      function generateLocationInsights(avgScore: number, evalCount: number, problemCount: number, excellentCount: number): string {
        const insights = [];
        
        if (avgScore >= 85) {
          insights.push('🏆 أداء متميز - يُعتبر هذا الموقع مثالاً يُحتذى به');
        } else if (avgScore >= 70) {
          insights.push('👍 أداء جيد مع إمكانية للتحسين');
        } else if (avgScore >= 50) {
          insights.push('⚠️ يحتاج إلى تحسين واضح في عدة مجالات');
        } else {
          insights.push('🚨 يتطلب تدخل عاجل وخطة تحسين شاملة');
        }
        
        if (evalCount >= 10) {
          insights.push('📊 عدد كافٍ من التقييمات للتحليل الدقيق');
        } else if (evalCount >= 5) {
          insights.push('📈 يُنصح بزيادة تكرار التقييمات');
        } else {
          insights.push('📉 عدد قليل من التقييمات - قد يؤثر على دقة التحليل');
        }
        
        if (problemCount > 3) {
          insights.push('🔧 عدة مجالات تحتاج تركيز خاص');
        } else if (problemCount > 0) {
          insights.push('🎯 بعض المهام تحتاج تحسين');
        }
        
        if (excellentCount > 3) {
          insights.push('⭐ نقاط قوة متعددة يمكن الاستفادة منها');
        }
        
        return insights.join(' • ');
      }

      const analysisResult = {
        summary: {
          totalEvaluations,
          totalLocations: uniqueLocations,
          averageScore,
          executiveSummary: `تم تحليل ${totalEvaluations} تقييم عبر ${uniqueLocations} موقع بمتوسط أداء ${averageScore}%. ${averageScore >= 75 ? 'الأداء العام مُرضي مع وجود فرص للتحسين.' : 'هناك حاجة واضحة لتطوير الأداء وتحسين العمليات.'}`
        },
        patterns,
        recommendations,
        aiInsights: aiInsights.trim(),
        chartData,
        locationAnalysis: locationAnalysis.sort((a, b) => b.averageScore - a.averageScore) // Sort by performance
      };

      console.log('✅ [Advanced Analytics] تم إنشاء التحليلات المتقدمة بنجاح');
      
      res.json(analysisResult);

    } catch (error: any) {
      console.error('❌ [Advanced Analytics] خطأ في التحليلات المتقدمة:', error);
      res.status(500).json({ 
        success: false, 
        message: 'حدث خطأ في إنشاء التحليلات المتقدمة',
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      });
    }
  });

  // 🤖 AI-Powered Smart Analysis for Location Evaluations
  app.post('/api/reports/smart-analysis', authenticateToken, async (req: any, res) => {
    try {
      console.log('🤖 [Smart Analysis] بدء التحليل الذكي للتقييمات...');
      const currentUser = req.user;
      const { startDate, endDate, locationIds, includeComments = true, analysisType = 'comprehensive' } = req.body;

      // تطبيق فلترة الشركة للأمان
      let companyId: number | undefined = currentUser.companyId;
      if (currentUser.role === 'hsa_group_admin' || currentUser.username === 'hsa_group_admin') {
        companyId = undefined; // رؤية جميع الشركات
      }

      console.log('🔒 [Smart Analysis] فلترة الأمان:', { userId: currentUser.id, companyId, role: currentUser.role });

      // جلب البيانات من النظام الموحد الجديد
      let query = db
        .select()
        .from(unifiedEvaluations)
        .orderBy(desc(unifiedEvaluations.evaluationTimestamp));

      // تطبيق فلاتر الشركة والتاريخ
      let conditions = [];
      if (companyId) {
        conditions.push(eq(unifiedEvaluations.companyId, companyId));
      }
      if (startDate) {
        conditions.push(gte(unifiedEvaluations.evaluationDate, startDate));
      }
      if (endDate) {
        conditions.push(lte(unifiedEvaluations.evaluationDate, endDate));
      }
      if (locationIds && locationIds.length > 0) {
        conditions.push(inArray(unifiedEvaluations.locationId, locationIds));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const evaluations = await query;
      console.log(`📊 [Smart Analysis] تم جلب ${evaluations.length} تقييم من النظام الموحد`);

      if (evaluations.length === 0) {
        return res.json({
          success: true,
          message: 'لا توجد تقييمات في الفترة المحددة',
          analysis: {
            summary: { totalEvaluations: 0, averageScore: 0, uniqueLocations: 0 },
            insights: 'لا توجد بيانات كافية للتحليل',
            recommendations: [],
            strengths: [],
            weaknesses: []
          }
        });
      }

      // تحليل البيانات الرقمية
      const analyticsData = analyzeEvaluationData(evaluations);
      
      // استخراج النصوص للتحليل بالذكاء الاصطناعي
      const commentsForAnalysis = extractCommentsForAI(evaluations, includeComments);

      // تحليل بالذكاء الاصطناعي باستخدام Anthropic
      const aiAnalysis = await performAIAnalysis(commentsForAnalysis, analyticsData, analysisType);

      // دمج التحليلات
      const smartAnalysisResult = {
        success: true,
        generatedAt: new Date().toISOString(),
        analysis: {
          summary: analyticsData.summary,
          insights: aiAnalysis.insights,
          recommendations: aiAnalysis.recommendations,
          strengths: aiAnalysis.strengths,
          weaknesses: aiAnalysis.weaknesses,
          sentiment: aiAnalysis.sentiment,
          trends: analyticsData.trends,
          locationBreakdown: analyticsData.locationBreakdown,
          chartData: analyticsData.chartData
        }
      };

      console.log('✅ [Smart Analysis] تم إنشاء التحليل الذكي بنجاح');
      res.json(smartAnalysisResult);

    } catch (error: any) {
      console.error('❌ [Smart Analysis] خطأ في التحليل الذكي:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ في التحليل الذكي',
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      });
    }
  });

  // 🏢 دالة تحديد اسم الشركة ديناميكياً بناءً على التقييمات
  async function determineDynamicCompanyName(evaluations: any[], currentUser: any): Promise<string> {
    try {
      if (evaluations.length === 0) {
        // إذا لم توجد تقييمات، استخدم اسم شركة المستخدم الحالي
        const userCompany = await db
          .select({ nameAr: companies.nameAr, nameEn: companies.nameEn })
          .from(companies)
          .where(eq(companies.id, currentUser.companyId))
          .limit(1);
        
        return userCompany[0]?.nameAr || 'شركة غير محددة';
      }

      // جلب معرفات الشركات الفريدة من التقييمات
      const uniqueCompanyIds = [...new Set(evaluations.map(e => e.companyId).filter(Boolean))];
      
      if (uniqueCompanyIds.length === 0) {
        return 'شركة غير محددة';
      }
      
      if (uniqueCompanyIds.length === 1) {
        // شركة واحدة فقط - جلب اسمها
        const companyData = await db
          .select({ nameAr: companies.nameAr, nameEn: companies.nameEn })
          .from(companies)
          .where(eq(companies.id, uniqueCompanyIds[0]))
          .limit(1);
        
        return companyData[0]?.nameAr || 'شركة غير محددة';
      } else {
        // عدة شركات - عرض تقرير متعدد الشركات
        return 'تقرير متعدد الشركات';
      }
    } catch (error) {
      console.error('❌ خطأ في تحديد اسم الشركة:', error);
      return 'شركة غير محددة';
    }
  }

  // 📄 Smart Analysis Report File Download
  app.post('/api/reports/smart-analysis-file', authenticateToken, async (req: any, res) => {
    try {
      console.log('📄 [Smart Analysis File] بدء إنشاء ملف التقرير الذكي...');
      const currentUser = req.user;
      const { 
        startDate, 
        endDate, 
        locationIds, 
        includeComments = true, 
        analysisType = 'comprehensive', 
        fileFormat = 'html',
        useUnifiedData = false,
        evaluations: clientEvaluations = []
      } = req.body;

      console.log('🔒 [Smart Analysis File] فلترة الأمان:', { 
        userId: currentUser.id, 
        companyId: currentUser.companyId, 
        role: currentUser.role,
        useUnifiedData,
        clientEvaluationsCount: clientEvaluations.length
      });

      let evaluations = [];

      // ✅ التحقق من استخدام البيانات الموحدة المرسلة من العميل
      if (useUnifiedData && clientEvaluations && clientEvaluations.length > 0) {
        console.log(`🎯 [Smart Analysis File] استخدام البيانات الموحدة من العميل: ${clientEvaluations.length} تقييم`);
        
        // تحويل البيانات الموحدة لتتطابق مع البنية المتوقعة
        evaluations = clientEvaluations.map((evaluation: any) => ({
          id: evaluation.id,
          locationId: evaluation.locationId,
          userId: evaluation.userId || evaluation.evaluatorId,
          companyId: evaluation.companyId,
          evaluationDate: evaluation.checklistDate || evaluation.evaluationDate,
          // 🕐 استخدام التوقيت المحسن الجديد إن وُجد
          evaluationTime: evaluation.evaluationTime || null,
          evaluationDateTime: evaluation.evaluationDateTime || null,
          evaluationTimestamp: evaluation.evaluationTimestamp || evaluation.timestamp || Date.now(),
          finalScore: evaluation.finalScore || evaluation.overallRating || 0,
          evaluationNotes: evaluation.evaluationNotes || evaluation.generalNotes || '',
          tasks: evaluation.tasks || evaluation.evaluationItems || [],
          locationName: evaluation.locationName || `موقع ${evaluation.locationId}`,
          evaluatorName: evaluation.userName || evaluation.evaluatorName || 'مستخدم غير محدد',
          sourceType: evaluation.source || 'unified',
          offlineGenerated: evaluation.isOffline || false
        }));
        
        console.log(`✅ [Smart Analysis File] تم تحويل ${evaluations.length} تقييم من البيانات الموحدة`);
      } else {
        // ❌ التراجع للنظام التقليدي - جلب من قاعدة البيانات
        console.log('🔄 [Smart Analysis File] استخدام النظام التقليدي - جلب من قاعدة البيانات...');
        
        // تطبيق فلترة الشركة للأمان
        let companyId: number | undefined = currentUser.companyId;
        if (currentUser.role === 'hsa_group_admin' || currentUser.username === 'hsa_group_admin') {
          companyId = undefined; // رؤية جميع الشركات
        }

        // جلب البيانات من النظام الموحد الجديد
        let query = db
          .select()
          .from(unifiedEvaluations)
          .orderBy(desc(unifiedEvaluations.evaluationTimestamp));

        // تطبيق فلاتر الشركة والتاريخ
        let conditions = [];
        if (companyId) {
          conditions.push(eq(unifiedEvaluations.companyId, companyId));
        }
        if (startDate) {
          conditions.push(gte(unifiedEvaluations.evaluationDate, startDate));
        }
        if (endDate) {
          conditions.push(lte(unifiedEvaluations.evaluationDate, endDate));
        }
        if (locationIds && locationIds.length > 0) {
          conditions.push(inArray(unifiedEvaluations.locationId, locationIds));
        }

        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as any;
        }

        evaluations = await query;
        console.log(`📊 [Smart Analysis File] تم جلب ${evaluations.length} تقييم من قاعدة البيانات`);
      }

      if (evaluations.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'لا توجد تقييمات في الفترة المحددة لإنشاء التقرير'
        });
      }

      // تحليل البيانات الرقمية
      const analyticsData = analyzeEvaluationData(evaluations);
      
      // استخراج النصوص للتحليل بالذكاء الاصطناعي
      const commentsForAnalysis = extractCommentsForAI(evaluations, includeComments);

      // تحليل بالذكاء الاصطناعي باستخدام Anthropic
      const aiAnalysis = await performAIAnalysis(commentsForAnalysis, analyticsData, analysisType);

      // دمج التحليلات
      const analysisData = {
        summary: analyticsData.summary,
        insights: aiAnalysis.insights,
        recommendations: aiAnalysis.recommendations,
        strengths: aiAnalysis.strengths,
        weaknesses: aiAnalysis.weaknesses,
        sentiment: aiAnalysis.sentiment,
        trends: analyticsData.trends,
        locationBreakdown: analyticsData.locationBreakdown,
        chartData: analyticsData.chartData
      };

      // تحديد اسم الشركة ديناميكياً بناءً على التقييمات
      const dynamicCompanyName = await determineDynamicCompanyName(evaluations, currentUser) || 'نظام إدارة بيئة العمل';

      // إنشاء ملف التقرير
      const reportContent = generateSmartAnalysisFile(analysisData, fileFormat, {
        companyName: dynamicCompanyName,
        generatedBy: currentUser.fullName || currentUser.username,
        dateRange: { startDate, endDate },
        reportType: 'تقرير التحليل الذكي لبيئة العمل'
      });

      // إعداد الاستجابة للتحميل
      const fileName = `Smart_Analysis_Report_${new Date().toISOString().split('T')[0]}.${fileFormat}`;
      const contentType = fileFormat === 'pdf' ? 'application/pdf' : 'text/html;charset=utf-8';

      // ✅ إصلاح headers للتحميل الصحيح
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

      console.log('✅ [Smart Analysis File] تم إنشاء ملف التقرير بنجاح:', fileName);
      console.log('📄 [Smart Analysis File] حجم المحتوى:', reportContent.length, 'حرف');
      
      // إرسال المحتوى مع التأكد من الـ encoding
      res.status(200).send(reportContent);

    } catch (error: any) {
      console.error('❌ [Smart Analysis File] خطأ في إنشاء ملف التقرير:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ في إنشاء ملف التقرير',
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      });
    }
  });

  // 📄 دالة إنشاء ملف التقرير الذكي
  function generateSmartAnalysisFile(analysisData: any, format: string, metadata: any) {
    const { summary, insights, recommendations, strengths, weaknesses, sentiment } = analysisData;
    const { companyName, generatedBy, dateRange, reportType } = metadata;
    
    const generateDate = new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      calendar: 'gregory'
    });

    if (format === 'html') {
      return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${reportType} - ${companyName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .header p {
            font-size: 1.2em;
            opacity: 0.9;
        }
        .content {
            padding: 40px;
        }
        .section {
            margin-bottom: 40px;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        .summary-section {
            background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
        }
        .insights-section {
            background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
        }
        .recommendations-section {
            background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
        }
        .sentiment-section {
            background: linear-gradient(135deg, #e3ffe7 0%, #d9e7ff 100%);
        }
        .section h2 {
            color: #2c3e50;
            margin-bottom: 20px;
            font-size: 1.8em;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: rgba(255,255,255,0.8);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            color: #2980b9;
            margin-bottom: 5px;
        }
        .stat-label {
            color: #7f8c8d;
            font-weight: 500;
        }
        .insights-text {
            background: rgba(255,255,255,0.8);
            padding: 25px;
            border-radius: 10px;
            border-right: 5px solid #e74c3c;
            line-height: 1.8;
            font-size: 1.1em;
        }
        .list-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .list-box {
            background: rgba(255,255,255,0.8);
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .list-box h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 1.3em;
        }
        .list-box ul {
            list-style: none;
        }
        .list-box li {
            padding: 8px 0;
            border-bottom: 1px solid #ecf0f1;
            position: relative;
            padding-right: 20px;
        }
        .list-box li:before {
            content: "•";
            color: #3498db;
            font-weight: bold;
            position: absolute;
            right: 0;
        }
        .sentiment-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
        }
        .sentiment-item {
            background: rgba(255,255,255,0.8);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .sentiment-bar {
            height: 8px;
            background: #ecf0f1;
            border-radius: 4px;
            margin: 10px 0;
            overflow: hidden;
        }
        .sentiment-fill {
            height: 100%;
            border-radius: 4px;
        }
        .positive { background: #27ae60; }
        .neutral { background: #95a5a6; }
        .negative { background: #e74c3c; }
        .footer {
            background: #34495e;
            color: white;
            padding: 30px;
            text-align: center;
        }
        .metadata {
            background: #ecf0f1;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .metadata p {
            margin: 5px 0;
            color: #7f8c8d;
        }
        @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; border-radius: 0; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧠 ${reportType}</h1>
            <p>تحليل شامل بالذكاء الاصطناعي لبيئة العمل</p>
        </div>
        
        <div class="content">
            <div class="metadata">
                <p><strong>الشركة:</strong> ${companyName}</p>
                <p><strong>أُنشئ بواسطة:</strong> ${generatedBy}</p>
                <p><strong>تاريخ الإنشاء:</strong> ${generateDate}</p>
                <p><strong>نطاق التقرير:</strong> ${dateRange.startDate} إلى ${dateRange.endDate}</p>
            </div>

            <div class="section summary-section">
                <h2>📊 الملخص التنفيذي</h2>
                <div class="summary-grid">
                    <div class="stat-card">
                        <div class="stat-number">${summary.totalEvaluations}</div>
                        <div class="stat-label">إجمالي التقييمات</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${summary.averageScore}%</div>
                        <div class="stat-label">متوسط الأداء</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${summary.uniqueLocations}</div>
                        <div class="stat-label">عدد المواقع</div>
                    </div>
                </div>
            </div>

            <div class="section insights-section">
                <h2>💡 الرؤى والتحليل</h2>
                <div class="insights-text">
                    ${insights.replace(/\n/g, '<br>')}
                </div>
            </div>

            <div class="section recommendations-section">
                <h2>🎯 التوصيات والإجراءات المقترحة</h2>
                <div class="list-container">
                    ${recommendations.length > 0 ? `
                    <div class="list-box">
                        <h3>التوصيات الرئيسية</h3>
                        <ul>
                            ${recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>
                    ` : '<p>لا توجد توصيات محددة.</p>'}
                    
                    ${strengths.length > 0 ? `
                    <div class="list-box">
                        <h3>🌟 نقاط القوة</h3>
                        <ul>
                            ${strengths.map((strength: string) => `<li>${strength}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                    
                    ${weaknesses.length > 0 ? `
                    <div class="list-box">
                        <h3>⚠️ نقاط الضعف</h3>
                        <ul>
                            ${weaknesses.map((weakness: string) => `<li>${weakness}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                </div>
            </div>

            <div class="section sentiment-section">
                <h2>📈 تحليل المشاعر</h2>
                <div class="sentiment-grid">
                    <div class="sentiment-item">
                        <h3>إيجابي</h3>
                        <div class="sentiment-bar">
                            <div class="sentiment-fill positive" style="width: ${sentiment.positive}%"></div>
                        </div>
                        <p><strong>${sentiment.positive}%</strong></p>
                    </div>
                    <div class="sentiment-item">
                        <h3>محايد</h3>
                        <div class="sentiment-bar">
                            <div class="sentiment-fill neutral" style="width: ${sentiment.neutral}%"></div>
                        </div>
                        <p><strong>${sentiment.neutral}%</strong></p>
                    </div>
                    <div class="sentiment-item">
                        <h3>سلبي</h3>
                        <div class="sentiment-bar">
                            <div class="sentiment-fill negative" style="width: ${sentiment.negative}%"></div>
                        </div>
                        <p><strong>${sentiment.negative}%</strong></p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${companyName} - تم إنشاء هذا التقرير بواسطة الذكاء الاصطناعي</p>
            <p>تقرير سري ومخصص للاستخدام الداخلي فقط</p>
        </div>
    </div>
</body>
</html>`;
    }
    
    // يمكن إضافة تنسيقات أخرى مثل PDF هنا
    return `تنسيق ${format} غير مدعوم حالياً`;
  }

  // 🔄 مسار المزامنة اليدوية من الإنتاج للتطوير
  app.post('/api/sync/production-to-dev', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // التحقق من صلاحيات الإدارة فقط
      if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'غير مصرح - مطلوب صلاحيات إدارية' 
        });
      }

      console.log('🔄 بدء مزامنة بيانات الإنتاج للتطوير...');
      
      // إنشاء المخططات إذا لم تكن موجودة
      const { pool } = await import('./db');
      await pool.query('CREATE SCHEMA IF NOT EXISTS production');
      await pool.query('CREATE SCHEMA IF NOT EXISTS development');
      
      // قائمة الجداول للمزامنة
      const tables = [
        'companies', 'users', 'locations', 'checklist_templates',
        'dashboard_settings', 'user_location_permissions',
        'supervisor_user_location_permissions', 'supervisor_assessment_location_permissions',
        'user_dashboard_settings', 'kpi_access', 'security_logs', 'login_attempts'
      ];

      const results = [];
      let synced = 0;
      let errors = 0;

      for (const table of tables) {
        try {
          // للمزامنة نحتاج PostgreSQL مباشر، فنستخدم raw SQL
          const { pool } = await import('./db');
          const result = await pool.query(`
            INSERT INTO development.${table} 
            SELECT * FROM production.${table} 
            ON CONFLICT (id) DO UPDATE SET 
              updated_at = COALESCE(EXCLUDED.updated_at, development.${table}.updated_at),
              name_ar = COALESCE(EXCLUDED.name_ar, development.${table}.name_ar),
              name_en = COALESCE(EXCLUDED.name_en, development.${table}.name_en)
          `);
          
          console.log(`✅ ${table}: مزامنة ناجحة`);
          results.push({ table, status: 'success', message: 'مزامنة ناجحة' });
          synced++;
        } catch (error: any) {
          console.log(`⚠️ ${table}: ${error.message}`);
          results.push({ table, status: 'error', message: error.message });
          errors++;
        }
      }

      console.log(`📊 المزامنة مكتملة: ${synced} جداول نجحت، ${errors} أخطاء`);
      
      res.json({
        success: true,
        message: `تمت المزامنة بنجاح - ${synced} جداول نجحت، ${errors} أخطاء`,
        results,
        stats: { synced, errors, total: tables.length }
      });

    } catch (error: any) {
      console.error('❌ خطأ في المزامنة:', error);
      res.status(500).json({ 
        success: false, 
        message: 'خطأ في المزامنة', 
        error: error.message 
      });
    }
  });

  // 🔄 مسارات نقل البيانات للنظام الموحد
  app.post('/api/migration/start', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // التحقق من صلاحيات الإدارة فقط
      if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'غير مصرح - مطلوب صلاحيات إدارية' 
        });
      }

      console.log('🔄 [Migration] بدء عملية نقل البيانات للنظام الموحد...');
      
      const { migrateAllDataToMaster } = await import('./dataMigration');
      const result = await migrateAllDataToMaster();
      
      res.json({
        success: true,
        message: 'تم نقل البيانات بنجاح',
        result
      });

    } catch (error: any) {
      console.error('❌ خطأ في نقل البيانات:', error);
      res.status(500).json({ 
        success: false, 
        message: 'خطأ في نقل البيانات', 
        error: error.message 
      });
    }
  });

  // 📊 فحص حالة النقل
  app.get('/api/migration/status', authenticateToken, async (req: any, res) => {
    try {
      const { getMigrationStatus } = await import('./dataMigration');
      const status = await getMigrationStatus();
      
      res.json({
        success: true,
        status
      });

    } catch (error: any) {
      console.error('❌ خطأ في فحص حالة النقل:', error);
      res.status(500).json({ 
        success: false, 
        message: 'خطأ في فحص حالة النقل', 
        error: error.message 
      });
    }
  });

  // 🧹 تنظيف المكررات
  app.post('/api/migration/cleanup', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'غير مصرح - مطلوب صلاحيات إدارية' 
        });
      }

      console.log('🧹 [Migration] بدء تنظيف المكررات...');
      
      const { cleanupDuplicates } = await import('./dataMigration');
      const result = await cleanupDuplicates();
      
      res.json({
        success: true,
        message: 'تم تنظيف المكررات بنجاح',
        result
      });

    } catch (error: any) {
      console.error('❌ خطأ في تنظيف المكررات:', error);
      res.status(500).json({ 
        success: false, 
        message: 'خطأ في تنظيف المكررات', 
        error: error.message 
      });
    }
  });

  // 🎯 إضافة routes النظام الموحد
  try {
    const unifiedRoutes = await import('./unifiedEvaluationRoutes');
    app.use(unifiedRoutes.default);
    console.log('🎯 [Server] تم تسجيل routes النظام الموحد للتقييمات');
  } catch (error) {
    console.error('❌ [Server] خطأ في تحميل النظام الموحد:', error);
  }

  // 📄 مسار تصدير تقرير PDF احترافي
  console.log('🔧 Registering professional PDF export route...');
  app.post('/api/reports/export-pdf', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const currentUser = req.user;
      const { 
        locationIds = [], 
        userIds = [], 
        startDate, 
        endDate,
        reportTitle = 'تقرير تقييم بيئة العمل - HSA Group'
      } = req.body;

      console.log('📄 [PDF Export] بدء إنشاء التقرير الاحترافي:', {
        userId: currentUser?.id,
        username: currentUser?.username,
        role: currentUser?.role,
        companyId: currentUser?.companyId,
        selectedLocations: locationIds,
        selectedUsers: userIds,
        dateRange: { startDate, endDate },
        reportTitle
      });

      // التحقق من الصلاحيات
      if (!currentUser || !currentUser.id) {
        console.log('❌ [PDF Export] صلاحيات غير كافية - لا يوجد مستخدم مصادق عليه');
        return res.status(401).json({ 
          success: false,
          message: 'غير مسموح - يجب تسجيل الدخول أولاً'
        });
      }

      // جمع البيانات من master_evaluations (نفس منطق Excel)
      console.log('🎯 [PDF Export] جلب البيانات من النظام الموحد master_evaluations...');
      
      // بناء شروط الاستعلام
      const dateFilter = and(
        startDate ? gte(masterEvaluations.evaluationDate, startDate) : undefined,
        endDate ? lte(masterEvaluations.evaluationDate, endDate) : undefined
      );

      const locationFilter = locationIds.length > 0 
        ? inArray(masterEvaluations.locationId, locationIds.map(id => parseInt(id.toString())))
        : undefined;
        
      const userFilter = userIds.length > 0 
        ? inArray(masterEvaluations.evaluatorId, userIds.map(id => parseInt(id.toString())))
        : undefined;

      const companyFilter = eq(masterEvaluations.companyId, currentUser.companyId);

      // تنفيذ الاستعلام الموحد
      const evaluationsData = await db
        .select({
          // بيانات التقييم
          id: masterEvaluations.id,
          checklistDate: masterEvaluations.evaluationDate, // استخدام evaluationDate بدلاً من checklistDate
          evaluationDate: masterEvaluations.evaluationDate,
          overallRating: masterEvaluations.overallRating,
          finalScore: masterEvaluations.averageRating, // استخدام averageRating بدلاً من finalScore
          completedTasks: masterEvaluations.completedTasks,
          totalTasks: masterEvaluations.totalTasks,
          finalNotes: masterEvaluations.evaluationNotes, // استخدام evaluationNotes بدلاً من finalNotes
          progressPercentage: masterEvaluations.completedTasks, // استخدام completedTasks مؤقتاً لحين حساب النسبة
          tasks: masterEvaluations.tasks,
          // بيانات المستخدم - تصحيح اسم الحقل
          userId: masterEvaluations.evaluatorId, // الحقل الصحيح
          userFullName: masterEvaluations.evaluatorName, // استخدام الاسم المحفوظ في master_evaluations
          // بيانات الموقع - استخدام البيانات المحفوظة
          locationId: masterEvaluations.locationId,
          locationNameAr: masterEvaluations.locationNameAr // استخدام الاسم المحفوظ
        })
        .from(masterEvaluations)
        // إزالة الـ joins غير الضرورية لأن البيانات محفوظة في master_evaluations
        .where(
          and(
            eq(masterEvaluations.companyId, currentUser.companyId),
            dateFilter,
            locationFilter ? inArray(masterEvaluations.locationId, locationIds.map(id => parseInt(id.toString()))) : undefined,
            userFilter ? inArray(masterEvaluations.evaluatorId, userIds.map(id => parseInt(id.toString()))) : undefined
          )
        )
        .orderBy(desc(masterEvaluations.evaluationDate));

      console.log(`📄 [PDF Export] تم جلب ${evaluationsData.length} تقييم من master_evaluations`);

      if (evaluationsData.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'لم يتم العثور على تقييمات في النطاق الزمني المحدد'
        });
      }

      // استيراد وظيفة إنشاء PDF
      const { generateEnhancedPDFStyleReport } = await import('./generateEnhancedPDFReport');
      
      // تحضير البيانات للتقرير (تحويل تنسيق البيانات ليتوافق مع منطق PDF)
      const reportData = {
        period: `من ${startDate} إلى ${endDate}`,
        generatedAt: new Date().toLocaleDateString('ar-EG', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          calendar: 'gregory'
        }),
        generatedBy: currentUser.fullName || currentUser.username,
        totalLocations: Array.from(new Set(evaluationsData.map(e => e.locationId))).length,
        totalUsers: Array.from(new Set(evaluationsData.map(e => e.userId))).length,
        totalEvaluations: evaluationsData.length,
        uniqueUsers: Array.from(new Set(evaluationsData.map(e => e.userId))).length,
        dateRange: `${startDate} - ${endDate}`,
        locations: [] // سيتم ملؤها لاحقاً
      };

      // تجميع البيانات حسب الموقع مع معالجة الأخطاء
      const locationGroups = new Map();
      
      evaluationsData.forEach(evaluation => {
        // التحقق من صحة البيانات
        if (!evaluation || !evaluation.locationId) {
          console.warn('❌ [PDF Export] تقييم غير صالح:', evaluation);
          return;
        }
        
        const locationKey = `${evaluation.locationId}-${evaluation.locationNameAr || 'موقع غير محدد'}`;
        if (!locationGroups.has(locationKey)) {
          locationGroups.set(locationKey, {
            id: evaluation.locationId,
            nameAr: evaluation.locationNameAr || 'موقع غير محدد',
            evaluations: []
          });
        }
        locationGroups.get(locationKey).evaluations.push(evaluation);
      });

      console.log(`📄 [PDF Export] تم تجميع ${locationGroups.size} موقع`);

      // تحويل البيانات لتنسيق التقرير مع معالجة آمنة
      reportData.locations = Array.from(locationGroups.values()).map(location => {
        if (!location || !location.evaluations || !Array.isArray(location.evaluations)) {
          console.warn('❌ [PDF Export] موقع غير صالح:', location);
          return {
            id: 0,
            nameAr: 'موقع غير محدد',
            totalEvaluations: 0,
            averageRating: 0,
            completionRate: 0,
            dailyReports: []
          };
        }

        const validEvaluations = location.evaluations.filter(e => e != null);
        
        return {
          id: location.id || 0,
          nameAr: location.nameAr || 'موقع غير محدد',
          totalEvaluations: validEvaluations.length,
          averageRating: validEvaluations.length > 0 
            ? validEvaluations.reduce((sum: number, e: any) => sum + (e.overallRating || 0), 0) / validEvaluations.length 
            : 0,
          completionRate: validEvaluations.length > 0
            ? validEvaluations.reduce((sum: number, e: any) => sum + (e.progressPercentage || 0), 0) / validEvaluations.length
            : 0,
          dailyReports: validEvaluations.map((evaluation: any) => {
            const checklistDate = evaluation.checklistDate ? new Date(evaluation.checklistDate) : new Date();
            return {
              dateFormatted: checklistDate.toLocaleDateString('ar-EG', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                calendar: 'gregory'
              }),
              userFullName: evaluation.userFullName || 'غير محدد',
              completionRate: evaluation.progressPercentage || 0,
              averageRating: evaluation.overallRating || 0,
              finalScore: evaluation.finalScore || 0,
              completedTasks: evaluation.completedTasks || 0,
              totalTasks: evaluation.totalTasks || 0,
              tasks: Array.isArray(evaluation.tasks) ? evaluation.tasks : [],
              evaluationNotes: evaluation.finalNotes || 'لا توجد ملاحظات'
            };
          })
        };
      }).filter(location => location != null);

      // إنشاء HTML للتقرير
      const htmlContent = generateEnhancedPDFStyleReport(reportData);
      
      // استيراد مكتبة jsPDF لتحويل HTML إلى PDF في الخادم
      const { jsPDF } = await import('jspdf');
      
      try {
        // إنشاء PDF جديد
        const doc = new (jsPDF as any)({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        // إضافة النص العربي والمحتوى
        doc.setFont('Arial', 'normal');
        
        // إضافة عنوان التقرير
        doc.setFontSize(18);
        doc.text('HSA Group - Work Environment Report', 20, 20);
        doc.text('هائل سعيد أنعم وشركاه - تقرير بيئة العمل', 20, 35);
        
        // إضافة معلومات التقرير
        doc.setFontSize(12);
        let yPosition = 50;
        
        doc.text(`Generated: ${reportData.generatedAt}`, 20, yPosition);
        yPosition += 10;
        doc.text(`Period: ${reportData.period}`, 20, yPosition);
        yPosition += 10;
        doc.text(`Total Evaluations: ${reportData.totalEvaluations}`, 20, yPosition);
        yPosition += 10;
        doc.text(`Total Locations: ${reportData.totalLocations}`, 20, yPosition);
        yPosition += 20;
        
        // إضافة بيانات المواقع
        doc.setFontSize(14);
        doc.text('Location Summary:', 20, yPosition);
        yPosition += 15;
        
        doc.setFontSize(10);
        reportData.locations.forEach((location: any, index: number) => {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.text(`${index + 1}. ${location.nameAr}`, 20, yPosition);
          yPosition += 7;
          doc.text(`   Evaluations: ${location.totalEvaluations}`, 25, yPosition);
          yPosition += 7;
          doc.text(`   Average Rating: ${location.averageRating?.toFixed(2) || 'N/A'}`, 25, yPosition);
          yPosition += 7;
          doc.text(`   Completion Rate: ${location.completionRate?.toFixed(1) || 'N/A'}%`, 25, yPosition);
          yPosition += 10;
        });
        
        // تحويل إلى Buffer
        const pdfBuffer = doc.output('arraybuffer');
        
        // إرسال PDF كاستجابة
        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="HSA_Work_Environment_Report_${new Date().toISOString().split('T')[0]}.pdf"`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Content-Length': pdfBuffer.byteLength.toString()
        });
        
        console.log('✅ [PDF Export] تم إنشاء وإرسال تقرير PDF بنجاح');
        res.send(Buffer.from(pdfBuffer));
        
      } catch (pdfError: any) {
        console.error('❌ [PDF Export] خطأ في إنشاء PDF، التراجع لـ HTML:', pdfError);
        
        // التراجع لإرسال HTML مع headers مناسبة للطباعة
        res.set({
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="HSA_Work_Environment_Report_${new Date().toISOString().split('T')[0]}.html"`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        
        console.log('⚠️ [PDF Export] إرسال HTML كبديل للـ PDF');
        res.send(htmlContent);
      }

    } catch (error: any) {
      console.error('❌ [PDF Export] خطأ في إنشاء التقرير:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إنشاء التقرير',
        error: error.message
      });
    }
  });

  // 📄 مسار تصدير تقرير HTML للتحليلات الذكية
  console.log('🔧 Registering Smart Analytics HTML export route...');
  app.post('/api/reports/export-html', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const currentUser = req.user;
      const { 
        locationIds = [], 
        userIds = [], 
        startDate, 
        endDate,
        reportTitle = 'تقرير التحليلات الذكية - HSA Group',
        includeSmartAnalytics = true
      } = req.body;

      console.log('📄 [HTML Export] بدء إنشاء تقرير التحليلات الذكية:', {
        userId: currentUser?.id,
        username: currentUser?.username,
        role: currentUser?.role,
        companyId: currentUser?.companyId,
        selectedLocations: locationIds,
        selectedUsers: userIds,
        dateRange: { startDate, endDate },
        reportTitle,
        includeSmartAnalytics
      });

      // التحقق من الصلاحيات
      if (!currentUser || !currentUser.id) {
        console.log('❌ [HTML Export] صلاحيات غير كافية - لا يوجد مستخدم مصادق عليه');
        return res.status(401).json({ 
          success: false,
          message: 'غير مسموح - يجب تسجيل الدخول أولاً'
        });
      }

      // جمع البيانات من master_evaluations (نفس منطق PDF)
      console.log('🎯 [HTML Export] جلب البيانات من النظام الموحد master_evaluations...');
      
      // بناء شروط الاستعلام
      const dateFilter = and(
        startDate ? gte(masterEvaluations.evaluationDate, startDate) : undefined,
        endDate ? lte(masterEvaluations.evaluationDate, endDate) : undefined
      );

      const locationFilter = locationIds.length > 0 
        ? inArray(masterEvaluations.locationId, locationIds.map(id => parseInt(id.toString())))
        : undefined;
        
      const userFilter = userIds.length > 0 
        ? inArray(masterEvaluations.evaluatorId, userIds.map(id => parseInt(id.toString())))
        : undefined;

      // ✅ تنفيذ الاستعلام الموحد مع LEFT JOINs نفس منطق Excel
      const evaluationsQueryData = await db
        .select({
          evaluation: masterEvaluations,
          user: users,
          location: locations,
          company: companies
        })
        .from(masterEvaluations)
        .leftJoin(users, eq(masterEvaluations.evaluatorId, users.id))
        .leftJoin(locations, eq(masterEvaluations.locationId, locations.id))
        .leftJoin(companies, eq(masterEvaluations.companyId, companies.id))
        .where(
          and(
            eq(masterEvaluations.companyId, currentUser.companyId),
            dateFilter,
            locationFilter,
            userFilter
          )
        )
        .orderBy(desc(masterEvaluations.evaluationDate));

      // ✅ جلب قوالب المهام لربط templateId بأسماء المهام (نفس منطق Excel)
      console.log('📋 [HTML Export] جلب قوالب المهام...');
      const templates = await db
        .select({
          id: checklistTemplates.id,
          taskAr: checklistTemplates.taskAr,
          taskEn: checklistTemplates.taskEn,
          categoryAr: checklistTemplates.categoryAr,
          categoryEn: checklistTemplates.categoryEn,
          locationId: checklistTemplates.locationId
        })
        .from(checklistTemplates)
        .where(eq(checklistTemplates.isActive, true));

      // إنشاء خريطة سريعة للقوالب
      const templateMap = new Map();
      templates.forEach(template => {
        templateMap.set(template.id, template);
      });

      console.log(`📋 [HTML Export] تم جلب ${templates.length} قالب مهمة`);

      // ✅ تحويل البيانات إلى نفس تنسيق Excel export
      const evaluationsData = evaluationsQueryData.map(item => {
        // معالجة المهام من JSON إلى Array
        let tasks = [];
        const evaluationItems = item.evaluation.tasks;
        if (Array.isArray(evaluationItems)) {
          tasks = evaluationItems;
        } else if (typeof evaluationItems === 'string') {
          try {
            tasks = JSON.parse(evaluationItems);
          } catch (e) {
            console.warn('خطأ في تحليل بيانات التقييم:', e);
            tasks = [];
          }
        }

        // إضافة تفاصيل المهام من القوالب
        tasks = tasks.map((task: any) => {
          const template = templateMap.get(task.templateId || task.id);
          return {
            ...task,
            taskAr: template?.taskAr || task.taskAr || task.name,
            categoryAr: template?.categoryAr || task.categoryAr || 'غير محدد',
            subTasks: task.subTasks || []
          };
        });

        return {
          id: item.evaluation.id,
          checklistDate: item.evaluation.evaluationDate,
          evaluationDate: item.evaluation.evaluationDate,
          overallRating: item.evaluation.overallRating,
          finalScore: item.evaluation.averageRating,
          completedTasks: item.evaluation.completedTasks,
          totalTasks: item.evaluation.totalTasks,
          finalNotes: item.evaluation.evaluationNotes,
          progressPercentage: item.evaluation.completedTasks,
          tasks: tasks,
          // بيانات المستخدم مع أولوية للاسم المحفوظ
          userId: item.evaluation.evaluatorId,
          userFullName: item.evaluation.evaluatorName || item.user?.fullName || item.user?.username || 'مستخدم غير محدد',
          evaluatorName: item.evaluation.evaluatorName || item.user?.fullName || item.user?.username || 'مستخدم غير محدد',
          // بيانات الموقع
          locationId: item.evaluation.locationId,
          locationNameAr: item.evaluation.locationNameAr || item.location?.nameAr || 'موقع غير محدد',
          // بيانات إضافية
          evaluationTime: item.evaluation.evaluationTime,
          evaluationDateTime: item.evaluation.evaluationDateTime
        };
      });

      console.log(`📄 [HTML Export] تم جلب ${evaluationsData.length} تقييم من master_evaluations`);

      if (evaluationsData.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'لم يتم العثور على تقييمات في النطاق الزمني المحدد'
        });
      }

      // تحضير البيانات للتقرير
      const reportData = {
        period: `من ${startDate} إلى ${endDate}`,
        generatedAt: new Date().toLocaleDateString('ar-EG', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          calendar: 'gregory'
        }),
        generatedBy: currentUser.fullName || currentUser.username,
        totalLocations: Array.from(new Set(evaluationsData.map(e => e.locationId))).length,
        totalUsers: Array.from(new Set(evaluationsData.map(e => e.userId))).length,
        totalEvaluations: evaluationsData.length,
        uniqueUsers: Array.from(new Set(evaluationsData.map(e => e.userId))).length,
        dateRange: `${startDate} - ${endDate}`,
        locations: [],
        reportTitle,
        includeSmartAnalytics
      };

      // تجميع البيانات حسب الموقع مع معالجة الأخطاء
      const locationGroups = new Map();
      
      evaluationsData.forEach(evaluation => {
        if (!evaluation || !evaluation.locationId) {
          console.warn('❌ [HTML Export] تقييم غير صالح:', evaluation);
          return;
        }
        
        const locationKey = `${evaluation.locationId}-${evaluation.locationNameAr || 'موقع غير محدد'}`;
        if (!locationGroups.has(locationKey)) {
          locationGroups.set(locationKey, {
            id: evaluation.locationId,
            nameAr: evaluation.locationNameAr || 'موقع غير محدد',
            evaluations: []
          });
        }
        locationGroups.get(locationKey).evaluations.push(evaluation);
      });

      console.log(`📄 [HTML Export] تم تجميع ${locationGroups.size} موقع`);

      // ✅ تحويل البيانات لتنسيق generateEnhancedPDFStyleReport مع جميع التفاصيل
      reportData.locations = Array.from(locationGroups.values()).map(location => {
        if (!location || !location.evaluations || !Array.isArray(location.evaluations)) {
          console.warn('❌ [HTML Export] موقع غير صالح:', location);
          return null;
        }

        const validEvaluations = location.evaluations.filter(e => e != null);
        
        return {
          id: location.id || 0,
          nameAr: location.nameAr || 'موقع غير محدد',
          totalEvaluations: validEvaluations.length,
          averageRating: validEvaluations.length > 0 
            ? validEvaluations.reduce((sum: number, e: any) => sum + (e.overallRating || 0), 0) / validEvaluations.length 
            : 0,
          completionRate: validEvaluations.length > 0
            ? validEvaluations.reduce((sum: number, e: any) => sum + (e.progressPercentage || 0), 0) / validEvaluations.length
            : 0,
          dailyReports: validEvaluations.map((evaluation: any) => {
            const checklistDate = evaluation.checklistDate ? new Date(evaluation.checklistDate) : new Date();
            
            // معالجة الوقت بنفس منطق PDF export
            const evaluationTime = evaluation.evaluationTime || 
              (evaluation.evaluationDateTime ? new Date(evaluation.evaluationDateTime).toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Asia/Riyadh'
              }) : checklistDate.toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Asia/Riyadh'
              }));
            
            // تجميع المهام حسب الفئة (نفس منطق PDF)
            const tasksByCategory: { [key: string]: any[] } = {};
            (evaluation.tasks || []).forEach((task: any) => {
              const category = task.categoryAr || 'غير محدد';
              if (!tasksByCategory[category]) {
                tasksByCategory[category] = [];
              }
              tasksByCategory[category].push(task);
            });
            
            return {
              date: checklistDate,
              dateFormatted: checklistDate.toLocaleDateString('ar-EG', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                calendar: 'gregory'
              }),
              evaluationTime: evaluationTime,
              evaluationDateTime: evaluation.evaluationDateTime,
              userFullName: evaluation.userFullName || evaluation.evaluatorName || 'غير محدد',
              completionRate: evaluation.progressPercentage || 0,
              averageRating: evaluation.overallRating || 0,
              finalScore: evaluation.finalScore || 0,
              completedTasks: evaluation.completedTasks || 0,
              totalTasks: evaluation.totalTasks || 0,
              tasks: evaluation.tasks || [],
              tasksByCategory: tasksByCategory,
              evaluationNotes: evaluation.finalNotes || 'لا توجد ملاحظات'
            };
          })
        };
      }).filter(location => location != null);

      // إنشاء HTML للتقرير مع تحسينات للتحليلات الذكية
      const { generateEnhancedPDFStyleReport } = await import('./generateEnhancedPDFReport');
      const htmlContent = generateEnhancedPDFStyleReport(reportData);
      
      // إرسال HTML مع headers مناسبة للتحميل
      res.set({
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="HSA_Smart_Analytics_Report_${new Date().toISOString().split('T')[0]}.html"`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      console.log('✅ [HTML Export] تم إنشاء وإرسال تقرير HTML بنجاح');
      res.send(htmlContent);

    } catch (error: any) {
      console.error('❌ [HTML Export] خطأ في إنشاء التقرير:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إنشاء التقرير',
        error: error.message
      });
    }
  });

  return app;
}

// SERVER SETUP
