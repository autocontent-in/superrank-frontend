function InsightCard({ children }) {
  return (
    <div className="group rounded-xl border border-slate-300/65 bg-white/3 p-3 shadow-none backdrop-blur-sm transition-[background-color,border-color] duration-200 hover:border-slate-400/80 hover:bg-white/8 sm:p-3.5">
      {children}
    </div>
  )
}

const RING_R = 15.5
const RING_C = 2 * Math.PI * RING_R

const INSIGHT_PANEL_BG = '#ffffff'
const INSIGHT_GRID_STEP = 36
const INSIGHT_GRID_LINE = 'rgba(147, 197, 253, 0.32)'
const insightGridBackground = {
  backgroundImage: `linear-gradient(to right, ${INSIGHT_GRID_LINE} 1px, transparent 1px), linear-gradient(to bottom, ${INSIGHT_GRID_LINE} 1px, transparent 1px)`,
  backgroundSize: `${INSIGHT_GRID_STEP}px ${INSIGHT_GRID_STEP}px`,
}
const INSIGHT_GRID_MASK_OUTER =
  'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0) 52%)'
const INSIGHT_GRID_MASK_INNER =
  'linear-gradient(to left, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 54%, rgba(0,0,0,0.42) 76%, rgba(0,0,0,0.18) 88%, rgba(0,0,0,0) 100%)'

const insightGridMaskStyle = (maskImage) => ({
  WebkitMaskImage: maskImage,
  WebkitMaskRepeat: 'no-repeat',
  WebkitMaskSize: '100% 100%',
  maskImage,
  maskRepeat: 'no-repeat',
  maskSize: '100% 100%',
})

export function AuthInsightPanel() {
  const edgeFade = `linear-gradient(to bottom, ${INSIGHT_PANEL_BG} 0%, ${INSIGHT_PANEL_BG} 30%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0.7) 65%, rgba(255,255,255,0.3) 82%, rgba(255,255,255,0) 100%)`
  const edgeFadeUp = `linear-gradient(to top, ${INSIGHT_PANEL_BG} 0%, ${INSIGHT_PANEL_BG} 30%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0.7) 65%, rgba(255,255,255,0.3) 82%, rgba(255,255,255,0) 100%)`

  return (
    <div
      className="relative m-0.5 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white lg:rounded-xl"
      aria-hidden="true"
    >
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 1 }}>
        <div
          className="absolute inset-0"
          style={{ ...insightGridBackground, ...insightGridMaskStyle(INSIGHT_GRID_MASK_OUTER) }}
        />
        <div
          className="absolute inset-0"
          style={{ ...insightGridBackground, ...insightGridMaskStyle(INSIGHT_GRID_MASK_INNER) }}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20"
        style={{
          height: '24%',
          background: edgeFade,
        }}
      />

      <div className="relative z-10 isolate flex flex-1 items-center overflow-hidden">
        <div className="-mt-16 w-full pr-3 pl-20 sm:-mt-20 sm:pr-2.5 sm:pl-28 md:pr-2 md:pl-32">
          <div className="mx-auto grid max-w-md grid-cols-2 gap-3 sm:gap-4">
            <div className="flex flex-col gap-3 pt-10 sm:gap-4 sm:pt-14">
              <InsightCard>
                <p className="text-[10px] text-slate-400 sm:text-xs">Sales Target</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="relative h-16 w-16 shrink-0">
                    <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r={RING_R} fill="none" className="stroke-slate-200" strokeWidth="3" />
                      <circle
                        cx="18"
                        cy="18"
                        r={RING_R}
                        fill="none"
                        className="stroke-slate-400 transition-[stroke] duration-200 group-hover:stroke-sky-500"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${0.8 * RING_C} ${RING_C}`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-600">80%</span>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-600">3,415 <span className="text-xs font-normal text-slate-400">/ 4,000</span></p>
                    <p className="text-[9px] text-slate-500">Way to go! 20% of your sales target will be achieved.</p>
                  </div>
                </div>
              </InsightCard>
              <InsightCard>
                <p className="text-[10px] text-slate-400 sm:text-xs">Customer Segmentation</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="relative h-16 w-16 shrink-0">
                    <svg viewBox="0 0 36 36" className="h-16 w-16">
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        className="stroke-slate-400 transition-[stroke] duration-200 group-hover:stroke-indigo-500"
                        strokeWidth="7"
                        strokeDasharray="25 63"
                        strokeDashoffset="0"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        className="stroke-slate-400 transition-[stroke] duration-200 group-hover:stroke-sky-500"
                        strokeWidth="7"
                        strokeDasharray="20 68"
                        strokeDashoffset="-25"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        className="stroke-slate-400 transition-[stroke] duration-200 group-hover:stroke-violet-400"
                        strokeWidth="7"
                        strokeDasharray="43 45"
                        strokeDashoffset="-45"
                      />
                    </svg>
                    <span className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[8px] text-slate-400">Total</span>
                      <span className="text-xs font-bold text-slate-600">2,758</span>
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[10px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-400 transition-colors duration-200 group-hover:bg-indigo-500" />
                      Small Business <span className="ml-auto font-medium text-slate-600">1,650</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-400 transition-colors duration-200 group-hover:bg-sky-400" />
                      Enterprise <span className="ml-auto font-medium text-slate-600">350</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-400 transition-colors duration-200 group-hover:bg-violet-400" />
                      Individuals <span className="ml-auto font-medium text-slate-600">458</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-3 w-full rounded-lg border border-slate-300/60 bg-white/3 py-1.5 text-[10px] font-medium text-slate-500 backdrop-blur-sm transition-colors duration-200 hover:bg-white/6 group-hover:border-slate-400/75 group-hover:text-slate-600"
                >
                  More details
                </button>
              </InsightCard>
              <InsightCard>
                <p className="text-[10px] text-slate-400 sm:text-xs">Conversion Rates</p>
                <div className="mt-2 space-y-2.5">
                  <div>
                    <div className="flex justify-between text-[10px]"><span className="text-slate-500">75.3% <span className="text-slate-400">↑ 3,438</span></span><span className="text-slate-400">12,886 Pulse</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200/55">
                      <div className="h-full w-[75.3%] rounded-full bg-slate-400 transition-colors duration-200 group-hover:bg-sky-500" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px]"><span className="text-slate-500">24.7% <span className="text-slate-400">↑ 711</span></span><span className="text-slate-400">1,421 Product Sales</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200/55">
                      <div className="h-full w-[24.7%] rounded-full bg-slate-400 transition-colors duration-200 group-hover:bg-violet-500" />
                    </div>
                  </div>
                </div>
              </InsightCard>
              <InsightCard>
                <p className="text-[10px] text-slate-400 sm:text-xs">Response Time</p>
                <p className="mt-1 text-xl font-bold text-slate-600">1.4s</p>
                <p className="text-[9px] text-slate-400 transition-colors duration-200 group-hover:text-emerald-600">↓ 23% improvement</p>
                <div className="mt-2 flex h-12 items-end gap-0.5">
                  {[82, 70, 65, 58, 52, 45, 40, 35].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-slate-300 transition-colors duration-200 group-hover:bg-teal-500/80"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </InsightCard>
              <InsightCard>
                <p className="text-[10px] text-slate-400 sm:text-xs">NPS Score</p>
                <p className="mt-1 text-2xl font-bold text-slate-600">72</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/55">
                  <div className="h-full w-[72%] rounded-full bg-slate-400 transition-colors duration-200 group-hover:bg-amber-500" />
                </div>
                <p className="mt-1.5 text-[9px] text-slate-500">Great — above industry avg</p>
              </InsightCard>
            </div>
            <div className="flex flex-col gap-3 sm:gap-4">
              <InsightCard>
                <p className="text-[10px] text-slate-400 sm:text-xs">Sales Revenue</p>
                <p className="mt-1 text-xl font-bold text-slate-600">$5,832</p>
                <p className="text-[9px] text-slate-500">Your revenue decreased this month by about $421</p>
                <div className="mt-2 flex h-14 items-end gap-0.5">
                  {[40, 65, 45, 80, 55, 90, 70, 60].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-slate-300 transition-colors duration-200 group-hover:bg-sky-500"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </InsightCard>
              <InsightCard>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-400 sm:text-xs">Closed Won by Type</p>
                  <span className="text-slate-400/80">&rsaquo;</span>
                </div>
                <p className="mt-1 text-xl font-bold text-slate-600">$11,680</p>
                <p className="text-[9px] text-slate-500">
                  this month&apos;s total closed won increased from last month&apos;s around{' '}
                  <span className="text-slate-400 transition-colors duration-200 group-hover:text-emerald-600">+$6,450</span>
                </p>
                <div className="mt-3 flex h-20 items-end gap-0.5">
                  {[35, 50, 42, 68, 55, 72, 48, 85, 60, 78, 52, 88].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-slate-300 transition-colors duration-200 group-hover:bg-amber-500/90"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </InsightCard>
              <InsightCard>
                <p className="text-[10px] text-slate-400 sm:text-xs">Task Completion Rate</p>
                <p className="mt-1 text-2xl font-bold text-slate-600">92%<span className="ml-1.5 text-xs font-normal text-slate-400">↑ 21%</span></p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/55">
                  <div className="h-full w-[92%] rounded-full bg-slate-400 transition-colors duration-200 group-hover:bg-sky-500" />
                </div>
                <div className="mt-2.5 flex -space-x-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-6 w-6 rounded-full border-2 border-white/30 bg-slate-300/80 transition-colors duration-200 group-hover:border-white/70 group-hover:bg-slate-400"
                    />
                  ))}
                </div>
              </InsightCard>
              <InsightCard>
                <p className="text-[10px] text-slate-400 sm:text-xs">Avg Deal Size</p>
                <p className="mt-1 text-xl font-bold text-slate-600">$2,340</p>
                <p className="text-[9px] text-slate-400 transition-colors duration-200 group-hover:text-emerald-600">↑ 8.5% vs last quarter</p>
                <div className="mt-2 flex h-12 items-end gap-0.5">
                  {[50, 62, 55, 74, 68, 80, 72, 86].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-slate-300 transition-colors duration-200 group-hover:bg-indigo-400/80"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </InsightCard>
              <InsightCard>
                <p className="text-[10px] text-slate-400 sm:text-xs">Active Users</p>
                <p className="mt-1 text-xl font-bold text-slate-600">12,847</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/55">
                  <div className="h-full w-[78%] rounded-full bg-slate-400 transition-colors duration-200 group-hover:bg-emerald-500" />
                </div>
                <p className="mt-1.5 text-[9px] text-slate-500">78% of monthly target</p>
              </InsightCard>
            </div>
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20"
        style={{
          height: '24%',
          background: edgeFadeUp,
        }}
      />
    </div>
  )
}
