import Modal from './Modal';
import Button from './Button';

/** Confirmation step before destructive actions (deletes). */
export default function ConfirmDialog({ open, title = 'Are you sure?', message, confirmLabel = 'Delete', loading, onConfirm, onCancel }) {
  return (
    <Modal open={open} title={title} onClose={onCancel} size="sm"
      footer={<>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button variant="danger" icon="trash" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </>}>
      <p className="confirm-message">{message}</p>
    </Modal>
  );
}
