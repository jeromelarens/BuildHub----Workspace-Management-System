import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Mail, CheckCircle2, ShieldAlert } from 'lucide-react';
import { forgotPasswordApi } from '../../api/auth.api';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address')
    .trim()
    .toLowerCase(),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordPage: React.FC = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [debugToken, setDebugToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setSubmittedEmail(data.email);
    try {
      const res = await forgotPasswordApi({ email: data.email });
      setServerMessage(res.data?.message || 'Password reset instructions have been generated.');
      if (res.data?.debug_token) {
        setDebugToken(res.data.debug_token);
      }
    } catch {
      // Respect anti-enumeration principle even on network errors
      setServerMessage('If an account exists, reset instructions have been dispatched.');
    } finally {
      setIsSubmitted(true);
    }
  };

  return (
    <div className="space-y-6 selection:bg-[#C7FF00] selection:text-black">
      {isSubmitted ? (
        <div className="space-y-5 text-center animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-[#C7FF00]/15 border border-[#C7FF00]/30 flex items-center justify-center mx-auto text-[#C7FF00] shadow-[0_0_16px_rgba(199,255,0,0.2)]">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white">
              Check your inbox
            </h2>
            <p className="text-xs text-[#8E9F8B] leading-relaxed">
              We dispatched reset instructions to{' '}
              <span className="font-semibold text-white">{submittedEmail}</span>
            </p>
          </div>

          {serverMessage && (
            <div className="p-3 bg-[#0a140c] border border-[#C7FF00]/25 rounded-xl text-xs text-[#A2B4A0]">
              {serverMessage}
            </div>
          )}

          {debugToken && (
            <div className="p-3 bg-[#0a140c] border border-[#C7FF00]/30 rounded-xl text-left space-y-1">
              <span className="text-[10px] font-mono text-[#C7FF00] uppercase font-bold">
                Debug Mode Token:
              </span>
              <p className="font-mono text-xs text-white break-all">{debugToken}</p>
              <Link
                to={`/reset-password?token=${debugToken}`}
                className="inline-block text-xs font-bold text-[#C7FF00] hover:underline pt-1"
              >
                Proceed to Reset Password &rarr;
              </Link>
            </div>
          )}

          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C7FF00] hover:underline font-display"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Sign In</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#18301c] border border-[#C7FF00]/30 text-[10px] font-bold text-[#C7FF00] uppercase font-display mb-2">
              <ShieldAlert className="w-3 h-3" />
              <span>SECURITY RECOVERY</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white">
              Reset your password
            </h2>
            <p className="text-xs text-[#8E9F8B] mt-1 leading-relaxed">
              Enter your corporate email address to receive password reset instructions.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              type="email"
              label="Corporate Email Address"
              placeholder="name@company.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
              required
              autoFocus
              autoComplete="email"
              className="text-base sm:text-sm py-2.5 sm:py-3"
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2 min-h-[46px] font-display font-extrabold shadow-[0_0_20px_rgba(199,255,0,0.35)]"
              isLoading={isSubmitting}
            >
              Send Reset Instructions
            </Button>
          </form>

          <div className="pt-3 border-t border-[#1b2b1d] text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8E9F8B] hover:text-[#C7FF00] transition-colors font-display"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForgotPasswordPage;
