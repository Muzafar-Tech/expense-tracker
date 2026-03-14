// client/src/pages/Home/Home.jsx
import { Link } from "react-router-dom";
import "./Home.css";
import MuzaffarPic from "../../assets/Muzaffar Pic.png";
import Footer from "../../components/footer/footer";

function Home() {
  return (
    <div className="home-root">

      {/* ══════════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════════ */}
      <section className="home-hero">
        <div className="home-hero-inner">

          <div className="home-badge">
            <span className="home-badge-dot" />
            Free to use · Invite only
          </div>

          <h1 className="home-title">
            Welcome to{" "}
            <span className="home-title-accent">Expense Tracker</span>
          </h1>

          <p className="home-subtitle">
            Track your expenses, understand your spending, and stay in control
            of your money with a clean and simple dashboard.
          </p>

          <div className="home-actions">
            <Link to="/auth" className="home-btn-primary">
              Login
            </Link>
            {/* FUTURE: Uncomment when you want public signup */}
            {/* <Link to="/auth" className="home-btn-secondary">Sign up</Link> */}
          </div>

          <div className="home-stats">
            <div className="home-stat">
              <span className="home-stat-num">3+</span>
              <span className="home-stat-label">Active Groups</span>
            </div>
            <div className="home-stat-divider" />
            <div className="home-stat">
              <span className="home-stat-num">Rs 483K+</span>
              <span className="home-stat-label">Tracked</span>
            </div>
            <div className="home-stat-divider" />
            <div className="home-stat">
              <span className="home-stat-num">100%</span>
              <span className="home-stat-label">Free</span>
            </div>
          </div>
        </div>

        {/* Floating mockup card */}
        <div className="home-mockup">
          <div className="mockup-card">
            <div className="mockup-header">
              <div className="mockup-dot red" />
              <div className="mockup-dot yellow" />
              <div className="mockup-dot green" />
              <span className="mockup-title">Add Expense</span>
            </div>
            <div className="mockup-body">
              <div className="mockup-row">
                <span className="mockup-label">Description</span>
                <span className="mockup-value">Dinner at Haveli</span>
              </div>
              <div className="mockup-row">
                <span className="mockup-label">Paid By</span>
                <div className="mockup-paidby">
                  <div className="mockup-avatar">A</div>
                  <span>Ali</span>
                </div>
              </div>
              <div className="mockup-row">
                <span className="mockup-label">Amount</span>
                <span className="mockup-amount">Rs 4,500</span>
              </div>
              <div className="mockup-row">
                <span className="mockup-label">Split</span>
                <span className="mockup-badge">Equal · 3 people</span>
              </div>
              <div className="mockup-pills">
                {["A", "S", "M"].map((l, i) => (
                  <div className="mockup-pill" key={i}>
                    <div className="mockup-avatar sm">{l}</div>
                    <span>Rs 1,500</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          HOW IT WORKS — 3 CARDS
      ══════════════════════════════════════════════ */}
      <section className="home-section">
        <div className="home-section-header">
          <span className="home-section-tag">How it works</span>
          <h2 className="home-section-title">Everything you need to split fairly</h2>
          <p className="home-section-sub">
            From creating a group to settling the last rupee — we've got it covered.
          </p>
        </div>

        <div className="home-cards">
          {[
            {
              icon: "👥",
              color: "blue",
              title: "Create a Group",
              points: [
                "Contact admin to get your account",
                "Log in and create a group instantly",
                "Members must have an ExpenseTracker account",
                "Invite them by their registered email",
              ],
            },
            {
              icon: "💸",
              color: "amber",
              title: "Add & Split Expenses",
              points: [
                "Add any expense with description & amount",
                "Choose single or multiple payers",
                "Split equally, by percentage, or exact amounts",
                "Select which members to split among",
              ],
            },
            {
              icon: "✅",
              color: "green",
              title: "Settle Up",
              points: [
                "See a clear balance — who owes who",
                "Send a payment request with one tap",
                "Creditor confirms or rejects the payment",
                "Balance clears automatically on confirm",
              ],
            },
          ].map((card, i) => (
            <div className={`home-card home-card-${card.color}`} key={i}>
              <div className={`home-card-icon home-card-icon-${card.color}`}>
                {card.icon}
              </div>
              <h3 className="home-card-title">{card.title}</h3>
              <ul className="home-card-list">
                {card.points.map((p, j) => (
                  <li key={j} className="home-card-item">
                    <span className={`home-card-check home-card-check-${card.color}`}>✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          NOTICE — INVITE ONLY
      ══════════════════════════════════════════════ */}
      <section className="home-section home-notice-section">
        <div className="home-notice">
          <div className="home-notice-icon">🔐</div>
          <div className="home-notice-content">
            <h3 className="home-notice-title">Invite-Only Access</h3>
            <p className="home-notice-text">
              ExpenseTracker is currently invite-only. To get access, contact
              the admin and provide your name and email. The admin will create
              your account and share your credentials.
              <br /><br />
              <strong>Important:</strong> To add someone to your group, they
              must already have an account in ExpenseTracker. You cannot add
              someone who hasn't registered yet.
            </p>
          </div>
          <Link to="/auth" className="home-notice-btn">Login Now</Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          DEVELOPER SECTION
      ══════════════════════════════════════════════ */}
      <section className="home-section home-developer-section">
        <div className="home-section-header">
          <span className="home-section-tag">Meet the developer</span>
          <h2 className="home-section-title">Built with passion</h2>
        </div>

        <div className="home-developer">
          {/* Left */}
          <div className="dev-left">
            <div className="dev-avatar-wrap">
              <div className="dev-avatar">
                <img src={MuzaffarPic} alt="Muzaffar" />
              </div>
              <div className="dev-avatar-ring" />
            </div>
            <div className="dev-contacts">
              <a href="mailto:muzaffarameen389@gmail.com" className="dev-contact">
                📧 muzaffarameen389@gmail.com
              </a>
              <a href="tel:+923474862915" className="dev-contact">
                📱 0347 4862915
              </a>
              <span className="dev-contact">📍 Lahore, Pakistan</span>
            </div>
          </div>

          {/* Right */}
          <div className="dev-right">
            <div className="dev-name-row">
              <h3 className="dev-name">Muzaffar Ameen</h3>
              <span className="dev-role">Associate Software Engineer</span>
            </div>

            <p className="dev-bio">
              A passionate MERN stack developer who built ExpenseTracker
              from scratch — designing the database, building the REST API,
              crafting the UI, and deploying to production. Focused on
              creating clean, scalable, and user-friendly web applications.
            </p>

            <div className="dev-skills">
              {[
                { label: "Frontend", items: ["React.js", "HTML5", "CSS3"],         color: "blue"  },
                { label: "Backend",  items: ["Node.js", "Express.js", "MongoDB"],  color: "green" },
                { label: "Tools",    items: ["GitHub", "VS Code", "Postman"],      color: "amber" },
              ].map((g) => (
                <div className="dev-skill-row" key={g.label}>
                  <span className="dev-skill-label">{g.label}</span>
                  <div className="dev-skill-tags">
                    {g.items.map((item) => (
                      <span className={`dev-skill-tag dev-skill-tag-${g.color}`} key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="dev-project-note">
              🚀 This project demonstrates full-stack development with React,
              Node.js, Express, MongoDB Atlas, JWT auth, and cloud deployment
              on Render + Netlify.
            </div>
          </div>
        </div>
      </section>
       <Footer />
    </div>
  );
}

export default Home;