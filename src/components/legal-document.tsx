import Link from "next/link";

export function LegalDocument({
  title,
  updated,
  intro,
  sections,
  back,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: Array<{ title: string; body: string }>;
  back: string;
}) {
  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-6 py-14 sm:px-10">
      <Link href="/" className="text-sm font-medium text-primary hover:underline">
        ← {back}
      </Link>
      <article className="mt-8 grid gap-8">
        <header className="grid gap-3 border-b border-border pb-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="text-sm text-muted-foreground">{updated}</p>
          <p className="max-w-2xl leading-7 text-muted-foreground">{intro}</p>
        </header>
        {sections.map((section) => (
          <section key={section.title} className="grid gap-2">
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <p className="whitespace-pre-line leading-7 text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </article>
    </main>
  );
}
