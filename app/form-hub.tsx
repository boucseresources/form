"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Image from "next/image"
import {
  AlertCircle,
  BookOpen,
  Calculator,
  CheckCircle2,
  CircleHelp,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Link2,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  courses,
  eligibilityForGrade,
  type FormCategory,
  gradePoints,
  officialLinks,
  parseResultText,
  semesterNames,
} from "@/lib/bou-data"
import { downloadFormPdf, preloadPdfAssets } from "@/lib/download-form-pdf"

type ImportedGrade = { code: string; grade: string }
type Draft = {
  selectionModeVersion: "manual-v2"
  category: FormCategory
  studentId: string
  studentName: string
  session: string
  term: string
  studyCenter: string
  bankName: string
  bankBranch: string
  accountNumber: string
  semester: string
  submissionDate: string
  selectedCodes: string[]
  importedGrades: ImportedGrade[]
  includeDigitalId: boolean
  includeCalendar: boolean
  courseFee: string
  deadline: string
  finalLateDate: string
  lateRateOne: string
  lateRateTwo: string
  applyLateFee: boolean
  regPerCredit: string
  regExamPerCourse: string
  regSemesterFee: string
  regMarksheetFee: string
  regDigitalIdFee: string
  regCalendarFee: string
  regCertificateFee: string
  regTranscriptFee: string
  regBillableCredits: string
  regExamCourseCount: string
}

function localIsoDate(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

const paymentDetails = {
  bankName: "Janata Bank Ltd.",
  bankBranch: "BOU Campus Branch",
  accountNumber: "SND 09030320000411",
}

const studyCenters = [
  { code: "801", name: "Dhaka Regional Center (DRC)", bn: "ঢাকা আঞ্চলিক কেন্দ্র" },
  { code: "020", name: "Dhaka University of Engineering and Technology (DUET)", bn: "ঢাকা প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয়" },
]

type RegistrationProfile = {
  session: string
  billableCredits: number
  examCourses: number
  classStart: string
  noticeTotal: number
  certificate: number
  transcript: number
}

const registrationNotice = {
  term: "252",
  published: "14 August 2026",
  registrationFrom: "21 September 2026",
  registrationTo: "05 November 2026",
  osapsUrl: "https://osapsnew.bou.ac.bd/login",
  profiles: {
    "1-2": { session: "2024-2025", billableCredits: 17, examCourses: 7, classStart: "11 September 2026", noticeTotal: 14221, certificate: 0, transcript: 0 },
    "2-2": { session: "2022-2023", billableCredits: 18.5, examCourses: 9, classStart: "11 September 2026", noticeTotal: 15876, certificate: 0, transcript: 0 },
    "3-2": { session: "2021-2022", billableCredits: 19.25, examCourses: 9, classStart: "18 September 2026", noticeTotal: 16372.5, certificate: 0, transcript: 0 },
    "4-2": { session: "2020-2021", billableCredits: 17.25, examCourses: 7, classStart: "23 October 2026", noticeTotal: 15286.5, certificate: 500, transcript: 400 },
  } as Record<string, RegistrationProfile>,
}

const initialDraft: Draft = {
  selectionModeVersion: "manual-v2",
  category: "improvement",
  studentId: "",
  studentName: "",
  session: "",
  term: "",
  studyCenter: "",
  bankName: paymentDetails.bankName,
  bankBranch: paymentDetails.bankBranch,
  accountNumber: paymentDetails.accountNumber,
  semester: "",
  submissionDate: "",
  selectedCodes: [],
  importedGrades: [],
  includeDigitalId: false,
  includeCalendar: false,
  courseFee: "",
  deadline: "",
  finalLateDate: "",
  lateRateOne: "",
  lateRateTwo: "",
  applyLateFee: false,
  regPerCredit: "",
  regExamPerCourse: "",
  regSemesterFee: "",
  regMarksheetFee: "",
  regDigitalIdFee: "",
  regCalendarFee: "",
  regCertificateFee: "",
  regTranscriptFee: "",
  regBillableCredits: "",
  regExamCourseCount: "",
}

const categoryMeta: Record<FormCategory, { label: string; bn: string; description: string; icon: typeof FileText }> = {
  registration: {
    label: "Course Registration",
    bn: "কোর্স রেজিস্ট্রেশন",
    description: "নিয়মিত সেমিস্টারের কোর্স, ক্রেডিট ও পরীক্ষার ফি হিসাবের জন্য।",
    icon: FileText,
  },
  failed: {
    label: "Failed / Absent",
    bn: "ফেল / অনুপস্থিত",
    description: "F গ্রেড পাওয়া বা পরীক্ষায় অনুপস্থিত থাকা কোর্সের পুনঃপরীক্ষার জন্য।",
    icon: RotateCcw,
  },
  improvement: {
    label: "Grade Improvement",
    bn: "গ্রেড ইমপ্রুভমেন্ট",
    description: "B− বা তার নিচের পাস করা গ্রেড একবার উন্নয়নের জন্য।",
    icon: Sparkles,
  },
}

function amount(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function money(value: number) {
  return new Intl.NumberFormat("en-BD", { maximumFractionDigits: 2 }).format(value)
}

function daysBetween(from: string, to: string) {
  if (!from || !to) return 0
  const start = new Date(`${from}T00:00:00Z`).getTime()
  const end = new Date(`${to}T00:00:00Z`).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0
  return Math.max(0, Math.round((end - start) / 86_400_000))
}

export function FormHub() {
  const [draft, setDraft] = useState<Draft>(initialDraft)
  const [courseSearch, setCourseSearch] = useState("")
  const [resultText, setResultText] = useState("")
  const [importReport, setImportReport] = useState<string[]>([])
  const [pdfDownloading, setPdfDownloading] = useState(false)
  const [pdfError, setPdfError] = useState("")
  const [pdfReady, setPdfReady] = useState<{ url: string; fileName: string } | null>(null)
  const hydrated = useRef(false)

  useEffect(() => {
    preloadPdfAssets().catch(() => undefined)
  }, [])

  useEffect(() => {
    return () => {
      if (pdfReady) window.URL.revokeObjectURL(pdfReady.url)
    }
  }, [pdfReady])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem("bou-cse-form-draft-v1")
      if (stored) {
        try {
          const saved = JSON.parse(stored) as Partial<Draft>
          const validCenter = studyCenters.some((center) => center.code === saved.studyCenter)
          const shouldClearLegacyAutoSelection = saved.selectionModeVersion !== "manual-v2" && Boolean(saved.importedGrades?.length)
          setDraft({
            ...initialDraft,
            ...saved,
            selectionModeVersion: "manual-v2",
            selectedCodes: shouldClearLegacyAutoSelection ? [] : saved.selectedCodes || [],
            submissionDate: saved.submissionDate || localIsoDate(),
            studyCenter: validCenter ? saved.studyCenter! : initialDraft.studyCenter,
            ...paymentDetails,
          })
        } catch {
          window.localStorage.removeItem("bou-cse-form-draft-v1")
        }
      }
      hydrated.current = true
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!hydrated.current) return
    window.localStorage.setItem("bou-cse-form-draft-v1", JSON.stringify(draft))
  }, [draft])

  const semesterCourses = useMemo(() => {
    const query = courseSearch.trim().toLowerCase()
    return courses.filter(
      (course) =>
        course.semester === draft.semester &&
        (!query || course.code.toLowerCase().includes(query) || course.title.toLowerCase().includes(query)),
    )
  }, [courseSearch, draft.semester])

  const selectedCourses = courses.filter((course) => draft.selectedCodes.includes(course.code))
  const gradeMap = new Map(draft.importedGrades.map((item) => [item.code, item.grade]))
  const courseCount = selectedCourses.length
  const creditCount = selectedCourses.reduce((sum, course) => sum + course.credit, 0)
  const registrationProfile = registrationNotice.profiles[draft.semester]
  const billableCredits = draft.regBillableCredits === "" ? creditCount : Math.max(0, Number(draft.regBillableCredits) || 0)
  const examFeeCourseCount = draft.regExamCourseCount === "" ? courseCount : Math.max(0, Number(draft.regExamCourseCount) || 0)
  const effectiveSubmissionDate = draft.submissionDate
  const lateDays = draft.category === "registration" ? 0 : daysBetween(draft.deadline, effectiveSubmissionDate)
  const rateOne = amount(draft.lateRateOne)
  const rateTwo = amount(draft.lateRateTwo)
  const latePerCourse = draft.applyLateFee ? Math.min(lateDays, 7) * rateOne + Math.max(0, Math.min(lateDays - 7, 7)) * rateTwo : 0
  const isOutsideNotice = draft.category !== "registration" && Boolean(draft.finalLateDate) && effectiveSubmissionDate > draft.finalLateDate
  const isBeforeDeadline = draft.category !== "registration" && Boolean(draft.deadline) && effectiveSubmissionDate < draft.deadline
  const isDeadlineDay = draft.category !== "registration" && Boolean(draft.deadline) && effectiveSubmissionDate === draft.deadline

  const registrationBreakdown = {
    course: billableCredits * amount(draft.regPerCredit),
    exam: examFeeCourseCount * amount(draft.regExamPerCourse),
    semester: amount(draft.regSemesterFee),
    marksheet: amount(draft.regMarksheetFee),
    digitalId: 0,
    calendar: amount(draft.regCalendarFee),
    certificate: amount(draft.regCertificateFee),
    transcript: amount(draft.regTranscriptFee),
  }
  const registrationTotal = Object.values(registrationBreakdown).reduce((sum, value) => sum + value, 0)
  const examBaseTotal = courseCount * amount(draft.courseFee)
  const lateTotal = courseCount * latePerCourse
  const total = draft.category === "registration" ? registrationTotal : examBaseTotal + lateTotal
  const meta = categoryMeta[draft.category]
  const CategoryIcon = meta.icon

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function handleDownloadPdf() {
    if (!courseCount || pdfDownloading) return
    setPdfDownloading(true)
    setPdfError("")
    setPdfReady(null)
    try {
      const selectedStudyCenter = studyCenters.find((center) => center.code === draft.studyCenter)
      const formTitle = draft.category === "registration" ? "SEMESTER REGISTRATION FORM" : draft.category === "improvement" ? "IMPROVE REGISTRATION FORM" : "RE-EXAM REGISTRATION FORM"
      const courseSectionLabel = draft.category === "registration" ? "Registration" : draft.category === "improvement" ? "Improve" : "Re-Exam"
      const perCourseFeeLabel = draft.category === "improvement" ? "Improve Fee per Course" : "Re-Exam Fee per Course"
      const registrationFeeRows = [
        { label: `a) Course Registration Fee (Per credit BDT ${draft.regPerCredit}/-): (BDT ${draft.regPerCredit} x ${billableCredits})`, amount: registrationBreakdown.course },
        { label: `b) Examination Fee (Per course BDT ${draft.regExamPerCourse}/-): (BDT ${draft.regExamPerCourse} x ${examFeeCourseCount})`, amount: registrationBreakdown.exam },
        { label: `c) Semester Registration Fee (Per semester BDT ${draft.regSemesterFee}/-)`, amount: registrationBreakdown.semester },
        { label: `d) Semester Marks Sheet (BDT ${draft.regMarksheetFee}/-)`, amount: registrationBreakdown.marksheet },
        ...(registrationBreakdown.calendar > 0 ? [{ label: `e) Academic Calendar Fee (Per semester BDT ${draft.regCalendarFee}/-)`, amount: registrationBreakdown.calendar }] : []),
        ...(registrationBreakdown.certificate > 0 ? [{ label: `f) Original Certificate Fee (BDT ${draft.regCertificateFee}/-)`, amount: registrationBreakdown.certificate }] : []),
        ...(registrationBreakdown.transcript > 0 ? [{ label: `g) Transcript Fee (BDT ${draft.regTranscriptFee}/-)`, amount: registrationBreakdown.transcript }] : []),
      ]
      const examFeeRows = [
        { label: `a) ${perCourseFeeLabel} (BDT ${draft.courseFee} x ${courseCount} course${courseCount === 1 ? "" : "s"})`, amount: examBaseTotal },
        ...(lateTotal > 0 ? [{ label: `b) Late Fine (${lateDays} day${lateDays === 1 ? "" : "s"}, BDT ${money(latePerCourse)} per course)`, amount: lateTotal }] : []),
      ]
      const fileName = `BOU-${draft.category}-${draft.studentId || "form"}-${draft.term || "term"}.pdf`
      const url = await downloadFormPdf({
        fileName,
        formTitle,
        courseSectionLabel,
        studentId: draft.studentId,
        studentName: draft.studentName,
        yearAndSemester: semesterNames[draft.semester] || "",
        studyCentre: selectedStudyCenter ? `${selectedStudyCenter.name} - ${selectedStudyCenter.code}` : "",
        session: draft.session,
        term: draft.term,
        courses: selectedCourses.map((course) => ({ ...course, grade: gradeMap.get(course.code) || "-" })),
        totalCredits: creditCount,
        showGrade: draft.category === "improvement",
        feeTitle: draft.category === "registration" ? "Fee Details for Registration" : `Fee Details for ${draft.category === "improvement" ? "Improvement" : "Re-Examination"}`,
        feeRows: draft.category === "registration" ? registrationFeeRows : examFeeRows,
        total,
      })
      setPdfReady({ url, fileName })
    } catch (error) {
      console.error(error)
      setPdfError("PDF তৈরি করা যায়নি। নিচের Print / Save as PDF অপশনটি ব্যবহার করুন।")
    } finally {
      setPdfDownloading(false)
    }
  }

  function selectCategory(category: FormCategory) {
    setDraft((current) => ({
      ...current,
      category,
      selectedCodes: [],
    }))
  }

  function selectSemester(semester: string) {
    setDraft((current) => ({
      ...current,
      semester,
      selectedCodes: [],
    }))
  }

  function selectAllSemesterCourses() {
    const codes = courses.filter((course) => course.semester === draft.semester).map((course) => course.code)
    update("selectedCodes", codes)
  }

  function toggleCourse(code: string) {
    setDraft((current) => ({
      ...current,
      selectedCodes: current.selectedCodes.includes(code)
        ? current.selectedCodes.filter((item) => item !== code)
        : [...current.selectedCodes, code],
    }))
  }

  function importResults() {
    const parsed = parseResultText(resultText)
    const eligibleCodes = parsed.grades
      .filter((item) => {
        const kind = eligibilityForGrade(item.grade).kind
        return draft.category === "improvement" ? kind === "improvement" : draft.category === "failed" ? kind === "failed" : false
      })
      .map((item) => item.code)
    setDraft((current) => ({
      ...current,
      importedGrades: parsed.grades,
      ...(current.category === "registration" ? {} : { selectedCodes: [] }),
      ...(parsed.studentId ? { studentId: parsed.studentId } : {}),
      ...(parsed.studentName ? { studentName: parsed.studentName } : {}),
      ...(parsed.session ? { session: parsed.session } : {}),
      ...(parsed.studyCenter ? { studyCenter: parsed.studyCenter } : {}),
    }))
    const report = [
      parsed.studentId ? "Student ID" : "",
      parsed.studentName ? "নাম" : "",
      parsed.session ? "Session" : "",
      parsed.studyCenter ? "Study Centre" : "",
      parsed.grades.length ? `${parsed.grades.length}টি result` : "",
      eligibleCodes.length ? `${eligibleCodes.length}টি উপযুক্ত কোর্স` : "",
    ].filter(Boolean)
    setImportReport(report.length ? report : ["কোনো পরিচিত তথ্য পাওয়া যায়নি—পুরো result page আবার copy করে চেষ্টা করুন।"])
  }

  function useDemo() {
    setDraft((current) => ({
      ...current,
      category: "improvement",
      semester: "1-2",
      submissionDate: "2026-08-28",
      selectedCodes: ["MAT1231", "CSE1235"],
      importedGrades: [
        { code: "MAT1231", grade: "C+" },
        { code: "CSE1235", grade: "B-" },
      ],
      courseFee: "774",
      deadline: "2026-08-20",
      finalLateDate: "2026-09-03",
      lateRateOne: "20",
      lateRateTwo: "30",
      applyLateFee: true,
      ...paymentDetails,
    }))
    setResultText("MAT1231  Linear Algebra and Differential Equations  C+\nCSE1235  Digital Logic Design  B-")
    setImportReport([])
  }

  function clearDraft() {
    setDraft({ ...initialDraft })
    setResultText("")
    setImportReport([])
    window.localStorage.removeItem("bou-cse-form-draft-v1")
  }

  return (
    <main className={`form-theme form-theme-${draft.category} min-h-screen text-[#17231f]`}>
      <header className="brand-header border-b bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <a href="#top" className="flex min-w-0 items-center gap-3">
            <Image src="/bou-cse-notes-logo.png" width={960} height={966} alt="BOU CSE Notes logo" className="brand-logo size-12 shrink-0 rounded-full object-contain" priority unoptimized />
            <span className="min-w-0">
              <span className="block truncate text-lg font-bold text-[#073b82]">BOU CSE Form Desk</span>
              <span className="block truncate text-sm font-medium text-[#d90b27]">ফর্ম ও যোগ্যতা সহায়িকা</span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden border-[#b9c9c2] text-[#40534c] md:inline-flex">খসড়া এই ডিভাইসে সংরক্ষিত থাকে</Badge>
            <Button type="button" variant="outline" size="sm" onClick={useDemo} className="brand-outline-button button-pop"><Sparkles /> নমুনা দেখুন</Button>
          </div>
        </div>
      </header>

      <div id="top" className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end print:hidden">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#0b7658]"><ShieldCheck className="size-4" /> শিক্ষার্থীদের জন্য অনানুষ্ঠানিক সহায়িকা</p>
            <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-[#102a22] sm:text-4xl lg:text-[2.65rem]">একটি ফর্ম—প্রয়োজন অনুযায়ী সঠিক ঘরগুলো দেখাবে</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#5b6e67]">রেজিস্ট্রেশন, ফেল/অনুপস্থিত পুনঃপরীক্ষা অথবা গ্রেড ইমপ্রুভমেন্ট ফর্ম প্রস্তুত করুন। সর্বশেষ নোটিশ থেকে ফি ও জরিমানার হার লিখলে মোট টাকা স্বয়ংক্রিয়ভাবে হিসাব হবে।</p>
          </div>
          <Button type="button" variant="outline" onClick={clearDraft} className="button-pop w-fit border-[#cbd6d1] bg-white"><RotateCcw /> সব তথ্য মুছুন</Button>
        </section>

        <Alert className="mb-6 border-[#e2c47f] bg-[#fffaf0] text-[#493811] print:hidden">
          <AlertCircle />
          <AlertTitle>টাকা জমা দেওয়ার আগে যাচাই করুন</AlertTitle>
          <AlertDescription className="text-[#6a5422]">এই সাইট শুধু ফর্ম প্রস্তুত করে; BOU-তে জমা দেয় না। সর্বশেষ অফিসিয়াল নোটিশের তারিখ, ফি ও নির্বাচিত কোর্স আপনার স্টাডি সেন্টারের সঙ্গে মিলিয়ে নিন।</AlertDescription>
        </Alert>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.75fr)]">
          <div className="space-y-6 print:hidden">
            <Panel step="ধাপ ১" title="আপনি কোন ধরনের আবেদন করছেন?" badge="একটি স্মার্ট ফর্ম">
              <div className="grid gap-3 md:grid-cols-3">
                {(Object.keys(categoryMeta) as FormCategory[]).map((category) => {
                  const item = categoryMeta[category]
                  const Icon = item.icon
                  const active = draft.category === category
                  return (
                    <button type="button" key={category} onClick={() => selectCategory(category)} className={`category-card ${active ? "category-card-active" : ""}`} aria-pressed={active}>
                      <span className={`category-icon ${active ? "category-icon-active" : ""}`}><Icon /></span>
                      <span className="min-w-0 text-left"><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block text-xs text-[#718079]">{item.bn}</span></span>
                      {active && <CheckCircle2 className="ml-auto size-5 shrink-0 text-[#0b7658]" />}
                    </button>
                  )
                })}
              </div>
              <p className="category-state mt-4 rounded-lg px-3 py-3 text-base leading-7 text-[#55665f]"><strong className="text-[#243a32]">{meta.bn}:</strong> {meta.description}</p>
            </Panel>

            <Panel step="ধাপ ২" title="শিক্ষার্থীর তথ্য" copy="সব ধরনের ফর্মে এই তথ্যগুলো একই থাকবে।">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Student ID / শিক্ষার্থী আইডি" required><Input value={draft.studentId} onChange={(event) => update("studentId", event.target.value)} placeholder="যেমন: 2023-1-60-000" /></Field>
                <Field label="Student Name / শিক্ষার্থীর নাম" required><Input value={draft.studentName} onChange={(event) => update("studentName", event.target.value)} placeholder="BOU রেকর্ড অনুযায়ী লিখুন" /></Field>
                <Field label="Session / শিক্ষাবর্ষ"><Input value={draft.session} onChange={(event) => update("session", event.target.value)} placeholder="যেমন: 2023–2024" /></Field>
                <Field label="Term / টার্ম" hint="BOU-এর তিন অঙ্কের টার্ম কোড"><Input value={draft.term} onChange={(event) => update("term", event.target.value)} placeholder="252" /></Field>
                <Field label="Study Centre / স্টাডি সেন্টার" info="CSE প্রোগ্রামের জন্য বর্তমানে DRC (801) এবং DUET (020)—এই দুইটি স্টাডি সেন্টার তালিকাভুক্ত আছে।">
                  <Select value={draft.studyCenter || undefined} onValueChange={(value) => update("studyCenter", value)}>
                    <SelectTrigger className="h-10 w-full bg-white text-base"><SelectValue placeholder="স্টাডি সেন্টার নির্বাচন করুন" /></SelectTrigger>
                    <SelectContent>{studyCenters.map((center) => <SelectItem key={center.code} value={center.code} className="text-base">{center.bn} — {center.code}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                {draft.category !== "registration" && <Field label="Form Submission Date / সম্ভাব্য জমার তারিখ" info="তারিখ নিজে নির্বাচন করুন অথবা ‘আজ’ চাপুন। তারিখ দিলে সাইট deadline-এর সঙ্গে মিলিয়ে জরিমানা লাগবে কি না দেখাবে।"><div className="flex gap-2"><Input type="date" value={draft.submissionDate} onChange={(event) => update("submissionDate", event.target.value)} /><Button type="button" variant="outline" className="button-pop shrink-0 border-[#b9cbc4]" onClick={() => update("submissionDate", localIsoDate())}>আজ</Button></div></Field>}
              </div>
              <div className="mt-5 rounded-xl border border-[#dce5e1] bg-[#f7faf8] p-4">
                <div className="mb-3 flex items-start gap-2">
                  <CircleHelp className="mt-0.5 size-4 shrink-0 text-[#0b7658]" />
                  <div><h3 className="text-base font-semibold text-[#29443a]">ব্যাংকে টাকা জমার স্থায়ী তথ্য</h3><p className="mt-1 text-sm leading-6 text-[#697a73]">এই তথ্যগুলো ফর্মে স্বয়ংক্রিয়ভাবে থাকবে। জমা স্লিপে অ্যাকাউন্ট নম্বরটি পরিষ্কারভাবে লিখুন।</p></div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <FixedDetail label="ব্যাংক" value={paymentDetails.bankName} />
                  <FixedDetail label="শাখা" value={paymentDetails.bankBranch} />
                  <FixedDetail label="অনলাইন হিসাব নম্বর" value={paymentDetails.accountNumber} />
                </div>
                <details className="receipt-example mt-4 border-t border-[#dce5e1] pt-4">
                  <summary>জমা স্লিপ পূরণের নমুনা দেখুন</summary>
                  <p className="mt-3 text-sm leading-6 text-[#697a73]">শাখা, হিসাব নম্বর, হিসাবের নাম, মোট টাকা ও টাকার পরিমাণ কথায় লিখুন। ব্যাংকের সিলসহ শিক্ষার্থী কপিটি ফর্মের সঙ্গে সংযুক্ত রাখুন।</p>
                  <div className="mt-3 overflow-hidden rounded-xl border border-[#cfdad5] bg-white p-2">
                    <Image src="/janata-bank-deposit-slip-sample.png" width={1580} height={655} alt="জনতা ব্যাংকের পূরণ করা জমা স্লিপের নমুনা" className="h-auto w-full" unoptimized />
                  </div>
                </details>
              </div>
            </Panel>

            <section className="rounded-2xl border border-[#cfe1d9] bg-[#f9fcfa] p-4 sm:p-6">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                  <div><p className="step-kicker">ঐচ্ছিক দ্রুত পূরণ</p><h2 className="section-title">Messy result paste করেও Auto-fill</h2><p className="section-copy">অফিসিয়াল result page-এর সব লেখা—heading, table, course rowসহ—একসাথে copy করে paste করুন। পরিষ্কার করার দরকার নেই।</p></div>
                  <Button asChild variant="outline" size="sm" className="border-[#a8c6ba] bg-white"><a href="https://result.bou.ac.bd/" target="_blank" rel="noreferrer">অফিসিয়াল ফলাফল <ExternalLink /></a></Button>
                </div>
                <Textarea value={resultText} onChange={(event) => { setResultText(event.target.value); setImportReport([]) }} placeholder={"পুরো result page paste করুন…\nStudent ID: 22052801003\nStudent Name: Rakibul Hasan\nMAT1231  Linear Algebra and Differential Equations  C+\nCSE1235  Digital Logic Design  B-"} className="min-h-36 border-[#bcd0c8] bg-white font-mono text-xs leading-6" />
                <div className="mt-3 flex flex-wrap items-center gap-3"><Button type="button" onClick={importResults} disabled={!resultText.trim()} className="brand-primary-button button-pop"><FileCheck2 /> তথ্য ও Result যাচাই করুন</Button><span className="text-sm text-[#60736c]">সব parsing আপনার browser-এই হয়; result কোথাও upload হয় না।</span></div>
                <p className="mt-3 text-sm leading-6 text-[#60736c]">{draft.category === "registration" ? "Registration form-এ শুধু পরিচয়সংক্রান্ত তথ্য পূরণ হবে।" : draft.category === "failed" ? "F grade-এর courseগুলো দেখাবে; আপনি checkbox দিলে তবেই fee-তে যোগ হবে।" : "B−, C+, C ও D grade-এর eligible courseগুলো দেখাবে; আপনি checkbox দিলে তবেই fee-তে যোগ হবে।"} নতুন result paste করলে আগের course selection reset হবে। বর্তমান application Term notice থেকে আসবে—result-এর পুরোনো exam term সেটি বদলাবে না।</p>
                {importReport.length > 0 && <div className="mt-4 rounded-xl border border-[#bdd8cd] bg-[#edf7f2] p-3"><p className="text-sm font-semibold text-[#245442]">যা পাওয়া গেছে</p><div className="mt-2 flex flex-wrap gap-2">{importReport.map((item) => <Badge key={item} variant="outline" className="border-[#a9cabc] bg-white text-[#315a4c]">{item}</Badge>)}</div></div>}
                {draft.category !== "registration" && draft.importedGrades.length > 0 && <div className="mt-5 grid gap-2">{draft.importedGrades.map((item) => {
                  const course = courses.find((candidate) => candidate.code === item.code)
                  const eligibility = eligibilityForGrade(item.grade)
                  const selectable = draft.category === "improvement" ? eligibility.kind === "improvement" : eligibility.kind === "failed"
                  const selected = draft.selectedCodes.includes(item.code)
                  return <div key={item.code} className={`grid gap-3 rounded-xl border bg-white p-3 sm:grid-cols-[1fr_auto] sm:items-center ${selected ? "border-[#78ad98] ring-1 ring-[#78ad98]" : "border-[#dce7e2]"}`}><div className="flex items-start gap-3">{selectable ? <Checkbox className="mt-0.5" checked={selected} onCheckedChange={() => toggleCourse(item.code)} aria-label={`${item.code} নির্বাচন করুন`} /> : <span className="mt-0.5 block size-4 shrink-0 rounded border border-[#d6dfdb] bg-[#f1f4f3]" aria-hidden="true" />}<div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{item.code}</strong><Badge variant="outline">{item.grade} · {gradePoints[item.grade]} GP</Badge>{course && <span className="text-xs text-[#718079]">{semesterNames[course.semester]}</span>}</div><p className="mt-1 text-xs text-[#677870]">{course?.title}</p>{selectable && <p className="mt-1 text-xs font-semibold text-[#3f6b5b]">{selected ? "Fee-তে যোগ হয়েছে—বাদ দিতে checkbox খুলুন" : "Fee-তে যোগ করতে checkbox দিন"}</p>}</div></div><EligibilityBadge kind={eligibility.kind} label={eligibility.label} /></div>
                })}</div>}
              </section>

            <Panel step="ধাপ ৩" title="সেমিস্টার ও কোর্স নির্বাচন করুন" copy={draft.category === "registration" ? "এই সেমিস্টারে যে সব কোর্স রেজিস্ট্রেশন করবেন, সবগুলো নির্বাচন করুন।" : draft.category === "failed" ? "শুধু ফেল বা অনুপস্থিত কোর্সগুলো নির্বাচন করুন।" : "শুধু যোগ্য পাস করা কোর্স নিন; F গ্রেড হলে ফেল/অনুপস্থিত বিভাগ ব্যবহার করুন।"}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Year & Semester / বর্ষ ও সেমিস্টার">
                  <Select value={draft.semester || undefined} onValueChange={selectSemester}>
                    <SelectTrigger className="h-10 w-full bg-white text-base"><SelectValue placeholder="বর্ষ ও সেমিস্টার নির্বাচন করুন" /></SelectTrigger>
                    <SelectContent>{Object.entries(semesterNames).map(([value, label]) => <SelectItem key={value} value={value} className="text-base">{label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="কোর্স খুঁজুন"><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-[#7a8b84]" /><Input className="pl-9" value={courseSearch} onChange={(event) => setCourseSearch(event.target.value)} placeholder="কোর্স কোড বা নাম" /></div></Field>
              </div>
              {draft.category === "registration" && registrationProfile && <div className="notice-profile mt-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-xs font-bold uppercase tracking-[0.12em]">বর্তমান অফিসিয়াল প্রিসেট · Term {registrationNotice.term}</p><p className="mt-1 text-sm">প্রকাশ: {registrationNotice.published} · Session: {registrationProfile.session}</p></div>
                  <Button asChild size="sm" className="brand-primary-button button-pop"><a href={registrationNotice.osapsUrl} target="_blank" rel="noreferrer">OSAPS-এ রেজিস্ট্রেশন <ExternalLink /></a></Button>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3"><FixedDetail label="রেজিস্ট্রেশনের সময়" value={`${registrationNotice.registrationFrom} – ${registrationNotice.registrationTo}`} /><FixedDetail label="ক্লাস শুরু" value={registrationProfile.classStart} /><FixedDetail label="Notice-এর মোট" value={`৳${money(registrationProfile.noticeTotal)}`} /></div>
              </div>}
              {draft.category === "registration" && <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={selectAllSemesterCourses}>সব কোর্স নির্বাচন করুন</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => update("selectedCodes", [])}>সব নির্বাচন বাতিল</Button>
              </div>}
              <div className="mt-4 overflow-hidden rounded-xl border border-[#dce3df]">
                {semesterCourses.map((course) => {
                  const grade = gradeMap.get(course.code)
                  const eligibility = grade ? eligibilityForGrade(grade) : null
                  const selected = draft.selectedCodes.includes(course.code)
                  const blocked = draft.category === "improvement" && eligibility?.kind === "failed"
                  return <label key={course.code} className={`course-row ${selected ? "course-row-selected" : ""} ${blocked ? "opacity-60" : ""}`}><Checkbox checked={selected} disabled={blocked} onCheckedChange={() => toggleCourse(course.code)} /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-sm text-[#17342a]">{course.code}</strong><span className="text-xs text-[#718079]">{course.credit} credit</span>{grade && <Badge variant="outline">Grade {grade}</Badge>}</span><span className="mt-0.5 block text-sm text-[#53665e]">{course.title}</span>{course.prerequisite && <span className="mt-1 block text-xs text-[#7b6a3a]">Prerequisite: {course.prerequisite}</span>}</span></label>
                })}
                {semesterCourses.length === 0 && <p className="p-6 text-center text-base text-[#718079]">মিলে যাওয়া কোনো কোর্স পাওয়া যায়নি।</p>}
              </div>
              <p className="mt-3 text-sm text-[#667971]">নির্বাচিত কোর্স: {courseCount}টি · মোট ক্রেডিট: {creditCount}</p>
              {draft.category === "registration" && registrationProfile && courseCount > 0 && (creditCount !== registrationProfile.billableCredits || courseCount !== registrationProfile.examCourses) && <Alert className="mt-4 border-[#e6c26e] bg-[#fffaf0]"><AlertCircle /><AlertTitle>Course list ও notice-এর fee count এক নয়</AlertTitle><AlertDescription>নির্বাচিত তালিকায় {courseCount}টি course ও {creditCount} credit আছে; notice-এর fee হিসাব {registrationProfile.examCourses}টি course ও {registrationProfile.billableCredits} credit ধরে। নিচের editable fee-count ঘরগুলো notice অনুযায়ী রাখা হয়েছে—course list অবশ্যই coordinator-এর সঙ্গে মিলিয়ে নিন।</AlertDescription></Alert>}
            </Panel>

            <Panel step="ধাপ ৪ · প্রযোজ্য ফি" title="সর্বশেষ নোটিশের ফি লিখুন" copy="সর্বশেষ অফিসিয়াল নোটিশ দেখে প্রযোজ্য ফি ও জরিমানার হার লিখুন। এখানে কোনো পুরোনো অঙ্ক আগে থেকে বসানো নেই।">
              {draft.category === "registration" ? (
                <div className="space-y-5">
                  <Alert className="border-[#cfe1d9] bg-[#f3f8f6]"><Calculator /><AlertTitle>রেজিস্ট্রেশন ফি পরিবর্তনযোগ্য</AlertTitle><AlertDescription>প্রোগ্রাম পেজের বর্তমান অঙ্কগুলো প্রাথমিকভাবে দেখানো হয়েছে। আপনার টার্মের নোটিশে ভিন্ন হলে সংশোধন করুন।</AlertDescription></Alert>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Fee হিসাবের মোট ক্রেডিট" info="Notice-এ যত credit-এর জন্য টাকা চাওয়া হয়েছে সেটি লিখুন; নির্বাচিত course list-এর credit ভিন্ন হলেও এই মান ধরে fee হবে।"><Input type="number" min="0" step="0.25" value={draft.regBillableCredits} onChange={(event) => update("regBillableCredits", event.target.value)} placeholder="যেমন: 18.5" /></Field>
                    <Field label="পরীক্ষার ফি প্রযোজ্য কোর্স" info="Notice-এর examination fee লাইনে যতটি course দিয়ে গুণ করা হয়েছে সেই সংখ্যা লিখুন।"><Input type="number" min="0" step="1" value={draft.regExamCourseCount} onChange={(event) => update("regExamCourseCount", event.target.value)} placeholder="যেমন: 9" /></Field>
                    <MoneyInput label="কোর্স ফি · প্রতি ক্রেডিট" info="এক credit-এর fee লিখুন; উপরের ‘Fee হিসাবের মোট ক্রেডিট’ দিয়ে এটি গুণ হবে।" value={draft.regPerCredit} onChange={(value) => update("regPerCredit", value)} />
                    <MoneyInput label="পরীক্ষার ফি · প্রতি কোর্স" info="সব কোর্সের মোট নয়—একটি কোর্সের পরীক্ষার ফি লিখুন।" value={draft.regExamPerCourse} onChange={(value) => update("regExamPerCourse", value)} />
                    <MoneyInput label="সেমিস্টার রেজিস্ট্রেশন" info="নোটিশে থাকলে একবারের সেমিস্টার রেজিস্ট্রেশন ফি লিখুন।" value={draft.regSemesterFee} onChange={(value) => update("regSemesterFee", value)} />
                    <MoneyInput label="সেমিস্টার মার্কশিট" info="নতুন registration notice-এ প্রতি semester-এর marksheet fee ৳100।" value={draft.regMarksheetFee} onChange={(value) => update("regMarksheetFee", value)} />
                    <MoneyInput label="একাডেমিক ক্যালেন্ডার" value={draft.regCalendarFee} onChange={(value) => update("regCalendarFee", value)} />
                    {draft.semester === "4-2" && <MoneyInput label="মূল সনদপত্র" value={draft.regCertificateFee} onChange={(value) => update("regCertificateFee", value)} />}
                    {draft.semester === "4-2" && <MoneyInput label="ট্রান্সক্রিপ্ট" value={draft.regTranscriptFee} onChange={(value) => update("regTranscriptFee", value)} />}
                  </div>
                  <div className="overflow-hidden rounded-xl border border-[#cfdad5] bg-white">
                    <div className="grid grid-cols-[1fr_auto] border-b border-[#cfdad5] bg-[#edf2f0] px-4 py-2.5 text-sm font-semibold"><span>Fee details for registration</span><span>Amount</span></div>
                    <FeePreviewLine label={`Course registration · ${billableCredits} credit × ৳${draft.regPerCredit}`} value={registrationBreakdown.course} />
                    <FeePreviewLine label={`Examination fee · ${examFeeCourseCount} course × ৳${draft.regExamPerCourse}`} value={registrationBreakdown.exam} />
                    <FeePreviewLine label="Semester registration" value={registrationBreakdown.semester} />
                    <FeePreviewLine label="Semester marksheet" value={registrationBreakdown.marksheet} />
                    {registrationBreakdown.calendar > 0 && <FeePreviewLine label="Academic calendar" value={registrationBreakdown.calendar} />}
                    {registrationBreakdown.certificate > 0 && <FeePreviewLine label="Original certificate" value={registrationBreakdown.certificate} />}
                    {registrationBreakdown.transcript > 0 && <FeePreviewLine label="Transcript" value={registrationBreakdown.transcript} />}
                    <div className="grid grid-cols-[1fr_auto] border-t-2 border-[#223b32] px-4 py-3 font-bold"><span>মোট</span><span>৳{money(registrationTotal)}</span></div>
                  </div>
                  <div className="rounded-xl border border-[#cfe1d9] bg-[#f7faf8] p-4"><h3 className="text-base font-semibold text-[#29443a]">জমা দেওয়ার আগে checklist</h3><div className="mt-3 grid gap-2 text-sm text-[#52665d] sm:grid-cols-2"><CheckItem text="পূরণকৃত course registration form" /><CheckItem text="Student ID card-এর copy" /><CheckItem text="ব্যাংক receipt-এর hard copy" /><CheckItem text="নির্ধারিত সময়ের মধ্যে Dhaka Regional Centre-এ জমা" /></div><p className="mt-3 text-sm leading-6 text-[#697a73]">প্রথমে OSAPS-এ online registration সম্পন্ন করুন, তারপর notice অনুযায়ী form ও কাগজপত্রের hard copy জমা দিন।</p></div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <MoneyInput label={`${draft.category === "improvement" ? "ইমপ্রুভমেন্ট" : "পুনঃপরীক্ষা"} ফি · প্রতি কোর্স`} info="সব কোর্সের মোট নয়—একটি কোর্সের মূল ফি লিখুন।" value={draft.courseFee} onChange={(value) => update("courseFee", value)} />
                    <FixedDetail label="যে তারিখ ধরে হিসাব হচ্ছে" value={effectiveSubmissionDate ? `${effectiveSubmissionDate}${effectiveSubmissionDate === localIsoDate() ? " · আজ" : ""}` : "তারিখ নির্বাচন করুন"} />
                  </div>
                  {(isBeforeDeadline || isDeadlineDay) && <div className="rounded-xl border border-[#bcd9cc] bg-[#edf7f2] p-4"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#0b7658]" /><div><h3 className="text-base font-semibold text-[#245442]">জরিমানা লাগছে না</h3><p className="mt-1 text-sm leading-6 text-[#4f6e62]">{isDeadlineDay ? "নির্বাচিত তারিখটি জরিমানা ছাড়া শেষ দিন।" : `নির্বাচিত জমার তারিখ deadline-এর ${daysBetween(effectiveSubmissionDate, draft.deadline)} দিন আগে।`} তাই PDF ও মোট টাকায় late fee যোগ হবে না।</p></div></div></div>}
                  {lateDays > 0 && lateTotal > 0 && <div className="rounded-xl border border-[#ecd79f] bg-[#fffaf0] p-4"><div className="flex gap-3"><Calculator className="mt-0.5 size-5 shrink-0 text-[#8a6714]" /><div><h3 className="text-base font-semibold text-[#5c4512]">জরিমানা স্বয়ংক্রিয়ভাবে যোগ হয়েছে</h3><p className="mt-1 text-sm leading-6 text-[#745c26]">নির্বাচিত জমার তারিখ deadline-এর <strong>{lateDays} দিন পরে</strong>। বর্তমান notice rate-এ জরিমানা <strong>প্রতি কোর্সে ৳{money(latePerCourse)}</strong>; {courseCount}টি কোর্সে মোট <strong>৳{money(lateTotal)}</strong>।</p></div></div></div>}
                  {lateDays > 0 && lateTotal === 0 && <div className="rounded-xl border border-[#cbd8d3] bg-[#f5f8f7] p-4 text-sm leading-6 text-[#53675f]"><strong>Deadline পার হলেও জরিমানা যোগ হয়নি:</strong> late fee বন্ধ আছে অথবা rate শূন্য। Notice-এ জরিমানা থাকলে নিচের settings খুলে চালু করুন।</div>}
                  {isOutsideNotice && <Alert variant="destructive"><XCircle /><AlertTitle>আপনার দেওয়া চূড়ান্ত তারিখ পার হয়েছে</AlertTitle><AlertDescription>জমার তারিখটি বিলম্বসহ শেষ তারিখের পর। টাকা দেওয়ার আগে সময় বৃদ্ধির অফিসিয়াল অনুমতি নিশ্চিত করুন।</AlertDescription></Alert>}
                  <details className="late-settings rounded-xl border border-[#d8e1dd] bg-[#f8faf9] p-4">
                    <summary>Notice-এর deadline ও জরিমানার rate দেখুন/পরিবর্তন করুন</summary>
                    <p className="mt-2 text-sm leading-6 text-[#687a73]">সাধারণত এগুলো বদলাতে হবে না। নতুন notice-এ তারিখ বা rate আলাদা হলে শুধু তখন edit করুন। জরিমানা না থাকলে দুইটি rate-ই 0 দিন।</p>
                    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-[#d5dfdb] bg-white p-3"><Checkbox checked={draft.applyLateFee} onCheckedChange={(checked) => update("applyLateFee", checked === true)} /><span><strong className="block text-sm text-[#2c463c]">Deadline পার হলে late fee প্রযোজ্য</strong><small className="mt-1 block text-xs leading-5 text-[#6b7b75]">Notice-এ জরিমানা না থাকলে এটি বন্ধ করুন—তখন PDF-তেও late fee row থাকবে না।</small></span></label>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <Field label="জরিমানা ছাড়া শেষ তারিখ" info="নোটিশে দেওয়া জরিমানা ছাড়া আবেদনের শেষ তারিখ।"><Input type="date" value={draft.deadline} onChange={(event) => update("deadline", event.target.value)} /></Field>
                      <Field label="বিলম্বসহ চূড়ান্ত তারিখ" info="বিলম্ব ফিসহ আবেদন গ্রহণের সর্বশেষ তারিখ।"><Input type="date" value={draft.finalLateDate} onChange={(event) => update("finalLateDate", event.target.value)} /></Field>
                      {draft.applyLateFee && <MoneyInput label="১–৭ দিন · প্রতি কোর্স/দিন" info="প্রথম সপ্তাহে প্রতিটি নির্বাচিত কোর্সের জন্য প্রতিদিনের জরিমানা।" value={draft.lateRateOne} onChange={(value) => update("lateRateOne", value)} />}
                      {draft.applyLateFee && <MoneyInput label="৮–১৪ দিন · প্রতি কোর্স/দিন" info="দ্বিতীয় সপ্তাহে প্রতিটি নির্বাচিত কোর্সের জন্য প্রতিদিনের জরিমানা।" value={draft.lateRateTwo} onChange={(value) => update("lateRateTwo", value)} />}
                    </div>
                  </details>
                  {draft.category === "improvement" && <p className="text-sm leading-6 text-[#687a73]">Handbook-এর ৩৫ পৃষ্ঠা অনুযায়ী ইমপ্রুভমেন্ট ফি সাধারণ পুনঃপরীক্ষার ফির দ্বিগুণ। প্রাথমিক ৳৭৭৪ এসেছে ৳৩৮৭ × ২ থেকে; তবে আপনার দেওয়া সর্বশেষ নোটিশের অঙ্কই চূড়ান্ত হিসাব নিয়ন্ত্রণ করবে।</p>}
                </div>
              )}
            </Panel>

            <section className="rounded-2xl border border-[#d8e1dd] bg-white p-4 sm:p-6">
              <div className="mb-4 flex items-center gap-3"><BookOpen className="size-5 text-[#0b7658]" /><div><p className="step-kicker">যোগ্যতার নিয়ম</p><h2 className="section-title">CSE Handbook কী বলে</h2></div></div>
              <div className="grid gap-3 sm:grid-cols-2"><Rule title="F গ্রেড" text="পরবর্তী কোনো সেমিস্টারে কোর্সটি চালু হলে পুনরায় পরীক্ষা দেওয়া বাধ্যতামূলক।" /><Rule title="B− বা তার নিচে" text="B−, C+, C অথবা D পাস গ্রেড একবার উন্নয়ন করা যায়।" /><Rule title="আগের গ্রেড সুরক্ষিত" text="ফল উন্নত না হলে আগের বৈধ গ্রেডটি বহাল থাকবে।" /><Rule title="সীমাবদ্ধতা" text="প্রতি কোর্সে একবার ইমপ্রুভমেন্ট দেওয়া যায়; গ্র্যাজুয়েশনের পরে সুযোগ নেই।" /></div>
              <p className="mt-4 text-sm leading-6 text-[#687a73]">সূত্র: B.Sc in CSE Program Handbook, পৃষ্ঠা ৩৪–৩৫। সংশ্লিষ্ট পরবর্তী সেমিস্টারে কোর্সটি অফার থাকতে হবে।</p>
            </section>

            <section className="rounded-2xl border border-[#d8e1dd] bg-white p-4 sm:p-6">
              <div className="mb-4 flex items-center gap-3"><Link2 className="size-5 text-[#0b7658]" /><div><p className="step-kicker">অফিসিয়াল উৎস</p><h2 className="section-title">জমা দেওয়ার আগে যাচাই করুন</h2></div></div>
              <div className="grid gap-2 sm:grid-cols-2">{officialLinks.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="official-link"><span><strong>{link.label}</strong><small>{link.note}</small></span><ExternalLink /></a>)}</div>
            </section>
          </div>

          <aside className="xl:sticky xl:top-5 xl:self-start print:hidden">
            <div className="rounded-2xl border border-[#cfdad5] bg-white p-5 shadow-[0_18px_55px_rgba(19,49,39,0.09)]">
              <div className="mb-5 flex items-start justify-between gap-3"><div><p className="step-kicker">তাৎক্ষণিক সারসংক্ষেপ</p><h2 className="text-xl font-bold text-[#16372c]">ফর্ম প্রিভিউ</h2></div><span className="grid size-10 place-items-center rounded-xl bg-[#e7f2ed] text-[#075e45]"><CategoryIcon /></span></div>
              <div className="space-y-3 text-base"><SummaryLine label="ফর্মের ধরন" value={meta.bn} /><SummaryLine label="শিক্ষার্থী" value={draft.studentName || "লেখা হয়নি"} muted={!draft.studentName} /><SummaryLine label="টার্ম" value={draft.term || "—"} /><SummaryLine label="কোর্স" value={String(courseCount)} />{draft.category === "registration" && <SummaryLine label="নির্বাচিত ক্রেডিট" value={String(creditCount)} />}{draft.category === "registration" && <SummaryLine label="Fee হিসাবের ক্রেডিট" value={String(billableCredits)} />}</div>
              {courseCount > 0 && <div className="mt-4 border-y border-[#e2e8e5] py-3">{selectedCourses.map((course) => <p key={course.code} className="py-1 text-xs text-[#52645d]"><strong className="text-[#213c32]">{course.code}</strong> · {course.title}</p>)}</div>}
              <div className="mt-5 space-y-2">
                {draft.category === "registration" ? <><MoneyLine label="কোর্স রেজিস্ট্রেশন" value={registrationBreakdown.course} /><MoneyLine label="পরীক্ষার ফি" value={registrationBreakdown.exam} /><MoneyLine label="সেমিস্টার রেজিস্ট্রেশন" value={registrationBreakdown.semester} /><MoneyLine label="সেমিস্টার মার্কশিট" value={registrationBreakdown.marksheet} />{registrationBreakdown.calendar > 0 && <MoneyLine label="একাডেমিক ক্যালেন্ডার" value={registrationBreakdown.calendar} />}{registrationBreakdown.certificate > 0 && <MoneyLine label="মূল সনদপত্র" value={registrationBreakdown.certificate} />}{registrationBreakdown.transcript > 0 && <MoneyLine label="ট্রান্সক্রিপ্ট" value={registrationBreakdown.transcript} />}</> : <><MoneyLine label={`${draft.category === "improvement" ? "ইমপ্রুভমেন্ট" : "পুনঃপরীক্ষা"} ফি`} value={examBaseTotal} />{lateTotal > 0 && <MoneyLine label={`বিলম্ব জরিমানা · ${lateDays} দিন`} value={lateTotal} />}</>}
                <div className="mt-3 flex items-end justify-between border-t-2 border-[#193b30] pt-3"><span className="font-semibold">আনুমানিক মোট</span><span className="text-2xl font-bold text-[#075e45]">৳{money(total)}</span></div>
              </div>
              <Button type="button" className="brand-accent-button button-pop mt-5 w-full" onClick={handleDownloadPdf} disabled={!courseCount || pdfDownloading}><Download /> {pdfDownloading ? "PDF তৈরি হচ্ছে…" : "PDF ডাউনলোড করুন"}</Button>
              {pdfReady && <a href={pdfReady.url} download={pdfReady.fileName} className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-[#8eb9a9] bg-[#edf7f3] px-4 py-2.5 text-sm font-semibold text-[#075e45] hover:bg-[#e3f2ec]"><Download className="size-4" />PDF প্রস্তুত—এখানে চাপুন</a>}
              <Button type="button" variant="outline" className="mt-2 w-full border-[#b9cbc4]" onClick={() => window.print()} disabled={!courseCount}><Printer /> Print / Save as PDF</Button>
              {pdfError && <p className="mt-3 rounded-lg bg-[#fff2f2] px-3 py-2 text-center text-sm leading-6 text-[#9c2f35]">{pdfError}</p>}
              <p className="mt-3 text-center text-sm leading-6 text-[#718079]">প্রথম বোতাম PDF তৈরি করে download শুরু করবে। Browser automatic download আটকালে “PDF প্রস্তুত” link-এ চাপুন।</p>
            </div>
            <div className="mt-4 rounded-xl border border-[#d8e1dd] bg-[#edf4f1] p-4 text-sm leading-6 text-[#52665d]"><strong className="text-[#274338]">ফলাফলের গোপনীয়তা:</strong> ফলাফল কপি-পেস্ট করলে কোনো লগইন তথ্য শেয়ার করতে হয় না এবং তথ্য আপনার ডিভাইসের বাইরে যায় না।</div>
          </aside>
        </div>

        <PrintableForm draft={draft} selectedCourses={selectedCourses} gradeMap={gradeMap} lateDays={lateDays} latePerCourse={latePerCourse} total={total} registrationBreakdown={registrationBreakdown} />
      </div>

      <footer className="border-t border-[#dce3df] bg-white print:hidden"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-sm text-[#6a7b74] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><p>স্বতন্ত্র শিক্ষার্থী সহায়িকা · বাংলাদেশ উন্মুক্ত বিশ্ববিদ্যালয়ের অফিসিয়াল সেবা নয়।</p><p>নিয়ম: CSE Handbook পৃষ্ঠা ১৯–২১ ও ৩৪–৩৫।</p></div></footer>
    </main>
  )
}

function Panel({ step, title, copy, badge, children }: { step: string; title: string; copy?: string; badge?: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-[#d8e1dd] bg-white p-4 shadow-[0_12px_40px_rgba(20,50,40,0.05)] sm:p-6"><div className="mb-5 flex items-start justify-between gap-3"><div><p className="step-kicker">{step}</p><h2 className="section-title">{title}</h2>{copy && <p className="section-copy">{copy}</p>}</div>{badge && <Badge className="bg-[#e6f3ee] text-[#075e45] hover:bg-[#e6f3ee]">{badge}</Badge>}</div>{children}</section>
}

function Field({ label, hint, info, required, children }: { label: string; hint?: string; info?: string; required?: boolean; children: ReactNode }) {
  return <div className="space-y-1.5"><Label className="flex items-center gap-1.5 text-xs font-semibold text-[#334b42]">{label}{required && <span className="text-[#b12d31]">*</span>}{info && <InfoTip text={info} />}</Label>{children}{hint && <p className="text-[11px] text-[#7a8983]">{hint}</p>}</div>
}

function InfoTip({ text }: { text: string }) {
  return <TooltipProvider delayDuration={150}><Tooltip><TooltipTrigger asChild><button type="button" className="rounded-full text-[#789088] outline-none hover:text-[#315c4d] focus-visible:ring-2 focus-visible:ring-[#2b8368]" aria-label={text}><CircleHelp className="size-3.5 cursor-help" /></button></TooltipTrigger><TooltipContent side="top" sideOffset={6} className="max-w-64 bg-[#18382e] text-white">{text}</TooltipContent></Tooltip></TooltipProvider>
}

function MoneyInput({ label, info, value, onChange }: { label: string; info?: string; value: string; onChange: (value: string) => void }) {
  return <Field label={label} info={info}><div className="relative"><span className="absolute left-3 top-2 text-sm text-[#667971]">৳</span><Input type="number" min="0" step="1" className="pl-7" value={value} onChange={(event) => onChange(event.target.value)} placeholder="ফি লিখুন" /></div></Field>
}

function FixedDetail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-[#d9e3df] bg-white px-3 py-3"><p className="text-xs font-semibold text-[#718079]">{label}</p><p className="mt-1 break-words text-sm font-semibold text-[#243a32]">{value}</p></div>
}

function FeePreviewLine({ label, value }: { label: string; value: number }) {
  return <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#e2e8e5] px-4 py-2.5 text-sm"><span className="text-[#52665d]">{label}</span><strong className="font-semibold text-[#263e35]">৳{money(value)}</strong></div>
}

function CheckItem({ text }: { text: string }) {
  return <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#0b7658]" /><span>{text}</span></p>
}

function Rule({ title, text }: { title: string; text: string }) {
  return <div className="rounded-xl border border-[#dfe7e3] bg-[#f8faf9] p-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-[#29453b]"><CheckCircle2 className="size-4 text-[#0b7658]" />{title}</h3><p className="mt-1.5 text-xs leading-5 text-[#61736c]">{text}</p></div>
}

function EligibilityBadge({ kind, label }: { kind: ReturnType<typeof eligibilityForGrade>["kind"]; label: string }) {
  const classes = kind === "improvement" ? "bg-[#e6f4ed] text-[#086044]" : kind === "failed" ? "bg-[#fff0e8] text-[#9a3f16]" : kind === "not-eligible" ? "bg-[#f3f3f3] text-[#5f6662]" : "bg-[#fff6dd] text-[#7c5d0b]"
  return <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{kind === "improvement" ? <CheckCircle2 /> : kind === "not-eligible" ? <XCircle /> : <AlertCircle />} {label}</span>
}

function SummaryLine({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return <div className="flex items-start justify-between gap-4"><span className="text-[#6a7a74]">{label}</span><strong className={`text-right ${muted ? "font-normal text-[#9aa6a1]" : "text-[#263e35]"}`}>{value}</strong></div>
}

function MoneyLine({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-[#667870]">{label}</span><span className="font-medium text-[#263e35]">৳{money(value)}</span></div>
}

function PrintableForm({ draft, selectedCourses, gradeMap, lateDays, latePerCourse, total, registrationBreakdown }: { draft: Draft; selectedCourses: typeof courses; gradeMap: Map<string, string>; lateDays: number; latePerCourse: number; total: number; registrationBreakdown: Record<string, number> }) {
  const formTitle = draft.category === "registration" ? "SEMESTER REGISTRATION FORM" : draft.category === "improvement" ? "IMPROVE REGISTRATION FORM" : "RE-EXAM REGISTRATION FORM"
  const courseSectionLabel = draft.category === "registration" ? "Registration" : draft.category === "improvement" ? "Improve" : "Re-Exam"
  const perCourseFeeLabel = draft.category === "improvement" ? "Improve Fee per Course" : "Re-Exam Fee per Course"
  const semesterLabel = semesterNames[draft.semester] || ""
  const selectedStudyCenter = studyCenters.find((center) => center.code === draft.studyCenter)
  const selectedCreditCount = selectedCourses.reduce((sum, course) => sum + course.credit, 0)
  const printBillableCredits = draft.regBillableCredits === "" ? selectedCreditCount : Math.max(0, Number(draft.regBillableCredits) || 0)
  const printExamCourseCount = draft.regExamCourseCount === "" ? selectedCourses.length : Math.max(0, Number(draft.regExamCourseCount) || 0)

  return <section className="print-sheet hidden print:block">
    <div className="print-header">
      <Image className="print-logo" src="/bou-logo.png" width={250} height={224} alt="Bangladesh Open University logo" priority unoptimized />
      <div className="print-brand"><h1>Bangladesh Open University</h1><p className="print-school">School of Science and Technology</p><p>Board Bazar, Gazipur-1705, Bangladesh</p></div>
    </div>
    <div className="print-form-heading">
      <h2>{formTitle}</h2>
      <p>(Bank receipt must be enclosed with the Form)</p>
      <div className="print-bank"><span>{paymentDetails.bankName}, {paymentDetails.bankBranch}</span><span>Online A/C: {paymentDetails.accountNumber}</span></div>
    </div>

    <div className="print-lines">
      <PrintField label="Student ID" value={draft.studentId} />
      <PrintField label="Student Name" value={draft.studentName} />
      <PrintField label="Year & Semester" value={semesterLabel} />
      <PrintField label="Study Centre" value={selectedStudyCenter ? `${selectedStudyCenter.name} — ${selectedStudyCenter.code}` : ""} />
      <div className="print-line-split"><PrintField label="Session" value={draft.session} /><PrintField label="Term" value={draft.term} /></div>
    </div>

    <h3 className="print-course-label">{courseSectionLabel}</h3>
    <table className="print-table"><thead><tr><th>SL. N</th><th>Code</th><th>Title</th><th>Credit</th>{draft.category === "improvement" && <th>Grade</th>}</tr></thead><tbody>{selectedCourses.map((course, index) => <tr key={course.code}><td>{String(index + 1).padStart(2, "0")}</td><td><strong>{course.code}</strong></td><td>{course.title}</td><td>{course.credit}</td>{draft.category === "improvement" && <td>{gradeMap.get(course.code) || "—"}</td>}</tr>)}{!selectedCourses.length && <tr><td colSpan={5} className="py-8 text-center">No course selected</td></tr>}</tbody></table>

    <div className="print-course-summary"><p><span>Total Number of Course</span><b>:</b><strong>{selectedCourses.length}</strong></p><p><span>Total Credit</span><b>:</b><strong>{selectedCreditCount}</strong></p></div>

    <table className="print-fee-table">
      <thead><tr><th>{draft.category === "registration" ? "Fee Details for Registration" : `Fee Details for ${draft.category === "improvement" ? "Improvement" : "Re-Examination"}`}</th><th>Amount</th></tr></thead>
      <tbody>{draft.category === "registration" ? <>
        <PrintFeeRow label={`a) Course Registration Fee (Per credit ৳${draft.regPerCredit}/-): (৳${draft.regPerCredit} × ${printBillableCredits})`} value={registrationBreakdown.course} />
        <PrintFeeRow label={`b) Examination Fee (Per course ৳${draft.regExamPerCourse}/-): (৳${draft.regExamPerCourse} × ${printExamCourseCount})`} value={registrationBreakdown.exam} />
        <PrintFeeRow label={`c) Semester Registration Fee (Per semester ৳${draft.regSemesterFee}/-)`} value={registrationBreakdown.semester} />
        <PrintFeeRow label={`d) Semester Marks Sheet (৳${draft.regMarksheetFee}/-)`} value={registrationBreakdown.marksheet} />
        {registrationBreakdown.calendar > 0 && <PrintFeeRow label={`e) Academic Calendar Fee (Per semester ৳${draft.regCalendarFee}/-)`} value={registrationBreakdown.calendar} />}
        {registrationBreakdown.certificate > 0 && <PrintFeeRow label={`f) Original Certificate Fee (৳${draft.regCertificateFee}/-)`} value={registrationBreakdown.certificate} />}
        {registrationBreakdown.transcript > 0 && <PrintFeeRow label={`g) Transcript Fee (৳${draft.regTranscriptFee}/-)`} value={registrationBreakdown.transcript} />}
      </> : <>
        <PrintFeeRow label={`a) ${perCourseFeeLabel} (৳${draft.courseFee} × ${selectedCourses.length} course${selectedCourses.length === 1 ? "" : "s"})`} value={selectedCourses.length * amount(draft.courseFee)} />
        {latePerCourse * selectedCourses.length > 0 && <PrintFeeRow label={`b) Late Fine (${lateDays} day${lateDays === 1 ? "" : "s"}, ৳${money(latePerCourse)} per course)`} value={latePerCourse * selectedCourses.length} />}
      </>}</tbody>
      <tfoot><tr><td>Total</td><td>৳{money(total)}/-</td></tr></tfoot>
    </table>

    <div className="print-signatures"><span>Signature of the Program Officer</span><span>Signature of the Program Coordinator</span></div>
  </section>
}

function PrintField({ label, value }: { label: string; value: string }) {
  return <div className="print-line"><span>{label}</span><b>:</b><strong>{value || " "}</strong></div>
}

function PrintFeeRow({ label, value }: { label: string; value: number }) {
  return <tr><td>{label}</td><td>৳{money(value)}/-</td></tr>
}
