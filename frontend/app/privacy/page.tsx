import { PublicPageShell } from "@/components/PublicPageShell";

type PolicySection = {
  body?: string[];
  groups?: Array<{
    items: string[];
    title: string;
  }>;
  items?: string[];
  note?: string[];
  title: string;
};

const sections: PolicySection[] = [
  {
    title: "Article 1. Information We Collect",
    body: ["The Operations Team may collect the following information in order to provide the Service."],
    groups: [
      {
        title: "Information entered during account registration",
        items: [
          "Username",
          "Display name",
          "Email address",
          "Information related to passwords",
          "Affiliation, school year, cohort, or other information deemed necessary by the Operations Team",
        ],
      },
      {
        title: "Information generated through use of the Service",
        items: [
          "Submitted source code",
          "Submission date and time",
          "Judging results",
          "Execution time and memory usage",
          "Programming language used",
          "Contest participation history",
          "Rankings, scores, correctness information",
          "Problem viewing and submission history",
        ],
      },
      {
        title: "Technical information",
        items: [
          "IP address",
          "Browser, operating system, and device information",
          "Access date and time",
          "Access logs",
          "Error logs",
          "Cookies and session information",
          "Logs necessary to prevent unauthorized use and maintain security",
        ],
      },
      {
        title: "Information collected when users contact us",
        items: [
          "Name or display name",
          "Email address",
          "Inquiry details",
          "Information necessary for identity verification",
        ],
      },
    ],
  },
  {
    title: "Article 2. Purposes of Use",
    body: ["The Operations Team uses collected information for the following purposes."],
    items: [
      "To provide, operate, and maintain the Service.",
      "To register accounts, verify identity, authenticate logins, and manage users.",
      "To execute submitted code, judge submissions, and display results.",
      "To display submission history, rankings, and contest results.",
      "To operate contests, confirm fairness, and investigate misconduct.",
      "To improve the Service, add features, and fix defects.",
      "To analyze usage and create statistical information.",
      "To handle server load, incidents, and security measures.",
      "To respond to unauthorized access, attacks, nuisance behavior, and violations of terms.",
      "To respond to inquiries from users.",
      "To notify users of important announcements, maintenance information, and changes to terms.",
      "To respond to requests from laws, regulations, or public authorities.",
    ],
  },
  {
    title: "Article 3. Handling of Submitted Code and Judging Information",
    items: [
      "Source code, judging results, submission history, and related information submitted by users are stored in order to provide Service features.",
      "The Operations Team may review submitted code for judging, rejudging, defect investigation, misconduct investigation, and Service improvement.",
      "In contest and ranking features, usernames, display names, scores, rankings, submission results, and related information may be displayed to other users.",
      "The Operations Team may use statistical information processed so that individuals cannot be identified for Service improvement and activity reporting.",
    ],
  },
  {
    title: "Article 4. Use of Cookies and Similar Technologies",
    items: [
      "The Service may use cookies or similar technologies to maintain login status, manage sessions, improve security, and enhance convenience.",
      "Users may disable cookies through browser settings. However, if cookies are disabled, some Service features may not be available.",
      "If analytics tools or similar services are introduced, the information collected, purposes of use, and recipients will be disclosed in this Policy or on the Service.",
    ],
  },
  {
    title: "Article 5. Provision to Third Parties",
    body: [
      "The Operations Team does not provide personal information to third parties without the user's consent, except in the following cases.",
    ],
    items: [
      "When required by law.",
      "When necessary to protect a person's life, body, or property.",
      "When requested by a public authority, school, or equivalent organization based on law or a legitimate reason.",
      "When the Operations Team determines that a user has violated the Terms and may seriously affect the safety, fairness, or operation of the Service.",
      "When information is provided to contractors within the scope necessary to operate the Service.",
    ],
  },
  {
    title: "Article 6. Use of External Services and Contractors",
    items: [
      "The Operations Team may use external services for servers, databases, email delivery, domain management, security measures, analytics, and related operations.",
      "When external services or contractors handle information, the Operations Team limits the information provided to the necessary scope and strives to ensure appropriate management.",
      "Some Service features may become unavailable due to specification changes, failures, suspension, or other issues with external services.",
    ],
  },
  {
    title: "Article 7. Security Measures",
    body: [
      "The Operations Team takes necessary and appropriate security measures to prevent leakage, loss, damage, unauthorized access, and unauthorized use of collected information.",
      "Primary measures include the following.",
    ],
    items: [
      "Protecting passwords through hashing and similar methods.",
      "Managing access permissions.",
      "Appropriately limiting administrator privileges.",
      "Encrypting communications.",
      "Collecting and monitoring logs.",
      "Taking measures against unauthorized access.",
      "Responding to vulnerabilities and updating systems.",
      "Separating or restricting databases, servers, and judging environments.",
      "Creating backups as necessary.",
    ],
    note: [
      "However, due to the nature of internet communications and systems, the Operations Team does not guarantee complete security.",
    ],
  },
  {
    title: "Article 8. Retention Period",
    items: [
      "The Operations Team stores collected information for the period necessary to provide the Service.",
      "Even after account deletion, information may be retained for a certain period for misconduct investigations, incident response, preservation of contest results, legal compliance, and backup management.",
      "Information that is no longer necessary will be deleted or anonymized within a reasonable scope.",
    ],
  },
  {
    title: "Article 9. User Requests for Confirmation, Correction, Deletion, and Suspension of Use",
    body: [
      "Users may request confirmation, correction, deletion, suspension of use, or similar handling of their own personal information.",
      "After verifying the user's identity, the Operations Team will respond within a reasonable period to the extent required by law and necessary for operating the Service.",
      "However, the Operations Team may be unable to fulfill all or part of a request in the following cases.",
    ],
    items: [
      "Identity verification cannot be completed.",
      "The request would affect contest results, fairness, or misconduct investigations.",
      "Retention is required by law or necessary for operations.",
      "The request may harm the rights or interests of other users or third parties.",
      "The information is included in backup data or similar records that are technically difficult to delete.",
    ],
  },
  {
    title: "Article 10. Use by Minors",
    body: [
      "Minor users shall use the Service with consent from a parent, guardian, or school-related person as necessary.",
      "If the Operations Team determines that action is necessary regarding use by a minor, it may restrict account use, verify information, or confirm matters with a parent, guardian, or school-related person.",
    ],
  },
  {
    title: "Article 11. Public Information",
    body: ["The following information may be disclosed to other users or on the internet through the Service."],
    items: [
      "Username or display name.",
      "Profile information.",
      "Rankings, scores, and placements.",
      "Contest participation results.",
      "Submission status for problems.",
      "Information designated by the Operations Team as public.",
    ],
    note: [
      "Users should avoid including addresses, phone numbers, personal email addresses, or other information unsuitable for public disclosure in information that may become public.",
    ],
  },
  {
    title: "Article 12. Use of Non-Identifiable Information",
    body: [
      "The Operations Team may use statistical information, usage status, submission trends, judging status, and similar information processed so that individual users cannot be identified for the following purposes.",
    ],
    items: [
      "Improving the Service.",
      "Improving server load handling and judging environments.",
      "Adjusting problem difficulty.",
      "Activity reporting.",
      "Learning support.",
      "Research, presentations, and document creation.",
    ],
    note: ["In such cases, the Operations Team will take care so that specific individuals are not identified."],
  },
  {
    title: "Article 13. Changes to This Privacy Policy",
    items: [
      "The Operations Team may change this Policy as necessary.",
      "When this Policy is changed, the Operations Team will notify users by posting on the Service or by another appropriate method.",
      "If a user continues to use the Service after this Policy is changed, the user shall be deemed to have agreed to the revised Policy.",
    ],
  },
  {
    title: "Article 14. Contact",
    body: [
      "Inquiries regarding this Policy and requests for confirmation, correction, deletion, or similar handling of personal information shall be made using the method specified by the Operations Team.",
      "Contact: Wait for Judge Operations Team",
      "X: anpanchan1818",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <PublicPageShell
      active="privacy"
      description="This Privacy Policy explains how Wait for Judge / WfJ handles user information."
      eyebrow="Privacy Policy"
      title="Privacy Policy"
    >
      <article className="rounded-md border border-cyan-300/15 bg-[#06131c] p-6 shadow-[0_0_32px_rgba(20,241,216,0.06)] sm:p-8">
        <div className="space-y-4 border-b border-cyan-300/15 pb-8 text-sm leading-8 text-zinc-300">
          <p>
            The Wait for Judge Operations Team establishes this Privacy Policy for the handling of
            user information in the online judge service "Wait for Judge / WfJ" provided by the
            Operations Team.
          </p>
        </div>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-bold text-white">{section.title}</h2>
              <div className="mt-3 space-y-4 text-sm leading-8 text-zinc-300">
                {section.body?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.groups?.map((group) => (
                  <div key={group.title}>
                    <h3 className="font-semibold text-cyan-200">{group.title}</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {group.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                {section.items ? (
                  <ol className="list-decimal space-y-2 pl-5">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                ) : null}
                {section.note?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 border-t border-cyan-300/15 pt-6 text-sm leading-8 text-zinc-300">
          <p>Established: July 8, 2026</p>
        </div>
      </article>
    </PublicPageShell>
  );
}
