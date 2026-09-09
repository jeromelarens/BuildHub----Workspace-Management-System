import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Mail, CheckCircle2, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { verifyEmailApi, resendVerificationApi } from '../../api/auth.api';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email') || '';
  const { success, error: toastError, info } = useToast();

  const [emailInput, setEmailInput] = useState(emailParam);
  const [cooldown, setCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [debugToken, setDebugToken] = useState<string | null>(null);

  // Auto verify when token is present in URL
  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const performVerification = async () => {
      setIsVerifying(true);
      setVerificationError(null);
      try {
        const res = await verifyEmailApi({ token });
        if (isMounted) {
          if (res.success) {
            setIsVerified(true);
            success('Email verified successfully!');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setVerificationError(
            err.response?.data?.message || 'Verification token is invalid or has expired.'
          );
        }
      } finally {
        if (isMounted) setIsVerifying(false);
      }
    };

    performVerification();
    return () => {
      isMounted = false;
    };
  }, [token, success]);

  // Cooldown timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    if (!emailInput) {
      toastError('Please enter your account email address.');
      return;
    }

    setIsResending(true);
    try {
      const res = await resendVerificationApi({ email: emailInput.trim().toLowerCase() });
      setCooldown(30);
      info(res.data?.message || 'Verification instructions resent. Check your inbox.');
      if (res.data?.debug_token) {
        setDebugToken(res.data.debug_token);
      }
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to resend verification.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-6 selection:bg-[#C7FF00] selection:text-black">
      {isVerifying ? (
        <div className="space-y-4 text-center py-6">
          <RefreshCw className="w-8 h-8 text-[#C7FF00] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-white font-display">
            Verifying your workspace token...
          </p>
        </div>
      ) : isVerified ? (
        <div className="space-y-5 text-center animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-[#5CFF7A]/15 border border-[#5CFF7A]/30 flex items-center justify-center mx-auto text-[#5CFF7A] shadow-[0_0_16px_rgba(92,255,122,0.2)]">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-black font-display text-white">Email Verified Successfully</h2>
            <p className="text-xs text-[#8E9F8B] leading-relaxed">
              Your email address is verified. You now have full access to your BuildHub enterprise workspace.
            </p>
          </div>

          <div className="pt-2">
            <Link to="/login">
              <Button variant="primary" size="md" className="w-full min-h-[46px] font-display font-extrabold shadow-[0_0_20px_rgba(199,255,0,0.35)]">
                Continue to Sign In
              </Button>
            </Link>
          </div>
        </div>
      ) : verificationError ? (
        <div className="space-y-5 text-center">
          <div className="w-12 h-12 rounded-full bg-status-danger/15 border border-status-danger/30 flex items-center justify-center mx-auto text-status-danger">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold font-display text-white">Verification Failed</h2>
            <p className="text-xs text-[#8E9F8B]">{verificationError}</p>
          </div>

          <div className="space-y-3 pt-2">
            <Input
              type="email"
              placeholder="Enter email to request new link"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="text-base sm:text-sm py-2.5 sm:py-3"
            />
            <Button
              variant="primary"
              size="md"
              className="w-full font-display font-bold min-h-[46px]"
              disabled={cooldown > 0}
              isLoading={isResending}
              onClick={handleResend}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Request New Verification Link'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5 text-center animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-[#C7FF00]/15 border border-[#C7FF00]/30 flex items-center justify-center mx-auto text-[#C7FF00] shadow-[0_0_16px_rgba(199,255,0,0.2)]">
            <Mail className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-black font-display text-white">Verify your email</h2>
            <p className="text-xs text-[#8E9F8B] leading-relaxed">
              We dispatched a verification link to{' '}
              <span className="font-semibold text-white">
                {emailParam || 'your account email'}
              </span>
              . Check your inbox to confirm your workspace account.
            </p>
          </div>

          {debugToken && (
            <div className="p-3 bg-[#0a140c] border border-[#C7FF00]/30 rounded-xl text-left space-y-1">
              <span className="text-[10px] font-mono text-[#C7FF00] uppercase font-bold">
                Sandbox Verification Token:
              </span>
              <p className="font-mono text-xs text-white break-all select-all">{debugToken}</p>
              <Link
                to={`/verify-email?token=${debugToken}`}
                className="inline-block text-xs font-bold text-[#C7FF00] hover:underline pt-1"
              >
                Click to auto-verify with token &rarr;
              </Link>
            </div>
          )}

          <div className="space-y-3 pt-2">
            {!emailParam && (
              <Input
                type="email"
                placeholder="Enter your account email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="text-base sm:text-sm py-2.5 sm:py-3"
              />
            )}
            <Button
              variant="outline"
              size="md"
              className="w-full min-h-[46px] font-display font-semibold"
              disabled={cooldown > 0}
              isLoading={isResending}
              onClick={handleResend}
              leftIcon={
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`}
                />
              }
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Verification Email'}
            </Button>

            <div className="pt-2 border-t border-[#1b2b1d]">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8E9F8B] hover:text-[#C7FF00] transition-colors font-display"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyEmailPage;
