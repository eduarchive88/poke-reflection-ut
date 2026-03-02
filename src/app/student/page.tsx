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

    const menuItems = [
        {
            name: "성찰 일지 쓰기",
            description: "오늘의 배움과 마음을 기록하고 포켓몬을 획득하세요.",
            path: "/student/write",
            icon: <PenTool className="h-8 w-8 text-blue-400" />,
            color: "from-blue-600/20 to-indigo-600/20",
            borderColor: "border-blue-500/30",
            lightColor: "text-blue-400"
        },
        {
            name: "기록 보관함",
            description: "차곡차곡 쌓인 나의 성장을 다시 돌아보세요.",
            path: "/student/archive",
            icon: <Archive className="h-8 w-8 text-emerald-400" />,
            color: "from-emerald-600/20 to-teal-600/20",
            borderColor: "border-emerald-500/30",
            lightColor: "text-emerald-400"
        },
        {
            name: "포켓몬 도감",
            description: "수집한 포켓몬을 강화하고 팀을 구성하세요.",
            path: "/student/pokedex",
            icon: <BookHeart className="h-8 w-8 text-rose-400" />,
            color: "from-rose-600/20 to-pink-600/20",
            borderColor: "border-rose-500/30",
            lightColor: "text-rose-400"
        },
        {
            name: "포켓몬 체육관",
            description: "마스터가 되어 체육관을 지키고 보상을 받으세요.",
            path: "/student/gym",
            icon: <Trophy className="h-8 w-8 text-amber-400" />,
            color: "from-amber-600/20 to-yellow-600/20",
            borderColor: "border-amber-500/30",
            lightColor: "text-amber-400"
        },
        {
            name: "친구와 친선경기",
            description: "친구들의 포켓몬과 실력을 겨뤄보세요.",
            path: "/student/friendly",
            icon: <Users className="h-8 w-8 text-violet-400" />,
            color: "from-violet-600/20 to-purple-600/20",
            borderColor: "border-violet-500/30",
            lightColor: "text-violet-400"
        }
    ];

    if (!session) return null;

    return (
        <div className="max-w-7xl mx-auto space-y-10 py-4 pb-20">
            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0a1128]/90 via-[#001233]/80 to-[#0a1128]/90 p-8 sm:p-12 border border-white/10 shadow-2xl"
            >
                {/* Decorative Elements */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#ffde00]/10 rounded-full blur-[80px] animate-pulse"></div>
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#3b4cca]/10 rounded-full blur-[80px]"></div>

                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-12">
                    <div className="space-y-6 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ffde00]/10 border border-[#ffde00]/20 text-[#ffde00] text-[10px] font-black uppercase tracking-widest mb-2">
                            <Sparkles className="h-3 w-3" />
                            Elite Trainer Hub
                        </div>
                        <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tighter leading-tight italic">
                            안녕하세요, <span className="pokemon-gradient-text">{session.studentInfo?.name || "트레이너"}님!</span><br />
                            <span className="text-3xl sm:text-4xl text-slate-400 not-italic">오늘도 성장을 향해 나아가보아요.</span>
                        </h2>
                        <p className="text-slate-400 text-sm sm:text-base font-medium max-w-xl">
                            나만의 포켓몬과 함께 성찰하고 성장하는 공간입니다.<br />
                            매일의 기록을 통해 진정한 포켓몬 마스터로 거듭나세요! ✨
                        </p>
                    </div>

                    {/* Progress Card */}
                    <Card className="w-full lg:w-96 bg-white/5 backdrop-blur-2xl border-white/10 rounded-[2rem] p-8 shadow-2xl relative group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#3b4cca]/10 to-[#ffde00]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <div className="relative z-10 space-y-6">
                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-[#ffde00] uppercase tracking-widest block opacity-70">Weekly Mission</span>
                                    <span className="text-4xl font-black text-white italic tracking-tighter">
                                        {recentReflections.length} <span className="text-sm text-slate-500 not-italic">/ 5</span>
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Status</span>
                                    <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${recentReflections.length >= 5 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                        {recentReflections.length >= 5 ? "MISSION COMPLETE" : "IN TRAINING"}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="h-3 w-full bg-slate-950 rounded-full border border-white/10 p-0.5 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, (recentReflections.length / 5) * 100)}%` }}
                                        className="h-full bg-gradient-to-r from-[#3b4cca] via-[#ffde00] to-[#ff9500] rounded-full shadow-[0_0_15px_rgba(255,222,0,0.4)]"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold italic text-center">
                                    {recentReflections.length < 5
                                        ? `앞으로 ${5 - recentReflections.length}번 더 기록하면 주간 보상을 받을 수 있어요!`
                                        : "이번 주 목표 달성! 대단합니다 트레이너님! 🍭"}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </motion.div>

            {/* Menu Hub Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuItems.map((item, index) => (
                    <motion.div
                        key={item.path}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Link href={item.path}>
                            <Card className={`group relative h-full bg-gradient-to-br ${item.color} border-2 ${item.borderColor} hover:scale-[1.03] transition-all duration-300 cursor-pointer overflow-hidden rounded-[2.5rem] shadow-xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]`}>
                                <CardContent className="p-8 flex flex-col items-center text-center h-full">
                                    <div className={`p-4 bg-slate-900/80 rounded-[1.5rem] mb-6 border border-white/5 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 shadow-xl`}>
                                        {item.icon}
                                    </div>
                                    <h3 className="text-2xl font-black text-white italic tracking-tighter mb-3 group-hover:text-white transition-colors">
                                        {item.name}
                                    </h3>
                                    <p className="text-sm font-medium text-slate-400 leading-relaxed mb-8">
                                        {item.description}
                                    </p>
                                    <div className="mt-auto w-full group/btn">
                                        <div className="w-full h-12 bg-white/5 group-hover/btn:bg-white/10 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-white/20 transition-all flex items-center gap-2">
                                            GO TRAINING
                                            <ChevronRight className="h-4 w-4 transform group-hover/btn:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </CardContent>
                                {/* Decorative bar */}
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </Card>
                        </Link>
                    </motion.div>
                ))}

                {/* Recent Activity Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <Card className="h-full bg-slate-900/40 border-2 border-slate-800/50 backdrop-blur-md rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none group-hover:opacity-[0.07] transition-opacity">
                            <History className="h-32 w-32" />
                        </div>
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                    <History className="h-5 w-5 text-indigo-400" />
                                </div>
                                <h3 className="text-lg font-black italic tracking-tighter text-white">최근 활동 기록</h3>
                            </div>

                            <div className="flex-1 space-y-4">
                                {loading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />
                                        ))}
                                    </div>
                                ) : recentReflections.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-white/5 rounded-[2rem] opacity-50">
                                        <PenTool className="h-8 w-8 text-slate-600 mb-2" />
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">No Records Yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {recentReflections.map((ref) => (
                                            <div key={ref.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-default">
                                                <p className="line-clamp-1 text-xs font-semibold text-slate-300">{ref.content}</p>
                                                <p className="text-[9px] font-black text-slate-600 uppercase mt-2 tracking-widest">
                                                    {ref.createdAt?.toDate ? ref.createdAt.toDate().toLocaleDateString() : "RECENT"}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                className="mt-6 w-full h-11 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
                                onClick={() => router.push("/student/archive")}
                            >
                                View Full Archive
                            </Button>
                        </div>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
