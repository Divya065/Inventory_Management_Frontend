import './Footer.css'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-container">
        <p className="footer-text">
          &copy; {currentYear} Inventory Management. All rights reserved.
        </p>
        <p className="footer-subtext">
          Built with React and ASP.NET Core
        </p>
      </div>
    </footer>
  )
}

export default Footer













