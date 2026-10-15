import React, { useState } from 'react';

export function ReportForm() {
  const [report, setReport] = useState('');

  const handleSubmit = async () => {
    // API call from frontend
    await fetch('/api/reports', {
      method: 'POST',
      body: JSON.stringify({ report })
    });
  };

  return (
    <div>
      <input value={report} onChange={e => setReport(e.target.value)} />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}

export function UnusedComponent() {
  const [data, setData] = useState('');
  return <div>{data}</div>;
}
