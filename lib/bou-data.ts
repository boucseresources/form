export type FormCategory = "registration" | "failed" | "improvement"

export type Course = {
  code: string
  title: string
  credit: number
  semester: string
  prerequisite?: string
}

export const semesterNames: Record<string, string> = {
  "1-1": "1st Year · 1st Semester",
  "1-2": "1st Year · 2nd Semester",
  "2-1": "2nd Year · 1st Semester",
  "2-2": "2nd Year · 2nd Semester",
  "3-1": "3rd Year · 1st Semester",
  "3-2": "3rd Year · 2nd Semester",
  "4-1": "4th Year · 1st Semester",
  "4-2": "4th Year · 2nd Semester",
}

export const courses: Course[] = [
  { code: "ENG1131", title: "Communicative English", credit: 3, semester: "1-1" },
  { code: "PHY1132", title: "Wave, Optics and Thermodynamics", credit: 3, semester: "1-1" },
  { code: "BUS1123", title: "Introduction to Business", credit: 2, semester: "1-1" },
  { code: "MAT1134", title: "Differential and Integral Calculus", credit: 3, semester: "1-1" },
  { code: "EEE1135", title: "Electricity, Magnetism and Electrical Circuit", credit: 3, semester: "1-1" },
  { code: "EEE11P6", title: "Electricity, Magnetism and Electrical Circuit Lab", credit: 0.75, semester: "1-1" },
  { code: "CSE1127", title: "Computer Fundamentals", credit: 2, semester: "1-1" },
  { code: "CSE11P8", title: "Computer Fundamentals Lab", credit: 0.75, semester: "1-1" },

  { code: "MAT1231", title: "Linear Algebra and Differential Equations", credit: 3, semester: "1-2" },
  { code: "HUM1222", title: "Bangladesh Studies", credit: 2, semester: "1-2" },
  { code: "EEE1233", title: "Electronic Device and Circuits", credit: 3, semester: "1-2", prerequisite: "EEE1135" },
  { code: "EEE12P4", title: "Electronic Device and Circuits Lab", credit: 1.5, semester: "1-2", prerequisite: "EEE11P6" },
  { code: "CSE1235", title: "Digital Logic Design", credit: 3, semester: "1-2" },
  { code: "CSE12P6", title: "Digital Logic Design Lab", credit: 1.5, semester: "1-2" },
  { code: "CSE1237", title: "Structured Programming Language", credit: 3, semester: "1-2" },
  { code: "CSE12P8", title: "Structured Programming Language Lab", credit: 1.5, semester: "1-2" },

  { code: "MAT2131", title: "Coordinate Geometry and Vector Analysis", credit: 3, semester: "2-1" },
  { code: "CHE2122", title: "Chemistry", credit: 2, semester: "2-1" },
  { code: "CSE2133", title: "Discrete Mathematics", credit: 3, semester: "2-1" },
  { code: "CSE2134", title: "Computer Architecture and Organizations", credit: 3, semester: "2-1" },
  { code: "CSE2135", title: "Data Structure", credit: 3, semester: "2-1", prerequisite: "CSE1237" },
  { code: "CSE21P6", title: "Data Structure Lab", credit: 1.5, semester: "2-1", prerequisite: "CSE12P8" },
  { code: "CSE2137", title: "Object Oriented Programming", credit: 3, semester: "2-1", prerequisite: "CSE1237" },
  { code: "CSE21P8", title: "Object Oriented Programming-I Lab", credit: 1.5, semester: "2-1", prerequisite: "CSE12P8" },

  { code: "ECO2221", title: "Introduction to Economics", credit: 2, semester: "2-2" },
  { code: "CSE2232", title: "Microprocessors and Microcontrollers", credit: 3, semester: "2-2", prerequisite: "CSE2134" },
  { code: "CSE22P3", title: "Microprocessor and Assembly Language Lab", credit: 0.75, semester: "2-2" },
  { code: "CSE2234", title: "Information System Analysis and Design", credit: 3, semester: "2-2" },
  { code: "CSE22P5", title: "Information System Analysis and Design Lab", credit: 0.75, semester: "2-2" },
  { code: "CSE2236", title: "Computer Algorithms", credit: 3, semester: "2-2", prerequisite: "CSE2135" },
  { code: "CSE22P7", title: "Computer Algorithms Lab", credit: 1.5, semester: "2-2", prerequisite: "CSE21P6" },
  { code: "CSE2238", title: "Database Management System", credit: 3, semester: "2-2" },
  { code: "CSE22P9", title: "Database Management System Lab", credit: 1.5, semester: "2-2" },

  { code: "MAT3131", title: "Statistics and Probability", credit: 3, semester: "3-1" },
  { code: "CSE3122", title: "Theory of Computation", credit: 2, semester: "3-1", prerequisite: "CSE2133" },
  { code: "CSE3133", title: "Data and Telecommunications", credit: 3, semester: "3-1" },
  { code: "CSE3134", title: "Operating System", credit: 3, semester: "3-1" },
  { code: "CSE31P5", title: "Operating System Lab", credit: 1.5, semester: "3-1" },
  { code: "CSE3136", title: "Advanced Database Management System", credit: 3, semester: "3-1", prerequisite: "CSE2238" },
  { code: "CSE31P7", title: "Advanced Database Management System Lab", credit: 1.5, semester: "3-1", prerequisite: "CSE22P9" },
  { code: "CSE31P8", title: "Object Oriented Programming-II Lab", credit: 1.5, semester: "3-1", prerequisite: "CSE2137" },
  { code: "CSE31P9", title: "Numerical Analysis Lab", credit: 1.5, semester: "3-1" },

  { code: "CSE3221", title: "E-commerce", credit: 2, semester: "3-2" },
  { code: "CSE3232", title: "Human-Computer Interaction", credit: 3, semester: "3-2" },
  { code: "CSE3233", title: "Computer Networks", credit: 3, semester: "3-2", prerequisite: "CSE3133" },
  { code: "CSE32P4", title: "Computer Networks Lab", credit: 1.5, semester: "3-2", prerequisite: "CSE3133" },
  { code: "CSE3235", title: "Computer Peripherals and Interfacing", credit: 3, semester: "3-2", prerequisite: "CSE2232" },
  { code: "CSE32P6", title: "Computer Peripherals and Interfacing Lab", credit: 0.75, semester: "3-2", prerequisite: "CSE22P3" },
  { code: "CSE3237", title: "Software Engineering", credit: 3, semester: "3-2", prerequisite: "CSE2137 & CSE2234" },
  { code: "CSE32P8", title: "Software Development Project", credit: 1.5, semester: "3-2", prerequisite: "CSE21P8" },
  { code: "CSE32P9", title: "Technical Writing and Seminar", credit: 1.5, semester: "3-2" },

  { code: "CSE4121", title: "Professional Ethics and Cyber Law", credit: 2, semester: "4-1" },
  { code: "CSE4132", title: "Principles of Distributed Systems", credit: 3, semester: "4-1", prerequisite: "CSE3233" },
  { code: "CSE4133", title: "Artificial Intelligence", credit: 3, semester: "4-1" },
  { code: "CSE41P4", title: "Artificial Intelligence Lab", credit: 0.75, semester: "4-1" },
  { code: "CSE4135", title: "Web Engineering", credit: 3, semester: "4-1" },
  { code: "CSE41P6", title: "Web Engineering Lab", credit: 1.5, semester: "4-1" },
  { code: "CSE4137", title: "Computer Graphics and Multimedia System", credit: 3, semester: "4-1" },
  { code: "CSE41P8", title: "Computer Graphics and Multimedia System Lab", credit: 0.75, semester: "4-1" },

  { code: "CSE4231", title: "Cryptography and Network Security", credit: 3, semester: "4-2", prerequisite: "CSE3233" },
  { code: "CSE4232", title: "Compiler Design", credit: 3, semester: "4-2", prerequisite: "CSE3122" },
  { code: "CSE42P3", title: "Compiler Design Lab", credit: 0.75, semester: "4-2" },
  { code: "CSE4234", title: "Mobile Application Development", credit: 3, semester: "4-2", prerequisite: "CSE3237" },
  { code: "CSE42P5", title: "Mobile Application Development Lab", credit: 1.5, semester: "4-2" },
  { code: "CSE4246", title: "Project", credit: 4, semester: "4-2" },
  { code: "CSE4227", title: "Comprehensive Viva Voce", credit: 2, semester: "4-2" },
]

export const gradePoints: Record<string, number> = {
  "A+": 4,
  A: 3.75,
  "A-": 3.5,
  "B+": 3.25,
  B: 3,
  "B-": 2.75,
  "C+": 2.5,
  C: 2.25,
  D: 2,
  F: 0,
}

export const noticeConfig = {
  deadline: "2026-08-20",
  finalLateDate: "2026-09-03",
  reExamFee: 387,
  improvementMultiplier: 2,
  lateWeekOnePerCoursePerDay: 20,
  lateWeekTwoPerCoursePerDay: 30,
}

export const registrationFees = {
  perCredit: 662,
  examPerCourse: 331,
  semesterRegistration: 500,
  semesterMarksheet: 100,
  digitalId: 200,
  academicCalendar: 50,
  originalCertificate: 500,
  transcript: 400,
  sourceUpdated: "Official B.Sc in CSE program page · checked 27 Aug 2026",
}

export const officialLinks = [
  { label: "BOU CSE প্রোগ্রাম", url: "https://www.bou.ac.bd/SST/BSCSE", note: "অফিসিয়াল ফি ও প্রোগ্রামের তথ্য" },
  { label: "CSE স্টাডি সেন্টার", url: "https://bousst.edu.bd/study-centers/", note: "DRC ও DUET-এর নাম এবং কোড" },
  { label: "পরীক্ষার নোটিশ", url: "https://www.bou.ac.bd/NoticeBoard/Examination", note: "সর্বশেষ পুনঃপরীক্ষা ও ইমপ্রুভমেন্ট নোটিশ" },
  { label: "রেজিস্ট্রেশন নোটিশ", url: "https://www.bou.ac.bd/NoticeBoard/Registration", note: "কোর্স রেজিস্ট্রেশন ও ক্লাস নোটিশ" },
  { label: "অফিসিয়াল ফলাফল", url: "https://result.bou.ac.bd/", note: "ফলাফল খুলে গ্রেড কপি করুন" },
  { label: "CSE Handbook", url: "https://bou.ac.bd/BOU/StudentHandbook", note: "নিয়ম, গ্রেডিং ও সব কোর্স" },
  { label: "পরীক্ষা সেবা", url: "https://exam.bou.ac.bd/", note: "অভিযোগ ও পরীক্ষা-সংক্রান্ত সেবা" },
]

export function eligibilityForGrade(grade: string) {
  const normalized = grade.trim().toUpperCase()
  if (!(normalized in gradePoints)) return { kind: "unknown" as const, label: "Grade needed", detail: "Select or import a valid letter grade." }
  if (normalized === "F") return { kind: "failed" as const, label: "Failed / repeat required", detail: "Handbook p.34: an F grade must be repeated when the course is offered again." }
  if (gradePoints[normalized] <= gradePoints["B-"]) return { kind: "improvement" as const, label: "Improvement eligible", detail: "Handbook pp.34–35: B− or below may be improved once when the course is offered again." }
  return { kind: "not-eligible" as const, label: "Not eligible", detail: "The handbook permits optional improvement only for B− or lower grades." }
}

export type ParsedResultText = {
  grades: Array<{ code: string; grade: string }>
  studentId?: string
  studentName?: string
  session?: string
  studyCenter?: "801" | "020"
}

function cleanCapturedValue(value: string) {
  return value.replace(/^[\s:|=-]+|[\s|]+$/g, "").replace(/\s{2,}/g, " ").trim()
}

export function parseResultText(input: string): ParsedResultText {
  const source = input.replace(/\r/g, "").replace(/[–—−]/g, "-")
  const normalized = source.toUpperCase()
  const positions: Array<{ code: string; index: number }> = []

  for (const course of courses) {
    let from = 0
    while (from < normalized.length) {
      const index = normalized.indexOf(course.code, from)
      if (index === -1) break
      positions.push({ code: course.code, index })
      from = index + course.code.length
    }
  }

  positions.sort((a, b) => a.index - b.index)
  const found = new Map<string, string>()
  positions.forEach((position, index) => {
    const nextIndex = positions[index + 1]?.index ?? Math.min(normalized.length, position.index + 220)
    const segment = normalized.slice(position.index + position.code.length, nextIndex)
    const matches = [...segment.matchAll(/(?:^|\s|[:|,;-])(A\+|A-|A|B\+|B-|B|C\+|C|D|F)(?=\s|$|[|,;])/g)]
    const grade = matches.at(-1)?.[1]
    if (grade && !found.has(position.code)) found.set(position.code, grade)
  })

  const studentIdMatch = source.match(/(?:STUDENT\s*(?:ID|ID\s*NO\.?|ROLL)|LEARNER\s*ID|শিক্ষার্থী\s*আইডি)\s*[:#|=-]*\s*([0-9][0-9A-Z/-]{6,24})/i)
  const studentNameMatch = source.match(/(?:STUDENT\s*NAME|NAME\s*OF\s*(?:THE\s*)?STUDENT|শিক্ষার্থীর\s*নাম)\s*[:#|=-]*\s*([^\n|]{3,90})/i)
  const sessionMatch = source.match(/(?:SESSION|ACADEMIC\s*SESSION|শিক্ষাবর্ষ)\s*[:#|=-]*\s*((?:19|20)\d{2}\s*[-/]\s*(?:(?:19|20)\d{2}|\d{2}))/i)
  const centreLine = source.match(/(?:STUDY\s*CENT(?:ER|RE)|REGIONAL\s*CENT(?:ER|RE)|স্টাডি\s*সেন্টার)\s*[:#|=-]*\s*([^\n|]{2,100})/i)?.[1] || ""
  const centreContext = `${centreLine} ${source.slice(0, 600)}`.toUpperCase()
  const studyCenter = /(?:\b020\b|\bDUET\b|DHAKA UNIVERSITY OF ENGINEERING)/.test(centreContext)
    ? "020"
    : /(?:\b801\b|\bDRC\b|DHAKA REGIONAL CENT)/.test(centreContext)
      ? "801"
      : undefined

  let studentName = studentNameMatch ? cleanCapturedValue(studentNameMatch[1]) : undefined
  if (studentName) studentName = studentName.split(/\s{2,}|\b(?:SESSION|PROGRAM|STUDENT\s*ID|TERM)\b/i)[0].trim()

  return {
    grades: [...found].map(([code, grade]) => ({ code, grade })),
    studentId: studentIdMatch?.[1] ? cleanCapturedValue(studentIdMatch[1]) : undefined,
    studentName: studentName || undefined,
    session: sessionMatch?.[1] ? cleanCapturedValue(sessionMatch[1]).replace(/\s/g, "") : undefined,
    studyCenter,
  }
}
