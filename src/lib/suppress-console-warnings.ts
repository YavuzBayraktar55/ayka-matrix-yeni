/**
 * Development modunda gereksiz konsol uyarılarını susturur
 * Bu dosya sadece geliştirme sırasında kullanılır
 */

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Sayfa yüklenir yüklenmez çalışır
  const originalWarn = console.warn;
  const originalLog = console.log;
  const originalError = console.error;

  // React DevTools ve layout-router uyarılarını sustur
  console.warn = function(...args: any[]) {
    const message = String(args[0] || '');
    
    // Susturulacak mesajlar
    const suppressedPatterns = [
      'Download the React DevTools',
      'Skipping auto-scroll behavior',
      'Node cannot be found in the current page',
      'position: sticky',
      'position: fixed',
      'shouldSkipElement',
    ];
    
    const shouldSuppress = suppressedPatterns.some(pattern => 
      message.includes(pattern)
    );
    
    if (!shouldSuppress) {
      originalWarn.apply(console, args);
    }
  };

  console.log = function(...args: any[]) {
    const message = String(args[0] || '');
    
    // Susturulacak log mesajları
    const suppressedPatterns = [
      'Skipping auto-scroll',
      'shouldSkipElement',
      '[Fast Refresh] rebuilding',
      '[Fast Refresh] done',
    ];
    
    const shouldSuppress = suppressedPatterns.some(pattern => 
      message.includes(pattern)
    );
    
    if (!shouldSuppress) {
      originalLog.apply(console, args);
    }
  };

  // Stack trace'leri kısalt
  console.error = function(...args: any[]) {
    const message = String(args[0] || '');
    
    // Çok uzun stack trace'leri sustur
    if (message.includes('recursivelyTraverse') || 
        message.includes('commitLayoutEffect')) {
      return; // Tamamen sustur
    }
    
    originalError.apply(console, args);
  };

  console.info('🔇 Console filters active - React DevTools and layout warnings suppressed');
}

export {};
