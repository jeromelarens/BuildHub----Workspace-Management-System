import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '../../hooks/useToast';
import { registerApi } from '../../api/auth.api';
import { normalizeApiError } from '../../api/apiError';
import {
  ShieldCheck,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Briefcase,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sparkles,
  CheckCircle2,
  Rocket,
  Layers,
  Cpu,
  Clock,
} from 'lucide-react';

const registerSchema = z.object({
  name: z
    .string()
    .min(1, 'Full name is required')
    .max(100, 'Name must not exceed 100 characters'),
  email: z
    .string()
    .min(1, 'Corporate email is required')
    .max(150, 'Email must not exceed 150 characters')
    .email('Please enter a valid corporate email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .max(128, 'Password must not exceed 128 characters'),
  role: z.enum(['employee', 'manager'], {
    errorMap: () => ({ message: 'Please select an organizational role' }),
  }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { success } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'employee',
    },
  });

  const passwordValue = watch('password') || '';

  // Password strength score calculation
  const passwordStrength = useMemo(() => {
    if (!passwordValue) return { score: 0, label: '', color: 'bg-dark-border' };
    let score = 0;
    if (passwordValue.length >= 6) score += 1;
    if (passwordValue.length >= 10) score += 1;
    if (/[A-Z]/.test(passwordValue)) score += 1;
    if (/[0-9]/.test(passwordValue)) score += 1;
    if (/[^A-Za-z0-9]/.test(passwordValue)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-status-danger' };
    if (score <= 3) return { score: 2, label: 'Moderate', color: 'bg-status-warning' };
    return { score: 3, label: 'Strong Security', color: 'bg-[#C7FF00]' };
  }, [passwordValue]);

  const onSubmit = async (values: RegisterFormValues) => {
    if (!agreedToTerms) {
      setRegisterError('Please agree to the Enterprise Terms of Service to continue.');
      return;
    }

    setRegisterError(null);
    try {
      const response = await registerApi({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        role: values.role,
      });

      if (response.success) {
        success(
          'Workspace account created successfully! Please sign in with your credentials.',
          'Account Provisioned'
        );
        navigate('/login', { replace: true });
      }
    } catch (err) {
      const normalized = normalizeApiError(err);
      setRegisterError(normalized.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#030603] text-text-primary flex flex-col justify-center items-center p-2.5 sm:p-5 lg:p-8 relative overflow-x-hidden selection:bg-[#C7FF00] selection:text-black font-sans">
      {/* Background Cyber Mesh & Aurora Lighting */}
      <div className="absolute -top-32 -left-32 w-[350px] sm:w-[700px] h-[350px] sm:h-[700px] bg-[#C7FF00]/[0.05] rounded-full blur-[100px] sm:blur-[160px] pointer-events-none" />
      <div className="absolute top-1/2 -right-40 -translate-y-1/2 w-[300px] sm:w-[650px] h-[300px] sm:h-[650px] bg-[#C7FF00]/[0.04] rounded-full blur-[100px] sm:blur-[180px] pointer-events-none" />

      {/* Subtle background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #C7FF00 1px, transparent 1px),
            linear-gradient(to bottom, #C7FF00 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Top Enterprise Platform Telemetry Bar */}
      <header className="w-full max-w-[1240px] mb-2 sm:mb-3.5 flex items-center justify-between text-xs text-[#7B8C7A] px-1 sm:px-2 select-none">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C7FF00] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C7FF00]" />
          </span>
          <span className="font-mono text-[10px] sm:text-[11px] text-[#A6B8A4] tracking-wider uppercase font-semibold truncate">
            BuildHub Enterprise Cloud Provisioning
          </span>
          <span className="text-[#4A5D48]">&bull;</span>
          <span className="text-[10px] sm:text-[11px] text-[#5CFF7A] font-mono whitespace-nowrap">
            Direct Node
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-[#6A7B69]">
          <span>SETUP: &lt; 30 SEC</span>
          <span>&bull;</span>
          <span>SOC-2 TYPE II</span>
        </div>
      </header>

      {/* Main Glassmorphism Command Center Container */}
      <main className="w-full max-w-[1240px] min-h-0 lg:min-h-[700px] rounded-2xl sm:rounded-[32px] border border-[#C7FF00]/30 bg-gradient-to-br from-[#0c160e]/95 via-[#070e08]/98 to-[#030604] shadow-[0_0_60px_-15px_rgba(199,255,0,0.15),0_20px_70px_rgba(0,0,0,0.95)] backdrop-blur-2xl relative overflow-hidden flex flex-col justify-between p-4 sm:p-8 lg:p-12 z-10 before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-[#C7FF00] before:to-transparent before:opacity-85">
        
        {/* Futuristic Background Celestial Orbit Arc */}
        <div className="hidden lg:block absolute top-2 left-1/3 w-[560px] h-[560px] pointer-events-none opacity-30 select-none">
          <svg viewBox="0 0 500 500" fill="none" className="w-full h-full">
            <defs>
              <linearGradient id="registerArc" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C7FF00" stopOpacity="0.85" />
                <stop offset="40%" stopColor="#C7FF00" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#C7FF00" stopOpacity="0" />
              </linearGradient>
              <filter id="glowRegister" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" />
              </filter>
            </defs>
            <circle
              cx="250"
              cy="250"
              r="220"
              stroke="url(#registerArc)"
              strokeWidth="1.5"
              strokeDasharray="420 100 80 60"
              className="animate-pulse"
              style={{ animationDuration: '6s' }}
            />
          </svg>
        </div>

        {/* 2-Column Responsive Layout - Card First on Mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center relative z-10 my-auto">
          
          {/* MOBILE BRAND HEADER (< lg) */}
          <div className="lg:hidden flex items-center justify-between pb-1 border-b border-[#1c2c1e]">
            <div className="flex items-center gap-2.5 select-none">
              <img
                src="/Buildhub--Logo.png"
                alt="BuildHub Logo"
                className="w-9 h-9 rounded-full object-cover shadow-[0_0_18px_rgba(199,255,0,0.45)] shrink-0"
              />
              <div>
                <div className="text-xl font-black font-display tracking-tight leading-none">
                  <span className="text-white">Build</span>
                  <span className="text-[#C7FF00]">Hub</span>
                </div>
                <div className="text-[9px] text-[#869984] font-semibold tracking-wider uppercase font-display mt-0.5">
                  Workspace Provisioning
                </div>
              </div>
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#18301c] border border-[#C7FF00]/40 text-[9px] font-bold text-[#C7FF00] font-display">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C7FF00] animate-pulse" />
              PROVISIONING
            </div>
          </div>

          {/* RIGHT REGISTRATION COMMAND CARD (order-1 on mobile, order-2 on desktop) */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end order-1 lg:order-2">
            <div className="w-full max-w-full sm:max-w-[450px] rounded-2xl sm:rounded-[28px] bg-gradient-to-b from-[#132015]/95 via-[#0e1710]/98 to-[#070d08]/98 border border-[#C7FF00]/35 shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_35px_rgba(199,255,0,0.1)] backdrop-blur-3xl p-5 sm:p-8 relative z-20 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-[#C7FF00] before:to-transparent">
              
              {/* Top ambient illumination beam */}
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-32 bg-[#C7FF00]/20 rounded-full blur-3xl pointer-events-none" />

              {/* Header Badge & Title */}
              <div className="mb-3.5 sm:mb-5 relative z-10">
                <div className="hidden sm:flex items-center justify-between mb-2.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#18301c]/90 border border-[#C7FF00]/40 shadow-[0_0_14px_rgba(199,255,0,0.15)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C7FF00] animate-pulse" />
                    <span className="text-[10px] font-extrabold tracking-[0.2em] text-[#C7FF00] uppercase font-display flex items-center gap-1">
                      NEW WORKSPACE ACCESS <Sparkles className="w-2.5 h-2.5" />
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#788C76]">PROVISIONING</span>
                </div>

                <h2 className="text-xl sm:text-2xl lg:text-[28px] font-black font-display text-white tracking-tight leading-snug">
                  Create your account
                </h2>
                <p className="text-xs text-[#93A591] mt-1 leading-relaxed font-sans">
                  Deploy your team workspace or join an existing organization.
                </p>
              </div>

              {/* Server / Auth Error Alert */}
              {registerError && (
                <div
                  role="alert"
                  className="flex items-center gap-2.5 p-2.5 sm:p-3 mb-3 rounded-xl border border-status-danger/40 bg-status-danger/15 text-xs text-status-danger animate-shake relative z-10"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-[11px] sm:text-xs">{registerError}</span>
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-3.5 relative z-10" noValidate>
                {/* Full Name Field */}
                <div className="space-y-1 group">
                  <label
                    htmlFor="name"
                    className="block text-xs font-bold text-[#D6E4D4] tracking-wide font-display"
                  >
                    Full Name
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 flex items-center pointer-events-none text-[#7C907A] group-focus-within:text-[#C7FF00] transition-colors">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="name"
                      type="text"
                      placeholder="e.g. Alex Morgan"
                      autoComplete="name"
                      autoFocus
                      className={`w-full bg-[#050a06]/95 border ${
                        errors.name
                          ? 'border-status-danger focus:border-status-danger focus:ring-status-danger/30'
                          : 'border-[#243a26] hover:border-[#3c5c3f] focus:border-[#C7FF00] focus:ring-1 focus:ring-[#C7FF00]/50'
                      } rounded-xl pl-10 pr-3.5 py-2.5 text-base sm:text-sm text-white placeholder-[#516450] transition-all duration-200 focus:outline-none focus:shadow-[0_0_20px_rgba(199,255,0,0.22)] shadow-inner font-sans`}
                      {...register('name')}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-[11px] text-status-danger font-medium mt-1 animate-slide-down">
                      &bull; {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Corporate Email Address Field */}
                <div className="space-y-1 group">
                  <label
                    htmlFor="email"
                    className="block text-xs font-bold text-[#D6E4D4] tracking-wide font-display flex items-center justify-between"
                  >
                    <span>Work Email</span>
                    <span className="text-[9px] font-mono text-[#6A7F68] font-normal">REQUIRED</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 flex items-center pointer-events-none text-[#7C907A] group-focus-within:text-[#C7FF00] transition-colors">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      autoComplete="email"
                      className={`w-full bg-[#050a06]/95 border ${
                        errors.email
                          ? 'border-status-danger focus:border-status-danger focus:ring-status-danger/30'
                          : 'border-[#243a26] hover:border-[#3c5c3f] focus:border-[#C7FF00] focus:ring-1 focus:ring-[#C7FF00]/50'
                      } rounded-xl pl-10 pr-3.5 py-2.5 text-base sm:text-sm text-white placeholder-[#516450] transition-all duration-200 focus:outline-none focus:shadow-[0_0_20px_rgba(199,255,0,0.22)] shadow-inner font-sans`}
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] text-status-danger font-medium mt-1 animate-slide-down">
                      &bull; {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password Field + Live Strength Gauge */}
                <div className="space-y-1 group">
                  <label
                    htmlFor="password"
                    className="block text-xs font-bold text-[#D6E4D4] tracking-wide font-display flex items-center justify-between"
                  >
                    <span>Password</span>
                    {passwordValue && (
                      <span className="text-[10px] font-mono font-bold text-[#C7FF00]">
                        {passwordStrength.label}
                      </span>
                    )}
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 flex items-center pointer-events-none text-[#7C907A] group-focus-within:text-[#C7FF00] transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      className={`w-full bg-[#050a06]/95 border ${
                        errors.password
                          ? 'border-status-danger focus:border-status-danger focus:ring-status-danger/30'
                          : 'border-[#243a26] hover:border-[#3c5c3f] focus:border-[#C7FF00] focus:ring-1 focus:ring-[#C7FF00]/50'
                      } rounded-xl pl-10 pr-10 py-2.5 text-base sm:text-sm text-white placeholder-[#516450] transition-all duration-200 focus:outline-none focus:shadow-[0_0_20px_rgba(199,255,0,0.22)] shadow-inner font-sans`}
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 flex items-center text-[#7C907A] hover:text-[#C7FF00] transition-colors focus:outline-none cursor-pointer p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {/* Visual Strength Bar */}
                  {passwordValue && (
                    <div className="flex gap-1 pt-1">
                      <div
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          passwordStrength.score >= 1 ? passwordStrength.color : 'bg-[#182a1b]'
                        }`}
                      />
                      <div
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          passwordStrength.score >= 2 ? passwordStrength.color : 'bg-[#182a1b]'
                        }`}
                      />
                      <div
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          passwordStrength.score >= 3 ? passwordStrength.color : 'bg-[#182a1b]'
                        }`}
                      />
                    </div>
                  )}

                  {errors.password && (
                    <p className="text-[11px] text-status-danger font-medium mt-1 animate-slide-down">
                      &bull; {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Role Selector */}
                <div className="space-y-1 group">
                  <label
                    htmlFor="role"
                    className="block text-xs font-bold text-[#D6E4D4] tracking-wide font-display flex items-center justify-between"
                  >
                    <span>Organizational Role</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 flex items-center pointer-events-none text-[#7C907A] group-focus-within:text-[#C7FF00] transition-colors">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <select
                      id="role"
                      className="w-full bg-[#050a06]/95 border border-[#243a26] hover:border-[#3c5c3f] focus:border-[#C7FF00] focus:ring-1 focus:ring-[#C7FF00]/50 rounded-xl pl-10 pr-3.5 py-2.5 text-base sm:text-sm text-white transition-all duration-200 focus:outline-none focus:shadow-[0_0_20px_rgba(199,255,0,0.22)] shadow-inner font-sans cursor-pointer appearance-none"
                      {...register('role')}
                    >
                      <option value="employee" className="bg-[#0c160e] text-white">
                        Employee (Individual Contributor)
                      </option>
                      <option value="manager" className="bg-[#0c160e] text-white">
                        Manager (Project Lead)
                      </option>
                    </select>
                  </div>
                  {errors.role && (
                    <p className="text-[11px] text-status-danger font-medium mt-1 animate-slide-down">
                      &bull; {errors.role.message}
                    </p>
                  )}
                </div>

                {/* Terms and Privacy Checkbox */}
                <div className="flex items-start gap-2 pt-0.5">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-[#243a26] bg-[#050a06] text-[#C7FF00] focus:ring-[#C7FF00]/50 accent-[#C7FF00] cursor-pointer shrink-0"
                  />
                  <label htmlFor="terms" className="text-[10px] sm:text-[11px] text-[#8E9F8B] font-medium cursor-pointer select-none leading-relaxed">
                    I agree to BuildHub&apos;s{' '}
                    <span className="text-[#C7FF00] hover:underline">Enterprise Terms</span> and{' '}
                    <span className="text-[#C7FF00] hover:underline">Privacy Policy</span>.
                  </label>
                </div>

                {/* Submit / Create Account Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 sm:py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#C7FF00] via-[#D8FF4D] to-[#B2EB00] hover:from-[#D8FF4D] hover:to-[#C7FF00] active:scale-[0.99] text-black font-extrabold text-sm tracking-wide shadow-[0_0_24px_rgba(199,255,0,0.4)] hover:shadow-[0_0_36px_rgba(199,255,0,0.65)] transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer font-display min-h-[46px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Workspace Account</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Security Seal Row */}
              <div className="flex items-center justify-center gap-3 text-[9px] sm:text-[10px] text-[#6A7E68] mt-3 pt-2.5 border-t border-[#1a2d1d] relative z-10 font-mono">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#C7FF00]" /> Instant Setup
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#C7FF00]" /> 14-Day Free Access
                </span>
              </div>

              {/* Sign In Link */}
              <div className="text-center text-xs text-[#8FA38D] mt-3 relative z-10 font-sans">
                Already registered?{' '}
                <Link
                  to="/login"
                  className="text-[#C7FF00] font-extrabold hover:text-[#D5FF33] hover:underline transition-colors font-display ml-1 inline-block"
                >
                  Sign in &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* LEFT ONBOARDING SHOWCASE (order-2 on mobile, order-1 on desktop) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-5 sm:space-y-7 order-2 lg:order-1 pt-2 lg:pt-0">
            
            {/* Desktop Branding Header */}
            <div className="hidden lg:flex items-center gap-3.5 select-none">
              <img
                src="/Buildhub--Logo.png"
                alt="BuildHub Logo"
                className="w-12 h-12 rounded-full object-cover shadow-[0_0_28px_rgba(199,255,0,0.5)] shrink-0 transition-all duration-300 hover:scale-105"
              />
              <div className="flex flex-col">
                <div className="text-2xl sm:text-3xl font-black font-display tracking-tight leading-none flex items-center gap-1.5">
                  <span className="text-white">Build</span>
                  <span className="text-[#C7FF00] drop-shadow-[0_0_15px_rgba(199,255,0,0.4)]">Hub</span>
                </div>
                <span className="text-[11px] text-[#869984] font-semibold tracking-[0.18em] uppercase mt-1.5 font-display">
                  Enterprise Onboarding & Workspace Provisioning
                </span>
              </div>
            </div>

            {/* Pill Category Badge */}
            <div className="inline-flex self-start items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#122415]/90 border border-[#C7FF00]/40 shadow-[0_0_16px_rgba(199,255,0,0.15)]">
              <span className="flex h-1.5 w-1.5 rounded-full bg-[#C7FF00] animate-pulse" />
              <span className="text-[9px] sm:text-[11px] font-extrabold tracking-[0.2em] text-[#C7FF00] uppercase font-display">
                HIGH-VELOCITY WORKSPACE DEPLOYMENT
              </span>
            </div>

            {/* Executive Hero Headline & Description */}
            <div className="space-y-2 sm:space-y-3.5">
              <h1 className="text-2xl sm:text-4xl lg:text-[50px] font-black font-display tracking-tight leading-[1.1] text-white">
                Scale your team&apos;s
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C7FF00] via-[#E5FF80] to-[#A4E000]">
                  execution velocity.
                </span>
              </h1>
              <p className="text-[#A2B1A1] text-xs sm:text-base leading-relaxed max-w-xl font-sans">
                Deploy an enterprise-grade project workspace in seconds. Equip your engineering, product, and leadership teams with automated governance and real-time alignment.
              </p>
            </div>

            {/* Onboarding Core Pillars (4 Feature Items) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 max-w-xl">
              {/* Feature 1 */}
              <div className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-[#0c1a0f]/60 border border-[#C7FF00]/15">
                <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-[#142617] border border-[#C7FF00]/30 flex items-center justify-center text-[#C7FF00] shrink-0 mt-0.5">
                  <Rocket className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white tracking-wide font-display">
                    Instant Team Provisioning
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-[#7F8F7E] mt-0.5 leading-snug">
                    Spin up projects, custom pipelines, and roles with zero setup friction.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-[#0c1a0f]/60 border border-[#C7FF00]/15">
                <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-[#142617] border border-[#C7FF00]/30 flex items-center justify-center text-[#C7FF00] shrink-0 mt-0.5">
                  <Layers className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white tracking-wide font-display">
                    Cross-Functional Visibility
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-[#7F8F7E] mt-0.5 leading-snug">
                    Real-time roadmap tracking, dependency graphs, and resource load.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-[#0c1a0f]/60 border border-[#C7FF00]/15">
                <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-[#142617] border border-[#C7FF00]/30 flex items-center justify-center text-[#C7FF00] shrink-0 mt-0.5">
                  <Cpu className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white tracking-wide font-display">
                    Intelligent Automations
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-[#7F8F7E] mt-0.5 leading-snug">
                    Auto-assign tasks, enforce approvals, and trigger audit logs seamlessly.
                  </p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-[#0c1a0f]/60 border border-[#C7FF00]/15">
                <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-[#142617] border border-[#C7FF00]/30 flex items-center justify-center text-[#C7FF00] shrink-0 mt-0.5">
                  <ShieldCheck className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white tracking-wide font-display">
                    Enterprise Compliance
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-[#7F8F7E] mt-0.5 leading-snug">
                    SOC-2 Type II certified, granular RBAC, and data sovereignty.
                  </p>
                </div>
              </div>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-xl">
              <div className="p-2 sm:p-2.5 rounded-xl bg-[#09140b]/70 border border-[#C7FF00]/20 backdrop-blur-md text-center sm:text-left">
                <div className="text-sm sm:text-lg font-black text-white font-display">&lt; 30s</div>
                <div className="text-[9px] sm:text-[10px] text-[#7E907C] font-semibold mt-0.5 truncate">Setup Time</div>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-[#09140b]/70 border border-[#C7FF00]/20 backdrop-blur-md text-center sm:text-left">
                <div className="text-sm sm:text-lg font-black text-[#C7FF00] font-display">100%</div>
                <div className="text-[9px] sm:text-[10px] text-[#7E907C] font-semibold mt-0.5 truncate">Encrypted Rest</div>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-[#09140b]/70 border border-[#C7FF00]/20 backdrop-blur-md text-center sm:text-left">
                <div className="text-sm sm:text-lg font-black text-white font-display">14 Days</div>
                <div className="text-[9px] sm:text-[10px] text-[#7E907C] font-semibold mt-0.5 truncate">Enterprise Trial</div>
              </div>
            </div>

            {/* Bottom Tagline */}
            <div className="flex items-center gap-2 pt-1 select-none">
              <span className="w-5 sm:w-7 h-[2px] bg-[#C7FF00] rounded-full shadow-[0_0_10px_#C7FF00]" />
              <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] text-[#C7FF00] uppercase font-display">
                JOIN 10,000+ HIGH-PERFORMING TEAMS
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Outer Enterprise Footer */}
      <footer className="w-full max-w-[1240px] mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 text-[11px] sm:text-xs text-[#586B56] px-2 select-none font-sans text-center sm:text-left">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span>&copy; 2026 BuildHub Systems, Inc.</span>
          <span className="hidden sm:inline">&bull;</span>
          <span className="hidden sm:inline text-[#4C5C4B]">Workspace Provisioning</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <span className="hover:text-[#8E9F8B] cursor-pointer transition-colors">Privacy Policy</span>
          <span>&bull;</span>
          <span className="hover:text-[#8E9F8B] cursor-pointer transition-colors">Terms of Service</span>
          <span>&bull;</span>
          <span className="hover:text-[#8E9F8B] cursor-pointer transition-colors">Security</span>
          <span>&bull;</span>
          <span className="hover:text-[#8E9F8B] cursor-pointer transition-colors">System Status</span>
        </div>
      </footer>
    </div>
  );
};
