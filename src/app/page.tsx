import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6">
      <h1 className="text-5xl font-extrabold tracking-tight text-primary">
        Poke-Reflection Ultimate
      </h1>
      <p className="text-xl text-muted-foreground max-w-2xl">
        오늘 하루 배운 것, 느낀 점을 기록하고
        포켓몬과 함께 나만의 도감을 채워보세요!
      </p>

      <div className="flex gap-4 pt-8">
        <Link href="/login">
          <Button size="lg" className="w-40 text-lg">시작하기</Button>
        </Link>
      </div>

      <footer className="mt-20 pt-8 border-t text-center text-sm text-muted-foreground space-y-2 w-full max-w-2xl">
        <p>만든 사람: 경기도 지구과학 교사 뀨짱</p>
        <div className="flex justify-center gap-4">
          <a href="https://open.kakao.com/o/s7hVU65h" target="_blank" rel="noopener noreferrer" className="hover:text-primary underline transition-colors">
            문의: 카카오톡 오픈채팅
          </a>
          <a href="https://eduarchive.tistory.com/" target="_blank" rel="noopener noreferrer" className="hover:text-primary underline transition-colors">
            뀨짱쌤의 교육자료 아카이브
          </a>
        </div>
      </footer>
    </div>
  );
}
