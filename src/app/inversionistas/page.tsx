import Link from 'next/link'
import Image from 'next/image'
import Script from 'next/script'
import SignupForm from './SignupForm'
import InvestmentCalculator from './InvestmentCalculator'

export default function InversionistasPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white antialiased">
      {/* Meta Pixel Code */}
      <Script id="meta-pixel-inversionistas" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '1694622068553831');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img height="1" width="1" style={{display:'none'}}
          src="https://www.facebook.com/tr?id=1694622068553831&ev=PageView&noscript=1"
          alt=""
        />
      </noscript>
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="h-12 w-auto relative">
              <Image
                src="/images/AluriLogoBlackBG.png"
                alt="Aluri Logo"
                width={120}
                height={48}
                className="h-full w-auto object-contain"
                priority
              />
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link className="text-sm font-medium text-slate-400 hover:text-primary transition-colors" href="/">Inicio</Link>
            <Link className="text-sm font-medium text-white hover:text-primary transition-colors" href="/inversionistas">Inversionistas</Link>
            <Link className="text-sm font-medium text-slate-400 hover:text-primary transition-colors" href="/propietarios">Propietarios</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="flex items-center justify-center px-6 h-10 bg-primary hover:bg-primary-dark transition-all text-slate-900 text-sm font-bold rounded-full shadow-sm shadow-primary/30">
              Ingresar
            </Link>
          </div>
        </div>
      </header>

      <main className="relative w-full overflow-hidden pt-20">
        {/* Hero Section */}
        <section className="relative w-full min-h-[70vh] flex items-center">
          <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] -z-10 translate-x-1/2" />
          <div className="max-w-7xl mx-auto px-6 py-20">
            <div className="max-w-4xl">
              <div className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-6">
                Para Inversionistas
              </div>
              <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-6">
                Invierte en deuda con <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-400">respaldo real.</span>
              </h1>
              <p className="text-xl text-slate-300 max-w-3xl mb-8 leading-relaxed">
                Diversifica tu portafolio con inversiones respaldadas por garantias inmobiliarias. Rentabilidades superiores al mercado tradicional con seguridad y transparencia.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="#registro" className="flex items-center justify-center px-8 h-12 bg-primary hover:bg-primary-dark text-slate-900 text-base font-bold rounded-full shadow-lg shadow-primary/20 transition-all hover:translate-y-[-2px]">
                  Crear Cuenta
                </a>
                <a href="#calculadora" className="flex items-center justify-center px-8 h-12 bg-slate-800 border border-slate-700 hover:border-primary text-white text-base font-bold rounded-full transition-all hover:bg-slate-700">
                  Calcular Rentabilidad
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-slate-800/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-4 gap-8">
              <div className="text-center">
                <p className="text-4xl font-black text-primary mb-2">+20%</p>
                <p className="text-sm text-slate-400">Rentabilidad E.A. Promedio</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-black text-primary mb-2">$40M</p>
                <p className="text-sm text-slate-400">Inversion Minima COP</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-black text-primary mb-2">+$5000M</p>
                <p className="text-sm text-slate-400">Colocacion</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-black text-primary mb-2">+5000</p>
                <p className="text-sm text-slate-400">Cantidad de Solicitudes</p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Por que invertir con aluri?</h2>
              <p className="text-slate-400 text-lg">Seguridad, rentabilidad y transparencia en cada inversion.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700">
                <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center mb-6 text-primary">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Garantia Inmobiliaria</h3>
                <p className="text-slate-400 leading-relaxed">
                  Cada inversion esta respaldada por una hipoteca sobre un inmueble real evaluado por peritos certificados.
                </p>
              </div>
              <div className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700">
                <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center mb-6 text-primary">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Rentabilidad Superior</h3>
                <p className="text-slate-400 leading-relaxed">
                  Obten rendimientos muy por encima de los CDT tradicionales y cuentas de ahorro del mercado.
                </p>
              </div>
              <div className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700">
                <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center mb-6 text-primary">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Plataforma Digital</h3>
                <p className="text-slate-400 leading-relaxed">
                  Gestiona tu portafolio desde cualquier lugar. Seguimiento en tiempo real de tus inversiones.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-24 bg-slate-900/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Como funciona</h2>
              <p className="text-slate-400 text-lg">Tres simples pasos para empezar a invertir.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-2xl font-black text-slate-900 mb-6">1</div>
                <h3 className="text-xl font-bold mb-3">Registrate</h3>
                <p className="text-slate-400">Crea tu cuenta y completa tu perfil de inversionista en minutos.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-2xl font-black text-slate-900 mb-6">2</div>
                <h3 className="text-xl font-bold mb-3">Elige tu Inversion</h3>
                <p className="text-slate-400">Explora las oportunidades disponibles y selecciona segun tu perfil de riesgo.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-2xl font-black text-slate-900 mb-6">3</div>
                <h3 className="text-xl font-bold mb-3">Recibe Retornos</h3>
                <p className="text-slate-400">Obten pagos mensuales directamente en tu cuenta bancaria.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Calculator Section */}
        <section id="calculadora" className="py-24 bg-slate-800/50">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">Simulador de Inversion</h2>
              <p className="text-slate-300 text-lg">Calcula tus ganancias y rentabilidad estimada.</p>
            </div>
            <InvestmentCalculator />
          </div>
        </section>

        {/* Signup Form Section */}
        <section id="registro" className="py-24">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Invierte con Aluri</h2>
              <p className="text-slate-400 text-lg">Completa el formulario para comenzar a invertir.</p>
            </div>
            <SignupForm />
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto bg-gradient-to-r from-teal-600 to-primary rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
            <div className="relative z-10 flex flex-col items-center gap-8">
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                Empieza a invertir hoy.
              </h2>
              <p className="text-white/90 text-lg max-w-2xl">
                Unete a miles de inversionistas que estan diversificando su portafolio con nosotros.
              </p>
              <a href="#registro" className="flex items-center justify-center px-10 h-14 bg-white hover:bg-slate-50 text-slate-900 text-lg font-bold rounded-full shadow-lg transition-all hover:scale-105">
                Crear Cuenta de Inversionista
              </a>
              <p className="text-white/70 text-sm mt-2">Sin comisiones de apertura - Retira cuando quieras</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-white">
                <div className="h-9 w-auto relative">
                  <Image src="/images/AluriLogoBlackBG.png" alt="Aluri Logo" width={100} height={36} className="h-full w-auto object-contain" />
                </div>
              </div>
              <p className="text-sm leading-relaxed text-slate-400">
                Somos una plataforma tecnologica que conecta inversionistas con solicitudes de liquidez con garantia hipotecaria. No captamos dinero del publico.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Productos</h4>
              <ul className="space-y-4 text-sm">
                <li><Link className="hover:text-primary transition-colors" href="/propietarios">Credito de Liquidez</Link></li>
                <li><Link className="hover:text-primary transition-colors" href="/inversionistas">Inversion Inmobiliaria</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Legal</h4>
              <ul className="space-y-4 text-sm">
                <li><Link className="hover:text-primary transition-colors" href="/terminos-condiciones">Terminos y Condiciones</Link></li>
                <li><Link className="hover:text-primary transition-colors" href="/politica-privacidad">Politica de Privacidad</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
            <p>2025 aluri. Todos los derechos reservados.</p>
            <div className="flex items-center gap-2 opacity-60">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Transacciones seguras y encriptadas</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
