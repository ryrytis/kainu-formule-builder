import React from 'react';
import './Professionals.css';

const Professionals = () => {
  return (
    <section id="about" className="section professionals-section">
      <div className="container">
        <div className="prof-grid">
          <div className="prof-info">
            <div className="subtitle-wrapper">
              <span className="subtitle">FOR AVIATION PROFESSIONALS</span>
            </div>
            <h2 className="section-title">Looking for your next role?</h2>
            <p className="prof-desc">
              Whether you're a licensed engineer, pilot, cabin crew member or ground operations specialist, we work with the world's leading airlines and MROs and can match your qualifications to the right opportunity.
              <br /><br />
              We handle compliance, travel, accommodation and ongoing support throughout your contract. For non-EU professionals, we also provide full Schengen visa and work permit assistance.
            </p>
            
            <div className="prof-stats">
              <div className="avatars">
                <div className="avatar-placeholder"></div>
                <div className="avatar-placeholder"></div>
                <div className="avatar-placeholder"></div>
                <div className="avatar-placeholder"></div>
              </div>
              <div className="stat-text-wrapper">
                <h5 className="stat-num">1000+</h5>
                <p>Expertly deployed engineers and crew professionals</p>
              </div>
            </div>

            <div className="prof-actions">
              <a href="#careers" className="btn btn-primary">View Open Roles</a>
              <a href="#cv" className="btn-text">Submit Your CV &rarr;</a>
            </div>
          </div>

          <div className="prof-features">
            <div className="prof-feature-card">
              <h5 className="prof-feature-title">Competitive Rates</h5>
              <p className="prof-feature-desc">Open, transparent rates across all roles. No hidden deductions.</p>
            </div>
            <div className="prof-feature-card">
              <h5 className="prof-feature-title">Travel &amp; Accommodation</h5>
              <p className="prof-feature-desc">Fully coordinated before you arrive, every assignment.</p>
            </div>
            <div className="prof-feature-card">
              <h5 className="prof-feature-title">Compliance Support</h5>
              <p className="prof-feature-desc">We track your licence renewals and approvals, so you don't have to.</p>
            </div>
            <div className="prof-feature-card">
              <h5 className="prof-feature-title">Visa &amp; Work Permits</h5>
              <p className="prof-feature-desc">Full Schengen permit support for non-EU professionals.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Professionals;
