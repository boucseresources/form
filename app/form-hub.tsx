"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Image from "next/image"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  CircleHelp,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Link2,
  Languages,
  MessageCircleQuestion,
  PlayCircle,
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
import siteConfig from "@/data/site-config.json"

type ImportedGrade = { code: string; grade: string }
type Language = "bn" | "en"
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

type RegistrationProfile = {
  session: string
  billableCredits: number
  examCourses: number
  classStart: string
  noticeTotal: number
  certificate: number
  transcript: number
  courseCodes: string[]
}

const paymentDetails = siteConfig.payment
const studyCenters = siteConfig.studyCenters
const registrationNotice = siteConfig.registrationNotice as typeof siteConfig.registrationNotice & { profiles: Record<string, RegistrationProfile> }
const examNotice = siteConfig.examNotice
const demoVideoUrl = siteConfig.demoVideoUrl.trim()
const quickHelpUrl = siteConfig.quickHelpUrl

function videoEmbedUrl(url: string) {
  if (!url) return ""
  const shortId = url.match(/youtu\.be\/([^?&/]+)/)?.[1]
  const watchId = url.match(/[?&]v=([^?&/]+)/)?.[1]
  const embedId = url.match(/youtube\.com\/embed\/([^?&/]+)/)?.[1]
  const youtubeId = shortId || watchId || embedId
  if (youtubeId) return "https://www.youtube.com/embed/" + youtubeId
  if (/facebook\.com/i.test(url)) return "https://www.facebook.com/plugins/video.php?href=" + encodeURIComponent(url) + "&show_text=false"
  return url
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

const categoryMeta: Record<FormCategory, { label: string; bn: string; description: string; descriptionEn: string; icon: typeof FileText }> = {
  registration: {
    label: "Course Registration",
    bn: "কোর্স রেজিস্ট্রেশন",
    description: "নিয়মিত সেমিস্টারের কোর্স, ক্রেডিট ও পরীক্ষার ফি হিসাবের জন্য।",
    descriptionEn: "For regular-semester course, credit, and examination-fee calculations.",
    icon: FileText,
  },
  failed: {
    label: "Failed / Absent",
    bn: "ফেল / অনুপস্থিত",
    description: "F গ্রেড পাওয়া বা পরীক্ষায় অনুপস্থিত থাকা কোর্সের পুনঃপরীক্ষার জন্য।",
    descriptionEn: "For re-examination in a course with an F grade or an absence.",
    icon: RotateCcw,
  },
  improvement: {
    label: "Grade Improvement",
    bn: "গ্রেড ইমপ্রুভমেন্ট",
    description: "B− বা তার নিচের পাস করা গ্রেড একবার উন্নয়নের জন্য।",
    descriptionEn: "For a one-time improvement of a passed grade of B− or below.",
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
  const [language, setLanguage] = useState<Language>("bn")
  const [currentStep, setCurrentStep] = useState(1)
  const [courseSearch, setCourseSearch] = useState("")
  const [resultText, setResultText] = useState("")
  const [importReport, setImportReport] = useState<string[]>([])
  const [pdfDownloading, setPdfDownloading] = useState(false)
  const [pdfError, setPdfError] = useState("")
  const [pdfReady, setPdfReady] = useState<{ url: string; fileName: string } | null>(null)
  const hydrated = useRef(false)
  const preferencesHydrated = useRef(false)
  const isBn = language === "bn"
  const tr = (bn: string, en: string) => isBn ? bn : en

  const wizardSteps = [
    tr("ফর্মের ধরন", "Form type"),
    tr("শিক্ষার্থীর তথ্য", "Student details"),
    tr("কোর্স নির্বাচন", "Course selection"),
    tr("ফি ও তারিখ", "Fees & dates"),
    tr("পূর্ণ প্রিভিউ", "Full preview"),
  ]

  useEffect(() => {
    preloadPdfAssets().catch(() => undefined)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedLanguage = window.localStorage.getItem("bou-cse-language-v1")
      if (savedLanguage === "bn" || savedLanguage === "en") setLanguage(savedLanguage)
      const savedStep = Number(window.localStorage.getItem("bou-cse-current-step-v1"))
      if (savedStep >= 1 && savedStep <= 5) setCurrentStep(savedStep)
      preferencesHydrated.current = true
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!preferencesHydrated.current) return
    document.documentElement.lang = language
    window.localStorage.setItem("bou-cse-language-v1", language)
  }, [language])

  useEffect(() => {
    if (!preferencesHydrated.current) return
    window.localStorage.setItem("bou-cse-current-step-v1", String(currentStep))
  }, [currentStep])

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
      setPdfError(tr("PDF তৈরি করা যায়নি। নিচের Print / Save as PDF অপশনটি ব্যবহার করুন।", "The PDF could not be generated. Use the Print / Save as PDF option below."))
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

  function applyRegistrationNotice() {
    if (!registrationNotice.enabled || !registrationProfile) return
    const offeredCodes = registrationProfile.courseCodes.filter((code) =>
      courses.some((course) => course.code === code && course.semester === draft.semester),
    )
    setDraft((current) => ({
      ...current,
      term: registrationNotice.term,
      session: registrationProfile.session,
      selectedCodes: offeredCodes,
      regBillableCredits: String(registrationProfile.billableCredits),
      regExamCourseCount: String(registrationProfile.examCourses),
      regPerCredit: String(registrationNotice.fees.perCredit),
      regExamPerCourse: String(registrationNotice.fees.examPerCourse),
      regSemesterFee: String(registrationNotice.fees.semesterRegistration),
      regMarksheetFee: String(registrationNotice.fees.semesterMarksheet),
      regDigitalIdFee: String(registrationNotice.fees.digitalId),
      regCalendarFee: String(registrationNotice.fees.academicCalendar),
      regCertificateFee: String(registrationProfile.certificate),
      regTranscriptFee: String(registrationProfile.transcript),
      includeCalendar: registrationNotice.fees.academicCalendar > 0,
    }))
  }

  function applyExamNotice() {
    if (!examNotice.enabled) return
    setDraft((current) => ({
      ...current,
      term: examNotice.term,
      courseFee: String(current.category === "improvement" ? examNotice.improvementFeePerCourse : examNotice.reExamFeePerCourse),
      deadline: examNotice.deadline,
      finalLateDate: examNotice.finalLateDate,
      lateRateOne: String(examNotice.lateWeekOnePerCoursePerDay),
      lateRateTwo: String(examNotice.lateWeekTwoPerCoursePerDay),
      applyLateFee: Boolean(examNotice.deadline && examNotice.finalLateDate),
    }))
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
      parsed.studentName ? tr("নাম", "Name") : "",
      parsed.session ? "Session" : "",
      parsed.studyCenter ? "Study Centre" : "",
      parsed.grades.length ? tr(`${parsed.grades.length}টি result`, `${parsed.grades.length} results`) : "",
      eligibleCodes.length ? tr(`${eligibleCodes.length}টি উপযুক্ত কোর্স`, `${eligibleCodes.length} eligible courses`) : "",
    ].filter(Boolean)
    setImportReport(report.length ? report : [tr("কোনো পরিচিত তথ্য পাওয়া যায়নি—পুরো result page আবার copy করে চেষ্টা করুন।", "No recognised information was found. Copy the complete result page and try again.")])
  }

  function useDemo() {
    setCurrentStep(5)
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
    setCurrentStep(1)
    setResultText("")
    setImportReport([])
    window.localStorage.removeItem("bou-cse-form-draft-v1")
  }

  function goToStep(step: number) {
    setCurrentStep(Math.min(5, Math.max(1, step)))
    window.requestAnimationFrame(() => document.getElementById("wizard-progress")?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }

  return (
    <main className={`form-theme form-theme-${draft.category} min-h-screen text-[#17231f]`}>
      <header className="brand-header border-b bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:flex-nowrap sm:px-6 lg:px-8">
          <a href="#top" className="flex min-w-0 items-center gap-3">
            <Image src="/bou-cse-notes-logo.png" width={960} height={966} alt="BOU CSE Notes logo" className="brand-logo size-12 shrink-0 rounded-full object-contain" priority unoptimized />
            <span className="min-w-0">
              <span className="block truncate text-lg font-bold text-[#073b82]">BOU CSE Form Desk</span>
              <span className="block truncate text-sm font-medium text-[#d90b27]">{tr("ফর্ম ও যোগ্যতা সহায়িকা", "Forms & eligibility guide")}</span>
            </span>
          </a>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <div className="language-switch" role="group" aria-label="Language">
              <Languages className="size-4" />
              <button type="button" className={isBn ? "active" : ""} onClick={() => setLanguage("bn")} aria-pressed={isBn}>বাংলা</button>
              <button type="button" className={!isBn ? "active" : ""} onClick={() => setLanguage("en")} aria-pressed={!isBn}>EN</button>
            </div>
            <Badge variant="outline" className="hidden border-[#b9c9c2] text-[#40534c] md:inline-flex">{tr("খসড়া এই ডিভাইসে সংরক্ষিত থাকে", "Draft saved on this device")}</Badge>
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" size="sm" className="video-demo-button button-pop"><PlayCircle /><span className="hidden sm:inline">{tr("ভিডিও ডেমো", "Video demo")}</span><span className="sm:hidden">{tr("ডেমো", "Demo")}</span></Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl overflow-hidden border-[#b9cde8] bg-white p-0">
                <DialogHeader className="border-b border-[#dfe8f4] bg-[#f5f9ff] px-5 py-4 text-left">
                  <DialogTitle className="flex items-center gap-2 text-[#073b82]"><PlayCircle className="size-5 text-[#dc0a28]" /> {tr("কীভাবে form তৈরি করবেন", "How to create your form")}</DialogTitle>
                  <DialogDescription>{tr("ভিডিও দেখে অথবা নিচের পাঁচটি ধাপ অনুসরণ করে সহজে PDF form বানান।", "Watch the video or follow the five steps to create your PDF form.")}</DialogDescription>
                </DialogHeader>
                <div className="p-5">
                  {demoVideoUrl ? (
                    <div className="aspect-video overflow-hidden rounded-xl border border-[#d6e1ef] bg-black">
                      <iframe className="size-full" src={videoEmbedUrl(demoVideoUrl)} title="BOU CSE Form Desk video demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                  ) : (
                    <div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(isBn ? ["Form-এর ধরন নির্বাচন করুন", "শিক্ষার্থীর তথ্য লিখুন", "Semester ও course নির্বাচন করুন", "Fee ও তারিখ যাচাই করুন", "পূর্ণ preview দেখে PDF নিন"] : ["Choose the form type", "Enter student details", "Select semester and courses", "Check fees and dates", "Review and download the PDF"]).map((step, index) => (
                          <div key={step} className="flex items-start gap-3 rounded-xl border border-[#dce6f2] bg-[#f8fbff] p-3">
                            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#073b82] text-sm font-bold text-white">{index + 1}</span>
                            <p className="pt-0.5 text-sm font-semibold text-[#29445f]">{step}</p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-4 rounded-lg bg-[#fff4f5] px-3 py-2 text-sm text-[#8d2635]">{tr("Video link config-এ যোগ করা হয়নি। আপাতত এই quick guide ব্যবহার করুন।", "No video link has been configured yet. Use this quick guide for now.")}</p>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild className="brand-primary-button button-pop"><a href={quickHelpUrl} target="_blank" rel="noreferrer"><MessageCircleQuestion /> {tr("গ্রুপে সাহায্য চান", "Ask for help in the group")}</a></Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button asChild variant="outline" size="sm" className="quick-help-button button-pop"><a href={quickHelpUrl} target="_blank" rel="noreferrer"><MessageCircleQuestion /><span className="hidden lg:inline">Quick Help</span></a></Button>
            <Button type="button" variant="outline" size="sm" onClick={useDemo} className="brand-outline-button button-pop"><Sparkles /><span className="hidden lg:inline">{tr("নমুনা দেখুন", "View sample")}</span></Button>
          </div>
        </div>
      </header>

      <div id="top" className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end print:hidden">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#0b7658]"><ShieldCheck className="size-4" /> {tr("শিক্ষার্থীদের জন্য অনানুষ্ঠানিক সহায়িকা", "Unofficial student assistance")}</p>
            <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-[#102a22] sm:text-4xl lg:text-[2.65rem]">{tr("একটি ফর্ম—ধাপে ধাপে সহজে সম্পন্ন করুন", "One form—complete it easily, step by step")}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#5b6e67]">{tr("রেজিস্ট্রেশন, ফেল/অনুপস্থিত পুনঃপরীক্ষা অথবা গ্রেড ইমপ্রুভমেন্ট ফর্ম প্রস্তুত করুন। ডান পাশের তাৎক্ষণিক প্রিভিউতে হিসাব সবসময় দেখা যাবে।", "Prepare a registration, failed/absent re-examination, or grade-improvement form. The live summary and calculation stay visible beside every step.")}</p>
          </div>
          <Button type="button" variant="outline" onClick={clearDraft} className="button-pop w-fit border-[#cbd6d1] bg-white"><RotateCcw /> {tr("সব তথ্য মুছুন", "Clear all")}</Button>
        </section>

        <Alert className="mb-6 border-[#e2c47f] bg-[#fffaf0] text-[#493811] print:hidden">
          <AlertCircle />
          <AlertTitle>{tr("টাকা জমা দেওয়ার আগে যাচাই করুন", "Verify before making payment")}</AlertTitle>
          <AlertDescription className="text-[#6a5422]">{tr("এই সাইট শুধু ফর্ম প্রস্তুত করে; BOU-তে জমা দেয় না। সর্বশেষ অফিসিয়াল নোটিশের তারিখ, ফি ও নির্বাচিত কোর্স আপনার স্টাডি সেন্টারের সঙ্গে মিলিয়ে নিন।", "This site only prepares the form; it does not submit anything to BOU. Confirm the latest dates, fees, and selected courses with the official notice or your study centre.")}</AlertDescription>
        </Alert>

        <nav id="wizard-progress" className="wizard-progress print:hidden" aria-label={tr("ফর্মের ধাপ", "Form steps")}>
          <div className="wizard-progress-copy">
            <span>{tr(`ধাপ ${currentStep} / ৫`, `Step ${currentStep} of 5`)}</span>
            <strong>{wizardSteps[currentStep - 1]}</strong>
          </div>
          <div className="wizard-step-list">
            {wizardSteps.map((label, index) => {
              const step = index + 1
              const active = currentStep === step
              const complete = currentStep > step
              return <button key={label} type="button" onClick={() => goToStep(step)} className={`${active ? "active" : ""} ${complete ? "complete" : ""}`} aria-current={active ? "step" : undefined}><span>{complete ? <CheckCircle2 /> : step}</span><small>{label}</small></button>
            })}
          </div>
        </nav>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.75fr)]">
          <div className="space-y-6 print:hidden">
            <Panel hidden={currentStep !== 1} step={tr("ধাপ ১", "Step 1")} title={tr("আপনি কোন ধরনের আবেদন করছেন?", "What type of application are you making?")} badge={tr("একটি স্মার্ট ফর্ম", "One smart form")}>
              <div className="grid gap-3 md:grid-cols-3">
                {(Object.keys(categoryMeta) as FormCategory[]).map((category) => {
                  const item = categoryMeta[category]
                  const Icon = item.icon
                  const active = draft.category === category
                  return (
                    <button type="button" key={category} onClick={() => selectCategory(category)} className={`category-card ${active ? "category-card-active" : ""}`} aria-pressed={active}>
                      <span className={`category-icon ${active ? "category-icon-active" : ""}`}><Icon /></span>
                      <span className="min-w-0 text-left"><span className="block text-sm font-semibold">{isBn ? item.bn : item.label}</span><span className="mt-0.5 block text-xs text-[#718079]">{isBn ? item.label : item.bn}</span></span>
                      {active && <CheckCircle2 className="ml-auto size-5 shrink-0 text-[#0b7658]" />}
                    </button>
                  )
                })}
              </div>
              <p className="category-state mt-4 rounded-lg px-3 py-3 text-base leading-7 text-[#55665f]"><strong className="text-[#243a32]">{isBn ? meta.bn : meta.label}:</strong> {isBn ? meta.description : meta.descriptionEn}</p>
            </Panel>

            <Panel hidden={currentStep !== 2} step={tr("ধাপ ২", "Step 2")} title={tr("শিক্ষার্থীর তথ্য", "Student details")} copy={tr("সব ধরনের ফর্মে এই তথ্যগুলো একই থাকবে।", "These details are shared by every form type.")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={tr("শিক্ষার্থী আইডি / Student ID", "Student ID / শিক্ষার্থী আইডি")} required><Input value={draft.studentId} onChange={(event) => update("studentId", event.target.value)} placeholder={tr("যেমন: 2023-1-60-000", "Example: 2023-1-60-000")} /></Field>
                <Field label={tr("শিক্ষার্থীর নাম / Student Name", "Student Name / শিক্ষার্থীর নাম")} required><Input value={draft.studentName} onChange={(event) => update("studentName", event.target.value)} placeholder={tr("BOU রেকর্ড অনুযায়ী লিখুন", "Enter the name shown in BOU records")} /></Field>
                <Field label={tr("শিক্ষাবর্ষ / Session", "Session / শিক্ষাবর্ষ")}><Input value={draft.session} onChange={(event) => update("session", event.target.value)} placeholder={tr("যেমন: 2023–2024", "Example: 2023–2024")} /></Field>
                <Field label={tr("টার্ম / Term", "Term / টার্ম")} hint={tr("BOU-এর তিন অঙ্কের টার্ম কোড", "BOU's three-digit term code")}><Input value={draft.term} onChange={(event) => update("term", event.target.value)} placeholder="252" /></Field>
                <Field label={tr("স্টাডি সেন্টার / Study Centre", "Study Centre / স্টাডি সেন্টার")} info={tr("CSE প্রোগ্রামের জন্য বর্তমানে DRC (801) এবং DUET (020)—এই দুইটি স্টাডি সেন্টার তালিকাভুক্ত আছে।", "DRC (801) and DUET (020) are currently listed for the CSE programme.")}>
                  <Select value={draft.studyCenter || undefined} onValueChange={(value) => update("studyCenter", value)}>
                    <SelectTrigger className="h-10 w-full bg-white text-base"><SelectValue placeholder={tr("স্টাডি সেন্টার নির্বাচন করুন", "Select a study centre")} /></SelectTrigger>
                    <SelectContent>{studyCenters.map((center) => <SelectItem key={center.code} value={center.code} className="text-base">{isBn ? center.bn : center.name} — {center.code}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label={tr("সম্ভাব্য জমার তারিখ / Form Submission Date", "Form Submission Date / সম্ভাব্য জমার তারিখ")} info={draft.category === "registration" ? tr("তারিখ নিজে নির্বাচন করুন অথবা ‘আজ’ চাপুন। রেজিস্ট্রেশন ফর্মে এটি draft reference হিসেবে থাকবে।", "Choose a date or press Today. It is retained as a draft reference for registration.") : tr("তারিখ নিজে নির্বাচন করুন অথবা ‘আজ’ চাপুন। সাইট deadline-এর সঙ্গে মিলিয়ে জরিমানা দেখাবে।", "Choose a date or press Today. The site compares it with the deadline to calculate any late fine.")}><div className="flex gap-2"><Input type="date" value={draft.submissionDate} onChange={(event) => update("submissionDate", event.target.value)} /><Button type="button" variant="outline" className="today-button button-pop shrink-0" onClick={() => update("submissionDate", localIsoDate())}>{tr("আজ", "Today")}</Button></div></Field>
              </div>
              <div className="mt-5 rounded-xl border border-[#dce5e1] bg-[#f7faf8] p-4">
                <div className="mb-3 flex items-start gap-2">
                  <CircleHelp className="mt-0.5 size-4 shrink-0 text-[#0b7658]" />
                  <div><h3 className="text-base font-semibold text-[#29443a]">{tr("ব্যাংকে টাকা জমার স্থায়ী তথ্য", "Permanent bank deposit details")}</h3><p className="mt-1 text-sm leading-6 text-[#697a73]">{tr("এই তথ্যগুলো ফর্মে স্বয়ংক্রিয়ভাবে থাকবে। জমা স্লিপে অ্যাকাউন্ট নম্বরটি পরিষ্কারভাবে লিখুন।", "These details are inserted automatically. Write the account number clearly on the deposit slip.")}</p></div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <FixedDetail label={tr("ব্যাংক", "Bank")} value={paymentDetails.bankName} />
                  <FixedDetail label={tr("শাখা", "Branch")} value={paymentDetails.bankBranch} />
                  <FixedDetail label={tr("অনলাইন হিসাব নম্বর", "Online account number")} value={paymentDetails.accountNumber} />
                </div>
                <details className="receipt-example mt-4 border-t border-[#dce5e1] pt-4">
                  <summary>{tr("জমা স্লিপ পূরণের নমুনা দেখুন", "View a completed deposit-slip sample")}</summary>
                  <p className="mt-3 text-sm leading-6 text-[#697a73]">{tr("শাখা, হিসাব নম্বর, হিসাবের নাম, মোট টাকা ও টাকার পরিমাণ কথায় লিখুন। ব্যাংকের সিলসহ শিক্ষার্থী কপিটি ফর্মের সঙ্গে সংযুক্ত রাখুন।", "Write the branch, account number, account name, total amount, and amount in words. Attach the bank-stamped student copy to the form.")}</p>
                  <div className="mt-3 overflow-hidden rounded-xl border border-[#cfdad5] bg-white p-2">
                    <Image src="/janata-bank-deposit-slip-sample.png" width={1580} height={655} alt="জনতা ব্যাংকের পূরণ করা জমা স্লিপের নমুনা" className="h-auto w-full" unoptimized />
                  </div>
                </details>
              </div>
            </Panel>

            <section className={`${currentStep === 2 ? "" : "hidden"} rounded-2xl border border-[#cfe1d9] bg-[#f9fcfa] p-4 sm:p-6`}>
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                  <div><p className="step-kicker">{tr("ঐচ্ছিক দ্রুত পূরণ", "Optional quick fill")}</p><h2 className="section-title">{tr("Messy result paste করেও Auto-fill", "Auto-fill from a messy result-page paste")}</h2><p className="section-copy">{tr("অফিসিয়াল result page-এর সব লেখা—heading, table, course rowসহ—একসাথে copy করে paste করুন। পরিষ্কার করার দরকার নেই।", "Copy and paste all text from the official result page—including headings, tables, and course rows. No cleanup is needed.")}</p></div>
                  <Button asChild variant="outline" size="sm" className="border-[#a8c6ba] bg-white"><a href="https://result.bou.ac.bd/" target="_blank" rel="noreferrer">{tr("অফিসিয়াল ফলাফল", "Official result")} <ExternalLink /></a></Button>
                </div>
                <Textarea value={resultText} onChange={(event) => { setResultText(event.target.value); setImportReport([]) }} placeholder={"পুরো result page paste করুন…\nStudent ID: 22052801003\nStudent Name: Rakibul Hasan\nMAT1231  Linear Algebra and Differential Equations  C+\nCSE1235  Digital Logic Design  B-"} className="min-h-36 border-[#bcd0c8] bg-white font-mono text-xs leading-6" />
                <div className="mt-3 flex flex-wrap items-center gap-3"><Button type="button" onClick={importResults} disabled={!resultText.trim()} className="brand-primary-button button-pop"><FileCheck2 /> {tr("তথ্য ও Result যাচাই করুন", "Check details and result")}</Button><span className="text-sm text-[#60736c]">{tr("সব parsing আপনার browser-এই হয়; result কোথাও upload হয় না।", "All parsing happens in your browser; the result is never uploaded.")}</span></div>
                <p className="mt-3 text-sm leading-6 text-[#60736c]">{draft.category === "registration" ? tr("Registration form-এ শুধু পরিচয়সংক্রান্ত তথ্য পূরণ হবে।", "Only identity details are filled for a registration form.") : draft.category === "failed" ? tr("F grade-এর courseগুলো দেখাবে; checkbox দিলে তবেই fee-তে যোগ হবে।", "F-grade courses are shown and only checked courses are added to the fee.") : tr("B−, C+, C ও D grade-এর eligible courseগুলো দেখাবে; checkbox দিলে তবেই fee-তে যোগ হবে।", "Eligible B−, C+, C, and D courses are shown and only checked courses are added to the fee.")} {tr("নতুন result paste করলে আগের course selection reset হবে। বর্তমান application Term notice থেকে আসবে।", "Pasting a new result resets the previous course selection. The current application term comes from the notice.")}</p>
                {importReport.length > 0 && <div className="mt-4 rounded-xl border border-[#bdd8cd] bg-[#edf7f2] p-3"><p className="text-sm font-semibold text-[#245442]">{tr("যা পাওয়া গেছে", "Information found")}</p><div className="mt-2 flex flex-wrap gap-2">{importReport.map((item) => <Badge key={item} variant="outline" className="border-[#a9cabc] bg-white text-[#315a4c]">{item}</Badge>)}</div></div>}
                {draft.category !== "registration" && draft.importedGrades.length > 0 && <div className="mt-5 grid gap-2">{draft.importedGrades.map((item) => {
                  const course = courses.find((candidate) => candidate.code === item.code)
                  const eligibility = eligibilityForGrade(item.grade)
                  const selectable = draft.category === "improvement" ? eligibility.kind === "improvement" : eligibility.kind === "failed"
                  const selected = draft.selectedCodes.includes(item.code)
                  return <div key={item.code} className={`grid gap-3 rounded-xl border bg-white p-3 sm:grid-cols-[1fr_auto] sm:items-center ${selected ? "border-[#78ad98] ring-1 ring-[#78ad98]" : "border-[#dce7e2]"}`}><div className="flex items-start gap-3">{selectable ? <Checkbox className="mt-0.5" checked={selected} onCheckedChange={() => toggleCourse(item.code)} aria-label={`${item.code} নির্বাচন করুন`} /> : <span className="mt-0.5 block size-4 shrink-0 rounded border border-[#d6dfdb] bg-[#f1f4f3]" aria-hidden="true" />}<div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{item.code}</strong><Badge variant="outline">{item.grade} · {gradePoints[item.grade]} GP</Badge>{course && <span className="text-xs text-[#718079]">{semesterNames[course.semester]}</span>}</div><p className="mt-1 text-xs text-[#677870]">{course?.title}</p>{selectable && <p className="mt-1 text-xs font-semibold text-[#3f6b5b]">{selected ? "Fee-তে যোগ হয়েছে—বাদ দিতে checkbox খুলুন" : "Fee-তে যোগ করতে checkbox দিন"}</p>}</div></div><EligibilityBadge kind={eligibility.kind} label={eligibility.label} /></div>
                })}</div>}
              </section>

            <Panel hidden={currentStep !== 3} step={tr("ধাপ ৩", "Step 3")} title={tr("সেমিস্টার ও কোর্স নির্বাচন করুন", "Select semester and courses")} copy={draft.category === "registration" ? tr("এই সেমিস্টারে যে সব কোর্স রেজিস্ট্রেশন করবেন, সবগুলো নির্বাচন করুন।", "Select every course you will register for this semester.") : draft.category === "failed" ? tr("শুধু ফেল বা অনুপস্থিত কোর্সগুলো নির্বাচন করুন।", "Select only failed or absent courses.") : tr("শুধু যোগ্য পাস করা কোর্স নিন; F গ্রেড হলে ফেল/অনুপস্থিত বিভাগ ব্যবহার করুন।", "Select only eligible passed courses; use Failed / Absent for an F grade.")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={tr("বর্ষ ও সেমিস্টার / Year & Semester", "Year & Semester / বর্ষ ও সেমিস্টার")}>
                  <Select value={draft.semester || undefined} onValueChange={selectSemester}>
                    <SelectTrigger className="h-10 w-full bg-white text-base"><SelectValue placeholder={tr("বর্ষ ও সেমিস্টার নির্বাচন করুন", "Select year and semester")} /></SelectTrigger>
                    <SelectContent>{Object.entries(semesterNames).map(([value, label]) => <SelectItem key={value} value={value} className="text-base">{label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label={tr("কোর্স খুঁজুন", "Search courses")}><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-[#7a8b84]" /><Input className="pl-9" value={courseSearch} onChange={(event) => setCourseSearch(event.target.value)} placeholder={tr("কোর্স কোড বা নাম", "Course code or title")} /></div></Field>
              </div>
              {draft.category === "registration" && registrationNotice.enabled && registrationProfile && <div className="notice-profile mt-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-xs font-bold uppercase tracking-[0.12em]">বর্তমান অফিসিয়াল প্রিসেট · Term {registrationNotice.term}</p><p className="mt-1 text-sm">প্রকাশ: {registrationNotice.published} · Session: {registrationProfile.session}</p></div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" onClick={applyRegistrationNotice} className="notice-apply-button button-pop"><Sparkles /> {tr("বর্তমান notice-এর তথ্য বসান", "Apply current notice")}</Button>
                    <Button asChild size="sm" className="brand-primary-button button-pop"><a href={registrationNotice.osapsUrl} target="_blank" rel="noreferrer">{tr("OSAPS-এ রেজিস্ট্রেশন", "Register in OSAPS")} <ExternalLink /></a></Button>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3"><FixedDetail label={tr("রেজিস্ট্রেশনের সময়", "Registration period")} value={`${registrationNotice.registrationFrom} – ${registrationNotice.registrationTo}`} /><FixedDetail label={tr("ক্লাস শুরু", "Classes begin")} value={registrationProfile.classStart} /><FixedDetail label={tr("Notice-এর মোট", "Notice total")} value={`৳${money(registrationProfile.noticeTotal)}`} /></div>
              </div>}
              {draft.category === "registration" && <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={selectAllSemesterCourses} disabled={!draft.semester} className="course-action-primary button-pop"><CheckCircle2 /> {tr("সব কোর্স নির্বাচন করুন", "Select all courses")}</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => update("selectedCodes", [])} disabled={!courseCount} className="course-action-clear button-pop"><XCircle /> {tr("সব নির্বাচন বাতিল", "Clear selection")}</Button>
              </div>}
              <div className="mt-4 overflow-hidden rounded-xl border border-[#dce3df]">
                {semesterCourses.map((course) => {
                  const grade = gradeMap.get(course.code)
                  const eligibility = grade ? eligibilityForGrade(grade) : null
                  const selected = draft.selectedCodes.includes(course.code)
                  const blocked = draft.category === "improvement" && eligibility?.kind === "failed"
                  return <label key={course.code} className={`course-row ${selected ? "course-row-selected" : ""} ${blocked ? "opacity-60" : ""}`}><Checkbox checked={selected} disabled={blocked} onCheckedChange={() => toggleCourse(course.code)} /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-sm text-[#17342a]">{course.code}</strong><span className="text-xs text-[#718079]">{course.credit} credit</span>{grade && <Badge variant="outline">Grade {grade}</Badge>}</span><span className="mt-0.5 block text-sm text-[#53665e]">{course.title}</span>{course.prerequisite && <span className="mt-1 block text-xs text-[#7b6a3a]">Prerequisite: {course.prerequisite}</span>}</span></label>
                })}
                {semesterCourses.length === 0 && <p className="p-6 text-center text-base text-[#718079]">{tr("মিলে যাওয়া কোনো কোর্স পাওয়া যায়নি।", "No matching courses found.")}</p>}
              </div>
              <p className="mt-3 text-sm text-[#667971]">{tr("নির্বাচিত কোর্স", "Selected courses")}: {courseCount} · {tr("মোট ক্রেডিট", "Total credits")}: {creditCount}</p>
              {draft.category === "registration" && registrationProfile && courseCount > 0 && (creditCount !== registrationProfile.billableCredits || courseCount !== registrationProfile.examCourses) && <Alert className="mt-4 border-[#e6c26e] bg-[#fffaf0]"><AlertCircle /><AlertTitle>Course list ও notice-এর fee count এক নয়</AlertTitle><AlertDescription>নির্বাচিত তালিকায় {courseCount}টি course ও {creditCount} credit আছে; notice-এর fee হিসাব {registrationProfile.examCourses}টি course ও {registrationProfile.billableCredits} credit ধরে। নিচের editable fee-count ঘরগুলো notice অনুযায়ী রাখা হয়েছে—course list অবশ্যই coordinator-এর সঙ্গে মিলিয়ে নিন।</AlertDescription></Alert>}
            </Panel>

            <Panel hidden={currentStep !== 4} step={tr("ধাপ ৪ · প্রযোজ্য ফি", "Step 4 · Applicable fees")} title={tr("সর্বশেষ নোটিশের ফি লিখুন", "Enter fees from the latest notice")} copy={tr("সর্বশেষ অফিসিয়াল নোটিশ দেখে প্রযোজ্য ফি ও জরিমানার হার লিখুন। এখানে কোনো পুরোনো অঙ্ক আগে থেকে বসানো নেই।", "Use the latest official notice to enter the applicable fees and late-fine rates. No old amount is pre-filled.")}>
              {draft.category === "registration" ? (
                <div className="space-y-5">
                  <Alert className="border-[#cfe1d9] bg-[#f3f8f6]"><Calculator /><AlertTitle>{tr("রেজিস্ট্রেশন ফি পরিবর্তনযোগ্য", "Registration fees are editable")}</AlertTitle><AlertDescription>{tr("প্রোগ্রাম পেজের বর্তমান অঙ্কগুলো প্রাথমিকভাবে দেখানো হয়েছে। আপনার টার্মের নোটিশে ভিন্ন হলে সংশোধন করুন।", "Apply the current notice preset or enter the amounts from your term notice manually.")}</AlertDescription></Alert>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label={tr("ফি হিসাবের মোট ক্রেডিট", "Billable credits")} info={tr("নোটিশে যত ক্রেডিটের জন্য টাকা চাওয়া হয়েছে সেটি লিখুন।", "Enter the number of credits charged in the notice.")}><Input type="number" min="0" step="0.25" value={draft.regBillableCredits} onChange={(event) => update("regBillableCredits", event.target.value)} placeholder={tr("যেমন: 18.5", "Example: 18.5")} /></Field>
                    <Field label={tr("পরীক্ষার ফি প্রযোজ্য কোর্স", "Courses charged for examination")} info={tr("নোটিশের পরীক্ষার ফি লাইনে যতটি কোর্স দিয়ে গুণ করা হয়েছে সেই সংখ্যা লিখুন।", "Enter the number of courses used in the notice's examination-fee calculation.")}><Input type="number" min="0" step="1" value={draft.regExamCourseCount} onChange={(event) => update("regExamCourseCount", event.target.value)} placeholder={tr("যেমন: 9", "Example: 9")} /></Field>
                    <MoneyInput label={tr("কোর্স ফি · প্রতি ক্রেডিট", "Course fee · per credit")} info={tr("এক ক্রেডিটের ফি লিখুন।", "Enter the fee for one credit.")} value={draft.regPerCredit} onChange={(value) => update("regPerCredit", value)} />
                    <MoneyInput label={tr("পরীক্ষার ফি · প্রতি কোর্স", "Examination fee · per course")} info={tr("সব কোর্সের মোট নয়—একটি কোর্সের পরীক্ষার ফি লিখুন।", "Enter the examination fee for one course, not the total.")} value={draft.regExamPerCourse} onChange={(value) => update("regExamPerCourse", value)} />
                    <MoneyInput label={tr("সেমিস্টার রেজিস্ট্রেশন", "Semester registration")} value={draft.regSemesterFee} onChange={(value) => update("regSemesterFee", value)} />
                    <MoneyInput label={tr("সেমিস্টার মার্কশিট", "Semester marksheet")} value={draft.regMarksheetFee} onChange={(value) => update("regMarksheetFee", value)} />
                    <MoneyInput label={tr("একাডেমিক ক্যালেন্ডার", "Academic calendar")} value={draft.regCalendarFee} onChange={(value) => update("regCalendarFee", value)} />
                    {draft.semester === "4-2" && <MoneyInput label={tr("মূল সনদপত্র", "Original certificate")} value={draft.regCertificateFee} onChange={(value) => update("regCertificateFee", value)} />}
                    {draft.semester === "4-2" && <MoneyInput label={tr("ট্রান্সক্রিপ্ট", "Transcript")} value={draft.regTranscriptFee} onChange={(value) => update("regTranscriptFee", value)} />}
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
                    <div className="grid grid-cols-[1fr_auto] border-t-2 border-[#223b32] px-4 py-3 font-bold"><span>{tr("মোট", "Total")}</span><span>৳{money(registrationTotal)}</span></div>
                  </div>
                  <div className="rounded-xl border border-[#cfe1d9] bg-[#f7faf8] p-4"><h3 className="text-base font-semibold text-[#29443a]">জমা দেওয়ার আগে checklist</h3><div className="mt-3 grid gap-2 text-sm text-[#52665d] sm:grid-cols-2"><CheckItem text="পূরণকৃত course registration form" /><CheckItem text="Student ID card-এর copy" /><CheckItem text="ব্যাংক receipt-এর hard copy" /><CheckItem text="নির্ধারিত সময়ের মধ্যে Dhaka Regional Centre-এ জমা" /></div><p className="mt-3 text-sm leading-6 text-[#697a73]">প্রথমে OSAPS-এ online registration সম্পন্ন করুন, তারপর notice অনুযায়ী form ও কাগজপত্রের hard copy জমা দিন।</p></div>
                </div>
              ) : (
                <div className="space-y-5">
                  {examNotice.enabled && <div className="notice-profile">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div><p className="text-xs font-bold uppercase tracking-[0.12em]">বর্তমান পরীক্ষার notice · Term {examNotice.term}</p><p className="mt-1 text-sm">প্রকাশ: {examNotice.published}</p></div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" onClick={applyExamNotice} className="notice-apply-button button-pop"><Sparkles /> {tr("বর্তমান notice-এর তথ্য বসান", "Apply current notice")}</Button>
                        {examNotice.noticeUrl && <Button asChild size="sm" variant="outline" className="button-pop border-[#a8c2b8] bg-white"><a href={examNotice.noticeUrl} target="_blank" rel="noreferrer">{tr("Notice দেখুন", "View notice")} <ExternalLink /></a></Button>}
                      </div>
                    </div>
                  </div>}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <MoneyInput label={tr(`${draft.category === "improvement" ? "ইমপ্রুভমেন্ট" : "পুনঃপরীক্ষা"} ফি · প্রতি কোর্স`, `${draft.category === "improvement" ? "Improvement" : "Re-examination"} fee · per course`)} info={tr("সব কোর্সের মোট নয়—একটি কোর্সের মূল ফি লিখুন।", "Enter the base fee for one course, not the total.")} value={draft.courseFee} onChange={(value) => update("courseFee", value)} />
                    <FixedDetail label={tr("যে তারিখ ধরে হিসাব হচ্ছে", "Date used for calculation")} value={effectiveSubmissionDate ? `${effectiveSubmissionDate}${effectiveSubmissionDate === localIsoDate() ? tr(" · আজ", " · Today") : ""}` : tr("তারিখ নির্বাচন করুন", "Select a date")} />
                  </div>
                  {(isBeforeDeadline || isDeadlineDay) && <div className="rounded-xl border border-[#bcd9cc] bg-[#edf7f2] p-4"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#0b7658]" /><div><h3 className="text-base font-semibold text-[#245442]">জরিমানা লাগছে না</h3><p className="mt-1 text-sm leading-6 text-[#4f6e62]">{isDeadlineDay ? "নির্বাচিত তারিখটি জরিমানা ছাড়া শেষ দিন।" : `নির্বাচিত জমার তারিখ deadline-এর ${daysBetween(effectiveSubmissionDate, draft.deadline)} দিন আগে।`} তাই PDF ও মোট টাকায় late fee যোগ হবে না।</p></div></div></div>}
                  {lateDays > 0 && lateTotal > 0 && <div className="rounded-xl border border-[#ecd79f] bg-[#fffaf0] p-4"><div className="flex gap-3"><Calculator className="mt-0.5 size-5 shrink-0 text-[#8a6714]" /><div><h3 className="text-base font-semibold text-[#5c4512]">{tr("জরিমানা স্বয়ংক্রিয়ভাবে যোগ হয়েছে", "Late fine added automatically")}</h3><p className="mt-1 text-sm leading-6 text-[#745c26]">{tr(`নির্বাচিত জমার তারিখ deadline-এর ${lateDays} দিন পরে। বর্তমান rate-এ প্রতি কোর্সে ৳${money(latePerCourse)}; ${courseCount}টি কোর্সে মোট ৳${money(lateTotal)}।`, `The selected date is ${lateDays} days after the deadline. At the current rate, the fine is BDT ${money(latePerCourse)} per course and BDT ${money(lateTotal)} for ${courseCount} courses.`)}</p></div></div></div>}
                  {lateDays > 0 && lateTotal === 0 && <div className="rounded-xl border border-[#cbd8d3] bg-[#f5f8f7] p-4 text-sm leading-6 text-[#53675f]"><strong>Deadline পার হলেও জরিমানা যোগ হয়নি:</strong> late fee বন্ধ আছে অথবা rate শূন্য। Notice-এ জরিমানা থাকলে নিচের settings খুলে চালু করুন।</div>}
                  {isOutsideNotice && <Alert variant="destructive"><XCircle /><AlertTitle>আপনার দেওয়া চূড়ান্ত তারিখ পার হয়েছে</AlertTitle><AlertDescription>জমার তারিখটি বিলম্বসহ শেষ তারিখের পর। টাকা দেওয়ার আগে সময় বৃদ্ধির অফিসিয়াল অনুমতি নিশ্চিত করুন।</AlertDescription></Alert>}
                  <details className="late-settings rounded-xl border border-[#d8e1dd] bg-[#f8faf9] p-4">
                    <summary>{tr("Notice-এর deadline ও জরিমানার rate দেখুন/পরিবর্তন করুন", "View or change notice deadlines and late-fine rates")}</summary>
                    <p className="mt-2 text-sm leading-6 text-[#687a73]">সাধারণত এগুলো বদলাতে হবে না। নতুন notice-এ তারিখ বা rate আলাদা হলে শুধু তখন edit করুন। জরিমানা না থাকলে দুইটি rate-ই 0 দিন।</p>
                    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-[#d5dfdb] bg-white p-3"><Checkbox checked={draft.applyLateFee} onCheckedChange={(checked) => update("applyLateFee", checked === true)} /><span><strong className="block text-sm text-[#2c463c]">Deadline পার হলে late fee প্রযোজ্য</strong><small className="mt-1 block text-xs leading-5 text-[#6b7b75]">Notice-এ জরিমানা না থাকলে এটি বন্ধ করুন—তখন PDF-তেও late fee row থাকবে না।</small></span></label>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <Field label="জরিমানা ছাড়া শেষ তারিখ" info="নোটিশে দেওয়া জরিমানা ছাড়া আবেদনের শেষ তারিখ।"><Input type="date" value={draft.deadline} onChange={(event) => update("deadline", event.target.value)} /></Field>
                      <Field label="বিলম্বসহ চূড়ান্ত তারিখ" info="বিলম্ব ফিসহ আবেদন গ্রহণের সর্বশেষ তারিখ।"><Input type="date" value={draft.finalLateDate} onChange={(event) => update("finalLateDate", event.target.value)} /></Field>
                      {draft.applyLateFee && <MoneyInput label="১–৭ দিন · প্রতি কোর্স/দিন" info="প্রথম সপ্তাহে প্রতিটি নির্বাচিত কোর্সের জন্য প্রতিদিনের জরিমানা।" value={draft.lateRateOne} onChange={(value) => update("lateRateOne", value)} />}
                      {draft.applyLateFee && <MoneyInput label="৮–১৪ দিন · প্রতি কোর্স/দিন" info="দ্বিতীয় সপ্তাহে প্রতিটি নির্বাচিত কোর্সের জন্য প্রতিদিনের জরিমানা।" value={draft.lateRateTwo} onChange={(value) => update("lateRateTwo", value)} />}
                    </div>
                  </details>
                  {draft.category === "improvement" && <p className="text-sm leading-6 text-[#687a73]">Handbook-এর ৩৫ পৃষ্ঠা অনুযায়ী ইমপ্রুভমেন্ট ফি সাধারণ পুনঃপরীক্ষার ফির দ্বিগুণ। তবে সর্বশেষ notice-এ দেওয়া অঙ্কই form-এর চূড়ান্ত হিসাব হিসেবে লিখুন।</p>}
                </div>
              )}
            </Panel>

            {currentStep === 5 && <section className="rounded-2xl border border-[#c9d7d1] bg-white p-4 shadow-[0_18px_55px_rgba(19,49,39,0.08)] sm:p-6">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div><p className="step-kicker">{tr("ধাপ ৫ · চূড়ান্ত যাচাই", "Step 5 · Final review")}</p><h2 className="section-title">{tr("পূর্ণ ফর্ম প্রিভিউ", "Full form preview")}</h2><p className="section-copy">{tr("PDF তৈরির আগে নিচের সব তথ্য মিলিয়ে নিন। কোনো অংশে ভুল থাকলে Edit বাটনে চাপুন।", "Check every detail below before generating the PDF. Use an Edit button to return to the relevant step.")}</p></div>
                <Badge className="bg-[#e8f4ef] text-[#075e45] hover:bg-[#e8f4ef]"><CheckCircle2 /> {tr("শেষ ধাপ", "Final step")}</Badge>
              </div>
              <div className="full-form-preview">
                <div className="full-preview-brand"><Image src="/bou-logo.png" width={250} height={224} alt="Bangladesh Open University logo" unoptimized /><div><h3>Bangladesh Open University</h3><p>School of Science and Technology</p><p>Board Bazar, Gazipur-1705, Bangladesh</p></div></div>
                <div className="full-preview-title"><h3>{draft.category === "registration" ? "SEMESTER REGISTRATION FORM" : draft.category === "improvement" ? "IMPROVE REGISTRATION FORM" : "RE-EXAM REGISTRATION FORM"}</h3><p>(Bank receipt must be enclosed with the Form)</p><p>{paymentDetails.bankName}, {paymentDetails.bankBranch} · Online A/C: {paymentDetails.accountNumber}</p></div>
                <div className="review-section-heading"><span>{tr("শিক্ষার্থীর তথ্য", "Student details")}</span><button type="button" onClick={() => goToStep(2)}>{tr("সম্পাদনা", "Edit")}</button></div>
                <dl className="review-details"><div><dt>Student ID</dt><dd>{draft.studentId || "—"}</dd></div><div><dt>Student Name</dt><dd>{draft.studentName || "—"}</dd></div><div><dt>Year & Semester</dt><dd>{semesterNames[draft.semester] || "—"}</dd></div><div><dt>Study Centre</dt><dd>{studyCenters.find((center) => center.code === draft.studyCenter)?.name || "—"}{draft.studyCenter ? ` — ${draft.studyCenter}` : ""}</dd></div><div><dt>Session</dt><dd>{draft.session || "—"}</dd></div><div><dt>Term</dt><dd>{draft.term || "—"}</dd></div></dl>
                <div className="review-section-heading"><span>{tr("নির্বাচিত কোর্স", "Selected courses")}</span><button type="button" onClick={() => goToStep(3)}>{tr("সম্পাদনা", "Edit")}</button></div>
                <div className="review-table-wrap"><table className="review-table"><thead><tr><th>SL</th><th>Code</th><th>Title</th><th>Credit</th>{draft.category === "improvement" && <th>Grade</th>}</tr></thead><tbody>{selectedCourses.map((course, index) => <tr key={course.code}><td>{String(index + 1).padStart(2, "0")}</td><td><strong>{course.code}</strong></td><td>{course.title}</td><td>{course.credit}</td>{draft.category === "improvement" && <td>{gradeMap.get(course.code) || "—"}</td>}</tr>)}{!courseCount && <tr><td colSpan={5}>{tr("কোনো কোর্স নির্বাচন করা হয়নি", "No course selected")}</td></tr>}</tbody></table></div>
                <div className="review-section-heading"><span>{tr("ফি বিবরণ", "Fee details")}</span><button type="button" onClick={() => goToStep(4)}>{tr("সম্পাদনা", "Edit")}</button></div>
                <div className="review-fees">{draft.category === "registration" ? <><MoneyLine label={tr("কোর্স রেজিস্ট্রেশন", "Course registration")} value={registrationBreakdown.course} /><MoneyLine label={tr("পরীক্ষার ফি", "Examination fee")} value={registrationBreakdown.exam} /><MoneyLine label={tr("সেমিস্টার রেজিস্ট্রেশন", "Semester registration")} value={registrationBreakdown.semester} /><MoneyLine label={tr("সেমিস্টার মার্কশিট", "Semester marksheet")} value={registrationBreakdown.marksheet} />{registrationBreakdown.calendar > 0 && <MoneyLine label={tr("একাডেমিক ক্যালেন্ডার", "Academic calendar")} value={registrationBreakdown.calendar} />}</> : <><MoneyLine label={tr(draft.category === "improvement" ? "ইমপ্রুভমেন্ট ফি" : "পুনঃপরীক্ষা ফি", draft.category === "improvement" ? "Improvement fee" : "Re-examination fee")} value={examBaseTotal} />{lateTotal > 0 && <MoneyLine label={tr(`বিলম্ব জরিমানা · ${lateDays} দিন`, `Late fine · ${lateDays} days`)} value={lateTotal} />}</>}<div className="review-total"><span>{tr("আনুমানিক মোট", "Estimated total")}</span><strong>৳{money(total)}</strong></div></div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3"><Button type="button" className="brand-accent-button button-pop" onClick={handleDownloadPdf} disabled={!courseCount || pdfDownloading}><Download /> {pdfDownloading ? tr("PDF তৈরি হচ্ছে…", "Generating PDF…") : tr("PDF ডাউনলোড করুন", "Download PDF")}</Button><Button type="button" variant="outline" onClick={() => window.print()} disabled={!courseCount}><Printer /> Print / Save as PDF</Button></div>
            </section>}

            <section className={`${currentStep === 5 ? "" : "hidden"} rounded-2xl border border-[#d8e1dd] bg-white p-4 sm:p-6`}>
              <div className="mb-4 flex items-center gap-3"><BookOpen className="size-5 text-[#0b7658]" /><div><p className="step-kicker">{tr("যোগ্যতার নিয়ম", "Eligibility rules")}</p><h2 className="section-title">{tr("CSE Handbook কী বলে", "What the CSE Handbook says")}</h2></div></div>
              <div className="grid gap-3 sm:grid-cols-2"><Rule title={tr("F গ্রেড", "F grade")} text={tr("পরবর্তী কোনো সেমিস্টারে কোর্সটি চালু হলে পুনরায় পরীক্ষা দেওয়া বাধ্যতামূলক।", "Re-examination is mandatory when the course is next offered.")} /><Rule title={tr("B− বা তার নিচে", "B− or below")} text={tr("B−, C+, C অথবা D পাস গ্রেড একবার উন্নয়ন করা যায়।", "A passed grade of B−, C+, C, or D may be improved once.")} /><Rule title={tr("আগের গ্রেড সুরক্ষিত", "Previous grade protected")} text={tr("ফল উন্নত না হলে আগের বৈধ গ্রেডটি বহাল থাকবে।", "The previous valid grade remains if the result does not improve.")} /><Rule title={tr("সীমাবদ্ধতা", "Limits")} text={tr("প্রতি কোর্সে একবার ইমপ্রুভমেন্ট দেওয়া যায়; গ্র্যাজুয়েশনের পরে সুযোগ নেই।", "Improvement is allowed once per course and not after graduation.")} /></div>
              <p className="mt-4 text-sm leading-6 text-[#687a73]">{tr("সূত্র: B.Sc in CSE Program Handbook, পৃষ্ঠা ৩৪–৩৫। সংশ্লিষ্ট পরবর্তী সেমিস্টারে কোর্সটি অফার থাকতে হবে।", "Source: B.Sc in CSE Program Handbook, pages 34–35. The course must be offered in a subsequent semester.")}</p>
            </section>

            <section className={`${currentStep === 5 ? "" : "hidden"} rounded-2xl border border-[#d8e1dd] bg-white p-4 sm:p-6`}>
              <div className="mb-4 flex items-center gap-3"><Link2 className="size-5 text-[#0b7658]" /><div><p className="step-kicker">{tr("অফিসিয়াল উৎস", "Official sources")}</p><h2 className="section-title">{tr("জমা দেওয়ার আগে যাচাই করুন", "Verify before submission")}</h2></div></div>
              <div className="grid gap-2 sm:grid-cols-2">{officialLinks.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="official-link"><span><strong>{link.label}</strong><small>{link.note}</small></span><ExternalLink /></a>)}</div>
              <div className="quick-help-card mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl p-4">
                <div><p className="font-bold text-[#173c70]">{tr("Quick Help দরকার?", "Need quick help?")}</p><p className="mt-1 text-sm text-[#526b89]">{tr("Form বা notice বুঝতে সমস্যা হলে BOU CSE Notes group-এ প্রশ্ন post করুন।", "Post your question in the BOU CSE Notes group if a form or notice is unclear.")}</p></div>
                <Button asChild className="brand-primary-button button-pop"><a href={quickHelpUrl} target="_blank" rel="noreferrer"><MessageCircleQuestion /> {tr("গ্রুপে পোস্ট করুন", "Post in the group")} <ExternalLink /></a></Button>
              </div>
            </section>

            <div className="wizard-actions">
              <Button type="button" variant="outline" onClick={() => goToStep(currentStep - 1)} disabled={currentStep === 1}><ArrowLeft /> {tr("পেছনে", "Back")}</Button>
              <p>{tr(`ধাপ ${currentStep} / ৫`, `Step ${currentStep} of 5`)}</p>
              {currentStep < 5 && <Button type="button" className="brand-primary-button button-pop" onClick={() => goToStep(currentStep + 1)} disabled={(currentStep === 2 && (!draft.studentId.trim() || !draft.studentName.trim())) || (currentStep === 3 && !courseCount)}>{currentStep === 4 ? tr("পূর্ণ প্রিভিউ দেখুন", "View full preview") : tr("পরবর্তী ধাপ", "Next step")} <ArrowRight /></Button>}
            </div>
            {currentStep === 2 && (!draft.studentId.trim() || !draft.studentName.trim()) && <p className="wizard-validation-note">{tr("পরবর্তী ধাপে যেতে Student ID ও Student Name লিখুন।", "Enter Student ID and Student Name to continue.")}</p>}
            {currentStep === 3 && !courseCount && <p className="wizard-validation-note">{tr("পরবর্তী ধাপে যেতে অন্তত একটি কোর্স নির্বাচন করুন।", "Select at least one course to continue.")}</p>}
          </div>

          <aside className="xl:sticky xl:top-5 xl:self-start print:hidden">
            <div className="rounded-2xl border border-[#cfdad5] bg-white p-5 shadow-[0_18px_55px_rgba(19,49,39,0.09)]">
              <div className="mb-5 flex items-start justify-between gap-3"><div><p className="step-kicker">{tr("তাৎক্ষণিক সারসংক্ষেপ", "Live summary")}</p><h2 className="text-xl font-bold text-[#16372c]">{tr("ফর্ম প্রিভিউ", "Form preview")}</h2></div><span className="grid size-10 place-items-center rounded-xl bg-[#e7f2ed] text-[#075e45]"><CategoryIcon /></span></div>
              <div className="space-y-3 text-base"><SummaryLine label={tr("ফর্মের ধরন", "Form type")} value={isBn ? meta.bn : meta.label} /><SummaryLine label={tr("শিক্ষার্থী", "Student")} value={draft.studentName || tr("লেখা হয়নি", "Not entered")} muted={!draft.studentName} /><SummaryLine label={tr("টার্ম", "Term")} value={draft.term || "—"} /><SummaryLine label={tr("কোর্স", "Courses")} value={String(courseCount)} />{draft.category === "registration" && <SummaryLine label={tr("নির্বাচিত ক্রেডিট", "Selected credits")} value={String(creditCount)} />}{draft.category === "registration" && <SummaryLine label={tr("ফি হিসাবের ক্রেডিট", "Billable credits")} value={String(billableCredits)} />}</div>
              {courseCount > 0 && <div className="mt-4 border-y border-[#e2e8e5] py-3">{selectedCourses.map((course) => <p key={course.code} className="py-1 text-xs text-[#52645d]"><strong className="text-[#213c32]">{course.code}</strong> · {course.title}</p>)}</div>}
              <div className="mt-5 space-y-2">
                {draft.category === "registration" ? <><MoneyLine label={tr("কোর্স রেজিস্ট্রেশন", "Course registration")} value={registrationBreakdown.course} /><MoneyLine label={tr("পরীক্ষার ফি", "Examination fee")} value={registrationBreakdown.exam} /><MoneyLine label={tr("সেমিস্টার রেজিস্ট্রেশন", "Semester registration")} value={registrationBreakdown.semester} /><MoneyLine label={tr("সেমিস্টার মার্কশিট", "Semester marksheet")} value={registrationBreakdown.marksheet} />{registrationBreakdown.calendar > 0 && <MoneyLine label={tr("একাডেমিক ক্যালেন্ডার", "Academic calendar")} value={registrationBreakdown.calendar} />}{registrationBreakdown.certificate > 0 && <MoneyLine label={tr("মূল সনদপত্র", "Original certificate")} value={registrationBreakdown.certificate} />}{registrationBreakdown.transcript > 0 && <MoneyLine label={tr("ট্রান্সক্রিপ্ট", "Transcript")} value={registrationBreakdown.transcript} />}</> : <><MoneyLine label={tr(`${draft.category === "improvement" ? "ইমপ্রুভমেন্ট" : "পুনঃপরীক্ষা"} ফি`, `${draft.category === "improvement" ? "Improvement" : "Re-examination"} fee`)} value={examBaseTotal} />{lateTotal > 0 && <MoneyLine label={tr(`বিলম্ব জরিমানা · ${lateDays} দিন`, `Late fine · ${lateDays} days`)} value={lateTotal} />}</>}
                <div className="mt-3 flex items-end justify-between border-t-2 border-[#193b30] pt-3"><span className="font-semibold">{tr("আনুমানিক মোট", "Estimated total")}</span><span className="text-2xl font-bold text-[#075e45]">৳{money(total)}</span></div>
              </div>
              <Button type="button" className="brand-accent-button button-pop mt-5 w-full" onClick={handleDownloadPdf} disabled={!courseCount || pdfDownloading}><Download /> {pdfDownloading ? tr("PDF তৈরি হচ্ছে…", "Generating PDF…") : tr("PDF ডাউনলোড করুন", "Download PDF")}</Button>
              {pdfReady && <a href={pdfReady.url} download={pdfReady.fileName} className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-[#8eb9a9] bg-[#edf7f3] px-4 py-2.5 text-sm font-semibold text-[#075e45] hover:bg-[#e3f2ec]"><Download className="size-4" />{tr("PDF প্রস্তুত—এখানে চাপুন", "PDF ready—click here")}</a>}
              <Button type="button" variant="outline" className="mt-2 w-full border-[#b9cbc4]" onClick={() => window.print()} disabled={!courseCount}><Printer /> Print / Save as PDF</Button>
              {pdfError && <p className="mt-3 rounded-lg bg-[#fff2f2] px-3 py-2 text-center text-sm leading-6 text-[#9c2f35]">{pdfError}</p>}
              <p className="mt-3 text-center text-sm leading-6 text-[#718079]">{tr("প্রথম বোতাম PDF তৈরি করে download শুরু করবে। Browser automatic download আটকালে ‘PDF প্রস্তুত’ link-এ চাপুন।", "The first button creates and downloads the PDF. If the browser blocks it, use the ‘PDF ready’ link.")}</p>
            </div>
            <div className="mt-4 rounded-xl border border-[#d8e1dd] bg-[#edf4f1] p-4 text-sm leading-6 text-[#52665d]"><strong className="text-[#274338]">{tr("ফলাফলের গোপনীয়তা:", "Result privacy:")}</strong> {tr("ফলাফল কপি-পেস্ট করলে কোনো লগইন তথ্য শেয়ার করতে হয় না এবং তথ্য আপনার ডিভাইসের বাইরে যায় না।", "Copying and pasting a result requires no login details, and the data never leaves your device.")}</div>
          </aside>
        </div>

        <div className="mobile-summary-bar print:hidden">
          <button type="button" className="mobile-summary-main" onClick={() => goToStep(5)}><span>{courseCount} {tr("কোর্স", "courses")}</span><strong>৳{money(total)}</strong><small>{tr("পূর্ণ প্রিভিউ", "Full preview")}</small></button>
          <Button type="button" size="sm" className="brand-accent-button button-pop" onClick={handleDownloadPdf} disabled={!courseCount || pdfDownloading}><Download /> PDF</Button>
        </div>

        <PrintableForm draft={draft} selectedCourses={selectedCourses} gradeMap={gradeMap} lateDays={lateDays} latePerCourse={latePerCourse} total={total} registrationBreakdown={registrationBreakdown} />
      </div>

      <footer className="border-t border-[#dce3df] bg-white pb-20 print:hidden xl:pb-0"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-sm text-[#6a7b74] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><p>{tr("স্বতন্ত্র শিক্ষার্থী সহায়িকা · বাংলাদেশ উন্মুক্ত বিশ্ববিদ্যালয়ের অফিসিয়াল সেবা নয়।", "Independent student guide · Not an official Bangladesh Open University service.")}</p><p>{tr("নিয়ম: CSE Handbook পৃষ্ঠা ১৯–২১ ও ৩৪–৩৫।", "Rules: CSE Handbook, pages 19–21 and 34–35.")}</p></div></footer>
    </main>
  )
}

function Panel({ step, title, copy, badge, hidden, children }: { step: string; title: string; copy?: string; badge?: string; hidden?: boolean; children: ReactNode }) {
  return <section className={`${hidden ? "hidden" : ""} rounded-2xl border border-[#d8e1dd] bg-white p-4 shadow-[0_12px_40px_rgba(20,50,40,0.05)] sm:p-6`}><div className="mb-5 flex items-start justify-between gap-3"><div><p className="step-kicker">{step}</p><h2 className="section-title">{title}</h2>{copy && <p className="section-copy">{copy}</p>}</div>{badge && <Badge className="bg-[#e6f3ee] text-[#075e45] hover:bg-[#e6f3ee]">{badge}</Badge>}</div>{children}</section>
}

function Field({ label, hint, info, required, children }: { label: string; hint?: string; info?: string; required?: boolean; children: ReactNode }) {
  return <div className="space-y-1.5"><Label className="flex items-center gap-1.5 text-xs font-semibold text-[#334b42]">{label}{required && <span className="text-[#b12d31]">*</span>}{info && <InfoTip text={info} />}</Label>{children}{hint && <p className="text-[11px] text-[#7a8983]">{hint}</p>}</div>
}

function InfoTip({ text }: { text: string }) {
  return <TooltipProvider delayDuration={150}><Tooltip><TooltipTrigger asChild><button type="button" className="rounded-full text-[#789088] outline-none hover:text-[#315c4d] focus-visible:ring-2 focus-visible:ring-[#2b8368]" aria-label={text}><CircleHelp className="size-3.5 cursor-help" /></button></TooltipTrigger><TooltipContent side="top" sideOffset={6} className="max-w-64 bg-[#18382e] text-white">{text}</TooltipContent></Tooltip></TooltipProvider>
}

function MoneyInput({ label, info, value, onChange }: { label: string; info?: string; value: string; onChange: (value: string) => void }) {
  return <Field label={label} info={info}><div className="relative"><span className="absolute left-3 top-2 text-sm text-[#667971]">৳</span><Input type="number" min="0" step="1" className="pl-7" value={value} onChange={(event) => onChange(event.target.value)} placeholder="ফি / Fee" /></div></Field>
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
