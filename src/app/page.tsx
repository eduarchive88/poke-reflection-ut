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
    </div>
  );
}
