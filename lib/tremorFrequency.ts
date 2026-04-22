function extractSensorSeries(recordData: any) {
  if (!recordData?.recording?.recordedData) return null;

  const rows = recordData.recording.recordedData;

  return rows
    .map((row: any) => {
      const d = row.data;
      if (!Array.isArray(d) || d.length < 6) return null;

      return {
        ts: row.ts,
        gx: Number(d[3]),
        gy: Number(d[4]),
        gz: Number(d[5]),
      };
    })
    .filter(Boolean);
}

export function calculateTremorFrequency(recordData: any): number | null {
  const series = extractSensorSeries(recordData);
  if (!series || series.length < 20) return null;

  const magnitudes: number[] = [];
  const timestamps: number[] = [];

  for (const s of series) {
    const mag = Math.sqrt(s.gx * s.gx + s.gy * s.gy + s.gz * s.gz);
    magnitudes.push(mag);
    timestamps.push(s.ts);
  }

  const diffs = [];
  for (let i = 1; i < timestamps.length; i++) {
    diffs.push(timestamps[i] - timestamps[i - 1]);
  }

  const avgSec = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const fs = 1 / avgSec;
  if (!fs || fs < 5 || fs > 200) return null;

  const N = magnitudes.length;
  const windowed = magnitudes.map(
    (v, i) => v * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (N - 1)))
  );

  const re = new Array(N).fill(0);
  const im = new Array(N).fill(0);

  for (let k = 0; k < N; k++) {
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      re[k] += windowed[n] * Math.cos(angle);
      im[k] -= windowed[n] * Math.sin(angle);
    }
  }

  const mags = re.map((r, i) => Math.sqrt(r * r + im[i] * im[i]));

  let peakFreq = 0;
  let peakMag = 0;

  for (let i = 1; i < N / 2; i++) {
    const freq = (i * fs) / N;
    if (freq < 2 || freq > 12) continue;

    if (mags[i] > peakMag) {
      peakMag = mags[i];
      peakFreq = freq;
    }
  }

  return peakFreq ? Number(peakFreq.toFixed(2)) : null;
}
