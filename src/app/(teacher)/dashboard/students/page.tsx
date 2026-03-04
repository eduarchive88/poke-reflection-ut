"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import * as XLSX from "xlsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Upload, Download, UserPlus, Trash2, ChevronLeft } from "lucide-react";
import { deleteDoc } from "firebase/firestore";

export const dynamic = 'force-dynamic';

export default function StudentsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-muted-foreground font-medium animate-pulse">로딩 중...</div>}>
            <StudentsContent />
        </Suspense>
    );
}

interface ClassData {
    id: string;
    className: string;
    sessionCode: string;
}

interface StudentData {
    id: string;
    grade: number;
    classNum: number;
    number: number;
    name: string;
    classId: string;
}

function StudentsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const urlClassId = searchParams.get("classId");

    const [classes, setClasses] = useState<ClassData[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [students, setStudents] = useState<StudentData[]>([]);
    const [loading, setLoading] = useState(true);

    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isAddIndividualOpen, setIsAddIndividualOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    // 개별 등록용 상태
    const [newStudent, setNewStudent] = useState({
        grade: "",
        classNum: "",
        number: "",
        name: ""
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const q = query(collection(db, "classes"), where("teacherId", "==", user.uid));
                const snapshots = await getDocs(q);
                const classList: ClassData[] = [];
                snapshots.forEach((doc) => classList.push({ id: doc.id, ...(doc.data() as Omit<ClassData, "id">) }));
                setClasses(classList);

                // URL 파라미터가 있으면 우선 적용, 없으면 첫 번째 학급
                if (urlClassId) {
                    setSelectedClassId(urlClassId);
                } else if (classList.length > 0) {
                    setSelectedClassId(classList[0].id);
                }
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [urlClassId]);

    useEffect(() => {
        if (selectedClassId) {
            fetchStudents(selectedClassId);
        }
    }, [selectedClassId]);

    const fetchStudents = async (classId: string) => {
        setLoading(true);
        try {
            const q = query(collection(db, "students"), where("classId", "==", classId));
            const snapshots = await getDocs(q);
            const studentList: StudentData[] = [];
            snapshots.forEach((doc) => studentList.push({ id: doc.id, ...(doc.data() as Omit<StudentData, "id">) }));

            studentList.sort((a, b) => {
                if (a.grade !== b.grade) return a.grade - b.grade;
                if (a.classNum !== b.classNum) return a.classNum - b.classNum;
                return a.number - b.number;
            });

            setStudents(studentList);
        } catch (error) {
            toast.error("학생 목록을 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setUploadFile(e.target.files[0]);
        }
    };

    const downloadTemplate = () => {
        const templateData = [
            { "학년": 3, "반": 2, "번호": 1, "이름": "홍길동" },
            { "학년": 3, "반": 2, "번호": 2, "이름": "성춘향" }
        ];
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "학생명단양식");
        XLSX.writeFile(workbook, "포켓몬성찰_학생일괄등록_양식.xlsx");
        toast.info("양식 파일이 다운로드되었습니다.");
    };

    const handleAddIndividual = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClassId) return;
        const { grade, classNum, number, name } = newStudent;
        if (!grade || !classNum || !number || !name) {
            toast.error("모든 정보를 입력해주세요.");
            return;
        }

        const targetClass = classes.find(c => c.id === selectedClassId);
        if (!targetClass) return;

        setUploading(true);
        try {
            const g = parseInt(grade);
            const c = parseInt(classNum);
            const n = parseInt(number);
            const docId = `${targetClass.sessionCode}_${g}_${c}_${n}`;
            const studentRef = doc(collection(db, "students"), docId);

            await setDoc(studentRef, {
                classId: selectedClassId,
                grade: g,
                classNum: c,
                number: n,
                name: name.trim(),
                createdAt: serverTimestamp()
            }, { merge: true });

            toast.success("학생이 성공적으로 등록되었습니다.");
            setIsAddIndividualOpen(false);
            setNewStudent({ grade: "", classNum: "", number: "", name: "" });
            fetchStudents(selectedClassId);
        } catch (error) {
            console.error(error);
            toast.error("학생 등록에 실패했습니다.");
        } finally {
            setUploading(false);
        }
    };

    const deleteStudent = async (studentId: string) => {
        if (!confirm("정말로 이 학생을 삭제하시겠습니까? 관련 데이터가 모두 보이지 않게 됩니다.")) return;
        try {
            await deleteDoc(doc(db, "students", studentId));
            toast.success("학생이 성공적으로 삭제되었습니다.");
            fetchStudents(selectedClassId);
        } catch (error) {
            toast.error("삭제 중 오류가 발생했습니다.");
        }
    };

    const processExcelAndUpload = async () => {
        if (!uploadFile) {
            toast.error("엑셀 파일을 선택해주세요.");
            return;
        }
        if (!selectedClassId) {
            toast.error("학급을 먼저 선택해주세요.");
            return;
        }

        const targetClass = classes.find(c => c.id === selectedClassId);
        if (!targetClass) return;

        setUploading(true);
        try {
            const data = await uploadFile.arrayBuffer();
            const workbook = XLSX.read(data);
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                toast.error("업로드된 엑셀 파일에 데이터가 없습니다.");
                setUploading(false);
                return;
            }

            const batch = writeBatch(db);
            let count = 0;

            interface ExcelRow {
                "학년"?: string | number;
                "grade"?: string | number;
                "반"?: string | number;
                "classNum"?: string | number;
                "class"?: string | number;
                "번호"?: string | number;
                "number"?: string | number;
                "이름"?: string;
                "name"?: string;
            }

            for (const row of jsonData as any[]) {
                // 대소문자 무관, 공백 무관하게 컬럼 매칭
                const findValue = (keys: string[]) => {
                    const foundKey = Object.keys(row).find(k =>
                        keys.some(key => k.replace(/\s/g, '').toLowerCase() === key.toLowerCase())
                    );
                    return foundKey ? row[foundKey] : null;
                };

                const gradeVal = findValue(["학년", "grade", "gr", "year"]);
                const classVal = findValue(["반", "class", "classnum", "cl"]);
                const numberVal = findValue(["번호", "number", "no", "num"]);
                const nameVal = findValue(["성명", "이름", "name", "nm"]);

                const grade = parseInt(String(gradeVal || 0));
                const classNum = parseInt(String(classVal || 0));
                const number = parseInt(String(numberVal || 0));
                const name = String(nameVal || "").trim();

                if (grade && classNum && number && name) {
                    const sessionCode = targetClass.sessionCode;
                    const docId = `${sessionCode}_${grade}_${classNum}_${number}`;
                    const studentRef = doc(collection(db, "students"), docId);

                    batch.set(studentRef, {
                        classId: selectedClassId,
                        grade,
                        classNum,
                        number,
                        name,
                        createdAt: serverTimestamp()
                    }, { merge: true });

                    count++;
                }
            }

            if (count > 0) {
                await batch.commit();
                toast.success(`${count}명의 학생 배치가 완료/갱신 되었습니다.`);
                setIsUploadOpen(false);
                setUploadFile(null);
                fetchStudents(selectedClassId);
            } else {
                toast.error("올바른 컬럼(학년, 반, 번호, 이름) 양식을 찾을 수 없습니다.");
            }

        } catch (error) {
            console.error(error);
            toast.error("엑셀 처리 중 오류가 발생했습니다.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-8 pb-12">
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
                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/town-map.png" alt="Students" className="w-8 h-8 pixelated" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black tracking-tighter text-black uppercase" style={{ fontFamily: '"NeoDunggeunmo", sans-serif', textShadow: '2px 2px 0px white' }}>학생 명렬표 관리</h2>
                            <p className="text-slate-800 font-medium tracking-tight text-sm bg-white/50 px-2 py-1 rounded inline-block border-2 border-black border-dashed">학급별 학생 명단을 확인하고 엑셀로 일괄 등록 및 개별 관리를 수행합니다.</p>
                        </div>
                    </div>
                </div>

                {classes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                            <SelectTrigger className="w-full sm:w-[200px] h-12 retro-box bg-white text-black font-bold outline-none ring-0">
                                <SelectValue placeholder="학급 선택" />
                            </SelectTrigger>
                            <SelectContent className="retro-box bg-white border-4 border-black rounded-none shadow-none">
                                {classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id} className="focus:bg-amber-100 focus:text-black font-bold cursor-pointer">{cls.className}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex gap-2 w-full sm:w-auto">
                            <Dialog open={isAddIndividualOpen} onOpenChange={setIsAddIndividualOpen}>
                                <DialogTrigger asChild>
                                    <Button className="h-12 flex-1 sm:flex-none px-6 retro-btn bg-amber-400 hover:bg-amber-300 text-black font-black flex items-center gap-2">
                                        <img src="https://play.pokemonshowdown.com/sprites/itemicons/poke-ball.png" alt="Add" className="w-5 h-5 pixelated" />
                                        개별 추가
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px] retro-box bg-slate-100 p-6">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-black text-black uppercase flex items-center gap-2" style={{ fontFamily: '"NeoDunggeunmo", sans-serif' }}>
                                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/poke-ball.png" alt="" className="w-6 h-6 pixelated" />
                                            학생 개별 등록
                                        </DialogTitle>
                                        <DialogDescription className="text-black font-bold bg-white/50 p-2 rounded border-2 border-slate-300 border-dashed mt-2">
                                            학생의 정보를 직접 입력하여 등록합니다. 번호가 중복되면 기존 정보가 갱신됩니다.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleAddIndividual} className="grid gap-6 py-6">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="grade" className="text-right text-black font-bold">학년</Label>
                                            <Input id="grade" type="number" value={newStudent.grade} onChange={e => setNewStudent({ ...newStudent, grade: e.target.value })} className="col-span-3 retro-box bg-white font-bold h-12 focus-visible:ring-0 focus-visible:ring-offset-0" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="classNum" className="text-right text-black font-bold">반</Label>
                                            <Input id="classNum" type="number" value={newStudent.classNum} onChange={e => setNewStudent({ ...newStudent, classNum: e.target.value })} className="col-span-3 retro-box bg-white font-bold h-12 focus-visible:ring-0 focus-visible:ring-offset-0" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="number" className="text-right text-black font-bold">번호</Label>
                                            <Input id="number" type="number" value={newStudent.number} onChange={e => setNewStudent({ ...newStudent, number: e.target.value })} className="col-span-3 retro-box bg-white font-bold h-12 focus-visible:ring-0 focus-visible:ring-offset-0" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="name" className="text-right text-black font-bold">이름</Label>
                                            <Input id="name" value={newStudent.name} onChange={e => setNewStudent({ ...newStudent, name: e.target.value })} className="col-span-3 retro-box bg-white font-bold h-12 focus-visible:ring-0 focus-visible:ring-offset-0" />
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit" disabled={uploading} className="h-12 w-full retro-btn bg-amber-400 hover:bg-amber-300 text-black font-black flex items-center justify-center gap-2">
                                                {uploading ? (
                                                    <>등록 중...</>
                                                ) : (
                                                    <>
                                                        <img src="https://play.pokemonshowdown.com/sprites/itemicons/repel.png" alt="" className="w-5 h-5 pixelated" />
                                                        학생 저장
                                                    </>
                                                )}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>

                            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                                <DialogTrigger asChild>
                                    <Button className="h-12 flex-1 sm:flex-none px-6 retro-btn bg-emerald-400 hover:bg-emerald-300 text-black font-black flex items-center gap-2">
                                        <img src="https://play.pokemonshowdown.com/sprites/itemicons/tm-normal.png" alt="Upload" className="w-5 h-5 pixelated" />
                                        일괄 등록
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px] retro-box bg-slate-100 p-6">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-black text-black uppercase flex items-center gap-2" style={{ fontFamily: '"NeoDunggeunmo", sans-serif' }}>
                                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/pc-box.png" alt="" className="w-6 h-6 pixelated" />
                                            엑셀 명렬표 업로드
                                        </DialogTitle>
                                        <DialogDescription className="text-black font-bold bg-white/50 p-2 rounded border-2 border-slate-300 border-dashed mt-2">
                                            &quot;학년&quot;, &quot;반&quot;, &quot;번호&quot;, &quot;이름&quot; 열이 포함된 파일을 선택해주세요.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-6 py-6">
                                        <Button className="h-12 w-full retro-btn bg-slate-200 hover:bg-slate-300 text-black font-bold flex items-center gap-2" onClick={downloadTemplate}>
                                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/exp-candys.png" alt="" className="w-5 h-5 pixelated" />
                                            작성 양식 받기 (Excel)
                                        </Button>
                                        <div className="space-y-2">
                                            <Label htmlFor="file" className="text-sm text-black font-bold ml-1">
                                                파일 선택
                                            </Label>
                                            <Input
                                                id="file"
                                                type="file"
                                                accept=".xlsx, .xls, .csv"
                                                className="retro-box bg-white font-bold h-12 focus-visible:ring-0 focus-visible:ring-offset-0 file:bg-slate-200 file:text-black file:border-2 file:border-black file:border-b-4 file:font-bold file:px-2 file:mr-4 file:h-8 hover:file:bg-slate-300"
                                                onChange={handleFileUpload}
                                                disabled={uploading}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            onClick={processExcelAndUpload}
                                            disabled={!uploadFile || uploading}
                                            className="h-14 w-full retro-btn bg-emerald-400 hover:bg-emerald-300 text-black font-black flex items-center justify-center gap-2"
                                        >
                                            {uploading ? (
                                                <>데이터 분석 및 업로드 중...</>
                                            ) : (
                                                <>
                                                    <img src="https://play.pokemonshowdown.com/sprites/itemicons/up-grade.png" alt="" className="w-5 h-5 pixelated" />
                                                    명단 일괄 등록하기
                                                </>
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                )}
            </div>

            <Card className="retro-box overflow-hidden bg-white">
                <CardHeader className="bg-indigo-100 border-b-4 border-black p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/pokedex.png" alt="Pokedex" className="w-10 h-10 pixelated" />
                            <div>
                                <CardTitle className="text-2xl font-black text-black uppercase" style={{ fontFamily: '"NeoDunggeunmo", sans-serif' }}>
                                    {classes.find(c => c.id === selectedClassId)?.className || "학급 미지정"}
                                </CardTitle>
                                <CardDescription className="text-slate-700 font-bold bg-white/60 px-2 py-0.5 rounded border-2 border-slate-300 border-dashed inline-block mt-1">
                                    총 학생 수: <span className="text-indigo-600 font-black px-1">{students.length}</span>명
                                </CardDescription>
                            </div>
                        </div>
                        <div className="text-[12px] font-black uppercase text-black bg-white px-3 py-1 border-2 border-black border-dashed">
                            STUDENT DIRECTORY
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    {loading ? (
                        <div className="p-24 text-center text-black font-black text-xl flex flex-col items-center justify-center gap-4">
                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/town-map.png" alt="Loading" className="w-12 h-12 pixelated animate-bounce" />
                            <p style={{ fontFamily: '"NeoDunggeunmo", sans-serif' }}>데이터 동기화 중...</p>
                        </div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-24 text-black font-bold border-4 border-dashed border-slate-300 rounded-xl bg-slate-50 m-6 flex flex-col items-center gap-4">
                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/poke-ball.png" alt="Empty" className="w-12 h-12 pixelated opacity-50 grayscale" />
                            <p className="bg-white px-4 py-2 border-2 border-slate-300 border-dashed">등록된 학생 데이터가 없습니다.<br />상단 버튼을 통해 등록해주세요.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-200 border-b-4 border-black">
                                <TableRow className="border-b-4 border-black hover:bg-transparent">
                                    <TableHead className="w-[100px] text-center font-black text-black">학년</TableHead>
                                    <TableHead className="w-[100px] text-center font-black text-black">반</TableHead>
                                    <TableHead className="w-[100px] text-center font-black text-black">번호</TableHead>
                                    <TableHead className="font-black text-black">이름</TableHead>
                                    <TableHead className="w-[100px] text-center font-black text-black">관리</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.map((student) => (
                                    <TableRow key={student.id} className="border-b-2 border-slate-200 hover:bg-amber-50 transition-colors">
                                        <TableCell className="text-center font-black text-black">{student.grade}</TableCell>
                                        <TableCell className="text-center font-black text-black">{student.classNum}</TableCell>
                                        <TableCell className="text-center font-black text-black">{student.number}</TableCell>
                                        <TableCell className="font-black text-black text-base">{student.name}</TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => deleteStudent(student.id)}
                                                className="retro-btn bg-red-400 hover:bg-red-500 text-black p-1 w-8 h-8 flex items-center justify-center mx-auto"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// 페이지 하단 중복 제거
