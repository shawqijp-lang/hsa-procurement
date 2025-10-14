import type { Request, Response, NextFunction } from "express";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
    companyId?: number;
  };
  userCompanyId?: number;
}

/**
 * Middleware لضمان فصل البيانات على مستوى الشركات
 * يضيف context الشركة لجميع الطلبات
 */
export function applyCompanyFilter(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = req.user;
  
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Super admins can access all companies
  if (user.role === 'super_admin' || user.username === 'hsa_group_admin') {
    // للـ super admin، يمكن تمرير companyId في الـ query parameters
    const requestedCompanyId = req.query.companyId ? parseInt(req.query.companyId as string) : null;
    req.userCompanyId = requestedCompanyId || user.companyId || undefined;
    
    console.log('🔧 Super admin company context:', {
      username: user.username,
      requestedCompanyId,
      finalCompanyId: req.userCompanyId
    });
  } else {
    // المستخدمون العاديون يتم تقييدهم بشركتهم فقط
    req.userCompanyId = user.companyId;
    
    console.log('🔒 User company context restricted:', {
      username: user.username,
      companyId: req.userCompanyId
    });
  }

  next();
}

/**
 * تطبيق فلتر الشركة على المعاملات في الـ request body
 */
export function filterRequestByCompany(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = req.user;
  
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // إضافة companyId للبيانات المرسلة إذا لم تكن موجودة
  if (req.body && user.companyId && !req.body.companyId) {
    // للمستخدمين العاديين، فرض companyId الخاص بهم
    if (user.role !== 'super_admin' && user.username !== 'hsa_group_admin') {
      req.body.companyId = user.companyId;
      console.log('🏢 Auto-assigned companyId to request:', {
        username: user.username,
        companyId: user.companyId
      });
    }
  }

  next();
}

/**
 * التحقق من صحة الوصول للشركة المطلوبة
 */
export function validateCompanyAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = req.user;
  const requestedCompanyId = req.params.companyId ? parseInt(req.params.companyId) : req.userCompanyId;
  
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Super admins can access any company
  if (user.role === 'super_admin' || user.username === 'hsa_group_admin') {
    return next();
  }

  // التحقق من أن المستخدم ينتمي للشركة المطلوبة
  if (requestedCompanyId && user.companyId !== requestedCompanyId) {
    console.log('❌ Company access denied:', {
      username: user.username,
      userCompanyId: user.companyId,
      requestedCompanyId
    });
    return res.status(403).json({ message: 'Access denied to this company data' });
  }

  next();
}