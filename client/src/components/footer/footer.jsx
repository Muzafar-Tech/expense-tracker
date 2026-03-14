// client/src/components/Footer/Footer.jsx
import "./footer.css";

const LinkedInIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
  </svg>
);

const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
  </svg>
);

const PortfolioIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const EmailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
  </svg>
);

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer-root">
      <div className="footer-glow" />

      <div className="footer-main">

        {/* ── Left — Brand ──────────────────────────── */}
        <div className="footer-brand">
  <div className="footer-logo">
    <div className="footer-logo-icon">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    </div>
    <span className="footer-logo-text">ExpenseTracker</span>
  </div>
  <p className="footer-brand-desc">
    A smart expense splitting app built for groups.
    Track shared costs, manage balances, and settle
    up effortlessly — all in one place.
  </p>
</div>

        {/* ── Middle — Contact ───────────────────────── */}
        <div className="footer-contact">
          <h4 className="footer-col-title">Contact</h4>
          <div className="footer-contact-list">
            <a
              href="mailto:muzaffarameen389@gmail.com"
              className="footer-contact-item"
            >
              <span className="footer-contact-icon email">
                <EmailIcon />
              </span>
              <span>muzaffarameen389@gmail.com</span>
            </a>
            <a
              href="https://wa.me/923474862915"
              target="_blank"
              rel="noreferrer"
              className="footer-contact-item"
            >
              <span className="footer-contact-icon whatsapp">
                <WhatsAppIcon />
              </span>
              <span>0347 4862915</span>
            </a>
            <a
              href="tel:+923474862915"
              className="footer-contact-item"
            >
              <span className="footer-contact-icon phone">
                <PhoneIcon />
              </span>
              <span>0347 4862915</span>
            </a>
          </div>
        </div>

        {/* ── Right — Social ─────────────────────────── */}
        <div className="footer-social">
          <h4 className="footer-col-title">Let's Connect</h4>
          <div className="footer-social-links">
            <a
              href="https://muzaffar-ameen-portfolio.netlify.app/"
              target="_blank"
              rel="noreferrer"
              className="footer-social-link portfolio"
            >
              <PortfolioIcon />
              <span>Portfolio</span>
            </a>
            <a
              href="https://www.linkedin.com/in/muzaffar-ameen"
              target="_blank"
              rel="noreferrer"
              className="footer-social-link linkedin"
            >
              <LinkedInIcon />
              <span>LinkedIn</span>
            </a>
            <a
              href="https://github.com/Muzaffar-Ameen/Muzaffar-Ameen"
              target="_blank"
              rel="noreferrer"
              className="footer-social-link github"
            >
              <GitHubIcon />
              <span>GitHub</span>
            </a>
          </div>
        </div>

      </div>

      {/* ── Bottom bar ──────────────────────────────── */}
      <div className="footer-bottom">
        <span>© {year} ExpenseTracker. All rights reserved.</span>
        <span>Designed & Developed by <strong>Muzaffar Ameen</strong></span>
      </div>

    </footer>
  );
}