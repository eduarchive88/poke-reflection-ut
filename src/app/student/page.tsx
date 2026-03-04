"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PokemonImage } from "@/components/PokemonImage";

export const dynamic = 'force-dynamic';

export default function StudentDashboard() {
    const router = useRouter();
    const [session, setSession] = useState<any>(null);
    const [recentReflections, setRecentReflections] = useState<any[]>([]);
    const [recentLogs, setRecentLogs] = useState<any[]>([]);
    const [partnerPokemon, setPartnerPokemon] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const sessionStr = localStorage.getItem("poke_student_session");
        if (!sessionStr) {
            router.push("/login");
            return;
        }
        const sessionData = JSON.parse(sessionStr);
        setSession(sessionData);
        fetchData(sessionData.studentId, sessionData.classId);
    }, [router]);

    const fetchData = async (studentId: string, classId: string) => {
        try {
            // 이번 주 월요일 0시 기준 (주간 성찰 카운팅용)
            const now = new Date();
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(now);
            monday.setDate(diff);
            monday.setHours(0, 0, 0, 0);

            const q = query(
                collection(db, "reflections"),
                where("studentId", "==", studentId),
                where("createdAt", ">=", monday)
            );
            const snapshots = await getDocs(q);
            const list: any[] = [];
            snapshots.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
            setRecentReflections(list);

            // 최근 활동 로그 가져오기 (최신 6개)
            const logQ = query(
                collection(db, "student_logs"),
                where("studentId", "==", studentId),
                orderBy("createdAt", "desc"),
                limit(6)
            );
            const logSnap = await getDocs(logQ);
            const logs: any[] = [];
            logSnap.forEach(d => logs.push({ id: d.id, ...d.data() }));
            setRecentLogs(logs);

            // 파트너 포켓몬 가져오기 (가장 레벨이 높은 포켓몬)
            const pokeQ = query(collection(db, "pokemon_inventory"), where("studentId", "==", studentId));
            const pokeSnap = await getDocs(pokeQ);
            let myPoke: any[] = [];
            pokeSnap.forEach(d => myPoke.push({ id: d.id, ...d.data() }));
            if (myPoke.length > 0) {
                // 레벨 내림차순 정렬
                myPoke.sort((a, b) => (b.level || 1) - (a.level || 1));
                setPartnerPokemon(myPoke[0]);
            }

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

    const menuItems = [
        {
            name: "성찰 일지 쓰기",
            description: "오늘의 배움을 기록하고 새로운 포켓몬 동료를 만나보세요.",
            path: "/student/write",
            icon: <img src="https://play.pokemonshowdown.com/sprites/itemicons/poke-ball.png" className="w-12 h-12" style={{ imageRendering: 'pixelated' }} alt="Poke Ball" />,
            bgColor: "bg-red-100 dark:bg-red-900/40",
            hoverAccent: "hover:bg-red-50 dark:hover:bg-red-900/60"
        },
        {
            name: "활동 기록",
            description: "나의 모든 활동 내역을 상세하게 확인하세요.",
            path: "/student/activities",
            icon: <img src="https://play.pokemonshowdown.com/sprites/itemicons/journal.png" className="w-12 h-12" style={{ imageRendering: 'pixelated' }} alt="Journal" />,
            bgColor: "bg-blue-100 dark:bg-blue-900/40",
            hoverAccent: "hover:bg-blue-50 dark:hover:bg-blue-900/60"
        },
        {
            name: "기록 보관함",
            description: "나의 성장이 담긴 소중한 기록들을 한곳에서 확인하세요.",
            path: "/student/archive",
            icon: <img src="https://play.pokemonshowdown.com/sprites/itemicons/heavy-ball.png" className="w-12 h-12" style={{ imageRendering: 'pixelated' }} alt="Heavy Ball" />,
            bgColor: "bg-slate-200 dark:bg-slate-700",
            hoverAccent: "hover:bg-slate-100 dark:hover:bg-slate-600"
        },
        {
            name: "포켓몬 도감",
            description: "나와 함께하는 포켓몬들의 능력치를 확인하고 관리하세요.",
            path: "/student/pokedex",
            icon: <img src="https://play.pokemonshowdown.com/sprites/itemicons/safari-ball.png" className="w-12 h-12" style={{ imageRendering: 'pixelated' }} alt="Safari Ball" />,
            bgColor: "bg-green-100 dark:bg-green-900/40",
            hoverAccent: "hover:bg-green-50 dark:hover:bg-green-900/60"
        },
        {
            name: "포켓몬 체육관",
            description: "최고의 트레이너들과 경쟁하여 체육관을 차지하세요.",
            path: "/student/gym",
            icon: <img src="https://play.pokemonshowdown.com/sprites/itemicons/ultra-ball.png" className="w-12 h-12" style={{ imageRendering: 'pixelated' }} alt="Ultra Ball" />,
            bgColor: "bg-yellow-100 dark:bg-yellow-900/40",
            hoverAccent: "hover:bg-yellow-50 dark:hover:bg-yellow-900/60"
        },
        {
            name: "친선 경기",
            description: "친구들의 포켓몬과 실시간으로 대결을 신청해보세요.",
            path: "/student/friendly",
            icon: <img src="https://play.pokemonshowdown.com/sprites/itemicons/vs-seeker.png" className="w-12 h-12" style={{ imageRendering: 'pixelated' }} alt="Vs Seeker" />,
            bgColor: "bg-purple-100 dark:bg-purple-900/40",
            hoverAccent: "hover:bg-purple-50 dark:hover:bg-purple-900/60"
        }
    ];

    if (!session) return null;

    return (
        <div className="space-y-12 pb-12">
            {/* Header Hero */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="retro-box overflow-hidden flex items-center bg-blue-600 dark:bg-slate-800"
            >
                <div className="retro-box-inner border-blue-400 dark:border-slate-600"></div>
                {/* Background Decorations */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/10 to-transparent pointer-events-none"></div>

                <div className="relative z-10 w-full px-8 sm:px-16 flex flex-col lg:flex-row justify-between items-center gap-12 py-12 text-white">
                    <div className="space-y-6 text-center lg:text-left">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-1 bg-black/30 border-[3px] border-black text-white text-xs font-black uppercase tracking-[0.3em] shadow-[2px_2px_0px_#000]"
                        >
                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/exp-share.png" className="w-5 h-5" style={{ imageRendering: 'pixelated' }} alt="Exp Share" />
                            TRAINER ID CARD
                        </motion.div>

                        <div className="space-y-4">
                            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-tight italic py-2 drop-shadow-[4px_4px_0_rgba(0,0,0,0.5)] flex items-end gap-4 relative z-10">
                                <div>
                                    HELLO,<br />
                                    <span className="text-yellow-400 sm:text-7xl whitespace-nowrap" style={{ textShadow: '4px 4px 0px #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' }}>
                                        {session.studentInfo?.name || "Trainer"}!
                                    </span>
                                </div>

                                {partnerPokemon && (
                                    <div className="hidden sm:flex flex-col items-center drop-shadow-[4px_4px_0_rgba(0,0,0,0.5)] ml-4 translate-y-4">
                                        <div className="w-24 h-24 sm:w-32 sm:h-32 mb-[-10px] z-10">
                                            <PokemonImage
                                                id={partnerPokemon.pokemonId}
                                                name={partnerPokemon.koName || partnerPokemon.name}
                                                className="w-full h-full object-contain pixelated [transform:scaleX(-1)]"
                                            />
                                        </div>
                                        <div className="bg-white border-2 border-black px-2 py-0.5 z-20 shadow-[2px_2px_0_0_rgba(0,0,0,1)] text-black">
                                            <span className="text-xs font-black pixel-text uppercase">Lv.{partnerPokemon.level || 1} {partnerPokemon.koName || partnerPokemon.name}</span>
                                        </div>
                                    </div>
                                )}
                            </h2>
                            <p className="text-white text-sm sm:text-base font-medium max-w-xl bg-black/40 p-3 border-2 border-black rounded shadow-[2px_2px_0px_#000] pixel-text z-20 relative">
                                나와 포켓몬이 함께 성장하는 공간입니다.<br />
                                오늘도 성실함으로 진정한 포켓몬 마스터에 다가가보세요!
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                            <Button
                                size="lg"
                                className="retro-btn bg-yellow-400 text-black hover:bg-yellow-300 h-12 px-6"
                                onClick={() => router.push("/student/write")}
                            >
                                <img src="https://play.pokemonshowdown.com/sprites/itemicons/poke-ball.png" className="w-6 h-6 mr-2" style={{ imageRendering: 'pixelated' }} alt="icon" />
                                오늘 기록하기
                            </Button>
                            <Button
                                size="lg"
                                className="retro-btn bg-white text-black hover:bg-gray-200 h-12 px-6"
                                onClick={() => router.push("/student/activities")}
                            >
                                나의 활동 기록
                            </Button>
                        </div>
                    </div>

                    {/* Weekly Status Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full lg:w-[450px]"
                    >
                        <Card className="retro-box p-6 bg-white dark:bg-slate-800 text-black dark:text-white mt-4 lg:mt-0">
                            <div className="retro-box-inner"></div>
                            <div className="relative z-10 space-y-8">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <span className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block">WEEKLY ACHV.</span>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-6xl font-black italic tracking-tighter" style={{ textShadow: '3px 3px 0px rgba(0,0,0,0.1)' }}>
                                                {recentReflections.length}
                                            </span>
                                            <span className="text-2xl font-bold text-slate-400">/ 3</span>
                                        </div>
                                    </div>
                                    <div className="p-2 border-2 border-black bg-yellow-100 dark:bg-yellow-900/50 shadow-[2px_2px_0px_#000]">
                                        <img src="https://play.pokemonshowdown.com/sprites/itemicons/rare-candy.png" className="w-10 h-10" style={{ imageRendering: 'pixelated' }} alt="Rare Candy" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="h-6 w-full bg-slate-200 dark:bg-slate-700 border-2 border-black p-0.5 shadow-[inset_2px_2px_0px_rgba(0,0,0,0.2)]">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, (recentReflections.length / 3) * 100)}%` }}
                                            className="h-full bg-green-500 border-r-2 border-black shadow-[inset_0px_2px_0px_rgba(255,255,255,0.3)] transition-all duration-500"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                                            {recentReflections.length >= 3 ? "CHAMPION STATUS! 👑" : `${3 - recentReflections.length} MORE EXP NEEDED`}
                                        </span>
                                        <span className="text-sm font-black text-blue-600 dark:text-blue-400 italic">
                                            {Math.floor((recentReflections.length / 3) * 100)}%
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shrink-0" />
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                                            매주 월요일 00:00에 목표가 초기화됩니다.
                                        </p>
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
                    <div className="h-[4px] flex-1 border-t-4 border-black border-dotted opacity-50"></div>
                    <h3 className="text-sm font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.4em] text-center">TRAINER MENU</h3>
                    <div className="h-[4px] flex-1 border-t-4 border-black border-dotted opacity-50"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {menuItems.map((item, index) => (
                        <motion.div
                            key={item.path}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="h-full"
                        >
                            <Link href={item.path} className="block h-full group">
                                <Card className={`retro-box hover-pixel-lift h-full p-6 flex flex-col transition-all duration-200 cursor-pointer`}>
                                    <div className="retro-box-inner"></div>
                                    {/* Icon Container */}
                                    <div className={`w-20 h-20 mb-6 flex items-center justify-center border-[3px] border-black shadow-[3px_3px_0px_#000] ${item.bgColor} transition-transform group-hover:scale-105 group-hover:-rotate-3`}>
                                        {item.icon}
                                    </div>

                                    <div className="space-y-3 flex-1">
                                        <h3 className="text-2xl font-black tracking-tighter flex items-center gap-3">
                                            {item.name}
                                        </h3>
                                        <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-relaxed">
                                            {item.description}
                                        </p>
                                    </div>

                                    <div className={`mt-6 pt-4 border-t-4 border-black border-dashed flex justify-between items-center transition-colors ${item.hoverAccent} rounded p-2 pixel-text`}>
                                        <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-700 dark:text-slate-200">START!</span>
                                        <div className="w-8 h-8 bg-black text-white flex items-center justify-center border-2 border-transparent group-hover:bg-slate-800 transition-colors shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
                                            <span className="text-xl -mt-1">▶</span>
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
                        className="col-span-1 md:col-span-2 lg:col-span-3"
                    >
                        <Card className="retro-box h-full flex flex-col bg-slate-100 dark:bg-slate-800 border-4 border-black">
                            <div className="retro-box-inner"></div>

                            {/* Header */}
                            <div className="flex items-center justify-between p-6 bg-slate-200 dark:bg-slate-700 border-b-[3px] border-black pb-4 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 border-2 border-black bg-white shadow-[2px_2px_0px_#000]">
                                        <img src="https://play.pokemonshowdown.com/sprites/itemicons/town-map.png" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} alt="Town Map" />
                                    </div>
                                    <h3 className="text-2xl font-black italic tracking-tighter" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.1)' }}>최근 활동 요약</h3>
                                </div>
                                <Button variant="ghost" size="sm" className="retro-btn text-xs py-1 hover:bg-slate-300" onClick={() => router.push("/student/activities")}>
                                    더보기 <span className="ml-1 text-base">▶</span>
                                </Button>
                            </div>

                            <div className="flex-1 p-6 relative z-10">
                                {loading ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {Array(3).fill(0).map((_, i) => (
                                            <div key={i} className="h-24 bg-slate-300 dark:bg-slate-600 animate-pulse border-[3px] border-black shadow-[2px_2px_0px_rgba(0,0,0,0.2)]" />
                                        ))}
                                    </div>
                                ) : recentLogs.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-8 border-4 border-dashed border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 rounded">
                                        <img src="https://play.pokemonshowdown.com/sprites/itemicons/old-amber.png" className="w-16 h-16 grayscale opacity-60" style={{ imageRendering: 'pixelated' }} alt="No Data" />
                                        <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">최근 활동이 없습니다.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {recentLogs.map((log) => (
                                            <motion.div
                                                key={log.id}
                                                whileHover={{ y: -4, x: -4 }}
                                                className="retro-box p-5 bg-white dark:bg-slate-900 cursor-pointer shadow-[4px_4px_0px_#000] hover:shadow-[8px_8px_0px_#000] border-[3px] border-black flex flex-col justify-between min-h-[140px] transition-all"
                                                onClick={() => router.push("/student/activities")}
                                            >
                                                <div className="flex items-start gap-3 mb-2">
                                                    <div className="p-1 border-2 border-black bg-slate-100 shadow-[2px_2px_0px_#000] shrink-0">
                                                        <img src={getLogIcon(log.type)} className="w-6 h-6" style={{ imageRendering: 'pixelated' }} alt="Type" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-sm text-blue-600 dark:text-blue-400 leading-tight">{log.title}</h4>
                                                        <p className="line-clamp-2 text-xs font-bold text-foreground leading-tight mt-1">{log.description}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between border-t-2 border-slate-200 dark:border-slate-700 pt-3 mt-auto">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                        {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : "RECENT ACTIVITY"}
                                                    </span>
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
