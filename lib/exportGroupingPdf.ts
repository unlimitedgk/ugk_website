import { jsPDF } from 'jspdf'
import autoTable, { type RowInput } from 'jspdf-autotable'

export type GroupingPdfRow = {
  rowKey: string
  eventId: string
  eventTitle: string
  keeperName: string
  birthYear: number | null
  locationName: string
  timeRange: string
  group: string
}

const LOGO_PATH = '/images/brand/logo.png'
const LOGO_MAX_WIDTH_MM = 24
const LOGO_MAX_HEIGHT_MM = 14

type LogoAsset = {
  dataUrl: string
  format: 'PNG' | 'JPEG'
  widthMm: number
  heightMm: number
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Logo image failed to load'))
    img.src = dataUrl
  })
}

/** Scale image to fit max box while preserving aspect ratio. */
function scaleLogoDimensions(
  widthPx: number,
  heightPx: number,
  maxWidthMm: number,
  maxHeightMm: number
): { widthMm: number; heightMm: number } {
  if (widthPx <= 0 || heightPx <= 0) {
    return { widthMm: maxWidthMm, heightMm: maxHeightMm }
  }

  const aspect = widthPx / heightPx
  let widthMm = maxWidthMm
  let heightMm = widthMm / aspect

  if (heightMm > maxHeightMm) {
    heightMm = maxHeightMm
    widthMm = heightMm * aspect
  }

  return { widthMm, heightMm }
}

async function loadLogoAsset(): Promise<LogoAsset | null> {
  try {
    const response = await fetch(LOGO_PATH)
    if (!response.ok) return null
    const blob = await response.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
    const format =
      blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'JPEG' : 'PNG'
    const { width, height } = await getImageDimensions(dataUrl)
    const { widthMm, heightMm } = scaleLogoDimensions(
      width,
      height,
      LOGO_MAX_WIDTH_MM,
      LOGO_MAX_HEIGHT_MM
    )
    return { dataUrl, format, widthMm, heightMm }
  } catch {
    return null
  }
}

function buildTableBody(rows: GroupingPdfRow[]): RowInput[] {
  const body: RowInput[] = []
  let lastEventId: string | null = null

  for (const row of rows) {
    if (row.eventId !== lastEventId) {
      body.push([
        {
          content: row.eventTitle,
          colSpan: 5,
          styles: {
            fillColor: [237, 242, 255],
            textColor: [67, 56, 202],
            fontStyle: 'bold',
            fontSize: 9,
          },
        },
      ])
      lastEventId = row.eventId
    }

    body.push([
      row.keeperName,
      row.birthYear !== null ? String(row.birthYear) : '—',
      row.group || '—',
      row.locationName,
      row.timeRange,
    ])
  }

  return body
}

export async function exportGroupingPdf(rows: GroupingPdfRow[]): Promise<void> {
  if (!rows.length) return

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 14
  const headerY = 16

  const logo = await loadLogoAsset()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(30, 41, 59)
  doc.text('Gruppeneinteilung', marginX, headerY)

  if (logo) {
    const logoX = pageWidth - marginX - logo.widthMm
    const logoY = headerY - logo.heightMm + 2
    doc.addImage(logo.dataUrl, logo.format, logoX, logoY, logo.widthMm, logo.heightMm)
  }

  autoTable(doc, {
    startY: headerY + 10,
    head: [['Torwart', 'Geburtsjahr', 'Gruppe', 'Ort', 'Zeit']],
    body: buildTableBody(rows),
    styles: { fontSize: 9, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [100, 116, 139],
      fontStyle: 'bold',
    },
    margin: { left: marginX, right: marginX },
    theme: 'grid',
  })

  const date = new Date().toISOString().slice(0, 10)
  doc.save(`gruppeneinteilung_${date}.pdf`)
}
