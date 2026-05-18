import { db } from '@/lib/db'
import type { Petugas } from '@prisma/client'

const SESSION_COOKIE_NAME = 'sipekan_session'

export function createSessionCookie(petugasId: string): string {
  return `${SESSION_COOKIE_NAME}=${petugasId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 8}`
}

export function createLogoutCookie(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
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
