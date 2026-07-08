import { Github, Link as LinkIcon, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PublicPageShell } from "@/components/PublicPageShell";

type Member = {
  description: string;
  github?: string;
  icon?: string;
  name: string;
  role: string;
  x?: string;
  website?: string;
};

// Add members here. Leave github / x / website empty if the member has no public link.
const members: Member[] = [
  {
    description: "Maintains WfJ and organizes development.",
    github: "https://github.com/nae2121",
    icon: "/static/membericon/anpanchanicon.png",
    name: "anpanchan",
    role: "Lead / Operations",
    website: "https://qiita.com/anpanchan",
    x: "https://x.com/anpanchan1818",
  },
  {
    description: "Creates problems and supports contest preparation.",
    github: "",
    icon: "",
    name: "Problem Setter",
    role: "Problem Setter",
    website: "",
    x: "",
  },
];

export default function MembersPage() {
  return (
    <PublicPageShell
      active="members"
      description="Meet the members working on WfJ."
      eyebrow="WfJ Members"
      title="Members"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <article
            className="rounded-md border border-cyan-300/15 bg-[#06131c] p-5 shadow-[0_0_32px_rgba(20,241,216,0.06)]"
            key={member.name}
          >
            <div className="flex flex-col items-center text-center">
              <MemberIcon member={member} />
              <div className="mt-4 min-w-0">
                <h2 className="truncate text-xl font-bold text-white">{member.name}</h2>
                <p className="mt-1 font-mono text-xs text-cyan-300">{member.role}</p>
              </div>
            </div>

            <p className="mt-5 min-h-14 text-center text-sm leading-7 text-zinc-400">
              {member.description}
            </p>

            <div className="mt-5 flex justify-center gap-2 text-zinc-500">
              {member.github ? (
                <MemberLink href={member.github} label={`${member.name} on GitHub`}>
                  <Github className="h-5 w-5" aria-hidden="true" />
                </MemberLink>
              ) : null}
              {member.x ? (
                <MemberLink href={member.x} label={`${member.name} on X`}>
                  <XLogo />
                </MemberLink>
              ) : null}
              {member.website ? (
                <MemberLink href={member.website} label={`${member.name} website`}>
                  <LinkIcon className="h-5 w-5" aria-hidden="true" />
                </MemberLink>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </PublicPageShell>
  );
}

function MemberIcon({ member }: { member: Member }) {
  if (member.icon) {
    return (
      <span className="relative h-32 w-32 shrink-0 overflow-hidden rounded-md border border-cyan-300/25 bg-cyan-300/10 shadow-[0_0_28px_rgba(20,241,216,0.14)]">
        <Image
          alt={`${member.name} icon`}
          className="object-cover"
          fill
          sizes="128px"
          src={member.icon}
        />
      </span>
    );
  }

  return (
    <span className="flex h-32 w-32 shrink-0 items-center justify-center rounded-md border border-cyan-300/25 bg-cyan-300/10 text-cyan-200 shadow-[0_0_28px_rgba(20,241,216,0.14)]">
      {member.name ? (
        <span className="text-5xl font-bold uppercase">{member.name.slice(0, 1)}</span>
      ) : (
        <UserRound className="h-12 w-12" aria-hidden="true" />
      )}
    </span>
  );
}

function MemberLink({
  children,
  href,
  label,
}: {
  children: React.ReactNode;
  href: string;
  label: string;
}) {
  return (
    <Link
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-cyan-300/15 bg-black/20 text-zinc-400 transition hover:border-cyan-300/45 hover:text-cyan-200"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </Link>
  );
}

function XLogo() {
  return (
    <span
      aria-hidden="true"
      className="font-mono text-base font-black leading-none tracking-normal"
    >
      X
    </span>
  );
}
