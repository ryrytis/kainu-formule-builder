import React, { useState, useEffect } from 'react';
import './Navbar.css';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container nav-container">
        <a href="/" className="logo">
          <span className="logo-text">STAFFHUB</span>
          <span className="logo-accent">AERO</span>
        </a>

        <nav className={`nav-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <a href="#" className="nav-link">Home</a>
          <a href="#about" className="nav-link">About</a>
          <a href="#services" className="nav-link">Services</a>
          <a href="#newsroom" className="nav-link">Newsroom</a>
          <a href="#contact" className="btn btn-primary nav-btn">Request Staff Now</a>
        </nav>

        <button 
          className="burger-btn" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation"
        >
          <span className={`burger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
          <span className={`burger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
          <span className={`burger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
