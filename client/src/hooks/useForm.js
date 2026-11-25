import { useRef, useState } from 'react';

/**
 * Minimal form state: values, field errors, a form-level error and submit handling.
 * validate(values) -> { field: message } runs on the client; API field errors (error.details) are merged in too.
 *
 * bind(name, { sanitize }) wires an input. `sanitize` cleans the value on every keystroke (e.g. strips digits from a name).
 * A field is validated again when it loses focus (once the user has typed in it), so errors appear while filling the form.
 */
export function useForm(initialValues, { validate, onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const dirty = useRef(new Set());

  const setField = (name, value) => {
    dirty.current.add(name);
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
    setFormError('');
  };

  // Works for <input>, <select>, <textarea> and checkboxes
  const bind = (name, { sanitize } = {}) => ({
    name,
    value: values[name] ?? '',
    onChange: (e) => {
      const raw = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setField(name, sanitize && typeof raw === 'string' ? sanitize(raw) : raw);
    },
    onBlur: () => {
      if (!dirty.current.has(name)) return;
      const message = validate?.(values)[name];
      setErrors((e) => ({ ...e, [name]: message || undefined }));
    },
  });

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setFormError('');
    const clientErrors = validate?.(values) ?? {};
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      // Move focus to the first invalid field so the problem is obvious.
      document.getElementById(Object.keys(clientErrors)[0])?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setErrors(err.details ?? {});
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return { values, errors, formError, submitting, setField, bind, handleSubmit, reset: setValues };
}
