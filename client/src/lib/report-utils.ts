export interface ReportData {
  locationId: number;
  locationName: string;
  tasks: TaskCompletion[];
  completionDate: string;
  completedBy: string;
  evaluationNotes?: string;
}

export interface TaskCompletion {
  taskName: string;
  category: string;
  completed: boolean;
  description?: string;
}

import { generateReportFilename } from './date-utils';

export function generateExcelReport(data: ReportData[], reportType: string, dateRange: { start: string; end: string }) {
  // This would integrate with a library like xlsx to generate Excel files
  // For now, return a placeholder structure
  console.log('Generating Excel report:', { data, reportType, dateRange });
  
  // In a real implementation, this would:
  // 1. Create workbook with multiple sheets
  // 2. Add summary sheet with statistics
  // 3. Add detailed sheets per location
  // 4. Format cells and add charts
  // 5. Export as blob for download
  
  return {
    filename: generateReportFilename(`تقرير-${reportType}`),
    blob: new Blob(['Excel data would go here'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  };
}

export function generatePDFReport(data: ReportData[], reportType: string, dateRange: { start: string; end: string }) {
  // This would integrate with a library like jsPDF to generate PDF files
  // For now, return a placeholder structure
  console.log('Generating PDF report:', { data, reportType, dateRange });
  
  // In a real implementation, this would:
  // 1. Create PDF document with Arabic RTL support
  // 2. Add header with company logo and branding
  // 3. Add summary statistics
  // 4. Add detailed tables for each location
  // 5. Add charts and graphs
  // 6. Export as blob for download
  
  return {
    filename: generateReportFilename(`تقرير-${reportType}`, 'pdf'),
    blob: new Blob(['PDF data would go here'], { type: 'application/pdf' })
  };
}

export function calculateStatistics(data: ReportData[]) {
  let totalTasks = 0;
  let completedTasks = 0;
  const locationStats: Record<string, { completed: number; total: number }> = {};
  
  data.forEach(record => {
    totalTasks += record.tasks.length;
    completedTasks += record.tasks.filter(task => task.completed).length;
    
    if (!locationStats[record.locationName]) {
      locationStats[record.locationName] = { completed: 0, total: 0 };
    }
    
    locationStats[record.locationName].total += record.tasks.length;
    locationStats[record.locationName].completed += record.tasks.filter(task => task.completed).length;
  });
  
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  return {
    totalTasks,
    completedTasks,
    pendingTasks: totalTasks - completedTasks,
    completionRate,
    locationStats,
    recordCount: data.length,
    uniqueLocations: Object.keys(locationStats).length,
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
