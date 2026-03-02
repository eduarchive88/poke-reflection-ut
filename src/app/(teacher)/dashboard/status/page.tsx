"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
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
        if (!classId) {
            router.push("/dashboard");
            return;
        }

        const initialDays = parseInt(filterDays) || 30;
        updateDates(initialDays);
        fetchData();
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
        if (filterDays === "all") {
            updateDates(100);
        } else {
            updateDates(parseInt(filterDays));
        }
    }, [filterDays]);

    const fetchData = async () => {
        if (!classId) return;
        setLoading(true);
        try {
            // 1. 학급 정보
            const classDoc = await getDoc(doc(db, "classes", classId));
            if (classDoc.exists()) {
                setClassName(classDoc.data().className);
            }

            // 2. 학생 명단
            const studentQ = query(collection(db, "students"), where("classId", "==", classId));
            const studentSnap = await getDocs(studentQ);
            const studentList: StudentData[] = [];
            studentSnap.forEach(doc => studentList.push({ id: doc.id, ...doc.data() } as StudentData));
            setStudents(studentList.sort((a, b) => a.number - b.number));

            // 3. 성찰 일기 내역
            const reflectionQ = query(collection(db, "reflections"), where("classId", "==", classId));
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
            const q = query(collection(db, "reflections"), where("classId", "==", classId));
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/dashboard")}
                        className="rounded-full hover:bg-slate-800/50"
                    >
                        <ChevronLeft className="h-6 w-6 text-slate-400 hover:text-white" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-primary flex items-center gap-2">
                            <Calendar className="h-8 w-8 text-blue-500" />
                            {className} 성찰 현황판
                        </h2>
                        <p className="text-muted-foreground mt-1">
                            학생들의 성찰 참여 횟수를 확인하고 상세 기록을 관리합니다.
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={exportToExcelFull} className="gap-2 rounded-full border-2">
                        <Download className="h-4 w-4" /> 전체 기록 다운로드 (Excel)
                    </Button>
                </div>
            </div>

            <Card className="border-2 shadow-sm rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-secondary/30 border-b">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="학생 이름 검색..."
                                value={searchStudent}
                                onChange={(e) => setSearchStudent(e.target.value)}
                                className="pl-9 rounded-full bg-background border-2"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-16 text-center font-bold">번호</TableHead>
                                <TableHead className="w-32 font-bold">이름</TableHead>
                                <TableHead className="font-bold text-center text-primary bg-primary/5">총 성찰 횟수</TableHead>
                                <TableHead className="text-right font-bold">활동 관리</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-40 text-center text-muted-foreground animate-pulse font-bold">
                                        데이터를 불러오고 있습니다...
                                    </TableCell>
                                </TableRow>
                            ) : filteredStudents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-40 text-center text-muted-foreground font-bold">
                                        검색 결과가 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStudents.map((student) => {
                                    const studentReflectionCount = reflections.filter(r => r.studentId === student.id).length;
                                    return (
                                        <TableRow key={student.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-center font-medium">{student.number}번</TableCell>
                                            <TableCell>
                                                <button
                                                    onClick={() => fetchStudentReflections(student)}
                                                    className="font-black hover:text-primary hover:underline underline-offset-4 decoration-2 transition-all text-left"
                                                >
                                                    {student.name}
                                                </button>
                                            </TableCell>
                                            <TableCell className="text-center bg-primary/5">
                                                <div className="inline-flex items-center justify-center px-4 py-1 rounded-full bg-primary/10 text-primary font-black text-lg">
                                                    {studentReflectionCount}회
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="sm" variant="outline" className="rounded-full gap-1 border-2" onClick={() => fetchInventory(student)}>
                                                    <BookOpen className="h-3.5 w-3.5" /> 도감
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="rounded-full gap-1 bg-amber-100 text-amber-700 hover:bg-amber-200"
                                                    onClick={() => {
                                                        setSelectedStudent(student);
                                                        setIsRewardDialogOpen(true);
                                                    }}
                                                >
                                                    <Gift className="h-3.5 w-3.5" /> 보상
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="rounded-full gap-1"
                                                    onClick={() => fetchStudentReflections(student)}
                                                >
                                                    <Search className="h-3.5 w-3.5" /> 상세
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
                <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
                            <Calendar className="h-6 w-6" />
                            {selectedStudent?.name} 학생의 성찰 기록
                        </DialogTitle>
                        <DialogDescription>
                            지금까지 작성한 모든 성찰 내용을 확인합니다. (총 {studentReflections.length}건)
                        </DialogDescription>
                    </DialogHeader>
                    {loadingStudentReflections ? (
                        <div className="py-20 text-center animate-pulse text-muted-foreground font-bold italic">기록을 불러오는 중...</div>
                    ) : studentReflections.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground border-dashed border-2 rounded-2xl bg-secondary/10">
                            아직 작성된 성찰 기록이 없습니다.
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            {studentReflections.map((item) => (
                                <Card key={item.id} className="border-2 rounded-2xl overflow-hidden">
                                    <div className="flex justify-between items-center bg-muted/30 px-4 py-2 border-b">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            <span className="text-xs font-bold">{item.date}</span>
                                        </div>
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Sparkles
                                                    key={star}
                                                    className={`h-3 w-3 ${star <= (item.rating || 0) ? 'text-yellow-500 fill-current' : 'text-muted'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <CardContent className="p-4">
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.content}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* 전설의 포켓몬 보상 모달 */}
            <Dialog open={isRewardDialogOpen} onOpenChange={setIsRewardDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-[2.5rem]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-primary flex items-center gap-2">
                            <Gift className="h-6 w-6 text-amber-500" />
                            전설의 포켓몬 보상 지급
                        </DialogTitle>
                        <DialogDescription>
                            {selectedStudent?.name} 학생에게 특별한 포켓몬을 선물합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 py-4">
                        {LEGENDARY_POKEMON.map((poke) => (
                            <button
                                key={poke.id}
                                disabled={isRewarding}
                                onClick={() => giveReward(poke.id, poke.name, poke.image, poke.types)}
                                className="group flex flex-col items-center p-4 border-2 rounded-2xl border-secondary hover:border-primary hover:bg-primary/5 transition-all text-center relative overflow-hidden"
                            >
                                <div className="absolute -top-1 -right-1 bg-yellow-400 text-[8px] font-black px-2 py-0.5 rounded-bl-lg transform rotate-12">LEGEND</div>
                                <img src={poke.image} alt={poke.name} className="w-16 h-16 group-hover:scale-110 transition-transform drop-shadow-md" />
                                <span className="mt-2 font-bold text-xs">{poke.name}</span>
                                <span className="text-[10px] text-muted-foreground">No.{poke.id}</span>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* 도감 모달 */}
            <Dialog open={isPokedexOpen} onOpenChange={setIsPokedexOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
                            <BookOpen className="h-6 w-6" />
                            {selectedStudent?.name} 학생의 포켓몬 도감
                        </DialogTitle>
                        <DialogDescription>
                            현재까지 수집한 포켓몬 목록입니다. (총 {studentInventory.length}마리)
                        </DialogDescription>
                    </DialogHeader>
                    {loadingInventory ? (
                        <div className="py-20 text-center animate-pulse text-muted-foreground font-bold italic">도감을 가져오는 중...</div>
                    ) : studentInventory.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground border-dashed border-2 rounded-2xl bg-secondary/10">
                            아직 수집한 포켓몬이 없습니다.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 py-4">
                            {studentInventory.map((item) => (
                                <Card key={item.id} className="relative overflow-hidden group hover:border-primary border-2 rounded-[1.5rem] transition-all bg-secondary/5">
                                    <div className={`absolute top-0 right-0 p-1 text-[8px] font-black ${item.isLegendary ? 'bg-yellow-400 text-black' : 'bg-muted text-muted-foreground'} rounded-bl-lg`}>
                                        {item.isLegendary ? "LEGEND" : `#${item.pokemonId.toString().padStart(3, '0')}`}
                                    </div>
                                    <CardContent className="p-4 text-center">
                                        <img src={item.image} alt={item.name} className="w-20 h-20 mx-auto group-hover:scale-110 transition-transform drop-shadow-sm" />
                                        <p className="font-bold mt-2 text-sm text-primary">{item.koName || item.name}</p>
                                        <div className="flex justify-center items-center gap-1 mt-1">
                                            <span className="text-[10px] font-black italic text-muted-foreground bg-background px-2 py-0.5 rounded-full border">Lv.{item.level}</span>
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
