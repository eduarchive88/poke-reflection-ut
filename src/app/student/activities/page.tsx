"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit, startAfter, queryEqual } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ChevronLeft, Filter, History, Search } from "lucide-react";

export default function StudentActivitiesPage() {
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
        fetchLogs(sessionData.studentId, "all");
    }, [router]);

    const fetchLogs = async (studentId: string, typeFilter: string) => {
        setLoading(true);
        try {
            let logQ;
            if (typeFilter === "all") {
                logQ = query(
                    collection(db, "student_logs"),
                    where("studentId", "==", studentId),
                    orderBy("createdAt", "desc"),
                    limit(50)
                );
            } else {
                logQ = query(
                    collection(db, "student_logs"),
                    where("studentId", "==", studentId),
                    where("type", "==", typeFilter),
                    orderBy("createdAt", "desc"),
                    limit(50)
                );
            }

            const logSnap = await getDocs(logQ);
            const list: any[] = [];
            logSnap.forEach(d => list.push({ id: d.id, ...d.data() }));
            setLogs(list);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getLogIcon = (type: string) => {
        switch (type) {
            case "reflection": return "https://play.pokemonshowdown.com/sprites/itemicons/town-map.png";
            case "candy_gain": return "https://play.pokemonshowdown.com/sprites/itemicons/rare-candy.png";
            case "pokemon_catch": return "https://play.pokemonshowdown.com/sprites/itemicons/poke-ball.png";
            case "level_up": return "https://play.pokemonshowdown.com/sprites/itemicons/exp-share.png";
            case "battle_friendly":
            case "battle_gym": return "https://play.pokemonshowdown.com/sprites/itemicons/vs-seeker.png";
            case "layoff_start": return "https://play.pokemonshowdown.com/sprites/itemicons/revive.png";
            default: return "https://play.pokemonshowdown.com/sprites/itemicons/star-piece.png";
        }
    };

    const filterOptions = [
        { label: "전체", value: "all" },
        { label: "성찰일지", value: "reflection" },
        { label: "캔디획득", value: "candy_gain" },
        { label: "포켓몬획득", value: "pokemon_catch" },
        { label: "레벨업", value: "level_up" },
        { label: "배틀", value: "battle_friendly" },
        { label: "휴직", value: "layoff_start" },
    ];

    if (!session) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    className="retro-btn"
                    onClick={() => router.push("/student")}
                >
                    <ChevronLeft className="w-4 h-4 mr-1" /> 돌아가기
                </Button>
                <div className="text-right">
                    <h2 className="text-3xl font-black italic tracking-tighter">ACTIVITY HISTORY</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">나의 모든 활동 기록</p>
                </div>
            </div>

            {/* Filters */}
            <Card className="retro-box bg-slate-100 dark:bg-slate-800 border-4 border-black">
                <div className="retro-box-inner"></div>
                <div className="relative z-10 p-4 flex flex-wrap gap-2">
                    {filterOptions.map((opt) => (
                        <Button
                            key={opt.value}
                            variant={filter === opt.value ? "default" : "outline"}
                            size="sm"
                            className={`retro-btn text-xs ${filter === opt.value ? 'bg-black text-white hover:bg-slate-800' : 'bg-white hover:bg-slate-100 text-black'}`}
                            onClick={() => {
                                setFilter(opt.value);
                                fetchLogs(session.studentId, opt.value);
                            }}
                        >
                            {opt.label}
                        </Button>
                    ))}
                </div>
            </Card>

            {/* Log List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-slate-200 animate-pulse border-4 border-black" />
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-20 border-4 border-dashed border-slate-300 bg-white dark:bg-slate-900 rounded">
                        <img src="https://play.pokemonshowdown.com/sprites/itemicons/old-amber.png" className="w-16 h-16 mx-auto grayscale opacity-50 mb-4" style={{ imageRendering: 'pixelated' }} />
                        <p className="text-slate-500 font-bold uppercase tracking-widest">활동 기록이 없습니다.</p>
                    </div>
                ) : (
                    logs.map((log, index) => (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card className="retro-box overflow-hidden group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                <div className="retro-box-inner"></div>
                                <div className="relative z-10 p-5 flex items-start gap-5">
                                    <div className="p-2 border-4 border-black bg-white shadow-[4px_4px_0px_#000] shrink-0 group-hover:scale-110 transition-transform">
                                        <img src={getLogIcon(log.type)} className="w-8 h-8" style={{ imageRendering: 'pixelated' }} alt="type" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-xl font-black italic tracking-tight text-blue-600 dark:text-blue-400">
                                                {log.title}
                                            </h4>
                                            <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 border-2 border-black">
                                                {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : "..."}
                                            </span>
                                        </div>
                                        <p className="text-sm font-bold leading-relaxed text-slate-700 dark:text-slate-300">
                                            {log.description}
                                        </p>
                                        {log.details && (
                                            <div className="mt-2 pt-2 border-t-2 border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 text-[10px] font-black uppercase">
                                                {Object.entries(log.details).map(([key, value]: [string, any]) => (
                                                    <span key={key} className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded border border-black/10">
                                                        {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="pt-12 mt-12 border-t-4 border-black border-dashed text-center space-y-2">
                <p className="text-sm font-black tracking-widest text-slate-500 uppercase">
                    만든 사람: 경기도 지구과학 교사 뀨짱
                </p>
                <div className="flex justify-center gap-6">
                    <a href="https://open.kakao.com/o/s7hVU65h" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 hover:underline">
                        문의: 카카오톡 오픈채팅
                    </a>
                    <a href="https://eduarchive.tistory.com/" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-600 hover:underline">
                        블로그: 뀨짱쌤의 교육자료 아카이브
                    </a>
                </div>
            </div>
        </div>
    );
}
