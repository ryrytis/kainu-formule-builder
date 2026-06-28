import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer dark-bg">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <a href="/" className="logo">
              <span className="logo-text">STAFFHUB</span>
              <span className="logo-accent">AERO</span>
            </a>
            <p className="footer-desc">
              Aviation services, including team organisation, technical support and operational solutions for airlines and MROs worldwide. Based in Europe and the UK, operating globally since 2019.
            </p>
          </div>
          <div className="footer-slogan">
            <h3>Aviation Staffing<br/>Worldwide<br/><span className="text-accent">Since 2019</span></h3>
          </div>
        </div>

        <div className="footer-middle">
          <div className="footer-links-group">
            <h6 className="footer-links-title">Company</h6>
            <a href="/" className="footer-link">Home</a>
            <a href="#about" className="footer-link">About Us</a>
            <a href="#newsroom" className="footer-link">Newsroom</a>
            <a href="#contact" className="footer-link">Contact</a>
          </div>
          <div className="footer-links-group">
            <h6 className="footer-links-title">Services</h6>
            <a href="#services" className="footer-link">MRO & Maintenance</a>
            <a href="#services" className="footer-link">Airlines</a>
            <a href="#services" className="footer-link">Technical Support & AOG</a>
            <a href="#careers" className="footer-link">For Candidates</a>
          </div>
          <div className="footer-links-group">
            <h6 className="footer-links-title">Offices</h6>
            <a href="#contact" className="footer-link">Nicosia, Cyprus</a>
            <a href="#contact" className="footer-link">London, UK</a>
          </div>
          <div className="footer-contact-info">
            <p><strong>STAFFHUBAERO Limited</strong></p>
            <p><strong>Cyprus:</strong> 14 Michaloupoulou St, 2nd floor, Office 205, Nicosia</p>
            <p><strong>UK:</strong> 60 C/O Gray's Inn Road, London WC1X 8LU</p>
            <p className="mt-3">+357 22 270051</p>
            <a href="mailto:admin@staffhubaero.com" className="footer-email">admin@staffhubaero.com</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} StaffHubAero. All Rights Reserved.</p>
          <div className="footer-legal">
            <a href="/privacy-policy">Privacy Policy</a>
            <a href="/terms-of-service">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
