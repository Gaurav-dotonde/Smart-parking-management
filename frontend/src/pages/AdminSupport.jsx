import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getAdminUsers } from '../services/userService';
import {
  getAdminSupportSummary,
  getAdminSupportTickets,
  getAdminSupportTicket,
  updateSupportTicket,
  replyAdminSupportTicket,
  addSupportInternalNote,
  resolveSupportTicket,
  closeAdminSupportTicket,
  reopenAdminSupportTicket,
} from '../services/supportService';

const statusOptions = ['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED', 'CANCELLED'];
const priorityOptions = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const statusLabel = (value = 'OPEN') => value.replaceAll('_', ' ');
const categoryLabel = (value = '') => value.replaceAll('_', ' ');
const formatDateTime = (value) => (value ? new Date(value).toLocaleString([], {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}) : 'Not available');

const statusClass = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  WAITING_FOR_USER: 'waiting',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  CANCELLED: 'closed',
};

const formatTicketId = (ticket) => ticket?.ticketNumber || `SUP-${String(ticket?.id || '').padStart(6, '0')}`;

function buildFormData(payload, files = []) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      formData.append(key, value);
    }
  });
  files.filter(Boolean).forEach((file) => formData.append('attachments', file));
  return formData;
}

function canTransition(current, next) {
  if (current === next) return true;
  const transitions = {
    OPEN: ['IN_PROGRESS', 'WAITING_FOR_USER'],
    IN_PROGRESS: ['WAITING_FOR_USER', 'RESOLVED'],
    WAITING_FOR_USER: ['IN_PROGRESS', 'RESOLVED'],
    RESOLVED: [],
    CLOSED: [], CANCELLED: [],
  };
  return transitions[current]?.includes(next);
}

function validTransitions(current) {
  const transitions = {
    OPEN: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER'],
    IN_PROGRESS: ['IN_PROGRESS', 'WAITING_FOR_USER'],
    WAITING_FOR_USER: ['WAITING_FOR_USER', 'IN_PROGRESS'],
    RESOLVED: ['RESOLVED'], CLOSED: ['CLOSED'], CANCELLED: ['CANCELLED'],
  };
  return transitions[current] || ['OPEN'];
}

function TicketStatus({ status }) {
  const key = status || 'OPEN';
  return <span className={`support-status ${statusClass[key] || 'open'}`}>{statusLabel(key)}</span>;
}

function SupportSummaryIcon({ type }) {
  const paths = {
    OPEN: <><circle cx="12" cy="12" r="7" /><path d="M12 8v4l2.5 2" /></>,
    IN_PROGRESS: <><circle cx="12" cy="12" r="7" /><path d="M9 12h6M12 9v6" /></>,
    WAITING_FOR_USER: <><path d="M5 12a7 7 0 1 0 2-5" /><path d="M5 5v4h4" /></>,
    URGENT: <><path d="M12 4 4 19h16L12 4Z" /><path d="M12 9v4m0 3h.01" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[type] || paths.OPEN}</svg>;
}

export default function AdminSupport() {
  const [summary, setSummary] = useState({ totalTickets: 0, open: 0, inProgress: 0, waiting: 0, resolved: 0, closed: 0, todayTickets: 0 });
  const [ticketsPage, setTicketsPage] = useState({ content: [], page: 0, size: 10, totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [replyFiles, setReplyFiles] = useState([]);
  const [replySaving, setReplySaving] = useState(false);
  const [updateSaving, setUpdateSaving] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [actionSaving, setActionSaving] = useState(false);
  const [detailState, setDetailState] = useState({
    status: 'OPEN',
    priority: 'MEDIUM',
    assignedToId: '',
    internalNotes: '',
  });
  const tableRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    getAdminUsers()
      .then((response) => {
        if (!mounted) return;
        setAdminUsers((response.data || []).filter((user) => user.role === 'ADMIN' || user.role === 'ADMINISTRATOR' || user.role === 'SUPER_ADMIN'));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setListLoading(true);
    Promise.all([
      getAdminSupportSummary(),
      getAdminSupportTickets({
        page,
        size: 10,
        query: query || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
          priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
          assignedToId: assigneeFilter === 'UNASSIGNED' ? -1 : !['ALL', 'ME'].includes(assigneeFilter) ? assigneeFilter : undefined,
          assignedToMe: assigneeFilter === 'ME' || undefined,
        }),
    ])
      .then(([summaryResponse, ticketsResponse]) => {
        if (!mounted) return;
        setSummary(summaryResponse.data || {});
        setTicketsPage(ticketsResponse.data || { content: [] });
        setError('');
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.response?.data?.message || 'Could not load support tickets.');
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
          setListLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [page, query, statusFilter, priorityFilter, assigneeFilter]);

  const summaryCards = useMemo(() => ([
    { label: 'Open', value: summary.open || 0, tone: 'amber', filter: 'OPEN' },
    { label: 'In Progress', value: summary.inProgress || 0, tone: 'orange', filter: 'IN_PROGRESS' },
    { label: 'Waiting For User', value: summary.waitingForUser || 0, tone: 'purple', filter: 'WAITING_FOR_USER' },
    { label: 'Urgent', value: summary.urgent || 0, tone: 'amber', filter: 'ALL', priority: 'URGENT' },
  ]), [summary]);

  const handleSummaryCardClick = (card) => {
    setPage(0);
    setStatusFilter(card.filter);
    setPriorityFilter(card.priority || 'ALL');
    setAssigneeFilter(card.assignee || 'ALL');
    requestAnimationFrame(() => {
      tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openTicket = async (ticket) => {
    setDetailLoading(true);
    setDetailError('');
    try {
      const response = await getAdminSupportTicket(ticket.id);
      const detail = response.data || null;
      setSelectedTicket(detail);
      setDetailState({
        status: detail?.status || 'OPEN',
        priority: detail?.priority || 'MEDIUM',
        assignedToId: detail?.assignedToName ? String(adminUsers.find((user) => user.name === detail.assignedToName)?.id || '') : '',
        internalNotes: '',
      });
      setReplyText('');
      setReplyFiles([]);
      setResolutionSummary(detail?.resolutionSummary || '');
    } catch (err) {
      setDetailError(err.response?.data?.message || 'Could not open ticket.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedTicket) return;
    if (!canTransition(selectedTicket.status, detailState.status)) {
      setDetailError(`Invalid status transition from ${selectedTicket.status} to ${detailState.status}.`);
      return;
    }
    setUpdateSaving(true);
    setDetailError('');
    try {
      const response = await updateSupportTicket(selectedTicket.id, {
        status: detailState.status,
        priority: detailState.priority,
        assignedToId: detailState.assignedToId ? Number(detailState.assignedToId) : null,
        internalNotes: detailState.internalNotes,
      });
      setSelectedTicket(response.data || selectedTicket);
      await loadData(page);
    } catch (err) {
      setDetailError(err.response?.data?.message || 'Could not update the ticket.');
    } finally {
      setUpdateSaving(false);
    }
  };

  const sendReply = async (event) => {
    event.preventDefault();
    if (!selectedTicket) return;
    if (!replyText.trim()) {
      setDetailError('Reply message is required.');
      return;
    }
    setReplySaving(true);
    setDetailError('');
    try {
      const response = await replyAdminSupportTicket(selectedTicket.id, buildFormData({ message: replyText.trim() }, replyFiles));
      setSelectedTicket(response.data || selectedTicket);
      setReplyText('');
      setReplyFiles([]);
      await loadData(page);
    } catch (err) {
      setDetailError(err.response?.data?.message || 'Could not send reply.');
    } finally {
      setReplySaving(false);
    }
  };

  const selectedStatusOptions = validTransitions(selectedTicket?.status || 'OPEN');

  const runAction = async (action, successMessage) => {
    if (!selectedTicket || actionSaving) return;
    setActionSaving(true); setDetailError('');
    try {
      const response = await action();
      setSelectedTicket(response.data);
      setDetailState((current) => ({ ...current, status: response.data.status, internalNotes: '' }));
      await loadData(page);
      window.alert(successMessage);
    } catch (err) { setDetailError(err.response?.data?.message || 'Could not complete this action.'); }
    finally { setActionSaving(false); }
  };

  const resolveCurrent = () => {
    if (!resolutionSummary.trim()) return setDetailError('Resolution summary is required.');
    return runAction(() => resolveSupportTicket(selectedTicket.id, { resolutionSummary: resolutionSummary.trim() }), 'Ticket resolved successfully.');
  };

  const closeCurrent = () => {
    if (!window.confirm('Close this resolved ticket?')) return;
    runAction(() => closeAdminSupportTicket(selectedTicket.id), 'Ticket closed successfully.');
  };

  return (
    <div className="admin-support-page">
      <section className="support-admin-hero">
        <div>
          <span className="support-admin-eyebrow">Customer care workspace</span>
          <h2>Support Tickets</h2>
          <p>Track, reply and resolve user issues from one professional workspace.</p>
        </div>
        <div className="support-admin-hero-art" aria-hidden="true">
          <span>?</span>
          <i />
          <b />
        </div>
      </section>

      <section className="support-admin-stats support-admin-stats-grid">
        {summaryCards.map((card) => (
          <article
            key={card.label}
            className={`tone-${card.tone} support-admin-stat-card`}
            role="button"
            tabIndex={0}
            onClick={() => handleSummaryCardClick(card)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleSummaryCardClick(card);
              }
            }}
          >
            <span className="support-stat-icon"><SupportSummaryIcon type={card.filter === 'ALL' ? 'URGENT' : card.filter} /></span>
            <div>
              <small>{card.label}</small>
              <strong>{loading ? '...' : card.value}</strong>
              <p>Support overview</p>
            </div>
          </article>
        ))}
      </section>

      <section className="admin-data-card support-admin-list-card">
        <div className="support-admin-list-head">
          <div>
            <span className="support-admin-eyebrow">Inbox</span>
            <h3>Support Tickets</h3>
            <p>Manage user questions, replies and issue resolution.</p>
          </div>
        </div>

        <div className="support-admin-toolbar">
          <label className="support-admin-search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
            <input value={query} onChange={(event) => { setPage(0); setQuery(event.target.value); }} placeholder="Search ticket, user, email, booking or subject..." />
          </label>
          <div className="support-admin-filters support-admin-filters-wrap">
            <select value={statusFilter} onChange={(event) => { setPage(0); setStatusFilter(event.target.value); }}>
              {statusOptions.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </select>

            <select value={priorityFilter} onChange={(event) => { setPage(0); setPriorityFilter(event.target.value); }}>
              {priorityOptions.map((priority) => <option key={priority} value={priority}>{priority === 'ALL' ? 'All Priorities' : priority}</option>)}
            </select>
            <select value={assigneeFilter} onChange={(event) => { setPage(0); setAssigneeFilter(event.target.value); }}>
              <option value="ALL">All Assignees</option><option value="ME">Assigned to me</option><option value="UNASSIGNED">Unassigned</option>
              {adminUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="error-text support-admin-error">{error}</p>}
        {listLoading ? (
          <div className="support-admin-loading"><span className="booking-details-spinner" /><p>Loading support tickets...</p></div>
        ) : ticketsPage.content?.length === 0 ? (
          <div className="support-admin-empty"><span>OK</span><h3>No tickets found</h3><p>No support requests match this view.</p></div>
        ) : (
          <div ref={tableRef} className="dashboard-table-wrap admin-responsive-table support-admin-table-wrap">
            <table className="dashboard-table support-admin-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>User</th>
                  <th>Category</th>
                  <th>Booking ID</th>
                  <th>Transaction ID</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Assigned To</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {ticketsPage.content.map((ticket) => (
                  <tr key={ticket.id}>
                    <td><strong>{formatTicketId(ticket)}</strong></td>
                    <td>
                      <strong>{ticket.userName}</strong>
                      <div className="payments-subline">{ticket.userEmail}</div>
                    </td>
                    <td>{categoryLabel(ticket.category)}</td>
                    <td>{ticket.bookingId || 'N/A'}</td>
                    <td>{ticket.transactionId || 'N/A'}</td>
                    <td>{ticket.priority}</td>
                    <td><TicketStatus status={ticket.status} /></td>
                    <td>{formatDateTime(ticket.createdAt)}</td>
                    <td>{ticket.assignedToName || 'Unassigned'}</td>
                    <td>
                      <button type="button" className="btn btn-secondary support-view-btn" onClick={() => openTicket(ticket)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="support-pagination">
          <span>Showing {ticketsPage.content?.length || 0} of {ticketsPage.totalElements || 0} tickets</span>
          <div className="support-pagination-actions">
            <button type="button" className="btn btn-secondary" disabled={page <= 0} onClick={() => setPage((current) => Math.max(current - 1, 0))}>Previous</button>
            <span className="support-pagination-page">Page {ticketsPage.page + 1} of {ticketsPage.totalPages || 1}</span>
            <button type="button" className="btn btn-secondary" disabled={ticketsPage.last} onClick={() => setPage((current) => current + 1)}>Next</button>
          </div>
        </div>
      </section>

      {selectedTicket && (
        <div className="support-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedTicket(null); }}>
          <div className="support-modal support-review-modal support-admin-detail-modal">
            <div className="support-modal-head">
              <div>
                <span>{formatTicketId(selectedTicket)}</span>
                <h3>{selectedTicket.subject}</h3>
              </div>
              <button type="button" onClick={() => setSelectedTicket(null)} aria-label="Close">&times;</button>
            </div>

            {detailLoading ? (
              <div className="support-admin-loading"><span className="booking-details-spinner" /><p>Loading ticket details...</p></div>
            ) : (
              <>
                {detailError && <p className="error-text">{detailError}</p>}

                <div className="support-review-user">
                  <div className="support-ticket-avatar">{(selectedTicket.userName || 'User').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
                  <div>
                    <strong>{selectedTicket.userName}</strong>
                    <span>{selectedTicket.userEmail} &middot; {categoryLabel(selectedTicket.category)}</span>
                  </div>
                  <TicketStatus status={selectedTicket.status} />
                </div>

                <div className="support-ticket-meta-grid">
                  <div><strong>Ticket ID</strong><span>{formatTicketId(selectedTicket)}</span></div>
                  <div><strong>Booking ID</strong><span>{selectedTicket.bookingId || 'N/A'}</span></div>
                  <div><strong>Transaction ID</strong><span>{selectedTicket.transactionId || 'N/A'}</span></div>
                  <div><strong>Created Date</strong><span>{formatDateTime(selectedTicket.createdAt)}</span></div>
                  <div><strong>Last Updated</strong><span>{formatDateTime(selectedTicket.updatedAt || selectedTicket.createdAt)}</span></div>
                  <div><strong>Priority</strong><span>{selectedTicket.priority}</span></div>
                  <div><strong>Assigned Admin</strong><span>{selectedTicket.assignedToName || 'Unassigned'}</span></div>
                  <div><strong>Resolved Date</strong><span>{formatDateTime(selectedTicket.resolvedAt)}</span></div>
                  <div><strong>Closed Date</strong><span>{formatDateTime(selectedTicket.closedAt)}</span></div>
                </div>

                <div className="support-review-message">
                  <span>User message</span>
                  <p>{selectedTicket.message}</p>
                </div>

                {Array.isArray(selectedTicket.attachments) && selectedTicket.attachments.length > 0 && (
                  <div className="support-attachment-list">
                    <span>Attachments</span>
                    {selectedTicket.attachments.map((attachment) => (
                      <a key={attachment.id} href={attachment.fileUrl} target="_blank" rel="noreferrer">
                        {attachment.originalFileName}
                      </a>
                    ))}
                  </div>
                )}

                <div className="support-admin-form-grid">
                  <label>
                    Status
                    <select value={detailState.status} onChange={(event) => setDetailState((current) => ({ ...current, status: event.target.value }))}>
                      {selectedStatusOptions.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                    </select>
                  </label>
                  <label>
                    Priority
                    <select value={detailState.priority} onChange={(event) => setDetailState((current) => ({ ...current, priority: event.target.value }))}>
                      {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                    </select>
                  </label>
                  <label>
                    Assigned To
                    <select value={detailState.assignedToId} onChange={(event) => setDetailState((current) => ({ ...current, assignedToId: event.target.value }))}>
                      <option value="">Unassigned</option>
                      {adminUsers.map((user) => <option key={user.id} value={user.id}>{user.name} ({user.email})</option>)}
                    </select>
                  </label>
                  <label className="support-full-width">
                    Add Internal Note
                    <textarea rows={4} value={detailState.internalNotes} onChange={(event) => setDetailState((current) => ({ ...current, internalNotes: event.target.value }))} placeholder="Internal notes for the admin team only" />
                  </label>
                </div>

                {selectedTicket.internalNotes?.length > 0 && <div className="support-message-block"><span>Internal note history</span>{selectedTicket.internalNotes.map((note) => <p key={note.id}><strong>{note.authorName}</strong> &middot; {formatDateTime(note.createdAt)}<br />{note.note}</p>)}</div>}

                {selectedTicket.resolutionSummary && <div className="support-message-block"><span>Resolution Summary</span><p>{selectedTicket.resolutionSummary}</p></div>}

                <div className="support-conversation">
                  <h4>Conversation</h4>
                  {Array.isArray(selectedTicket.messages) && selectedTicket.messages.length > 0 ? (
                    selectedTicket.messages.map((message) => (
                      <article key={message.id} className={`support-conversation-item role-${message.senderRole?.toLowerCase() || 'user'}`}>
                        <div className="support-conversation-meta">
                          <strong>{message.senderName}</strong>
                          <span>{message.senderRole}</span>
                          <time>{formatDateTime(message.createdAt)}</time>
                        </div>
                        <p>{message.message}</p>
                        {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                          <div className="support-message-attachments">
                            {message.attachments.map((attachment) => (
                              <a key={attachment.id} href={attachment.fileUrl} target="_blank" rel="noreferrer">{attachment.originalFileName}</a>
                            ))}
                          </div>
                        )}
                      </article>
                    ))
                  ) : (
                    <div className="support-empty-state">No conversation yet.</div>
                  )}
                </div>

                <label className="support-full-width">
                  Reply to user
                  <textarea rows={4} value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder="Write a helpful response..." />
                </label>
                <label className="support-full-width">
                  Upload attachment
                  <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(event) => setReplyFiles(Array.from(event.target.files || []))} />
                </label>

                <div className="support-modal-actions">
                  <button type="button" className="btn btn-secondary" disabled={updateSaving} onClick={handleUpdate}>
                    {updateSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  {selectedTicket.canReply && <button type="button" className="btn" disabled={replySaving} onClick={sendReply}>
                    {replySaving ? 'Sending...' : 'Send Reply'}
                  </button>}
                </div>

                <div className="support-conversation">
                  <h4>Activity Timeline</h4>
                  {selectedTicket.history?.map((item) => <article key={item.id} className="support-conversation-item">
                    <div className="support-conversation-meta"><strong>{item.changedByName}</strong><span>{item.previousStatus || 'NEW'} to {item.newStatus}</span><time>{formatDateTime(item.createdAt)}</time></div>
                    <p>{item.note}</p>
                  </article>)}
                </div>

                {['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER'].includes(selectedTicket.status) && <div className="support-message-block">
                  <span>Resolve Ticket</span>
                  <textarea rows={3} value={resolutionSummary} onChange={(event) => setResolutionSummary(event.target.value)} placeholder="Required resolution summary" />
                  <button type="button" className="btn" disabled={actionSaving} onClick={resolveCurrent}>{actionSaving ? 'Resolving...' : 'Resolve Ticket'}</button>
                </div>}
                {selectedTicket.status === 'RESOLVED' && <div className="support-modal-actions">
                  <button type="button" className="btn btn-secondary" disabled={actionSaving} onClick={() => runAction(() => reopenAdminSupportTicket(selectedTicket.id), 'Ticket reopened successfully.')}>Reopen Ticket</button>
                  <button type="button" className="btn" disabled={actionSaving} onClick={closeCurrent}>Close Ticket</button>
                </div>}
                {selectedTicket.status === 'CLOSED' && <button type="button" className="btn btn-secondary" disabled={actionSaving} onClick={() => runAction(() => reopenAdminSupportTicket(selectedTicket.id), 'Ticket reopened successfully.')}>Reopen Ticket</button>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

