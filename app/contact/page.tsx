import { Notice } from "@/components/ui";
import { sendContact } from "@/lib/actions/member";
import { boardRoles } from "@/lib/fees";
import { getBoardPositions } from "@/lib/queries";

export const metadata = { title: "Contact" };

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string; to?: string }>;
}) {
  const query = await searchParams;
  const flash = { notice: query.notice, error: query.error };
  const positions = await getBoardPositions();
  const options =
    positions.length > 0
      ? positions.map((row) => ({ key: String(row.key), label: String(row.label) }))
      : boardRoles.map((role) => ({ key: role.key, label: role.label }));

  return (
    <section className="band">
      <div className="wrap" style={{ maxWidth: 720 }}>
        <div className="section-head">
          <p className="eyebrow">Contact</p>
          <h2>Write the board</h2>
          <p>Messages stay in the club database. If email is connected and that office has an inbox, a copy is also sent there.</p>
        </div>
        <Notice {...flash} />
        <form className="form card" action={sendContact}>
          <label>
            Name
            <input name="name" required autoComplete="name" />
          </label>
          <label>
            Email
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Topic
            <input name="topic" required placeholder="Membership, lap swim, a party…" />
          </label>
          <label>
            Send to
            <select name="board_position_key" defaultValue={query.to || ""}>
              <option value="">General</option>
              {options.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Message
            <textarea name="body" required minLength={2} maxLength={5000} />
          </label>
          <label className="check" style={{ position: "absolute", left: "-9999px" }} aria-hidden>
            Company
            <input name="company" tabIndex={-1} autoComplete="off" />
          </label>
          <button className="btn" type="submit">
            Send
          </button>
        </form>
      </div>
    </section>
  );
}
