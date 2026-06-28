import React, { useState } from 'react';
import './Testimonials.css';

const testimonials = [
  {
    quote: "Working with your team is a great experience. My contract with Lufthansa Technik was arranged quickly, and the qualification and onboarding process was handled in a highly professional and efficient manner. All travel support was well organized.",
    name: "Grega Klinar",
    role: "B2 A320 Licensed Engineer · Slovenia"
  },
  {
    quote: "It has been a true pleasure to complete two seasons with STAFFHUBAERO in Cyprus. All agreed conditions were fulfilled, with excellent coordination and prompt support in addressing needs. The team provided full cycle assistance so you can be fully focused on professional achievements.",
    name: "Dimitar Vasilev",
    role: "Team Lead B1 A320 CRS Engineer · Bulgaria"
  },
  {
    quote: "Working with STAFFHUBAERO team is delightful. I'm currently working on my ongoing contract in Bird Aviation. All conditions were arranged in the best manner, and on satisfactory terms for both sides. I would like to thank Igor and his team for their support.",
    name: "Ilia Babic",
    role: "B1 LAME A320/330 · Serbia"
  }
];

const Testimonials = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  return (
    <section className="section testimonials-section dark-bg">
      <div className="container">
        <div className="section-header">
          <div className="subtitle-wrapper">
            <span className="subtitle text-white">TESTIMONIALS</span>
          </div>
          <h2 className="section-title text-white">Trusted by aviation professionals across Europe</h2>
          <p className="section-description text-white">
            What our contractors can say about STAFFHUBAERO.
          </p>
        </div>

        <div className="testimonials-slider">
          <div className="testimonial-content">
            <h3 className="testimonial-quote">"{testimonials[currentSlide].quote}"</h3>
            <div className="testimonial-author">
              <h6 className="author-name">{testimonials[currentSlide].name}</h6>
              <p className="author-role">{testimonials[currentSlide].role}</p>
            </div>
          </div>
          
          <div className="slider-controls">
            <button onClick={prevSlide} className="slider-btn" aria-label="Previous Testimonial">&larr;</button>
            <div className="slider-dots">
              {testimonials.map((_, index) => (
                <button 
                  key={index} 
                  className={`dot ${currentSlide === index ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            <button onClick={nextSlide} className="slider-btn" aria-label="Next Testimonial">&rarr;</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
