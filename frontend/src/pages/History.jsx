import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function History() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8000/api/history').then(res => setHistory(res.data));
  }, []);

  return (
    <div className="max-w-5xl mx-auto bg-white p-8 rounded-xl border border-gray-200">
      <h2 className="text-2xl font-bold mb-6">Recent Queries</h2>
      <div className="space-y-3">
        {history.map((h) => (
          <div key={h.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium">{h.query}</p>
              <p className="text-xs text-gray-500">{h.date}</p>
            </div>
            <span className="text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-semibold">{h.status}</span>
          </div>
        ))}
        {history.length === 0 && <p className="text-gray-500">No history found. Run a query first.</p>}
      </div>
    </div>
  );
}