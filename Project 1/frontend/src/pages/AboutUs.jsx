import './AboutUs.css'

const AboutUs = () => {
  return (
    <div className="about-us-page">
      <div className="about-container">
        <section className="hero-section">
          <h1>About This Project</h1>
          <p className="subtitle">
            Inventory Management — a web app to manage items, cart, buy/loan transactions, and offers.
          </p>
        </section>

        <section className="content-section">
          <div className="section-card">
            <h2>What This Project Does</h2>
            <p>
              This application lets you manage inventory items (symbol, company name, price in ₹, quantity, market price).
              You can add items to a cart, record Buy or Loan transactions with a customer name and total, and add offers
              on items. Buy transactions are listed on the Transactions page; loans are summarized per person on the Loan page.
            </p>
          </div>

          <div className="section-card">
            <h2>Features in This Project</h2>
            <div className="features-grid">
              <div className="feature-item">
                <div className="feature-icon">📦</div>
                <h3>Inventory</h3>
                <p>View, create, edit, and delete items. Each item has symbol, company name, price (₹), quantity, and market price.</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🛒</div>
                <h3>Cart</h3>
                <p>Add inventory items to your cart. From the cart you can record a Buy or Loan transaction (customer name and total in ₹).</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">📋</div>
                <h3>Buy Transactions</h3>
                <p>The Transactions page shows only buy (purchase) history: date, customer name, and total for each transaction.</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">💰</div>
                <h3>Loan</h3>
                <p>The Loan page shows total loan per customer. If the same person takes a loan again, the new amount is added to their total.</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">💬</div>
                <h3>Offers</h3>
                <p>On each item’s detail page you can add offers (title and content). Offers are listed on the item and count is shown on the inventory list.</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🔐</div>
                <h3>Authentication</h3>
                <p>Register and login with JWT. Inventory, Cart, Transactions, and Loan are available only when logged in.</p>
              </div>
            </div>
          </div>

          <div className="section-card">
            <h2>Tech Used in This Project</h2>
            <div className="tech-stack">
              <div className="tech-category">
                <h3>Frontend</h3>
                <ul>
                  <li><strong>React</strong> — UI (pages: Home, About Us, Inventory, Cart, Transactions, Loan, Login, Register)</li>
                  <li><strong>React Router</strong> — Routing</li>
                  <li><strong>Axios</strong> — API calls</li>
                  <li><strong>Vite</strong> — Build and dev server</li>
                </ul>
              </div>
              <div className="tech-category">
                <h3>Backend</h3>
                <ul>
                  <li><strong>ASP.NET Core</strong> — Web API</li>
                  <li><strong>Entity Framework Core</strong> — Database access</li>
                  <li><strong>SQL Server</strong> — Database</li>
                  <li><strong>ASP.NET Core Identity + JWT</strong> — Auth</li>
                  <li><strong>Swagger</strong> — API docs</li>
                </ul>
              </div>
              <div className="tech-category">
                <h3>In This Codebase</h3>
                <ul>
                  <li><strong>API</strong> — Stock, Portfolio (cart), Offer, Transaction, Account</li>
                  <li><strong>Models</strong> — Stock, Offer, Portfolio, Transaction, AppUser</li>
                  <li><strong>Repository + DTOs</strong> — Data layer and request/response shapes</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="section-card">
            <h2>How to Use This Project</h2>
            <div className="getting-started">
              <div className="step">
                <span className="step-number">1</span>
                <div>
                  <h3>Register or Login</h3>
                  <p>Create an account or sign in. You need to be logged in to use Inventory, Cart, Transactions, and Loan.</p>
                </div>
              </div>
              <div className="step">
                <span className="step-number">2</span>
                <div>
                  <h3>Inventory</h3>
                  <p>Browse items, create or edit them. Open an item to view details and add offers.</p>
                </div>
              </div>
              <div className="step">
                <span className="step-number">3</span>
                <div>
                  <h3>Cart & Transactions</h3>
                  <p>Add items to the cart. Use Buy or Loan, enter customer name and confirm. Totals appear on Transactions (buy only) and Loan (loan total per person).</p>
                </div>
              </div>
            </div>
          </div>

          <div className="section-card footer-note-card">
            <p className="footer-note">This page describes only this project — Inventory Management (React + ASP.NET Core).</p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default AboutUs
