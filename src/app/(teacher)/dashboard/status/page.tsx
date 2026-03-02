"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ChevronLeft, Download, Calendar, CheckCircle2, XCircle, Gift, Info, Search, Filter, BookOpen } from "lucide-react";
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
    const [dates, setDates] = useState<string[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
    const [isRewardDialogOpen, setIsRewardDialogOpen] = useState(false);
    const [isRewarding, setIsRewarding] = useState(false);

    // 필터 및 도감용 상태
    const [searchStudent, setSearchStudent] = useState("");
    const [filterDays, setFilterDays] = useState("30"); // 기본 30일
    const [isPokedexOpen, setIsPokedexOpen] = useState(false);
    const [studentInventory, setStudentInventory] = useState<any[]>([]);
    const [loadingInventory, setLoadingInventory] = useState(false);

    const LEGENDARY_POKEMON = [
        { id: 150, name: "뮤츠", image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png", types: ["psychic"] },
        { id: 151, name: "뮤", image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/151.png", types: ["psychic"] },
        { id: 250, name: "칠색조", image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/250.png", types: ["fire", "flying"] },
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

    const checkReflection = (studentId: string, dateStr: string) => {
        return reflections.find(r => {
            if (!r.createdAt?.toDate) return false;
            const rDate = r.createdAt.toDate().toISOString().split('T')[0];
            return r.studentId === studentId && rDate === dateStr;
        });
    };

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

    const exportToExcel = () => {
        const data = filteredStudents.map(s => {
            const row: Record<string, string | number> = { "번호": s.number, "이름": s.name };
            dates.forEach(d => {
                row[d] = checkReflection(s.id, d) ? "O" : "X";
            });
            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "성찰현황");
        XLSX.writeFile(workbook, `${className}_성찰현황_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("엑셀 파일이 다운로드되었습니다.");
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-black tracking-tight">{className} 성찰 현황판</h2>
                        <p className="text-muted-foreground mt-1 text-sm">학생들의 성찰 기록과 포켓몬 수집 상태를 관리합니다.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="flex items-center gap-2 bg-secondary/20 px-3 py-1 rounded-lg border">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="학생 이름 검색..."
                            className="border-none bg-transparent h-8 w-40 focus-visible:ring-0"
                            value={searchStudent}
                            onChange={(e) => setSearchStudent(e.target.value)}
                        />
                    </div>
                    <Select value={filterDays} onValueChange={setFilterDays}>
                        <SelectTrigger className="w-[120px] h-10">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="기간 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">최근 7일</SelectItem>
                            <SelectItem value="14">최근 14일</SelectItem>
                            <SelectItem value="30">최근 30일</SelectItem>
                            <SelectItem value="100">최근 100일</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={exportToExcel} className="gap-2 bg-green-600 hover:bg-green-700">
                        <Download className="h-4 w-4" /> 엑셀 다운로드
                    </Button>
                </div>
            </div>

            <Card className="overflow-hidden border-2">
                <CardHeader className="bg-secondary/10 border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            작성 현황 (O/X)
                        </CardTitle>
                        <div className="flex items-center gap-4 text-xs font-bold">
                            <div className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" /> 작성 완료</div>
                            <div className="flex items-center gap-1 text-red-500"><XCircle className="h-3 w-3" /> 미작성</div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    {loading ? (
                        <div className="p-12 text-center text-muted-foreground animate-pulse">데이터 분석 중...</div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-secondary/5">
                                <TableRow>
                                    <TableHead className="w-[80px] text-center font-bold">번호</TableHead>
                                    <TableHead className="w-[120px] font-bold">이름</TableHead>
                                    {dates.map(date => (
                                        <TableHead key={date} className="text-center font-mono text-[10px] min-w-[80px]">
                                            {date.split('-').slice(1).join('/')}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStudents.map((student) => (
                                    <TableRow key={student.id} className="hover:bg-secondary/5">
                                        <TableCell className="text-center font-medium">{student.number}</TableCell>
                                        <TableCell className="font-bold">
                                            <div className="flex justify-between items-center group/btn">
                                                <span>{student.name}</span>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-500 hover:bg-blue-50"
                                                        title="도감 보기"
                                                        onClick={() => fetchInventory(student)}
                                                    >
                                                        <BookOpen className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-primary hover:bg-primary/10"
                                                        title="전설 지급"
                                                        onClick={() => {
                                                            setSelectedStudent(student);
                                                            setIsRewardDialogOpen(true);
                                                        }}
                                                    >
                                                        <Gift className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </TableCell>
                                        {dates.map(date => {
                                            const hasReflection = checkReflection(student.id, date);
                                            return (
                                                <TableCell key={date} className="text-center">
                                                    {hasReflection ? (
                                                        <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                                                    ) : (
                                                        <XCircle className="h-5 w-5 text-red-200 mx-auto" />
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isRewardDialogOpen} onOpenChange={setIsRewardDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>전설의 포켓몬 보상 지급</DialogTitle>
                        <DialogDescription>
                            {selectedStudent?.name} 학생에게 특별한 포켓몬을 선물합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-3 gap-4 py-4">
                        {LEGENDARY_POKEMON.map((poke) => (
                            <button
                                key={poke.id}
                                disabled={isRewarding}
                                onClick={() => giveReward(poke.id, poke.name, poke.image, poke.types)}
                                className="group flex flex-col items-center p-4 border-2 rounded-xl border-secondary hover:border-primary hover:bg-primary/5 transition-all text-center"
                            >
                                <img src={poke.image} alt={poke.name} className="w-16 h-16 group-hover:scale-110 transition-transform" />
                                <span className="mt-2 font-bold text-sm">{poke.name}</span>
                                <span className="text-[10px] text-muted-foreground">#{poke.id}</span>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isPokedexOpen} onOpenChange={setIsPokedexOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
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
                        <div className="py-20 text-center animate-pulse text-muted-foreground font-bold">도감을 가져오는 중...</div>
                    ) : studentInventory.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground border-dashed border-2 rounded-xl">
                            아직 수집한 포켓몬이 없습니다.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 py-4">
                            {studentInventory.map((item) => (
                                <Card key={item.id} className="relative overflow-hidden group hover:border-primary transition-all">
                                    <div className={`absolute top-0 right-0 p-1 text-[10px] font-bold ${item.isLegendary ? 'bg-yellow-400 text-black' : 'bg-secondary text-muted-foreground'}`}>
                                        {item.isLegendary ? "LEGEND" : `#${item.pokemonId}`}
                                    </div>
                                    <CardContent className="p-3 text-center">
                                        <img src={item.image} alt={item.name} className="w-16 h-16 mx-auto group-hover:scale-110 transition-transform" />
                                        <p className="font-bold mt-2 text-sm capitalize">{item.name}</p>
                                        <p className="text-[10px] text-muted-foreground">Lv.{item.level}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function StatusPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center">로딩 중...</div>}>
            <StatusContent />
        </Suspense>
    );
}
