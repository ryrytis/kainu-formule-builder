import React from 'react';
import './Features.css';

const Features = () => {
  return (
    <section id="features" className="section features-section">
      <div className="container">
        <div className="features-grid">
          <div className="feature-card">
            <h6 className="feature-title">48–72 Hour Deployment</h6>
            <p className="feature-content">
              Every hour of downtime carries significant operational and financial impact. We rapidly mobilise specialists and coordinate on-site, ad hoc support, depending on location and regulatory requirements.
            </p>
          </div>
          <div className="feature-card">
            <h6 className="feature-title">Strict Compliance Monitoring</h6>
            <p className="feature-content">
              Verified references, real-time tracking of licences and type ratings, assistance with A1 certificates and tax consultations. Every candidate verified before deployment without exceptions.
            </p>
          </div>
          <div className="feature-card">
            <h6 className="feature-title">Cloud-Powered Recruitment</h6>
            <p className="feature-content">
              Benefitting from cloud-based technologies, we make selection, recruitment and onboarding more efficient, which gives clients full visibility and candidates a faster path to work.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
