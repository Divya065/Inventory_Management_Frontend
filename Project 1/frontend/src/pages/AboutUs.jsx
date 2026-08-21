import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './AboutUs.css'

const FEATURES = [
  {
    id: 'inventory',
    title: 'Products',
    desc: 'Add items with company name, product name, barcode, expiry, selling price, MRP, and live quantities.',
    accent: 'PRD',
  },
  {
    id: 'cart',
    title: 'Cart & checkout',
    desc: 'Scan or search to build a cart, park a waiting customer, then checkout with cash, card, or online pay.',
    accent: 'CRT',
  },
  {
    id: 'transactions',
    title: 'Transactions',
    desc: 'Purchase history with customer, totals, payment method, receipts, and revert when stock must go back.',
    accent: 'TXN',
  },
  {
    id: 'loans',
    title: 'Loans',
    desc: 'Track credit sales per customer with payments and outstanding balances.',
    accent: 'LN',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    desc: 'Day close, sales charts, low stock, out of stock, and expiry alerts in one place.',
    accent: 'DSH',
  },
  {
    id: 'security',
    title: 'Secure access',
    desc: 'Sign in to protect products, cart, transactions, and loan data.',
    accent: 'SEC',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Sign in',
    desc: 'Create an account or log in. Products, cart, transactions, and loans require authentication.',
  },
  {
    n: '02',
    title: 'Set up products',
    desc: 'Add items with selling price, MRP, barcode, and expiry. Search and update quantities anytime.',
  },
  {
    n: '03',
    title: 'Sell or lend',
    desc: 'Use the cart for purchases or loans. Dashboard, day close, and reports update automatically.',
  },
]

const AboutUs = () => {
  const { isAuthenticated } = useAuth()

  return (
    <div className="about page">
      <header className="about-hero">
        <div className="about-hero-inner">
          <p className="about-eyebrow">Inventory Management</p>
          <h1>Control stock, sales, and credit from one workspace.</h1>
          <p className="about-lead">
            Built for all sizes of business. Inventory Management keeps your product catalog,
            counter checkout, sales records, and customer loans together in one secure place.
          </p>
          <p className="about-lead-sub">
            Know what you have, what you sold, and what is still owed — then close the day with a clear picture.
          </p>
          <div className="about-hero-actions">
            {isAuthenticated ? (
              <Link to="/" className="btn btn-primary">
                Open dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-primary">
                  Sign in
                </Link>
                <Link to="/register" className="btn btn-secondary">
                  Create account
                </Link>
              </>
            )}
            <Link to="/products" className="btn btn-secondary">
              View products
            </Link>
          </div>
        </div>
      </header>

      <section className="about-highlights">
        <article className="about-highlight card">
          <span className="about-highlight-label">Catalog</span>
          <strong>Products &amp; stock</strong>
          <span className="about-highlight-meta">Barcode, pricing, quantities</span>
        </article>
        <article className="about-highlight card">
          <span className="about-highlight-label">Sales</span>
          <strong>Cart & checkout</strong>
          <span className="about-highlight-meta">Cash, card, or online</span>
        </article>
        <article className="about-highlight card">
          <span className="about-highlight-label">Insights</span>
          <strong>Dashboard</strong>
          <span className="about-highlight-meta">Day close, charts &amp; alerts</span>
        </article>
        <article className="about-highlight card">
          <span className="about-highlight-label">Credit</span>
          <strong>Loan tracking</strong>
          <span className="about-highlight-meta">Per customer</span>
        </article>
      </section>

      <section className="about-panel card">
        <div className="about-panel-head">
          <h2>What you can do</h2>
          <p className="about-panel-sub">Core modules included in this build</p>
        </div>
        <div className="about-features">
          {FEATURES.map((f) => (
            <article key={f.id} className="about-feature">
              <span className="about-feature-icon" aria-hidden>
                {f.accent}
              </span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-panel card">
        <div className="about-panel-head">
          <h2>How it works</h2>
          <p className="about-panel-sub">Three steps to get started</p>
        </div>
        <ol className="about-steps">
          {STEPS.map((step) => (
            <li key={step.n} className="about-step">
              <span className="about-step-num">{step.n}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="about-footer card">
        <p>
          <strong>Inventory Management</strong> — React frontend with ASP.NET Core API and SQL Server.
        </p>
        <p className="about-footer-note">
          Built for demos and day-to-day store operations. Switch currency and theme from the top bar when signed in.
        </p>
      </footer>
    </div>
  )
}

export default AboutUs
