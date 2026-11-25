import { phoneMaxLength } from '../utils/validators';

/** Label + control + error message (+ optional character counter), wired up for screen readers. */
export function Field({ label, name, error, required, hint, counter, children }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={name}>{label}{required && <span className="req" aria-hidden="true"> *</span>}</label>
      {children}
      {(error || hint || counter) && (
        <div className="field-foot">
          {error ? <p className="field-error" id={`${name}-error`} role="alert">{error}</p>
            : <p className="field-hint">{hint}</p>}
          {counter && <span className="field-counter" aria-hidden="true">{counter}</span>}
        </div>
      )}
    </div>
  );
}

const aria = (name, error) => ({ id: name, name, 'aria-invalid': !!error, 'aria-describedby': error ? `${name}-error` : undefined });

// Show "12/60" automatically for any field that has a maxLength.
const count = (props) => (props.maxLength ? `${String(props.value ?? '').length}/${props.maxLength}` : undefined);

export const Input = ({ label, name, error, required, hint, counter, ...props }) => (
  <Field {...{ label, name, error, required, hint }} counter={counter ?? count(props)}><input {...aria(name, error)} {...props} /></Field>
);

/**
 * Pakistani phone number: "+92" + 10 digits, or 11 digits starting with 0.
 * Pair with bind(name, { sanitize: sanitizePhone }) so letters/symbols can't be typed. No maxLength attribute on purpose:
 * browsers cut pasted text to maxLength *before* it is cleaned, which would break pasting "+92 300 1234567".
 */
export const PhoneInput = ({ value = '', ...props }) => (
  <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="03001234567 or +923001234567"
    hint="03XX XXXXXXX or +92 + 10 digits" counter={`${value.length}/${phoneMaxLength(value)}`}
    value={value} {...props} />
);

export const Select = ({ label, name, error, required, hint, options, placeholder, ...props }) => (
  <Field {...{ label, name, error, required, hint }}>
    <select {...aria(name, error)} {...props}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
    </select>
  </Field>
);

export const Textarea = ({ label, name, error, required, hint, ...props }) => (
  <Field {...{ label, name, error, required, hint }} counter={count(props)}><textarea rows={3} {...aria(name, error)} {...props} /></Field>
);

/** Banner for a form-level error (e.g. API conflict message). */
export const FormError = ({ message }) => message ? <div className="form-error" role="alert">{message}</div> : null;
