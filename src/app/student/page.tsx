"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    PenTool, Archive, BookHeart, Trophy,
    Users, History, ArrowRight, Sparkles,
    Star, LayoutDashboard, ChevronRight
} from "lucide-react";
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
            // 이번 주 월요일 0시 기준 (주간 성찰 카운팅용)
            // 간단하게 최근 5개 중 이번 주 것만 필터링하거나, 쿼리 자체에 시간 조건 추가
            const now = new Date();
            const day = now.getDay(); // 0(일) ~ 6(토)
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // 이번 주 월요일
            const monday = new Date(now.setDate(diff));
            monday.setHours(0, 0, 0, 0);

            const q = query(
                collection(db, "reflections"),
                where("studentId", "==", studentId),
                where("createdAt", ">=", monday),
                orderBy("createdAt", "desc")
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

    const menuItems = [
        {
            name: "성찰 일지 쓰기",
            description: "오늘의 배움을 기록하고 새로운 포켓몬 동료를 만나보세요.",
            path: "/student/write",
            icon: <PenTool className="h-12 w-12" />,
            color: "from-blue-600/20 to-indigo-600/20",
            iconColor: "text-blue-600 dark:text-blue-400",
            bgColor: "bg-blue-600/10",
            hoverAccent: "group-hover:border-blue-500/50"
        },
        {
            name: "기록 보관함",
            description: "나의 성장이 담긴 소중한 기록들을 한곳에서 확인하세요.",
            path: "/student/archive",
            icon: <Archive className="h-12 w-12" />,
            color: "from-emerald-600/20 to-teal-600/20",
            iconColor: "text-emerald-600 dark:text-emerald-400",
            bgColor: "bg-emerald-600/10",
            hoverAccent: "group-hover:border-emerald-500/50"
        },
        {
            name: "포켓몬 도감",
            description: "나와 함께하는 포켓몬들의 능력치를 확인하고 관리하세요.",
            path: "/student/pokedex",
            icon: <BookHeart className="h-12 w-12" />,
            color: "from-rose-600/20 to-pink-600/20",
            iconColor: "text-rose-600 dark:text-rose-400",
            bgColor: "bg-rose-600/10",
            hoverAccent: "group-hover:border-rose-500/50"
        },
        {
            name: "포켓몬 체육관",
            description: "최고의 트레이너들과 경쟁하여 체육관을 차지하세요.",
            path: "/student/gym",
            icon: <Trophy className="h-12 w-12" />,
            color: "from-amber-600/20 to-yellow-600/20",
            iconColor: "text-amber-600 dark:text-amber-400",
            bgColor: "bg-amber-600/10",
            hoverAccent: "group-hover:border-amber-500/50"
        },
        {
            name: "친선 경기",
            description: "친구들의 포켓몬과 실시간으로 대결을 신청해보세요.",
            path: "/student/friendly",
            icon: <Users className="h-12 w-12" />,
            color: "from-violet-600/20 to-purple-600/20",
            iconColor: "text-violet-600 dark:text-violet-400",
            bgColor: "bg-violet-600/10",
            hoverAccent: "group-hover:border-violet-500/50"
        }
    ];

    if (!session) return null;

    return (
        <div className="space-y-12">
            {/* Header Hero */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative min-h-[400px] rounded-[3.5rem] overflow-hidden bg-card border border-border/50 shadow-2xl flex items-center"
            >
                {/* Background Decorations */}
                <div className="absolute inset-0 cute-dots"></div>
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none"></div>
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary/5 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="relative z-10 w-full px-8 sm:px-16 flex flex-col lg:flex-row justify-between items-center gap-12 py-16">
                    <div className="space-y-8 text-center lg:text-left">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-[0.3em] dark:bg-secondary/10 dark:text-secondary dark:border-secondary/20"
                        >
                            <Sparkles className="h-4 w-4" />
                            Elite Trainer Hub
                        </motion.div>

                        <div className="space-y-4">
                            <h2 className="text-5xl sm:text-7xl font-black tracking-tighter leading-tight italic py-2">
                                Hello,<br />
                                <span className="pokemon-gradient-text sm:text-7xl whitespace-nowrap">
                                    {session.studentInfo?.name || "Trainer"}!
                                </span>
                            </h2>
                            <p className="text-muted-foreground text-base sm:text-lg font-medium max-w-xl">
                                나만의 포켓몬과 함께 성찰하고 성장하는 공간입니다.<br />
                                오늘도 성실함으로 진정한 포켓몬 마스터에 한 발짝 다가가보세요!
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                            <Button
                                size="lg"
                                className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black text-lg hover:scale-[1.05] transition-transform shadow-xl"
                                onClick={() => router.push("/student/write")}
                            >
                                <PenTool className="mr-3 h-5 w-5" />
                                오늘 기록하기
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="h-14 px-8 rounded-2xl border-2 font-black text-lg hover:bg-muted transition-all"
                                onClick={() => router.push("/student/archive")}
                            >
                                지난 기록 보기
                            </Button>
                        </div>
                    </div>

                    {/* Weekly Status Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full lg:w-[450px]"
                    >
                        <Card className="stat-card-premium relative group overflow-hidden border-2">
                            {/* Progress Ring Background */}
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform duration-700">
                                <Trophy className="h-40 w-40" />
                            </div>

                            <div className="relative z-10 space-y-10 p-4">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] block">Weekly Achievement</span>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-7xl font-black text-foreground italic tracking-tighter">
                                                {recentReflections.length}
                                            </span>
                                            <span className="text-2xl font-bold text-muted-foreground">/ 3</span>
                                        </div>
                                    </div>
                                    <div className="p-5 bg-primary/10 rounded-[2rem] dark:bg-secondary/10 shadow-inner">
                                        <BookHeart className="h-10 w-10 text-primary dark:text-secondary" />
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div className="h-5 w-full bg-muted rounded-full p-1 overflow-hidden border-2 border-border/50">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, (recentReflections.length / 3) * 100)}%` }}
                                            className="h-full bg-gradient-to-r from-primary via-blue-400 to-primary dark:from-secondary dark:via-yellow-300 dark:to-secondary rounded-full shadow-[0_0_20px_rgba(59,76,202,0.4)] dark:shadow-[0_0_20px_rgba(255,222,0,0.4)]"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-xs font-black text-muted-foreground uppercase tracking-[0.1em]">
                                            {recentReflections.length >= 3 ? "CHAMPION STATUS ATTAINED! 🏆" : `${3 - recentReflections.length} More logs to go`}
                                        </span>
                                        <span className="text-lg font-black text-primary dark:text-secondary italic">
                                            {Math.floor((recentReflections.length / 3) * 100)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            </motion.div>

            {/* Menu Sections */}
            <div className="space-y-8">
                <div className="flex items-center gap-4">
                    <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-border to-transparent"></div>
                    <h3 className="text-sm font-black text-muted-foreground uppercase tracking-[0.4em] text-center">TRAINER SERVICES</h3>
                    <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-border to-transparent"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {menuItems.map((item, index) => (
                        <motion.div
                            key={item.path}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="h-full"
                        >
                            <Link href={item.path} className="block h-full group">
                                <Card className={`premium-card h-full p-10 flex flex-col border-2 border-transparent transition-all duration-500 ${item.hoverAccent} hover:scale-[1.02]`}>
                                    <div className={`w-24 h-24 mb-10 rounded-[2.5rem] flex items-center justify-center ${item.bgColor} border-2 border-border/30 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-lg`}>
                                        <div className={item.iconColor}>
                                            {item.icon}
                                        </div>
                                    </div>

                                    <div className="space-y-4 flex-1">
                                        <h3 className="text-3xl font-black tracking-tighter italic text-foreground flex items-center gap-3">
                                            {item.name}
                                            <ArrowRight className="h-8 w-8 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary dark:text-secondary" />
                                        </h3>
                                        <p className="text-muted-foreground text-lg font-medium leading-relaxed">
                                            {item.description}
                                        </p>
                                    </div>

                                    <div className="mt-12 pt-8 border-t border-border/50 flex justify-between items-center opacity-70 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Launch Module</span>
                                        <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground dark:group-hover:bg-secondary dark:group-hover:text-secondary-foreground transition-all duration-300">
                                            <ChevronRight className="h-5 w-5" />
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        </motion.div>
                    ))}

                    {/* Recent News/Activity Feed Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <Card className="premium-card h-full p-10 flex flex-col bg-muted/20 border-2 border-dashed border-border group">
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 rounded-3xl bg-primary/10 dark:bg-secondary/10 shadow-inner border border-border/50">
                                        <History className="h-8 w-8 text-primary dark:text-secondary" />
                                    </div>
                                    <h3 className="text-2xl font-black italic tracking-tighter">최근 활동</h3>
                                </div>
                                <Button variant="ghost" size="icon" className="rounded-2xl w-12 h-12 hover:bg-background border border-border/50" onClick={() => router.push("/student/archive")}>
                                    <ArrowRight className="h-6 w-6" />
                                </Button>
                            </div>

                            <div className="flex-1 space-y-4">
                                {loading ? (
                                    Array(3).fill(0).map((_, i) => (
                                        <div key={i} className="h-20 bg-background/50 rounded-3xl animate-pulse border border-border/30" />
                                    ))
                                ) : recentReflections.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-6 py-12 border-2 border-dashed border-border rounded-[3rem]">
                                        <PenTool className="h-16 w-16" />
                                        <p className="text-sm font-black uppercase tracking-[0.2em]">No data logs found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {recentReflections.map((ref) => (
                                            <motion.div
                                                key={ref.id}
                                                whileHover={{ x: 10 }}
                                                className="p-6 bg-card rounded-[2rem] border border-border/50 hover:border-primary/30 hover:shadow-xl transition-all cursor-pointer shadow-sm"
                                                onClick={() => router.push("/student/archive")}
                                            >
                                                <p className="line-clamp-1 text-lg font-bold text-foreground/90 leading-tight mb-3">{ref.content}</p>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                        <Star className="h-3 w-3 text-secondary fill-secondary" />
                                                        {ref.createdAt?.toDate ? ref.createdAt.toDate().toLocaleDateString() : "RECENT ACTIVITY"}
                                                    </span>
                                                    <span className="text-[10px] font-black text-primary dark:text-secondary uppercase">View Log</span>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
