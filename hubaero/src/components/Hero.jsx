import React from 'react';
import './Hero.css';

const Hero = () => {
  return (
    <section className="hero-section dark-bg animate-fade-in">
      <div className="hero-overlay"></div>
      
      {/* Background Image/Video Fallback - using CSS gradient for now */}
      <div className="hero-bg"></div>

      <div className="container hero-container">
        <div className="hero-content">
          <div className="subtitle-wrapper">
            <span className="subtitle text-white">Aviation Staffing &bull; Worldwide &bull; Since 2019</span>
          </div>
          
          <h1 className="section-title">
            The right people.<br/>
            The right place.<br/>
            <span className="text-accent">Right now.</span>
          </h1>
          
          <p className="hero-description">
            STAFFHUBAERO delivers integrated aviation workforce and operational solutions, from full personnel support and compliance management to the deployment of aircraft maintenance teams, crews and technical support for airlines and MROs.
          </p>
          
          <div className="hero-actions">
            <a href="#contact" className="btn btn-primary">Request Staff Now</a>
            <a href="#services" className="btn btn-outline-white">Explore Services</a>
          </div>
        </div>

        <div className="hero-stats glass-panel">
          <div className="stat-item">
            <h5 className="stat-number">400+</h5>
            <p className="stat-text">Contractors currently administered</p>
          </div>
          <div className="stat-item">
            <h5 className="stat-number">5,000+</h5>
            <p className="stat-text">Candidates in our database</p>
          </div>
          <div className="stat-item">
            <h5 className="stat-number">48h-72h</h5>
            <p className="stat-text">Deployment</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
