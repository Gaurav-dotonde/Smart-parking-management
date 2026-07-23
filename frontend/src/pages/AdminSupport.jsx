import React, { useEffect, useMemo, useState } from 'react';
import { getAdminSupportTickets, updateSupportTicket } from '../services/supportService';

const statusLabel = (value = 'OPEN') => value.replace('_', ' ');
const initials = (name = 'User') => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');

  const load = () => {
    setLoading(true);
    setError('');
    getAdminSupportTickets()
      .then((response) => setTickets(response.data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load support requests.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    all: tickets.length,
    open: tickets.filter((ticket) => ticket.status === 'OPEN').length,
    progress: tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length,
    resolved: tickets.filter((ticket) => ticket.status === 'RESOLVED').length,
  }), [tickets]);

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesStatus = filter === 'ALL' || ticket.status === filter;
      const matchesText = !text || [ticket.id, ticket.userName, ticket.userEmail, ticket.subject, ticket.category]
        .some((value) => String(value || '').toLowerCase().includes(text));
      return matchesStatus && matchesText;
    });
  }, [tickets, query, filter]);

  const openTicket = (ticket) => {
    setSelected(ticket);
    setReply(ticket.adminReply || '');
  };

  const update = async (status) => {
    setSaving(true);
    try {
      await updateSupportTicket(selected.id, { status, adminReply: reply });
      setSelected(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the ticket.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-support-page">
      <section className="support-admin-hero">
        <div>
          <span className="support-admin-eyebrow">Customer care workspace</span>
          <h2>Help users, faster.</h2>
          <p>Review incoming requests, reply to users, and keep every issue moving toward resolution.</p>
        </div>
        <div className="support-admin-hero-art" aria-hidden="true">
          <span>?</span>
          <i />
          <b />
        </div>
      </section>

      <section className="support-admin-stats">
        <article className="tone-blue"><span className="support-stat-icon">◎</span><div><small>Total requests</small><strong>{counts.all}</strong><p>All support tickets</p></div></article>
        <article className="tone-amber"><span className="support-stat-icon">!</span><div><small>Open</small><strong>{counts.open}</strong><p>Needs attention</p></div></article>
        <article className="tone-purple"><span className="support-stat-icon">↻</span><div><small>In progress</small><strong>{counts.progress}</strong><p>Being handled</p></div></article>
        <article className="tone-green"><span className="support-stat-icon">✓</span><div><small>Resolved</small><strong>{counts.resolved}</strong><p>Successfully closed</p></div></article>
      </section>

      <section className="admin-data-card support-admin-list-card">
        <div className="support-admin-list-head">
          <div><span className="support-admin-eyebrow">Inbox</span><h3>Support Requests</h3><p>Manage user questions and payment assistance.</p></div>
          <button type="button" className="admin-secondary-button" onClick={load}>↻ Refresh</button>
        </div>

        <div className="support-admin-toolbar">
          <label className="support-admin-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ticket, user, email or subject..." /></label>
          <div className="support-admin-filters">
            {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((status) => (
              <button key={status} type="button" className={filter === status ? 'active' : ''} onClick={() => setFilter(status)}>
                {statusLabel(status)} <span>{status === 'ALL' ? counts.all : status === 'OPEN' ? counts.open : status === 'IN_PROGRESS' ? counts.progress : counts.resolved}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="error-text support-admin-error">{error}</p>}
        {loading ? <div className="support-admin-loading"><span className="booking-details-spinner" /><p>Loading support requests...</p></div> :
          visible.length === 0 ? <div className="support-admin-empty"><span>✓</span><h3>All clear!</h3><p>No support requests match this view.</p></div> :
          <div className="support-ticket-list">
            {visible.map((ticket) => (
              <article className="support-ticket-row" key={ticket.id}>
                <div className="support-ticket-avatar">{initials(ticket.userName)}</div>
                <div className="support-ticket-main">
                  <div className="support-ticket-title"><strong>{ticket.subject}</strong><span className={`support-category ${ticket.category.toLowerCase()}`}>{ticket.category}</span></div>
                  <p>{ticket.message}</p>
                  <div className="support-ticket-meta"><span>#{String(ticket.id).padStart(4, '0')}</span><span>{ticket.userName}</span><span>{ticket.userEmail}</span><span>{new Date(ticket.createdAt).toLocaleString()}</span></div>
                </div>
                <div className="support-ticket-actions">
                  <span className={`support-status ${ticket.status.toLowerCase()}`}><i />{statusLabel(ticket.status)}</span>
                  <button type="button" onClick={() => openTicket(ticket)}>Review <span>→</span></button>
                </div>
              </article>
            ))}
          </div>
        }
        <div className="support-admin-footer">Showing <strong>{visible.length}</strong> of {tickets.length} requests</div>
      </section>

      {selected && (
        <div className="support-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <div className="support-modal support-review-modal">
            <div className="support-modal-head">
              <div><span>Ticket #{String(selected.id).padStart(4, '0')}</span><h3>{selected.subject}</h3></div>
              <button type="button" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="support-review-user"><div className="support-ticket-avatar">{initials(selected.userName)}</div><div><strong>{selected.userName}</strong><span>{selected.userEmail} · {selected.category}</span></div><span className={`support-status ${selected.status.toLowerCase()}`}>{statusLabel(selected.status)}</span></div>
            <div className="support-review-message"><span>User message</span><p>{selected.message}</p></div>
            <label>Reply to user<textarea rows="4" value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a helpful response or resolution note..." /></label>
            <div className="support-modal-actions">
              <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => update('IN_PROGRESS')}>Mark in progress</button>
              <button type="button" className="btn" disabled={saving} onClick={() => update('RESOLVED')}>{saving ? 'Saving...' : 'Resolve ticket'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
