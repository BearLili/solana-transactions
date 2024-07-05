import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [mnemonicList, setMnemonicList] = useState([]);
  const [batchSize, setBatchSize] = useState(20);
  const [maxTransactionCount, setMaxTransactionCount] = useState(100);
  const [maxFailureCount, setMaxFailureCount] = useState(30);
  const [log, setLog] = useState("");
  const [loading, setLoading] = useState(false);
  const [ws, setWs] = useState(null);

  // WebSocket setup
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:3000");
    setWs(socket);

    socket.onmessage = (event) => {
      setLog((prevLog) => `${prevLog}\n${event.data}`);
    };

    return () => {
      socket.close();
    };
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadProgress(0);
    setUploadSuccess(false);
    setMnemonicList([]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("请先选择一个助记词xlsx文件！");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://localhost:3000/upload", formData, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(progress);
        },
      });
      setLog(res.data);
      setUploadSuccess(true);

      // Fetch the mnemonic list after upload
      const mnemonicRes = await axios.get("http://localhost:3000/mnemonics");
      setMnemonicList(mnemonicRes.data);
    } catch (err) {
      console.error(err);
      setLog("File upload failed.");
      setUploadSuccess(false);
    }
  };

  const handleExecute = async () => {
    if (!uploadSuccess) {
      alert("Please upload a valid file first.");
      return;
    }

    setLoading(true);
    setLog("");

    const config = {
      batchSize: batchSize || 2,
      maxTransactionCount: maxTransactionCount || 3,
      maxFailureCount: maxFailureCount || 1,
    };

    try {
      const configRes = await axios.post(
        "http://localhost:3000/set-config",
        config
      );
      setLog((prevLog) => `${prevLog}\n${configRes.data}`);

      const executeRes = await axios.get("http://localhost:3000/execute");
      setLog((prevLog) => `${prevLog}\n${executeRes.data}`);
    } catch (err) {
      console.error(err);
      setLog((prevLog) => `${prevLog}\nExecution failed.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Sonic 自动交易</h1>
      <div className="input-group">
        <input type="file" onChange={handleFileChange} disabled={loading} />
      </div>
      {uploadProgress > 0 && (
        <progress value={uploadProgress} max="100">
          {uploadProgress}%
        </progress>
      )}
      {uploadSuccess && <p>文件上传成功!</p>}
      <div className="input-group">
        <label>
          每批账号数量:
          <input
            type="number"
            value={batchSize}
            onChange={(e) => setBatchSize(e.target.value)}
            disabled={loading}
          />
        </label>
        <label>
          需交易次数:
          <input
            type="number"
            value={maxTransactionCount}
            onChange={(e) => setMaxTransactionCount(e.target.value)}
            disabled={loading}
          />
        </label>
        <label>
          最大失败次数:
          <input
            type="number"
            value={maxFailureCount}
            onChange={(e) => setMaxFailureCount(e.target.value)}
            disabled={loading}
          />
        </label>
      </div>
      <div>
        <button
          onClick={handleUpload}
          disabled={loading}
          style={{ marginRight: "10px" }}
        >
          读取助记词
        </button>
        <button onClick={handleExecute} disabled={loading || !uploadSuccess}>
          开始执行交易
        </button>
      </div>

      <h4>{`交易执行日志 :`}</h4>
      {loading && <p>请稍后...</p>}
      <div className="log">
        {/* <h4>交易执行日志:</h4> */}
        <pre>{log}</pre>
      </div>

      <div className="mnemonic-list">
        <h4>{`助记词名单（合计${mnemonicList?.length}条）:`}</h4>
        <ul>
          {mnemonicList.slice(0, 15).map((mnemonic, index) => (
            <li key={index}>{mnemonic}</li>
          ))}
          {mnemonicList?.length > 15 && <li>...</li>}
        </ul>
      </div>
    </div>
  );
}

export default App;
