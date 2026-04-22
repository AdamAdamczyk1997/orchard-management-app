const faviconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="OrchardLog">
  <rect width="64" height="64" rx="16" fill="#355139" />
  <circle cx="45" cy="21" r="6" fill="#d8b56b" />
  <path
    d="M19 38c0-10.4 8.4-18.8 18.8-18.8 0 10.4-8.4 18.8-18.8 18.8Z"
    fill="#f4ead8"
  />
  <path
    d="M24 43c7.4-1.1 13.2-6.8 17.4-16.8"
    fill="none"
    stroke="#f4ead8"
    stroke-linecap="round"
    stroke-width="4"
  />
</svg>
`.trim();

export function GET() {
  return new Response(faviconSvg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
