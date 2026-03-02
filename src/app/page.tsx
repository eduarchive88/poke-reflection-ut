"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, User } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function Home() {
  const [studentSession, setStudentSession] = useState<any>(null);

  useEffect(() => {
    const session = localStorage.getItem("poke_student_session");
    if (session) {
      setStudentSession(JSON.parse(session));
    }
  }, []);
  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] text-center space-y-12 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#3b4cca]/10 rounded-full blur-[120px] -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-[#ffde00]/5 rounded-full blur-[100px] -z-10 animate-pulse"></div>

      <div className="space-y-6 max-w-4xl px-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/40 border border-slate-700/50 backdrop-blur-xl mb-4 animate-bounce">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">The Ultimate Experience</span>
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-tight drop-shadow-2xl">
          <span className="text-white">Poke-Reflection</span><br />
          <span className="pokemon-gradient-text italic">Ultimate Edition</span>
        </h1>

        <p className="text-lg md:text-2xl text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed tracking-tight">
          선생님과 학생이 함께하는 스마트 성찰 플랫폼.<br />
          오늘의 성실한 배움이 당신의 포켓몬을 강하게 성장시킵니다.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 pt-4 w-full max-w-md px-6">
        {studentSession ? (
          <Link href="/student" className="flex-1 group">
            <Button size="lg" className="pokeball-button h-24 w-full text-2xl shadow-[0_15px_40px_rgba(255,0,0,0.5)]">
              <div className="flex items-center gap-4">
                <User className="h-10 w-10 p-2 bg-white/20 rounded-full" />
                <div className="text-left">
                  <p className="text-[10px] uppercase tracking-widest opacity-80">Welcome back, {studentSession.studentInfo.name}</p>
                  <p>나의 대시보드로 이동</p>
                </div>
              </div>
              <ArrowRight className="ml-auto h-8 w-8 group-hover:translate-x-2 transition-transform" />
            </Button>
          </Link>
        ) : (
          <Link href="/login" className="flex-1">
            <Button size="lg" className="pokeball-button h-20 w-full text-2xl shadow-[0_10px_30px_rgba(255,0,0,0.4)]">
              로그인하여 시작하기
              <ArrowRight className="ml-3 h-8 w-8 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 pt-12">
        {[
          { label: "실시간 성찰 트래킹", color: "text-emerald-500" },
          { label: "포켓몬 콜렉션 시스템", color: "text-amber-500" },
          { label: "스타디움 대전 결과 로그", color: "text-rose-500" },
          { label: "엑셀 통합 리포트 지원", color: "text-blue-500" }
        ].map((feat, i) => (
          <div key={i} className="px-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm">
            <p className={`text-[11px] font-black uppercase tracking-tighter ${feat.color}`}>{feat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
