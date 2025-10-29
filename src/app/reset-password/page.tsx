'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { Lock, AlertCircle, CheckCircle, Moon, Sun, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Handle the password reset token from URL
    const handleToken = async () => {
      // Supabase sends token in hash fragment (#access_token=...&type=recovery)
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      console.log('🔑 Token type:', type);
      console.log('🔑 Access token:', accessToken ? 'Found' : 'Not found');

      if (type === 'recovery' && accessToken) {
        // Set the session with the recovery token
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (error) {
          console.error('❌ Session set error:', error);
          setError('Geçersiz veya süresi dolmuş sıfırlama bağlantısı. Lütfen tekrar deneyin.');
        } else {
          console.log('✅ Session set successfully');
        }
      } else {
        // No token in URL, check if we already have a session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('❌ No session found');
          setError('Geçersiz veya süresi dolmuş sıfırlama bağlantısı. Lütfen tekrar deneyin.');
        } else {
          console.log('✅ Existing session found');
        }
      }
    };
    handleToken();
  }, [supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Şifre değiştirme başarısız');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f]' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'} transition-all duration-500 flex items-center justify-center p-4 sm:p-8`}>
        <div className={`${isDark ? 'bg-white/10 backdrop-blur-2xl border-white/20' : 'bg-white/90 backdrop-blur-xl border-gray-200'} rounded-2xl shadow-2xl p-8 max-w-md w-full border text-center`}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
            Şifreniz Değiştirildi!
          </h2>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
            Şifreniz başarıyla değiştirildi. Giriş sayfasına yönlendiriliyorsunuz...
          </p>
          <div className="animate-pulse">
            <div className={`h-1 w-full ${isDark ? 'bg-white/10' : 'bg-gray-200'} rounded-full overflow-hidden`}>
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 animate-[loading_3s_ease-in-out]"></div>
            </div>
          </div>
        </div>
      </div>
    );
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
          <div className={`${isDark ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-white/10' : 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-gray-200'} border-b px-6 py-8 text-center transition-all duration-500`}>
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-0.5">
              <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center">
                <Lock className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2 transition-colors duration-500`}>
              Yeni Şifre Belirle
            </h1>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} transition-colors duration-500`}>
              Hesabınız için yeni bir şifre oluşturun
            </p>
          </div>

          {/* Content Area */}
          <div className="p-6 sm:p-8">
            {/* Error Message */}
            {error && (
              <div className={`mb-6 p-4 rounded-xl ${isDark ? 'bg-red-900/20 border-red-800/30' : 'bg-red-50 border-red-200'} border flex items-start gap-3 animate-fade-in transition-all duration-500`}>
                <AlertCircle className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-600'} flex-shrink-0 mt-0.5 transition-colors duration-500`} />
                <p className={`${isDark ? 'text-red-300' : 'text-red-700'} text-sm transition-colors duration-500`}>{error}</p>
              </div>
            )}

            {/* Reset Password Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Password Input */}
              <div>
                <label htmlFor="password" className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 transition-colors duration-500`}>
                  Yeni Şifre
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
                    placeholder="En az 6 karakter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className={`h-5 w-5 ${isDark ? 'text-gray-500' : 'text-gray-400'} transition-colors duration-500`} />
                    ) : (
                      <Eye className={`h-5 w-5 ${isDark ? 'text-gray-500' : 'text-gray-400'} transition-colors duration-500`} />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div>
                <label htmlFor="confirm-password" className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 transition-colors duration-500`}>
                  Yeni Şifre (Tekrar)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className={`h-5 w-5 ${isDark ? 'text-gray-500' : 'text-gray-400'} transition-colors duration-500`} />
                  </div>
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={`w-full pl-12 pr-12 py-3 ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-500`}
                    placeholder="Şifrenizi tekrar girin"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className={`h-5 w-5 ${isDark ? 'text-gray-500' : 'text-gray-400'} transition-colors duration-500`} />
                    ) : (
                      <Eye className={`h-5 w-5 ${isDark ? 'text-gray-500' : 'text-gray-400'} transition-colors duration-500`} />
                    )}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-900/20 border-blue-800/30' : 'bg-blue-50 border-blue-200'} border transition-all duration-500`}>
                <p className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'} transition-colors duration-500`}>
                  <strong>Şifre Gereksinimleri:</strong>
                  <br />• En az 6 karakter uzunluğunda olmalı
                  <br />• Güvenli bir şifre için büyük/küçük harf, rakam ve özel karakter kullanın
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
              >
                {loading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
              </button>
            </form>
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
