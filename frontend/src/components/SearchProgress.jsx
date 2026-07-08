const STEP_LABELS = {
  pending: 'Starting search...',
  collecting: 'Collecting businesses...',
  guessing: 'Looking for missing websites...',
  verifying: 'Verifying website matches...',
  auditing: 'Auditing websites...',
  prioritizing: 'Ranking leads...',
};

const STEP_ORDER = ['pending', 'collecting', 'guessing', 'verifying', 'auditing', 'prioritizing'];

export default function SearchProgress({ status }) {
  const stepIndex = STEP_ORDER.indexOf(status.status);
  const percent = stepIndex >= 0 ? ((stepIndex + 1) / STEP_ORDER.length) * 100 : 0;

  const auditProgress =
    status.status === 'auditing' && status.totalBusinesses > 0
      ? ` (${status.auditedCount}/${status.totalBusinesses})`
      : '';

  return (
    <div className="search-progress">
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="status">
        {STEP_LABELS[status.status] || status.status}
        {auditProgress}
      </p>
    </div>
  );
}