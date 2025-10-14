import { Code } from "lucide-react";

interface DeveloperCreditProps {
  variant?: "minimal" | "full" | "header";
}

export function DeveloperCredit({ variant = "minimal" }: DeveloperCreditProps) {
  if (variant === "header") {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Code className="h-3 w-3" />
        <span className="font-mono">Shawqi.jpry</span>
      </div>
    );
  }

  if (variant === "full") {
    return (
      <div className="flex items-center justify-center gap-2 p-4 bg-gray-50/50 rounded-lg border border-gray-200/50">
        <Code className="h-4 w-4 text-brand-yellow" />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">تطوير وبرمجة</p>
          <p className="text-lg font-mono font-bold text-brand-yellow">Shawqi.jpry</p>
          <p className="text-xs text-gray-500 mt-1">Full-Stack Developer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
      <Code className="h-3 w-3" />
      <span className="font-mono tracking-wide">
        تطوير: <span className="text-brand-yellow font-semibold">Shawqi.jpry</span>
      </span>
    </div>
  );
}