import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Processing() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const query = localStorage.getItem('currentQuery');
  const steps = ["Retrieving relevant GIS metadata (RAG)", "Generating structured GIS workflow (Qwen3)", "Validating workflow", "Executing spatial operations", "Generating result"];

  useEffect(() => {
    const runBackend = async () => {
      setStep(1);
      await new Promise(r => setTimeout(r, 800));
      setStep(2);
      
      try {
        // Call FastAPI Backend
        const res = await axios.post('http://localhost:8000/api/query', { query: query });
        localStorage.setItem('queryResult', JSON.stringify(res.data));
        setStep(5);
        setTimeout(() => navigate('/result'), 800);
      } catch (err) {
        alert("Backend error. Is FastAPI running?");
        navigate('/');
      }
    };
    runBackend();
  }, [navigate, query]);

  return (
    <div className="max-w-2xl mx-auto mt-12 bg-white p-8 rounded-xl border border-gray-200">
      <h2 className="text-2xl font-bold mb-8">Processing Your Query...</h2>
      <div className="space-y-6">
        {steps.map((text, i) => (
          <div key={i} className="flex items-center gap-4">
            {i < step ? <span className="text-green-500 text-xl">✔</span> : i === step ? <span className="text-blue-500 text-xl animate-spin">⟳</span> : <span className="text-gray-300 text-xl">⏺</span>}
            <p className={`font-semibold ${i > step ? 'text-gray-400' : 'text-gray-800'}`}>{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}