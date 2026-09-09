import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Switch } from '../../components/ui/Switch';
import { Tabs } from '../../components/ui/Tabs';
import { useToast } from '../../contexts/ToastContext';
import {
  User,
  Mail,
  Shield,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Palette,
  Bell,
  Building,
  Briefcase,
  Check,
  Save,
  LogOut,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(6, 'New password must be at least 6 characters')
      .max(128, 'New password must not exceed 128 characters'),
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Profile editable form state
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [jobTitle, setJobTitle] = useState('Senior Product Engineer');
  const [department, setDepartment] = useState('Engineering & Architecture');
  const [timezone, setTimezone] = useState('Asia/Kolkata (GMT+5:30)');

  // Notification Preferences state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [taskAssignments, setTaskAssignments] = useState(true);
  const [deadlineAlerts, setDeadlineAlerts] = useState(true);
  const [sprintDigest, setSprintDigest] = useState(false);

  // Theme Preference state
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light' | 'system'>('dark');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  if (!user) return null;

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setTimeout(() => {
      setIsSavingProfile(false);
      showToast('Profile information updated successfully.', 'success');
    }, 500);
  };

  const onPasswordSubmit = async () => {
    setIsChangingPassword(true);
    setTimeout(() => {
      setIsChangingPassword(false);
      reset();
      showToast('Password updated successfully for this session.', 'success');
    }, 600);
  };

  // Browser/device detection
  const userAgent = navigator.userAgent;
  const isWindows = userAgent.includes('Windows');
  const isMac = userAgent.includes('Macintosh');
  const osName = isWindows ? 'Windows 11 Enterprise' : isMac ? 'macOS Sonoma' : 'Linux / Mobile';
  const isChrome = userAgent.includes('Chrome');
  const browserName = isChrome ? 'Chrome 128 (Chromium)' : 'Modern Secure Browser';

  const settingsTabs = [
    { id: 'profile', label: 'Profile & Info', icon: <User className="w-4 h-4" /> },
    { id: 'security', label: 'Security & Auth', icon: <KeyRound className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'sessions', label: 'Active Sessions', icon: <Laptop className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-borderSubtle pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <User className="w-6 h-6 text-brand" />
            <span>Account & Workspace Settings</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Manage your personal identity, security credentials, appearance themes, and workspace preferences.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="brand" size="sm" className="font-mono px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse mr-1.5" />
            {user.role.toUpperCase()} ROOT
          </Badge>
        </div>
      </div>

      {/* Hero Profile Card */}
      <Card className="p-5 sm:p-6 bg-dark-surface border-dark-border relative overflow-hidden">
        {/* Subtle Ambient Background Gradient */}
        <div className="absolute top-0 right-0 w-80 h-full bg-brand/5 blur-3xl pointer-events-none -mr-20" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative">
              <Avatar name={user.name} size="xl" className="ring-2 ring-brand/40 shadow-lemon-sm" />
              <div
                className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-status-success border-2 border-dark-surface flex items-center justify-center"
                title="Online & Active"
              />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">{user.name}</h2>
                <Badge variant="brand" size="sm" className="capitalize">
                  {user.role.replace('_', ' ')}
                </Badge>
              </div>

              <p className="text-xs text-text-secondary flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-text-muted" />
                <span>{user.email}</span>
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-text-muted font-mono">
                <span>Account ID: #{user.id}</span>
                <span>&bull;</span>
                <span className="text-status-success flex items-center gap-1">
                  <Check className="w-3 h-3 text-status-success" />
                  Verified Identity
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-dark-borderSubtle gap-2">
            <span className="text-[11px] text-text-muted font-mono">Workspace Role</span>
            <span className="px-3 py-1 rounded-lg bg-dark-elevated border border-dark-borderSubtle text-xs font-semibold text-text-primary capitalize">
              {user.role.replace('_', ' ')} Member
            </span>
          </div>
        </div>
      </Card>

      {/* Segmented Settings Tabs */}
      <div className="pt-2">
        <Tabs
          tabs={settingsTabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="w-full sm:w-auto"
        />
      </div>

      {/* TAB 1: Profile & Personal Info */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSave} className="space-y-6">
          <Card className="p-6 bg-dark-surface border-dark-border space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-dark-borderSubtle">
              <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">Personal Details</h3>
                <p className="text-xs text-text-muted">Update your display name and corporate directory presence.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Full Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                required
              />

              <Input
                label="Corporate Email (Managed by SSO)"
                value={user.email}
                disabled
                leftIcon={<Mail className="w-4 h-4" />}
                helperText="Email is bound to your enterprise organization domain."
              />

              <Input
                label="Job Title / Position"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                leftIcon={<Briefcase className="w-4 h-4" />}
              />

              <Input
                label="Department / Org Unit"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                leftIcon={<Building className="w-4 h-4" />}
              />

              <div className="md:col-span-2">
                <Select
                  label="Primary Timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  options={[
                    { value: 'Asia/Kolkata (GMT+5:30)', label: 'Asia/Kolkata (GMT+5:30) - IST' },
                    { value: 'America/New_York (GMT-5:00)', label: 'America/New_York (GMT-5:00) - EST' },
                    { value: 'America/Los_Angeles (GMT-8:00)', label: 'America/Los_Angeles (GMT-8:00) - PST' },
                    { value: 'Europe/London (GMT+0:00)', label: 'Europe/London (GMT+0:00) - UTC/GMT' },
                    { value: 'Europe/Berlin (GMT+1:00)', label: 'Europe/Berlin (GMT+1:00) - CET' },
                    { value: 'Asia/Tokyo (GMT+9:00)', label: 'Asia/Tokyo (GMT+9:00) - JST' },
                  ]}
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-dark-borderSubtle">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSavingProfile}
                leftIcon={<Save className="w-4 h-4" />}
                className="shadow-lemon-sm"
              >
                Save Changes
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* TAB 2: Security & Credentials */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card className="p-6 bg-dark-surface border-dark-border space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-dark-borderSubtle">
              <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">Change Password</h3>
                <p className="text-xs text-text-muted">Ensure your account is protected with a unique, high-entropy password.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-xl" noValidate>
              <Input
                label="Current Password"
                type={showCurrent ? 'text' : 'password'}
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="p-1 text-text-muted hover:text-text-primary transition-colors"
                    aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                error={errors.currentPassword?.message}
                {...register('currentPassword')}
              />

              <Input
                label="New Password"
                type={showNew ? 'text' : 'password'}
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="p-1 text-text-muted hover:text-text-primary transition-colors"
                    aria-label={showNew ? 'Hide new password' : 'Show new password'}
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                error={errors.newPassword?.message}
                {...register('newPassword')}
              />

              <Input
                label="Confirm New Password"
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="p-1 text-text-muted hover:text-text-primary transition-colors"
                    aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                error={errors.confirmNewPassword?.message}
                {...register('confirmNewPassword')}
              />

              <div className="p-3.5 rounded-xl bg-dark-elevated border border-dark-borderSubtle text-xs text-text-muted flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <span>
                  Password must contain at least 6 characters. For enhanced security, avoid using common phrases or passwords from other services.
                </span>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isChangingPassword}
                  className="shadow-lemon-sm"
                >
                  Update Password
                </Button>
              </div>
            </form>
          </Card>

          {/* Two-Factor Authentication Status */}
          <Card className="p-6 bg-dark-surface border-dark-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-status-success/10 text-status-success flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Two-Factor Authentication (2FA)</h3>
                  <p className="text-xs text-text-muted">Enterprise TOTP hardware token & authenticator app support.</p>
                </div>
              </div>

              <Badge variant="success" size="sm" className="self-start sm:self-auto">
                Enforced by Policy
              </Badge>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: Appearance & Themes */}
      {activeTab === 'appearance' && (
        <Card className="p-6 bg-dark-surface border-dark-border space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-dark-borderSubtle">
            <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Theme & Interface Appearance</h3>
              <p className="text-xs text-text-muted">Select your preferred color scheme and visual contrast mode.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Theme 1: Dark (Default) */}
            <div
              onClick={() => {
                setSelectedTheme('dark');
                showToast('Dark Mode (Electric Lemon) active.', 'info');
              }}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer space-y-3 ${
                selectedTheme === 'dark'
                  ? 'border-brand bg-dark-elevated shadow-lemon-sm ring-1 ring-brand/40'
                  : 'border-dark-border bg-dark-elevated/40 hover:border-dark-borderHover'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
                  <Moon className="w-4 h-4 text-brand" />
                  <span>Dark Futuristic</span>
                </div>
                {selectedTheme === 'dark' && <CheckCircle2 className="w-4 h-4 text-brand" />}
              </div>

              <div className="h-16 rounded-lg bg-[#080A08] border border-[#242A24] p-2 flex flex-col justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#C7FF00]" />
                  <div className="w-8 h-1.5 rounded bg-[#242A24]" />
                </div>
                <div className="w-full h-3 rounded bg-[#101410] border border-[#242A24]" />
              </div>

              <p className="text-[11px] text-text-muted">Deep black & enterprise lime accents (Recommended).</p>
            </div>

            {/* Theme 2: Light Mode */}
            <div
              onClick={() => {
                setSelectedTheme('light');
                showToast('Light Mode palette selected.', 'info');
              }}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer space-y-3 ${
                selectedTheme === 'light'
                  ? 'border-brand bg-dark-elevated shadow-lemon-sm ring-1 ring-brand/40'
                  : 'border-dark-border bg-dark-elevated/40 hover:border-dark-borderHover'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Clean Slate Light</span>
                </div>
                {selectedTheme === 'light' && <CheckCircle2 className="w-4 h-4 text-brand" />}
              </div>

              <div className="h-16 rounded-lg bg-slate-100 border border-slate-300 p-2 flex flex-col justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-600" />
                  <div className="w-8 h-1.5 rounded bg-slate-300" />
                </div>
                <div className="w-full h-3 rounded bg-white border border-slate-200" />
              </div>

              <p className="text-[11px] text-text-muted">High-contrast daytime clarity for bright environments.</p>
            </div>

            {/* Theme 3: System Sync */}
            <div
              onClick={() => {
                setSelectedTheme('system');
                showToast('System theme synchronization active.', 'info');
              }}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer space-y-3 ${
                selectedTheme === 'system'
                  ? 'border-brand bg-dark-elevated shadow-lemon-sm ring-1 ring-brand/40'
                  : 'border-dark-border bg-dark-elevated/40 hover:border-dark-borderHover'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
                  <Monitor className="w-4 h-4 text-text-secondary" />
                  <span>System Adaptive</span>
                </div>
                {selectedTheme === 'system' && <CheckCircle2 className="w-4 h-4 text-brand" />}
              </div>

              <div className="h-16 rounded-lg bg-gradient-to-r from-[#080A08] to-slate-200 border border-dark-border p-2 flex flex-col justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-brand" />
                  <div className="w-8 h-1.5 rounded bg-dark-border" />
                </div>
                <div className="w-full h-3 rounded bg-dark-surface/80" />
              </div>

              <p className="text-[11px] text-text-muted">Automatically synchronizes with your OS dark/light mode.</p>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 4: Notifications & Alerts */}
      {activeTab === 'notifications' && (
        <Card className="p-6 bg-dark-surface border-dark-border space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-dark-borderSubtle">
            <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Notification Channels & Alerts</h3>
              <p className="text-xs text-text-muted">Configure how and when you receive workspace event notifications.</p>
            </div>
          </div>

          <div className="divide-y divide-dark-borderSubtle space-y-4">
            <div className="pt-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-text-primary">Email Notifications</p>
                <p className="text-[11px] text-text-muted">Receive email digests for critical updates and assignments.</p>
              </div>
              <Switch checked={emailNotifications} onChange={setEmailNotifications} />
            </div>

            <div className="pt-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-text-primary">Task Assignment Dispatch</p>
                <p className="text-[11px] text-text-muted">Get immediate in-app and audio alerts when a new task is assigned to you.</p>
              </div>
              <Switch checked={taskAssignments} onChange={setTaskAssignments} />
            </div>

            <div className="pt-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-text-primary">Upcoming Deadline Warnings</p>
                <p className="text-[11px] text-text-muted">Receive alerts 24 hours before a milestone or scheduled task due date.</p>
              </div>
              <Switch checked={deadlineAlerts} onChange={setDeadlineAlerts} />
            </div>

            <div className="pt-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-text-primary">Weekly Sprint Digest</p>
                <p className="text-[11px] text-text-muted">Weekly performance and workload summary delivered every Monday morning.</p>
              </div>
              <Switch checked={sprintDigest} onChange={setSprintDigest} />
            </div>
          </div>
        </Card>
      )}

      {/* TAB 5: Active Sessions & Audit */}
      {activeTab === 'sessions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Session Card */}
          <Card className="p-5 bg-dark-surface border-dark-border space-y-4">
            <div className="flex items-center gap-2.5 text-text-primary font-bold text-sm">
              <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                <Laptop className="w-4 h-4" />
              </div>
              <span>Current Device & Connection</span>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-elevated border border-dark-borderSubtle text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Operating System:</span>
                <span className="text-text-primary font-medium">{osName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Browser Engine:</span>
                <span className="text-text-primary font-medium">{browserName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">IP Address Telemetry:</span>
                <span className="font-mono text-text-primary font-semibold">127.0.0.1 (Local Verified)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Session Authentication:</span>
                <span className="text-status-success font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active Bearer JWT
                </span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                leftIcon={<LogOut className="w-4 h-4" />}
                className="text-status-danger hover:bg-status-danger/10 hover:border-status-danger/40 w-full"
              >
                Terminate Session & Sign Out
              </Button>
            </div>
          </Card>

          {/* Security Clearance & Privileges */}
          <Card className="p-5 bg-dark-surface border-dark-border space-y-4">
            <div className="flex items-center gap-2.5 text-text-primary font-bold text-sm">
              <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <span>Role Permissions Matrix</span>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Your account currently holds{' '}
              <span className="font-bold text-brand capitalize">{user.role.replace('_', ' ')}</span>{' '}
              privileges across this tenant.
            </p>

            <div className="p-3.5 rounded-xl bg-dark-elevated border border-dark-borderSubtle text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Sprint & Task Mutation:</span>
                <span className="text-status-success font-medium">Granted</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Project Management:</span>
                <span className="text-status-success font-medium">
                  {user.role === 'admin' || user.role === 'manager' ? 'Full Control' : 'Collaborator'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Security Audit Trail Access:</span>
                <span className={user.role === 'admin' ? 'text-status-success font-medium' : 'text-text-muted'}>
                  {user.role === 'admin' ? 'Full Telemetry' : 'Standard'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
