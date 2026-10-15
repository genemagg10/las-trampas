import { PhotoSlot } from "@/components/ui";

export const metadata = { title: "History" };

export default function HistoryPage() {
  return (
    <section className="band">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">History</p>
          <h2>Since 1958</h2>
          <p>This is a short public note. The board’s own history, and photos from the archive, replace it before launch.</p>
        </div>
        <div className="grid-2">
          <PhotoSlot label="A photo from the club archive" />
          <div className="card">
            <p>Las Trampas Pool was founded in 1958 in Burton Valley, Lafayette. It is member-owned and open May through October.</p>
            <p>The club is home to the Las Trampas Seahorses swim team.</p>
            <p>A longer history, with dates the board wants published, belongs in this card.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
