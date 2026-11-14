'use client';

import { FormEvent, useEffect, useState } from 'react';
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

const reasons = ['Colaboración', 'Prensa y medios', 'Datos y metodología', 'Sugerencia o error'];

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
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (status !== 'sent') {
      setShowSuccess(false);
      return;
    }
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 240;
    const timer = window.setTimeout(() => setShowSuccess(true), delay);
    return () => window.clearTimeout(timer);
  }, [status]);

  function update<K extends ContactField>(field: K, value: ContactValues[K]) {
    setValues(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
    if (status === 'error' || status === 'sent') setStatus('idle');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const honeypot = (new FormData(form).get('website') as string | null)?.trim() ?? '';
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setStatus('idle');
      window.requestAnimationFrame(() => {
        form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      });
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
          website: honeypot,
        }),
      });
      if (!response.ok) throw new Error('No se pudo enviar el mensaje.');
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  if (showSuccess) {
    return (
      <section className="contact-form__success" role="status" aria-live="polite" tabIndex={-1}>
        <span className="contact-form__success-mark" aria-hidden="true">✓</span>
        <h2>Gracias por escribirnos</h2>
        <p>Hemos recibido tu mensaje y revisaremos tu consulta.</p>
      </section>
    );
  }

  return (
    <form className={`contact-form${status === 'sent' ? ' is-fading' : ''}`} onSubmit={submit} noValidate aria-busy={status === 'sending'}>
      <div className="contact-form__trap" aria-hidden="true">
        <label htmlFor="contact-website">Deja este campo vacío</label>
        <input id="contact-website" type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="contact-form__grid">
        <div className={`contact-field${errors.name ? ' has-error' : ''}`}>
          <input id="contact-name" className="contact-field__control" autoComplete="name" name="name" placeholder=" " value={values.name} onChange={event => update('name', event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'contact-name-error' : undefined} />
          <label htmlFor="contact-name" className="contact-field__label">Nombre <b>*</b></label>
          {errors.name && <small id="contact-name-error" className="contact-field__error">{errors.name}</small>}
        </div>

        <div className={`contact-field${errors.email ? ' has-error' : ''}`}>
          <input id="contact-email" className="contact-field__control" autoComplete="email" type="email" name="email" placeholder=" " value={values.email} onChange={event => update('email', event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'contact-email-error' : undefined} />
          <label htmlFor="contact-email" className="contact-field__label">Email <b>*</b></label>
          {errors.email && <small id="contact-email-error" className="contact-field__error">{errors.email}</small>}
        </div>

        <div className="contact-field">
          <input id="contact-organization" className="contact-field__control" autoComplete="organization" name="organization" placeholder=" " value={values.organization} onChange={event => update('organization', event.target.value)} />
          <label htmlFor="contact-organization" className="contact-field__label">Organización <em>Opcional</em></label>
        </div>

        <div className={`contact-field contact-field--full contact-reasons${errors.reason ? ' has-error' : ''}`} role="group" aria-labelledby="contact-reason-label" aria-invalid={Boolean(errors.reason)} aria-describedby={errors.reason ? 'contact-reason-error' : undefined} tabIndex={-1}>
          <span id="contact-reason-label" className="contact-reasons__label">Motivo <b>*</b></span>
          <div className="contact-reasons__chips">
            {reasons.map(reason => (
              <button key={reason} type="button" className="contact-reasons__chip" aria-pressed={values.reason === reason} onClick={() => update('reason', reason)}>
                {reason}
              </button>
            ))}
          </div>
          {errors.reason && <small id="contact-reason-error" className="contact-field__error">{errors.reason}</small>}
        </div>

        <div className={`contact-field contact-field--full${errors.message ? ' has-error' : ''}`}>
          <textarea id="contact-message" className="contact-field__control" name="message" rows={6} placeholder=" " value={values.message} onChange={event => update('message', event.target.value)} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? 'contact-message-error' : undefined} />
          <label htmlFor="contact-message" className="contact-field__label">Mensaje <b>*</b></label>
          {errors.message && <small id="contact-message-error" className="contact-field__error">{errors.message}</small>}
        </div>
      </div>

      <label className="contact-privacy">
        <input className="contact-privacy__checkbox" type="checkbox" checked={values.privacy} onChange={event => update('privacy', event.target.checked)} aria-invalid={Boolean(errors.privacy)} aria-describedby={errors.privacy ? 'contact-privacy-error' : undefined} />
        <span>He leído la <Link href="/privacidad" target="_blank">Política de privacidad</Link> <b>*</b>.</span>
      </label>
      {errors.privacy && <small id="contact-privacy-error" className="contact-field__error contact-privacy__error">{errors.privacy}</small>}

      <button className="contact-form__submit" type="submit" disabled={status === 'sending'}>
        {status === 'sending' && <span className="contact-form__spinner" aria-hidden="true" />}
        {status === 'sending' ? 'Enviando…' : status === 'error' ? 'Reintentar envío ↗' : 'Enviar mensaje ↗'}
      </button>
      <p className="contact-form__privacy-note">Tus datos se usarán únicamente para gestionar y responder tu consulta. Consulta la <Link href="/privacidad" target="_blank">Política de privacidad</Link>.</p>

      <div className="contact-form__status" aria-live="polite" role="status">
        {status === 'error' && <p className="is-error">No hemos podido enviar el mensaje. Comprueba tu conexión e inténtalo de nuevo.</p>}
      </div>
    </form>
  );
}
