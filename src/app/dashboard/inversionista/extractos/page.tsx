import ExtractoClient from './ExtractoClient'

export default function ExtractosPage() {
  return (
    <div className="text-white p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Extractos</h1>
        <p className="text-zinc-500 mt-1">Genera extractos mensuales de tu portafolio</p>
      </header>
      <ExtractoClient />
    </div>
  )
}
