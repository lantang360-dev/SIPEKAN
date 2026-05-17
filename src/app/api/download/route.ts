import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const file = searchParams.get('file') || 'sipekan'

    let filePath: string
    let fileName: string
    let contentType: string

    if (file === 'sipekan') {
      filePath = path.join(process.cwd(), 'download', 'SIPEKAN.zip')
      fileName = 'SIPEKAN.zip'
      contentType = 'application/zip'
    } else if (file === 'panduan') {
      filePath = path.join(process.cwd(), 'public', 'PANDUAN-DEPLOY-SIPEKAN.docx')
      fileName = 'PANDUAN-DEPLOY-SIPEKAN.docx'
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    } else {
      return NextResponse.json(
        { success: false, message: 'File tidak valid' },
        { status: 400 }
      )
    }

    const fileBuffer = await fs.readFile(filePath)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
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
