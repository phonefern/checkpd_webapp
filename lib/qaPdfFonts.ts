import path from 'path'
import { Font } from '@react-pdf/renderer'

let registered = false

export function registerQaPdfFonts() {
  if (registered) return

  const fontsDir = path.join(process.cwd(), 'fonts')
  Font.register({
    family: 'THSarabun',
    fonts: [
      { src: path.join(fontsDir, 'thsarabunnew-webfont.woff') },
      { src: path.join(fontsDir, 'thsarabunnew_bold-webfont.woff'), fontWeight: 'bold' },
    ],
  })

  Font.registerHyphenationCallback((word) => [word])
  registered = true
}
