import React from "react";
import { Link } from "react-router-dom";

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/80 border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-200">
                <span className="text-lg">🇦🇱</span>
              </div>
              <div className="leading-tight">
                <span className="block text-lg font-bold text-gray-900">
                  AlbLearn
                </span>
                <span className="text-[10px] uppercase tracking-[0.25em] text-gray-500">
                  Learn Albanian
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-100 rounded-full text-sm font-medium text-green-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              The best platform to learn Albanian
            </div>

            {/* Heading */}
            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 tracking-tight">
                Learn Albanian with{" "}
                <span className="bg-gradient-to-r from-green-600 via-green-500 to-green-700 bg-clip-text text-transparent">
                  AlbLearn
                </span>
              </h1>
              <p className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-600 leading-relaxed">
                A modern learning platform that helps you master the Albanian
                language with ease and efficiency.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                to="/signup"
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                Start Learning Free
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
              >
                Explore Platform
              </Link>
            </div>

            {/* Stats */}
            <div className="pt-12 flex flex-wrap justify-center gap-8 sm:gap-12">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-gray-900">
                  100+
                </div>
                <div className="text-sm text-gray-600 mt-1">Lessons</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-gray-900">
                  50+
                </div>
                <div className="text-sm text-gray-600 mt-1">Quizzes</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-gray-900">
                  24/7
                </div>
                <div className="text-sm text-gray-600 mt-1">Access</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
              Why AlbLearn?
            </h2>
            <p className="max-w-2xl mx-auto text-lg text-gray-600">
              A complete platform to learn Albanian, with the best tools and
              quality content.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="relative w-16 h-16 mb-5 group-hover:scale-110 transition-transform duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl blur-md opacity-50 group-hover:opacity-70 transition-opacity"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-green-400 via-green-500 to-green-600 rounded-2xl flex items-center justify-center text-4xl shadow-lg transform rotate-3 group-hover:rotate-6 transition-transform">
                  📚
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Interactive Courses
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Learn with videos, audio, and interactive exercises that keep
                you engaged throughout the entire process.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="relative w-16 h-16 mb-5 group-hover:scale-110 transition-transform duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl blur-md opacity-50 group-hover:opacity-70 transition-opacity"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-4xl shadow-lg transform -rotate-3 group-hover:-rotate-6 transition-transform">
                  📊
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Personalized Progress
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Track your progress in real-time and receive personalized
                recommendations for improvement.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="relative w-16 h-16 mb-5 group-hover:scale-110 transition-transform duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl blur-md opacity-50 group-hover:opacity-70 transition-opacity"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center text-4xl shadow-lg transform rotate-3 group-hover:rotate-6 transition-transform">
                  ⏰
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Learn at Your Own Pace
              </h3>
              <p className="text-gray-600 leading-relaxed">
                24/7 access to all content. Learn whenever and wherever you
                want, on any device.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-8 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="relative w-16 h-16 mb-5 group-hover:scale-110 transition-transform duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl blur-md opacity-50 group-hover:opacity-70 transition-opacity"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 rounded-2xl flex items-center justify-center text-4xl shadow-lg transform -rotate-3 group-hover:-rotate-6 transition-transform">
                  🎯
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Quizzes and Tests
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Test your knowledge with interactive quizzes and get instant
                feedback.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group p-8 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="relative w-16 h-16 mb-5 group-hover:scale-110 transition-transform duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl blur-md opacity-50 group-hover:opacity-70 transition-opacity"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 rounded-2xl flex items-center justify-center text-4xl shadow-lg transform rotate-3 group-hover:rotate-6 transition-transform">
                  👨‍🏫
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Qualified Instructors
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Learn from experienced instructors who create quality and
                well-structured content.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group p-8 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="relative w-16 h-16 mb-5 group-hover:scale-110 transition-transform duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-400 to-pink-600 rounded-2xl blur-md opacity-50 group-hover:opacity-70 transition-opacity"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600 rounded-2xl flex items-center justify-center text-4xl shadow-lg transform -rotate-3 group-hover:-rotate-6 transition-transform">
                  🎁
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Free to Start
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Start learning Albanian at no cost. Sign up for free and explore
                our content.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden bg-gradient-to-r from-green-600 via-green-700 to-green-800 rounded-3xl shadow-2xl">
            <div className="absolute inset-0 bg-grid-white/10"></div>
            <div className="relative px-8 py-16 sm:px-12 sm:py-20 text-center">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-lg sm:text-xl text-green-100 mb-8 max-w-2xl mx-auto">
                Join thousands of students learning Albanian with AlbLearn. Sign
                up for free today!
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/signup"
                  className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-green-700 bg-white hover:bg-gray-50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  Sign Up Free
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-green-800/50 hover:bg-green-800/70 border-2 border-white/30 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Log In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-600 py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-md">
                  <span className="text-lg">🇦🇱</span>
                </div>
                <div className="leading-tight">
                  <span className="block text-lg font-bold text-gray-900">
                    AlbLearn
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-gray-400">
                    Learn Albanian
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 max-w-md">
                The best platform to learn the Albanian language. Interactive
                courses, qualified instructors, and personalized progress.
              </p>
            </div>

            {/* Links */}
            <div>
              <h3 className="text-gray-900 font-semibold mb-4">Navigation</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/"
                    className="text-gray-600 hover:text-green-600 transition-colors"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    to="/login"
                    className="text-gray-600 hover:text-green-600 transition-colors"
                  >
                    Log In
                  </Link>
                </li>
                <li>
                  <Link
                    to="/signup"
                    className="text-gray-600 hover:text-green-600 transition-colors"
                  >
                    Sign Up
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-gray-900 font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="mailto:info@alblearn.com"
                    className="text-gray-600 hover:text-green-600 transition-colors"
                  >
                    info@alblearn.com
                  </a>
                </li>
                <li className="text-gray-600">Prishtina, Kosovo</li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-8 border-t border-gray-200 text-center text-sm">
            <p className="text-gray-500">
              &copy; {new Date().getFullYear()} AlbLearn. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
