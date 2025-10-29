// macOS Dashboard Sayfa Şablonu
// Tüm dashboard sayfalarında kullanılacak ortak class'lar

export const macOSClasses = {
  // Ana wrapper
  window: 'MacOSWindow',
  
  // Kart container'lar
  card: (isDark: boolean) => 
    `${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6 border shadow-sm`,
  
  cardHeader: (isDark: boolean) =>
    `${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`,
  
  // Text styles
  heading: (isDark: boolean) => 
    `text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`,
  
  subheading: (isDark: boolean) =>
    `text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`,
  
  text: (isDark: boolean) =>
    `${isDark ? 'text-gray-300' : 'text-gray-600'}`,
  
  mutedText: (isDark: boolean) =>
    `${isDark ? 'text-gray-400' : 'text-gray-500'}`,
  
  // Form elements
  input: (isDark: boolean) =>
    `w-full px-3 py-2 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`,
  
  select: (isDark: boolean) =>
    `w-full px-3 py-2 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`,
  
  textarea: (isDark: boolean) =>
    `w-full px-3 py-2 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none`,
  
  // Buttons
  primaryButton: 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2',
  
  secondaryButton: (isDark: boolean) =>
    `px-4 py-2 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'} border rounded-lg transition-colors`,
  
  dangerButton: 'px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm transition-all',
  
  // Table
  table: (isDark: boolean) =>
    `w-full ${isDark ? 'text-white' : 'text-gray-900'}`,
  
  tableHeader: (isDark: boolean) =>
    `${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border-b`,
  
  tableRow: (isDark: boolean) =>
    `${isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'} border-b transition-colors`,
  
  // Modal
  modalOverlay: 'fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4',
  
  modalContent: (isDark: boolean) =>
    `${isDark ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'} rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border shadow-2xl`,
  
  modalHeader: (isDark: boolean) =>
    `${isDark ? 'bg-gradient-to-b from-[#3d3d3d] to-[#2d2d2d] border-gray-700' : 'bg-gradient-to-b from-gray-100 to-gray-50 border-gray-200'} border-b px-6 py-4 flex items-center justify-between`,
  
  modalTitle: (isDark: boolean) =>
    `text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'} absolute left-1/2 transform -translate-x-1/2`,
  
  // Search
  searchInput: (isDark: boolean) =>
    `w-full pl-12 pr-4 py-3 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500`,
  
  // Stats card
  statsCard: (isDark: boolean) =>
    `${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6 border shadow-sm hover:scale-[1.02] transition-transform duration-200`,
};
