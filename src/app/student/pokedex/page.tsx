"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, increment } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, Trophy, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export const dynamic = 'force-dynamic';

interface Pokemon {
    id: string;
    pokemonId: number;
    name: string;
    image: string;
    level: number;
    types: string[];
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const sessionStr = localStorage.getItem("poke_student_session");
        if (!sessionStr) {
            router.push("/login");
            return;
        }
        const sessionData = JSON.parse(sessionStr);
        setSession(sessionData);
        fetchMyPokemon(sessionData.studentId);
    }, [router]);

    const fetchMyPokemon = async (studentId: string) => {
        setLoading(true);
        try {
            const q = query(collection(db, "pokemon_inventory"), where("studentId", "==", studentId));
            const snapshots = await getDocs(q);
            const list: Pokemon[] = [];
            snapshots.forEach((doc) => {
                list.push({ id: doc.id, ...(doc.data() as Omit<Pokemon, "id">) });
            });
            setMyPokemon(list);
        } catch (error) {
            console.error(error);
            toast.error("도감을 불러오는 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleLevelUp = async (pokemonDocId: string) => {
        try {
            const pokeRef = doc(db, "pokemon_inventory", pokemonDocId);
            await updateDoc(pokeRef, {
                level: increment(1)
            });

            // 로컬 상태 업데이트
            setMyPokemon(prev => prev.map(p =>
                p.id === pokemonDocId ? { ...p, level: p.level + 1 } : p
            ));

            toast.success("레벨업! 포켓몬이 더 강해졌습니다.");
        } catch (error) {
            toast.error("레벨업 중 오류가 발생했습니다.");
        }
    };

    if (!session) return null;

    return (
        <div className="space-y-6 pb-12">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-primary flex items-center gap-2">
                        <Trophy className="h-8 w-8 text-yellow-500" />
                        나의 포켓몬 도감
                    </h2>
                    <p className="text-muted-foreground mt-2">
                        열심히 기록하고 모은 소중한 친구들입니다.
                    </p>
                </div>
                <div className="bg-secondary/50 px-4 py-2 rounded-full border border-border flex items-center gap-2">
                    <span className="text-sm font-bold">전체 포켓몬:</span>
                    <span className="text-primary font-black">{myPokemon.length} / 151</span>
                </div>
            </div>

            {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="animate-pulse bg-secondary/20 h-64 border-dashed" />
                    ))}
                </div>
            ) : myPokemon.length === 0 ? (
                <Card className="border-dashed bg-secondary/10">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="bg-background p-6 rounded-full shadow-inner border">
                            <Sparkles className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-xl font-bold">아직 발견한 포켓몬이 없어요!</p>
                            <p className="text-muted-foreground">성찰 일기를 작성하고 첫 번째 친구를 만나보세요.</p>
                        </div>
                        <Button size="lg" onClick={() => router.push("/student/write")} className="gap-2">
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
                            <Card className="overflow-hidden group border-2 hover:border-primary/50 transition-colors shadow-sm">
                                <CardHeader className="bg-secondary/30 pb-2 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <span className="text-[10px] font-bold text-muted-foreground bg-background px-2 py-0.5 rounded-full border">
                                            No.{poke.pokemonId.toString().padStart(3, '0')}
                                        </span>
                                        <div className="flex items-center gap-1 bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                            <span className="text-xs font-black italic">Lv.{poke.level}</span>
                                        </div>
                                    </div>
                                    <CardTitle className="text-xl font-bold capitalize text-center pt-2">{poke.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center py-4 bg-gradient-to-b from-secondary/10 to-transparent">
                                    <div className="relative w-32 h-32 flex items-center justify-center">
                                        <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
                                        <img
                                            src={poke.image}
                                            alt={poke.name}
                                            className="w-full h-full object-contain relative z-10 drop-shadow-md group-hover:scale-110 transition-transform duration-300"
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
                                <div className="p-3 bg-secondary/10 border-t flex gap-2">
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="w-full text-xs font-bold gap-1"
                                        onClick={() => handleLevelUp(poke.id)}
                                    >
                                        레벨 업
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-xs"
                                        onClick={() => router.push("/student/stadium")}
                                    >
                                        출전하기
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
