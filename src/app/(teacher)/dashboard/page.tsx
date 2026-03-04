"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, getDocs, limit } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";

export default function TeacherDashboardHub() {
    const router = useRouter();
    const [teacherName, setTeacherName] = useState("");
    const [stats, setStats] = useState({
        totalStudents: 0,
        recentReflections: 0,
        activeClasses: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const docRef = doc(db, "teachers", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setTeacherName(docSnap.data().name);
                    fetchStats(user.uid);
                }
            } else {
                router.push("/login");
            }
        });

        return () => unsubscribe();
    }, [router]);

    const fetchStats = async (teacherId: string) => {
        try {
            // 간단하게 통계 데이터 가져오기 (실제 로직에 맞게 조정 필요)
            const classesSnap = await getDocs(collection(db, "classes"));
            const studentsSnap = await getDocs(collection(db, "students"));
            const reflectionsSnap = await getDocs(query(collection(db, "reflections"), limit(100)));

            setStats({
                totalStudents: studentsSnap.size,
                recentReflections: reflectionsSnap.size,
                activeClasses: classesSnap.size
            });
        } catch (error) {
            console.error("Error fetching teacher stats:", error);
        } finally {
            setLoading(false);
        }
    };

    const menuItems = [
        {
            title: "학급 관리",
            description: "새로운 학급을 생성하고 접속용 세션 코드를 관리합니다.",
            icon: <img src="https://play.pokemonshowdown.com/sprites/itemicons/up-grade.png" className="w-12 h-12" style={{ imageRendering: 'pixelated' }} alt="PC" />,
            path: "/dashboard/classes",
            color: "bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-700",
            hoverAccent: "hover:bg-indigo-50 dark:hover:bg-indigo-900/60"
        },
        {
            title: "학생 명렬표",
            description: "전체 학생 명단을 확인하고 포켓몬 보유 현황을 관리합니다.",
            icon: <img src="https://play.pokemonshowdown.com/sprites/itemicons/town-map.png" className="w-12 h-12" style={{ imageRendering: 'pixelated' }} alt="Town map" />,
            path: "/dashboard/students",
            color: "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700",
            hoverAccent: "hover:bg-emerald-50 dark:hover:bg-emerald-900/60"
        },
        {
            title: "성찰 현황판",
            description: "학생들의 성찰 일기 작성 현황과 통계를 실시간으로 확인합니다.",
            icon: <img src="https://play.pokemonshowdown.com/sprites/itemicons/exp-share.png" className="w-12 h-12" style={{ imageRendering: 'pixelated' }} alt="Exp share" />,
            path: "/dashboard/status",
            color: "bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700",
            hoverAccent: "hover:bg-amber-50 dark:hover:bg-amber-900/60"
        },
        {
            title: "체육관 현황",
            description: "현재 체육관의 마스터와 도전 현황을 실시간으로 확인합니다.",
            icon: <img src="https://play.pokemonshowdown.com/sprites/itemicons/vs-seeker.png" className="w-12 h-12" style={{ imageRendering: 'pixelated' }} alt="Gym" />,
            path: "/dashboard/gym",
            color: "bg-rose-100 dark:bg-rose-900/40 border-rose-300 dark:border-rose-700",
            hoverAccent: "hover:bg-rose-50 dark:hover:bg-rose-900/60"
        }
    ];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <img
                    src="https://play.pokemonshowdown.com/sprites/itemicons/poke-ball.png"
                    className="w-12 h-12 animate-bounce"
                    style={{ imageRendering: 'pixelated' }}
                    alt="Loading"
                />
                <p className="font-extrabold animate-pulse uppercase tracking-widest text-base shadow-sm">
                    연구소 PC 통신 중...
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-10 py-4 pb-20">
            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="retro-box overflow-hidden bg-teal-600 dark:bg-slate-800 p-8 sm:p-12 text-white"
            >
                <div className="retro-box-inner border-teal-400 dark:border-slate-600"></div>
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/10 to-transparent pointer-events-none"></div>

                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-12">
                    <div className="space-y-6 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-black/30 border-[3px] border-black text-white text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0px_#000]">
                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/pc-box.png" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} alt="PC Box" onError={(e) => e.currentTarget.style.display = 'none'} />
                            PROFESSOR'S LAB SYSTEM
                        </div>
                        <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter leading-tight italic drop-shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
                            환영합니다, <span className="text-yellow-400" style={{ textShadow: '4px 4px 0px #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' }}>{teacherName || "오키드 박사"}님!</span><br />
                            <span className="text-2xl sm:text-3xl text-white/90 not-italic">오늘도 포켓몬 트레이너들의 성장을 응원합니다.</span>
                        </h2>
                        <p className="text-white bg-black/40 p-3 border-2 border-black rounded shadow-[2px_2px_0px_#000] text-sm sm:text-base font-medium max-w-xl">
                            학생들의 포켓몬 성찰 일기 관리 PC입니다.<br />
                            연구소 데이터베이스에 접속하여 학급 활동 내역을 파악하세요.
                        </p>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 w-full lg:w-auto">
                        <Card className="retro-box p-4 bg-white dark:bg-slate-900 border-2 items-center flex flex-col justify-center min-w-[150px]">
                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/poke-ball.png" className="w-8 h-8 mb-2" style={{ imageRendering: 'pixelated' }} alt="Poke Ball" />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Total Trainers</p>
                            <p className="text-3xl font-black text-black dark:text-white mt-1 text-center" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.1)' }}>{stats.totalStudents}</p>
                        </Card>
                        <Card className="retro-box p-4 bg-white dark:bg-slate-900 border-2 items-center flex flex-col justify-center min-w-[150px]">
                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/great-ball.png" className="w-8 h-8 mb-2" style={{ imageRendering: 'pixelated' }} alt="Great Ball" />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Active Classes</p>
                            <p className="text-3xl font-black text-black dark:text-white mt-1 text-center" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.1)' }}>{stats.activeClasses}</p>
                        </Card>
                        <Card className="retro-box p-4 bg-white dark:bg-slate-900 border-2 flex flex-col justify-center col-span-2">
                            <div className="flex justify-between items-center px-2">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recent Logs</p>
                                    <p className="text-3xl font-black text-black dark:text-white mt-1" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.1)' }}>{stats.recentReflections}</p>
                                </div>
                                <div className="p-2 border-[3px] border-black bg-yellow-100 shadow-[2px_2px_0px_#000]">
                                    <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/town-map.png" className="w-10 h-10 drop-shadow-sm" style={{ imageRendering: 'pixelated' }} alt="Pokedex" />
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </motion.div>

            {/* Menu Hub Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {menuItems.map((item, index) => (
                    <motion.div
                        key={item.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card
                            className={`retro-box hover-pixel-lift h-full p-0 flex flex-col transition-all duration-200 cursor-pointer ${item.color}`}
                            onClick={() => router.push(item.path)}
                        >
                            <div className="retro-box-inner"></div>
                            <CardContent className="p-8 flex flex-col items-center text-center h-full relative z-10">
                                <div className={`w-20 h-20 bg-white dark:bg-slate-800 mb-6 border-[3px] border-black flex items-center justify-center shadow-[4px_4px_0px_#000] group-hover:-translate-y-1 transition-transform`}>
                                    {item.icon}
                                </div>
                                <h3 className="text-2xl font-black text-black dark:text-white tracking-tighter mb-3">
                                    {item.title}
                                </h3>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed mb-8">
                                    {item.description}
                                </p>
                                <div className="mt-auto w-full group/btn">
                                    <div className="w-full h-10 bg-black text-white font-black text-xs uppercase tracking-widest flex items-center justify-center border-[3px] border-transparent hover:bg-slate-800 transition-colors shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
                                        시스템 접속 (ACCESS)
                                        <ChevronRight className="h-4 w-4 ml-1 transform group-hover/btn:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}

                {/* Status Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="retro-box h-full bg-slate-100 dark:bg-slate-800 p-8 flex flex-col relative overflow-hidden group">
                        <div className="retro-box-inner"></div>
                        <div className="absolute top-0 right-0 p-6 opacity-[0.05] pointer-events-none group-hover:opacity-[0.1] transition-opacity">
                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/porygon.png" className="w-32 h-32" style={{ imageRendering: 'pixelated' }} alt="Porygon" onError={(e) => e.currentTarget.style.display = 'none'} />
                        </div>
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center gap-3 mb-8 border-b-[3px] border-black pb-4">
                                <div className="p-2 bg-white border-2 border-black shadow-[2px_2px_0px_#000]">
                                    <img src="https://play.pokemonshowdown.com/sprites/itemicons/data-card.png" className="w-6 h-6" style={{ imageRendering: 'pixelated' }} alt="Parts" onError={(e) => { e.currentTarget.src = 'https://play.pokemonshowdown.com/sprites/itemicons/potion.png'; }} />
                                </div>
                                <h3 className="text-xl font-black italic tracking-tighter text-black dark:text-white" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.1)' }}>시스템 상태</h3>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div className="p-3 bg-white dark:bg-slate-900 border-[3px] border-black shadow-[2px_2px_0px_#000] flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 bg-green-500 border border-black shadow-[1px_1px_0_#000] animate-pulse"></div>
                                        <span className="text-xs font-bold text-black dark:text-white">DB CONNECTION</span>
                                    </div>
                                    <span className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest">ONLINE</span>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-900 border-[3px] border-black shadow-[2px_2px_0px_#000] flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 bg-green-500 border border-black shadow-[1px_1px_0_#000]"></div>
                                        <span className="text-xs font-bold text-black dark:text-white">REAL-TIME SYNC</span>
                                    </div>
                                    <span className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest">ACTIVE</span>
                                </div>
                            </div>

                            <div className="mt-6 p-3 bg-white dark:bg-slate-900 border-[3px] border-black shadow-[2px_2px_0px_#000] flex items-center gap-3">
                                <img src="https://play.pokemonshowdown.com/sprites/itemicons/journal.png" className="w-5 h-5" style={{ imageRendering: 'pixelated' }} alt="Journal" />
                                <span className="text-[10px] font-bold text-black dark:text-white uppercase tracking-wider">
                                    {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
                                </span>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}

