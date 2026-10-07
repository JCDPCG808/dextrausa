// Tracked short links: https://dextrausa.com/go/<firm>/<doc>
// Serves a tiny interstitial that records the click in GA4 (page_view + "tracked_link_click"
// event with firm/doc), then forwards to the document. Any lowercase firm slug works, so new
// recipients can get their own link without a deploy. Only /go/* is routed here (_routes.json).

const GA_ID = "G-45L05BB4PS";
const CAMPAIGN = "dennis_fwd";

const DOCS = {
  engineer: {
    title: "Engineer Approval Package (Rev. 1.1)",
    url: "https://iflip.page/dextrausa/Engineer_Approval_Package_-_GFRP_Hawaii_Rev_11.html",
    utm: true,
  },
  spec: {
    title: "CSI Section 03 21 21.11 master spec",
    url: "https://iflip.page/dextrausa/CSI_Spec_03_21_2111_-_GFRP_Reinforcing_Bars.html",
    utm: true,
  },
  library: {
    title: "Developer & GC library",
    url: "https://iflip.page/dextrausa/library/Dextra_Developer_Library.html",
    utm: true,
  },
  pdf: {
    title: "Engineer Approval Package PDF",
    url: "https://drive.google.com/file/d/1Ud8B6mmpUT28GvnzDQj4tiK8t6tDCQWI/view",
    utm: false,
  },
  video: {
    title: "Durabar Carpet vs steel mesh",
    url: "https://youtu.be/RcgYWBWR_Ao",
    utm: false,
  },
};

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const js = (v) => JSON.stringify(v).replace(/</g, "\\u003c");

function notFound() {
  return new Response(
    '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Link not found</title>' +
      '<p style="font-family:sans-serif">That link isn\'t valid. Visit <a href="https://dextrausa.com/">dextrausa.com</a>.</p>',
    { status: 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
  );
}

export async function onRequest({ request, params }) {
  const parts = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean);
  if (parts.length !== 2) return notFound();
  const firm = String(parts[0]).toLowerCase();
  const docKey = String(parts[1]).toLowerCase();
  const doc = DOCS[docKey];
  if (!doc || !/^[a-z0-9][a-z0-9-]{0,39}$/.test(firm)) return notFound();

  const utm = `utm_source=${encodeURIComponent(firm)}&utm_medium=email&utm_campaign=${CAMPAIGN}`;
  const dest = doc.utm ? `${doc.url}${doc.url.includes("?") ? "&" : "?"}${utm}` : doc.url;
  const pageLocation = `https://dextrausa.com/go/${firm}/${docKey}?${utm}&utm_content=${docKey}`;

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="referrer" content="no-referrer-when-downgrade">
<title>Opening ${esc(doc.title)} | DextraUSA</title>
<meta http-equiv="refresh" content="2;url=${esc(dest)}">
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
var dest = ${js(dest)}, done = false;
function go(){ if (done) return; done = true; location.replace(dest); }
gtag('js', new Date());
gtag('config', ${js(GA_ID)}, {
  page_location: ${js(pageLocation)},
  page_title: ${js(`Tracked link: ${firm} / ${docKey}`)},
  transport_type: 'beacon'
});
gtag('event', 'tracked_link_click', {
  firm: ${js(firm)},
  doc: ${js(docKey)},
  link_campaign: ${js(CAMPAIGN)},
  link_url: dest,
  transport_type: 'beacon',
  event_callback: go,
  event_timeout: 1200
});
setTimeout(go, 1500);
</script>
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#222;display:flex;min-height:90vh;align-items:center;justify-content:center;text-align:center}a{color:#0b5cad}</style>
</head><body>
<p>Opening <a href="${esc(dest)}">${esc(doc.title)}</a>&hellip;</p>
</body></html>`;

  return new Response(request.method === "HEAD" ? null : html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
      "x-go-destination": dest,
    },
  });
}
