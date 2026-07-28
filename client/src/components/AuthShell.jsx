import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo.jsx";
import { PageTransition } from "./motion.jsx";
import { useToast } from "../context/ToastContext.jsx";

const CAROUSEL_SLIDES = [
  {
    badge: "🚀 NoteGenie AI 2024–25",
    title: "Welcome to NoteGenie",
    subtitle: "Your Gateway to Effortless Learning & Verified Material Store.",
    cardTitle: "Seamless Collaboration",
    cardDesc: "Effortlessly work together with your team and access verified study notes in real-time.",
  },
  {
    badge: "⚡ Smart Study Kits",
    title: "Instant AI Study Kits",
    subtitle: "Turn PDFs into structured notes, flashcards & instant practice quizzes.",
    cardTitle: "Smart AI Learning",
    cardDesc: "Ask the AI tutor anything, generate instant practice quizzes, and master complex subjects fast.",
  },
  {
    badge: "📚 100% Verified Notes",
    title: "Exam Ready Materials",
    subtitle: "Verified syllabus-aligned resources and solved assignments for your semester.",
    cardTitle: "Solved Papers & Guides",
    cardDesc: "Instant access to 2024–25 solved assignments, guidebooks, and 5-year question papers.",
  },
];

export default function AuthShell({ children, activeTab = "login", showTabs = true }) {
  const [slide, setSlide] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleSocialAuth = (provider) => {
    toast?.(`${provider} sign in will redirect to OAuth provider.`, "info");
  };

  const currentSlide = CAROUSEL_SLIDES[slide];

  return (
    <div className="w-full py-4 sm:py-8 lg:py-10 flex items-center justify-center font-sans text-slate-900 selection:bg-indigo-600 selection:text-white relative">
      
      {/* Ambient Radial Background Glows */}
      <div className="absolute top-1/6 left-1/4 h-80 w-80 rounded-full bg-indigo-400/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/6 right-1/4 h-80 w-80 rounded-full bg-blue-400/15 blur-3xl pointer-events-none" />

      {/* Main Floating Glassmorphic Container Card */}
      <div className="w-full max-w-5xl rounded-[26px] sm:rounded-[32px] bg-white/90 backdrop-blur-xl shadow-[0_20px_60px_rgba(15,23,42,0.08)] border border-slate-200/80 grid grid-cols-1 lg:grid-cols-12 overflow-hidden relative z-10">
        
        {/* Left Hero Panel */}
        <div className="lg:col-span-5 p-2.5 hidden lg:block h-full">
          <div className="relative flex h-full min-h-[580px] flex-col justify-between overflow-hidden rounded-[22px] sm:rounded-[26px] bg-gradient-to-br from-[#3b82f6] via-[#2563eb] to-[#1e40af] p-6 lg:p-7 xl:p-8 text-white shadow-lg shadow-blue-500/20">
            
            {/* Ambient Glowing Orbs */}
            <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-sky-300/30 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-indigo-400/30 blur-3xl pointer-events-none" />

            {/* Dynamic Vector Ribbon Line Graphics */}
            <svg className="absolute inset-0 h-full w-full opacity-40 pointer-events-none" viewBox="0 0 500 700" fill="none">
              <path d="M-80 100 C 120 220, 180 20, 430 260 C 580 400, 280 580, 580 720" stroke="white" strokeWidth="1.5" fill="none" />
              <path d="M-100 160 C 100 280, 200 80, 450 320 C 600 460, 300 640, 600 780" stroke="white" strokeWidth="2" opacity="0.8" fill="none" />
              <path d="M-60 220 C 140 340, 220 140, 470 380 C 620 520, 320 700, 620 840" stroke="white" strokeWidth="1" opacity="0.5" fill="none" />
              <path d="M-120 40 C 40 160, 160 -40, 410 200 C 560 340, 260 520, 560 660" stroke="white" strokeWidth="1.8" opacity="0.6" fill="none" />
            </svg>

            {/* Top Section: Logo & Headline */}
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <Logo variant="light" />
                <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[10px] sm:text-xs font-semibold text-white backdrop-blur-md border border-white/20">
                  {currentSlide.badge}
                </span>
              </div>

              <div className="mt-7 transition-all duration-500">
                <h1 className="font-sans text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-snug">
                  {currentSlide.title}
                </h1>
                <p className="mt-2 text-xs lg:text-sm text-blue-100/90 font-normal leading-relaxed max-w-xs sm:max-w-sm">
                  {currentSlide.subtitle}
                </p>
              </div>
            </div>

            {/* Bottom Section: Feature Card & Carousel Dots */}
            <div className="relative z-10 mt-auto pt-4">
              <div className="rounded-xl bg-white/10 backdrop-blur-md border border-white/15 p-3.5 space-y-1">
                <h3 className="font-sans text-sm lg:text-base font-bold text-white tracking-tight flex items-center justify-between">
                  <span>{currentSlide.cardTitle}</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-xs text-blue-100/85 leading-relaxed">
                  {currentSlide.cardDesc}
                </p>
              </div>

              {/* Carousel Pagination Dots */}
              <div className="mt-3.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {CAROUSEL_SLIDES.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSlide(idx)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        slide === idx ? "w-6 bg-white shadow-sm" : "w-2 bg-white/40 hover:bg-white/70"
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
                <span className="text-xs text-blue-100/70 font-medium">0{slide + 1} / 03</span>
              </div>
            </div>

          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-5 sm:p-6 lg:p-7 xl:p-8 flex flex-col justify-between h-full relative bg-white text-slate-900">
          
          {/* Mobile Logo */}
          <div className="lg:hidden mb-2 flex justify-center">
            <Logo />
          </div>

          <div className="flex-1 flex flex-col justify-center my-auto py-1">
            {/* Segmented Control Pill Switcher */}
            {showTabs && (
              <div className="mb-3 sm:mb-4 flex justify-start">
                <div className="inline-flex items-center rounded-xl bg-slate-100/90 p-1 border border-slate-200/90 shadow-inner">
                  <Link
                    to="/register"
                    className={`px-5 py-1.5 text-xs sm:text-sm font-bold transition-all duration-200 rounded-lg ${
                      activeTab === "register"
                        ? "bg-white text-indigo-600 shadow-sm border border-slate-200/80"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Sign Up
                  </Link>
                  <Link
                    to="/login"
                    className={`px-5 py-1.5 text-xs sm:text-sm font-bold transition-all duration-200 rounded-lg ${
                      activeTab === "login"
                        ? "bg-white text-indigo-600 shadow-sm border border-slate-200/80"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            )}

            {/* Form Content */}
            <PageTransition>
              {children}
            </PageTransition>
          </div>

          {/* Social Auth & Footer Terms */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex-shrink-0">
            <div className="relative mb-2.5 text-center">
              <span className="relative z-10 bg-white px-2.5 text-[10px] font-bold tracking-wider uppercase text-slate-400">
                OR CONTINUE WITH
              </span>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/80" />
              </div>
            </div>

            {/* Social Icons Row */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Google */}
              <button
                type="button"
                onClick={() => handleSocialAuth("Google")}
                className="flex items-center justify-center gap-2 h-9 sm:h-10 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50/80 hover:border-slate-300 transition-all shadow-2xs group cursor-pointer"
                title="Sign in with Google"
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="text-xs font-semibold text-slate-700">Google</span>
              </button>

              {/* Apple */}
              <button
                type="button"
                onClick={() => handleSocialAuth("Apple")}
                className="flex items-center justify-center gap-2 h-9 sm:h-10 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50/80 hover:border-slate-300 transition-all shadow-2xs group cursor-pointer"
                title="Sign in with Apple"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" className="fill-slate-900">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.17c.68-.83 1.14-1.99.01-3.14-1.06.04-2.36.71-3.03 1.5-.6.69-1.12 1.86-.98 3 1.18.09 2.4-.53 4-1.36z"/>
                </svg>
                <span className="text-xs font-semibold text-slate-700">Apple</span>
              </button>

              {/* Microsoft */}
              <button
                type="button"
                onClick={() => handleSocialAuth("Microsoft")}
                className="flex items-center justify-center gap-2 h-9 sm:h-10 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50/80 hover:border-slate-300 transition-all shadow-2xs group cursor-pointer"
                title="Sign in with Microsoft"
              >
                <svg width="15" height="15" viewBox="0 0 24 24">
                  <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
                  <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
                  <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
                  <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
                </svg>
                <span className="text-xs font-semibold text-slate-700">Microsoft</span>
              </button>
            </div>

            {/* Footer Terms text */}
            <p className="mt-2 text-center text-[10px] sm:text-xs text-slate-400 leading-normal">
              By signing up to create an account I accept NoteGenie&apos;s{" "}
              <Link to="/terms" className="font-semibold text-slate-600 underline underline-offset-2 hover:text-indigo-600">
                Terms of use
              </Link>
              {" "}&amp;{" "}
              <Link to="/privacy" className="font-semibold text-slate-600 underline underline-offset-2 hover:text-indigo-600">
                Privacy Policy
              </Link>.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
