import React from 'react';
import './Services.css';

const Services = () => {
  return (
    <section id="services" className="section services-section">
      <div className="container">
        <div className="section-header">
          <div className="subtitle-wrapper">
            <span className="subtitle">WHAT WE DO</span>
          </div>
          <h2 className="section-title">Aviation services for every operational context</h2>
          <p className="section-description">
            From emergency AOG response to long-term team management, STAFFHUBAERO delivers the people, technical expertise and operational support your organisation needs.
          </p>
        </div>

        <div className="services-grid">
          <div className="service-card">
            <div className="service-content">
              <h3 className="service-title">MRO &amp; Maintenance</h3>
              <p className="service-desc">
                B1/B2 engineers, mechanics, NDT technicians, sheet metal workers, painters and structural specialists for short-term gaps, scheduled maintenance checks and long-term contracts.
              </p>
            </div>
            <div className="service-arrow">↗</div>
          </div>
          
          <div className="service-card accent-bg">
            <div className="service-content">
              <h3 className="service-title">Global &amp; Local Airlines</h3>
              <p className="service-desc">
                Experienced flight crew, cabin crew and maintenance engineers, from single placements to complete crew solutions for ACMI, charter and line operations.
              </p>
            </div>
            <div className="service-arrow">↗</div>
          </div>
          
          <div className="service-card dark-bg">
            <div className="service-content">
              <h3 className="service-title">Technical Support &amp; AOG</h3>
              <p className="service-desc">
                End-to-end AOG recovery, spare parts sourcing, logistics and specialised technical services through our certified Part-145 partner network.
              </p>
            </div>
            <div className="service-arrow">↗</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Services;
