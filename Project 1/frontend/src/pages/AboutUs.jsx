import './AboutUs.css'

const AboutUs = () => {
  return (
    <div className="about-us-page">
      <div className="about-container">
        <section className="hero-section">
          <h1>About Inventory Management</h1>
          <p className="subtitle">
            A comprehensive web application for managing your inventory, tracking stock items, and organizing your business assets
          </p>
        </section>

        <section className="content-section">
          <div className="section-card">
            <h2>Project Overview</h2>
            <p>
              Inventory Management is a full-stack web application designed to help businesses and individuals manage their 
              inventory efficiently. The platform provides a seamless experience for tracking items, managing stock levels, 
              and engaging with team members through comments and discussions about inventory items.
            </p>
          </div>

          <div className="section-card">
            <h2>Key Features</h2>
            <div className="features-grid">
              <div className="feature-item">
                <div className="feature-icon">📊</div>
                <h3>Inventory Item Management</h3>
                <p>View, create, edit, and manage inventory items with detailed information including item code, name, purchase price, industry category, and market value.</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">💼</div>
                <h3>Portfolio Tracking</h3>
                <p>Build and manage your inventory portfolio. Add items to your portfolio and track your inventory in one convenient location.</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">💬</div>
                <h3>Team Comments</h3>
                <p>Engage with your team by adding comments on inventory items. Share insights, ask questions, and collaborate effectively.</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🔐</div>
                <h3>Secure Authentication</h3>
                <p>Secure user authentication with JWT tokens. Register, login, and manage your account with confidence.</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">📱</div>
                <h3>Responsive Design</h3>
                <p>Fully responsive design that works seamlessly on desktop, tablet, and mobile devices for access anywhere.</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">⚡</div>
                <h3>Fast & Modern</h3>
                <p>Built with modern technologies for optimal performance and user experience.</p>
              </div>
            </div>
          </div>

          <div className="section-card">
            <h2>Technology Stack</h2>
            <div className="tech-stack">
              <div className="tech-category">
                <h3>Frontend</h3>
                <ul>
                  <li><strong>React.js</strong> - Modern UI library for building interactive user interfaces</li>
                  <li><strong>React Router DOM</strong> - Client-side routing and navigation</li>
                  <li><strong>Axios</strong> - HTTP client for API communication</li>
                  <li><strong>Vite</strong> - Fast build tool and development server</li>
                  <li><strong>CSS3</strong> - Modern styling with responsive design</li>
                </ul>
              </div>
              <div className="tech-category">
                <h3>Backend</h3>
                <ul>
                  <li><strong>ASP.NET Core</strong> - Cross-platform web framework</li>
                  <li><strong>Entity Framework Core</strong> - ORM for database operations</li>
                  <li><strong>SQL Server</strong> - Relational database management system</li>
                  <li><strong>ASP.NET Core Identity</strong> - Authentication and authorization</li>
                  <li><strong>JWT (JSON Web Tokens)</strong> - Secure token-based authentication</li>
                  <li><strong>Swagger/OpenAPI</strong> - API documentation</li>
                </ul>
              </div>
              <div className="tech-category">
                <h3>Architecture</h3>
                <ul>
                  <li><strong>RESTful API</strong> - Standard API design principles</li>
                  <li><strong>Repository Pattern</strong> - Data access abstraction</li>
                  <li><strong>DTO (Data Transfer Objects)</strong> - Structured data transfer</li>
                  <li><strong>CORS</strong> - Cross-origin resource sharing</li>
                  <li><strong>MVC Architecture</strong> - Separation of concerns</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="section-card">
            <h2>Project Structure</h2>
            <div className="structure-info">
              <div className="structure-item">
                <h3>Frontend Structure</h3>
                <ul>
                  <li><strong>Pages</strong> - Main application pages (Home, Stocks, Portfolio, Login, Register)</li>
                  <li><strong>Components</strong> - Reusable UI components (Layout, Navbar, Header, Footer)</li>
                  <li><strong>Services</strong> - API communication services</li>
                  <li><strong>Contexts</strong> - React Context for state management (Authentication)</li>
                  <li><strong>Utils</strong> - Utility functions and helpers</li>
                </ul>
              </div>
              <div className="structure-item">
                <h3>Backend Structure</h3>
                <ul>
                  <li><strong>Controllers</strong> - API endpoints (Stock, Portfolio, Comment, Account)</li>
                  <li><strong>Models</strong> - Database entities (Stock, Comment, Portfolio, AppUser)</li>
                  <li><strong>DTOs</strong> - Data transfer objects for API requests/responses</li>
                  <li><strong>Repository</strong> - Data access layer</li>
                  <li><strong>Mappers</strong> - Entity to DTO conversion</li>
                  <li><strong>Services</strong> - Business logic (Token Service)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="section-card">
            <h2>Security Features</h2>
            <ul className="security-list">
              <li>✅ JWT-based authentication for secure user sessions</li>
              <li>✅ Password hashing using ASP.NET Core Identity</li>
              <li>✅ Protected routes requiring authentication</li>
              <li>✅ CORS configuration for secure cross-origin requests</li>
              <li>✅ Input validation on both frontend and backend</li>
              <li>✅ SQL injection protection through Entity Framework</li>
            </ul>
          </div>

          <div className="section-card">
            <h2>Getting Started</h2>
            <div className="getting-started">
              <div className="step">
                <span className="step-number">1</span>
                <div>
                  <h3>Register an Account</h3>
                  <p>Create a new account by providing your username, email, and a secure password.</p>
                </div>
              </div>
              <div className="step">
                <span className="step-number">2</span>
                <div>
                  <h3>Explore Inventory Items</h3>
                  <p>Browse the available inventory items, view detailed information, and read team comments.</p>
                </div>
              </div>
              <div className="step">
                <span className="step-number">3</span>
                <div>
                  <h3>Build Your Portfolio</h3>
                  <p>Add items to your inventory portfolio to track your stock levels.</p>
                </div>
              </div>
              <div className="step">
                <span className="step-number">4</span>
                <div>
                  <h3>Collaborate with Team</h3>
                  <p>Share your insights and communicate with your team by commenting on inventory items.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="section-card">
            <h2>Future Enhancements</h2>
            <ul className="enhancements-list">
              <li>📈 Real-time inventory level updates</li>
              <li>📊 Advanced inventory analytics and reports</li>
              <li>🔔 Low stock alerts and notifications</li>
              <li>📱 Mobile application</li>
              <li>🌐 Multi-user collaboration features</li>
              <li>💹 Inventory history and trends</li>
              <li>🔍 Advanced search and filtering</li>
              <li>📧 Email notifications for stock alerts</li>
              <li>📦 Barcode scanning support</li>
              <li>📋 Inventory reports and exports</li>
            </ul>
          </div>

          <div className="section-card">
            <h2>Contact & Support</h2>
            <p>
              This project is a demonstration of modern full-stack web development practices. 
              For questions, suggestions, or contributions, please refer to the project documentation 
              or contact the development team.
            </p>
            <p className="footer-note">
              Built with ❤️ using React.js and ASP.NET Core
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default AboutUs





