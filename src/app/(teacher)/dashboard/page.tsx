"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, getDocs, limit } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Presentation,
    Users,
    FileText,
    ArrowRight,
    BarChart3,
    Settings,
    ChevronRight,
    Sparkles,
    CheckCircle2,
    Calendar,
    Activity
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
            icon: <Presentation className="h-8 w-8 text-indigo-400" />,
            path: "/dashboard/classes",
            color: "from-indigo-600/20 to-blue-600/20",
            borderColor: "border-indigo-500/30",
            accentColor: "indigo"
        },
        {
            title: "학생 명렬표",
            description: "전체 학생 명단을 확인하고 포켓몬 보유 현황을 관리합니다.",
            icon: <Users className="h-8 w-8 text-emerald-400" />,
            path: "/dashboard/students",
            color: "from-emerald-600/20 to-teal-600/20",
            borderColor: "border-emerald-500/30",
            accentColor: "emerald"
        },
        {
            title: "성찰 현황판",
            description: "학생들의 성찰 일기 작성 현황과 통계를 실시간으로 확인합니다.",
            icon: <FileText className="h-8 w-8 text-amber-400" />,
            path: "/dashboard/status",
            color: "from-amber-600/20 to-orange-600/20",
            borderColor: "border-amber-500/30",
            accentColor: "amber"
        }
    ];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Loading Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-10 py-4 pb-20">
            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900/40 via-[#0a1128]/80 to-blue-900/40 p-8 sm:p-12 border border-indigo-500/20 shadow-2xl"
            >
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]"></div>

                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-12">
                    <div className="space-y-6 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-2">
                            <Sparkles className="h-3 w-3" />
                            Teacher Management Console
                        </div>
                        <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tighter leading-tight italic">
                            안녕하세요, <span className="text-indigo-400">{teacherName || "선생님"}님!</span><br />
                            <span className="text-3xl sm:text-4xl text-slate-400 not-italic">오늘도 학생들의 성장을 응원합니다.</span>
                        </h2>
                        <p className="text-slate-400 text-sm sm:text-base font-medium max-w-xl">
                            포켓몬 성찰 일기 관리 대시보드입니다.<br />
                            학급의 활동 내역을 한눈에 파악하고 효율적으로 관리하세요.
                        </p>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 w-full lg:w-auto">
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-center min-w-[160px]">
                            <Users className="h-5 w-5 text-indigo-400 mb-2 opacity-50" />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Students</p>
                            <p className="text-2xl font-black text-white mt-1">{stats.totalStudents}</p>
                        </Card>
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-center min-w-[160px]">
                            <Activity className="h-5 w-5 text-emerald-400 mb-2 opacity-50" />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Classes</p>
                            <p className="text-2xl font-black text-white mt-1">{stats.activeClasses}</p>
                        </Card>
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-center col-span-2">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recent Reflections</p>
                                    <p className="text-2xl font-black text-white mt-1">{stats.recentReflections}</p>
                                </div>
                                <div className="p-3 bg-white/5 rounded-2xl">
                                    <FileText className="h-6 w-6 text-indigo-400" />
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </motion.div>

            {/* Menu Hub Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuItems.map((item, index) => (
                    <motion.div
                        key={item.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card
                            className={`group relative h-full bg-gradient-to-br ${item.color} border-2 ${item.borderColor} hover:scale-[1.03] transition-all duration-300 cursor-pointer overflow-hidden rounded-[2.5rem] shadow-xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]`}
                            onClick={() => router.push(item.path)}
                        >
                            <CardContent className="p-8 flex flex-col items-center text-center h-full">
                                <div className={`p-4 bg-slate-900/80 rounded-[1.5rem] mb-6 border border-white/5 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 shadow-xl`}>
                                    {item.icon}
                                </div>
                                <h3 className="text-2xl font-black text-white italic tracking-tighter mb-3 group-hover:text-white transition-colors">
                                    {item.title}
                                </h3>
                                <p className="text-sm font-medium text-slate-400 leading-relaxed mb-8">
                                    {item.description}
                                </p>
                                <div className="mt-auto w-full group/btn">
                                    <div className="w-full h-12 bg-white/5 group-hover/btn:bg-white/10 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-white/20 transition-all flex items-center gap-2">
                                        관리하기 (MANAGE)
                                        <ChevronRight className="h-4 w-4 transform group-hover/btn:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </CardContent>
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </Card>
                    </motion.div>
                ))}

                {/* Status Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="h-full bg-slate-900/40 border-2 border-slate-800/50 backdrop-blur-md rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none group-hover:opacity-[0.07] transition-opacity">
                            <Settings className="h-32 w-32" />
                        </div>
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                    <BarChart3 className="h-5 w-5 text-indigo-400" />
                                </div>
                                <h3 className="text-lg font-black italic tracking-tighter text-white">시스템 상태</h3>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-xs font-bold text-slate-300">Firebase Cloud</span>
                                    </div>
                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Operational</span>
                                </div>
                                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        <span className="text-xs font-bold text-slate-300">Real-time Sync</span>
                                    </div>
                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active</span>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-indigo-400" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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

