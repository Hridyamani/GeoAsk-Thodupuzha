
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = '/api';
const steps = [
  'Preparing your GIS query',
  'Sending query to FastAPI',
  'Executing spatial operations',
  'Preparing GeoJSON results',
  'Opening results',
];

export default function Processing() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    let redirectTimer;

    async function runBackend() {
      const query = localStorage.getItem('currentQuery');

      if (!query?.trim()) {
        setError('No query found. Please enter a spatial query first.');
        return;
      }

      try {
        setStep(1);

        const response = await axios.post(
          `${API_URL}/query`,
          { query: query.trim() },
          { timeout: 120000 }
        );

        if (cancelled) return;

        const result = response.data;

        if (result.status !== 'success') {
          throw new Error(
            result.explanation || 'The GIS query could not be completed.'
          );
        }

        localStorage.setItem('queryResult', JSON.stringify(result));

        setStep(4);

        redirectTimer = setTimeout(() => {
          if (!cancelled) navigate('/result');
        }, 700);
      } catch (err) {
        if (cancelled) return;

        const message =
          err.response?.data?.detail ||
          err.message ||
          'Could not connect to the GIS backend.';

        setError(message);
      }
    }

    runBackend();

    return () => {
      cancelled = true;
      clearTimeout(redirectTimer);
    };
  }, [navigate]);

  return (
    <div className="mx-auto mt-12 max-w-2xl rounded-xl border border-gray-200 bg-white p-8">
      <h2 className="mb-3 text-2xl font-bold text-gray-900">
        Processing Your Query
      </h2>

      <p className="mb-8 break-words text-sm text-gray-500">
        Query: {localStorage.getItem('currentQuery') || 'No query entered'}
      </p>

      <div className="space-y-6">
        {steps.map((text, index) => {
          const completed = !error && index < step;
          const active = !error && index === step;

          return (
            <div key={text} className="flex items-center gap-4">
              <span
                className={`text-xl ${
                  completed
                    ? 'text-green-600'
                    : active
                      ? 'animate-spin text-blue-600'
                      : 'text-gray-300'
                }`}
              >
                {completed ? '✔' : active ? '⟳' : '⏺'}
              </span>

              <p
                className={`font-medium ${
                  completed || active
                    ? 'text-gray-800'
                    : 'text-gray-400'
                }`}
              >
                {text}
              </p>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="font-semibold text-red-700">
            Query processing failed
          </h3>

          <p className="mt-2 break-words text-sm text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={() => navigate('/query')}
            className="mt-4 rounded-lg bg-[#0f3d2e] px-5 py-2 text-sm font-medium text-white hover:bg-[#185c46]"
          >
            Back to Query
          </button>
        </div>
      )}
    </div>
  );
}
