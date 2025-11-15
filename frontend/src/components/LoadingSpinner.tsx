import React from "react";

const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 via-white to-primary-50/30">
      <div className="text-center">
        <div className="relative">
          {/* Outer ring */}
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-primary-200"></div>

          {/* Inner spinning element */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-primary-600 border-r-transparent border-b-transparent border-l-transparent"></div>
          </div>

          {/* Center icon */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-6 h-6 bg-primary-600 rounded-full animate-pulse"></div>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <h3 className="text-lg font-semibold text-secondary-900">
            Loading AlbLearn
          </h3>
          <p className="text-secondary-600">
            Preparing your learning experience...
          </p>

          {/* Loading dots */}
          <div className="flex justify-center space-x-1 mt-4">
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce"></div>
            <div
              className="w-2 h-2 bg-primary-600 rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-2 h-2 bg-primary-600 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
