"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ChevronLeft, Download, Calendar, CheckCircle2, XCircle, Gift, Info, Search, Filter, BookOpen, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";

export const dynamic = 'force-dynamic';

function StatusContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const classId = searchParams.get("classId");

    interface StudentData {
        id: string;
        number: number;
        name: string;
        classId: string;
    }

    interface ReflectionData {
        id: string;
        studentId: string;
        classId: string;
        createdAt: {
            toDate: () => Date;
        };
    }

    const [classes, setClasses] = useState<{ id: string, className: string }[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [className, setClassName] = useState("");
    const [students, setStudents] = useState<StudentData[]>([]);
    const [reflections, setReflections] = useState<ReflectionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchStudent, setSearchStudent] = useState("");
    const [filterDays, setFilterDays] = useState("30");
    const [dates, setDates] = useState<string[]>([]);

    // 모달 및 상세 정보 상태
    const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
    const [isPokedexOpen, setIsPokedexOpen] = useState(false);
    const [studentInventory, setStudentInventory] = useState<any[]>([]);
    const [loadingInventory, setLoadingInventory] = useState(false);
    const [isRewardDialogOpen, setIsRewardDialogOpen] = useState(false);
    const [isRewarding, setIsRewarding] = useState(false);

    // 학생별 성찰 기록 상세 모달 관련
    const [isReflectionListOpen, setIsReflectionListOpen] = useState(false);
    const [studentReflections, setStudentReflections] = useState<any[]>([]);
    const [loadingStudentReflections, setLoadingStudentReflections] = useState(false);

    const LEGENDARY_POKEMON = [
        { id: 144, name: "프리져", image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/144.png", types: ["Ice", "Flying"] },
        { id: 145, name: "썬더", image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/145.png", types: ["Electric", "Flying"] },
        { id: 146, name: "파이어", image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/146.png", types: ["Fire", "Flying"] },
        { id: 150, name: "뮤츠", image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png", types: ["Psychic"] },
        { id: 151, name: "뮤", image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/151.png", types: ["Psychic"] },
    ];
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const q = query(collection(db, "classes"), where("teacherId", "==", user.uid));
                const snapshots = await getDocs(q);
                const classList: { id: string, className: string }[] = [];
                snapshots.forEach((doc) => classList.push({ id: doc.id, className: doc.data().className }));
                setClasses(classList);

                if (classId) {
                    setSelectedClassId(classId);
                } else if (classList.length > 0) {
                    setSelectedClassId(classList[0].id);
                } else {
                    setLoading(false); // No classes
                }
            }
        });
        return () => unsubscribe();
    }, [classId]);

    const updateDates = (days: number) => {
        const dateList: string[] = [];
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dateList.push(d.toISOString().split('T')[0]);
        }
        setDates(dateList.reverse());
    };

    useEffect(() => {
        if (selectedClassId) {
            const initialDays = parseInt(filterDays) || 30;
            updateDates(initialDays);
            fetchData(selectedClassId);
        }
    }, [selectedClassId, filterDays]);

    const fetchData = async (targetClassId: string) => {
        if (!targetClassId) return;
        setLoading(true);
        try {
            // 1. 학급 정보
            const classDoc = await getDoc(doc(db, "classes", targetClassId));
            if (classDoc.exists()) {
                setClassName(classDoc.data().className);
            }

            // 2. 학생 명단
            const studentQ = query(collection(db, "students"), where("classId", "==", targetClassId));
            const studentSnap = await getDocs(studentQ);
            const studentList: StudentData[] = [];
            studentSnap.forEach(doc => studentList.push({ id: doc.id, ...doc.data() } as StudentData));
            setStudents(studentList.sort((a, b) => a.number - b.number));

            // 3. 성찰 일기 내역
            const reflectionQ = query(collection(db, "reflections"), where("classId", "==", targetClassId));
            const reflectionSnap = await getDocs(reflectionQ);
            const reflectionList: ReflectionData[] = [];
            reflectionSnap.forEach(doc => reflectionList.push({ id: doc.id, ...doc.data() } as ReflectionData));
            setReflections(reflectionList);
        } catch (error) {
            console.error(error);
            toast.error("데이터를 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // checkReflection 함수 제거 (날짜 그리드가 없으므로 불필요)

    const fetchInventory = async (student: StudentData) => {
        setSelectedStudent(student);
        setLoadingInventory(true);
        setIsPokedexOpen(true);
        try {
            const q = query(collection(db, "pokemon_inventory"), where("studentId", "==", student.id));
            const snap = await getDocs(q);
            const inv: any[] = [];
            snap.forEach(doc => inv.push({ id: doc.id, ...doc.data() }));
            setStudentInventory(inv);
        } catch (error) {
            toast.error("도감을 가져오는데 실패했습니다.");
        } finally {
            setLoadingInventory(false);
        }
    };

    const filteredStudents = students.filter(s => s.name.includes(searchStudent));
    const studentMap = students.reduce((acc, s) => {
        acc[s.id] = s.name;
        return acc;
    }, {} as Record<string, string>);

    const fetchStudentReflections = async (student: StudentData) => {
        setSelectedStudent(student);
        setLoadingStudentReflections(true);
        setIsReflectionListOpen(true);
        try {
            const q = query(
                collection(db, "reflections"),
                where("studentId", "==", student.id)
            );
            const snap = await getDocs(q);
            const list: any[] = [];
            snap.forEach(doc => {
                const data = doc.data();
                list.push({
                    id: doc.id,
                    ...data,
                    date: data.createdAt?.toDate().toLocaleDateString() || "날짜 없음"
                });
            });
            // 날짜 역순 정렬
            setStudentReflections(list.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
        } catch (error) {
            console.error(error);
            toast.error("성찰 기록을 가져오는데 실패했습니다.");
        } finally {
            setLoadingStudentReflections(false);
        }
    };

    const exportToExcelFull = async () => {
        // 모든 성찰 기록 다운로드
        setLoading(true);
        try {
            if (!selectedClassId) return;
            const q = query(collection(db, "reflections"), where("classId", "==", selectedClassId));
            const snap = await getDocs(q);
            const allReflections: any[] = [];
            snap.forEach(doc => {
                const data = doc.data();
                allReflections.push({
                    "학생 이름": studentMap[data.studentId] || "알 수 없음",
                    "날짜": data.createdAt?.toDate().toLocaleString() || "",
                    "성찰 내용": data.content || "",
                    "별점": data.rating || 0
                });
            });

            const worksheet = XLSX.utils.json_to_sheet(allReflections);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "전체_성찰_기록");
            XLSX.writeFile(workbook, `${className}_전체성찰기록_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success("전체 성찰 기록이 다운로드되었습니다.");
        } catch (error) {
            console.error(error);
            toast.error("다운로드 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const giveReward = async (pokeId: number, pokeName: string, image: string, types: string[]) => {
        if (!selectedStudent || isRewarding) return;
        setIsRewarding(true);
        try {
            const inventoryRef = doc(db, "pokemon_inventory", `${selectedStudent.id}_${pokeId}`);
            await setDoc(inventoryRef, {
                studentId: selectedStudent.id,
                pokemonId: pokeId,
                name: pokeName,
                image: image,
                types: types,
                level: 50,
                exp: 0,
                isLegendary: true,
                givenByTeacher: true,
                createdAt: serverTimestamp()
            });
            toast.success(`${selectedStudent.name} 학생에게 ${pokeName}(을)를 지급했습니다!`);
            setIsRewardDialogOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("보상 지급 중 오류가 발생했습니다.");
        } finally {
            setIsRewarding(false);
        }
    };


    return (
        <div className="space-y-6 pb-12">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/dashboard")}
                        className="retro-btn bg-slate-800 hover:bg-slate-700 p-2"
                    >
                        <ChevronLeft className="h-6 w-6 text-white" />
                    </Button>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/town-map.png" alt="Status" className="w-8 h-8 pixelated" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black tracking-tighter text-black uppercase" style={{ fontFamily: '"NeoDunggeunmo", sans-serif', textShadow: '2px 2px 0px white' }}>{className || "학급"} 현황판</h2>
                            <p className="text-slate-800 font-medium tracking-tight text-sm bg-white/50 px-2 py-1 rounded inline-block border-2 border-black border-dashed">학생들의 성찰 참여 횟수를 확인하고 상세 기록을 관리합니다.</p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full xl:w-auto items-center">
                    {classes.length > 0 && (
                        <Select value={selectedClassId} onValueChange={(val) => {
                            setSelectedClassId(val);
                            router.push(`/dashboard/status?classId=${val}`);
                        }}>
                            <SelectTrigger className="w-full sm:w-[200px] h-12 retro-box bg-white text-black font-bold outline-none ring-0">
                                <SelectValue placeholder="학급 선택" />
                            </SelectTrigger>
                            <SelectContent className="retro-box bg-white border-4 border-black rounded-none shadow-none">
                                {classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id} className="focus:bg-amber-100 focus:text-black font-bold cursor-pointer">{cls.className}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <Button onClick={exportToExcelFull} className="flex-1 sm:flex-none retro-btn bg-emerald-400 hover:bg-emerald-300 text-black font-black flex items-center gap-2 px-6 h-12">
                        <img src="https://play.pokemonshowdown.com/sprites/itemicons/tm-normal.png" alt="Excel" className="w-5 h-5 pixelated" />
                        기록 다운로드
                    </Button>
                </div>
            </div>

            <Card className="retro-box overflow-hidden bg-white">
                <CardHeader className="bg-indigo-100 border-b-4 border-black p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-black font-black" />
                            <Input
                                placeholder="학생 이름 검색..."
                                value={searchStudent}
                                onChange={(e) => setSearchStudent(e.target.value)}
                                className="pl-10 retro-box bg-white font-bold h-12 focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-200 border-b-4 border-black">
                            <TableRow className="border-b-4 border-black hover:bg-transparent">
                                <TableHead className="w-16 text-center font-black text-black">번호</TableHead>
                                <TableHead className="w-32 font-black text-black">이름</TableHead>
                                <TableHead className="font-black text-center text-black">총 성찰 횟수</TableHead>
                                <TableHead className="text-center font-black text-black">활동 관리</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-40 text-center text-black font-black">
                                        데이터를 불러오고 있습니다...
                                    </TableCell>
                                </TableRow>
                            ) : filteredStudents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-40 text-center text-black font-black">
                                        검색 결과가 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStudents.map((student) => {
                                    const studentReflectionCount = reflections.filter(r => r.studentId === student.id).length;
                                    return (
                                        <TableRow key={student.id} className="border-b-2 border-slate-200 hover:bg-amber-50 transition-colors">
                                            <TableCell className="text-center font-black text-black">{student.number}번</TableCell>
                                            <TableCell>
                                                <button
                                                    onClick={() => fetchStudentReflections(student)}
                                                    className="font-black text-black hover:text-indigo-600 hover:underline underline-offset-4 decoration-4 transition-all text-left text-lg"
                                                >
                                                    {student.name}
                                                </button>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="inline-flex items-center justify-center px-4 py-1 retro-box bg-slate-100 text-black font-black text-lg border-2">
                                                    {studentReflectionCount}회
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center space-x-2">
                                                <Button size="sm" className="retro-btn bg-cyan-400 hover:bg-cyan-300 text-black font-black flex-inline items-center justify-center gap-1 border-2 border-black" onClick={() => fetchInventory(student)}>
                                                    <img src="https://play.pokemonshowdown.com/sprites/itemicons/town-map.png" alt="Dex" className="w-4 h-4 pixelated" />
                                                    도감
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="retro-btn bg-amber-400 hover:bg-amber-300 text-black font-black flex-inline items-center justify-center gap-1 border-2 border-black"
                                                    onClick={() => {
                                                        setSelectedStudent(student);
                                                        setIsRewardDialogOpen(true);
                                                    }}
                                                >
                                                    <img src="https://play.pokemonshowdown.com/sprites/itemicons/star-piece.png" alt="Reward" className="w-4 h-4 pixelated" />
                                                    보상
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="retro-btn bg-slate-200 hover:bg-slate-300 text-black font-black flex-inline items-center justify-center gap-1 border-2 border-black"
                                                    onClick={() => fetchStudentReflections(student)}
                                                >
                                                    <Search className="h-4 w-4" /> 상세
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* 성찰 기록 상세 모달 */}
            <Dialog open={isReflectionListOpen} onOpenChange={setIsReflectionListOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto retro-box bg-slate-100 p-6">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-black uppercase flex items-center gap-2" style={{ fontFamily: '"NeoDunggeunmo", sans-serif' }}>
                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/journal.png" alt="Journal" className="w-6 h-6 pixelated" />
                            {selectedStudent?.name} 학생의 성찰 기록
                        </DialogTitle>
                        <DialogDescription className="text-black font-bold bg-white/50 p-2 rounded border-2 border-slate-300 border-dashed mt-2">
                            지금까지 작성한 모든 성찰 내용을 확인합니다. (총 {studentReflections.length}건)
                        </DialogDescription>
                    </DialogHeader>
                    {loadingStudentReflections ? (
                        <div className="py-20 text-center text-black font-black flex flex-col items-center justify-center gap-4">
                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/town-map.png" alt="Loading" className="w-12 h-12 pixelated animate-bounce" />
                            <p style={{ fontFamily: '"NeoDunggeunmo", sans-serif' }}>기록을 불러오는 중...</p>
                        </div>
                    ) : studentReflections.length === 0 ? (
                        <div className="py-20 text-center text-black font-bold border-4 border-dashed border-slate-300 rounded-xl bg-white m-6 flex flex-col items-center justify-center gap-4">
                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/poke-ball.png" alt="Empty" className="w-10 h-10 pixelated opacity-50 grayscale" />
                            아직 작성된 성찰 기록이 없습니다.
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            {studentReflections.map((item) => (
                                <Card key={item.id} className="retro-box overflow-hidden bg-white hover:-translate-y-1 transition-transform">
                                    <div className="flex justify-between items-center bg-indigo-100 px-4 py-2 border-b-4 border-black">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-black" />
                                            <span className="text-sm font-black text-black">{item.date}</span>
                                        </div>
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Sparkles
                                                    key={star}
                                                    className={`h-4 w-4 ${star <= (item.rating || 0) ? 'text-amber-400 fill-amber-400 drop-shadow-[1px_1px_0px_black]' : 'text-slate-300 fill-slate-300'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <CardContent className="p-4">
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap font-bold text-black">{item.content}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* 전설의 포켓몬 보상 모달 */}
            <Dialog open={isRewardDialogOpen} onOpenChange={setIsRewardDialogOpen}>
                <DialogContent className="sm:max-w-md retro-box bg-slate-100 p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-black uppercase flex items-center gap-2" style={{ fontFamily: '"NeoDunggeunmo", sans-serif' }}>
                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/star-piece.png" alt="Gift" className="w-6 h-6 pixelated" />
                            전설의 포켓몬 보상 지급
                        </DialogTitle>
                        <DialogDescription className="text-black font-bold bg-white/50 p-2 rounded border-2 border-slate-300 border-dashed mt-2">
                            {selectedStudent?.name} 학생에게 특별한 포켓몬을 선물합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 py-4">
                        {LEGENDARY_POKEMON.map((poke) => (
                            <button
                                key={poke.id}
                                disabled={isRewarding}
                                onClick={() => giveReward(poke.id, poke.name, poke.image, poke.types)}
                                className="group flex flex-col items-center p-2 retro-box bg-white hover:bg-amber-100 transition-colors text-center relative overflow-hidden active:scale-95"
                            >
                                <div className="absolute top-0 right-0 bg-yellow-400 text-[8px] font-black px-1.5 py-0.5 border-b-2 border-l-2 border-black z-10" style={{ fontFamily: '"NeoDunggeunmo", sans-serif' }}>LEGEND</div>
                                <img src={poke.image} alt={poke.name} className="w-16 h-16 group-hover:scale-110 transition-transform pixelated" />
                                <span className="mt-2 text-xs font-black text-black" style={{ fontFamily: '"NeoDunggeunmo", sans-serif' }}>{poke.name}</span>
                                <span className="text-[10px] text-slate-500 font-bold border-t-2 border-dashed border-slate-300 w-full pt-1 mt-1">No.{poke.id.toString().padStart(3, '0')}</span>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* 도감 모달 */}
            <Dialog open={isPokedexOpen} onOpenChange={setIsPokedexOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto retro-box bg-slate-100 p-6">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-black uppercase flex items-center gap-2" style={{ fontFamily: '"NeoDunggeunmo", sans-serif' }}>
                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/town-map.png" alt="Pokedex" className="w-6 h-6 pixelated" />
                            {selectedStudent?.name} 학생의 포켓몬 도감
                        </DialogTitle>
                        <DialogDescription className="text-black font-bold bg-white/50 p-2 rounded border-2 border-slate-300 border-dashed mt-2">
                            현재까지 수집한 포켓몬 목록입니다. (총 {studentInventory.length}마리)
                        </DialogDescription>
                    </DialogHeader>
                    {loadingInventory ? (
                        <div className="py-20 text-center text-black font-black flex flex-col items-center justify-center gap-4">
                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/town-map.png" alt="Loading" className="w-12 h-12 pixelated animate-bounce" />
                            <p style={{ fontFamily: '"NeoDunggeunmo", sans-serif' }}>도감을 가져오는 중...</p>
                        </div>
                    ) : studentInventory.length === 0 ? (
                        <div className="py-20 text-center text-black font-bold border-4 border-dashed border-slate-300 rounded-xl bg-white m-6 flex flex-col items-center justify-center gap-4">
                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/poke-ball.png" alt="Empty" className="w-10 h-10 pixelated opacity-50 grayscale" />
                            아직 수집한 포켓몬이 없습니다.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 py-4">
                            {studentInventory.map((item) => (
                                <Card key={item.id} className="relative overflow-hidden retro-box bg-white hover:-translate-y-1 transition-transform group">
                                    <div className={`absolute top-0 right-0 px-1.5 py-0.5 text-[8px] font-black border-b-2 border-l-2 border-black z-10 ${item.isLegendary ? 'bg-yellow-400 text-black' : 'bg-slate-200 text-black'}`} style={{ fontFamily: '"NeoDunggeunmo", sans-serif' }}>
                                        {item.isLegendary ? "LEGEND" : `No.${item.pokemonId.toString().padStart(3, '0')}`}
                                    </div>
                                    <CardContent className="p-4 text-center">
                                        <img src={item.image} alt={item.name} className="w-16 h-16 mx-auto group-hover:scale-110 transition-transform pixelated drop-shadow-md" />
                                        <p className="font-black mt-2 text-sm text-black" style={{ fontFamily: '"NeoDunggeunmo", sans-serif' }}>{item.koName || item.name}</p>
                                        <div className="flex justify-center items-center gap-1 mt-2">
                                            <span className="text-[10px] font-black text-white bg-black px-2 py-0.5 border-2 border-black">Lv.{item.level}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div >
    );
}

export default function StatusPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center">로딩 중...</div>}>
            <StatusContent />
        </Suspense>
    );
}
