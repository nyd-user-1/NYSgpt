import Script from "next/script";

export const metadata = { title: "Legislative API" };

// The Legislative API's page (2026-11-10): what I hold, the AWS Marketplace tiers, and the Buy with AWS block from the
// Buy with AWS onboarding guide (the mark, the call-to-action buttons with their data attributes, the metrics script).
// Until AWS approves the branding review and the listing is Public, NEXT_PUBLIC_BUY_WITH_AWS stays unset and the
// button reads "View on AWS Marketplace", linking the listing; set it to 1 to switch to the co-branded checkout.

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;

const PRODUCT_ID = "prod-2sskaqhhle24w";
const SELLER_ID = "seller-jhcd5a7hqp57k";
const LISTING = "https://aws.amazon.com/marketplace/pp/prodview-i2jn2iqycbpaw";
const BUY = `https://aws.amazon.com/marketplace/procurement?productId=${PRODUCT_ID}&sellerId=${SELLER_ID}&isBuyWithAWS=true&sourceURL=${encodeURIComponent("https://www.nysgpt.com/legislative-api")}`;
const LIVE = process.env.NEXT_PUBLIC_BUY_WITH_AWS === "1";

/** The contract tiers as listed on AWS Marketplace (2026-10-27), USD a month and for twelve months. */
const TIERS = [
  { calls: "10,000 calls", internal: [725, 6325], commercial: [900, 7925] },
  { calls: "100,000 calls", internal: [2100, 18500], commercial: [2600, 23100] },
  { calls: "1 million calls", internal: [3900, 34300], commercial: [4900, 42900] },
];
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

const BUTTON = "inline-flex h-10 items-center rounded-md px-4 text-[14px] font-medium transition-colors";
const PRIMARY = `${BUTTON} bg-[#0972d3] text-white hover:bg-[#065fb0]`;
const SECONDARY = `${BUTTON} border border-[var(--paper-rule)] text-[var(--paper-text)] hover:bg-[var(--paper-quiet)]`;

export default function LegislativeApiPage() {
  return (
    <>
      <h1 className="m-0 text-4xl font-normal" style={SERIF}>Legislative API</h1>
      <p className="m-0 mt-3 text-[13px] text-[var(--paper-muted)]" style={MONO}>
        All 50 states and Congress · 20 years · one API key
      </p>

      <p className="mt-8 max-w-[680px] text-[16px] leading-relaxed">
        I hold twenty years of legislative data from all 50 states and Congress: every bill, committee, member, roll
        call, sponsorship, bill text and vote, with federal and state code beside them, thirty years of FEC campaign
        finance, and lobbying filings. Each endpoint filters on indexed columns and returns JSON. One key, one monthly
        call tier, and the <a href="/legislative-api/coverage" className="underline">coverage</a> and{" "}
        <a href="/legislative-api/dictionary" className="underline">data dictionary</a> say exactly what is in it.
      </p>

      <div className="mt-10 overflow-x-auto rounded-2xl border border-[var(--paper-rule-soft)]">
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr className="text-left text-[12px] text-[var(--paper-muted)]" style={MONO}>
              <th className="px-4 py-3 font-medium">Monthly calls</th>
              <th className="px-4 py-3 font-medium">Internal use, a month</th>
              <th className="px-4 py-3 font-medium">Internal use, twelve months</th>
              <th className="px-4 py-3 font-medium">Commercial, a month</th>
              <th className="px-4 py-3 font-medium">Commercial, twelve months</th>
            </tr>
          </thead>
          <tbody>
            {TIERS.map((t) => (
              <tr key={t.calls} className="border-t border-[var(--paper-rule-soft)]">
                <td className="px-4 py-3">{t.calls}</td>
                <td className="px-4 py-3" style={MONO}>{usd(t.internal[0])}</td>
                <td className="px-4 py-3" style={MONO}>{usd(t.internal[1])}</td>
                <td className="px-4 py-3" style={MONO}>{usd(t.commercial[0])}</td>
                <td className="px-4 py-3" style={MONO}>{usd(t.commercial[1])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="m-0 mt-2 text-[12px] text-[var(--paper-muted)]" style={MONO}>
        Billed through AWS Marketplace on your AWS account. Private offers for other terms.
      </p>

      <section className="mt-12 rounded-2xl border border-[var(--paper-rule-soft)] p-6">
        <div className="flex items-center gap-3">
          <img src="/aws-logo.png" alt="AWS" width={44} height={26} />
          <span className="text-[13px] text-[var(--paper-muted)]" style={MONO}>available in AWS Marketplace</span>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {LIVE ? (
            <a
              id="buy-with-aws"
              href={BUY}
              className={PRIMARY}
              data-awsmp-bwa-cta="BuyWithAws"
              data-awsmp-bwa-seller-id={SELLER_ID}
              data-awsmp-bwa-product-id={PRODUCT_ID}
            >
              Buy with AWS
            </a>
          ) : (
            <a href={LISTING} className={PRIMARY}>View on AWS Marketplace</a>
          )}
          <a
            id="request-private-offer"
            href="mailto:brendan@nysgpt.com?subject=Legislative%20API%20private%20offer&body=AWS%20account%20ID%3A%20%0ACompany%3A%20%0ACalls%20a%20month%3A%20%0ATerm%3A%20"
            className={SECONDARY}
            data-awsmp-bwa-cta="RequestAPrivateOffer"
            data-awsmp-bwa-seller-id={SELLER_ID}
            data-awsmp-bwa-product-id={PRODUCT_ID}
          >
            Request private offer
          </a>
        </div>
        <p className="m-0 mt-4 max-w-[600px] text-[13px] text-[var(--paper-muted)]">
          Subscribing on AWS Marketplace puts the charge on your AWS bill. After you subscribe, your API key is stored in
          AWS Secrets Manager in your account and shown in your account here.
        </p>
      </section>

      {LIVE && <Script src="https://bwa.marketplace.awsstatic.com/assets/partner.js" strategy="afterInteractive" />}
    </>
  );
}
