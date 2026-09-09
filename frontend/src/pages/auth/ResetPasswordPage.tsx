import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { resetPasswordApi } from '../../api/auth.api';
import { normalizeApiError } from '../../api/apiError';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(128, 'Password must not exceed 128 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      setFormError('Missing reset token.');
      return;
    }

    setFormError(null);
    try {
      const res = await resetPasswordApi({
        token,
        newPassword: data.password,
      });

      if (res.success) {
        success('Password updated successfully. Please sign in.');
        navigate('/login', { replace: true });
      }
    } catch (err) {
      const normalized = normalizeApiError(err);
      setFormError(normalized.message);
      toastError(normalized.message);
    }
  };

  return (
    <div className="space-y-6 selection:bg-[#C7FF00] selection:text-black">
            {!token ? (
              <div className="space-y-5 text-center">
                <div className="w-12 h-12 rounded-full bg-status-danger/15 border border-status-danger/30 flex items-center justify-center mx-auto text-status-danger">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold font-display text-white">Invalid Reset Token</h2>
                  <p className="text-xs text-[#8E9F8B]">
                    The password reset link is invalid or has expired. Please request a new link.
                  </p>
                </div>
                <div className="pt-2">
                  <Link to="/forgot-password">
                    <Button variant="primary" size="md" className="w-full min-h-[46px] font-display font-extrabold">
                      Request New Reset Link
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white">
                    Set new password
                  </h2>
                  <p className="text-xs text-[#8E9F8B] mt-1">
                    Choose a strong password with at least 6 characters.
                  </p>
                </div>

                {formError && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl border border-status-danger/40 bg-status-danger/15 text-xs text-status-danger">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                  <Input
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    leftIcon={<Lock className="w-4 h-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[#788A75] hover:text-[#C7FF00] p-1"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                    error={errors.password?.message}
                    {...register('password')}
                    autoFocus
                    className="text-base sm:text-sm py-2.5 sm:py-3"
                  />

                  <Input
                    label="Confirm New Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    leftIcon={<Lock className="w-4 h-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="text-[#788A75] hover:text-[#C7FF00] p-1"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                    error={errors.confirmPassword?.message}
                    {...register('confirmPassword')}
                    className="text-base sm:text-sm py-2.5 sm:py-3"
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full mt-2 min-h-[46px] font-display font-extrabold shadow-[0_0_20px_rgba(199,255,0,0.35)]"
                    isLoading={isSubmitting}
                  >
                    Update Password
                  </Button>
                </form>

                <div className="pt-3 border-t border-[#1b2b1d] text-center">
                  <Link
                    to="/login"
                    className="text-xs font-bold text-[#8E9F8B] hover:text-[#C7FF00] transition-colors font-display"
                  >
                    Cancel and return to sign in
                  </Link>
                </div>
              </div>
            )}
    </div>
  );
};

export default ResetPasswordPage;
