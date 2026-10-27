"use client";

import { cn } from "@/lib/utils";
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useMemo, useCallback } from "react";
import { cva } from "class-variance-authority";
import { ArrowRight, Mail, Lock, Eye, EyeOff, User, AlertCircle, PartyPopper, Loader } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { LiquidBackground } from "./liquid-background";
import { GradientTracing } from "./gradient-tracing";
import { PromptHubWordmark } from "../PromptHubWordmark";
import confetti from "canvas-confetti";

// --- CONFETTI COMPONENT ---
export const Confetti = forwardRef((props, ref) => {
  const { options, globalOptions = { resize: true, useWorker: true }, manualstart = false, ...rest } = props;
  const instanceRef = useRef(null);
  const canvasRef = useCallback((node) => {
    if (node !== null) {
      if (instanceRef.current) return;
      try {
        instanceRef.current = confetti.create(node, { ...globalOptions, resize: true });
      } catch (e) {
        console.warn("Confetti init fallback:", e);
      }
    } else {
      if (instanceRef.current) {
        try { instanceRef.current.reset(); } catch (e) {}
        instanceRef.current = null;
      }
    }
  }, [globalOptions]);

  const fire = useCallback((opts = {}) => {
    try {
      instanceRef.current?.({ ...options, ...opts });
    } catch (e) {
      console.warn("Confetti fire fallback:", e);
    }
  }, [options]);

  useImperativeHandle(ref, () => ({ fire }), [fire]);
  useEffect(() => { if (!manualstart) fire(); }, [manualstart, fire]);
  return <canvas ref={canvasRef} {...rest} />;
});
Confetti.displayName = "Confetti";

// --- GLASS BUTTON COMPONENT ---
const glassButtonVariants = cva(
  "relative isolate cursor-pointer rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex items-center justify-center gap-2",
  {
    variants: {
      size: {
        default: "px-6 py-3",
        sm: "px-4 py-2 text-xs",
        lg: "px-8 py-3.5 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: { size: "default" },
  }
);

export const GlassButton = React.forwardRef(
  ({ className, children, size, disabled, onClick, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          glassButtonVariants({ size }),
          "border border-white/10 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl text-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:from-white/15 hover:to-white/10 hover:border-sky-400/50 hover:shadow-[0_0_20px_rgba(56,189,248,0.25)] active:scale-[0.98]",
          disabled && "opacity-50 cursor-not-allowed hover:shadow-none hover:border-white/10",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
GlassButton.displayName = "GlassButton";

// --- PROVIDER ICONS ---
export const GoogleIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="w-4 h-4">
    <g fillRule="evenodd" fill="none">
      <g fillRule="nonzero" transform="translate(3, 2)">
        <path fill="#4285F4" d="M57.8123233,30.1515267 C57.8123233,27.7263183 57.6155321,25.9565533 57.1896408,24.1212666 L29.4960833,24.1212666 L29.4960833,35.0674653 L45.7515771,35.0674653 C45.4239683,37.7877475 43.6542033,41.8844383 39.7213169,44.6372555 L39.6661883,45.0037254 L48.4223791,51.7870338 L49.0290201,51.8475849 C54.6004021,46.7020943 57.8123233,39.1313952 57.8123233,30.1515267"></path>
        <path fill="#34A853" d="M29.4960833,58.9921667 C37.4599129,58.9921667 44.1456164,56.3701671 49.0290201,51.8475849 L39.7213169,44.6372555 C37.2305867,46.3742596 33.887622,47.5868638 29.4960833,47.5868638 C21.6960582,47.5868638 15.0758763,42.4415991 12.7159637,35.3297782 L12.3700541,35.3591501 L3.26524241,42.4054492 L3.14617358,42.736447 C7.9965904,52.3717589 17.959737,58.9921667 29.4960833,58.9921667"></path>
        <path fill="#FBBC05" d="M12.7159637,35.3297782 C12.0932812,33.4944915 11.7329116,31.5279353 11.7329116,29.4960833 C11.7329116,27.4640054 12.0932812,25.4976752 12.6832029,23.6623884 L12.6667095,23.2715173 L3.44779955,16.1120237 L3.14617358,16.2554937 C1.14708246,20.2539019 0,24.7439491 0,29.4960833 C0,34.2482175 1.14708246,38.7380388 3.14617358,42.736447 L12.7159637,35.3297782"></path>
        <path fill="#EB4335" d="M29.4960833,11.4050769 C35.0347044,11.4050769 38.7707997,13.7975244 40.9011602,15.7968415 L49.2255853,7.66898166 C44.1130815,2.91684746 37.4599129,0 29.4960833,0 C17.959737,0 7.9965904,6.62018183 3.14617358,16.2554937 L12.6832029,23.6623884 C15.0758763,16.5505675 21.6960582,11.4050769 29.4960833,11.4050769"></path>
      </g>
    </g>
  </svg>
);

export const AppleIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-current">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.64-.78 1.08-1.86.96-2.94-.93.04-2.06.62-2.73 1.4-.58.68-1.1 1.77-.96 2.83 1.04.08 2.1-.51 2.73-1.29" />
  </svg>
);

// --- PROMPTHUB CENTERED ANIMATED LOGO WITH LOOPING OUTLINE TRACER ---
const PROMPTHUB_LOGO_PATH =
  "M 512,338 C 575,268 640,244 706,246 C 758,248 798,288 798,340 C 798,392 758,432 706,434 C 640,436 575,412 512,342 C 455,275 395,242 325,245 C 265,248 220,285 225,340 C 230,390 255,450 272,485 C 282,492 302,460 312,425 C 350,425 440,420 512,338 Z";

export const PrompthubBigAnimatedLogo = () => {
  return (
    <div className="relative flex flex-col items-center justify-center select-none mb-2">
      {/* Intense glow aura behind the logo */}
      <div 
        className="absolute w-36 h-20 bg-gradient-to-r from-sky-500/20 via-cyan-400/30 to-purple-500/25 blur-2xl rounded-full pointer-events-none" 
        aria-hidden="true" 
      />

      {/* Main Logo Container with looping Outline Tracer */}
      <div className="relative flex items-center justify-center w-28 sm:w-32 aspect-[1024/682]">
        <img
          src="/logo.png"
          alt="PromptHub"
          className="w-full h-full object-contain pointer-events-none select-none relative z-10 drop-shadow-[0_8px_20px_rgba(56,189,248,0.4)]"
        />

        {/* Glowing Shiny Cyber-Cyan Beam Exactly Tracing the Logo Ribbon in Loop */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <GradientTracing
            width={1024}
            height={682}
            path={PROMPTHUB_LOGO_PATH}
            baseColor="#38bdf8"
            baseOpacity={0.22}
            gradientColors={["#00F2FE", "#FFFFFF", "#38BDF8"]}
            glowColor="rgba(0, 242, 254, 0.95)"
            animationDuration={2.4}
            strokeWidth={7.5}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Official PromptHub Wordmark Image */}
      <div className="mt-1 flex items-center justify-center">
        <PromptHubWordmark variant="dark" height="h-6 sm:h-7" />
      </div>
    </div>
  );
};

export const DefaultPromptHubLogo = () => (
  <div className="flex items-center gap-2">
    <img src="/logo.png" alt="PromptHub" className="w-7 h-7 object-contain" />
    <PromptHubWordmark height="h-5" />
  </div>
);

// --- MAIN AUTH COMPONENT ---
export const AuthComponent = ({
  mode = "signup",
  onGoogleLogin,
  onAppleLogin,
  onSubmitAuth,
  errorMessage = "",
  externalLoading = false,
  loadingProvider = "",
  bottomFooter,
}) => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [modalStatus, setModalStatus] = useState("closed");
  const confettiRef = useRef(null);

  const fireSideCanons = () => {
    const fire = confettiRef.current?.fire;
    if (fire) {
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
      const particleCount = 50;
      fire({ ...defaults, particleCount, origin: { x: 0, y: 1 }, angle: 60 });
      fire({ ...defaults, particleCount, origin: { x: 1, y: 1 }, angle: 120 });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (mode === "signup") {
      if (!username.trim()) {
        setFormError("Please choose a username");
        return;
      }
      if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
        setFormError("Please enter a valid email address");
        return;
      }
      if (!password || password.length < 6) {
        setFormError("Password must be at least 6 characters long");
        return;
      }
    } else {
      if (!email.trim()) {
        setFormError("Please enter your email or username");
        return;
      }
      if (!password) {
        setFormError("Please enter your password");
        return;
      }
    }

    if (onSubmitAuth) {
      try {
        await onSubmitAuth({ email: email.trim(), username: username.trim(), password });
        fireSideCanons();
      } catch (err) {
        setFormError(err?.message || "Authentication failed");
      }
    }
  };

  useEffect(() => {
    if (errorMessage) {
      setFormError(errorMessage);
    }
  }, [errorMessage]);

  return (
    <div className="relative min-h-screen w-screen flex flex-col bg-[#07090e] text-slate-100 overflow-hidden select-none">
      {/* Interactive Liquid Background - color spreads on touch/move */}
      <LiquidBackground intensity={1.15} interactive={true} />

      <Confetti ref={confettiRef} manualstart className="fixed top-0 left-0 w-full h-full pointer-events-none z-[999]" />

      {/* Main Centered Card Container */}
      <div className="relative z-20 flex w-full flex-1 items-center justify-center p-3 sm:p-4 my-auto">
        <div className="relative w-full max-w-[390px] rounded-2xl border border-white/10 bg-slate-950/60 p-5 sm:p-6 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
          
          {/* Prominent Centered PromptHub Logo with Looping Tracer */}
          <PrompthubBigAnimatedLogo />

          <div className="text-center mb-3 sm:mb-4">
            <h2 className="font-serif font-light text-xl sm:text-2xl tracking-tight text-white">
              {mode === "login" ? "Sign in" : "Create your account"}
            </h2>
          </div>

          {/* Social Auth Buttons (Google & Apple) */}
          <div className="flex items-center justify-center gap-2.5 w-full mb-3.5">
            <GlassButton
              type="button"
              onClick={() => onGoogleLogin?.()}
              disabled={externalLoading}
              className="flex-1 py-2 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-slate-800/80 hover:border-sky-400/40 text-slate-200 text-xs sm:text-sm"
            >
              {loadingProvider === "google" ? <Loader className="w-4 h-4 animate-spin text-sky-400" /> : <GoogleIcon />}
              <span>Google</span>
            </GlassButton>

            <GlassButton
              type="button"
              onClick={() => onAppleLogin?.()}
              disabled={externalLoading}
              className="flex-1 py-2 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-slate-800/80 hover:border-sky-400/40 text-slate-200 text-xs sm:text-sm"
            >
              {loadingProvider === "apple" ? <Loader className="w-4 h-4 animate-spin text-slate-200" /> : <AppleIcon />}
              <span>Apple</span>
            </GlassButton>
          </div>

          {/* Divider */}
          <div className="flex items-center w-full gap-2.5 py-0 mb-3.5">
            <hr className="w-full border-slate-800/80" />
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">OR</span>
            <hr className="w-full border-slate-800/80" />
          </div>

          {/* Error Message */}
          {formError && (
            <div className="mb-3 p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="auth-form w-full space-y-2.5">
            
            {/* Username Field (Sign up mode) */}
            {mode === "signup" && (
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 ml-1">Username</label>
                <div className="auth-input-container relative flex items-center w-full rounded-xl transition-all duration-300 px-3 py-2">
                  <User className="w-4 h-4 text-sky-400 mr-2 flex-shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="auth-input w-full bg-transparent border-0 outline-none text-xs sm:text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-0 shadow-none p-0"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 ml-1">
                {mode === "login" ? "Email or Username" : "Email Address"}
              </label>
              <div className="auth-input-container relative flex items-center w-full rounded-xl transition-all duration-300 px-3 py-2">
                <Mail className="w-4 h-4 text-sky-400 mr-2 flex-shrink-0" />
                <input
                  type={mode === "login" ? "text" : "email"}
                  required
                  placeholder={mode === "login" ? "Enter your email or username" : "name@example.com"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input w-full bg-transparent border-0 outline-none text-xs sm:text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-0 shadow-none p-0"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 ml-1">Password</label>
              <div className="auth-input-container relative flex items-center w-full rounded-xl transition-all duration-300 px-3 py-2">
                <Lock className="w-4 h-4 text-sky-400 mr-2 flex-shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder={mode === "login" ? "Enter your password" : "At least 6 characters"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input w-full bg-transparent border-0 outline-none text-xs sm:text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-0 shadow-none p-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-1">
              <GlassButton
                type="submit"
                disabled={externalLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-[0_0_20px_rgba(56,189,248,0.35)] border-sky-400/30"
              >
                {externalLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin text-white" />
                    <span>Please wait...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </GlassButton>
            </div>
          </form>

          {/* Footer Link */}
          {bottomFooter && (
            <div className="w-full pt-3 mt-3 border-t border-slate-800/80 text-center">
              {bottomFooter}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
