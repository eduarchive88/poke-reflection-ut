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
                        className="rounded-full hover:bg-slate-800/50"
                    >
                        <ChevronLeft className="h-6 w-6 text-slate-400 hover:text-white" />
                    </Button>
                    <div className="space-y-1">
                        <h2 className="text-4xl font-black tracking-tighter gold-gradient-text">학생 명렬표 관리</h2>
                        <p className="text-slate-400 font-medium tracking-tight">학급별 학생 명단을 확인하고 엑셀로 일괄 등록 및 개별 관리를 수행합니다.</p>
                    </div>
                </div>

                {classes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                            <SelectTrigger className="w-full sm:w-[200px] h-12 rounded-2xl bg-slate-800/40 border-slate-700/50 text-slate-300 font-bold focus:ring-amber-500">
                                <SelectValue placeholder="학급 선택" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 rounded-2xl shadow-2xl">
                                {classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id} className="rounded-xl focus:bg-amber-500/10 focus:text-amber-400">{cls.className}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex gap-2 w-full sm:w-auto">
                            <Dialog open={isAddIndividualOpen} onOpenChange={setIsAddIndividualOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="h-12 flex-1 sm:flex-none px-6 rounded-2xl bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/60 text-slate-300 font-bold transition-all gap-2">
                                        <UserPlus className="h-5 w-5 text-amber-500" />
                                        개별 추가
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px] bg-slate-950 border-slate-800 rounded-3xl p-8">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-black text-slate-100">학생 개별 등록</DialogTitle>
                                        <DialogDescription className="text-slate-400 font-medium">
                                            학생의 정보를 직접 입력하여 등록합니다. 번호가 중복되면 기존 정보가 갱신됩니다.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleAddIndividual} className="grid gap-6 py-6">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="grade" className="text-right text-slate-400 font-bold">학년</Label>
                                            <Input id="grade" type="number" value={newStudent.grade} onChange={e => setNewStudent({ ...newStudent, grade: e.target.value })} className="col-span-3 bg-slate-900/50 border-slate-700 rounded-xl h-12 focus:ring-amber-500" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="classNum" className="text-right text-slate-400 font-bold">반</Label>
                                            <Input id="classNum" type="number" value={newStudent.classNum} onChange={e => setNewStudent({ ...newStudent, classNum: e.target.value })} className="col-span-3 bg-slate-900/50 border-slate-700 rounded-xl h-12 focus:ring-amber-500" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="number" className="text-right text-slate-400 font-bold">번호</Label>
                                            <Input id="number" type="number" value={newStudent.number} onChange={e => setNewStudent({ ...newStudent, number: e.target.value })} className="col-span-3 bg-slate-900/50 border-slate-700 rounded-xl h-12 focus:ring-amber-500" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="name" className="text-right text-slate-400 font-bold">이름</Label>
                                            <Input id="name" value={newStudent.name} onChange={e => setNewStudent({ ...newStudent, name: e.target.value })} className="col-span-3 bg-slate-900/50 border-slate-700 rounded-xl h-12 focus:ring-amber-500" />
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit" disabled={uploading} className="h-12 w-full rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/20 transition-all active:scale-95">
                                                {uploading ? "등록 중..." : "학생 저장"}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>

                            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="default" className="h-12 flex-1 sm:flex-none px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95 gap-2">
                                        <Upload className="h-5 w-5" />
                                        일괄 등록
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px] bg-slate-950 border-slate-800 rounded-3xl p-8">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-black text-slate-100">엑셀 명렬표 업로드</DialogTitle>
                                        <DialogDescription className="text-slate-400 font-medium">
                                            &quot;학년&quot;, &quot;반&quot;, &quot;번호&quot;, &quot;이름&quot; 열이 포함된 파일을 선택해주세요.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-6 py-6">
                                        <Button variant="outline" className="h-12 w-full rounded-2xl bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/60 text-slate-300 font-bold transition-all gap-2" onClick={downloadTemplate}>
                                            <Download className="h-5 w-5 text-amber-500" />
                                            작성 양식 받기 (Excel)
                                        </Button>
                                        <div className="space-y-2">
                                            <Label htmlFor="file" className="text-sm text-slate-400 font-bold ml-1">
                                                파일 선택
                                            </Label>
                                            <Input
                                                id="file"
                                                type="file"
                                                accept=".xlsx, .xls, .csv"
                                                className="bg-slate-900/50 border-slate-700 rounded-xl h-12 focus:ring-amber-500 file:bg-slate-800 file:text-slate-300 file:border-0 file:rounded-lg file:mr-4 file:h-8 hover:file:bg-slate-700"
                                                onChange={handleFileUpload}
                                                disabled={uploading}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            onClick={processExcelAndUpload}
                                            disabled={!uploadFile || uploading}
                                            className="h-14 w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                                        >
                                            {uploading ? "데이터 분석 및 업로드 중..." : "명단 일괄 등록하기"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                )}
            </div>

            <Card className="premium-card overflow-hidden border-slate-800/80 rounded-3xl">
                <CardHeader className="bg-slate-950/40 border-b border-slate-800/60 p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl font-black text-slate-100 flex items-center gap-3">
                                {classes.find(c => c.id === selectedClassId)?.className || "학급 미지정"}
                            </CardTitle>
                            <CardDescription className="text-slate-400 font-medium">총 학생 수: <span className="text-amber-500 font-black">{students.length}</span>명</CardDescription>
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-950/50 px-3 py-1 rounded-lg border border-slate-800/50">
                            STUDENT DIRECTORY MATRIX
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    {loading ? (
                        <div className="p-32 text-center text-slate-500 font-bold animate-pulse tracking-tighter text-xl">데이터베이스 동기화 중...</div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-24 text-slate-500 font-medium border-2 border-dashed border-slate-800/50 rounded-3xl bg-slate-900/20 m-6">
                            등록된 학생 데이터가 없습니다. 상단 버튼을 통해 등록해주세요.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-950/60 font-black">
                                <TableRow className="border-slate-800/80 hover:bg-transparent">
                                    <TableHead className="w-[100px] text-center font-black text-slate-300 uppercase text-[10px] tracking-widest">학년</TableHead>
                                    <TableHead className="w-[100px] text-center font-black text-slate-300 uppercase text-[10px] tracking-widest">반</TableHead>
                                    <TableHead className="w-[100px] text-center font-black text-slate-300 uppercase text-[10px] tracking-widest">번호</TableHead>
                                    <TableHead className="font-black text-slate-300 uppercase text-[10px] tracking-widest">이름</TableHead>
                                    <TableHead className="w-[100px] text-center font-black text-slate-300 uppercase text-[10px] tracking-widest">관리</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.map((student) => (
                                    <TableRow key={student.id} className="border-slate-800/40 hover:bg-slate-800/20 transition-colors group">
                                        <TableCell className="text-center font-mono font-black text-slate-300 group-hover:text-amber-400 whitespace-nowrap">{student.grade}</TableCell>
                                        <TableCell className="text-center font-mono font-black text-slate-300 group-hover:text-amber-400 whitespace-nowrap">{student.classNum}</TableCell>
                                        <TableCell className="text-center font-mono font-black text-slate-300 group-hover:text-amber-400 whitespace-nowrap">{student.number}</TableCell>
                                        <TableCell className="font-black text-slate-100 group-hover:text-amber-300 text-base">{student.name}</TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => deleteStudent(student.id)}
                                                className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
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
