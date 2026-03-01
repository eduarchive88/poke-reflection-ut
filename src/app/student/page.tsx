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

export default function StudentDashboardPage() {
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
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-primary flex items-center gap-2">
                        <Sparkles className="h-8 w-8 text-yellow-500 animate-pulse" />
                        반가워요, {session.studentInfo.name}님!
                    </h2>
                    <p className="text-muted-foreground mt-2 text-lg">
                        {session.className}에서 포켓몬과 함께 성실하게 성장하고 있어요.
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
                <Card className="border-primary/20 bg-primary/5 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <PenTool className="h-24 w-24" />
                    </div>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            나의 기록 현황
                        </CardTitle>
                        <CardDescription>
                            지금까지 총 {recentReflections.length}개 이상의 소중한 기록을 남겼습니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm font-medium">
                                <span>주간 목표 달성도</span>
                                <span>{recentReflections.length} / 5</span>
                            </div>
                            <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (recentReflections.length / 5) * 100)}%` }}
                                    className="h-full bg-primary"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                조금 더 힘내면 새로운 포켓몬이 찾아올지도 몰라요!
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
