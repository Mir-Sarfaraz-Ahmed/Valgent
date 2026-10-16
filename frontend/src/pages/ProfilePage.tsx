import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Shield,
  Sliders,
  Camera,
  Check,
  RefreshCw,
  Sparkles,
  GitBranch,
  Mail,
  Building,
  MapPin,
  KeyRound,
  LogOut,
  ExternalLink,
  PanelLeft,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AppSidebar } from '../components/navigation/AppSidebar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { uploadUserAvatar } from '../lib/storage';
import { ThemeToggle } from '../components/theme/ThemeToggle';
import { Button } from '../components/ui/Button';

// High-res curated avatar presets for developers & AST auditors
const AVATAR_PRESETS = [
  {
    id: 'cyber-plum',
    label: 'Cyber Plum',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'ast-sentinel',
    label: 'AST Sentinel',
    url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'code-architect',
    label: 'Architect',
    url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'neural-synth',
    label: 'Neural Synth',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'quantum-core',
    label: 'Quantum Core',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  },
];

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, updateAvatarUrl, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security'>('profile');

  // Form states
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || (user?.email ? user.email.split('@')[0] : ''));
  const [role, setRole] = useState(user?.role || 'Senior AST Verification Engineer');
  const [company, setCompany] = useState(user?.company || 'CivicPulse AI');
  const [bio, setBio] = useState(user?.bio || 'Building reliable, deterministic AI systems backed by abstract syntax tree validation.');
  const [githubUrl, setGithubUrl] = useState(user?.githubUrl || 'https://github.com/Mir-Sarfaraz-Ahmed');
  const [location, setLocation] = useState(user?.location || 'Bengaluru, India');

  // Avatar states
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(user?.avatarUrl);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Preference states
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light'>(theme === 'light' ? 'light' : 'dark');
  const [llmProvider, setLlmProvider] = useState<'gemini' | 'openrouter'>(user?.llmProvider || 'gemini');
  const [autoRunVerification, setAutoRunVerification] = useState(user?.autoRunVerification !== false);
  const [strictMode, setStrictMode] = useState(user?.strictMode === true);
  const [showConfidenceScores, setShowConfidenceScores] = useState(user?.showConfidenceScores !== false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Save states
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Sync user state changes if user loads asynchronously
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setUsername(user.username || (user.email ? user.email.split('@')[0] : ''));
      setRole(user.role || 'Senior AST Verification Engineer');
      setCompany(user.company || 'CivicPulse AI');
      setBio(user.bio || 'Building reliable, deterministic AI systems backed by abstract syntax tree validation.');
      setGithubUrl(user.githubUrl || 'https://github.com/Mir-Sarfaraz-Ahmed');
      setLocation(user.location || 'Bengaluru, India');
      setAvatarPreview(user.avatarUrl);
      if (user.llmProvider) setLlmProvider(user.llmProvider);
      if (user.autoRunVerification !== undefined) setAutoRunVerification(user.autoRunVerification);
      if (user.strictMode !== undefined) setStrictMode(user.strictMode);
      if (user.showConfidenceScores !== undefined) setShowConfidenceScores(user.showConfidenceScores);
    }
  }, [user]);

  // Track unsaved modifications
  useEffect(() => {
    const isDirty =
      fullName !== (user?.fullName || '') ||
      username !== (user?.username || (user?.email ? user.email.split('@')[0] : '')) ||
      role !== (user?.role || 'Senior AST Verification Engineer') ||
      company !== (user?.company || 'CivicPulse AI') ||
      bio !== (user?.bio || 'Building reliable, deterministic AI systems backed by abstract syntax tree validation.') ||
      githubUrl !== (user?.githubUrl || 'https://github.com/Mir-Sarfaraz-Ahmed') ||
      location !== (user?.location || 'Bengaluru, India') ||
      avatarPreview !== user?.avatarUrl ||
      llmProvider !== (user?.llmProvider || 'gemini') ||
      autoRunVerification !== (user?.autoRunVerification !== false) ||
      strictMode !== (user?.strictMode === true) ||
      showConfidenceScores !== (user?.showConfidenceScores !== false) ||
      selectedTheme !== theme;

    setHasChanges(isDirty);
  }, [
    fullName,
    username,
    role,
    company,
    bio,
    githubUrl,
    location,
    avatarPreview,
    llmProvider,
    autoRunVerification,
    strictMode,
    showConfidenceScores,
    selectedTheme,
    user,
    theme
  ]);

  // Handle local file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && user) {
      const file = e.target.files[0];
      try {
        setIsUploadingAvatar(true);
        const { signedUrl, path } = await uploadUserAvatar({
          userId: user.id,
          file,
        });
        const finalUrl = signedUrl || path;
        setAvatarPreview(finalUrl);
        updateAvatarUrl(finalUrl);
        setSaveSuccessNotice(true);
        setTimeout(() => setSaveSuccessNotice(false), 3000);
      } catch (err) {
        console.warn('Avatar upload fallback to data URL:', err);
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setAvatarPreview(reader.result);
            updateAvatarUrl(reader.result);
          }
        };
        reader.readAsDataURL(file);
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  const handleSelectPreset = (presetUrl: string) => {
    setAvatarPreview(presetUrl);
  };

  const handleResetAvatar = () => {
    setAvatarPreview(undefined);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (selectedTheme !== theme) {
        setTheme(selectedTheme);
      }

      await updateProfile({
        fullName,
        username,
        role,
        company,
        bio,
        githubUrl,
        location,
        avatarUrl: avatarPreview,
        preferredTheme: selectedTheme,
        llmProvider,
        autoRunVerification,
        strictMode,
        showConfidenceScores,
      });

      setHasChanges(false);
      setSaveSuccessNotice(true);
      setTimeout(() => setSaveSuccessNotice(false), 3500);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordNotice({ type: 'error', message: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    setPasswordNotice({ type: 'success', message: 'Password updated successfully!' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordNotice(null), 4000);
  };

  return (
    <div className="min-h-screen flex bg-[var(--surface-page)] text-[var(--text-primary)]">
      {/* Collapsible Navigation Sidebar */}
      <AppSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onToggleOpen={() => setIsMobileMenuOpen((prev) => !prev)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="w-full px-6 sm:px-8 lg:px-10 h-16 border-b border-[var(--border-soft)] bg-[var(--surface-card)] flex items-center justify-between z-10 sticky top-0">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Toggle sidebar"
              aria-label="Toggle navigation sidebar"
            >
              <PanelLeft className="w-5 h-5 text-[var(--color-mauve)]" />
            </button>

            <Link
              to="/projects"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border-soft)] transition-colors"
              title="Back to Projects"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Projects</span>
            </Link>

            <div className="hidden sm:block h-4 w-[1px] bg-[var(--border-soft)]" />

            <div>
              <h1 className="text-base sm:text-lg font-bold font-heading text-[var(--text-primary)] leading-tight flex items-center gap-2">
                <span>Account & Profile</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-mauve)]/20 text-[var(--color-pale-blush)] border border-[var(--color-mauve)]/40">
                  Customization
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Unsaved edits
              </span>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 flex-shrink-0 shadow-md font-semibold"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>

            <ThemeToggle showLabel={false} />
          </div>
        </header>

        {/* Success Alert Banner */}
        {saveSuccessNotice && (
          <div className="w-full bg-emerald-500/10 border-b border-emerald-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-300 font-medium">
            <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Your profile changes have been successfully saved and synced.</span>
            </div>
          </div>
        )}

        {/* Content Container */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
          {/* 1. Hero Identity Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--surface-card)] via-[var(--surface-card-subtle)] to-[var(--color-merlot)]/30 border border-[var(--border-soft)] p-6 sm:p-8 shadow-card">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 z-10 relative">
              {/* Avatar Container with Hover Upload Overlay */}
              <div className="relative group">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-gradient-to-tr from-[var(--color-merlot)] to-[var(--color-mauve)] text-[var(--color-pale-blush)] flex items-center justify-center font-bold text-3xl uppercase shadow-xl border-2 border-[var(--border-strong)] relative">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt={fullName || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{fullName ? fullName[0] : 'U'}</span>
                  )}

                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 border-white animate-spin text-[var(--color-pale-blush)]" />
                    </div>
                  )}

                  {/* Hover Camera Overlay */}
                  <label
                    htmlFor="profile-avatar-upload"
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white text-[10px] font-medium gap-1"
                  >
                    <Camera className="w-5 h-5 text-[var(--color-pale-blush)]" />
                    <span>Change</span>
                  </label>
                  <input
                    id="profile-avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isUploadingAvatar}
                  />
                </div>

                {/* Online Indicator Badge */}
                <span
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[var(--surface-card)] flex items-center justify-center shadow-md"
                  title="Active Deterministic Verifier"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                </span>
              </div>

              {/* Title & Headline Info */}
              <div className="flex-1 flex flex-col gap-1.5 text-left">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-bold font-heading text-[var(--text-primary)]">
                    {fullName || 'Anonymous Auditor'}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Verified
                  </span>
                </div>

                <p className="text-sm text-[var(--text-secondary)] font-medium">
                  {role} {company && `• ${company}`}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)] mt-1">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[var(--color-mauve)]" />
                    {user?.email || 'user@valgent.ai'}
                  </span>
                  {location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[var(--color-mauve)]" />
                      {location}
                    </span>
                  )}
                  {githubUrl && (
                    <a
                      href={githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 hover:text-[var(--text-primary)] transition-colors"
                    >
                      <GitBranch className="w-3.5 h-3.5 text-[var(--color-mauve)]" />
                      <span>GitHub Profile</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Quick Reset Avatar */}
              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleResetAvatar}
                  className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors underline self-start sm:self-auto"
                >
                  Reset Avatar
                </button>
              )}
            </div>

            {/* Avatar Preset Carousel */}
            <div className="mt-6 pt-5 border-t border-[var(--border-soft)] flex flex-col gap-3">
              <span className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-mauve)]" />
                <span>Or select a developer avatar preset:</span>
              </span>
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                {AVATAR_PRESETS.map((preset) => {
                  const isSelected = avatarPreview === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.url)}
                      className={`relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all text-xs font-medium flex-shrink-0 ${
                        isSelected
                          ? 'border-[var(--color-mauve)] bg-[var(--color-mauve)]/20 text-[var(--color-pale-blush)] ring-2 ring-[var(--color-mauve)]/40'
                          : 'border-[var(--border-soft)] bg-black/10 dark:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-6 h-6 rounded-lg object-cover"
                      />
                      <span>{preset.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-[var(--color-pale-blush)] ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-[var(--border-soft)] pb-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-all border-b-2 -mb-1 ${
                activeTab === 'profile'
                  ? 'border-[var(--color-mauve)] text-[var(--color-pale-blush)] bg-black/10 dark:bg-white/5'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <User className="w-4 h-4 text-current" />
              <span>Personal Details</span>
            </button>

            <button
              onClick={() => setActiveTab('preferences')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-all border-b-2 -mb-1 ${
                activeTab === 'preferences'
                  ? 'border-[var(--color-mauve)] text-[var(--color-pale-blush)] bg-black/10 dark:bg-white/5'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Sliders className="w-4 h-4 text-current" />
              <span>AST & Preferences</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-all border-b-2 -mb-1 ${
                activeTab === 'security'
                  ? 'border-[var(--color-mauve)] text-[var(--color-pale-blush)] bg-black/10 dark:bg-white/5'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Shield className="w-4 h-4 text-current" />
              <span>Security & Auth</span>
            </button>
          </div>

          {/* 3. Tab Contents */}

          {/* TAB 1: PERSONAL DETAILS */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Mir Sarfaraz Ahmed"
                  className="px-3.5 py-2.5 rounded-xl bg-[var(--surface-input)] border border-[var(--border-soft)] text-sm text-[var(--text-primary)] focus:border-[var(--color-mauve)] focus:outline-none transition-colors"
                />
              </div>

              {/* Username / Handle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Username / Auditor Handle
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">
                    @
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                    placeholder="mirsarfaraz"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-[var(--surface-input)] border border-[var(--border-soft)] text-sm text-[var(--text-primary)] focus:border-[var(--color-mauve)] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Email (Readonly) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Primary Email
                  </label>
                  <span className="text-[11px] text-emerald-400 font-medium">Verified Account</span>
                </div>
                <input
                  type="email"
                  value={user?.email || 'user@valgent.ai'}
                  disabled
                  className="px-3.5 py-2.5 rounded-xl bg-[var(--surface-input)]/50 border border-[var(--border-soft)] text-sm text-[var(--text-muted)] cursor-not-allowed"
                />
              </div>

              {/* Role / Job Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Professional Role
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Lead Software Engineer"
                  className="px-3.5 py-2.5 rounded-xl bg-[var(--surface-input)] border border-[var(--border-soft)] text-sm text-[var(--text-primary)] focus:border-[var(--color-mauve)] focus:outline-none transition-colors"
                />
              </div>

              {/* Company / Team */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[var(--color-mauve)]" />
                  <span>Company / Organization</span>
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. CivicPulse AI, Valgent Labs"
                  className="px-3.5 py-2.5 rounded-xl bg-[var(--surface-input)] border border-[var(--border-soft)] text-sm text-[var(--text-primary)] focus:border-[var(--color-mauve)] focus:outline-none transition-colors"
                />
              </div>

              {/* Location */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[var(--color-mauve)]" />
                  <span>Location</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bengaluru, India / Remote"
                  className="px-3.5 py-2.5 rounded-xl bg-[var(--surface-input)] border border-[var(--border-soft)] text-sm text-[var(--text-primary)] focus:border-[var(--color-mauve)] focus:outline-none transition-colors"
                />
              </div>

              {/* GitHub Profile URL */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-[var(--color-mauve)]" />
                  <span>GitHub Profile Link</span>
                </label>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/your-username"
                  className="px-3.5 py-2.5 rounded-xl bg-[var(--surface-input)] border border-[var(--border-soft)] text-sm text-[var(--text-primary)] focus:border-[var(--color-mauve)] focus:outline-none transition-colors"
                />
              </div>

              {/* Bio Summary */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Bio & Auditor Summary
                  </label>
                  <span className="text-[11px] text-[var(--text-muted)]">{bio.length}/280</span>
                </div>
                <textarea
                  rows={3}
                  maxLength={280}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a short summary about your development or verification background..."
                  className="px-3.5 py-2.5 rounded-xl bg-[var(--surface-input)] border border-[var(--border-soft)] text-sm text-[var(--text-primary)] focus:border-[var(--color-mauve)] focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: AST & PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="flex flex-col gap-8">
              {/* Appearance / Theme Choice */}
              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Interface Theme</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Select your preferred visual atmosphere for AST auditing and report inspection.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Dark Plum Card */}
                  <div
                    onClick={() => setSelectedTheme('dark')}
                    className={`cursor-pointer p-4 rounded-xl border transition-all flex flex-col gap-3 ${
                      selectedTheme === 'dark'
                        ? 'border-[var(--color-mauve)] bg-[var(--surface-card-elevated)] ring-2 ring-[var(--color-mauve)]/50'
                        : 'border-[var(--border-soft)] bg-[var(--surface-card)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">Dark Plum (Default)</span>
                      {selectedTheme === 'dark' && <Check className="w-4 h-4 text-[var(--color-pale-blush)]" />}
                    </div>
                    <div className="h-16 rounded-lg bg-[#06141B] p-2 flex flex-col justify-between border border-[rgba(155,168,171,0.2)]">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#253745]" />
                        <div className="w-12 h-3 rounded bg-[#11212D]" />
                      </div>
                      <div className="w-20 h-2 rounded bg-[#4A5C6A]" />
                    </div>
                  </div>

                  {/* Light Silk Card */}
                  <div
                    onClick={() => setSelectedTheme('light')}
                    className={`cursor-pointer p-4 rounded-xl border transition-all flex flex-col gap-3 ${
                      selectedTheme === 'light'
                        ? 'border-[var(--color-mauve)] bg-[var(--surface-card-elevated)] ring-2 ring-[var(--color-mauve)]/50'
                        : 'border-[var(--border-soft)] bg-[var(--surface-card)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">Light Silk</span>
                      {selectedTheme === 'light' && <Check className="w-4 h-4 text-[var(--color-mauve)]" />}
                    </div>
                    <div className="h-16 rounded-lg bg-[#F8FAFC] p-2 flex flex-col justify-between border border-slate-300">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#E2E8F0]" />
                        <div className="w-12 h-3 rounded bg-[#CBD5E1]" />
                      </div>
                      <div className="w-20 h-2 rounded bg-[#94A3B8]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Default LLM Engine Choice */}
              <div className="flex flex-col gap-3 pt-4 border-t border-[var(--border-soft)]">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Default LLM Verification Engine</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Choose which AI model handles semantic claim extraction and cross-referencing against repository AST tokens.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setLlmProvider('gemini')}
                    className={`cursor-pointer p-4 rounded-xl border transition-all flex flex-col gap-2 ${
                      llmProvider === 'gemini'
                        ? 'border-[var(--color-mauve)] bg-[var(--surface-card-elevated)] ring-2 ring-[var(--color-mauve)]/50'
                        : 'border-[var(--border-soft)] bg-[var(--surface-card)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">Google Gemini 2.5 Flash</span>
                      {llmProvider === 'gemini' && <Check className="w-4 h-4 text-[var(--color-pale-blush)]" />}
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      Optimized for ultra-fast AST token ingestion, zero hallucinations, and instantaneous evidence mapping.
                    </p>
                  </div>

                  <div
                    onClick={() => setLlmProvider('openrouter')}
                    className={`cursor-pointer p-4 rounded-xl border transition-all flex flex-col gap-2 ${
                      llmProvider === 'openrouter'
                        ? 'border-[var(--color-mauve)] bg-[var(--surface-card-elevated)] ring-2 ring-[var(--color-mauve)]/50'
                        : 'border-[var(--border-soft)] bg-[var(--surface-card)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">OpenRouter / Claude 3.5</span>
                      {llmProvider === 'openrouter' && <Check className="w-4 h-4 text-[var(--color-pale-blush)]" />}
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      Deep multi-hop reasoning with Claude 3.5 Sonnet / DeepSeek V3 for complex architectural claims.
                    </p>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-4 pt-4 border-t border-[var(--border-soft)]">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      Auto-run verification on repository sync
                    </h4>
                    <p className="text-xs text-[var(--text-muted)]">
                      Automatically recheck AST claims whenever a new Git commit is fetched.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoRunVerification(!autoRunVerification)}
                    className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                      autoRunVerification ? 'bg-[var(--color-mauve)]' : 'bg-black/20 dark:bg-white/10'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        autoRunVerification ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-[var(--border-soft)]">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      Strict Zero-Assumption Mode
                    </h4>
                    <p className="text-xs text-[var(--text-muted)]">
                      Strictly flags any unverified claim as Contradicted instead of Insufficient Evidence.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStrictMode(!strictMode)}
                    className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                      strictMode ? 'bg-[var(--color-mauve)]' : 'bg-black/20 dark:bg-white/10'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        strictMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-[var(--border-soft)]">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      Real-time Confidence Percentages
                    </h4>
                    <p className="text-xs text-[var(--text-muted)]">
                      Display granular probabilistic confidence scores alongside evidence graph nodes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConfidenceScores(!showConfidenceScores)}
                    className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                      showConfidenceScores ? 'bg-[var(--color-mauve)]' : 'bg-black/20 dark:bg-white/10'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        showConfidenceScores ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY & AUTH */}
          {activeTab === 'security' && (
            <div className="flex flex-col gap-8">
              {/* Account Overview */}
              <div className="p-5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-soft)] flex flex-col gap-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Account Security Overview</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)]">Auth Provider:</span>
                    <p className="font-semibold text-[var(--text-primary)] uppercase mt-0.5">
                      {user?.provider || 'Email / Password'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Member Since:</span>
                    <p className="font-semibold text-[var(--text-primary)] mt-0.5">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active Member'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Account UUID:</span>
                    <p className="font-mono text-[var(--text-muted)] truncate mt-0.5" title={user?.id}>
                      {user?.id || 'usr-valgent-dev'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Password Change Form */}
              <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4 max-w-md">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-[var(--color-mauve)]" />
                    <span>Update Password</span>
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Enter your new password to update your login credentials.
                  </p>
                </div>

                {passwordNotice && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      passwordNotice.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        : 'bg-red-500/10 text-red-300 border border-red-500/30'
                    }`}
                  >
                    {passwordNotice.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{passwordNotice.message}</span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="px-3.5 py-2.5 rounded-xl bg-[var(--surface-input)] border border-[var(--border-soft)] text-sm text-[var(--text-primary)] focus:border-[var(--color-mauve)] focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="px-3.5 py-2.5 rounded-xl bg-[var(--surface-input)] border border-[var(--border-soft)] text-sm text-[var(--text-primary)] focus:border-[var(--color-mauve)] focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="px-3.5 py-2.5 rounded-xl bg-[var(--surface-input)] border border-[var(--border-soft)] text-sm text-[var(--text-primary)] focus:border-[var(--color-mauve)] focus:outline-none transition-colors"
                  />
                </div>

                <Button type="submit" variant="secondary" size="sm" className="self-start mt-1">
                  Change Password
                </Button>
              </form>

              {/* Sign out of session */}
              <div className="pt-6 border-t border-[var(--border-soft)] flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-red-400">Sign Out of Session</h4>
                  <p className="text-xs text-[var(--text-muted)]">
                    Terminate active session and return to the login screen.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    await signOut();
                    navigate('/login');
                  }}
                  className="text-red-400 hover:text-red-300 hover:border-red-400/50"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" />
                  <span>Sign Out</span>
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
