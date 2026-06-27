import sharp from 'sharp'

await sharp('public/icon-source.svg').resize(192, 192).png().toFile('public/icon-192.png')
await sharp('public/icon-source.svg').resize(512, 512).png().toFile('public/icon-512.png')

const maskable = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#f3c84b"/>
  <rect x="88" y="88" width="336" height="336" rx="94" fill="#102e25"/>
  <circle cx="211" cy="252" r="34" fill="#f2f0e7"/>
  <circle cx="301" cy="252" r="34" fill="#ee775f"/>
  <path d="M198 326h116" stroke="#f3c84b" stroke-width="20" stroke-linecap="round"/>
</svg>`)

await sharp(maskable).resize(512, 512).png().toFile('public/icon-maskable-512.png')
