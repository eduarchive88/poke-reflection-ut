import { NextResponse } from 'next/server';

export async function GET() {
    // Vercel 서버의 현재 시간을 반환
    // 클라이언트의 조작된 시간을 방지하기 위해 사용
    const now = new Date();
    
    return NextResponse.json({
        now: now.toISOString(),
        date: now.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'Asia/Seoul'
        }).replace(/\. /g, '-').replace(/\./g, ''), // YYYY-MM-DD 형식 시도
        rawDate: now.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })
    });
}
