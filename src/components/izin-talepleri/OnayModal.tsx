'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

interface FullIzinTalep {
  TalepID: number;
  PersonelTcKimlik: number;
  IzinTuru: string;
  BaslangicTarihi: string;
  BitisTarihi: string;
  GunSayisi: number;
  PersonelInfo?: {
    P_AdSoyad: string;
  };
}

interface OnayModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTalep: FullIzinTalep;
  onayFormData: {
    isApprove: boolean;
    not: string;
  };
  setOnayFormData: (data: { isApprove: boolean; not: string }) => void;
  handleOnayReddet: () => void;
  getIzinTuruLabel: (tur: string) => string;
}

export function OnayModal({
  isOpen,
  onClose,
  selectedTalep,
  onayFormData,
  setOnayFormData,
  handleOnayReddet,
  getIzinTuruLabel
}: OnayModalProps) {
  const [mounted, setMounted] = useState(false);
  const { isDark } = useTheme();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] overflow-hidden" style={{ position: 'fixed', bottom: '60px' }}>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{ position: 'fixed', bottom: '60px' }}
      />
      <div 
        className={cn(
          'rounded-none shadow-2xl w-full overflow-y-auto backdrop-blur-xl animate-scale-in',
          isDark ? 'bg-gray-800/95' : 'bg-white/95'
        )}
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: '60px',
          width: '100%',
          zIndex: 10000
        }}
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
              {onayFormData.isApprove ? 'Talebi Onayla' : 'Talebi Reddet'}
            </h2>
            <button
              onClick={onClose}
              className={cn(
                'w-12 h-10 flex items-center justify-center transition-all hover:bg-red-600 hover:text-white',
                isDark ? 'text-gray-300' : 'text-gray-600'
              )}
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 max-w-2xl mx-auto">
            <div className={cn(
              'p-4 rounded-xl border',
              isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
            )}>
              <p className={cn('text-sm mb-1', isDark ? 'text-gray-400' : 'text-gray-600')}>Personel:</p>
              <p className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                {selectedTalep.PersonelInfo?.P_AdSoyad}
              </p>
              <p className={cn('text-sm mt-2 mb-1', isDark ? 'text-gray-400' : 'text-gray-600')}>İzin Türü:</p>
              <p className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                {getIzinTuruLabel(selectedTalep.IzinTuru)}
              </p>
              <p className={cn('text-sm mt-2 mb-1', isDark ? 'text-gray-400' : 'text-gray-600')}>Süre:</p>
              <p className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                {new Date(selectedTalep.BaslangicTarihi).toLocaleDateString('tr-TR')} - 
                {new Date(selectedTalep.BitisTarihi).toLocaleDateString('tr-TR')} ({selectedTalep.GunSayisi} gün)
              </p>
            </div>

            <div>
              <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-gray-300' : 'text-gray-700')}>
                Not {onayFormData.isApprove ? '(Opsiyonel)' : '*'}
              </label>
              <textarea
                required={!onayFormData.isApprove}
                value={onayFormData.not}
                onChange={(e) => setOnayFormData({ ...onayFormData, not: e.target.value })}
                rows={4}
                className={cn(
                  'w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500',
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                )}
                placeholder={onayFormData.isApprove ? "Onay notu ekleyin..." : "Red sebebini açıklayın..."}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'flex-1 px-6 py-3 rounded-xl transition-colors',
                  isDark 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                )}
              >
                İptal
              </button>
              <button
                onClick={handleOnayReddet}
                className={cn(
                  "flex-1 px-6 py-3 text-white rounded-xl hover:shadow-lg transition-all",
                  onayFormData.isApprove
                    ? "bg-gradient-to-r from-green-500 to-emerald-500"
                    : "bg-gradient-to-r from-red-500 to-pink-500"
                )}
              >
                {onayFormData.isApprove ? 'Onayla' : 'Reddet'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
