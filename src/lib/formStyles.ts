// Form Input Component - Dark Mode Uyumlu
// Personel formunda kullanmak için

export const inputClass = (isDark: boolean) => `
  w-full px-4 py-3 
  ${isDark 
    ? 'bg-white/10 border-white/20 text-white placeholder-white/50' 
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}
  border-2 rounded-xl 
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
  transition-colors duration-200
`.trim();

export const selectClass = (isDark: boolean) => `
  w-full px-4 py-3 
  ${isDark 
    ? 'bg-white/10 border-white/20 text-white' 
    : 'bg-white border-gray-300 text-gray-900'}
  border-2 rounded-xl 
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
  transition-colors duration-200
`.trim();

export const textareaClass = (isDark: boolean) => `
  w-full px-4 py-3 
  ${isDark 
    ? 'bg-white/10 border-white/20 text-white placeholder-white/50' 
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}
  border-2 rounded-xl 
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
  transition-colors duration-200
  resize-none
`.trim();

export const labelClass = (isDark: boolean) => `
  block text-sm font-semibold ${isDark ? 'text-white/90' : 'text-gray-800'} mb-2
`.trim();
