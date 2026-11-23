import Link from "next/link";
import { ContactStatusBadge } from "@/components/admin/badges";
import { firstParam, topicLabel } from "@/components/admin/format";
import { InboxIcon, MailIcon } from "@/components/admin/icons";
import { MessageActions } from "@/components/admin/message-actions";
import { EmptyState, Panel, PageHeader, TableScroll, tableClass, tdClass, theadClass, thClass, trClass } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { cn, formatDate } from "@/lib/utils";
import { requireAdminPage } from "@/server/auth/session";
import { listContactSubmissions, listNewsletter } from "@/server/services/messages";

export const metadata = { title: "Messages" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FILTERS = [
  { value: "inbox", label: "Inbox" },
  { value: "new", label: "New" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
] as const;
type Filter = (typeof FILTERS)[number]["value"];

export default async function AdminMessagesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const sp = await searchParams;
  const raw = firstParam(sp.status);
  const filter: Filter = FILTERS.some((f) => f.value === raw) ? (raw as Filter) : "inbox";

  const [messages, subscribers] = await Promise.all([listContactSubmissions(200), listNewsletter(200)]);

  const counts: Record<Filter, number> = {
    inbox: messages.filter((m) => m.status !== "archived").length,
    new: messages.filter((m) => m.status === "new").length,
    archived: messages.filter((m) => m.status === "archived").length,
    all: messages.length,
  };
  const visible = messages.filter((m) =>
    filter === "all" ? true : filter === "inbox" ? m.status !== "archived" : m.status === filter,
  );
  const activeSubscribers = subscribers.filter((s) => s.status === "subscribed").length;

  return (
    <>
      <PageHeader title="Messages" description="Contact-form submissions and newsletter sign-ups from the storefront." />

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_26rem]">
        <Panel id="contact" title="Contact submissions" description={`${counts.new} new · ${counts.all} total`}>
          <nav aria-label="Filter messages" className="flex gap-1 overflow-x-auto border-b border-graphite/[0.08] px-3 py-2 sm:px-4">
            {FILTERS.map((f) => {
              const active = f.value === filter;
              return (
                <Link
                  key={f.value}
                  href={f.value === "inbox" ? "/admin/messages" : `/admin/messages?status=${f.value}`}
                  aria-current={active ? "page" : undefined}
                  scroll={false}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm transition-colors",
                    active ? "bg-forest font-medium text-ivory" : "text-graphite/75 hover:bg-forest/[0.06] hover:text-forest",
                  )}
                >
                  {f.label}
                  <span className={cn("tabular rounded-full px-1.5 text-xs", active ? "bg-white/15 text-ivory" : "bg-graphite/[0.07] text-graphite/70")}>
                    {counts[f.value]}
                  </span>
                </Link>
              );
            })}
          </nav>

          {visible.length === 0 ? (
            <EmptyState
              icon={<InboxIcon size={20} />}
              title={filter === "new" ? "No new messages" : filter === "archived" ? "Nothing archived" : "No messages"}
              description={
                filter === "new" || filter === "inbox"
                  ? "You're all caught up. New contact-form submissions will appear here."
                  : "Archived messages will appear here."
              }
            />
          ) : (
            <ul className="divide-y divide-graphite/[0.08]">
              {visible.map((m) => (
                <li key={m.id}>
                  <article aria-labelledby={`msg-${m.id}`} className={cn("flex flex-col gap-3 px-4 py-5 sm:px-5", m.status === "new" && "bg-mint/[0.18]")}>
                    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <div className="min-w-0">
                        <h3 id={`msg-${m.id}`} className="flex flex-wrap items-center gap-2 font-medium text-graphite">
                          {m.status === "new" && <span aria-hidden="true" className="size-2 rounded-full bg-coral" />}
                          {m.name}
                          <ContactStatusBadge status={m.status} />
                        </h3>
                        <p className="mt-0.5 text-sm">
                          <a
                            href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message to SniffOrbit")}`}
                            className="break-all text-forest underline decoration-forest/25 underline-offset-4 hover:decoration-forest"
                          >
                            {m.email}
                          </a>
                        </p>
                      </div>
                      <time dateTime={m.createdAt.toISOString()} className="shrink-0 text-xs text-graphite/60">
                        {formatDate(m.createdAt, true)}
                      </time>
                    </header>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge tone="neutral">Topic: {topicLabel(m.topic)}</Badge>
                      {m.orderReference && (
                        <Link
                          href={`/admin/orders?q=${encodeURIComponent(m.orderReference)}`}
                          className="inline-flex items-center gap-1 rounded-full bg-aqua px-2.5 py-1 font-medium text-forest ring-1 ring-inset ring-forest/15 hover:ring-forest/40"
                        >
                          Order <span className="font-mono">{m.orderReference}</span>
                        </Link>
                      )}
                    </div>
                    <p className="max-w-[75ch] whitespace-pre-wrap break-words text-[0.93rem] leading-relaxed text-graphite/85">{m.message}</p>
                    <MessageActions id={m.id} status={m.status} from={m.name} />
                  </article>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel id="newsletter" title="Newsletter" description={`${activeSubscribers} subscribed · ${subscribers.length} total`} className="self-start">
          {subscribers.length === 0 ? (
            <EmptyState icon={<MailIcon size={20} />} title="No subscribers yet" description="Sign-ups from the storefront newsletter form appear here." />
          ) : (
            <TableScroll label="Newsletter subscribers">
              <table className={`${tableClass} min-w-[26rem]`}>
                <thead className={theadClass}>
                  <tr>
                    <th scope="col" className={thClass}>Email</th>
                    <th scope="col" className={thClass}>Source</th>
                    <th scope="col" className={thClass}>Since</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((s) => (
                    <tr key={s.id} className={trClass}>
                      <th scope="row" className={`${tdClass} max-w-[14rem] font-normal`}>
                        <span className="block truncate text-graphite" title={s.email}>
                          {s.email}
                        </span>
                        {s.status === "unsubscribed" && <span className="text-xs text-graphite/55">Unsubscribed</span>}
                      </th>
                      <td className={`${tdClass} whitespace-nowrap text-graphite/70`}>{s.source}</td>
                      <td className={`${tdClass} whitespace-nowrap text-graphite/70`}>{formatDate(s.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>
      </div>
    </>
  );
}
