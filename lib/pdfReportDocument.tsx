import path from 'path';
import fs from 'fs';
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import { registerQaPdfFonts } from '@/lib/qaPdfFonts';
import { calculateTremorFrequency } from '@/lib/tremorFrequency';

registerQaPdfFonts();

const DOT_LINE =
  '..........................................................................................................';

const FOOTER_NOTE =
  'การประเมินด้วยแบบคัดกรองความเสี่ยงของการเกิดโรคพาร์กินสันนี้ เป็นการประเมินด้วยค่าทางสถิติและการวิเคราะห์ด้วยปัญญาประดิษฐ์ โดยทางทีมผู้วิจัยได้ทำการทดสอบความเที่ยงตรงและแม่นยำของแบบคัดกรองพบมีความแม่นยำในระดับสูงในการคัดแยกผู้ป่วยพาร์กินสัน แต่อย่างไรก็ตามการวินิจฉัยโรคพาร์กินสันในปัจจุบันยังอ้างอิงตามเกณฑ์การตรวจวินิจฉัยโดยแพทย์ ดังนั้น แบบคัดกรองความเสี่ยงของการเกิดโรคพาร์กินสันนี้ ยังไม่สามารถทดแทนการตรวจวินิจฉัยโดยแพทย์ได้ ดังนั้น หากท่านมีความเสี่ยงหรือมีข้อสงสัยหรือได้รับคำแนะนำให้พบแพทย์เพื่อรับการตรวจวินิจฉัยเพิ่มเติม ควรพบแพทย์เพื่อรับการปรึกษาเพิ่มเติมต่อไป';

const imageCache = new Map<string, string | null>();

function toMimeType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function normalizeBaseUrl(baseUrl?: string | null) {
  if (!baseUrl) return null;
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

function loadPdfImage(relativePath: string, baseUrl?: string | null) {
  const cacheKey = `${relativePath}|${baseUrl ?? ''}`;
  const cached = imageCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const segments = relativePath.split('/').filter(Boolean);
  const rootCandidates = Array.from(
    new Set([process.cwd(), process.env.LAMBDA_TASK_ROOT].filter(Boolean) as string[])
  );

  const localCandidates = rootCandidates.flatMap((root) => [
    path.join(root, 'img', ...segments),
    path.join(root, 'public', 'img', ...segments),
  ]);

  for (const filePath of localCandidates) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const base64 = fs.readFileSync(filePath).toString('base64');
      const dataUri = `data:${toMimeType(filePath)};base64,${base64}`;
      imageCache.set(cacheKey, dataUri);
      return dataUri;
    } catch (error) {
      console.error('Failed to read PDF image asset:', filePath, error);
    }
  }

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  if (normalizedBaseUrl) {
    const remoteUrl = `${normalizedBaseUrl}/img/${relativePath}`;
    imageCache.set(cacheKey, remoteUrl);
    return remoteUrl;
  }

  console.error('PDF image asset not found:', relativePath);
  imageCache.set(cacheKey, null);
  return null;
}

export const QUESTION_LIST = [
  '1. ท่านเคยมีอาการสั่นที่มือ หรือขา โดยมีอาการขณะพักหรืออยู่เฉยๆ',
  '2. ท่านเขียนหนังสือช้าลง หรือเขียนหนังสือตัวเล็กลงกว่าเดิม',
  '3. ท่านรู้สึกว่าเคลื่อนไหวช้าลงกว่าเมื่อก่อน เช่น การหวีผม แต่งตัว อาบน้ำ หรือรู้สึกว่าการติดกระดุม หรือเปิดฝาขวดน้ำทำได้ลำบากกว่าเก่า',
  '4. เคยมีคนบอกว่าเสียงของท่านเบาลงกว่าเมื่อก่อน หรือผู้ฟังต้องถามซ้ำบ่อยๆ เพราะไม่ได้ยินเสียงท่านพูด',
  '5. ท่านรู้สึกว่าแขนของท่านแกว่งน้อยลงเวลาเดิน',
  '6. ท่านเดินก้าวสั้นๆ และเดินซอยเท้าถี่',
  '7. ท่านมีอาการก้าวขาไม่ออก หรือก้าวติดขณะเริ่มต้นออกเดิน หรือขณะเดิน หรือหมุนตัว',
  '8. ท่านมีปัญหาพุ่งตัวไปข้างหน้าขณะเดิน ทำให้ก้าวตามไม่ทัน หรือหยุดเดินทันทีได้ยาก',
  '9. ท่านมีอาการข้อใดข้อหนึ่งต่อไปนี้ พลิกตัวได้ลำบากเวลานอน หรือลุกจากที่นอนลำบาก หรือหลังจากนั่งลงแล้ว ท่านรู้สึกว่าลุกยาก หรือลุกลำบาก',
  '10. มีอาการสั่น เคลื่อนไหวช้า หรือแข็งเกร็งเริ่มที่ข้างใดข้างหนึ่งของร่างกายก่อน',
  '11. ท่านทราบว่าตนเองมีอาการพูดออกเสียง หรือตะโกน หรือละเมอ หรือขยับแขนขาที่อาจจะสอดคล้องกับความฝัน หรือตกเตียงขณะนอนหลับ หรือเคยได้รับการบอกจากคู่นอน หรือผู้ดูแล ว่าท่านมีอาการดังกล่าว',
  '12. ท่านมีอาการง่วงนอนระหว่างวันมากผิดปกติ หรือผลอยหลับระหว่างขณะทำกิจกรรมเป็นประจำ',
  '13. ท่านรู้สึกว่าการได้กลิ่นของท่านลดลง',
  '14. ในช่วง 3 เดือนที่ผ่านมา ท่านมีอาการท้องผูกเรื้อรัง โดยถ่ายน้อยกว่า 3 ครั้ง/สัปดาห์',
  '15. ท่านมีอาการซึมเศร้า ร้องไห้ง่ายกว่าปกติ หรือขาดความสนใจต่อสิ่งแวดล้อมรอบข้าง หรือสิ่งที่เคยให้ความสนุกสนานในอดีต',
  '16. ท่านเคยเห็นภาพหลอน หรือได้ยินเสียง โดยที่ไม่มีตัวคน',
  '17. ท่านมีอาการหน้ามืด มึน หรือเวียนศีรษะ เวลาเปลี่ยนท่าจากนั่งหรือนอนเป็นลุกยืน และอาการมักจะดีขึ้น หรือหายไปหลังจากที่นั่งหรือนอนเป็นประจำ',
  '18. ท่านมีปัญหาการควบคุมปัสสาวะ เช่น การกลั้นปัสสาวะไม่ได้ ปัสสาวะคั่งเป็นประจำ',
  '19. ท่านมีปัญหาความคิดวิเคราะห์ ความจำ การคำนวณ ที่แย่ลง นานมากกว่า 1 ปีขึ้นไป',
  '20. ท่านมีปัญหาการทรงตัว หรือหกล้มบ่อย ในระยะแรกที่เกิดอาการ เคลื่อนไหวช้า แข็งเกร็ง หรือสั่น',
];

export type PdfReportProps = {
  info: {
    name: string;
    age: string | null;
    date: string;
  };
  recordData: Record<string, any>;
  assetBaseUrl?: string | null;
};

function formatThaiDate(dateStr: string) {
  try {
    const date = new Date(dateStr);
    const thaiYear = date.getFullYear() + 543;
    const months = [
      'ม.ค.',
      'ก.พ.',
      'มี.ค.',
      'เม.ย.',
      'พ.ค.',
      'มิ.ย.',
      'ก.ค.',
      'ส.ค.',
      'ก.ย.',
      'ต.ค.',
      'พ.ย.',
      'ธ.ค.',
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${thaiYear}`;
  } catch {
    return dateStr;
  }
}

function mapDiagnoseType(type: string | undefined) {
  if (type === 'ct') return 'ปกติ/Healthy control';
  if (type === 'pd') return "Likely Parkinson's disease (PD)";
  if (type === 'prodromalPD') return 'Likely prodromal PD';
  if (type === 'highRiskPD') return 'Likely high risk for PD';
  if (type === 'other') return 'Other';
  return DOT_LINE;
}

function HzValue({ value }: { value: number | null }) {
  if (value === null) {
    return <Text style={styles.naValue}>ไม่มีข้อมูลจากการทดสอบ</Text>;
  }
  return <Text style={styles.value}>{value.toFixed(1)} Hz</Text>;
}

function TapValue({ value }: { value: number | null }) {
  if (value === null) {
    return <Text style={styles.naValue}>ไม่มีข้อมูล</Text>;
  }
  return <Text style={styles.value}>{value} ครั้ง</Text>;
}

function TestSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.testSection}>
      <Text style={styles.testTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function PdfReportDocument({
  info,
  recordData,
  assetBaseUrl,
}: PdfReportProps) {
  const questionnaire = recordData.questionnaire?.data?.split(',') || [];
  const tapCountLeft = recordData.dualtap?.data?.score ?? null;
  const tapCountRight = recordData.dualtapright?.data?.score ?? null;
  const restingFrequency = recordData.tremorresting?.data
    ? calculateTremorFrequency(recordData.tremorresting.data)
    : null;
  const posturalFrequency = recordData.tremorpostural?.data
    ? calculateTremorFrequency(recordData.tremorpostural.data)
    : null;
  const balanceFrequency = recordData.balance?.data
    ? calculateTremorFrequency(recordData.balance.data)
    : null;
  const gaitFrequency = recordData.gaitwalk?.data
    ? calculateTremorFrequency(recordData.gaitwalk.data)
    : null;

  const prediction = recordData.prediction;
  const diagnose = recordData.diagnose;
  const hasVoice = Boolean(recordData.voiceAhh || recordData.voiceYPL);
  const hasQuestionnaire = Boolean(recordData.questionnaire);
  const headerImageSrc = loadPdfImage('header/pdf_header.jpg', assetBaseUrl);
  const footerImageSrc = loadPdfImage('footer/pdf_footer.jpg', assetBaseUrl);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {headerImageSrc ? <Image src={headerImageSrc} style={styles.headerImage} /> : null}

        <View style={styles.section}>
          <Text>ชื่อ นามสกุล {info.name}</Text>
          <Text>อายุ {info.age || '................'} ปี</Text>
          <Text>วันที่ทดสอบ {formatThaiDate(info.date)}</Text>
        </View>

        <Text style={[styles.section]}>
          ท่านได้ทำการประเมิน แบบคัดกรองความเสี่ยงของการเกิดโรคพาร์กินสัน ประกอบด้วย
        </Text>

        <View style={styles.indent}>
          <TestSection title="• แบบประเมินอาการโรคพาร์กินสัน 20 ข้อ">
            {hasQuestionnaire ? (
              <Text style={styles.testItem}>- ทำแบบประเมินแล้ว</Text>
            ) : (
              <Text style={[styles.testItem, styles.naValue]}>ไม่มีข้อมูลจากการทดสอบ</Text>
            )}
          </TestSection>

          <TestSection title="• การทดสอบการออกเสียง">
            {hasVoice ? (
              <Text style={styles.testItem}>- ทำการทดสอบเสียงแล้ว</Text>
            ) : (
              <Text style={[styles.testItem, styles.naValue]}>ไม่มีข้อมูลจากการทดสอบ</Text>
            )}
          </TestSection>

          <TestSection title="• การทดสอบอาการสั่น">
            <View style={styles.testItemRow}>
              <Text style={styles.testItemPrefix}>- อาการสั่นขณะยืดถือแขนตรง: </Text>
              <HzValue value={posturalFrequency} />
            </View>
            <View style={styles.testItemRow}>
              <Text style={styles.testItemPrefix}>- อาการสั่นขณะพัก: </Text>
              <HzValue value={restingFrequency} />
            </View>
          </TestSection>

          <TestSection title="• การทดสอบการตอบสนองของมือ">
            <View style={styles.testItemRow}>
              <Text style={styles.testItemPrefix}>- มือซ้าย: </Text>
              <TapValue value={tapCountLeft} />
            </View>
            <View style={styles.testItemRow}>
              <Text style={styles.testItemPrefix}>- มือขวา: </Text>
              <TapValue value={tapCountRight} />
            </View>
          </TestSection>

          <TestSection title="• การทดสอบการเดินและการทรงตัว">
            <View style={styles.testItemRow}>
              <Text style={styles.testItemPrefix}>- ความถี่การทรงตัวขณะยืน: </Text>
              <HzValue value={balanceFrequency} />
            </View>
            <View style={styles.testItemRow}>
              <Text style={styles.testItemPrefix}>- ความถี่ลักษณะการเดิน: </Text>
              <HzValue value={gaitFrequency} />
            </View>
          </TestSection>
        </View>

        <Text style={[styles.section]}>
          ผลการประเมินด้วยค่าทางสถิติ และการวิเคราะห์ด้วยปัญญาประดิษฐ์ พบว่า
        </Text>

        <Text style={styles.indent}>
          {prediction?.risk
            ? 'แนะนำพบแพทย์ เพื่อทำการตรวจวินิจฉัยเพิ่มเติม'
            : 'อยู่ในเกณฑ์ปกติ'}
        </Text>

        <Text style={[styles.section]}>
          ผลการประเมินด้วยแพทย์/ผู้เชี่ยวชาญ
        </Text>

        <View style={styles.indent}>
          <Text>ผลวินิจฉัย: {mapDiagnoseType(diagnose?.type)}</Text>
          <Text>รายละเอียด: {diagnose?.comment || DOT_LINE}</Text>
          <Text>หมายเหตุ: {diagnose?.note || DOT_LINE}</Text>
        </View>

        <Text style={[styles.section]}>ข้อแนะนำ สำหรับทุกคน</Text>
        <View style={styles.indent}>
          <Text>- ทำการตรวจประเมิน ด้วยแบบคัดกรองความเสี่ยงของการเกิดโรคพาร์กินสัน ซ้ำทุก 1 ปี</Text>
          <Text>
            - ศึกษาความรู้ ความเข้าใจ เกี่ยวกับการป้องกันโรคพาร์กินสัน และการปรับเปลี่ยนพฤติกรรมสุขภาพ
            ด้วย "กิน ขยับ หลับดี (Eat Move Sleep Repeat)"
          </Text>
        </View>

        <Text style={[styles.section]}>
          ข้อแนะนำ สำหรับผู้ที่ต้องไปพบแพทย์ เพื่อทำการตรวจวินิจฉัยเพิ่มเติม
        </Text>
        <View style={styles.indent}>
          <Text>
            - นำผลการตรวจประเมินด้วยแบบคัดกรองความเสี่ยงของการเกิดโรคพาร์กินสัน ไปพบแพทย์
            ตามสิทธิการรักษาของท่าน เพื่อทำการตรวจวินิจฉัย โดยการถามประวัติ ตรวจร่างกาย
            หรือส่งตรวจทางห้องปฏิบัติการที่จำเป็นต่อไป
          </Text>
          <Text>- ทำการตรวจประเมิน ด้วยแบบคัดกรองความเสี่ยงของการเกิดโรคพาร์กินสัน ซ้ำทุก 1 ปี</Text>
          <Text>
            - ศึกษาความรู้ ความเข้าใจ เกี่ยวกับการป้องกันโรคพาร์กินสัน และการปรับเปลี่ยนพฤติกรรมสุขภาพ
            ด้วย "กิน ขยับ หลับดี (Eat Move Sleep Repeat)"
          </Text>
        </View>

        {footerImageSrc ? <Image src={footerImageSrc} style={styles.footerImage} /> : null}
        <Text style={[styles.note, styles.bold]}>หมายเหตุ</Text>
        <Text style={styles.noteBody}>{FOOTER_NOTE}</Text>
      </Page>

      {questionnaire.length > 0 ? (
        <Page size="A4" style={styles.page}>
          {headerImageSrc ? <Image src={headerImageSrc} style={styles.headerImage} /> : null}
          <Text style={[styles.section]}>
            แบบประเมินอาการโรคพาร์กินสัน 20 ข้อ
          </Text>

          {QUESTION_LIST.map((question, i) => {
            const isNo = questionnaire[i] === '0';
            return (
              <View key={question} style={styles.questionItem}>
                <Text style={styles.questionText}>{question}</Text>
                <Text style={isNo ? styles.answerNo : styles.answerYes}>
                  {isNo ? 'ไม่' : 'ใช่'}
                </Text>
              </View>
            );
          })}

          {footerImageSrc ? <Image src={footerImageSrc} style={styles.footerImage} /> : null}
          <Text style={[styles.note]}>หมายเหตุ</Text>
          <Text style={styles.noteBody}>{FOOTER_NOTE}</Text>
        </Page>
      ) : null}
    </Document>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 24,
    fontFamily: 'THSarabun',
    fontSize: 9,
    lineHeight: 1.4,
  },
  headerImage: {
    width: '100%',
    marginBottom: 8,
  },
  footerImage: {
    width: '100%',
    marginTop: 16,
  },
  section: {
    marginVertical: 4,
  },
  indent: {
    marginLeft: 15,
    // fontSize: 10,
  },
  bold: {
    fontWeight: 'bold',
  },
  testSection: {
    marginBottom: 8,
    paddingTop: 4,
    paddingBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#666',
    paddingLeft: 8,
  },
  testTitle: {
    // fontWeight: 'bold',
    marginBottom: 2,
    fontSize: 9,
  },
  testItem: {
    marginLeft: 12,
    fontSize: 9,
  },
  testItemRow: {
    marginLeft: 12,
    fontSize: 9,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  testItemPrefix: {
    fontSize: 9,
  },
  value: {
    // fontWeight: 'bold',
  },
  naValue: {
    color: '#999',
  },
  note: {
    fontSize: 7,
    marginTop: 8,
  },
  noteBody: {
    fontSize: 7,
    marginTop: 2,
    textAlign: 'left',
    lineHeight: 1.5,
    // letterSpacing: 0,
    // wordSpacing: 0,
    width: '100%',
  },
  questionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
    alignItems: 'flex-start',
  },
  questionText: {
    flex: 1,
    marginRight: 8,
    fontSize: 8,
  },
  answerYes: {
    color: '#f44336',
    minWidth: 40,
    textAlign: 'right',
  },
  answerNo: {
    color: '#009688',
    minWidth: 40,
    textAlign: 'right',
  },
});
