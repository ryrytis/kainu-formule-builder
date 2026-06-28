import React from 'react';
import './Contact.css';

const Contact = () => {
  return (
    <section id="contact" className="section contact-section">
      <div className="container">
        <div className="contact-wrapper">
          <div className="contact-info">
            <h2 className="section-title">Ready to mobilise?</h2>
            <p className="contact-desc">
              Submit your request and our team will respond with specialist availability, estimated mobilisation timeline and a cost breakdown tailored to your scope.
            </p>
            
            <div className="contact-details">
              <div className="contact-detail-item">
                <div className="contact-icon">📍</div>
                <div>
                  <strong>Cyprus Office</strong><br/>
                  14 Michaloupoulou St, 2nd floor, Office 205, Nicosia
                </div>
              </div>
              <div className="contact-detail-item">
                <div className="contact-icon">📍</div>
                <div>
                  <strong>UK Office</strong><br/>
                  60 C/O Gray's Inn Road, London WC1X 8LU
                </div>
              </div>
              <div className="contact-detail-item">
                <div className="contact-icon">📞</div>
                <div>+357 22 270051</div>
              </div>
              <div className="contact-detail-item">
                <div className="contact-icon">✉️</div>
                <div>admin@staffhubaero.com</div>
              </div>
            </div>
          </div>

          <div className="contact-form-wrapper">
            <form className="contact-form">
              <input type="text" className="form-input" placeholder="Company Name e.g. Lufthansa Technik" required />
              <input type="text" className="form-input" placeholder="Full Name" required />
              <input type="email" className="form-input" placeholder="Email Address" required />
              <select className="form-select" required defaultValue="">
                <option value="" disabled>Service Required...</option>
                <option value="MRO & Maintenance Staffing">MRO &amp; Maintenance Staffing</option>
                <option value="Flight Crew / Cabin Crew">Flight Crew / Cabin Crew</option>
                <option value="AOG Recovery Team">AOG Recovery Team</option>
                <option value="Technical Supports & Parts">Technical Supports &amp; Parts</option>
                <option value="Schengen Work Permit Assistance">Schengen Work Permit Assistance</option>
                <option value="General Recruitment">General Recruitment</option>
                <option value="Other">Other</option>
              </select>
              <textarea className="form-textarea" placeholder="Please share your details. e.g. aircraft type, location, scope, required qualifications..." required></textarea>
              <button type="submit" className="btn btn-primary btn-submit">Submit Request</button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
