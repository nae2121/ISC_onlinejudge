import { PublicPageShell } from "@/components/PublicPageShell";

const sections: Array<{
  body?: string[];
  items?: string[];
  title: string;
}> = [
  {
    title: "Article 1. Purpose of the Service",
    body: [
      "The Service is an online judge service designed to support competitive programming, programming education, contest operations, campus club activities, and related learning activities.",
      "Users may use the features provided by the Service, including submitting solutions to problems, checking judging results, managing submission history, and participating in contests.",
    ],
  },
  {
    title: "Article 2. Account Registration",
    items: [
      "Users shall register an account using the method specified by the Operations Team in order to use the Service.",
      "Users shall provide accurate registration information.",
      "The Operations Team may refuse to approve account registration if the registration information is incomplete or if the Operations Team determines that approval is inappropriate for operational reasons.",
      "Users shall properly manage their own account information and shall not allow third parties to use their accounts.",
      "The Operations Team shall not be liable for damages arising from unauthorized account use, except in cases of intentional misconduct or gross negligence by the Operations Team.",
    ],
  },
  {
    title: "Article 3. User Responsibilities",
    items: [
      "Users are responsible for all actions they take on the Service.",
      "Users shall ensure that source code, input data, comments, profile information, and other content they submit do not infringe the rights of any third party.",
      "Users shall use the Service only for learning, practice, contest participation, and other purposes approved by the Operations Team.",
    ],
  },
  {
    title: "Article 4. Prohibited Conduct",
    body: ["Users shall not engage in any of the following acts when using the Service."],
    items: [
      "Acts that violate laws, regulations, or public order and morals.",
      "Acts that cause inconvenience, disadvantage, or damage to other users, the Operations Team, or third parties.",
      "Using another person's account or impersonating another person.",
      "Unauthorized access, vulnerability probing, attacks, excessive requests, denial-of-service attacks, or any other act that interferes with the operation of the Service.",
      "Attempting unauthorized operations against judging environments, servers, databases, APIs, or related systems.",
      "Cheating during contests, sharing answers, submitting under another identity, manipulating rankings, or any other act that undermines fairness.",
      "Submitting malicious code, malware, destructive processes, or code intended to attack external services.",
      "Using the system in a way that is not intended by the specifications of the Service.",
      "Infringing copyrights, trademarks, privacy rights, or other rights of third parties.",
      "Any other act that the Operations Team determines to be inappropriate.",
    ],
  },
  {
    title: "Article 5. Submitted Code and Content",
    items: [
      "Rights to source code, solutions, comments, profile information, and other content submitted by users to the Service generally remain with the users.",
      "Users grant the Operations Team permission to use submitted content to the extent necessary for providing the Service, judging, displaying, storing, analyzing, improving the Service, operating contests, and investigating misconduct.",
      "The Operations Team may display portions of user submission information as explanations, rankings, submission history, statistical information, or similar features.",
      "The Operations Team may make inappropriate content private, delete it, or modify it when deemed necessary for operational reasons.",
    ],
  },
  {
    title: "Article 6. Rights to Problems and Educational Materials",
    items: [
      "Rights to problem statements, test cases, explanations, images, designs, logos, systems, and other materials provided on the Service belong to the Operations Team or third parties with valid rights.",
      "Users shall not reproduce, copy, redistribute, or otherwise use problem statements, test cases, explanations, or similar materials from the Service without permission from the Operations Team.",
      "This restriction does not apply to uses expressly permitted by the Operations Team.",
    ],
  },
  {
    title: "Article 7. Contest Fairness",
    items: [
      "Users shall follow the rules set by the Operations Team when participating in contests.",
      "During contests, users shall not use another person's solution, share answers, use multiple accounts, or engage in any other act that undermines fairness.",
      "If misconduct is suspected, the Operations Team may review submission history, access logs, execution results, and other necessary information.",
      "If misconduct is confirmed, the Operations Team may invalidate rankings, invalidate submissions, suspend accounts, or take other necessary measures.",
    ],
  },
  {
    title: "Article 8. Judging Environment",
    items: [
      "The Service executes submitted code in an isolated execution environment for judging.",
      "Judging results, execution time, memory usage, and related metrics may vary depending on the environment and system conditions.",
      "The Operations Team does not guarantee the accuracy of judging results or continuous operation of the judging system.",
      "Submissions intended to attack the judging environment, bypass restrictions, or obtain system information are prohibited.",
    ],
  },
  {
    title: "Article 9. Changes, Suspension, and Termination of the Service",
    items: [
      "The Operations Team may change, add to, suspend, or terminate all or part of the Service as necessary.",
      "The Operations Team may suspend all or part of the Service without prior notice for maintenance, incident response, security measures, system updates, or other necessary reasons.",
      "The Operations Team shall not be liable for damages incurred by users due to changes, suspension, or termination of the Service, except in cases of intentional misconduct or gross negligence by the Operations Team.",
    ],
  },
  {
    title: "Article 10. Account Suspension and Deletion",
    body: [
      "If the Operations Team determines that a user falls under any of the following categories, the Operations Team may suspend the account, delete submissions, invalidate contest results, or take other necessary measures without prior notice.",
    ],
    items: [
      "The user violates these Terms.",
      "Unauthorized use, attacks, or nuisance behavior are confirmed.",
      "Registration information is false or incomplete.",
      "The account has been inactive for an extended period.",
      "The Operations Team otherwise determines that action is necessary for operating the Service.",
    ],
  },
  {
    title: "Article 11. Disclaimers",
    items: [
      "The Service is provided as is, and the Operations Team does not guarantee completeness, accuracy, usefulness, continuity, or safety of the Service.",
      "The Operations Team shall not be liable for damages arising from use of the Service, except in cases of intentional misconduct or gross negligence by the Operations Team.",
      "The Operations Team shall not be responsible for disputes between users or between users and third parties.",
      "Users shall manage their own submitted code, learning data, account information, and related materials at their own responsibility as necessary.",
    ],
  },
  {
    title: "Article 12. Personal Information and Logs",
    items: [
      "The Operations Team may collect and store user information, submission history, access logs, execution results, and related information to provide the Service, verify identity, understand usage, prevent unauthorized use, respond to security issues, and improve the Service.",
      "The Operations Team shall appropriately manage collected information and shall not unnecessarily disclose it to third parties except where required by law or necessary for operations.",
      "Detailed handling of personal information shall be governed by the separately established Privacy Policy.",
    ],
  },
  {
    title: "Article 13. Changes to These Terms",
    items: [
      "The Operations Team may change these Terms as necessary.",
      "When these Terms are changed, the Operations Team shall notify users by posting on the Service or by another appropriate method.",
      "If a user continues to use the Service after the Terms are changed, the user shall be deemed to have agreed to the revised Terms.",
    ],
  },
  {
    title: "Article 14. Governing Law",
    body: ["These Terms shall be governed by and interpreted in accordance with the laws of Japan."],
  },
  {
    title: "Article 15. Contact",
    body: ["Inquiries regarding the Service shall be made using the method specified by the Operations Team."],
  },
];

export default function TermsPage() {
  return (
    <PublicPageShell
      active="terms"
      description="These Terms of Service define the conditions for using Wait for Judge."
      eyebrow="Terms of Service"
      title="Wait for Judge Terms of Service"
    >
      <article className="rounded-md border border-cyan-300/15 bg-[#06131c] p-6 shadow-[0_0_32px_rgba(20,241,216,0.06)] sm:p-8">
        <div className="space-y-4 border-b border-cyan-300/15 pb-8 text-sm leading-8 text-zinc-300">
          <p>
            These Terms of Service define the conditions for using the online judge service
            "Wait for Judge / WfJ" provided by the Wait for Judge Operations Team.
          </p>
          <p>
            Users shall use the Service only after agreeing to these Terms.
          </p>
        </div>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-bold text-white">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-8 text-zinc-300">
                {section.body?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.items ? (
                  <ol className="list-decimal space-y-2 pl-5">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 border-t border-cyan-300/15 pt-6 text-sm leading-8 text-zinc-300">
          <p>Established: July 8, 2026</p>
          <p>Operator: Wait for Judge anpanchan</p>
        </div>
      </article>
    </PublicPageShell>
  );
}
