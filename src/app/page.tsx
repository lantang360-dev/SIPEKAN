export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function Home() {
  return (
    <iframe
      src="/index.html"
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
        margin: 0,
        padding: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
      }}
      title="SIPEKAN"
      allow="autoplay"
    />
  )
}
