import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Kılavuz markdown dosyasını indir
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'SABLON_DEGISKENLER_KILAVUZU.md');
    
    // Dosya var mı kontrol et
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ 
        error: 'Kılavuz dosyası bulunamadı' 
      }, { status: 404 });
    }

    // Dosyayı oku
    const fileContent = fs.readFileSync(filePath);

    // Response oluştur
    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': 'attachment; filename="Sablon_Degiskenler_Kilavuzu.md"',
        'Content-Length': fileContent.length.toString()
      }
    });

  } catch (error) {
    console.error('❌ Kılavuz indirme hatası:', error);
    return NextResponse.json({ 
      error: 'Kılavuz indirilirken hata oluştu',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
