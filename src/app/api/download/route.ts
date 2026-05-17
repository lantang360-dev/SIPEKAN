import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'PANDUAN-DEPLOY-SIPEKAN.docx')
    const fileBuffer = await fs.readFile(filePath)
    const fileName = 'PANDUAN-DEPLOY-SIPEKAN.docx'

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { success: false, message: 'File tidak ditemukan' },
      { status: 404 }
    )
  }
}
