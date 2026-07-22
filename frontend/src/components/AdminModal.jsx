import React, { useEffect } from 'react';

export default function AdminModal({ open, title, subtitle, children, onClose, size = 'medium' }) {
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event) => event.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', close); };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
    <section className={`admin-modal admin-modal-${size}`} role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
      <header><div><h2 id="admin-modal-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" aria-label="Close" onClick={onClose}>×</button></header>
      <div className="admin-modal-body">{children}</div>
    </section>
  </div>;
}
