import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Shield, Users, Award, Zap, Globe } from "lucide-react";
import { Link } from "wouter";
import { DeveloperCredit } from "@/components/DeveloperCredit";

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">حول النظام</h1>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              العودة للرئيسية
            </Button>
          </Link>
        </div>

        {/* System Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-brand-yellow" />
              نظام بيئة العمل HSA GROUP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 leading-relaxed">
              نظام شامل ومتطور لإدارة ومراقبة بيئة العمل والمرافق عبر جميع المواقع. 
              يوفر النظام أدوات قوية لتتبع المهام اليومية، إنشاء التقارير التفصيلية، وإدارة الفرق بكفاءة عالية.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-green-500 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-800">أمان متقدم</h3>
                  <p className="text-sm text-gray-600">نظام مصادقة قوي مع تشفير JWT وحماية شاملة للبيانات</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-500 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-800">إدارة المستخدمين</h3>
                  <p className="text-sm text-gray-600">نظام أدوار متقدم (مدير، مشرف، مستخدم عادي)</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Award className="h-5 w-5 text-purple-500 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-800">تقييم ذكي</h3>
                  <p className="text-sm text-gray-600">نظام تقييم تفاعلي مع تحليلات متقدمة ومؤشرات أداء</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-yellow-500 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-800">أداء سريع</h3>
                  <p className="text-sm text-gray-600">تقنيات متطورة للحصول على أفضل أداء وتجربة مستخدم</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technology Stack */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-6 w-6 text-brand-yellow" />
              التقنيات المستخدمة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Frontend</h3>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>• React 18 + TypeScript</li>
                  <li>• Tailwind CSS</li>
                  <li>• Progressive Web App</li>
                  <li>• Offline Support</li>
                </ul>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Backend</h3>
                <ul className="text-sm text-green-600 space-y-1">
                  <li>• Node.js + Express</li>
                  <li>• JWT Authentication</li>
                  <li>• RESTful APIs</li>
                  <li>• Security Middleware</li>
                </ul>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2">Database</h3>
                <ul className="text-sm text-purple-600 space-y-1">
                  <li>• PostgreSQL</li>
                  <li>• Drizzle ORM</li>
                  <li>• Optimized Indexes</li>
                  <li>• Data Segregation</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Developer Credit Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>تطوير وبرمجة</CardTitle>
          </CardHeader>
          <CardContent>
            <DeveloperCredit variant="full" />
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">مميزات التطوير</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• تطوير full-stack متكامل</li>
                <li>• أمان على مستوى enterprise</li>
                <li>• تحسينات أداء متقدمة</li>
                <li>• تصميم responsive ومتجاوب</li>
                <li>• دعم اللغة العربية والإنجليزية</li>
                <li>• نظام عمل offline متطور</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Version & Copyright */}
        <div className="text-center text-gray-500 text-sm">
          <p>© 2025 HSA GROUP - جميع الحقوق محفوظة</p>
          <p className="mt-1">الإصدار 2.0 - أغسطس 2025</p>
        </div>
      </div>
    </div>
  );
}