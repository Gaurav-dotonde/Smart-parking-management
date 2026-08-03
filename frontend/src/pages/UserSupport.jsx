import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  closeSupportTicket,
  createSupportTicket,
  createSupportTicketMultipart,
  getMySupportSummary,
  getMySupportTickets,
  getSupportTicket,
  replySupportTicket,
  reopenSupportTicket,
} from '../services/supportService';

const categories = [
  { value: 'PAYMENT_ISSUE', label: 'Payment Issue' },
  { value: 'BOOKING_ISSUE', label: 'Booking Issue' },
  { value: 'REFUND_ISSUE', label: 'Refund Issue' },
  { value: 'CHECK_IN_ISSUE', label: 'Check-In Issue' },
  { value: 'CHECK_OUT_ISSUE', label: 'Check-Out Issue' },
  { value: 'PARKING_SLOT_ISSUE', label: 'Parking Slot Issue' },
  { value: 'TECHNICAL_ISSUE', label: 'Technical Issue' },
  { value: 'ACCOUNT_ISSUE', label: 'Account Issue' },
  { value: 'OTHER', label: 'Other' },
];

const categoryLabel = (value = '') => {
  const option = categories.find((item) => item.value === value);
  return option?.label || value.replaceAll('_', ' ');
};

const statusLabels = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  WAITING_FOR_USER: 'Waiting for User',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

const statusClass = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  WAITING_FOR_USER: 'waiting',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  CANCELLED: 'closed',
};

function formatDateTime(value) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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

function TicketStatus({ status }) {
  const key = status || 'OPEN';
  return <span className={`support-status ${statusClass[key] || 'open'}`}>{statusLabels[key] || key}</span>;
}
function getTicketData(response) {
  return response?.data?.ticket ?? response?.data?.data ?? response?.data ?? null;
}

function getTicketsPageData(response) {
  const data = response?.data?.data ?? response?.data?.tickets ?? response?.data ?? null;
  if (Array.isArray(data)) {
    return {
      content: data,
      page: 0,
      size: data.length || 10,
      totalElements: data.length,
      totalPages: data.length ? 1 : 0,
      first: true,
      last: true,
    };
  }
  if (data && typeof data === 'object') {
    const page = Number(data.page);
    const size = Number(data.size);
    const totalElements = Number(data.totalElements);
    const totalPages = Number(data.totalPages);
    return {
      content: Array.isArray(data.content) ? data.content : [],
      page: Number.isFinite(page) ? page : 0,
      size: Number.isFinite(size) ? size : 10,
      totalElements: Number.isFinite(totalElements) ? totalElements : 0,
      totalPages: Number.isFinite(totalPages) ? totalPages : 0,
      first: Boolean(data.first),
      last: Boolean(data.last),
    };
  }
  return { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true };
}

function getApiErrorMessage(err, fallback) {
  return err?.response?.data?.message
    || err?.response?.data?.error
    || err?.response?.data?.detail
    || err?.message
    || fallback;
}

function isAllowedAttachment(file) {
  if (!file) return false;
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
  const fileName = String(file.name || '').toLowerCase();
  const hasAllowedExtension = allowedExtensions.some((extension) => fileName.endsWith(extension));
  return file.size <= 5 * 1024 * 1024 && allowedMimeTypes.includes(file.type) && hasAllowedExtension;
}

const getSupportStatusParam = (status) => (status && status !== 'ALL' ? status : undefined);

export default function UserSupport() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ totalTickets: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 });
  const [ticketsPage, setTicketsPage] = useState({ content: [], page: 0, size: 10, totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const [createState, setCreateState] = useState({ saving: false, message: '', error: '' });
  const [form, setForm] = useState({
    category: 'PAYMENT_ISSUE',
    subject: '',
    description: '',
    bookingId: '',
    transactionId: '',
  });
  const [formAttachments, setFormAttachments] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyFiles, setReplyFiles] = useState([]);
  const [replyState, setReplyState] = useState({ saving: false, error: '' });
  const [closing, setClosing] = useState(false);
  const conversationRef = useRef(null);
  const createFileInputRef = useRef(null);

  const loadPage = async (nextPage = page, nextQuery = query) => {
    setListLoading(true);
    try {
      const [summaryResult, ticketsResult] = await Promise.all([
        getMySupportSummary(),
        getMySupportTickets({ page: nextPage, size: 10, query: nextQuery || undefined, status: getSupportStatusParam(statusFilter) }),
      ]);
      setSummary({
        totalTickets: summaryResult.data?.totalTickets || 0,
        open: summaryResult.data?.open || 0,
        inProgress: summaryResult.data?.inProgress || 0,
        resolved: summaryResult.data?.resolved || 0,
        closed: summaryResult.data?.closed || 0,
      });
      setTicketsPage(getTicketsPageData(ticketsResult));
      setError('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load support tickets.'));
    } finally {
      setListLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setListLoading(true);
    Promise.all([getMySupportSummary(), getMySupportTickets({ page, size: 10, query: query || undefined, status: getSupportStatusParam(statusFilter) })])
      .then(([summaryResult, ticketsResult]) => {
        if (!mounted) return;
        setSummary({
          totalTickets: summaryResult.data?.totalTickets || 0,
          open: summaryResult.data?.open || 0,
          inProgress: summaryResult.data?.inProgress || 0,
          resolved: summaryResult.data?.resolved || 0,
          closed: summaryResult.data?.closed || 0,
        });
        setTicketsPage(getTicketsPageData(ticketsResult));
        setError('');
      })
      .catch((err) => {
        if (!mounted) return;
        setError(getApiErrorMessage(err, 'Failed to load support tickets.'));
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
  }, [page, query, statusFilter, refreshToken]);

  useEffect(() => {
    if (!ticketId) {
      setSelectedTicket(null);
      setReplyState({ saving: false, error: '' });
      return undefined;
    }
    let mounted = true;
    setTicketLoading(true);
    getSupportTicket(ticketId)
      .then((response) => {
        if (!mounted) return;
        setSelectedTicket(getTicketData(response));
        setReplyText('');
        setReplyFiles([]);
        setReplyState({ saving: false, error: '' });
      })
      .catch((err) => {
        if (!mounted) return;
        setError(getApiErrorMessage(err, 'Could not open ticket.'));
      })
      .finally(() => {
        if (mounted) setTicketLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [ticketId]);

  const supportCards = useMemo(() => ([
    { label: 'All', value: summary.totalTickets, note: 'Total Support Tickets', icon: '?', status: 'ALL', tone: 'gray' },
    { label: 'Open', value: summary.open, note: 'Needs first response', icon: '?', status: 'OPEN', tone: 'blue' },
    { label: 'Resolved', value: summary.resolved, note: 'Successfully Resolved', icon: '?', status: 'RESOLVED', tone: 'green' },
    { label: 'In Progress', value: summary.inProgress, note: 'Being handled by support', icon: '?', status: 'IN_PROGRESS', tone: 'amber' },
  ]), [summary]);

  const handleSearch = (event) => {
    setPage(0);
    setQuery(event.target.value);
  };

  const submitTicket = async (event) => {
    event.preventDefault();
    if (createState.saving) return;
    const trimmedDescription = form.description.trim();
    if (!form.category) return setCreateState({ saving: false, message: '', error: 'Category is required.' });
    if (!form.subject.trim()) return setCreateState({ saving: false, message: '', error: 'Subject is required.' });
    if (!trimmedDescription) return setCreateState({ saving: false, message: '', error: 'Description is required.' });
    if (trimmedDescription.length < 20) return setCreateState({ saving: false, message: '', error: 'Description must be at least 20 characters.' });
    if (trimmedDescription.length > 4000) return setCreateState({ saving: false, message: '', error: 'Description must be at most 4000 characters.' });
    if (form.subject.trim().length > 80) return setCreateState({ saving: false, message: '', error: 'Subject must be at most 80 characters.' });
    if (form.bookingId.trim().length > 50) return setCreateState({ saving: false, message: '', error: 'Booking ID must be at most 50 characters.' });
    if (form.transactionId.trim().length > 80) return setCreateState({ saving: false, message: '', error: 'Transaction ID must be at most 80 characters.' });
    const invalidFile = formAttachments.find((file) => !isAllowedAttachment(file));
    if (invalidFile) {
      return setCreateState({
        saving: false,
        message: '',
        error: 'Attachment must be JPG, JPEG, PNG, or PDF and 5 MB or smaller.',
      });
    }

    setCreateState({ saving: true, message: '', error: '' });
    try {
      const ticketPayload = {
        category: form.category,
        subject: form.subject.trim(),
        message: trimmedDescription,
        bookingId: form.bookingId.trim() || null,
        transactionId: form.transactionId.trim() || null,
      };
      console.debug('Submitting support ticket payload:', ticketPayload);
      if (formAttachments.length > 0) {
        await createSupportTicketMultipart(buildFormData(ticketPayload, formAttachments));
      } else {
        await createSupportTicket(ticketPayload);
      }
      setCreateState({ saving: false, message: 'Your support ticket has been created successfully.', error: '' });
      setForm({ category: 'PAYMENT_ISSUE', subject: '', description: '', bookingId: '', transactionId: '' });
      setFormAttachments([]);
      if (createFileInputRef.current) {
        createFileInputRef.current.value = '';
      }
      setPage(0);
      try {
        await loadPage(0, query);
      } catch (refreshErr) {
        setError(getApiErrorMessage(refreshErr, 'Failed to load support tickets.'));
      }
    } catch (err) {
      setCreateState({
        saving: false,
        message: '',
        error: getApiErrorMessage(err, 'Could not create support ticket.'),
      });
    }
  };

  const sendReply = async (event) => {
    event.preventDefault();
    if (!selectedTicket) return;
    const message = replyText.trim();
    if (!message) {
      setReplyState({ saving: false, error: 'Reply message is required.' });
      return;
    }
    if (selectedTicket.status === 'CLOSED') {
      setReplyState({ saving: false, error: 'Closed tickets cannot receive more replies.' });
      return;
    }
    setReplyState({ saving: true, error: '' });
    try {
      setTicketLoading(true);
      const replyPayload = { message };
      const replyResponse = await replySupportTicket(
        selectedTicket.id,
        replyFiles.length > 0 ? buildFormData(replyPayload, replyFiles) : replyPayload
      );
      const repliedTicket = getTicketData(replyResponse) || selectedTicket;
      await closeSupportTicket(repliedTicket.id);
      const refreshed = await getSupportTicket(repliedTicket.id);
      const latestTicket = getTicketData(refreshed) || repliedTicket;
      setSelectedTicket(latestTicket || null);
      setReplyText('');
      setReplyFiles([]);
      setRefreshToken((current) => current + 1);
      conversationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      setReplyState({ saving: false, error: getApiErrorMessage(err, 'Could not send reply.') });
      return;
    } finally {
      setTicketLoading(false);
    }
    setReplyState({ saving: false, error: '' });
  };

  const closeCurrentTicket = async () => {
    if (!selectedTicket) return;
    const confirmed = window.confirm('Are you sure you want to close this ticket?');
    if (!confirmed) return;
    setClosing(true);
    try {
      await closeSupportTicket(selectedTicket.id);
      setTicketLoading(true);
      const refreshed = await getSupportTicket(selectedTicket.id);
      setSelectedTicket(getTicketData(refreshed));
      setRefreshToken((current) => current + 1);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not close the ticket.'));
    } finally {
      setClosing(false);
      setTicketLoading(false);
    }
  };

  const reopenCurrentTicket = async () => {
    if (!selectedTicket || closing) return;
    setClosing(true);
    try {
      const response = await reopenSupportTicket(selectedTicket.id);
      setSelectedTicket(getTicketData(response));
      setRefreshToken((current) => current + 1);
    } catch (err) { setError(getApiErrorMessage(err, 'Could not reopen the ticket.')); }
    finally { setClosing(false); }
  };

  const openTicket = (ticket) => {
    navigate(`/user/support/${ticket.id}`);
  };

  const detailTicket = selectedTicket ?? {};
  const ticketStatus = String(detailTicket.status || '').trim().toUpperCase();
  const showReplyForm = ticketStatus === 'OPEN';

  return (
    <div className="user-page-section support-center-page">
      <section className="user-page-card support-center-hero">
        <div>
          <p className="user-page-eyebrow">Support Center</p>
          <h2>Need assistance with your booking, payment or parking?</h2>
          <p>Create a support ticket and our team will help you.</p>
        </div>
      </section>

      <section className="support-summary-grid">
        {supportCards.map((item) => (
          <article
            key={item.label}
            className={`support-summary-card tone-${item.tone} ${statusFilter === item.status ? 'is-active' : ''}`}
            role="button"
            tabIndex={0}
            aria-pressed={statusFilter === item.status}
            onClick={() => { setPage(0); setStatusFilter(item.status); }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setPage(0);
                setStatusFilter(item.status);
              }
            }}
          >
            <span className="support-summary-icon">{item.icon}</span>
            <div>
              <small>{item.label}</small>
              <span className="support-summary-note">{item.note}</span>
              <strong>{loading ? '...' : item.value}</strong>
            </div>
          </article>
        ))}
      </section>

      <section className="support-workspace-grid">
        <form className="user-page-card support-ticket-form" onSubmit={submitTicket}>
          <div className="support-section-head">
            <div>
              <span className="booking-details-kicker">Create Ticket</span>
              <h3>Create a Support Ticket</h3>
            </div>
          </div>

          <div className="support-form-grid">
            <label>
              Category *
              <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} required>
                {categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              Subject *
              <input value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} required maxLength={80} placeholder="Short issue summary" />
            </label>
            <label className="support-full-width">
              Description *
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} required minLength={20} rows={5} placeholder="Please describe the issue in detail so we can help faster." />
            </label>
            <label>
              Booking ID (Optional)
              <input value={form.bookingId} onChange={(event) => setForm((current) => ({ ...current, bookingId: event.target.value }))} placeholder="Booking reference" />
            </label>
            <label>
              Transaction ID (Optional)
              <input value={form.transactionId} onChange={(event) => setForm((current) => ({ ...current, transactionId: event.target.value }))} placeholder="Transaction reference" />
            </label>
            <label className="support-full-width">
              Attachment (Image/PDF)
              <input
                ref={createFileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(event) => setFormAttachments(Array.from(event.target.files || []))}
              />
              <small>Max size 5MB. JPG, JPEG, PNG or PDF only.</small>
            </label>
          </div>

          {createState.error && <p className="error-text">{createState.error}</p>}
          {createState.message && <p className="support-success">{createState.message}</p>}

          <div className="support-form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setForm({ category: 'PAYMENT_ISSUE', subject: '', description: '', bookingId: '', transactionId: '' })}>
              Clear
            </button>
            <button type="submit" className="btn" disabled={createState.saving}>
              {createState.saving ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </form>

        <aside className="support-side-stack">
          <div className="user-page-card support-contact-card">
            <span className="booking-details-kicker">Contact Information</span>
            <h3>Professional Support</h3>
            <div className="support-contact-item"><strong>Support Email</strong><span>support@smartparking.com</span></div>
            <div className="support-contact-item"><strong>Phone</strong><span>+91 XXXXX XXXXX</span></div>
            <div className="support-contact-item"><strong>Working Hours</strong><span>Monday – Saturday<br />9:00 AM – 7:00 PM</span></div>
            <div className="support-contact-item"><strong>Emergency Support</strong><span>Available 24×7</span></div>
          </div>

        </aside>
      </section>

      <section className="user-page-card support-ticket-list-card">
        <div className="support-section-head support-list-head">
          <div>
            <span className="booking-details-kicker">My Support Tickets</span>
            <h3>My Support Tickets</h3>
          </div>
          <label className="support-search">
            <span>⌕</span>
            <input value={query} onChange={handleSearch} placeholder="Search Ticket ID, Booking ID or Subject" />
          </label>
        </div>

        {error && <p className="error-text">{error}</p>}
        {listLoading ? (
          <div className="support-empty-state">Loading tickets...</div>
        ) : ticketsPage.content?.length ? (
          <>
            <div className="dashboard-table-wrap user-responsive-table support-table-wrap">
              <table className="dashboard-table support-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Category</th>
                    <th>Subject</th>
                    <th>Booking ID</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Created On</th>
                    <th>Last Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketsPage.content.map((ticket) => (
                    <tr key={ticket.id}>
                      <td><strong>{ticket.ticketNumber || `SUP-${String(ticket.id).padStart(6, '0')}`}</strong></td>
                      <td>{categoryLabel(ticket.category)}</td>
                      <td>{ticket.subject}</td>
                      <td>{ticket.bookingId || '—'}</td>
                      <td><TicketStatus status={ticket.status} /></td>
                      <td>{ticket.priority}</td>
                      <td>{formatDateTime(ticket.createdAt)}</td>
                      <td>{formatDateTime(ticket.updatedAt || ticket.createdAt)}</td>
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

            <div className="support-pagination">
              <span>Showing {ticketsPage.content.length} of {ticketsPage.totalElements || 0} tickets</span>
              <div className="support-pagination-actions">
                <button type="button" className="btn btn-secondary" disabled={page <= 0} onClick={() => setPage((current) => Math.max(current - 1, 0))}>
                  Previous
                </button>
                <span className="support-pagination-page">Page {ticketsPage.page + 1} of {ticketsPage.totalPages || 1}</span>
                <button type="button" className="btn btn-secondary" disabled={ticketsPage.last} onClick={() => setPage((current) => current + 1)}>
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="support-empty-state">
            <strong>No tickets yet</strong>
            <p>Your support requests will appear here once you create your first ticket.</p>
          </div>
        )}
      </section>

      {ticketId && (
        <div className="support-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) navigate('/user/support'); }}>
          <div className="support-modal support-ticket-detail-modal">
            <div className="support-modal-head">
              <div>
                <span>{detailTicket.ticketNumber || `SUP-${String(ticketId).padStart(6, '0')}`}</span>
                <h3>{detailTicket.subject || 'Ticket Details'}</h3>
              </div>
              <button type="button" onClick={() => navigate('/user/support')} aria-label="Close">×</button>
            </div>

            {ticketLoading && !detailTicket.id ? (
              <div className="support-empty-state">Loading ticket details...</div>
            ) : (
              <>
                <div className="support-ticket-meta-grid">
                  <div><strong>Ticket ID</strong><span>{detailTicket.ticketNumber || `SUP-${String(ticketId).padStart(6, '0')}`}</span></div>
                  <div><strong>Category</strong><span>{categoryLabel(detailTicket.category) || 'Not available'}</span></div>
                  <div><strong>Status</strong><TicketStatus status={detailTicket.status} /></div>
                  <div><strong>Priority</strong><span>{detailTicket.priority || 'Not available'}</span></div>
                  <div><strong>Booking ID</strong><span>{detailTicket.bookingId || '—'}</span></div>
                  <div><strong>Transaction ID</strong><span>{detailTicket.transactionId || '—'}</span></div>
                  <div><strong>Created Date</strong><span>{formatDateTime(detailTicket.createdAt)}</span></div>
                  <div><strong>Last Updated</strong><span>{formatDateTime(detailTicket.updatedAt || detailTicket.createdAt)}</span></div>
                  <div><strong>Resolved Date</strong><span>{formatDateTime(detailTicket.resolvedAt)}</span></div>
                  <div><strong>Closed Date</strong><span>{formatDateTime(detailTicket.closedAt)}</span></div>
                </div>

                {detailTicket.status === 'WAITING_FOR_USER' && <p className="support-success">Support is waiting for your response.</p>}
                {detailTicket.status === 'RESOLVED' && <p className="support-success">This ticket has been resolved.</p>}
                {detailTicket.resolutionSummary && <div className="support-message-block"><span>Resolution Summary</span><p>{detailTicket.resolutionSummary}</p></div>}

                <div className="support-message-block">
                  <span>Description</span>
                  <p>{detailTicket.message || 'Not available'}</p>
                </div>

                {Array.isArray(detailTicket.attachments) && detailTicket.attachments.length > 0 && (
                  <div className="support-attachment-list">
                    <span>Attachments</span>
                    {detailTicket.attachments.map((attachment) => (
                      <a key={attachment.id} href={attachment.fileUrl} target="_blank" rel="noreferrer">
                        {attachment.originalFileName}
                      </a>
                    ))}
                  </div>
                )}

                <div className="support-conversation" ref={conversationRef}>
                  <h4>Conversation</h4>
                  {Array.isArray(detailTicket.messages) && detailTicket.messages.length > 0 ? (
                    detailTicket.messages.map((message) => (
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

                {showReplyForm && (
                  <form className="support-reply-form" onSubmit={sendReply}>
                    <label>
                      Reply
                      <textarea value={replyText} onChange={(event) => setReplyText(event.target.value)} rows={4} placeholder="Write your reply here..." />
                    </label>
                    <label>
                      Attach image
                      <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(event) => setReplyFiles(Array.from(event.target.files || []))} />
                    </label>
                    {replyState.error && <p className="error-text">{replyState.error}</p>}
                    <div className="support-form-actions">
                      <button type="submit" className="btn" disabled={replyState.saving}>
                        {replyState.saving ? 'Sending...' : 'Send Reply'}
                      </button>
                    </div>
                  </form>
                )}

              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

