"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, increment, getDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Sparkles, Trophy, ChevronRight, Info, Zap, Shield, Heart, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

export const dynamic = 'force-dynamic';

interface Pokemon {
    id: string;
    pokemonId: number;
    name: string;
    koName?: string;
    image: string;
    level: number;
    types: string[];
    stats?: {
        hp: number;
        attack: number;
        defense: number;
    };
    skills?: {
        name: string;
        type: string;
        power: number;
    }[];
}

export default function PokedexPage() {
    const router = useRouter();

    interface StudentSession {
        studentId: string;
        classId: string;
        name: string;
    }

    const [session, setSession] = useState<StudentSession | null>(null);
    const [myPokemon, setMyPokemon] = useState<Pokemon[]>([]);
    const [candies, setCandies] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);

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
        setLoading(true);
        try {
            // 캔디 정보 가져오기
            const studentDoc = await getDoc(doc(db, "students", studentId));
            if (studentDoc.exists()) {
                setCandies(studentDoc.data().candies || 0);
            }

            // 포켓몬 인벤토리 가져오기
            const q = query(collection(db, "pokemon_inventory"), where("studentId", "==", studentId));
            const snapshots = await getDocs(q);
            const list: Pokemon[] = [];
            snapshots.forEach((doc) => {
                list.push({ id: doc.id, ...(doc.data() as Omit<Pokemon, "id">) });
            });
            setMyPokemon(list);
        } catch (error) {
            console.error(error);
            toast.error("데이터를 불러오는 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };


    const handleLevelUp = async (inventoryId: string) => {
        if (!session || candies <= 0) {
            toast.error("캔디가 부족합니다! 성찰 일기를 써서 캔디를 모아보세요.");
            return;
        }

        try {
            const statsFields = ['hp', 'attack', 'defense'];
            const randomStat = statsFields[Math.floor(Math.random() * statsFields.length)];
            const incrementValue = Math.floor(Math.random() * 2) + 1; // 1 또는 2 포인트 랜덤 증가

            // 1. 학생 캔디 차감
            await updateDoc(doc(db, "students", session.studentId), {
                candies: increment(-1)
            });

            // 2. 포켓몬 레벨 및 스탯 증가
            const pokeDoc = await getDoc(doc(db, "pokemon_inventory", inventoryId));
            const currentData = pokeDoc.data();

            if (!currentData) throw new Error("포켓몬 데이터를 찾을 수 없습니다.");

            const updates: any = {
                level: increment(1),
            };

            // stats 객체가 없는 경우 초기맵 설정, 있는 경우 개별 필드 업데이트
            if (!currentData.stats) {
                const initialStats = {
                    hp: 50,
                    attack: 50,
                    defense: 50
                };
                // @ts-ignore
                initialStats[randomStat] += incrementValue;
                updates.stats = initialStats;
            } else {
                updates[`stats.${randomStat}`] = increment(incrementValue);
            }

            await updateDoc(doc(db, "pokemon_inventory", inventoryId), updates);

            // 3. 로컬 상태 업데이트
            setCandies(prev => prev - 1);
            setMyPokemon(prev => prev.map(p => {
                if (p.id === inventoryId) {
                    const currentStats = p.stats || { hp: 50, attack: 50, defense: 50 };
                    const newStats = { ...currentStats };
                    // @ts-ignore
                    newStats[randomStat] += incrementValue;
                    return { ...p, level: p.level + 1, stats: newStats };
                }
                return p;
            }));

            if (selectedPokemon && selectedPokemon.id === inventoryId) {
                const currentStats = selectedPokemon.stats || { hp: 50, attack: 50, defense: 50 };
                const newStats = { ...currentStats };
                // @ts-ignore
                newStats[randomStat] += incrementValue;
                setSelectedPokemon({ ...selectedPokemon, level: selectedPokemon.level + 1, stats: newStats });
            }

            const statName = randomStat === 'hp' ? '체력' : randomStat === 'attack' ? '공격력' : '방어력';
            toast.success(`레벨업 성공! ${statName}이(가) ${incrementValue} 상승했습니다.`);
        } catch (error) {
            console.error(error);
            toast.error("레벨업 처리 중 오류가 발생했습니다.");
        }
    };

    if (!session) return null;

    return (
        <div className="space-y-6 pb-12">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/student")}
                        className="rounded-full hover:bg-slate-800"
                    >
                        <ChevronLeft className="h-6 w-6 text-slate-400 hover:text-white" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-rose-500/20 rounded-2xl border border-rose-500/30">
                            <Sparkles className="h-6 w-6 text-rose-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black italic tracking-tighter pokemon-gradient-text">포켓몬 도감</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Pokemon Collection</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-slate-900/50 px-4 py-1.5 rounded-full border border-slate-800 flex items-center gap-2">
                        <span className="text-[10px] font-black text-amber-500 uppercase">보유 캔디</span>
                        <span className="text-sm font-black text-white">{candies}🍬</span>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="animate-pulse bg-secondary/20 h-64 border-dashed rounded-[2.5rem]" />
                    ))}
                </div>
            ) : myPokemon.length === 0 ? (
                <Card className="border-dashed bg-secondary/10 rounded-[3rem]">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="bg-background p-6 rounded-full shadow-inner border">
                            <Sparkles className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-xl font-bold">아직 발견한 포켓몬이 없어요!</p>
                            <p className="text-muted-foreground">성찰 일기를 작성하고 첫 번째 친구를 만나보세요.</p>
                        </div>
                        <Button size="lg" onClick={() => router.push("/student/write")} className="gap-2 rounded-full">
                            첫 일기 쓰러 가기 <ChevronRight className="h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {myPokemon.map((poke) => (
                        <motion.div
                            key={poke.id}
                            whileHover={{ y: -5 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Card className="overflow-hidden group border-2 hover:border-primary/50 transition-colors shadow-sm rounded-[2.5rem]">
                                <CardHeader className="bg-secondary/30 pb-2 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <span className="text-[10px] font-bold text-muted-foreground bg-background px-2 py-0.5 rounded-full border">
                                            No.{poke.pokemonId.toString().padStart(3, '0')}
                                        </span>
                                        <div className="flex items-center gap-1 bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                            <span className="text-xs font-black italic">Lv.{poke.level}</span>
                                        </div>
                                    </div>
                                    <CardTitle
                                        className="text-xl font-bold text-center pt-2 cursor-pointer hover:text-primary transition-colors"
                                        onClick={() => setSelectedPokemon(poke)}
                                    >
                                        {poke.koName || poke.name}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent
                                    className="flex flex-col items-center py-4 bg-gradient-to-b from-secondary/10 to-transparent cursor-pointer"
                                    onClick={() => setSelectedPokemon(poke)}
                                >
                                    <div className="relative w-32 h-32 flex items-center justify-center">
                                        <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
                                        <img
                                            src={poke.image}
                                            alt={poke.name}
                                            className="w-full h-full object-contain relative z-10 drop-shadow-md group-hover:scale-110 transition-transform duration-300"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png";
                                                target.className = "w-16 h-16 opacity-50 grayscale";
                                            }}
                                        />
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        {poke.types.map((type) => (
                                            <span key={type} className="px-2 py-0.5 bg-background border text-[10px] font-bold rounded-md uppercase">
                                                {type}
                                            </span>
                                        ))}
                                    </div>
                                </CardContent>
                                <div className="p-4 bg-secondary/10 border-t flex gap-2">
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="w-full text-xs font-bold gap-1 rounded-full"
                                        onClick={() => handleLevelUp(poke.id)}
                                    >
                                        레벨 업
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-xs rounded-full"
                                        onClick={() => setSelectedPokemon(poke)}
                                    >
                                        정보 보기
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* 포켓몬 상세 모달 */}
            <Dialog open={!!selectedPokemon} onOpenChange={(open) => !open && setSelectedPokemon(null)}>
                <DialogContent className="sm:max-w-md rounded-[3rem] overflow-hidden p-0 border-none">
                    {selectedPokemon && (
                        <div className="overflow-hidden">
                            <div className="bg-gradient-to-br from-primary/20 to-secondary/30 p-8 flex flex-col items-center relative">
                                <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full border text-xs font-bold">
                                    No.{selectedPokemon.pokemonId.toString().padStart(3, '0')}
                                </div>
                                <div className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-full text-xs font-bold italic">
                                    Lv.{selectedPokemon.level}
                                </div>
                                <img
                                    src={selectedPokemon.image}
                                    alt={selectedPokemon.name}
                                    className="w-48 h-48 object-contain drop-shadow-2xl animate-pulse"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png";
                                        target.className = "w-24 h-24 opacity-50 grayscale";
                                    }}
                                />
                                <h3 className="text-3xl font-black mt-4">{selectedPokemon.koName || selectedPokemon.name}</h3>
                                <div className="flex gap-2 mt-2">
                                    {selectedPokemon.types.map(type => (
                                        <span key={type} className="px-3 py-1 bg-background/50 backdrop-blur-sm border rounded-full text-[10px] font-bold uppercase">{type}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="p-8 space-y-6 bg-background">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="flex flex-col items-center p-3 bg-red-50 rounded-[1.5rem] border border-red-100">
                                        <Heart className="h-5 w-5 text-red-500 mb-1" />
                                        <span className="text-[10px] font-bold text-red-700">HP</span>
                                        <span className="text-lg font-black">{selectedPokemon.stats?.hp || "???"}</span>
                                    </div>
                                    <div className="flex flex-col items-center p-3 bg-blue-50 rounded-[1.5rem] border border-blue-100">
                                        <Zap className="h-5 w-5 text-blue-500 mb-1" />
                                        <span className="text-[10px] font-bold text-blue-700">ATK</span>
                                        <span className="text-lg font-black">{selectedPokemon.stats?.attack || "???"}</span>
                                    </div>
                                    <div className="flex flex-col items-center p-3 bg-green-50 rounded-[1.5rem] border border-green-100">
                                        <Shield className="h-5 w-5 text-green-500 mb-1" />
                                        <span className="text-[10px] font-bold text-green-700">DEF</span>
                                        <span className="text-lg font-black">{selectedPokemon.stats?.defense || "???"}</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-yellow-500" /> 보유 기술
                                    </h4>
                                    <div className="grid gap-2">
                                        {selectedPokemon.skills ? selectedPokemon.skills.map((skill, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-3 bg-secondary/20 rounded-2xl border text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-primary" />
                                                    <span className="font-bold">{skill.name}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-bold uppercase text-muted-foreground">{skill.type}</span>
                                                    <span className="font-black text-primary">역량 {skill.power}</span>
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="text-xs text-muted-foreground text-center py-4 bg-secondary/10 rounded-2xl border-dashed border">
                                                기술 정보가 없습니다. (추가 성찰이 필요합니다!)
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <Button className="w-full h-12 rounded-full font-bold" onClick={() => handleLevelUp(selectedPokemon.id)}>
                                    캔디 1개로 레벨업 하기
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

// fetchData 함수 외부로 분리하지 말 것. page.tsx 내부에서 구현.
