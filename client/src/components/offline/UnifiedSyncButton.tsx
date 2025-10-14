/**
 * زر المزامنة الموحد - معطل مؤقتاً بسبب تبسيط النظام
 */

import React from 'react';

interface UnifiedSyncButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
}

export function UnifiedSyncButton({ 
  className = '', 
  size = 'md',
  showBadge = true,
  variant = 'outline'
}: UnifiedSyncButtonProps) {
  return null;
}