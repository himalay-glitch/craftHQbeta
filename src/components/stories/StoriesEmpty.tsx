// Small, concrete examples: they show what a story is and how big one should be.
const EXAMPLES = [
  "Add a “Forgot password?” link to the sign-in page",
  "Show a friendly message when there are no events yet",
  "Let people change their profile photo",
];

/** First use (DESIGN.md §6.7): the Builder, what this place is for, and examples that open New story filled in. */
export function StoriesEmpty({ onExample }: { onExample: (title: string) => void }) {
  return (
    <section
      aria-labelledby="stories-empty-title"
      className="mt-6 flex flex-col items-center rounded-[12px] border border-[var(--card-line)] px-4 py-14 text-center"
    >
      <span className="flex size-24 items-center justify-center overflow-hidden rounded-[24px] bg-bot-builder-bg">
        <img src="/images/bots/builder.webp" width={256} height={256} alt="" className="size-24 object-contain" />
      </span>
      <h2 id="stories-empty-title" className="mt-4 text-[15px] leading-[22px] font-medium text-[var(--tx)]">
        No stories yet
      </h2>
      <p className="mt-1 max-w-90 text-[15px] leading-[22px] text-[var(--tx2)]">
        Write what you want built, the way you’d tell a colleague. The agent reads it and asks about anything that’s unclear.
      </p>
      <p className="mt-6 text-[13px] leading-[18px] text-[var(--tx2)]">Not sure where to start? Try one:</p>
      <ul className="mt-2 mb-0 flex max-w-xl list-none flex-col items-stretch gap-2 p-0 sm:flex-row sm:flex-wrap sm:justify-center">
        {EXAMPLES.map((title) => (
          <li key={title}>
            <button
              type="button"
              onClick={() => onExample(title)}
              className="min-h-8 w-full rounded-full border border-[var(--ctl)] bg-white px-3.5 py-1.5 text-[14px] leading-5 text-[var(--tx)] transition-colors duration-[120ms] hover:border-[var(--ctl-h)] hover:bg-[var(--ctl-bg-h)]"
            >
              {title}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
