
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_URL}/api/history`);
      setHistory(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load query history. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const rerunQuery = (query) => {
    localStorage.setItem("currentQuery", query);
    localStorage.removeItem("queryResult");
    navigate("/processing");
  };

  return (
    <div className="history-page">
      <h1>Query History</h1>
      <p>View and rerun your previous GIS queries.</p>

      <button onClick={fetchHistory} disabled={loading}>
        {loading ? "Loading..." : "Refresh History"}
      </button>

      {loading && <p>Loading query history...</p>}

      {error && (
        <p role="alert" style={{ color: "red" }}>
          {error}
        </p>
      )}

      {!loading && !error && history.length === 0 && (
        <p>No query history found. Submit a GIS query to get started.</p>
      )}

      {!loading && !error && history.length > 0 && (
        <div className="history-list">
          {history.map((item) => (
            <article
              key={item.id}
              className="history-card"
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "16px",
                marginTop: "12px",
              }}
            >
              <h3>{item.query_text}</h3>

              <p>
                <strong>Status:</strong>{" "}
                <span
                  style={{
                    color:
                      item.status === "Completed" ? "green" : "crimson",
                  }}
                >
                  {item.status}
                </span>
              </p>

              <p>
                <strong>Date:</strong>{" "}
                {item.date_time
                  ? new Date(item.date_time).toLocaleString()
                  : "Not available"}
              </p>

              <button onClick={() => rerunQuery(item.query_text)}>
                Run Again
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
