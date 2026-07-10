export default function FormValidationBanner({ title = 'Please check your entries', message, fieldErrors = {} }) {
  const items = Object.values(fieldErrors).filter(Boolean)
  if (!message && items.length === 0) return null

  return (
    <div className="form-validation-banner" role="alert">
      <div className="form-validation-banner__icon" aria-hidden="true">
        !
      </div>
      <div className="form-validation-banner__body">
        <p className="form-validation-banner__title">{title}</p>
        {message ? <p className="form-validation-banner__message">{message}</p> : null}
        {items.length > 0 ? (
          <ul className="form-validation-banner__list">
            {items.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
