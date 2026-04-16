/**
 * CCXNY Inquiry Service Layer
 * Handles secure API handshakes for technical inquiries.
 */

export async function submitTechnicalInquiry(formData) {
  try {
    const response = await fetch('/api/inquiry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to submit inquiry');
    }

    return await response.json();
  } catch (error) {
    console.error('Inquiry Service Error:', error);
    throw error;
  }
}
