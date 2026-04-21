import { renderToBuffer } from '@react-pdf/renderer'
import { QaPdfDocument, type QaPdfDocumentProps } from '@/lib/qaPdfDocument'

export async function generateQaPdfBuffer(data: QaPdfDocumentProps) {
  return renderToBuffer(<QaPdfDocument {...data} />)
}
