import React, { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [data, setData] = useState({
    windowPrevState: [],
    windowCurrState: [],
    numbers: [],
    avg: 0,
  });
  const [manualNumber, setManualNumber] = useState("");

  useEffect(() => {
    const fetchNumbers = async () => {
      try {
        const response = await axios.get("http://localhost:5000/numbers");
        setData(response.data);
      } catch (error) {
        console.error("Error fetching data", error);
      }
    };

    fetchNumbers();
    const interval = setInterval(fetchNumbers, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleAddNumber = () => {
    if (!isNaN(manualNumber) && manualNumber.trim() !== "") {
      setData((prevData) => {
        const updatedNumbers = [...prevData.numbers, parseFloat(manualNumber)];
        if (updatedNumbers.length > 5) updatedNumbers.shift();

        const newAverage =
          updatedNumbers.reduce((sum, num) => sum + num, 0) /
          updatedNumbers.length;
        return {
          windowPrevState: [...prevData.windowCurrState],
          windowCurrState: updatedNumbers,
          numbers: updatedNumbers,
          avg: newAverage,
        };
      });
      setManualNumber("");
    }
  };

  return (
    <div
      style={{
        textAlign: "center",
        marginTop: "20px",
        padding: "20px",
        borderRadius: "10px",
        background: "#f0f0f0",
      }}
    >
      <h1 style={{ color: "#333" }}>Average Calculator</h1>
      <input
        type="number"
        value={manualNumber}
        onChange={(e) => setManualNumber(e.target.value)}
        placeholder="Enter a number"
        style={{
          padding: "10px",
          marginRight: "10px",
          borderRadius: "5px",
          border: "1px solid #aaa",
        }}
      />
      <button
        onClick={handleAddNumber}
        style={{
          padding: "10px",
          background: "#28a745",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Add Number
      </button>

      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          background: "white",
          borderRadius: "10px",
          boxShadow: "0px 0px 10px rgba(0,0,0,0.1)",
        }}
      >
        <h3 style={{ color: "#007bff" }}>Current State</h3>
        <p>
          <strong>Previous Window:</strong>{" "}
          {JSON.stringify(data.windowPrevState)}
        </p>
        <p>
          <strong>Current Window:</strong>{" "}
          {JSON.stringify(data.windowCurrState)}
        </p>
        <p>
          <strong>Numbers:</strong> {data.numbers.join(", ")}
        </p>
        <p>
          <strong>Average:</strong>{" "}
          <span style={{ fontWeight: "bold", color: "#d9534f" }}>
            {data.avg.toFixed(2)}
          </span>
        </p>
      </div>
    </div>
  );
}

export default App;