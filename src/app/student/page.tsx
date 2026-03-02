"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PenTool, Target, History, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export const dynamic = 'force-dynamic';

export default function StudentDashboard() {
    const router = useRouter();
    const [session, setSession] = useState<any>(null);
    const [recentReflections, setRecentReflections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const sessionStr = localStorage.getItem("poke_student_session");
        if (!sessionStr) {
            router.push("/login");
            return;
        }
        const sessionData = JSON.parse(sessionStr);
        setSession(sessionData);
        fetchData(sessionData.studentId);
    }, [router]);

    const fetchData = async (studentId: string) => {
        try {
            const q = query(
                collection(db, "reflections"),
                where("studentId", "==", studentId),
                orderBy("createdAt", "desc"),
                limit(3)
            );
            const snapshots = await getDocs(q);
            const list: any[] = [];
            snapshots.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
            setRecentReflections(list);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!session) return null;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative z-10">
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter pokemon-gradient-text flex items-center gap-3 italic">
                        <Sparkles className="h-10 w-10 text-yellow-500 animate-bounce" />
                        반가워요, {session.studentInfo.name}님!
                    </h2>
                    <p className="text-slate-400 mt-2 text-lg font-medium opacity-80 backdrop-blur-sm inline-block px-3 py-1 rounded-full bg-slate-900/40 border border-slate-800/50">
                        {session.className}의 성실한 트레이너 ✨
                    </p>
                </div>
                <Link href="/student/write">
                    <Button size="lg" className="h-14 px-8 text-lg font-bold gap-2 shadow-lg hover:scale-105 transition-transform">
                        <PenTool className="h-5 w-5" />
                        오늘의 성찰 쓰기
                    </Button>
                </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="premium-card group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity rotate-12">
                        <PenTool className="h-32 w-32" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-2xl font-black text-white italic">
                            나의 기록 현황
                        </CardTitle>
                        <CardDescription className="text-slate-400 font-bold text-xs">
                            꾸준한 성찰은 포켓몬을 강하게 합니다!
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <span className="text-sm font-black text-[#ffde00] uppercase tracking-widest">주간 목표 달성도</span>
                                <span className="text-2xl font-black text-white">{recentReflections.length} / 5</span>
                            </div>
                            <div className="h-6 w-full bg-slate-900/60 rounded-full border-2 border-[#3b4cca]/30 p-1 overflow-hidden shadow-inner">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (recentReflections.length / 5) * 100)}%` }}
                                    className="h-full bg-gradient-to-r from-[#3b4cca] to-[#ffde00] rounded-full shadow-[0_0_15px_rgba(59,76,202,0.5)]"
                                />
                            </div>
                            <p className="text-xs text-slate-400 text-center font-bold italic">
                                "{recentReflections.length < 5 ? "조금만 더 힘내면 새로운 포켓몬이 찾아올지도 몰라요!" : "대단해요! 목표를 달성했습니다!"}"
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <History className="h-5 w-5 text-primary" />
                            최근 기록
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-4 text-muted-foreground animate-pulse">정보 로딩 중...</div>
                        ) : recentReflections.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground bg-secondary/20 rounded-lg border border-dashed">
                                아직 작성된 기록이 없습니다.<br />
                                첫 성찰 일기를 써보세요!
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentReflections.map((ref) => (
                                    <div key={ref.id} className="p-3 bg-card border rounded-lg hover:bg-secondary/20 transition-colors">
                                        <p className="line-clamp-1 text-sm">{ref.content}</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            {ref.createdAt?.toDate ? ref.createdAt.toDate().toLocaleDateString() : "방금 전"}
                                        </p>
                                    </div>
                                ))}
                                <Button variant="link" className="w-full text-xs" onClick={() => router.push("/student/archive")}>
                                    전체 보기
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
