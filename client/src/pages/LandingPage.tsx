import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';

export function LandingPage() {
  const { token } = useAuth();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-ink-50 transition-colors dark:bg-ink-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-dot-grid bg-dot-grid opacity-60 dark:bg-dot-grid-dark"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] bg-accent-glow"
      />

      <Header authed={!!token} />

      <main>
        <Hero authed={!!token} />
        <Preview />
        <AiShowcase />
        <Features />
        <TechStack />
        <ClosingCta authed={!!token} />
      </main>

      <Footer />
    </div>
  );
}

function Header({ authed }: { authed: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-white/70 backdrop-blur-md transition-colors dark:border-ink-800/70 dark:bg-ink-950/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-2 text-base font-semibold tracking-tight text-ink-900 dark:text-ink-100">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent-500 to-accent-700 font-mono text-xs text-white shadow-glow">
            JT
          </span>
          JobTrackr
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {authed ? (
            <Link to="/dashboard" className="btn-primary px-3 py-1.5 text-sm">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-ghost text-sm">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary px-3 py-1.5 text-sm">
                Start free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero({ authed }: { authed: boolean }) {
  return (
    <section className="mx-auto max-w-5xl px-6 pb-16 pt-20 text-center sm:pt-28">
      <h1 className="mx-auto max-w-3xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-ink-900 sm:text-6xl md:text-7xl dark:text-ink-50 animate-slide-up">
        Track every application.
        <br />
        <span className="bg-gradient-to-br from-accent-500 to-accent-700 bg-clip-text text-transparent">
          Tailor every pitch.
        </span>
      </h1>

      <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-600 dark:text-ink-400 animate-slide-up">
        A job-search workspace with a real AI coach. Score your fit against any
        JD, draft tailored cover letters, generate likely interview questions,
        and get scored feedback on your answers — all grounded in your resume.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-slide-up">
        {authed ? (
          <Link to="/dashboard" className="btn-primary text-base">
            Open your dashboard →
          </Link>
        ) : (
          <>
            <Link to="/register" className="btn-primary text-base">
              Start free
            </Link>
            <Link to="/login" className="btn-ghost text-base">
              Sign in
            </Link>
          </>
        )}
      </div>

      <div className="mt-6 text-xs text-ink-500 dark:text-ink-500">
        Free · No credit card · Self-hostable · Open source
      </div>
    </section>
  );
}

function AiShowcase() {
  const items = [
    {
      tag: 'Fit analysis',
      title: 'Score your fit before you apply',
      body:
        'Paste any job description and your resume. Gemini returns a 0–100 fit score with specific strengths, gaps, and the keywords missing from your resume.',
      sample: (
        <div className="space-y-3">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              82
            </span>
            <span className="text-xs text-ink-500">fit score / 100</span>
          </div>
          <Bullets dot="bg-emerald-500" items={['5 yrs Postgres ✓', 'EF Core in production ✓', 'AWS deployments ✓']} />
          <Bullets dot="bg-rose-500" items={['No SignalR experience', 'Limited Kubernetes']} />
          <KeywordRow words={['SignalR', 'Kubernetes', 'gRPC', 'Redis Streams']} />
        </div>
      ),
      icon: <SparkIcon />
    },
    {
      tag: 'Cover letter',
      title: 'Tailored drafts in 4 seconds',
      body:
        'One click writes a 250–350 word letter for the role at the company, in your tone of choice. It cites real lines from your resume — no generic filler.',
      sample: (
        <div className="rounded-md bg-ink-50 p-3 text-xs leading-relaxed text-ink-700 dark:bg-ink-950 dark:text-ink-300">
          <p>Dear Stripe team,</p>
          <p className="mt-1.5">
            Your platform-engineering role asks for someone who can scale a
            payment ledger past 50k tps. At Acme, I led the migration that took
            our auth ledger from 8k to 60k tps using…
          </p>
          <p className="mt-1.5 text-ink-400">[continues 280 words]</p>
        </div>
      ),
      icon: <PenIcon />
    },
    {
      tag: 'Interview questions',
      title: 'Predict what they will ask',
      body:
        "Get a curated list of likely interview questions for the JD — categorized as Behavioral, Technical, System Design, or Role-specific, with a difficulty rating and a hint about what each is probing for.",
      sample: (
        <div className="space-y-2">
          <SampleQ cat="Behavioral" diff="Medium" q="Tell me about a time you reduced production incidents." />
          <SampleQ cat="System Design" diff="Hard" q="Design a job-application tracking system used by 1M users." />
          <SampleQ cat="Technical" diff="Medium" q="How would you debug an EF Core query that suddenly slowed by 10×?" />
        </div>
      ),
      icon: <ListIcon />
    },
    {
      tag: 'Answer grading',
      title: 'Practice — and get scored',
      body:
        'Type your answer, get a score with concrete strengths and improvements, and see a model answer for comparison. Same loop every time, until your responses feel sharp.',
      sample: (
        <div className="space-y-3">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold tabular-nums text-violet-600 dark:text-violet-400">
              71
            </span>
            <span className="text-xs text-ink-500">answer score / 100</span>
          </div>
          <Bullets dot="bg-emerald-500" items={['Clear STAR structure', 'Quantified outcome (40% drop in latency)']} />
          <Bullets dot="bg-rose-500" items={['Skipped the "Action" specifics', 'No mention of trade-offs']} />
        </div>
      ),
      icon: <CheckIcon />
    }
  ];

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-12 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-accent-600 dark:text-accent-400">
          Powered by Gemini 2.5
        </p>
        <h2 className="mx-auto max-w-3xl text-balance text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl dark:text-ink-50">
          Four AI workflows. One coherent job-search loop.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base text-ink-600 dark:text-ink-400">
          Each call goes through your own ASP.NET API — your Gemini key stays
          server-side, prompts use Gemini's structured output for reliable JSON,
          and every response is grounded in the resume you provide.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {items.map((it) => (
          <div
            key={it.tag}
            className="card relative overflow-hidden p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-medium text-accent-700 ring-1 ring-inset ring-accent-200 dark:bg-accent-500/10 dark:text-accent-300 dark:ring-accent-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
                {it.tag}
              </span>
              <span className="text-accent-600 dark:text-accent-400">{it.icon}</span>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-ink-900 dark:text-ink-50">{it.title}</h3>
            <p className="mb-5 text-sm leading-relaxed text-ink-600 dark:text-ink-400">{it.body}</p>
            <div className="rounded-lg border border-ink-100 bg-ink-50/40 p-4 dark:border-ink-800 dark:bg-ink-900/40">
              {it.sample}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Bullets({ items, dot }: { items: string[]; dot: string }) {
  return (
    <ul className="space-y-1 text-xs">
      {items.map((it, i) => (
        <li key={i} className="flex gap-1.5">
          <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${dot}`} />
          <span className="text-ink-700 dark:text-ink-300">{it}</span>
        </li>
      ))}
    </ul>
  );
}

function KeywordRow({ words }: { words: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {words.map((w) => (
        <span
          key={w}
          className="rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-medium text-accent-800 ring-1 ring-inset ring-accent-200 dark:bg-accent-500/10 dark:text-accent-200 dark:ring-accent-500/30"
        >
          {w}
        </span>
      ))}
    </div>
  );
}

function SampleQ({ cat, diff, q }: { cat: string; diff: string; q: string }) {
  return (
    <div className="rounded-md border border-ink-100 bg-white p-2.5 text-xs dark:border-ink-800 dark:bg-ink-950">
      <div className="mb-1 flex items-center gap-2 text-[10px]">
        <span className="rounded-full bg-violet-50 px-1.5 py-0.5 font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
          {cat}
        </span>
        <span className="text-amber-600 dark:text-amber-400">{diff}</span>
      </div>
      <p className="text-ink-800 dark:text-ink-200">{q}</p>
    </div>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function PenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 19l7-7 3 3-7 7-3-3z" strokeLinejoin="round" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18M2 2l7.586 7.586" strokeLinejoin="round" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 6h13M8 12h13M8 18h13" strokeLinecap="round" />
      <circle cx="3.5" cy="6" r="1.5" />
      <circle cx="3.5" cy="12" r="1.5" />
      <circle cx="3.5" cy="18" r="1.5" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function Preview() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20">
      <div className="relative">
        <div
          aria-hidden
          className="absolute -inset-x-12 -inset-y-6 -z-10 rounded-[2rem] bg-gradient-to-br from-accent-500/20 via-accent-500/0 to-accent-700/15 blur-3xl"
        />
        <div className="card overflow-hidden p-2 shadow-lift">
          <div className="rounded-lg bg-ink-50 p-6 dark:bg-ink-950">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-accent-600 dark:text-accent-400">
                  Pipeline
                </p>
                <h3 className="mt-0.5 text-xl font-semibold text-ink-900 dark:text-ink-50">
                  Your applications
                </h3>
              </div>
              <span className="btn-primary pointer-events-none px-3 py-1.5 text-xs">
                + New application
              </span>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <KpiPreview label="Applied" value="14" stripe="bg-blue-500" />
              <KpiPreview label="Interviewing" value="5" stripe="bg-violet-500" />
              <KpiPreview label="Offer" value="2" stripe="bg-emerald-500" />
              <KpiPreview label="Rejected" value="3" stripe="bg-rose-500" />
            </div>

            <div className="card overflow-hidden">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-ink-50 text-[10px] uppercase tracking-wide text-ink-500 dark:bg-ink-900/60 dark:text-ink-400 sm:text-xs">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Company</th>
                    <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Position</th>
                    <th className="hidden px-4 py-2.5 font-medium md:table-cell">Salary</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                  <Row co="Stripe" pos="Senior Backend" sal="$180k–$240k" badge="Interviewing" pill="violet" />
                  <Row co="Linear" pos="Platform Engineer" sal="$170k–$220k" badge="Offer" pill="emerald" />
                  <Row co="Notion" pos="API Engineer" sal="$160k–$210k" badge="Applied" pill="blue" />
                  <Row co="Vercel" pos="Eng Manager" sal="$210k–$260k" badge="Screening" pill="amber" />
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function KpiPreview({
  label,
  value,
  stripe
}: {
  label: string;
  value: string;
  stripe: string;
}) {
  return (
    <div className={`card relative overflow-hidden p-3 before:absolute before:inset-y-0 before:left-0 before:w-1 before:${stripe}`}>
      <div className="text-[10px] font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
        {label}
      </div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums text-ink-900 dark:text-ink-50">
        {value}
      </div>
    </div>
  );
}

function Row({
  co,
  pos,
  sal,
  badge,
  pill
}: {
  co: string;
  pos: string;
  sal: string;
  badge: string;
  pill: 'violet' | 'emerald' | 'blue' | 'amber';
}) {
  const styles = {
    violet: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30'
  }[pill];
  return (
    <tr>
      <td className="px-4 py-2.5 font-medium text-ink-900 dark:text-ink-100">{co}</td>
      <td className="hidden px-4 py-2.5 text-ink-600 dark:text-ink-400 sm:table-cell">{pos}</td>
      <td className="hidden px-4 py-2.5 tabular-nums text-ink-600 dark:text-ink-400 md:table-cell">{sal}</td>
      <td className="px-4 py-2.5">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset sm:text-xs ${styles}`}>
          <span className="mr-1 h-1 w-1 rounded-full bg-current opacity-70" />
          {badge}
        </span>
      </td>
    </tr>
  );
}

function Features() {
  const items = [
    {
      title: 'Pipeline tracker',
      body:
        'Every application in one searchable, filterable table. Statuses, salary ranges, notes, dates — and per-user isolation enforced at the API.',
      icon: <PipelineIcon />
    },
    {
      title: 'AI fit analysis',
      body:
        'Paste a job description plus your resume. Gemini returns a fit score (0–100), strengths, gaps, and the keywords you should add to land the interview.',
      icon: <AiIcon />
    },
    {
      title: 'Tailored cover letters',
      body:
        'One click drafts a 250–350 word cover letter grounded in your resume, in the tone you choose. Copy, edit, send.',
      icon: <LetterIcon />
    },
    {
      title: 'Interview prep',
      body:
        'Generate likely interview questions for any JD, type your answers, and get scored AI feedback with a model answer to compare against. Categorized by Behavioral / Technical / System Design.',
      icon: <PrepIcon />
    },
    {
      title: 'Pipeline analytics',
      body:
        'Funnel chart, interview rate, offer rate, weekly velocity. Spot the stage where your applications leak — and fix it.',
      icon: <ChartIcon />
    },
    {
      title: 'Public profile',
      body:
        'Opt-in shareable page at /u/&lt;slug&gt;. Anonymized funnel + counts only — no company names, no notes. Great for accountability or job-hunt updates.',
      icon: <ShareIcon />
    },
    {
      title: 'Resume manager',
      body:
        'Upload PDF / DOC / TXT versions. Stored on a mounted volume, listed per user, downloadable any time.',
      icon: <DocIcon />
    }
  ];

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-12 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-accent-600 dark:text-accent-400">
          What's inside
        </p>
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl dark:text-ink-50">
          Everything you need to run a serious job search.
        </h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <div
            key={it.title}
            className="card group relative overflow-hidden p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
          >
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50 text-accent-600 transition-colors group-hover:bg-accent-100 dark:bg-accent-500/10 dark:text-accent-400 dark:group-hover:bg-accent-500/20">
              {it.icon}
            </div>
            <h3 className="mb-2 text-base font-semibold text-ink-900 dark:text-ink-100">
              {it.title}
            </h3>
            <p
              className="text-sm leading-relaxed text-ink-600 dark:text-ink-400"
              dangerouslySetInnerHTML={{ __html: it.body }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function TechStack() {
  const stack = [
    'ASP.NET Core 9',
    'Entity Framework Core',
    'PostgreSQL',
    'Supabase',
    'JWT + BCrypt',
    'FluentValidation',
    'Serilog',
    'Swagger / OpenAPI',
    'xUnit + Mvc.Testing',
    'React 18',
    'TypeScript',
    'Vite',
    'Tailwind CSS',
    'Gemini 2.5',
    'Docker Compose',
    'GitHub Actions'
  ];

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-accent-600 dark:text-accent-400">
          Built with
        </p>
        <h2 className="text-balance text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl dark:text-ink-50">
          A 2026 production stack — end to end.
        </h2>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {stack.map((s) => (
          <span
            key={s}
            className="rounded-full border border-ink-200 bg-white/60 px-3 py-1 text-xs font-medium text-ink-700 backdrop-blur-sm transition-colors hover:border-accent-300 hover:text-accent-700 dark:border-ink-800 dark:bg-ink-900/60 dark:text-ink-300 dark:hover:border-accent-500/50 dark:hover:text-accent-300"
          >
            {s}
          </span>
        ))}
      </div>
    </section>
  );
}

function ClosingCta({ authed }: { authed: boolean }) {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <div className="card relative overflow-hidden p-12 text-center">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-br from-accent-500/10 via-transparent to-accent-700/10"
        />
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl dark:text-ink-50">
          Take your job search seriously.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-ink-600 dark:text-ink-400">
          Stop re-tailoring resumes from memory. Start with the pipeline, the
          analytics, and the AI coach you should have had from day one.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {authed ? (
            <Link to="/dashboard" className="btn-primary text-base">
              Open dashboard →
            </Link>
          ) : (
            <Link to="/register" className="btn-primary text-base">
              Create your account
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink-200/70 dark:border-ink-800/70">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-ink-500 dark:text-ink-500">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-accent-500 to-accent-700 font-mono text-[9px] text-white">
            JT
          </span>
          <span>JobTrackr — a 2026 portfolio project.</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="hover:text-ink-700 dark:hover:text-ink-300">
            Sign in
          </Link>
          <Link to="/register" className="hover:text-ink-700 dark:hover:text-ink-300">
            Start free
          </Link>
        </div>
      </div>
    </footer>
  );
}

function PipelineIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="3" rx="1" />
      <rect x="3" y="11" width="13" height="3" rx="1" />
      <rect x="3" y="17" width="8" height="3" rx="1" />
    </svg>
  );
}

function AiIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function LetterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" strokeLinecap="round" />
      <path d="M7 14l3-3 3 2 5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.2 11l7.6-3.6M8.2 13l7.6 3.6" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <path d="M14 3v5h5M9 13h6M9 17h6" strokeLinecap="round" />
    </svg>
  );
}

function PrepIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 14a4 4 0 1 1 8 0c0 1.5-1 2.5-2 3.2-.8.6-1 1-1 1.8M12 22h.01" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
