import { useState } from 'react';
import {
  API_ORIGIN,
  generateTemplateOutreach,
  getOutreachPrompt,
  updateCrmStatus,
  generateReport,
} from '../api';

function severityWeight(severity) {
  return { high: 3, medium: 2, low: 1 }[severity] || 0;
}

function tierColor(tier) {
  return { high: '#e74c3c', medium: '#e67e22', low: '#7f8c8d' }[tier] || '#7f8c8d';
}

const STATUS_OPTIONS = [
  { value: 'not_contacted', label: 'Not Contacted' },
  { value: 'dm_sent', label: 'DM Sent' },
  { value: 'email_sent', label: 'Email Sent' },
  { value: 'follow_up_1', label: 'Follow-up 1' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

function statusColor(status) {
  return {
    not_contacted: '#7f8c8d',
    dm_sent: '#2980b9',
    email_sent: '#2980b9',
    follow_up_1: '#8e44ad',
    meeting: '#f39c12',
    proposal: '#f39c12',
    won: '#27ae60',
    lost: '#c0392b',
  }[status] || '#7f8c8d';
}

function OutreachCell({ business }) {
  const [loading, setLoading] = useState(null); // 'draft' | 'prompt' | 'pdf' | null
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState(null);

  async function handleDraft() {
    setLoading('draft');
    setStatus(null);
    try {
      const msg = await generateTemplateOutreach(business.id);
      setDraft(msg.body);
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setLoading(null);
    }
  }

  async function handleCopyPrompt() {
    setLoading('prompt');
    setStatus(null);
    try {
      const { prompt } = await getOutreachPrompt(business.id);
      await navigator.clipboard.writeText(prompt);
      setStatus({ type: 'success', text: 'Prompt copied — paste into Claude.ai' });
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setLoading(null);
    }
  }

  async function handlePdf() {
    setLoading('pdf');
    setStatus(null);
    try {
      const { reportPath } = await generateReport(business.id);
      window.open(`${API_ORIGIN}${reportPath}`, '_blank');
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="outreach-cell">
      <div className="outreach-actions">
        <button onClick={handleDraft} disabled={loading !== null}>
          {loading === 'draft' ? '...' : 'Draft'}
        </button>
        <button onClick={handleCopyPrompt} disabled={loading !== null}>
          {loading === 'prompt' ? '...' : 'Copy AI Prompt'}
        </button>
        <button onClick={handlePdf} disabled={loading !== null || business.audit?.status !== 'done'}>
          {loading === 'pdf' ? '...' : 'PDF'}
        </button>
      </div>

      {status && (
        <p className={`outreach-status ${status.type === 'error' ? 'error' : ''}`}>{status.text}</p>
      )}

      {draft && (
        <details className="outreach-draft" open>
          <summary>Draft message</summary>
          <pre>{draft}</pre>
        </details>
      )}
    </div>
  );
}

function CrmCell({ business, onStatusChange }) {
  const currentStatus = business.crmStatus?.status || 'not_contacted';
  const [saving, setSaving] = useState(false);

  async function handleChange(e) {
    const newStatus = e.target.value;
    setSaving(true);
    try {
      const updated = await updateCrmStatus(business.id, newStatus);
      onStatusChange(business.id, updated);
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={currentStatus}
      onChange={handleChange}
      disabled={saving}
      style={{ color: statusColor(currentStatus), fontWeight: 600, borderColor: statusColor(currentStatus) }}
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export default function ResultsTable({ businesses, onStatusChange }) {
  if (!businesses.length) return null;

  return (
    <div classname="table-wrapper">
      <table className="results-table">
        <thead>
          <tr>
            <th>Business Name</th>
            <th>Address</th>
          <th>Phone</th>
          <th>Website</th>
          <th>Source</th>
          <th>Score</th>
          <th>Preview</th>
          <th>Top Opportunity</th>
          <th>Priority</th>
          <th>Outreach</th>
          <th>CRM Status</th>
          <th>New?</th>
        </tr>
      </thead>
      <tbody>
        {businesses.map((b) => {
          let priorityReasoning = null;
          try {
            priorityReasoning = b.priorityScore?.reasoning ? JSON.parse(b.priorityScore.reasoning) : null;
          } catch {
            priorityReasoning = null;
          }

          return (
            <tr key={b.id}>
              <td data-label="Business Name">{b.name}</td>
              <td data-label="Address">{b.address || '—'}</td>
              <td data-label="Phone">{b.phone || '—'}</td>
              <td data-label="Website">
                {b.websiteUrl ? (
                  <a href={b.websiteUrl} target="_blank" rel="noreferrer">
                    {b.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                ) : (
                  '—'
                )}
              </td>
              <td data-label="Source">
                {b.websiteSource === 'foursquare' &&
                  (b.websiteConfidence !== null ? `Confirmed (${b.websiteConfidence}%)` : 'Confirmed')}
                {b.websiteSource === 'guessed' && `Guessed (${b.websiteConfidence}%)`}
                {!b.websiteSource && '—'}
              </td>
              <td data-label="Score">
                {!b.websiteUrl && '—'}
                {b.websiteUrl && !b.audit && b.websiteConfidence !== null && b.websiteConfidence < 50 && (
                  <span title="Website confidence too low to audit reliably" style={{ color: '#7f8c8d' }}>
                    Skipped (low confidence)
                  </span>
                )}
                {b.websiteUrl && !b.audit && (b.websiteConfidence === null || b.websiteConfidence >= 50) && 'Pending'}
                {b.audit?.status === 'failed' && 'Failed'}
                {b.audit?.status === 'no_website' && '—'}
                {b.audit?.status === 'done' && (
                  <>
                    {b.audit.overallScore}/100
                    {b.websiteConfidence !== null && b.websiteConfidence < 60 && (
                      <span title="Low confidence this is the correct website" style={{ color: '#e67e22' }}>
                        {' '}⚠
                      </span>
                    )}
                  </>
                )}
              </td>
              <td data-label="Preview">
                {b.audit?.screenshotDesktopPath && (
                  <a href={`${API_ORIGIN}${b.audit.screenshotDesktopPath}`} target="_blank" rel="noreferrer">
                    Desktop
                  </a>
                )}
                {b.audit?.screenshotDesktopPath && b.audit?.screenshotMobilePath && ' | '}
                {b.audit?.screenshotMobilePath && (
                  <a href={`${API_ORIGIN}${b.audit.screenshotMobilePath}`} target="_blank" rel="noreferrer">
                    Mobile
                  </a>
                )}
                {!b.audit?.screenshotDesktopPath && !b.audit?.screenshotMobilePath && '—'}
              </td>
              <td data-label="Top Opportunity">
                {b.opportunities?.length
                  ? [...b.opportunities].sort(
                      (a, c) => severityWeight(c.severity) - severityWeight(a.severity)
                    )[0].text
                  : '—'}
              </td>
              <td data-label="Priority">
                {b.priorityScore ? (
                  <span
                    title={priorityReasoning?.reasons?.join(' • ') || ''}
                    style={{ color: tierColor(priorityReasoning?.tier), fontWeight: 600 }}
                  >
                    {b.priorityScore.score} ({priorityReasoning?.tier?.toUpperCase() || '—'})
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td data-label="Outreach">
                <OutreachCell business={b} />
              </td>
              <td data-label="CRM Status">
                <CrmCell business={b} onStatusChange={onStatusChange} />
              </td>
              <td data-label="New?">{b.isNew ? 'Yes' : 'Seen before'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}