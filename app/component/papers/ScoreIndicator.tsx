import { getScoreStatus } from './utils';
import { assessmentLabels, assessmentDescriptions } from './constants';

interface ScoreIndicatorProps {
  score: number | null;
  assessmentKey: keyof typeof assessmentLabels;
}

const ScoreIndicator = ({ score, assessmentKey }: ScoreIndicatorProps) => {
  const status = getScoreStatus(score);
  const label = assessmentLabels[assessmentKey];
  const description = assessmentDescriptions[assessmentKey];

  return (
    <div
      className={`inline-flex items-center justify-center min-w-[2.5rem] h-10 px-2 rounded-lg text-sm font-medium mr-2 mb-2 transition-all duration-200 ${
        status === 'completed'
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
          : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
      }`}
      title={`${label}: ${description}\nคะแนน: ${score !== null ? score : 'ยังไม่ทำแบบทดสอบ'}`}
    >
      <div className="text-center">
        <div className="text-xs font-semibold">{label}</div>
        <div className="text-sm">{score !== null ? score : '-'}</div>
      </div>
    </div>
  );
};

export default ScoreIndicator;