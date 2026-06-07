import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './AboutUs.css'

const FEATURES = [
  {
    id: 'inventory',
    title: 'Inventory',
    desc: 'Add and manage products with SKU, name, selling price, MRP, and live stock levels.',
    accent: 'INV',
  },
  {
    id: 'cart',
    title: 'Cart & checkout',
    desc: 'Build a cart, record cash or online sales, and print customer receipts.',
    accent: 'CRT',
  },
  {
    id: 'transactions',
    title: 'Transactions',
    desc: 'Full purchase history with customer names, totals, and payment method.',
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
    desc: 'Sales KPIs, charts, low-stock alerts, and multi-currency views in one place.',
    accent: 'DSH',
  },
  {
    id: 'security',
    title: 'Secure access',
    desc: 'Sign in to protect inventory, cart, transactions, and loan data.',
    accent: 'SEC',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Sign in',
    desc: 'Create an account or log in. Inventory, cart, transactions, and loans require authentication.',
  },
  {
    n: '02',
    title: 'Set up inventory',
    desc: 'Add products with selling price and original (MRP). Search, filter, and update stock anytime.',
  },
  {
    n: '03',
    title: 'Sell or lend',
    desc: 'Use the cart for purchases or loans. Dashboard and reports update automatically.',
  },
]

const AboutUs = () => {
  const { isAuthenticated } = useAuth()

  return (
    <div className="about page">
      <header className="about-hero">
        <div className="about-hero-inner">
          <p className="about-eyebrow">Inventory Management</p>
          <h1>About this application</h1>
          <p className="about-lead">
            A workspace for small and mid-sized businesses to run inventory, checkout, purchase history,
            and customer loans from one place — with a clear dashboard and professional reporting.
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
            <Link to="/stocks" className="btn btn-secondary">
              View inventory
            </Link>
          </div>
        </div>
      </header>

      <section className="about-highlights">
        <article className="about-highlight card">
          <span className="about-highlight-label">Inventory</span>
          <strong>Products & stock</strong>
          <span className="about-highlight-meta">SKU, pricing, quantities</span>
        </article>
        <article className="about-highlight card">
          <span className="about-highlight-label">Sales</span>
          <strong>Cart & checkout</strong>
          <span className="about-highlight-meta">Cash or online payment</span>
        </article>
        <article className="about-highlight card">
          <span className="about-highlight-label">Insights</span>
          <strong>Dashboard</strong>
          <span className="about-highlight-meta">Charts & alerts</span>
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
