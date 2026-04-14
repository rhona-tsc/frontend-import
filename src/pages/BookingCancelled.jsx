// src/pages/BookingCancelled.jsx
import React from 'react';
import { Helmet } from 'react-helmet-async';

const BookingCancelled = () => (
<>
  <Helmet
  title="Booking Cancelled | The Supreme Collective"
  canonicalPath="/booking-cancelled"
  noindex={true}
/>

  <div className="p-10 text-center">
    <h1 className="text-xl font-semibold">Booking Cancelled</h1>
    <p>If this was a mistake, please try again or contact us for support.</p>
  </div>
  </>
);

export default BookingCancelled;