import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import { registerQaPdfFonts } from '@/lib/qaPdfFonts'

registerQaPdfFonts()

type Nullable<T> = T | null

type Patient = {
  first_name: string | null
  last_name: string | null
  age: number | null
  province: string | null
  collection_date: string | null
  hn_number: string | null
  thaiid: string | null
  bmi: number | null
  weight: number | null
  height: number | null
  chest_cm: number | null
  waist_cm: number | null
  hip_cm: number | null
  neck_cm: number | null
  bp_supine: string | null
  pr_supine: string | null
  bp_upright: string | null
  pr_upright: string | null
}

type Diag = {
  condition: string | null
  hy_stage: string | null
  disease_duration: number | null
  other_diagnosis_text: string | null
  constipation: boolean | null
  constipation_onset_age: number | null
  constipation_duration: number | null
  rbd_suspected: boolean | null
  rbd_onset_age: number | null
  rbd_duration: number | null
  hyposmia: boolean | null
  hyposmia_onset_age: number | null
  hyposmia_duration: number | null
  depression: boolean | null
  depression_onset_age: number | null
  depression_duration: number | null
  eds: boolean | null
  eds_onset_age: number | null
  eds_duration: number | null
  ans_dysfunction: boolean | null
  ans_onset_age: number | null
  ans_duration: number | null
  mild_parkinsonian_sign: boolean | null
  family_history_pd: boolean | null
  adl_score: number | null
  scopa_aut_score: number | null
  blood_test_note: string | null
  fdopa_pet_requested: boolean | null
  fdopa_pet_score: number | null
}

type Vision = {
  color_paper_re_test: number | null
  color_paper_re_retest: number | null
  color_paper_le_test: number | null
  color_paper_le_retest: number | null
  color_app_re_test: number | null
  color_app_re_retest: number | null
  color_app_le_test: number | null
  color_app_le_retest: number | null
  contrast_manual_re: number | null
  contrast_manual_le: number | null
  contrast_app_re: number | null
  contrast_app_le: number | null
  va_re: string | null
  va_re_pinhole: string | null
  va_le: string | null
  va_le_pinhole: string | null
}

type Score = { total_score: number | null }

type QaPdfDocumentProps = {
  patient: Patient
  diag: Nullable<Diag>
  moca: Nullable<Score>
  hamd: Nullable<{ total_score: number | null; severity_level: string | null }>
  mds: Nullable<{
    p1_total: number | null
    p2_total: number | null
    p3_total: number | null
    p4_total: number | null
    total_score: number | null
  }>
  epw: Nullable<Score>
  smell: Nullable<{ test_type: string | null; total_score: number | null }>
  tmse: Nullable<Score>
  rbd: Nullable<Score>
  rome4: Nullable<Score>
  vision: Nullable<Vision>
}

const TYPOGRAPHY = {
  baseFontSize: 11,
  titleFontSize: 11,
  lineHeight: 1.2,
  checkMarkFontSize: 10,
} as const

const styles = StyleSheet.create({
  page: {
    padding: 25,
    fontFamily: 'THSarabun',
    fontSize: TYPOGRAPHY.baseFontSize,
    lineHeight: TYPOGRAPHY.lineHeight,
  },
  h2: {
    textAlign: 'center',
    fontSize: TYPOGRAPHY.titleFontSize,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  section: {
    marginVertical: 3,
    marginTop: 3.0,
  },
  line: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'flex-start',
  },
  lineContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  lineContentWithCheckbox: {
    flex: 1,
    minWidth: 0,
  },
  checkbox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: '#000',
    marginRight: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    fontSize: 11,
    lineHeight: 1.1,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
  },
  checkGlyph: {
    width: 9,
    height: 9,
    position: 'relative',
  },
  checkStem: {
    position: 'absolute',
    left: 1,
    top: 4,
    width: 3,
    height: 2,
    backgroundColor: '#000',
    transform: 'rotate(40deg)',
  },
  checkArm: {
    position: 'absolute',
    left: 3,
    top: 2,
    width: 6,
    height: 2,
    backgroundColor: '#000',
    transform: 'rotate(-45deg)',
  },
  fieldBox: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'dotted',
    minWidth: 80,
    // minHeight: 18,
    paddingHorizontal: 3,
    paddingBottom: 1,
    marginHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldText: {
    textAlign: 'center',
    lineHeight: 1.2,
    fontSize: TYPOGRAPHY.baseFontSize,
  },
  indent: {
    marginLeft: 35,
    paddingTop: 8,
  },
  indent2: {
    marginLeft: 65,
    paddingTop: 6,
  },
  numberedItem: {
    marginVertical: 4,
    // paddingTop: 6,
  },
  numberedItem2: {
    marginVertical: 5,
    marginBottom: 12,
  },
  bold: {
    fontWeight: 'bold',
  },
  longDescription: {
    lineHeight: 1.0,
  },
  smallTop: {
    marginTop: 10,
  },
  subQuestion: {
    marginLeft: 95,
    paddingTop: 6,
  },
})

const normalize = (value: string | null | undefined) =>
  (value ?? '').toLowerCase().trim()

const parseConditionTokens = (value: string | null | undefined): string[] =>
  normalize(value)
    .split(/[;,|/]/g)
    .map((v) => v.trim())
    .filter(Boolean)

const hasConditionToken = (raw: string, tokens: string[], candidates: string[]) =>
  candidates.some((candidate) => tokens.includes(candidate) || raw.includes(candidate))

const yesNo = (value: boolean | null | undefined) => ({
  yes: Boolean(value),
  no: value === false,
})

const Cb = ({ checked }: { checked: boolean }) => (
  <View style={styles.checkbox}>
    {checked ? (
      <View style={styles.checkGlyph}>
        <View style={styles.checkStem} />
        <View style={styles.checkArm} />
      </View>
    ) : null}
  </View>
)

const Field = ({
  value,
  minWidth = 60,
}: {
  value: string | number | null | undefined
  minWidth?: number
}) => (
  <View style={[styles.fieldBox, { minWidth }]}>
    <Text style={styles.fieldText}>{value ?? ''}</Text>
  </View>
)

const Line = ({
  checked,
  children,
  style,
}: {
  checked?: boolean
  children: React.ReactNode
  style?: any
}) => (
  <View style={[styles.line, style]}>
    {typeof checked === 'boolean' ? <Cb checked={checked} /> : null}
    <View
      style={
        typeof checked === 'boolean'
          ? [styles.lineContent, styles.lineContentWithCheckbox]
          : styles.lineContent
      }
    >
      {children}
    </View>
  </View>
)

export function QaPdfDocument(props: QaPdfDocumentProps) {
  const { patient: p, diag, moca, hamd, mds, epw, smell, tmse, rbd, rome4, vision } = props

  const conditionRaw = normalize(diag?.condition)
  const conditionTokens = parseConditionTokens(diag?.condition)
  const isNewlyDiagnosis = hasConditionToken(conditionRaw, conditionTokens, [
    'newly',
    'newly diagnosis',
    'newly diagnosed pd',
  ])
  const isPD = hasConditionToken(conditionRaw, conditionTokens, [
    'pd',
    'parkinson',
    'parkinson disease',
  ])
  const isProdromal = hasConditionToken(conditionRaw, conditionTokens, [
    'pdm',
    'prodromal',
    'high risk',
    'high-risk',
  ])
  const isHealthy = hasConditionToken(conditionRaw, conditionTokens, [
    'ctrl',
    'control',
    'healthy',
    'normal',
  ])
  const isOther =
    hasConditionToken(conditionRaw, conditionTokens, ['other', 'other diagnosis']) ||
    (!isPD && !isProdromal && !isHealthy && !isNewlyDiagnosis)

  const otherText = isOther
    ? diag?.other_diagnosis_text ?? diag?.condition ?? ''
    : diag?.other_diagnosis_text ?? ''

  const smellIsThai = smell?.test_type === 'thai_smell_test'
  const smellIsSniffin = smell?.test_type === 'sniffin_stick' || (!!smell?.total_score && !smellIsThai)

  const colorPaperDone = Boolean(
    vision?.color_paper_re_test ||
    vision?.color_paper_re_retest ||
    vision?.color_paper_le_test ||
    vision?.color_paper_le_retest,
  )

  const colorAppDone = Boolean(
    vision?.color_app_re_test ||
    vision?.color_app_re_retest ||
    vision?.color_app_le_test ||
    vision?.color_app_le_retest,
  )

  const contrastManualDone = Boolean(vision?.contrast_manual_re || vision?.contrast_manual_le)
  const contrastAppDone = Boolean(vision?.contrast_app_re || vision?.contrast_app_le)
  const vaDone = Boolean(vision?.va_re || vision?.va_le || vision?.va_re_pinhole || vision?.va_le_pinhole)

  const fdopa = yesNo(diag?.fdopa_pet_requested)
  const psgRequested = yesNo(diag?.rbd_suspected)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Data sheet for high risk or suspected Prodromal PD and PD</Text>
        <Text style={styles.h2}>(Check PD: National Screening Project)</Text>

        <View style={styles.section}>
          <Line checked={isPD}>
            <Text style={styles.bold}>PD</Text>
          </Line>
          <Line checked={isNewlyDiagnosis} style={styles.indent}>
            <Text>Newly diagnosis</Text>
          </Line>
          <Line checked={isPD} style={styles.indent}>
            <Text>PD</Text>
          </Line>
          <Line checked={!!diag?.disease_duration} style={styles.indent2}>
            <Text>Disease duration</Text>
            <Field value={diag?.disease_duration} />
            <Text>years</Text>
          </Line>
          <Line checked={!!diag?.hy_stage} style={styles.indent2}>
            <Text>H&Y</Text>
            <Field value={diag?.hy_stage} />
          </Line>
        </View>

        <View style={styles.section}>
          <Line checked={isProdromal}>
            <Text style={styles.bold}>Prodromal / High risk</Text>
            <Text> กรณีมีข้อใดข้อหนึ่งดังต่อไปนี้</Text>
          </Line>
          <Line checked={!!diag?.rbd_suspected} style={styles.indent}>
            <Text style={styles.longDescription}>
              <Text style={styles.bold}>Suspected RBD</Text>: History of acting out of dream or
              vocalization or RBDQ &gt;= 17 or PSG confirmed
            </Text>
          </Line>
          <Line checked={!!diag?.rbd_suspected} style={styles.indent2}>
            <Text>อายุที่เริ่มมีอาการของนอนละเมอ</Text>
            <Field value={diag?.rbd_onset_age} />
            <Text>ปี หรือ มีอาการมานานเท่าไหร่</Text>
            <Field value={diag?.rbd_duration} />
            <Text>ปี</Text>
          </Line>
          <Line checked={!!diag?.hyposmia} style={styles.indent}>
            <Text style={styles.longDescription}>
              <Text style={styles.bold}>Hyposmia</Text>: History ได้กลิ่นลดลง Sniffin stick &lt;= 9
            </Text>
          </Line>
          <Line checked={!!diag?.hyposmia} style={styles.indent2}>
            <Text>อายุที่เริ่มมีอาการจมูกได้กลิ่นลดลง</Text>
            <Field value={diag?.hyposmia_onset_age} />
            <Text>ปี หรือ มีอาการมานานเท่าไหร่</Text>
            <Field value={diag?.hyposmia_duration} />
            <Text>ปี</Text>
          </Line>
        </View>

        <View style={styles.section}>
          <Text style={styles.indent}>หรือ มีอาการนำ อย่างน้อย 2 ข้อจากอาการดังต่อไปนี้</Text>
          <Line checked={!!diag?.constipation} style={styles.indent2}>
            <Text style={styles.longDescription}>
              <Text style={styles.bold}>Constipation</Text>: History ถ่ายอุจจาระ ความถี่นานกว่าวันเว้นวัน
              หรือต้องใช้ยาระบาย หรือ ลักษณะอุจจาระแข็งขึ้น เรื้อรังในช่วง 3 เดือนที่ผ่านมา
              เมื่อเทียบกับก่อนหน้า or ROME IV &gt;= 2
            </Text>
          </Line>
          <Line checked={!!diag?.constipation} style={styles.subQuestion}>
            <Text>อายุที่เริ่มมีอาการท้องผูก</Text>
            <Field value={diag?.constipation_onset_age} />
            <Text>ปี มีอาการท้องผูกมานานเท่าไหร่</Text>
            <Field value={diag?.constipation_duration} />
            <Text>ปี</Text>
          </Line>
          <Line checked={!!diag?.depression} style={styles.indent2}>
            <Text style={styles.longDescription}>
              <Text style={styles.bold}>Depression</Text>: ประวัติการได้รับการวินิจฉัยและรักษา หรือ HAM-D ตั้งแต่
              13 คะแนนขึ้นไป
            </Text>
          </Line>
          <Line checked={!!diag?.depression} style={styles.subQuestion}>
            <Text>อายุที่เริ่มมีอาการซึมเศร้า</Text>
            <Field value={diag?.depression_onset_age} />
            <Text>ปี มีอาการซึมเศร้ามานานเท่าไหร่</Text>
            <Field value={diag?.depression_duration} />
            <Text>ปี</Text>
          </Line>
          <Line checked={!!diag?.eds} style={styles.indent2}>
            <Text style={styles.longDescription}>
              <Text style={styles.bold}>Excessive daytime sleepiness</Text>: ง่วงนอนมากผิดปกติช่วงกลางวัน
              หรือ ESS ตั้งแต่ 10 คะแนน โดยที่กลางคืนนอนหลับได้ปกติ หรือไม่มีอาการกรนหยุดหายใจ
            </Text>
          </Line>
          <Line checked={!!diag?.eds} style={styles.subQuestion}>
            <Text>อายุที่เริ่มมีอาการ EDS</Text>
            <Field value={diag?.eds_onset_age} />
            <Text>ปี หรือ มีอาการ EDS มานานเท่าไหร่</Text>
            <Field value={diag?.eds_duration} />
            <Text>ปี</Text>
          </Line>
          <Line checked={!!diag?.ans_dysfunction} style={styles.indent2}>
            <Text style={styles.longDescription}>
              <Text style={styles.bold}>Autonomic dysfunction</Text>:
              มีอาการระบบประสาทอัตโนมัติผิดปกติข้อใดข้อหนึ่ง หน้ามืดหรือเป็นลมหมดสติเวลาเปลี่ยนท่า
              จากนอนหรือนั่งเป็นยืน, กลั้นปัสสาวะไม่อยู่
            </Text>
          </Line>
          <Line checked={!!diag?.ans_dysfunction} style={styles.subQuestion}>
            <Text>อายุที่เริ่มมีอาการ ANS dysfunction</Text>
            <Field value={diag?.ans_onset_age} />
            <Text>ปี หรือ มีอาการมานาน</Text>
            <Field value={diag?.ans_duration} />
            <Text>ปี</Text>
          </Line>
          <Line checked={!!diag?.mild_parkinsonian_sign} style={styles.indent2}>
            <Text>
              <Text style={styles.bold}>Mild parkinsonian sign</Text>
            </Text>
          </Line>
          <Line checked={!!diag?.family_history_pd} style={styles.indent2}>
            <Text>
              <Text style={styles.bold}>Family history of PD (First degree): </Text>
              <Text>ประวัติญาติสายตรงเป็นพาร์กินสัน</Text>
            </Text>
          </Line>
        </View>

        <Line checked={isOther} style={styles.section}>
          <Text style={styles.bold}>Other diagnosis</Text>
          <Field value={otherText} minWidth={300} />
        </Line>

        <Line checked={isHealthy} style={styles.section}>
          <Text style={styles.bold}>Healthy</Text>
        </Line>

        <Line style={styles.numberedItem}>
          <Text style={styles.bold}>1.</Text>
          <Text>ชื่อ</Text>
          <Field value={p.first_name} />
          <Text>นามสกุล</Text>
          <Field value={p.last_name} />
        </Line>
        <Line style={styles.numberedItem}>
          <Text style={styles.bold}>2.</Text>
          <Text>อายุ</Text>
          <Field value={p.age} />
          <Text>ปี</Text>
        </Line>
        <Line style={styles.numberedItem}>
          <Text style={styles.bold}>3.</Text>
          <Text>จังหวัด</Text>
          <Field value={p.province} />
        </Line>
        <Line style={styles.numberedItem}>
          <Text style={styles.bold}>4.</Text>
          <Text>วันที่เก็บข้อมูล</Text>
          <Field value={p.collection_date} />
        </Line>
        <Line style={styles.numberedItem}>
          <Text style={styles.bold}>5.</Text>
          <Text>HN (for KCMH patients)</Text>
          <Field value={p.hn_number} />
        </Line>
        <Line style={styles.numberedItem}>
          <Text style={styles.bold}>6.</Text>
          <Text>น้ำหนัก</Text>
          <Field value={p.weight} />
          <Text>กิโลกรัม, ส่วนสูง</Text>
          <Field value={p.height} />
          <Text>เซนติเมตร, BMI</Text>
          <Field value={p.bmi != null ? Number(p.bmi).toFixed(1) : null} />
          <Text>Kg/m²</Text>
        </Line>

        <Line style={styles.section}>
          <Text>รอบอก</Text>
          <Field value={p.chest_cm} />
          <Text>ซม. รอบเอว</Text>
          <Field value={p.waist_cm} />
          <Text>ซม. รอบคอ</Text>
          <Field value={p.neck_cm} />
          <Text>ซม. รอบสะโพก</Text>
          <Field value={p.hip_cm} />
          <Text>ซม.</Text>
        </Line>
        <Line style={styles.section}>
          <Text>ความดันโลหิต หลังนอน 3 นาที BP Supine</Text>
          <Field value={p.bp_supine} />
          <Text>mmHg PR</Text>
          <Field value={p.pr_supine} />
          <Text>/min</Text>
        </Line>
        <Line style={styles.section}>
          <Text>ความดันโลหิต หลังยืน 3 นาที BP Upright 3 min</Text>
          <Field value={p.bp_upright} />
          <Text>mmHg PR</Text>
          <Field value={p.pr_upright} />
          <Text>/min</Text>
        </Line>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.numberedItem2}>
          <Text style={styles.bold}>7. Check PD application</Text>
          <Line checked={false} style={styles.indent}><Text>Demographic</Text></Line>
          <Line checked={false} style={styles.indent}><Text>20-questions questionnaire</Text></Line>
          <Line checked={false} style={styles.indent}><Text>Voice analysis</Text></Line>
          <Line checked={false} style={styles.indent}><Text>Tremor test</Text></Line>
          <Line checked={false} style={styles.indent}><Text>Finger tapping test</Text></Line>
          <Line checked={false} style={styles.indent}><Text>Pinch to size test</Text></Line>
          <Line checked={false} style={styles.indent}><Text>Gait and balance testing</Text></Line>
        </View>

        <View style={styles.numberedItem2}>
          <Text style={styles.bold}>8. MDS UPDRS</Text>
          <Line checked={mds?.p1_total != null} style={styles.indent}><Text>Part I</Text><Field value={mds?.p1_total} /><Text>คะแนน</Text></Line>
          <Line checked={mds?.p2_total != null} style={styles.indent}><Text>Part II</Text><Field value={mds?.p2_total} /><Text>คะแนน</Text></Line>
          <Line checked={mds?.p3_total != null} style={styles.indent}><Text>Part III</Text><Field value={mds?.p3_total} /><Text>คะแนน</Text></Line>
          <Line checked={mds?.p4_total != null} style={styles.indent}><Text>Part IV</Text><Field value={mds?.p4_total} /><Text>คะแนน</Text></Line>
          <Line style={styles.smallTop}><Text>Total MDS-UPDRS</Text><Field value={mds?.total_score} /><Text>คะแนน</Text></Line>
        </View>

        <View style={styles.numberedItem2}>
          <Text style={styles.bold}>9. Cognitive test</Text>
          <Line checked={moca?.total_score != null} style={styles.indent}><Text>MoCA</Text><Field value={moca?.total_score} /><Text>คะแนน or</Text></Line>
          <Line checked={tmse?.total_score != null} style={styles.indent}><Text>TMSE</Text><Field value={tmse?.total_score} /><Text>คะแนน</Text></Line>
        </View>

        <View style={styles.numberedItem2}>
          <Text style={styles.bold}>10. Smell test</Text>
          <Line checked={smellIsThai} style={styles.indent}><Text>Thai smell test</Text><Field value={smellIsThai ? smell?.total_score : null} /><Text>คะแนน or</Text></Line>
          <Line checked={smellIsSniffin} style={styles.indent}><Text>Sniffin stick test</Text><Field value={smellIsSniffin ? smell?.total_score : null} /><Text>คะแนน</Text></Line>
        </View>

        <View style={styles.numberedItem2}>
          <Text style={styles.bold}>11. Color discrimination testing</Text>
          <Line checked={colorPaperDone} style={styles.indent}><Text>Yes (Paper)</Text></Line>
          <Line style={styles.indent2}><Text>Right eye 1</Text><Field value={vision?.color_paper_re_test} /><Text>Right eye 2</Text><Field value={vision?.color_paper_re_retest} /></Line>
          <Line style={styles.indent2}><Text>Left eye 1</Text><Field value={vision?.color_paper_le_test} /><Text>Left eye 2</Text><Field value={vision?.color_paper_le_retest} /></Line>
          <Line checked={colorAppDone} style={styles.indent}><Text>Yes (Application)</Text></Line>
          <Line style={styles.indent2}><Text>Right eye 1</Text><Field value={vision?.color_app_re_test} /><Text>Right eye 2</Text><Field value={vision?.color_app_re_retest} /></Line>
          <Line style={styles.indent2}><Text>Left eye 1</Text><Field value={vision?.color_app_le_test} /><Text>Left eye 2</Text><Field value={vision?.color_app_le_retest} /></Line>
          <Line checked={!colorPaperDone && !colorAppDone} style={styles.indent}><Text>No</Text></Line>
        </View>

        <View style={styles.numberedItem2}>
          <Text style={styles.bold}>12. Contrast discrimination testing</Text>
          <Line checked={contrastManualDone} style={styles.indent}><Text>Yes (Manual)</Text></Line>
          <Line style={styles.indent2}><Text>Right eye</Text><Field value={vision?.contrast_manual_re} /><Text>Left eye</Text><Field value={vision?.contrast_manual_le} /></Line>
          <Line checked={contrastAppDone} style={styles.indent}><Text>Yes (Application)</Text></Line>
          <Line style={styles.indent2}><Text>Right eye</Text><Field value={vision?.contrast_app_re} /><Text>Left eye</Text><Field value={vision?.contrast_app_le} /></Line>
          <Line checked={!contrastManualDone && !contrastAppDone} style={styles.indent}><Text>No</Text></Line>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.numberedItem2}>
          <Text style={styles.bold}>13. VA</Text>
          <Line style={styles.indent}><Text>a. Right eye</Text><Field value={vision?.va_re} /></Line>
          <Line style={styles.indent2}><Text>i. Right eye with pin hole</Text><Field value={vision?.va_re_pinhole} /></Line>
          <Line style={styles.indent}><Text>b. Left eye</Text><Field value={vision?.va_le} /></Line>
          <Line style={styles.indent2}><Text>i. Left eye with pin hole</Text><Field value={vision?.va_le_pinhole} /></Line>
          {!vaDone ? <Line style={styles.indent}><Field value="" minWidth={180} /></Line> : null}
        </View>

        <View style={styles.numberedItem2}>
          <Text style={styles.bold}>14. Sleep domain</Text>
          <Line checked={rbd?.total_score != null} style={styles.indent}><Text>RBD Questionnaire</Text><Field value={rbd?.total_score} /><Text>คะแนน</Text></Line>
          <Line checked={epw?.total_score != null} style={styles.indent}><Text>Epworth Sleepiness Scale</Text><Field value={epw?.total_score} /><Text>คะแนน</Text></Line>
          <Line checked={psgRequested.yes} style={styles.indent}><Text>Further PSG (RBD montage) request</Text></Line>
          <Line style={styles.indent2}><Cb checked={psgRequested.yes} /><Text>Yes at</Text><Field value={null} /><Cb checked={psgRequested.no} /><Text>No</Text></Line>
        </View>

        <View style={styles.numberedItem2}>
          <Text style={styles.bold}>15. Behavioral / psychiatric domain</Text>
          <Line checked={hamd?.total_score != null} style={styles.indent}>
            <Text>HAM-D</Text>
            <Field value={hamd?.total_score} />
            <Text>คะแนน</Text>
            {hamd?.severity_level ? <Text> ({hamd.severity_level})</Text> : null}
          </Line>
        </View>

        <View style={styles.numberedItem2}>
          <Text style={styles.bold}>16. Constipation</Text>
          <Line checked={rome4?.total_score != null} style={styles.indent}><Text>ROME IV</Text><Field value={rome4?.total_score} /><Text>คะแนน</Text></Line>
        </View>

        <Line style={styles.numberedItem2}>
          <Text style={styles.bold}>17. ADLs Questionnaire</Text>
          <Field value={diag?.adl_score} />
          <Text>คะแนน</Text>
        </Line>

        <Line style={styles.numberedItem2}>
          <Text style={styles.bold}>18. SCOPA AUT</Text>
          <Field value={diag?.scopa_aut_score} />
          <Text>คะแนน</Text>
        </Line>

        <View style={styles.numberedItem2}>
          <Text style={styles.bold}>19. Blood test</Text>
          <Line checked={false} style={styles.indent}><Text>Genetic test: GP2</Text></Line>
          <Line checked={!!diag?.blood_test_note} style={styles.indent}>
            <Text>+/- เก็บเลือดไว้ก่อน further blood test เช่น Serum RT-QuIC</Text>
          </Line>
          {diag?.blood_test_note ? <Line style={styles.indent}><Text>หมายเหตุ: {diag.blood_test_note}</Text></Line> : null}
        </View>

        <View style={styles.numberedItem2}>
          <Text style={styles.bold}>20. Further FDOPA PET scan request</Text>
          <Line style={styles.indent}>
            <Cb checked={fdopa.yes} />
            <Text>Yes{diag?.fdopa_pet_score ? ` - Score: ${diag.fdopa_pet_score}` : ' at'}</Text>
            {!fdopa.yes ? <Field value={null} /> : null}
            <Cb checked={fdopa.no} />
            <Text>No</Text>
          </Line>
        </View>
      </Page>
    </Document>
  )
}

export type { QaPdfDocumentProps }
