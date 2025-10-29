'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { createClient } from '@/lib/supabase/client';
import { BolgeInfo } from '@/types/database';
import { MapPin, Plus, Edit, Trash2, Search, X } from 'lucide-react';

export const dynamic = 'force-dynamic';

// Singleton Supabase client
const supabase = createClient();

export default function BolgelerPage() {
  const { isDark } = useTheme();
  const [bolgeler, setBolgeler] = useState<BolgeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBolge, setEditingBolge] = useState<BolgeInfo | null>(null);

  const [formData, setFormData] = useState({
    BolgeAdi: '',
    BolgeSicilNo: '',
    BolgeAdres: '',
    BolgeIL: '',
    BolgeSGKkodu: '',
  });

  useEffect(() => {
    fetchBolgeler();
  }, []);

  const fetchBolgeler = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('BolgeInfo')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBolgeler(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const bolgeData = {
      BolgeAdi: formData.BolgeAdi,
      BolgeSicilNo: formData.BolgeSicilNo,
      BolgeAdres: formData.BolgeAdres,
      BolgeIL: formData.BolgeIL,
      BolgeSGKkodu: formData.BolgeSGKkodu ? parseInt(formData.BolgeSGKkodu) : null,
    };

    if (editingBolge) {
      // Güncelleme
      const { error } = await supabase
        .from('BolgeInfo')
        .update(bolgeData)
        .eq('BolgeID', editingBolge.BolgeID);

      if (!error) {
        fetchBolgeler();
        closeModal();
      }
    } else {
      // Yeni ekleme
      const { error } = await supabase.from('BolgeInfo').insert([bolgeData]);

      if (!error) {
        fetchBolgeler();
        closeModal();
      }
    }
  };

  const handleEdit = (bolge: BolgeInfo) => {
    setEditingBolge(bolge);
    setFormData({
      BolgeAdi: bolge.BolgeAdi || '',
      BolgeSicilNo: bolge.BolgeSicilNo || '',
      BolgeAdres: bolge.BolgeAdres || '',
      BolgeIL: bolge.BolgeIL || '',
      BolgeSGKkodu: bolge.BolgeSGKkodu?.toString() || '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Bu bölgeyi silmek istediğinizden emin misiniz?')) {
      const { error } = await supabase.from('BolgeInfo').delete().eq('BolgeID', id);

      if (!error) {
        fetchBolgeler();
      }
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingBolge(null);
    setFormData({
      BolgeAdi: '',
      BolgeSicilNo: '',
      BolgeAdres: '',
      BolgeIL: '',
      BolgeSGKkodu: '',
    });
  };

  const filteredBolgeler = bolgeler.filter((bolge) =>
    bolge.BolgeAdi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bolge.BolgeIL?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={['yonetici', 'insan_kaynaklari']}>
      <DashboardLayout>
        {loading ? (
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6 sm:p-8 border shadow-sm`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>Bölgeler</h1>
                <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Tüm bölgeleri yönetin</p>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                <span>Yeni Bölge</span>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-4 border shadow-sm`}>
            <div className="relative">
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Bölge adı veya il ile ara..."
                className={`w-full pl-12 pr-4 py-3 ${isDark ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
          </div>

          {/* Table */}
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl overflow-hidden border shadow-sm`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${isDark ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b`}>
                  <tr>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Bölge Adı</th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Sicil No</th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>İl</th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>SGK Kodu</th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Adres</th>
                    <th className={`px-6 py-4 text-right text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>İşlemler</th>
                  </tr>
                </thead>
                <tbody className={`${isDark ? 'divide-gray-700' : 'divide-gray-200'} divide-y`}>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className={`px-6 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Yükleniyor...
                      </td>
                    </tr>
                  ) : filteredBolgeler.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={`px-6 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Bölge bulunamadı
                      </td>
                    </tr>
                  ) : (
                    filteredBolgeler.map((bolge) => (
                      <tr key={bolge.BolgeID} className={`${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} transition-colors`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-sm">
                              <MapPin className="w-5 h-5 text-white" />
                            </div>
                            <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-medium`}>{bolge.BolgeAdi}</span>
                          </div>
                        </td>
                        <td className={`px-6 py-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{bolge.BolgeSicilNo || '-'}</td>
                        <td className={`px-6 py-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{bolge.BolgeIL || '-'}</td>
                        <td className={`px-6 py-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{bolge.BolgeSGKkodu || '-'}</td>
                        <td className={`px-6 py-4 ${isDark ? 'text-gray-400' : 'text-gray-600'} max-w-xs truncate`}>{bolge.BolgeAdres || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(bolge)}
                              className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'} transition-colors`}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(bolge.BolgeID)}
                              className={`p-2 rounded-lg ${isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-50 text-red-600 hover:bg-red-100'} transition-colors`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {/* Modal */}
        {modalOpen && (
          <BolgeFormModal
            isOpen={modalOpen}
            onClose={closeModal}
            editingBolge={editingBolge}
            formData={formData}
            setFormData={setFormData}
            handleSubmit={handleSubmit}
            isDark={isDark}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BolgeFormModal({ isOpen, onClose, editingBolge, formData, setFormData, handleSubmit, isDark }: any) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999]" style={{ bottom: '60px' }}>
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm" 
        style={{ bottom: '60px' }}
        onClick={onClose}
      />
      <div style={{ position: 'fixed', top: 0, left: 0, bottom: '60px', width: '100%', zIndex: 10000, overflowY: 'auto' }}>
        <div className="min-h-full p-4 sm:p-8 flex items-center justify-center">
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border shadow-2xl p-6 sm:p-8 w-full max-w-2xl`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingBolge ? 'Bölge Düzenle' : 'Yeni Bölge Ekle'}
              </h2>
              <button
                onClick={onClose}
                className="w-12 h-10 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors rounded"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Bölge Adı *
                </label>
                <input
                  type="text"
                  required
                  value={formData.BolgeAdi}
                  onChange={(e) => setFormData({ ...formData, BolgeAdi: e.target.value })}
                  className={`w-full px-4 py-3 ${isDark ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Ankara Bölgesi"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Sicil No
                  </label>
                  <input
                    type="text"
                    value={formData.BolgeSicilNo}
                    onChange={(e) => setFormData({ ...formData, BolgeSicilNo: e.target.value })}
                    className={`w-full px-4 py-3 ${isDark ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="12345"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    İl
                  </label>
                  <input
                    type="text"
                    value={formData.BolgeIL}
                    onChange={(e) => setFormData({ ...formData, BolgeIL: e.target.value })}
                    className={`w-full px-4 py-3 ${isDark ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Ankara"
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  SGK Kodu
                </label>
                <input
                  type="number"
                  value={formData.BolgeSGKkodu}
                  onChange={(e) => setFormData({ ...formData, BolgeSGKkodu: e.target.value })}
                  className={`w-full px-4 py-3 ${isDark ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="123456"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Adres
                </label>
                <textarea
                  value={formData.BolgeAdres}
                  onChange={(e) => setFormData({ ...formData, BolgeAdres: e.target.value })}
                  rows={3}
                  className={`w-full px-4 py-3 ${isDark ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Bölge adresi..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className={`flex-1 px-6 py-3 ${isDark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'} rounded-lg transition-colors`}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  {editingBolge ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
