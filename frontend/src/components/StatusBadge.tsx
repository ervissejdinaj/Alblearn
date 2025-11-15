import React from "react";

interface StatusBadgeProps {
  label: string;
  variant: "success" | "warning" | "info" | "error" | "neutral";
  icon?: React.ReactNode;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant,
  icon,
  className = "",
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case "success":
        return "bg-success-100 text-success-700 ring-success-200 border-success-200";
      case "warning":
        return "bg-warning-100 text-warning-700 ring-warning-200 border-warning-200";
      case "info":
        return "bg-primary-100 text-primary-700 ring-primary-200 border-primary-200";
      case "error":
        return "bg-error-100 text-error-700 ring-error-200 border-error-200";
      case "neutral":
      default:
        return "bg-secondary-100 text-secondary-700 ring-secondary-200 border-secondary-200";
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ring-1 ${getVariantClasses()} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="truncate">{label}</span>
    </span>
  );
};

export default StatusBadge;
