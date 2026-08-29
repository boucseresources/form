import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

export type DownloadableForm = {
  fileName: string
  formTitle: string
  courseSectionLabel: string
  studentId: string
  studentName: string
  yearAndSemester: string
  studyCentre: string
  session: string
  term: string
  courses: Array<{ code: string; title: string; credit: number; grade?: string }>
  totalCredits: number
  showGrade: boolean
  feeTitle: string
  feeRows: Array<{ label: string; amount: number }>
  total: number
}

const money = (value: number) => new Intl.NumberFormat("en-BD", { maximumFractionDigits: 2 }).format(value)

async function fileAsBase64(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not load ${url}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  let binary = ""
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192))
  }
  return window.btoa(binary)
}

async function imageAsDataUrl(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not load ${url}`)
  const blob = await response.blob()
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function downloadFormPdf(form: DownloadableForm) {
  const [regularFont, boldFont, logo] = await Promise.all([
    fileAsBase64("/fonts/libre-baskerville-regular.ttf"),
    fileAsBase64("/fonts/libre-baskerville-bold.ttf"),
    imageAsDataUrl("/bou-logo.png"),
  ])

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })
  doc.addFileToVFS("Baskerville-Regular.ttf", regularFont)
  doc.addFont("Baskerville-Regular.ttf", "Baskerville", "normal")
  doc.addFileToVFS("Baskerville-Bold.ttf", boldFont)
  doc.addFont("Baskerville-Bold.ttf", "Baskerville", "bold")
  doc.setFont("Baskerville", "normal")
  doc.setTextColor(18, 18, 18)

  const pageWidth = doc.internal.pageSize.getWidth()
  const left = 14
  const right = pageWidth - 14
  const center = pageWidth / 2

  doc.addImage(logo, "PNG", 55, 8, 12, 11)
  doc.setFontSize(16)
  doc.text("Bangladesh Open University", 71, 12.5)
  doc.setFontSize(8.5)
  doc.text("School of Science and Technology", 71, 16.1)
  doc.text("Board Bazar, Gazipur-1705, Bangladesh", 71, 19.2)

  doc.setFontSize(12)
  doc.text(form.formTitle, center, 26, { align: "center" })
  doc.setFontSize(8.5)
  doc.text("(Bank receipt must be enclosed with the Form)", center, 30.5, { align: "center" })
  doc.setFontSize(8.2)
  doc.text("Janata Bank Ltd., BOU Campus Branch", center, 34.5, { align: "center" })
  doc.text("Online A/C: SND 09030320000411", center, 38, { align: "center" })
  doc.line(70.2, 35, 139.8, 35)
  doc.line(72.5, 38.5, 137.5, 38.5)

  const lineField = (label: string, value: string, y: number, labelX = left, valueX = 55, endX = right) => {
    doc.setFontSize(9)
    doc.text(label, labelX, y)
    doc.text(":", valueX - 4, y)
    doc.text(value || " ", valueX, y)
    doc.setLineWidth(0.2)
    doc.line(valueX, y + 0.8, endX, y + 0.8)
  }

  lineField("Student ID", form.studentId, 44)
  lineField("Student Name", form.studentName, 49.5)
  lineField("Year & Semester", form.yearAndSemester, 55)
  lineField("Study Centre", form.studyCentre, 60.5)
  lineField("Session", form.session, 66, left, 47, 101)
  lineField("Term", form.term, 66, 112, 130, right)

  doc.setFontSize(9.5)
  doc.text(form.courseSectionLabel, left, 72)

  const courseHead = form.showGrade
    ? [["SL. N", "Code", "Title", "Credit", "Grade"]]
    : [["SL. N", "Code", "Title", "Credit"]]
  const courseBody = form.courses.map((course, index) => {
    const base: Array<string | number> = [String(index + 1).padStart(2, "0"), course.code, course.title, course.credit]
    if (form.showGrade) base.push(course.grade || "-")
    return base
  })

  autoTable(doc, {
    startY: 74,
    head: courseHead,
    body: courseBody,
    margin: { left, right: 14 },
    theme: "grid",
    styles: { font: "Baskerville", fontSize: 7.7, textColor: [18, 18, 18], lineColor: [35, 35, 35], lineWidth: 0.2, cellPadding: 1.6, valign: "middle" },
    headStyles: { fillColor: [229, 229, 229], fontStyle: "normal", halign: "center" },
    alternateRowStyles: { fillColor: [242, 242, 242] },
    columnStyles: {
      0: { cellWidth: 14, halign: "center" },
      1: { cellWidth: 27, fontStyle: "bold" },
      2: { cellWidth: "auto" },
      3: { cellWidth: 18, halign: "center" },
      ...(form.showGrade ? { 4: { cellWidth: 17, halign: "center" } } : {}),
    },
  })

  let currentY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 76) + 5
  doc.setFontSize(9)
  doc.text("Total Number of Course", left, currentY)
  doc.text(":", 62, currentY)
  doc.text(String(form.courses.length), 67, currentY)
  currentY += 4.5
  doc.text("Total Credit", left, currentY)
  doc.text(":", 62, currentY)
  doc.text(String(form.totalCredits), 67, currentY)

  autoTable(doc, {
    startY: currentY + 4,
    head: [[form.feeTitle, "Amount"]],
    body: form.feeRows.map((row) => [row.label, `BDT ${money(row.amount)}/-`]),
    foot: [["Total", `BDT ${money(form.total)}/-`]],
    margin: { left, right: 14 },
    theme: "grid",
    styles: { font: "Baskerville", fontSize: 7.8, textColor: [18, 18, 18], lineColor: [35, 35, 35], lineWidth: 0.2, cellPadding: 1.6, valign: "middle" },
    headStyles: { fillColor: [229, 229, 229], fontStyle: "normal", halign: "center" },
    alternateRowStyles: { fillColor: [242, 242, 242] },
    footStyles: { fillColor: [255, 255, 255], textColor: [18, 18, 18], fontStyle: "bold", lineWidth: 0.35 },
    columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 34, halign: "right" } },
    didParseCell: (data) => {
      if (data.section === "foot" && data.column.index === 0) data.cell.styles.halign = "right"
    },
  })

  currentY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || currentY + 10) + 22
  if (currentY > 280) {
    doc.addPage()
    currentY = 35
  }
  doc.setLineWidth(0.3)
  doc.line(left, currentY, 78, currentY)
  doc.line(132, currentY, right, currentY)
  doc.setFontSize(8)
  doc.text("Signature of the Program Officer", 46, currentY + 4, { align: "center" })
  doc.text("Signature of the Program Coordinator", 160, currentY + 4, { align: "center" })

  doc.save(form.fileName)
}
