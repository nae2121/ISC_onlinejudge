import { Sparkles } from "lucide-react";
import { PublicPageShell } from "@/components/PublicPageShell";

type ChangeGroup = {
  items: string[];
  label: string;
};

const changes = [
  {
    date: "2026-07-08",
    groups: [
      {
        label: "Initial Public Pages",
        items: [
          "Added the public homepage with a neon cyber visual style.",
          "Added reusable public header, footer, and page shell components.",
          "Added Members, Terms of Service, Privacy Policy, and Changelog pages.",
        ],
      },
      {
        label: "Homepage",
        items: [
          "Adjusted the homepage layout so the first viewport no longer starts with unnecessary page scrolling.",
          "Removed the large hero logo image, headline copy, judge console mock panel, and extra Problems / Contests / Rankings cards.",
          "Moved the core WfJ message and feature cards into a cleaner first-view layout.",
        ],
      },
      {
        label: "Public Pages",
        items: [
          "Converted public-facing pages to English, including Home, Members, Terms of Service, Privacy Policy, and Changelog.",
          "Set the root document language to English.",
          "Replaced the Terms of Service page with the full Wait for Judge terms in English.",
          "Replaced the Privacy Policy page with the full Wait for Judge privacy policy in English.",
        ],
      },
      {
        label: "Navigation",
        items: [
          "Adjusted the public header so navigation wraps instead of requiring horizontal scrolling on narrower widths.",
          "Added the public header to the Login page.",
          "Removed the large WfJ text mark from the header while keeping the icon and ISC_onlinejudge label.",
          "Removed Terms of Service, Privacy Policy, and Changelog links from the footer.",
        ],
      },
      {
        label: "Authentication",
        items: [
          "Adjusted the Login layout so the form uses the remaining viewport below the header.",
          "Compacted the Register layout so the form fits better within the viewport.",
          "Widened the Register form fields for a more comfortable two-column layout.",
          "Added an invite-only notice explaining that a PIN code is required for registration.",
          "Translated Login and Register interface messages to English.",
        ],
      },
      {
        label: "Members",
        items: [
          "Translated member role placeholders to English.",
          "Reworked Members as a simple static data list with icon, name, role, description, GitHub, X, and website fields.",
          "Updated member social links to use proper GitHub and X icons.",
          "Increased the displayed member icon size and centered member cards around the icon.",
          "Removed the Join WfJ call-to-action section from the Members page.",
        ],
      },
    ],
    title: "Public site foundation and polish",
    version: "v0.1.0",
  },
] satisfies Array<{
  date: string;
  groups: ChangeGroup[];
  title: string;
  version: string;
}>;

export default function ChangelogPage() {
  return (
    <PublicPageShell
      active="changelog"
      description="Release notes for WfJ public pages and online judge features."
      eyebrow="Release Notes"
      title="Changelog"
    >
      <div className="grid gap-4">
        {changes.map((change) => (
          <article
            className="rounded-md border border-cyan-300/15 bg-[#06131c] p-5"
            key={change.version}
          >
            <div className="flex flex-wrap items-center gap-3">
              <Sparkles className="h-5 w-5 text-cyan-300" aria-hidden="true" />
              <h2 className="text-xl font-bold text-white">{change.version}</h2>
              <span className="font-mono text-sm text-zinc-500">{change.date}</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-cyan-100">{change.title}</p>
            <div className="mt-5 grid gap-5">
              {change.groups.map((group) => (
                <section key={group.label}>
                  <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300">
                    {group.label}
                  </h3>
                  <ul className="mt-3 grid gap-2 text-sm leading-7 text-zinc-400">
                    {group.items.map((item) => (
                      <li className="flex gap-2" key={item}>
                        <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </article>
        ))}
      </div>
    </PublicPageShell>
  );
}
