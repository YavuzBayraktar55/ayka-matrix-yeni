'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Mail, Lock, AlertCircle, Moon, Sun, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Loader from '@/components/Loader';

// Mascot removed per request — logo will be shown in the header area instead.

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, user, loading: authLoading } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const supabase = createClient();

  // Zaten giriş yapmışsa veya giriş yapınca dashboard'a yönlendir
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const result = await signIn(email, password);

    if (result.success) {
      setLoading(false);
    } else {
      setError(result.error || 'Giriş başarısız');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccess('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
      setEmail('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Şifre sıfırlama başarısız');
    } finally {
      setLoading(false);
    }
  };

  // Auth yüklenirken loading göster
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#2a2a2a] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Loading Content */}
        <div className="relative z-10">
          <Loader />
        </div>
      </div>
    );
  }

  // Zaten giriş yapmışsa hiçbir şey render etme
  if (user) {
    return null;
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'} transition-all duration-500 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden`}>
      {/* Windows 11 Acrylic Background Effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute -top-1/2 -left-1/2 w-full h-full rounded-full blur-3xl opacity-20 ${isDark ? 'bg-blue-600' : 'bg-blue-400'}`}></div>
        <div className={`absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full blur-3xl opacity-20 ${isDark ? 'bg-purple-600' : 'bg-purple-400'}`}></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`fixed top-6 right-6 z-50 p-3 rounded-xl ${isDark ? 'bg-white/10 hover:bg-white/20 backdrop-blur-xl' : 'bg-white hover:bg-gray-50'} shadow-lg transition-all duration-200 hover:scale-110 border ${isDark ? 'border-white/20' : 'border-gray-200'}`}
          title={isDark ? 'Açık Mod' : 'Koyu Mod'}
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-yellow-300" />
          ) : (
            <Moon className="w-5 h-5 text-gray-700" />
          )}
        </button>

        {/* Windows 11 Style Card */}
        <div className={`${isDark ? 'bg-white/10 backdrop-blur-2xl border-white/20' : 'bg-white/90 backdrop-blur-xl border-gray-200'} rounded-2xl shadow-2xl overflow-hidden border transition-all duration-500`}>
          
          {/* Header */}
          <div className={`${isDark ? 'bg-gradient-to-r from-green-200/10 to-green-300/10 border-white/10' : 'bg-gradient-to-r from-green-50/60 to-green-100/30 border-gray-200'} border-b p-0 text-center transition-all duration-500 h-20 sm:h-24 flex items-center justify-center`}>
            {/* Center logo and fill header vertically; add 7px outer margin */}
            <img src="/logo.png" alt="Ayka Logo" className="h-full w-auto object-contain m-[7px]" />
          </div>

          {/* Content Area */}
          <div className="p-6 sm:p-8">
            {/* Success Message */}
            {success && (
              <div className={`mb-6 p-4 rounded-xl ${isDark ? 'bg-green-900/20 border-green-800/30' : 'bg-green-50 border-green-200'} border flex items-start gap-3 animate-fade-in transition-all duration-500`}>
                <CheckCircle className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'} flex-shrink-0 mt-0.5 transition-colors duration-500`} />
                <p className={`${isDark ? 'text-green-300' : 'text-green-700'} text-sm transition-colors duration-500`}>{success}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className={`mb-6 p-4 rounded-xl ${isDark ? 'bg-red-900/20 border-red-800/30' : 'bg-red-50 border-red-200'} border flex items-start gap-3 animate-fade-in transition-all duration-500`}>
                <AlertCircle className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-600'} flex-shrink-0 mt-0.5 transition-colors duration-500`} />
                <p className={`${isDark ? 'text-red-300' : 'text-red-700'} text-sm transition-colors duration-500`}>{error}</p>
              </div>
            )}

            {/* Login Form */}
            {!showResetPassword ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Input */}
                <div>
                  <label htmlFor="email" className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 transition-colors duration-500`}>
                    E-posta Adresi
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className={`h-5 w-5 ${isDark ? 'text-gray-500' : 'text-gray-400'} transition-colors duration-500`} />
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={`w-full pl-12 pr-4 py-3 ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-500`}
                      placeholder="ornek@aykaenerji.com"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label htmlFor="password" className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 transition-colors duration-500`}>
                    Şifre
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className={`h-5 w-5 ${isDark ? 'text-gray-500' : 'text-gray-400'} transition-colors duration-500`} />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className={`w-full pl-12 pr-12 py-3 ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-500`}
                      placeholder="••••••••"
                    />

                    {/* Show / Hide password button */}
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className={`p-2 rounded-md transition-colors duration-150 ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Forgot Password Link */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(true)}
                    className={`text-sm ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors duration-200`}
                  >
                    Şifremi Unuttum
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                >
                  {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                </button>
              </form>
            ) : (
              /* Reset Password Form */
              <form onSubmit={handleResetPassword} className="space-y-5">
                {/* Email Input */}
                <div>
                  <label htmlFor="reset-email" className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 transition-colors duration-500`}>
                    E-posta Adresi
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className={`h-5 w-5 ${isDark ? 'text-gray-500' : 'text-gray-400'} transition-colors duration-500`} />
                    </div>
                    <input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={`w-full pl-12 pr-4 py-3 ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-500`}
                      placeholder="ornek@aykaenerji.com"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                >
                  {loading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
                </button>

                {/* Back to Login */}
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPassword(false);
                    setError('');
                    setSuccess('');
                  }}
                  className={`w-full py-3 px-4 ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2`}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Giriş Sayfasına Dön
                </button>
              </form>
            )}

            {/* Test credentials removed for production */}
          </div>

          {/* Footer */}
          <div className={`px-6 py-4 ${isDark ? 'bg-white/5' : 'bg-gray-50'} transition-all duration-500`}>
            <p className={`text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} transition-colors duration-500`}>
              2025 Ayka Enerji Matrix Sistemleri All rights reserved
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
