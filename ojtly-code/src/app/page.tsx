"use client";
import { useState, useEffect } from 'react';
import Link from "next/link";
import { Inter, Space_Grotesk } from 'next/font/google';
import './Hero.css';

// Initialize Fonts
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter', 
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space', 
  display: 'swap',
});

const OJTlyLanding = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    const elements = document.querySelectorAll('.reveal');
    elements.forEach(el => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <div className={`${inter.variable} ${spaceGrotesk.variable} landing-wrapper`}>
      
      {/* Navigation Bar */}
      <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container navbar-content">
          <a href="#" className="logo">
            <span className="logo-icon">
              <img src="/Images/Logos.svg" alt="OJTly Logo" />
            </span> 
            <span className="logo-text">OJTly</span>
          </a>

          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
              {isMenuOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>

          <nav className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
            <a href="#" className="nav-link active">Home</a>
            <a href="#about" className="nav-link">About Us</a>
            <a href="#contact" className="nav-link">Help</a>
          </nav>

          <div className={`auth-buttons ${isMenuOpen ? 'active' : ''}`}>
            <Link href="/student/login" className="btn btn-ghost">Login</Link>
            <Link href="/student/register" className="btn btn-primary">Register</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-bg-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
        </div>
        
        <div className="container hero-content">
          <div className="hero-text reveal">
            <h1>
              Launch Your Career with the Perfect <span className="highlight">Internship</span>
            </h1>
            <p>
              Connect with leading companies and discover opportunities tailored to your skills. 
              OJTly makes career growth simple, accessible, and meaningful.
            </p>
            <div className="cta-group">
              <Link href="/student/register" className="btn btn-primary btn-large">
                Get Started 
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
              
              <a href="#features" className="btn btn-outline btn-large">How it Works</a>
            </div>
          </div>

          <div className="hero-visual reveal delay-1">
            <div className="visual-card">
              <div className="orbital-system">
                 <div className="core-circle"></div>
                 <div className="ring ring-1"></div>
                 <div className="ring ring-2"></div>
                 <div className="node node-1">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                 </div>
                 <div className="node node-2">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                 </div>
                 <div className="node node-3">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <div className="section-header reveal">
            <h2>Why Students Choose <span className="highlight">OJTly</span></h2>
            <p>We provide the tools and support you need to launch your career.</p>
          </div>

          <div className="features-grid">
            {[
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
                title: "Smart Matching",
                desc: "Our AI-powered algorithm connects you with roles that fit your unique skill set.",
                color: "blue"
              },
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
                title: "Skill Filtering",
                desc: "Find exactly what you're looking for with advanced search parameters.",
                color: "purple"
              },
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
                title: "Easy Application",
                desc: "Apply to multiple opportunities with a single profile and one-click actions.",
                color: "green"
              },
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
                title: "Verified Companies",
                desc: "Every company on our platform is vetted for safe, meaningful experiences.",
                color: "orange"
              }
            ].map((feature, idx) => (
              <div key={idx} className={`feature-card reveal delay-${idx}`}>
                <div className={`icon-box ${feature.color}`}>
                  <div className="icon-moving">{feature.icon}</div>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact / Bridge Section */}
      <section id="contact" className="contact-section">
         <div className="container contact-container reveal">
            <div className="contact-content">
                <span className="section-tag">Contact Us</span>
                <h2>Your Bridge to the Right Internship Experience</h2>
                <p>We’d love to hear from you! Whether you have questions, feedback, or need help, feel free to contact us and our team will assist you right away.</p>
                
                <div className="contact-actions">
                   <a href="mailto:kimantonares69@gmail.com" className="btn btn-primary btn-large">
                      Get in Touch
                      <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                         <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                         <polyline points="22,6 12,13 2,6"/>
                      </svg>
                   </a>
                </div>
            </div>
            <div className="contact-bg-shape"></div>
         </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-grid">
          {/* Brand Column */}
          <div className="footer-brand">
            <a href="#" className="logo">
              <img src="/Images/Logos.svg" alt="Logo" /> 
              <span>OJTly</span>
            </a>
            <p>Empowering the next generation of professionals to launch their careers with confidence.</p>
            
            {/* Social Icons */}
            <div className="social-links">
              <a href="#" aria-label="Twitter">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
                </svg>
              </a>
              <a href="#" aria-label="LinkedIn">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
                </svg>
              </a>
              <a href="#" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div className="footer-links">
            <div className="footer-col">
              <h4>Platform</h4>
              <a href="#">Browse OJTs</a>
              <a href="#">For Companies</a>
              <a href="#">System Requirements</a>
              <a href="#">Help Center</a>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <a href="#">About OJTly</a>
              <a href="#">Contact Us</a>
              <a href="#">Careers</a>
              <a href="#">Press Kit</a>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default OJTlyLanding;