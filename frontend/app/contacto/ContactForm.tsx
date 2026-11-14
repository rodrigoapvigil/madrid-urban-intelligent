'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

type ContactValues = {
  name: string;
  email: string;
  organization: string;
  reason: string;
  message: string;
  privacy: boolean;
};

type ContactField = keyof ContactValues;
type FormErrors = Partial<Record<ContactField, string>>;

const initialValues: ContactValues = {
  name: '',
  email: '',
  organization: '',
  reason: '',
  message: '',
  privacy: false,
};

function validate(values: ContactValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.name.trim()) errors.name = 'Escribe tu nombre.';
  if (!values.email.trim()) errors.email = 'Escribe tu email.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Introduce un email válido.';
  if (!values.reason) errors.reason = 'Selecciona un motivo.';
  if (!values.message.trim()) errors.message = 'Escribe un mensaje.';
  if (!values.privacy) errors.privacy = 'Debes aceptar la Política de privacidad para continuar.';
  return errors;
}

export default function ContactForm() {
  const [values, setValues] = useState<ContactValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  function update<K extends ContactField>(field: K, value: ContactValues[K]) {
    setValues(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
    if (status === 'error' || status === 'sent') setStatus('idle');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setStatus('idle');
      return;
    }

    setStatus('sending');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          organization: values.organization.trim(),
          reason: values.reason,
          message: values.message.trim(),
          privacyAccepted: values.privacy,
        }),
      });
      if (!response.ok) throw new Error('No se pudo enviar el mensaje.');
      setValues(initialValues);
      setErrors({});
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  return (
    <form className="contact-form" onSubmit={submit} noValidate>
      <div className="contact-form__grid">
        <label className="contact-field">
          <span>Nombre <b>*</b></span>
          <input autoComplete="name" name="name" value={values.name} onChange={event => update('name', event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'contact-name-error' : undefined} />
          {errors.name && <small id="contact-name-error" className="contact-field__error">{errors.name}</small>}
        </label>

        <label className="contact-field">
          <span>Email <b>*</b></span>
          <input autoComplete="email" type="email" name="email" value={values.email} onChange={event => update('email', event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'contact-email-error' : undefined} />
          {errors.email && <small id="contact-email-error" className="contact-field__error">{errors.email}</small>}
        </label>

        <label className="contact-field">
          <span>Organización <em>Opcional</em></span>
          <input autoComplete="organization" name="organization" value={values.organization} onChange={event => update('organization', event.target.value)} />
        </label>

        <label className="contact-field">
          <span>Motivo <b>*</b></span>
          <select name="reason" value={values.reason} onChange={event => update('reason', event.target.value)} aria-invalid={Boolean(errors.reason)} aria-describedby={errors.reason ? 'contact-reason-error' : undefined}>
            <option value="">Selecciona un motivo</option>
            <option value="Colaboración">Colaboración</option>
            <option value="Prensa y medios">Prensa y medios</option>
            <option value="Datos y metodología">Datos y metodología</option>
            <option value="Sugerencia o error">Sugerencia o error</option>
          </select>
          {errors.reason && <small id="contact-reason-error" className="contact-field__error">{errors.reason}</small>}
        </label>

        <label className="contact-field contact-field--full">
          <span>Mensaje <b>*</b></span>
          <textarea name="message" rows={6} value={values.message} onChange={event => update('message', event.target.value)} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? 'contact-message-error' : undefined} />
          {errors.message && <small id="contact-message-error" className="contact-field__error">{errors.message}</small>}
        </label>
      </div>

      <label className="contact-privacy">
        <input type="checkbox" checked={values.privacy} onChange={event => update('privacy', event.target.checked)} aria-invalid={Boolean(errors.privacy)} aria-describedby={errors.privacy ? 'contact-privacy-error' : undefined} />
        <span>He leído la <Link href="/privacidad" target="_blank">Política de privacidad</Link> <b>*</b>.</span>
      </label>
      {errors.privacy && <small id="contact-privacy-error" className="contact-field__error contact-privacy__error">{errors.privacy}</small>}

      <button className="contact-form__submit" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Enviando…' : status === 'error' ? 'Reintentar envío' : 'Enviar mensaje'}
      </button>

      <div className="contact-form__status" aria-live="polite" role="status">
        {status === 'sent' && <p className="is-success">Hemos recibido tu mensaje. Gracias por escribirnos.</p>}
        {status === 'error' && <p className="is-error">No hemos podido enviar el mensaje. Comprueba tu conexión e inténtalo de nuevo.</p>}
      </div>
    </form>
  );
}
