import { PageLoader } from './PageLoader'
import { Navbar } from './Navbar'
import { Hero } from './Hero'
import { ProductOverview } from './ProductOverview'
import { HowItWorks } from './HowItWorks'
import { EmployerSection, EmployeeSection } from './UserSections'
import { Security } from './Security'
import { Faq } from './Faq'
import { FinalCta } from './FinalCta'
import { Footer } from './Footer'

interface LandingProps {
  onLaunchApp: () => void
  onHome?: () => void
}

export function NewLandingPage({ onLaunchApp, onHome }: LandingProps) {
  return (
    <>
      <PageLoader />

      <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground zl-landing font-sans">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute left-[10%] top-[20%] h-[500px] w-[500px] rounded-full bg-[#FE9E15]/5 blur-[160px]" />
          <div className="absolute right-[5%] top-[60%] h-[400px] w-[400px] rounded-full bg-[#FE9E15]/3 blur-[140px]" />
        </div>

        <Navbar onLaunchApp={onLaunchApp} onHome={onHome} />

        <main>
          <Hero onLaunchApp={onLaunchApp} />
          <ProductOverview />
          <HowItWorks />
          <EmployerSection onLaunchApp={onLaunchApp} />
          <EmployeeSection onLaunchApp={onLaunchApp} />
          <Security />
          <Faq />
          <FinalCta onLaunchApp={onLaunchApp} />
        </main>

        <Footer onLaunchApp={onLaunchApp} />
      </div>
    </>
  )
}
