import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getAdminSupportSummary,
  getAdminSupportTickets,
  getAdminSupportTicket,
  closeAdminSupportTicket,
  replyAdminSupportTicket,
  resolveSupportTicket,
  updateSupportTicket,
} from '../services/supportService';

const statusOptions = ['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED'];
const priorityOptions = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const formStatusOptions = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const categoryOptions = [
  'ALL',
  'PAYMENT_ISSUE',
  'BOOKING_ISSUE',
  'REFUND_ISSUE',
  'CHECK_IN_ISSUE',
  'CHECK_OUT_ISSUE',
  'PARKING_SLOT_ISSUE',
  'TECHNICAL_ISSUE',
  'ACCOUNT_ISSUE',
  'OTHER',
];

const statusLabel = (value = 'OPEN') => value.replaceAll('_', ' ');
const formStatusLabel = (value = 'OPEN') => ({
  OPEN: 'Pending',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}[value] || statusLabel(value));
const categoryLabel = (value = '') => value.replaceAll('_', ' ');
const priorityLabel = (value = 'MEDIUM') => value.replaceAll('_', ' ');
const formatTicketId = (ticket) => ticket?.ticketNumber || `SUP-${String(ticket?.id || '').padStart(6, '0')}`;
const safeText = (value, fallback = 'N/A') => (value && String(value).trim() ? value : fallback);

const formatDateTime = (value) => {
  if (!value) return 'Not available';
  return new Date(value).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusToneClass = {
  OPEN: 'is-open',
  IN_PROGRESS: 'is-progress',
  WAITING_FOR_USER: 'is-waiting',
  RESOLVED: 'is-resolved',
  CLOSED: 'is-closed',
};

const priorityToneClass = {
  LOW: 'is-low',
  MEDIUM: 'is-medium',
  HIGH: 'is-high',
  URGENT: 'is-urgent',
};

const categoryToneClass = {
  PAYMENT_ISSUE: 'is-blue',
  BOOKING_ISSUE: 'is-cyan',
  REFUND_ISSUE: 'is-indigo',
  CHECK_IN_ISSUE: 'is-emerald',
  CHECK_OUT_ISSUE: 'is-amber',
  PARKING_SLOT_ISSUE: 'is-violet',
  TECHNICAL_ISSUE: 'is-slate',
  ACCOUNT_ISSUE: 'is-rose',
  OTHER: 'is-gray',
};

const getInitials = (name = 'User') => name
  .split(' ')
  .filter(Boolean)
  .map((part) => part[0])
  .slice(0, 2)
  .join('')
  .toUpperCase();

function TicketStatus({ status }) {
  const key = status || 'OPEN';
  return <span className={`support-badge status ${statusToneClass[key] || 'is-open'}`}>{statusLabel(key)}</span>;
}

function TicketPriority({ priority }) {
  const key = priority || 'MEDIUM';
  return <span className={`support-badge priority ${priorityToneClass[key] || 'is-medium'}`}>{priorityLabel(key)}</span>;
}

function TicketCategory({ category }) {
  const key = category || 'OTHER';
  return <span className={`support-badge category ${categoryToneClass[key] || 'is-gray'}`}>{categoryLabel(key)}</span>;
}

function AdminIcon({ name }) {
  const common = {
    viewBox: '0 0 24 24',
    width: 18,
    height: 18,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  switch (name) {
    case 'refresh':
      return <svg {...common}><path d="M20 11a8 8 0 1 0 2 5" /><path d="M20 5v6h-6" /></svg>;
    case 'export':
      return <svg {...common}><path d="M12 3v12" /><path d="m8 11 4 4 4-4" /><path d="M4 15v4h16v-4" /></svg>;
    case 'search':
      return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
    case 'reply':
      return <svg {...common}><path d="M10 17 5 12l5-5" /><path d="M5 12h10a4 4 0 0 1 4 4v2" /></svg>;
    case 'attachment':
      return <svg {...common}><path d="M21.44 11.05 12 20.49a5 5 0 1 1-7.07-7.07l9.9-9.9a3.5 3.5 0 1 1 4.95 4.95l-9.9 9.9a2 2 0 1 1-2.83-2.83l9.19-9.19" /></svg>;
    case 'emoji':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M8 15c1.2 1.2 2.6 1.8 4 1.8s2.8-.6 4-1.8" /><path d="M9 10h.01" /><path d="M15 10h.01" /></svg>;
    case 'assign':
      return <svg {...common}><path d="M16 3h5v5" /><path d="m21 3-8.5 8.5" /><circle cx="8" cy="8" r="3" /><path d="M3 21a6 6 0 0 1 10 0" /></svg>;
    case 'resolve':
      return <svg {...common}><path d="m20 6-11 11-5-5" /></svg>;
    case 'close':
      return <svg {...common}><path d="m18 6-12 12" /><path d="m6 6 12 12" /></svg>;
    case 'alert':
      return <svg {...common}><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 4.5 1.8 19a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3l-8.5-14.5a2 2 0 0 0-3.4 0Z" /></svg>;
    case 'ticket':
      return <svg {...common}><path d="M4 7a2 2 0 0 1 2-2h12v14H6a2 2 0 0 1-2-2Z" /><path d="M9 9h6" /><path d="M9 13h6" /></svg>;
    case 'calendar':
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>;
    case 'clock':
      return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></svg>;
    case 'message':
      return <svg {...common}><path d="M21 14a4 4 0 0 1-4 4H8l-5 3V6a3 3 0 0 1 3-3h11a4 4 0 0 1 4 4Z" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="9" /></svg>;
  }
}

function StatCard({ icon, label, value, note, tone = 'is-blue', onClick, active = false }) {
  const cardProps = onClick
    ? {
        role: 'button',
        tabIndex: 0,
        onClick,
        onKeyDown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
          }
        },
        'aria-pressed': active,
      }
    : {};

  return (
    <article className={`support-board-stat ${tone} ${active ? 'is-active' : ''}`} {...cardProps}>
      <div className="support-board-stat-icon">
        <AdminIcon name={icon} />
      </div>
      <div className="support-board-stat-copy">
        <small>{label}</small>
        <strong>{value}</strong>
        <span>{note}</span>
      </div>
    </article>
  );
}

function MessageAvatar({ name, role }) {
  return <div className={`support-message-avatar ${role === 'ADMIN' ? 'is-admin' : 'is-user'}`}>{getInitials(name)}</div>;
}

function ChatBubble({ message }) {
  const role = message.senderRole || 'USER';
  return (
    <article className={`support-chat ${role.toLowerCase()}`}>
      <MessageAvatar name={message.senderName} role={role} />
      <div className="support-chat-body">
        <div className="support-chat-head">
          <strong>{message.senderName}</strong>
          <span>{role}</span>
          <time>{formatDateTime(message.createdAt)}</time>
        </div>
        <p>{message.message}</p>
        {Array.isArray(message.attachments) && message.attachments.length > 0 && (
          <div className="support-chat-attachments">
            {message.attachments.map((attachment) => (
              <a key={attachment.id} href={attachment.fileUrl} target="_blank" rel="noreferrer">
                <AdminIcon name="attachment" />
                <span>{attachment.originalFileName}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default function AdminSupport() {
  const navigate = useNavigate();
  const { ticketId } = useParams();

  const [summary, setSummary] = useState({
    totalTickets: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    todayTickets: 0,
  });
  const [ticketsPage, setTicketsPage] = useState({ content: [], page: 0, size: 10, totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [closeLoading, setCloseLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [saving, setSaving] = useState(false);
  const [detailState, setDetailState] = useState({
    status: 'OPEN',
    priority: 'MEDIUM',
    internalNotes: '',
    adminResponse: '',
    resolutionNotes: '',
  });

  const loadList = async (nextPage = page, nextQuery = query, nextStatus = statusFilter, nextPriority = priorityFilter, nextCategory = categoryFilter) => {
    setListLoading(true);
    try {
      const [summaryResponse, ticketsResponse] = await Promise.all([
        getAdminSupportSummary(),
        getAdminSupportTickets({
          page: nextPage,
          size: 10,
          query: nextQuery || undefined,
          status: nextStatus !== 'ALL' ? nextStatus : undefined,
          priority: nextPriority !== 'ALL' ? nextPriority : undefined,
          category: nextCategory !== 'ALL' ? nextCategory : undefined,
        }),
      ]);

      setSummary({
        totalTickets: summaryResponse.data?.totalTickets || 0,
        open: summaryResponse.data?.open || 0,
        inProgress: summaryResponse.data?.inProgress || 0,
        resolved: summaryResponse.data?.resolved || 0,
        closed: summaryResponse.data?.closed || 0,
        todayTickets: summaryResponse.data?.todayTickets || 0,
      });
      setTicketsPage(ticketsResponse.data || { content: [] });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load support tickets.');
    } finally {
      setLoading(false);
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadList(page, query, statusFilter, priorityFilter, categoryFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query, statusFilter, priorityFilter, categoryFilter]);

  useEffect(() => {
    if (!ticketId) {
      setSelectedTicket(null);
      setDetailError('');
      return undefined;
    }

    let mounted = true;
    setDetailLoading(true);
    setDetailError('');
    getAdminSupportTicket(ticketId)
      .then((response) => {
        if (!mounted) return;
        const detail = response.data || null;
        setSelectedTicket(detail);
        setDetailState({
          status: detail?.status || 'OPEN',
          priority: detail?.priority || 'MEDIUM',
          internalNotes: Array.isArray(detail?.internalNotes) ? detail.internalNotes[detail.internalNotes.length - 1]?.note || '' : '',
          adminResponse: detail?.resolutionSummary || '',
          resolutionNotes: detail?.resolutionNotes || '',
        });
      })
      .catch((err) => {
        if (!mounted) return;
        setDetailError(err.response?.data?.message || 'Could not open ticket.');
      })
      .finally(() => {
        if (mounted) setDetailLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [ticketId]);

  const summaryCards = useMemo(() => ([
    { label: 'All', value: summary.totalTickets || 0, note: 'Total Support Tickets', icon: 'ticket', tone: 'is-blue', status: 'ALL' },
    { label: 'Open', value: summary.open || 0, note: 'Needs first response', icon: 'ticket', tone: 'is-amber', status: 'OPEN' },
    { label: 'Resolved', value: summary.resolved || 0, note: 'Successfully Resolved', icon: 'resolve', tone: 'is-green', status: 'RESOLVED' },
    { label: 'In Progress', value: summary.inProgress || 0, note: 'Being handled by support', icon: 'message', tone: 'is-purple', status: 'IN_PROGRESS' },
  ]), [summary]);

  const selectedTicketId = selectedTicket ? String(selectedTicket.id) : String(ticketId || '');
  const showTicketDetail = Boolean(ticketId || selectedTicket || detailLoading || detailError);
  const actionBusy = saving || resolveLoading || closeLoading;
  const detailTicket = selectedTicket ?? {};
  const pageSize = ticketsPage.size || 10;
  const startIndex = ticketsPage.totalElements ? (ticketsPage.page * pageSize) + 1 : 0;
  const endIndex = ticketsPage.totalElements ? Math.min(startIndex + (ticketsPage.content?.length || 0) - 1, ticketsPage.totalElements) : 0;

  const refreshAll = async () => {
    await loadList(page, query, statusFilter, priorityFilter, categoryFilter);
    if (ticketId) {
      try {
        const response = await getAdminSupportTicket(ticketId);
        const detail = response.data || null;
        setSelectedTicket(detail);
        setDetailState((current) => ({
          ...current,
          status: detail?.status || current.status,
          priority: detail?.priority || current.priority,
          internalNotes: Array.isArray(detail?.internalNotes) ? detail.internalNotes[detail.internalNotes.length - 1]?.note || '' : current.internalNotes,
          adminResponse: detail?.resolutionSummary || current.adminResponse,
          resolutionNotes: detail?.resolutionNotes || current.resolutionNotes,
        }));
      } catch (err) {
        setDetailError(err.response?.data?.message || 'Could not refresh ticket details.');
      }
    }
  };

  const persistDraft = async (nextState, includeStatus = true, includeInternalNotes = true) => {
    const payload = {
      priority: nextState.priority,
    };
    if (includeInternalNotes) payload.internalNotes = nextState.internalNotes;
    if (includeStatus && ['OPEN', 'IN_PROGRESS'].includes(nextState.status)) {
      payload.status = nextState.status;
    }
    await updateSupportTicket(selectedTicket.id, payload);
  };

  const saveTicket = async () => {
    if (!selectedTicket) return;
    const nextState = { ...detailState };
    const isTerminal = nextState.status === 'RESOLVED' || nextState.status === 'CLOSED';

    if (isTerminal) {
      setDetailError('Use Resolve Ticket or Close Ticket to change the ticket status.');
      return;
    }

    setSaving(true);
    setDetailError('');
    try {
      await persistDraft(nextState, true);
      await refreshAll();
    } catch (err) {
      setDetailError(err.response?.data?.message || 'Could not update the ticket.');
    } finally {
      setSaving(false);
    }
  };

  const resolveTicket = async () => {
    if (!selectedTicket) return;
    const nextState = { ...detailState };
    const responseText = nextState.adminResponse.trim();
    if (!responseText) {
      setDetailError('Admin response is required before resolving a ticket.');
      return;
    }

    const confirmed = window.confirm('Resolve this ticket now?');
    if (!confirmed) return;

    setResolveLoading(true);
    setDetailError('');
    try {
      await persistDraft(nextState, false);
      await resolveSupportTicket(selectedTicket.id, {
        resolutionSummary: responseText,
        resolutionNotes: nextState.resolutionNotes.trim() || null,
        reply: null,
      });
      await refreshAll();
    } catch (err) {
      setDetailError(err.response?.data?.message || 'Could not resolve the ticket.');
    } finally {
      setResolveLoading(false);
    }
  };

  const sendReply = async () => {
    if (!selectedTicket) return;
    const message = detailState.adminResponse.trim();
    if (!message) {
      setDetailError('Write a reply for the user first.');
      return;
    }

    setSaving(true);
    setDetailError('');
    try {
      await persistDraft(detailState, false, false);
      await replyAdminSupportTicket(selectedTicket.id, { message });
      setDetailState((current) => ({ ...current, adminResponse: '' }));
      await refreshAll();
    } catch (err) {
      setDetailError(err.response?.data?.message || 'Could not send the reply.');
    } finally {
      setSaving(false);
    }
  };

  const closeTicket = async () => {
    if (!selectedTicket) return;
    if (!selectedTicket.canClose && detailState.status !== 'CLOSED') {
      setDetailError('This ticket must be resolved before it can be closed.');
      return;
    }

    const confirmed = window.confirm('Close this ticket now?');
    if (!confirmed) return;

    setCloseLoading(true);
    setDetailError('');
    try {
      await persistDraft(detailState, false);
      await closeAdminSupportTicket(selectedTicket.id);
      await refreshAll();
    } catch (err) {
      setDetailError(err.response?.data?.message || 'Could not close the ticket.');
    } finally {
      setCloseLoading(false);
    }
  };

  const submitTicketAction = async () => {
    if (detailState.status === 'RESOLVED') {
      await resolveTicket();
      return;
    }
    if (detailState.status === 'CLOSED') {
      await closeTicket();
      return;
    }
    await saveTicket();
  };

  const exportCsv = () => {
    const rows = [
      ['Ticket ID', 'Customer Name', 'Email', 'Category', 'Booking ID', 'Transaction ID', 'Priority', 'Status', 'Created At'],
      ...(ticketsPage.content || []).map((ticket) => ([
        formatTicketId(ticket),
        ticket.userName || '',
        ticket.userEmail || '',
        categoryLabel(ticket.category),
        ticket.bookingId || '',
        ticket.transactionId || '',
        ticket.priority || '',
        statusLabel(ticket.status),
        ticket.createdAt || '',
      ])),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'support-tickets.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSummaryCardClick = (status) => {
    setPage(0);
    setStatusFilter(status);
  };

  const selectTicket = (ticket) => {
    navigate(`/admin/support/${ticket.id}`);
  };

  const closeTicketDetail = () => {
    setSelectedTicket(null);
    setDetailError('');
    setSaving(false);
    setResolveLoading(false);
    setCloseLoading(false);
    navigate('/admin/support');
  };

  const clearFilters = () => {
    setPage(0);
    setQuery('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setCategoryFilter('ALL');
  };

  return (
    <div className="admin-support-page support-board-page">
      <section className="support-board-hero card-surface">
        <div className="support-board-hero-copy">
          <span className="support-board-kicker">Inbox</span>
          <h2>Support Tickets</h2>
          <p>Manage user questions, replies and issue resolution from one clean workspace.</p>
        </div>
        <div className="support-board-hero-actions">
          <button type="button" className="support-board-utility-button" onClick={refreshAll}>
            <AdminIcon name="refresh" />
            <span>Refresh</span>
          </button>
          <button type="button" className="support-board-utility-button" onClick={exportCsv}>
            <AdminIcon name="export" />
            <span>Export</span>
          </button>
        </div>
      </section>

      <section className="support-board-stats">
        {summaryCards.map((card) => (
          <StatCard
            key={card.label}
            {...card}
            active={statusFilter === card.status}
            onClick={() => handleSummaryCardClick(card.status)}
          />
        ))}
      </section>

      <section className="support-board-shell card-surface">
        <div className="support-board-toolbar">
          <label className="support-board-search">
            <AdminIcon name="search" />
            <input
              value={query}
              onChange={(event) => { setPage(0); setQuery(event.target.value); }}
              placeholder="Search ticket, user, email, booking or subject..."
            />
          </label>

          <div className="support-board-filters">
            <select value={statusFilter} onChange={(event) => { setPage(0); setStatusFilter(event.target.value); }}>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status === 'ALL' ? 'ALL' : statusLabel(status)}</option>
              ))}
            </select>
            <select value={priorityFilter} onChange={(event) => { setPage(0); setPriorityFilter(event.target.value); }}>
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>{priority === 'ALL' ? 'All Priorities' : priorityLabel(priority)}</option>
              ))}
            </select>
            <select value={categoryFilter} onChange={(event) => { setPage(0); setCategoryFilter(event.target.value); }}>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>{category === 'ALL' ? 'All Categories' : categoryLabel(category)}</option>
              ))}
            </select>
            <button type="button" className="support-board-reset" onClick={clearFilters}>
              Reset Filters
            </button>
          </div>
        </div>

        <aside className="support-board-list-card">
          <div className="support-board-list-head">
            <div>
              <span className="support-board-kicker">Queue</span>
              <h3>Ticket List</h3>
            </div>
            <span className="support-board-count">{ticketsPage.totalElements || 0}</span>
          </div>

          {error && <p className="error-text support-board-error">{error}</p>}

          {loading || listLoading ? (
            <div className="support-board-loading">
              <span className="booking-details-spinner" />
              <p>Loading support tickets...</p>
            </div>
          ) : ticketsPage.content?.length ? (
            <div className="support-board-table-wrap">
              <table className="support-board-table">
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
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketsPage.content.map((ticket) => {
                    const isActive = selectedTicketId === String(ticket.id);
                    return (
                      <tr key={ticket.id} className={isActive ? 'is-active' : ''}>
                        <td><strong className="support-board-ticket-id">{formatTicketId(ticket)}</strong></td>
                        <td>
                          <div className="support-board-user-cell">
                            <strong>{safeText(ticket.userName, 'Unknown user')}</strong>
                            <small>{safeText(ticket.userEmail, '')}</small>
                          </div>
                        </td>
                        <td><TicketCategory category={ticket.category} /></td>
                        <td>{safeText(ticket.bookingId, 'N/A')}</td>
                        <td>{safeText(ticket.transactionId, 'N/A')}</td>
                        <td><TicketPriority priority={ticket.priority} /></td>
                        <td><TicketStatus status={ticket.status} /></td>
                        <td>{formatDateTime(ticket.createdAt)}</td>
                        <td>
                          <button type="button" className="support-board-view-btn" onClick={() => selectTicket(ticket)}>
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="support-board-empty">
              <div className="support-board-empty-icon">
                <AdminIcon name="ticket" />
              </div>
              <h3>No tickets found</h3>
              <p>No support requests match the current filters.</p>
            </div>
          )}

          <div className="support-board-footer">
            <span>
              Showing {startIndex ? `${startIndex}-${endIndex}` : 0} of {ticketsPage.totalElements || 0} tickets
            </span>
            <div className="support-board-pagination">
              <button type="button" className="btn btn-secondary" disabled={page <= 0} onClick={() => setPage((current) => Math.max(current - 1, 0))}>
                Previous
              </button>
              <span>Page {ticketsPage.page + 1} of {ticketsPage.totalPages || 1}</span>
              <button type="button" className="btn btn-secondary" disabled={ticketsPage.last} onClick={() => setPage((current) => current + 1)}>
                Next
              </button>
            </div>
          </div>
        </aside>
      </section>

      {showTicketDetail && (
        <div
          className="support-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeTicketDetail();
          }}
        >
          <div className="support-modal support-board-detail-modal">
            <div className="support-modal-head support-board-detail-modal-head">
              <div>
                <span className="support-board-kicker">Selected Ticket</span>
                <h3>{selectedTicket?.subject || 'Support Ticket'}</h3>
                <p>
                  {selectedTicket ? `${formatTicketId(selectedTicket)} • ${selectedTicket.userName} - ${selectedTicket.userEmail}` : 'Loading ticket details'}
                </p>
              </div>
              <button type="button" onClick={closeTicketDetail} aria-label="Close">
                &times;
              </button>
            </div>

            {detailLoading && !selectedTicket ? (
              <div className="support-board-loading support-board-detail-loading">
                <span className="booking-details-spinner" />
                <p>Loading ticket details...</p>
              </div>
            ) : detailError && !selectedTicket ? (
              <div className="support-board-empty support-board-detail-empty">
                <div className="support-board-empty-icon is-large">
                  <AdminIcon name="alert" />
                </div>
                <h3>Could not load ticket</h3>
                <p>{detailError}</p>
              </div>
            ) : (
              <div className="support-board-detail-layout">
                <section className="support-board-detail-panel">
                  <div className="support-board-detail-grid">
                    <div>
                      <span>Ticket ID</span>
                      <strong>{formatTicketId(detailTicket)}</strong>
                    </div>
                    <div>
                      <span>Customer</span>
                      <strong>{detailTicket.userName || 'N/A'}</strong>
                      <small>{detailTicket.userEmail || 'No email'}</small>
                    </div>
                    <div>
                      <span>Status</span>
                      <strong><TicketStatus status={detailTicket.status} /></strong>
                    </div>
                    <div>
                      <span>Received</span>
                      <strong>{formatDateTime(detailTicket.createdAt)}</strong>
                    </div>
                    <div>
                      <span>Category</span>
                      <strong>{categoryLabel(detailTicket.category || 'OTHER')}</strong>
                    </div>
                    <div>
                      <span>Booking reference</span>
                      <strong>{safeText(detailTicket.bookingId, 'Not linked')}</strong>
                    </div>
                  </div>

                  <div className="support-board-readonly-block">
                    <span>Description</span>
                    <p>{detailTicket.message || 'No description available.'}</p>
                  </div>

                  {detailTicket.resolutionSummary && (
                    <div className="support-board-readonly-block is-accent">
                      <span>Admin Response</span>
                      <p>{detailTicket.resolutionSummary}</p>
                    </div>
                  )}

                  {detailTicket.resolutionNotes && (
                    <div className="support-board-readonly-block">
                      <span>Resolution Notes</span>
                      <p>{detailTicket.resolutionNotes}</p>
                    </div>
                  )}

                  {Array.isArray(detailTicket.attachments) && detailTicket.attachments.length > 0 && (
                    <div className="support-board-attachment-section">
                      <span>Attachments</span>
                      <div className="support-board-attachment-list">
                        {detailTicket.attachments.map((attachment) => (
                          <a key={attachment.id} href={attachment.fileUrl} target="_blank" rel="noreferrer">
                            <AdminIcon name="attachment" />
                            <span>{attachment.originalFileName}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {detailError && <p className="error-text support-board-error support-board-form-error">{detailError}</p>}
                </section>

                <form
                  className="support-board-form support-board-detail-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitTicketAction();
                  }}
                >
                  <div className="support-board-form-head">
                    <div>
                      <span className="support-board-kicker">Resolution</span>
                      <h4>Ticket actions</h4>
                      <p>Update ownership, send the user a reply, or resolve the request.</p>
                    </div>
                    {actionBusy && (
                      <div className="support-board-saving">
                        <span className="booking-details-spinner" />
                        <span>Saving changes...</span>
                      </div>
                    )}
                  </div>

                  <div className="support-board-form-grid">
                    <label>
                      Ticket Status
                      <select value={detailState.status} onChange={(event) => setDetailState((current) => ({ ...current, status: event.target.value }))}>
                        {formStatusOptions.map((status) => <option key={status} value={status}>{formStatusLabel(status)}</option>)}
                      </select>
                    </label>
                    <label>
                      Priority
                      <select value={detailState.priority} onChange={(event) => setDetailState((current) => ({ ...current, priority: event.target.value }))}>
                        {priorityOptions.filter((item) => item !== 'ALL').map((priority) => <option key={priority} value={priority}>{priorityLabel(priority)}</option>)}
                      </select>
                    </label>
                    <label className="support-board-full-width">
                      Message to user
                      <textarea
                        rows={4}
                        value={detailState.adminResponse}
                        onChange={(event) => setDetailState((current) => ({ ...current, adminResponse: event.target.value }))}
                        placeholder="Write a clear update for the user..."
                      />
                    </label>
                  </div>

                  <details className="support-board-admin-notes">
                    <summary>Internal notes and resolution details (optional)</summary>
                    <div>
                      <label>
                        Internal note
                        <textarea rows={3} value={detailState.internalNotes} onChange={(event) => setDetailState((current) => ({ ...current, internalNotes: event.target.value }))} placeholder="Visible only to the support team" />
                      </label>
                      <label>
                        Resolution detail
                        <textarea rows={3} value={detailState.resolutionNotes} onChange={(event) => setDetailState((current) => ({ ...current, resolutionNotes: event.target.value }))} placeholder="Optional record for the final resolution" />
                      </label>
                    </div>
                  </details>

                  <div className="support-board-actions">
                    <button type="submit" className="support-board-action is-secondary" disabled={actionBusy}>
                      <AdminIcon name="assign" />
                      <span>{saving ? 'Saving...' : 'Save changes'}</span>
                    </button>
                    <button
                      type="button"
                      className="support-board-action is-primary"
                      onClick={sendReply}
                      disabled={actionBusy || !detailState.adminResponse.trim()}
                    >
                      <AdminIcon name="reply" />
                      <span>{saving ? 'Sending...' : 'Send reply'}</span>
                    </button>
                    <button
                      type="button"
                      className="support-board-action is-success"
                      onClick={resolveTicket}
                      disabled={actionBusy || !detailState.adminResponse.trim()}
                    >
                      <AdminIcon name="resolve" />
                      <span>{resolveLoading ? 'Resolving...' : 'Resolve Ticket'}</span>
                    </button>
                    <button
                      type="button"
                      className="support-board-action is-danger"
                      onClick={closeTicket}
                      disabled={actionBusy || !selectedTicket?.canClose}
                    >
                      <AdminIcon name="close" />
                      <span>{closeLoading ? 'Closing...' : 'Close Ticket'}</span>
                    </button>
                    <button type="button" className="support-board-action is-secondary" onClick={closeTicketDetail} disabled={actionBusy}>
                      Back
                    </button>
                  </div>
                </form>

                <details className="support-board-thread" open>
                  <summary>Conversation and timeline</summary>
                  <div className="support-board-thread-body">
                    <section className="support-board-thread-block">
                      <h4>Conversation</h4>
                      <div className="support-board-message-list">
                        {Array.isArray(detailTicket.messages) && detailTicket.messages.length > 0 ? (
                          detailTicket.messages.map((message) => <ChatBubble key={message.id} message={message} />)
                        ) : (
                          <div className="support-board-thread-empty">
                            <AdminIcon name="message" />
                            <div>
                              <strong>No conversation yet</strong>
                              <p>No replies have been sent yet.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>

                    <section className="support-board-thread-block">
                      <h4>Timeline</h4>
                      <div className="support-board-timeline">
                        <div className="support-board-timeline-item">
                          <span />
                          <div>
                            <strong>Ticket Created</strong>
                            <p>by {detailTicket.userName || 'User'}</p>
                          </div>
                          <time>{formatDateTime(detailTicket.createdAt)}</time>
                        </div>
                        {Array.isArray(detailTicket.history) && detailTicket.history.map((item) => (
                          <div key={item.id} className="support-board-timeline-item">
                            <span />
                            <div>
                              <strong>Status changed to {statusLabel(item.newStatus || '')}</strong>
                              <p>
                                by {item.changedByName || 'System'}
                                {item.note ? ` - ${item.note}` : ''}
                              </p>
                            </div>
                            <time>{formatDateTime(item.createdAt)}</time>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
