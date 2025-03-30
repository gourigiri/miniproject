import { useState, useEffect } from "react";
import { FaCloudUploadAlt } from "react-icons/fa";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import Tesseract from "tesseract.js";
import { supabase } from "../supabaseClient";

export default function ReportUpload() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [extractingText, setExtractingText] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [file]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit.");
      return;
    }

    if (selectedFile.type === "image/png" || selectedFile.type === "image/jpeg") {
      setFile(selectedFile);
    } else {
      alert("Only PNG and JPEG images are allowed.");
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file before uploading.");
      return;
    }

    setUploading(true);
    setMessage("");

    // ✅ Fetch the logged-in user's ID
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user?.id) {
      setMessage("Authentication error. Please log in again.");
      setUploading(false);
      return;
    }
    const userId = authData.user.id;
    console.log("Authenticated user ID:", userId);

    const fileExt = file.name.split(".").pop();
    const filePath = `reports/${userId}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("reports").upload(filePath, file);
    if (uploadError) {
      console.error("Upload error:", uploadError.message);
      setMessage("Upload failed. Try again.");
      setUploading(false);
      return;
    }

    const { data: fileData } = supabase.storage.from("reports").getPublicUrl(filePath);
    const imageUrl = fileData.publicUrl;
    console.log("Uploaded file URL:", imageUrl);

    // ✅ Ensure the user exists in UserTable before inserting into reports
    const { data: existingUser, error: userCheckError } = await supabase
      .from("UserTable")
      .select("auth_uid")
      .eq("auth_uid", userId)
      .single();

    if (userCheckError || !existingUser) {
      console.log("User does not exist, inserting new user...");

      const { error: userInsertError } = await supabase.from("UserTable").insert([{ auth_uid: userId }]);

      if (userInsertError) {
        console.error("User insert error:", userInsertError.message);
        setMessage(`User creation failed: ${userInsertError.message}`);
        setUploading(false);
        return;
      }

      console.log("User inserted successfully!");
    }

    // ✅ Perform OCR
    setExtractingText(true);
    setMessage("Extracting text from image...");

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

      const blob = await response.blob();
      const { data: ocrResult } = await Tesseract.recognize(blob, "eng");
      const extractedText = ocrResult?.text?.trim() || "";

      console.log("Extracted Text:", extractedText);

      if (!extractedText) {
        setMessage("No readable text found in the image.");
        setExtractingText(false);
        setUploading(false);
        return;
      }

      // ✅ Insert extracted text into ReportTable
      console.log("Inserting into reports table...");
      const { error: insertError } = await supabase
        .from("reports")
        .insert([{ auth_uid: userId, extracted_text: extractedText }]);

      if (insertError) {
        console.error("Insert error:", insertError.message);
        setMessage(`Insert failed: ${insertError.message}`);
      } else {
        setMessage("File uploaded & text extracted successfully!");
      }
    } catch (ocrError) {
      console.error("OCR error:", ocrError);
      setMessage("OCR failed. Try another image.");
    }

    setExtractingText(false);
    setUploading(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-gray-900">
        Nutrition <span className="font-light">Report Upload</span>
      </h1>
      <p className="text-gray-600 mt-2">Upload your nutrition report images to generate insightful analytics.</p>

      <div className="grid md:grid-cols-2 gap-8 mt-6">
        {/* Upload Section */}
        <div className="bg-white shadow-md p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Upload New Report</h2>
          <p className="text-sm text-gray-500 mb-4">Supported formats: PNG, JPEG (Max: 10MB)</p>

          <label className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-10 cursor-pointer hover:border-green-500 transition">
            <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleFileChange} />
            <FaCloudUploadAlt className="text-4xl text-green-500 mb-2" />
            <p className="text-gray-600">Click to upload or drag and drop</p>
          </label>

          {preview && (
            <div className="mt-4">
              <p className="text-sm font-medium">Selected File:</p>
              <img src={preview} alt="Preview" className="mt-2 rounded-lg shadow-md w-full max-h-40 object-cover" />
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading || extractingText}
            className={`mt-4 w-full py-2 rounded-md transition ${
              uploading || extractingText ? "bg-gray-400 cursor-not-allowed" : "bg-green-500 text-white hover:bg-green-600"
            }`}
          >
            {uploading ? "Uploading..." : extractingText ? "Extracting Text..." : "Upload Report"}
          </button>

          {message && <p className="mt-4 text-sm text-center text-gray-700">{message}</p>}
        </div>

        {/* Analysis Section */}
        <div>
          <div className="bg-white shadow-md p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Progress Tracking</h2>
            <Bar
              data={{
                labels: ["Report1", "Report2", "Report3"],
                datasets: [{ label: "Example Data", data: [30, 40, 25], backgroundColor: "#4CAF50" }],
              }}
              options={{ responsive: true, plugins: { legend: { position: "top" } } }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}