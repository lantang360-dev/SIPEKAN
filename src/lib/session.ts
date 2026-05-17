import { db } from '@/lib/db'
import type { Petugas } from '@prisma/client'

const SESSION_COOKIE_NAME = 'sipekan_session'
const SESSION_MAX_AGE = 60 * 60 * 8 // 8 hours

export function createSessionCookie(petugasId: string): string {
  const isProduction = process.env.NODE_ENV === 'production'
  const secureFlag = isProduction ? ' Secure;' : ''

  return `${SESSION_COOKIE_NAME}=${petugasId}; HttpOnly; SameSite=Lax;${secureFlag} Path=/; Max-Age=${SESSION_MAX_AGE}`
}

export function createLogoutCookie(): string {
  const isProduction = process.env.NODE_ENV === 'production'
  const secureFlag = isProduction ? ' Secure;' : ''

  return `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax;${secureFlag} Path=/; Max-Age=0`
}

export function getSessionIdFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';').reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = value
      return acc
    },
    {} as Record<string, string>
  )

  return cookies[SESSION_COOKIE_NAME] || null
}

export async function getPetugasFromRequest(
  request: Request
): Promise<(Omit<Petugas, 'password'> & { password?: never }) | null> {
  const sessionId = getSessionIdFromRequest(request)
  if (!sessionId) return null

  const petugas = await db.petugas.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      username: true,
      nama: true,
      nip: true,
      jabatan: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return petugas
}
