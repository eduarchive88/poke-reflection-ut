"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ChevronLeft, Filter, History, Calendar, Info } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function ActivitiesPage() {
    const router = useRouter();
    const [session, setSession] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        const sessionStr = localStorage.getItem("poke_student_session");
        if (!sessionStr) {
            router.push("/login");
            return;
        }
        const sessionData = JSON.parse(sessionStr);
        setSession(sessionData);
        fetchLogs(sessionData.studentId);
    }, [router]);

    const fetchLogs = async (studentId: string) => {
        try {
            const q = query(
                collection(db, "student_logs"),
                where("studentId", "==", studentId)
            );
            const querySnapshot = await getDocs(q);
            const logsData: any[] = [];
            querySnapshot.forEach((doc) => {
                logsData.push({ id: doc.id, ...doc.data() });
            });
            logsData.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
            setLogs(logsData.slice(0, 50));
        } catch (error) {
            console.error("Error fetching logs:", error);
            toast.error("활동 기록을 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const getLogIcon = (type: string) => {
        switch (type) {
            case "reflection": return "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/town-map.png";
            case "candy_gain": return "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.png";
            case "pokemon_catch": return "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png";
            case "level_up": return "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/exp-share.png";
            case "battle_friendly":
            case "battle_gym": return "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/vs-seeker.png";
            case "layoff_start": return "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/revive.png";
            default: return "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/star-piece.png";
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case "reflection": return "bg-blue-100 dark:bg-blue-900/30 text-blue-600";
            case "pokemon_catch": return "bg-red-100 dark:bg-red-900/30 text-red-600";
            case "level_up": return "bg-green-100 dark:bg-green-900/30 text-green-600";
            case "candy_gain": return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600";
            case "battle_friendly":
            case "battle_gym": return "bg-purple-100 dark:bg-purple-900/30 text-purple-600";
            default: return "bg-slate-100 dark:bg-slate-800 text-slate-600";
        }
    };

    const filteredLogs = filter === "all" ? logs : logs.filter(log => {
        if (filter === "pokemon") return log.type === "pokemon_catch" || log.type === "level_up";
        if (filter === "battle") return log.type === "battle_friendly" || log.type === "battle_gym";
        return log.type === filter;
    });

    const filters = [
        { id: "all", label: "전체" },
        { id: "reflection", label: "성찰" },
        { id: "pokemon", label: "포켓몬" },
        { id: "candy_gain", label: "캔디" },
        { id: "battle", label: "배틀" },
    ];

    if (!session) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/student")}
                        className="retro-btn w-10 h-10 p-0 bg-white dark:bg-slate-800 border-2 border-black shadow-[2px_2px_0px_#000]"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-black italic tracking-tighter flex items-center gap-3">
                            <History className="h-8 w-8 text-blue-600" />
                            활동 기록 타임라인
                        </h2>
                        <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest mt-1">
                            Trainer: {session.studentInfo?.name}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {filters.map((f) => (
                        <Button
                            key={f.id}
                            size="sm"
                            variant={filter === f.id ? "default" : "outline"}
                            onClick={() => setFilter(f.id)}
                            className={`retro-btn text-xs font-black h-8 px-4 ${filter === f.id ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-100 border-2 border-black shadow-[2px_2px_0px_#000]'}`}
                        >
                            {f.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="retro-box bg-white dark:bg-slate-900 p-4 border-2 border-black shadow-[4px_4px_0px_#000]">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-2">Total Activity</p>
                    <p className="text-2xl font-black italic leading-none">{logs.length}</p>
                </Card>
                <Card className="retro-box bg-white dark:bg-slate-900 p-4 border-2 border-black shadow-[4px_4px_0px_#000]">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-2">Reflections</p>
                    <p className="text-2xl font-black italic leading-none">{logs.filter(l => l.type === 'reflection').length}</p>
                </Card>
                <Card className="retro-box bg-white dark:bg-slate-900 p-4 border-2 border-black shadow-[4px_4px_0px_#000]">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-2">Pokemon</p>
                    <p className="text-2xl font-black italic leading-none">{logs.filter(l => l.type === 'pokemon_catch').length}</p>
                </Card>
                <Card className="retro-box bg-white dark:bg-slate-900 p-4 border-2 border-black shadow-[4px_4px_0px_#000]">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-2">Candy Gain</p>
                    <p className="text-2xl font-black italic leading-none">{logs.filter(l => l.type === 'candy_gain').reduce((acc, curr) => acc + (curr.details?.amount || 0), 0)}</p>
                </Card>
            </div>

            {/* Notice */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 p-4 rounded-xl flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-100">활동 기록 안내</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                        나의 모든 성장 기록이 이곳에 저장됩니다. 주간 목표는 매주 월요일 00:00에 초기화되며, 성찰 일지를 작성하면 자동으로 업데이트됩니다.
                    </p>
                </div>
            </div>

            {/* Timeline Area */}
            <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                {loading ? (
                    Array(5).fill(0).map((_, i) => (
                        <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl animate-pulse" />
                    ))
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-20 border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                        <History className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-bold italic tracking-tighter text-xl">기록된 활동이 없습니다.</p>
                    </div>
                ) : (
                    filteredLogs.map((log, index) => (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
                        >
                            {/* Dot */}
                            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800 shadow-md group-hover:scale-125 transition-transform z-10 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 overflow-hidden bg-white p-1">
                                <img src={getLogIcon(log.type)} className="w-full h-full object-contain pixelated" alt="icon" />
                            </div>

                            {/* Card content */}
                            <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 retro-box bg-white dark:bg-slate-900 border-2 border-black shadow-[4px_4px_0px_#000] hover:shadow-[8px_8px_0px_#000] hover:-translate-y-1 transition-all">
                                <div className="retro-box-inner"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded ${getTypeColor(log.type)} border border-current opacity-80`}>
                                            {log.type}
                                        </span>
                                        <time className="text-[10px] font-black text-slate-500 flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : "RECENT"}
                                        </time>
                                    </div>
                                    <h4 className="text-lg font-black italic tracking-tighter text-foreground mb-1">
                                        {log.title}
                                    </h4>
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-snug">
                                        {log.description}
                                    </p>

                                    {log.details && Object.keys(log.details).length > 0 && (
                                        <div className="mt-4 pt-4 border-t-2 border-dotted border-slate-200 dark:border-slate-700 flex flex-wrap gap-3">
                                            {Object.entries(log.details).map(([key, val]: [string, any]) => (
                                                <div key={key} className="flex flex-col">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{key}</span>
                                                    <span className="text-xs font-black text-blue-600 dark:text-blue-400">{String(val)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Bottom spacer */}
            <div className="h-20" />
        </div>
    );
}
