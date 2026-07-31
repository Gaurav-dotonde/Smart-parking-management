import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAdminUsers } from '../services/userService';
import {
  getAdminSupportSummary,
  getAdminSupportTickets,
  getAdminSupportTicket,
  replyAdminSupportTicket,
  updateSupportTicket,
} from '../services/supportService';

const statusOptions = ['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED'];
const priorityOptions = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'];
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

function validTransitions(current) {
  const transitions = {
    OPEN: ['OPEN', 'IN_PROGRESS'],
    IN_PROGRESS: ['IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED'],
    WAITING_FOR_USER: ['WAITING_FOR_USER', 'IN_PROGRESS', 'RESOLVED'],
    RESOLVED: ['RESOLVED', 'CLOSED'],
    CLOSED: ['CLOSED'],
  };
  return transitions[current] || ['OPEN'];
}

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

function StatCard({ icon, label, value, note, tone = 'is-blue' }) {
  return (
    <article className={`support-board-stat ${tone}`}>
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

  const [summary, setSummary] = useState({ totalTickets: 0, open: 0, inProgress: 0, waitingForUser: 0, resolved: 0, closed: 0, todayTickets: 0 });
  const [ticketsPage, setTicketsPage] = useState({ content: [], page: 0, size: 10, totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [replyFiles, setReplyFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [replySaving, setReplySaving] = useState(false);
  const [detailState, setDetailState] = useState({
    status: 'OPEN',
    priority: 'MEDIUM',
    assignedToId: '',
    internalNotes: '',
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
        waitingForUser: summaryResponse.data?.waitingForUser || 0,
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
    loadList(page, query, statusFilter, priorityFilter, categoryFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query, statusFilter, priorityFilter, categoryFilter]);

  useEffect(() => {
    if (!ticketId) {
      setSelectedTicket(null);
      setDetailError('');
      setReplyText('');
      setReplyFiles([]);
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
          assignedToId: '',
          internalNotes: detail?.internalNotes || '',
        });
        setReplyText('');
        setReplyFiles([]);
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

  useEffect(() => {
    if (!selectedTicket) return;
    if (detailState.assignedToId) return;
    const assigned = adminUsers.find((user) => user.email === selectedTicket.assignedToEmail || user.name === selectedTicket.assignedToName);
    if (assigned) {
      setDetailState((current) => ({ ...current, assignedToId: String(assigned.id) }));
    }
  }, [selectedTicket, adminUsers, detailState.assignedToId]);

  const urgentCount = useMemo(
    () => (ticketsPage.content || []).filter((ticket) => ticket.priority === 'URGENT').length,
    [ticketsPage.content],
  );

  const summaryCards = useMemo(() => ([
    { label: 'Open', value: summary.open || 0, note: 'Needs first response', icon: 'ticket', tone: 'is-amber' },
    { label: 'In Progress', value: summary.inProgress || 0, note: 'Being handled by support', icon: 'message', tone: 'is-blue' },
    { label: 'Waiting For User', value: summary.waitingForUser || 0, note: 'Needs a customer reply', icon: 'clock', tone: 'is-purple' },
    { label: 'Urgent', value: urgentCount, note: 'High priority on this page', icon: 'alert', tone: 'is-red' },
  ]), [summary, urgentCount]);

  const selectedStatusOptions = validTransitions(selectedTicket?.status || 'OPEN');
  const selectedTicketId = selectedTicket ? String(selectedTicket.id) : String(ticketId || '');
  const conversationCount = selectedTicket?.messageCount ?? selectedTicket?.messages?.length ?? 0;
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
          internalNotes: detail?.internalNotes || '',
        }));
      } catch (err) {
        setDetailError(err.response?.data?.message || 'Could not refresh ticket details.');
      }
    }
  };

  const saveTicket = async (overrides = {}) => {
    if (!selectedTicket) return;
    const nextState = { ...detailState, ...overrides };
    if (!validTransitions(selectedTicket.status).includes(nextState.status)) {
      setDetailError(`You cannot move this ticket from ${statusLabel(selectedTicket.status)} to ${statusLabel(nextState.status)}.`);
      return;
    }

    setSaving(true);
    setDetailError('');
    try {
      await updateSupportTicket(selectedTicket.id, {
        status: nextState.status,
        priority: nextState.priority,
        assignedToId: nextState.assignedToId ? Number(nextState.assignedToId) : null,
        internalNotes: nextState.internalNotes,
      });
      await refreshAll();
    } catch (err) {
      setDetailError(err.response?.data?.message || 'Could not update the ticket.');
    } finally {
      setSaving(false);
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
      await replyAdminSupportTicket(selectedTicket.id, buildFormData({ message: replyText.trim() }, replyFiles));
      setReplyText('');
      setReplyFiles([]);
      await refreshAll();
    } catch (err) {
      setDetailError(err.response?.data?.message || 'Could not send reply.');
    } finally {
      setReplySaving(false);
    }
  };

  const quickTransition = async (status) => {
    await saveTicket({ status });
  };

  const exportCsv = () => {
    const rows = [
      ['Ticket ID', 'Customer Name', 'Email', 'Category', 'Booking ID', 'Transaction ID', 'Priority', 'Status', 'Created At', 'Assigned Agent'],
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
        ticket.assignedToName || 'Unassigned',
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

  const selectTicket = (ticket) => {
    navigate(`/admin/support/${ticket.id}`);
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
        {summaryCards.map((card) => <StatCard key={card.label} {...card} />)}
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

        <div className="support-board-grid">
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
                      <th>Assigned To</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticketsPage.content.map((ticket) => {
                      const isActive = selectedTicketId === String(ticket.id);
                      return (
                        <tr key={ticket.id} className={isActive ? 'is-active' : ''}>
                          <td>
                            <strong className="support-board-ticket-id">{formatTicketId(ticket)}</strong>
                          </td>
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
                          <td>{safeText(ticket.assignedToName, 'Unassigned')}</td>
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

          <section className="support-board-detail-card">
            {detailLoading ? (
              <div className="support-board-loading support-board-detail-loading">
                <span className="booking-details-spinner" />
                <p>Loading ticket details...</p>
              </div>
            ) : selectedTicket ? (
              <>
                <div className="support-board-detail-head">
                  <div>
                    <span className="support-board-kicker">Selected Ticket</span>
                    <h3>{selectedTicket.subject}</h3>
                    <p>
                      {selectedTicket.userName} - {selectedTicket.userEmail}
                    </p>
                    <div className="support-board-chip-row">
                      <TicketCategory category={selectedTicket.category} />
                      <TicketPriority priority={selectedTicket.priority} />
                      <TicketStatus status={selectedTicket.status} />
                    </div>
                  </div>
                  <button type="button" className="support-board-back-btn" onClick={() => navigate('/admin/support')}>
                    Back to list
                  </button>
                </div>

                <div className="support-board-meta-grid">
                  <div>
                    <span>Ticket ID</span>
                    <strong>{formatTicketId(selectedTicket)}</strong>
                  </div>
                  <div>
                    <span>Booking ID</span>
                    <strong>{safeText(selectedTicket.bookingId)}</strong>
                  </div>
                  <div>
                    <span>Transaction ID</span>
                    <strong>{safeText(selectedTicket.transactionId)}</strong>
                  </div>
                  <div>
                    <span>Messages</span>
                    <strong>{conversationCount}</strong>
                  </div>
                  <div>
                    <span>Assigned</span>
                    <strong>{safeText(selectedTicket.assignedToName, 'Unassigned')}</strong>
                  </div>
                  <div>
                    <span>Created</span>
                    <strong>{formatDateTime(selectedTicket.createdAt)}</strong>
                  </div>
                </div>

                <form className="support-board-form" onSubmit={sendReply}>
                  <div className="support-board-form-grid">
                    <label>
                      Status
                      <select value={detailState.status} onChange={(event) => setDetailState((current) => ({ ...current, status: event.target.value }))}>
                        {selectedStatusOptions.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                      </select>
                    </label>
                    <label>
                      Priority
                      <select value={detailState.priority} onChange={(event) => setDetailState((current) => ({ ...current, priority: event.target.value }))}>
                        {priorityOptions.filter((item) => item !== 'ALL').map((priority) => <option key={priority} value={priority}>{priorityLabel(priority)}</option>)}
                      </select>
                    </label>
                    <label className="support-board-full-width">
                      Assign Agent
                      <select value={detailState.assignedToId} onChange={(event) => setDetailState((current) => ({ ...current, assignedToId: event.target.value }))}>
                        <option value="">Unassigned</option>
                        {adminUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="support-board-full-width">
                      Internal Notes
                      <textarea
                        rows={3}
                        value={detailState.internalNotes}
                        onChange={(event) => setDetailState((current) => ({ ...current, internalNotes: event.target.value }))}
                        placeholder="Add internal notes for the support team..."
                      />
                    </label>
                    <label className="support-board-full-width">
                      Reply to customer
                      <textarea
                        rows={4}
                        value={replyText}
                        onChange={(event) => setReplyText(event.target.value)}
                        placeholder="Type your response here..."
                      />
                    </label>
                  </div>

                  <div className="support-board-attachments">
                    <label className="support-board-file">
                      <AdminIcon name="attachment" />
                      <span>Attach file</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(event) => setReplyFiles(Array.from(event.target.files || []))}
                      />
                    </label>
                    <button type="button" className="support-board-chip">
                      <AdminIcon name="emoji" />
                      <span>Emoji</span>
                    </button>
                    <div className="support-board-selected">
                      {replyFiles.length > 0 ? `${replyFiles.length} file(s) attached` : 'No files attached'}
                    </div>
                  </div>

                  {detailError && <p className="error-text support-board-error support-board-form-error">{detailError}</p>}

                  <div className="support-board-actions">
                    <button type="button" className="support-board-action is-secondary" onClick={() => saveTicket()} disabled={saving}>
                      <AdminIcon name="assign" />
                      <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                    <button type="button" className="support-board-action is-warning" onClick={() => quickTransition('WAITING_FOR_USER')} disabled={saving || !validTransitions(selectedTicket.status).includes('WAITING_FOR_USER')}>
                      <AdminIcon name="alert" />
                      <span>Waiting</span>
                    </button>
                    <button type="button" className="support-board-action is-success" onClick={() => quickTransition('RESOLVED')} disabled={saving || !validTransitions(selectedTicket.status).includes('RESOLVED')}>
                      <AdminIcon name="resolve" />
                      <span>Resolve</span>
                    </button>
                    <button type="button" className="support-board-action is-danger" onClick={() => quickTransition('CLOSED')} disabled={saving || !validTransitions(selectedTicket.status).includes('CLOSED')}>
                      <AdminIcon name="close" />
                      <span>Close</span>
                    </button>
                    <button type="submit" className="support-board-action is-primary" disabled={replySaving}>
                      <AdminIcon name="reply" />
                      <span>{replySaving ? 'Sending...' : 'Send Reply'}</span>
                    </button>
                  </div>
                </form>

                <details className="support-board-thread">
                  <summary>Conversation and timeline</summary>
                  <div className="support-board-thread-body">
                    <section className="support-board-thread-block">
                      <h4>Conversation</h4>
                      <div className="support-board-message-list">
                        {Array.isArray(selectedTicket.messages) && selectedTicket.messages.length > 0 ? (
                          selectedTicket.messages.map((message) => (
                            <ChatBubble key={message.id} message={message} />
                          ))
                        ) : (
                          <div className="support-board-thread-empty">
                            <AdminIcon name="message" />
                            <div>
                              <strong>No conversation yet</strong>
                              <p>Reply to start the support thread.</p>
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
                            <p>by {selectedTicket.userName}</p>
                          </div>
                          <time>{formatDateTime(selectedTicket.createdAt)}</time>
                        </div>
                        {selectedTicket.assignedToName && (
                          <div className="support-board-timeline-item">
                            <span />
                            <div>
                              <strong>Assigned</strong>
                              <p>to {selectedTicket.assignedToName}</p>
                            </div>
                            <time>{formatDateTime(selectedTicket.updatedAt || selectedTicket.createdAt)}</time>
                          </div>
                        )}
                        {Array.isArray(selectedTicket.history) && selectedTicket.history.map((item) => (
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
              </>
            ) : (
              <div className="support-board-empty support-board-detail-empty">
                <div className="support-board-empty-icon is-large">
                  <AdminIcon name="ticket" />
                </div>
                <h3>No Ticket Selected</h3>
                <p>Select a support ticket from the table to view details and respond.</p>
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
