"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import { Upload, Download, UserPlus, Trash2 } from "lucide-react";
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

            for (const row of jsonData as ExcelRow[]) {
                const grade = parseInt(String(row["학년"] || row["grade"] || 0));
                const classNum = parseInt(String(row["반"] || row["classNum"] || row["class"] || 0));
                const number = parseInt(String(row["번호"] || row["number"] || 0));
                const name = row["이름"] || row["name"] || "";

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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">학생 명렬표</h2>
                    <p className="text-muted-foreground mt-2">
                        학급별 학생 명단을 확인하고 엑셀로 일괄 등록하세요.
                    </p>
                </div>

                {classes.length > 0 && (
                    <div className="flex items-center gap-4">
                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="학급 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id}>{cls.className}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex gap-2">
                            <Dialog open={isAddIndividualOpen} onOpenChange={setIsAddIndividualOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="gap-2">
                                        <UserPlus className="h-4 w-4" />
                                        개별 추가
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>학생 개별 등록</DialogTitle>
                                        <DialogDescription>
                                            학생의 정보를 직접 입력하여 등록합니다. 번호가 중복되면 기존 정보가 갱신됩니다.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleAddIndividual} className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="grade" className="text-right">학년</Label>
                                            <Input id="grade" type="number" value={newStudent.grade} onChange={e => setNewStudent({ ...newStudent, grade: e.target.value })} className="col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="classNum" className="text-right">반</Label>
                                            <Input id="classNum" type="number" value={newStudent.classNum} onChange={e => setNewStudent({ ...newStudent, classNum: e.target.value })} className="col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="number" className="text-right">번호</Label>
                                            <Input id="number" type="number" value={newStudent.number} onChange={e => setNewStudent({ ...newStudent, number: e.target.value })} className="col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="name" className="text-right">이름</Label>
                                            <Input id="name" value={newStudent.name} onChange={e => setNewStudent({ ...newStudent, name: e.target.value })} className="col-span-3" />
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit" disabled={uploading}>{uploading ? "등록 중..." : "등록하기"}</Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>

                            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="default" className="gap-2">
                                        <Upload className="h-4 w-4" />
                                        일괄 등록
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>엑셀 명렬표 업로드</DialogTitle>
                                        <DialogDescription>
                                            &quot;학년&quot;, &quot;반&quot;, &quot;번호&quot;, &quot;이름&quot; 열이 포함된 파일을 선택해주세요.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <Button variant="outline" className="gap-2 mb-2" onClick={downloadTemplate}>
                                            <Download className="h-4 w-4" />
                                            샘플 양식 다운로드
                                        </Button>
                                        <div className="flex items-center gap-4">
                                            <Label htmlFor="file" className="w-[80px] text-right">
                                                파일 선택
                                            </Label>
                                            <Input
                                                id="file"
                                                type="file"
                                                accept=".xlsx, .xls, .csv"
                                                className="flex-1"
                                                onChange={handleFileUpload}
                                                disabled={uploading}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={processExcelAndUpload} disabled={!uploadFile || uploading}>
                                            {uploading ? "업로드 중..." : "등록하기"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{classes.find(c => c.id === selectedClassId)?.className || "학급 미지정"}</CardTitle>
                    <CardDescription>총 학생 수: {students.length}명</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-6 text-muted-foreground">목록 갱신 중...</div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg bg-secondary/20">
                            명단이 비어있습니다.
                        </div>
                    ) : (
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[100px] text-center">학년</TableHead>
                                        <TableHead className="w-[100px] text-center">반</TableHead>
                                        <TableHead className="w-[100px] text-center">번호</TableHead>
                                        <TableHead>이름</TableHead>
                                        <TableHead className="w-[100px] text-center">관리</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.map((student) => (
                                        <TableRow key={student.id}>
                                            <TableCell className="text-center font-medium">{student.grade}</TableCell>
                                            <TableCell className="text-center">{student.classNum}</TableCell>
                                            <TableCell className="text-center">{student.number}</TableCell>
                                            <TableCell className="font-medium">{student.name}</TableCell>
                                            <TableCell className="text-center">
                                                <Button variant="ghost" size="icon" onClick={() => deleteStudent(student.id)} className="h-8 w-8 text-red-500 hover:bg-red-50">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <footer className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground space-y-2">
                <p>만든 사람: 경기도 지구과학 교사 뀨짱</p>
                <div className="flex justify-center gap-4">
                    <a href="https://open.kakao.com/o/s7hVU65h" target="_blank" rel="noopener noreferrer" className="hover:text-primary underline transition-colors">
                        문의: 카카오톡 오픈채팅
                    </a>
                    <a href="https://eduarchive.tistory.com/" target="_blank" rel="noopener noreferrer" className="hover:text-primary underline transition-colors">
                        뀨짱쌤의 교육자료 아카이브
                    </a>
                </div>
            </footer>
        </div>
    );
}

// 페이지 하단 중복 제거
