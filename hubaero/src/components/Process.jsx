import React from 'react';
import './Process.css';

const Process = () => {
  return (
    <section className="section process-section dark-bg">
      <div className="container">
        <div className="section-header">
          <div className="subtitle-wrapper">
            <span className="subtitle">PROCESS</span>
          </div>
          <h2 className="section-title text-white">
            From request to on-site<br />
            <span className="text-accent">in 48-72 hours</span>
          </h2>
        </div>

        <div className="process-grid">
          <div className="process-step">
            <div className="step-number">1</div>
            <h4 className="step-title">Submit Your Request</h4>
            <p className="step-desc">
              Describe your AOG or manpower needs. We respond quickly with specialist availability and cost estimate.
            </p>
          </div>
          <div className="process-step">
            <div className="step-number">2</div>
            <h4 className="step-title">Candidate Matching</h4>
            <p className="step-desc">
              Certified specialists matched from our global pool to your scope, type rating and location.
            </p>
          </div>
          <div className="process-step">
            <div className="step-number">3</div>
            <h4 className="step-title">Compliance Check &amp; Deployment</h4>
            <p className="step-desc">
              Licences and approvals verified. Team mobilised with travel and full documentation coordinated, ready to work from day one.
            </p>
          </div>
          <div className="process-step">
            <div className="step-number">4</div>
            <h4 className="step-title">Ongoing Support</h4>
            <p className="step-desc">
              We remain actively involved throughout the assignment. We are reachable and responsive to any issue, not just placing candidates and issuing invoices.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Process;
